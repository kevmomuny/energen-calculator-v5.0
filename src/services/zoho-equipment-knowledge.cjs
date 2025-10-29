/**
 * Zoho Equipment Knowledge Base Service
 *
 * Integrates with Zoho Creator Equipment_Master_Record and Manufacturer_Master_Database
 * Provides confidence-scored equipment data with fallback logic
 *
 * Data Source Hierarchy:
 * 1. Equipment_Master_Record (field verified, highest confidence)
 * 2. Manufacturer_Master_Database (manufacturer specs, medium confidence)
 * 3. AI Web Search (lowest confidence, queued for research)
 *
 * @module src/services/zoho-equipment-knowledge
 * @version 5.0.0
 */

const fetch = require('node-fetch');

class ZohoEquipmentKnowledgeService {
  constructor(logger) {
    this.logger = logger;
    this.zohoApiUrl = process.env.ZOHO_CREATOR_API_URL || 'https://creator.zoho.com/api/v2';
    this.zohoCrmUrl = process.env.ZOHO_CRM_API_URL || 'https://www.zohoapis.com/crm/v6';
    this.clientId = process.env.ZOHO_CLIENT_ID;
    this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    this.accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
     * Get or refresh Zoho access token
     * @returns {Promise<string>} Access token
     */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const tokenUrl = `${this.accountsUrl}/oauth/v2/token`;
      const params = new URLSearchParams({
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token'
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + ((data.expires_in - 300) * 1000));

      this.logger.info('Zoho access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to refresh Zoho access token:', error);
      throw error;
    }
  }

