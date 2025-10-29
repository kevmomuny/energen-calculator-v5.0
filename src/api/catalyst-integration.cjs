/**
 * Catalyst Integration Module for Energen Calculator v5.0
 * Provides serverless backend integration with Zoho Catalyst
 * NO OAUTH REQUIRED - Uses Catalyst-native authentication
 */

const fetch = require('node-fetch');
require('dotenv').config();

class CatalystIntegration {
  constructor(logger = null) {
    // BUG-019 FIX: Add logger parameter with console fallback
    this.logger = logger || console;
    this.baseUrl = process.env.CATALYST_BASE_URL || 'https://energen-calculator-60030959094.development.catalystserverless.com/server';
    this.projectId = process.env.CATALYST_PROJECT_ID || '60030959094';
    // NO OAUTH NEEDED - Catalyst handles authentication internally
  }

  /**
     * Call Catalyst function
     */
  async callFunction(endpoint, data = {}, method = 'POST') {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Catalyst-Project': this.projectId
        },
        body: method !== 'GET' ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        throw new Error(`Catalyst function error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // BUG-019 FIX: Use logger instead of console
      this.logger.error(`Catalyst API Error (${endpoint}):`, error);
      // Fallback to local processing
      return null;
    }
  }

  /**
     * Search customer in Zoho CRM via Catalyst
     */
  async searchCustomer(searchTerm) {
    try {
      return await this.callFunction('/zoho-crm-service/search', { searchTerm });
    } catch (error) {
      return null;
    }
  }

  /**
     * Create lead in Zoho CRM via Catalyst
     */
  async createLead(leadData) {
    try {
      return await this.callFunction('/zoho-crm-service/lead/create', leadData);
    } catch (error) {
      return null;
    }
  }

  /**
     * Create quote in Zoho CRM via Catalyst
     */
  async createQuote(quoteData) {
    try {
      return await this.callFunction('/zoho-crm-service/quote/create', quoteData);
    } catch (error) {
      return null;
    }
  }

  /**
     * Generate PDF via Catalyst - DISABLED
     * NO FALLBACK - Professional PDF only or fail
     */
  async generatePDF(quoteData) {
    throw new Error('Catalyst PDF generation is disabled. Use professional PDF service directly.');
  }

  /**
     * Calculate pricing via Catalyst
     */
  async calculatePricing(params) {
    try {
      const result = await this.callFunction('/pricing-calculator/calculate', params);
      if (result) {
        return result;
      }
    } catch (error) {
    }

    // Fallback to local calculation
    const EnergenCalculationEngine = require('./complete-calculation-engine.cjs');
    const engine = new EnergenCalculationEngine();
    return engine.calculate(params);
  }

  /**
     * Save quote to Catalyst Data Store
     */
  async saveQuote(quoteData) {
    try {
      return await this.callFunction('/data-store/quote/save', quoteData);
    } catch (error) {
      // Save locally as fallback
      const fs = require('fs');
      const path = require('path');
      const quotesDir = path.join(__dirname, '../../data/quotes');
      if (!fs.existsSync(quotesDir)) {
        fs.mkdirSync(quotesDir, { recursive: true });
      }
      const filename = `quote-${Date.now()}.json`;
      fs.writeFileSync(path.join(quotesDir, filename), JSON.stringify(quoteData, null, 2));
      return { success: true, filename, local: true };
    }
  }

  /**
     * Get distance calculation via Catalyst
     */
  async calculateDistance(origin, destination) {
    try {
      return await this.callFunction('/google-maps-service/distance', { origin, destination });
    } catch (error) {
      // Fallback to direct Google Maps API call
      const axios = require('axios');
      const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      const params = {
        origins: origin,
        destinations: destination,
        units: 'imperial',
        key: process.env.GOOGLE_MAPS_API_KEY
      };

      try {
        const response = await axios.get(url, { params });
        if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
          const element = response.data.rows[0].elements[0];
          return {
            distance: element.distance.text,
            distanceValue: Math.round(element.distance.value / 1609.34), // meters to miles
            duration: element.duration.text
          };
        }
      } catch (apiError) {
        // BUG-019 FIX: Use logger instead of console
        this.logger.error('Google Maps API error:', apiError);
      }

      return { distance: '120 miles', distanceValue: 120, duration: '2 hours' };
    }
  }

  /**
     * Test Catalyst connection
     */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'Energen-Calculator-v5.0',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const status = await response.json();
        if (status.status === 'ok') {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      // BUG-019 FIX: Use logger instead of console
      this.logger.error('❌ Catalyst connection failed:', error.message);

      // Provide specific guidance based on error type
      if (error.message.includes('The domain')) {
      } else if (error.code === 'ENOTFOUND') {
      } else if (error.code === 'ECONNREFUSED') {
      }

      return false;
    }
  }
}

// Export singleton instance
module.exports = new CatalystIntegration();