  /**
     * Search field-verified equipment in Equipment_Master_Record
     * @param {string} manufacturer - Equipment manufacturer
     * @param {string} model - Equipment model
     * @param {number} kw - kW rating
     * @returns {Promise<Object|null>} Equipment data with confidence score or null
     */
  async searchFieldVerifiedEquipment(manufacturer, model, kw) {
    try {
      this.logger.info('Searching Equipment_Master_Record', { manufacturer, model, kw });

      const token = await this.getAccessToken();

      // Search in Zoho Creator Equipment_Master_Record
      // Using criteria to match manufacturer, model, and kW (with tolerance)
      const criteria = `(Manufacturer:equals:${encodeURIComponent(manufacturer)}) AND (Model:contains:${encodeURIComponent(model)})`;
      const url = `${this.zohoApiUrl}/Equipment_Master_Record/report/All_Equipment?criteria=${criteria}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.logger.warn('Equipment_Master_Record search failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        this.logger.info('No field-verified equipment found');
        return null;
      }

      // Find best match by kW tolerance (within 10%)
      const matches = data.data.filter(item => {
        const itemKw = parseFloat(item.kW_Rating);
        return itemKw && Math.abs(itemKw - kw) / kw <= 0.10;
      });

      if (matches.length === 0) {
        this.logger.info('No matches within kW tolerance');
        return null;
      }

      // Return the closest match
      const bestMatch = matches.reduce((best, current) => {
        const bestDiff = Math.abs(parseFloat(best.kW_Rating) - kw);
        const currentDiff = Math.abs(parseFloat(current.kW_Rating) - kw);
        return currentDiff < bestDiff ? current : best;
      });

      return this.formatFieldVerifiedData(bestMatch);
    } catch (error) {
      this.logger.error('Error searching field-verified equipment:', error);
      return null;
    }
  }

  /**
     * Search manufacturer database for equipment specs
     * @param {string} manufacturer - Equipment manufacturer
     * @param {string} model - Equipment model
     * @returns {Promise<Object|null>} Equipment data with confidence score or null
     */
  async searchManufacturerDatabase(manufacturer, model) {
    try {
      this.logger.info('Searching Manufacturer_Master_Database', { manufacturer, model });

      const token = await this.getAccessToken();

      // Search in Zoho Creator Manufacturer_Master_Database
      const criteria = `(Manufacturer:equals:${encodeURIComponent(manufacturer)}) AND (Model:contains:${encodeURIComponent(model)})`;
      const url = `${this.zohoApiUrl}/Manufacturer_Master_Database/report/All_Equipment?criteria=${criteria}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.logger.warn('Manufacturer_Master_Database search failed:', response.status);
        return null;
      }

      const data = await response.json();

      if (!data.data || data.data.length === 0) {
        this.logger.info('No manufacturer data found');
        return null;
      }

      // Return the first match (manufacturer data is typically unique per model)
      return this.formatManufacturerData(data.data[0]);
    } catch (error) {
      this.logger.error('Error searching manufacturer database:', error);
      return null;
    }
  }

  /**
     * Get equipment details with confidence scoring
     * @param {string} equipmentId - Zoho equipment record ID
     * @returns {Promise<Object>} Equipment data with confidence score
     */
  async getEquipmentWithConfidence(equipmentId) {
    try {
      this.logger.info('Fetching equipment details', { equipmentId });

      const token = await this.getAccessToken();
      const url = `${this.zohoApiUrl}/Equipment_Master_Record/report/All_Equipment/${equipmentId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch equipment: ${response.status}`);
      }

      const data = await response.json();
      return this.formatFieldVerifiedData(data.data);
    } catch (error) {
      this.logger.error('Error fetching equipment:', error);
      throw error;
    }
  }

  /**
     * Queue equipment for research if not found
     * @param {Object} equipmentData - Equipment information to research
     * @returns {Promise<boolean>} Success status
     */
  async queueEquipmentResearch(equipmentData) {
    try {
      this.logger.info('Queueing equipment for research', equipmentData);

      const token = await this.getAccessToken();

      // Add to Research_Queue in Zoho Creator
      const url = `${this.zohoApiUrl}/Equipment_Research_Queue/form/Research_Request`;

      const requestData = {
        data: {
          Manufacturer: equipmentData.manufacturer,
          Model: equipmentData.model,
          kW_Rating: equipmentData.kw,
          Serial_Number: equipmentData.serial || '',
          Requested_By: 'Energen Calculator v5.0',
          Request_Date: new Date().toISOString(),
          Priority: 'Normal',
          Status: 'Pending'
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        this.logger.error('Failed to queue research request:', response.status);
        return false;
      }

      this.logger.info('Equipment queued for research successfully');
      return true;
    } catch (error) {
      this.logger.error('Error queueing equipment research:', error);
      return false;
    }
  }

  /**
     * Format field-verified equipment data
     * @param {Object} rawData - Raw Zoho data
     * @returns {Object} Formatted equipment data with high confidence
     */
  formatFieldVerifiedData(rawData) {
    return {
      confidence: 95,
      source: 'Field Verified',
      sourceIcon: 'camera',
      data: {
        manufacturer: rawData.Manufacturer,
        model: rawData.Model,
        kw: parseFloat(rawData.kW_Rating),
        engine: {
          make: rawData.Engine_Make,
          model: rawData.Engine_Model,
          cylinders: parseInt(rawData.Cylinders) || null,
          displacement: parseFloat(rawData.Displacement_Liters) || null
        },
        fluids: {
          oilCapacity: parseFloat(rawData.Oil_Capacity_Gallons) || null,
          oilType: rawData.Oil_Type || '15W-40',
          coolantCapacity: parseFloat(rawData.Coolant_Capacity_Gallons) || null,
          coolantType: rawData.Coolant_Type || '50/50 Ethylene Glycol',
          fuelType: rawData.Fuel_Type || 'Diesel'
        },
        consumables: {
          oilFilter: rawData.Oil_Filter_Part_Number || null,
          airFilter: rawData.Air_Filter_Part_Number || null,
          fuelFilter: rawData.Fuel_Filter_Part_Number || null
        },
        maintenance: {
          serviceA: {
            hours: parseInt(rawData.Service_A_Hours) || 50,
            estimated_time: parseFloat(rawData.Service_A_Time_Hours) || 1.5
          },
          serviceB: {
            hours: parseInt(rawData.Service_B_Hours) || 200,
            estimated_time: parseFloat(rawData.Service_B_Time_Hours) || 2.0
          },
          serviceC: {
            hours: parseInt(rawData.Service_C_Hours) || 500,
            estimated_time: parseFloat(rawData.Service_C_Time_Hours) || 3.0
          }
        },
        photos: rawData.Photos ? this.parsePhotoUrls(rawData.Photos) : [],
        location: rawData.GPS_Location ? this.parseGPSLocation(rawData.GPS_Location) : null,
        verifiedBy: rawData.Verified_By || 'Field Team',
        verifiedDate: rawData.Verification_Date || null
      }
    };
  }

  /**
     * Format manufacturer database data
     * @param {Object} rawData - Raw Zoho data
     * @returns {Object} Formatted equipment data with medium confidence
     */
  formatManufacturerData(rawData) {
    return {
      confidence: 75,
      source: 'Manufacturer Spec',
      sourceIcon: 'book',
      data: {
        manufacturer: rawData.Manufacturer,
        model: rawData.Model,
        kw: parseFloat(rawData.kW_Rating),
        engine: {
          make: rawData.Engine_Make,
          model: rawData.Engine_Model,
          cylinders: parseInt(rawData.Cylinders) || null,
          displacement: parseFloat(rawData.Displacement_Liters) || null
        },
        fluids: {
          oilCapacity: parseFloat(rawData.Oil_Capacity_Gallons) || null,
          oilType: rawData.Oil_Type || '15W-40',
          coolantCapacity: parseFloat(rawData.Coolant_Capacity_Gallons) || null,
          coolantType: rawData.Coolant_Type || '50/50 Ethylene Glycol',
          fuelType: rawData.Fuel_Type || 'Diesel'
        },
        consumables: {
          oilFilter: rawData.Oil_Filter_Part_Number || null,
          airFilter: rawData.Air_Filter_Part_Number || null,
          fuelFilter: rawData.Fuel_Filter_Part_Number || null
        },
        maintenance: {
          serviceA: {
            hours: parseInt(rawData.Service_A_Hours) || 50,
            estimated_time: parseFloat(rawData.Service_A_Time_Hours) || 1.5
          },
          serviceB: {
            hours: parseInt(rawData.Service_B_Hours) || 200,
            estimated_time: parseFloat(rawData.Service_B_Time_Hours) || 2.0
          }
        },
        specSheetUrl: rawData.Spec_Sheet_URL || null
      }
    };
  }

  /**
     * Parse photo URLs from Zoho field
     * @param {string} photosField - Comma-separated photo URLs
     * @returns {Array<Object>} Array of photo objects
     */
  parsePhotoUrls(photosField) {
    if (!photosField) return [];

    const urls = photosField.split(',').map(url => url.trim()).filter(url => url);
    return urls.map((url, index) => ({
      url,
      thumbnail: url.replace(/\.(jpg|jpeg|png)$/i, '_thumb.$1'),
      index
    }));
  }

  /**
     * Parse GPS location from Zoho field
     * @param {string} gpsField - GPS coordinates string
     * @returns {Object|null} Location object or null
     */
  parseGPSLocation(gpsField) {
    if (!gpsField) return null;

    const match = gpsField.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (!match) return null;

    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2])
    };
  }
}

module.exports = ZohoEquipmentKnowledgeService;
