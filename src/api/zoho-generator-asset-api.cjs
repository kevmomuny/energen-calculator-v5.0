/**
 * Zoho Generator Asset API
 * Manages generator assets in Zoho CRM
 *
 * Based on ZohoDirectIntegration pattern
 */

const fetch = require('node-fetch');
require('dotenv').config();

class ZohoGeneratorAssetAPI {
    constructor(logger = null) {
        this.logger = logger || console;
        this.clientId = process.env.ZOHO_CLIENT_ID;
        this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
        this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
        this.apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
        this.accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
        this.accessToken = null;
        this.tokenExpiry = null;
        this.tokenRefreshPromise = null;

        // Module name in Zoho CRM (NEW comprehensive module)
        this.moduleName = 'Generator_Equipment';
    }

    /**
     * Get or refresh access token
     * Promise-based locking prevents concurrent token refreshes
     */
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        if (this.tokenRefreshPromise) {
            return this.tokenRefreshPromise;
        }

        this.tokenRefreshPromise = (async () => {
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
                    const errorText = await response.text();
                    this.logger.error('Token refresh failed:', response.status, errorText);
                    this.accessToken = null;
                    this.tokenExpiry = null;
                    throw new Error(`Token refresh failed: ${response.status}`);
                }

                const data = await response.json();
                this.accessToken = data.access_token;
                this.tokenExpiry = new Date(Date.now() + ((data.expires_in - 300) * 1000));

                return this.accessToken;
            } catch (error) {
                this.logger.error('❌ Failed to refresh Zoho access token:', error.message);
                throw error;
            } finally {
                this.tokenRefreshPromise = null;
            }
        })();

        return this.tokenRefreshPromise;
    }

    /**
     * Make authenticated API request to Zoho CRM
     */
    async makeApiRequest(endpoint, method = 'GET', body = null) {
        try {
            const token = await this.getAccessToken();
            const url = `${this.apiDomain}/crm/v6${endpoint}`;

            const options = {
                method,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }

            this.logger.info(`🔄 Zoho API Request: ${method} ${endpoint}`);
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`❌ Zoho API Error: ${response.status}`, errorText);
                throw new Error(`API request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('❌ Zoho API request failed:', error.message);
            throw error;
        }
    }

    /**
     * Create a new generator asset in Zoho CRM
     * @param {Object} assetData - Generator asset data from calculator
     */
    async createGeneratorAsset(assetData) {
        const {
            // Basic Info
            model,
            kwRating,
            serialNumber,
            fuelType,

            // Customer Link
            customerId,  // Zoho Account ID
            customerName,
            installationAddress,

            // Technical Details
            engineMake,
            engineModel,
            cylinders,
            oilType,
            oilCapacity,
            coolantType,
            coolantCapacity,

            // Service Info
            installDate,
            serviceAgreementId,

            // Status
            status = 'Active',
            warrantyStatus,
            warrantyExpiry
        } = assetData;

        // Generate a descriptive name for the asset
        const assetName = `${customerName || 'Generator'} - ${model || 'Unknown Model'}`;

        const record = {
            data: [{
                // System field
                Name: assetName,  // Equipment Asset Name (MANDATORY)

                // Asset Identification
                Customer_Account: customerId ? { id: customerId } : null,  // Lookup to Accounts
                Installation_Address: installationAddress,
                Generator_Serial_Number: serialNumber,
                Asset_Status: status,

                // Generator/Alternator Component
                Generator_Manufacturer: model ? model.split(' ')[0] : null,  // Extract manufacturer from model
                Generator_Model: model,
                Generator_kW: kwRating,
                Generator_Date_Installed: installDate,

                // Engine Component (PRIMARY)
                Engine_Manufacturer: engineMake,
                Engine_Model: engineModel,
                Engine_Cylinders: cylinders,
                Fuel_Type: fuelType,
                Oil_Type: oilType,
                Oil_Capacity: oilCapacity,
                Coolant_Type: coolantType,
                Coolant_Capacity: coolantCapacity,
                Engine_Date_Installed: installDate,

                // Maintenance Tracking
                Last_Service_Date: installDate,
                Next_Service_Due: null,  // Will be calculated based on service agreement
                Warranty_Expiration_Date: warrantyExpiry,

                // Service Agreement Link (if provided)
                // Note: Service Agreement lookup field may need to be added to Generator_Equipment module
                // Service_Agreement: serviceAgreementId ? { id: serviceAgreementId } : null
            }]
        };

        try {
            this.logger.info('📝 Creating generator asset in Zoho CRM...');
            const result = await this.makeApiRequest(`/${this.moduleName}`, 'POST', record);

            if (result.data && result.data[0]) {
                const created = result.data[0];
                this.logger.info(`✅ Generator asset created: ${created.details.id}`);
                return {
                    success: true,
                    assetId: created.details.id,
                    data: created.details
                };
            }

            throw new Error('Unexpected response format from Zoho');
        } catch (error) {
            this.logger.error('❌ Failed to create generator asset:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update an existing generator asset
     */
    async updateGeneratorAsset(assetId, updates) {
        const record = {
            data: [{
                id: assetId,
                ...updates
            }]
        };

        try {
            this.logger.info(`📝 Updating generator asset ${assetId}...`);
            const result = await this.makeApiRequest(`/${this.moduleName}`, 'PUT', record);

            if (result.data && result.data[0]) {
                this.logger.info(`✅ Generator asset updated: ${assetId}`);
                return {
                    success: true,
                    assetId: assetId,
                    data: result.data[0]
                };
            }

            throw new Error('Unexpected response format from Zoho');
        } catch (error) {
            this.logger.error(`❌ Failed to update generator asset ${assetId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get generator asset by ID
     */
    async getGeneratorAsset(assetId) {
        try {
            this.logger.info(`🔍 Fetching generator asset ${assetId}...`);
            const result = await this.makeApiRequest(`/${this.moduleName}/${assetId}`, 'GET');

            if (result.data && result.data[0]) {
                return {
                    success: true,
                    asset: result.data[0]
                };
            }

            throw new Error('Asset not found');
        } catch (error) {
            this.logger.error(`❌ Failed to fetch generator asset ${assetId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search generator assets by customer
     */
    async searchGeneratorAssetsByCustomer(customerId) {
        try {
            this.logger.info(`🔍 Searching generator equipment for customer ${customerId}...`);

            // Use new Customer_Account lookup field
            const criteria = `(Customer_Account:equals:${customerId})`;
            const result = await this.makeApiRequest(
                `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
                'GET'
            );

            return {
                success: true,
                assets: result.data || []
            };
        } catch (error) {
            this.logger.error(`❌ Failed to search generator equipment:`, error.message);
            return {
                success: false,
                error: error.message,
                assets: []
            };
        }
    }

    /**
     * Search generator assets by serial number
     * Used to prevent duplicate generator records when creating quotes
     * @param {string} serialNumber - Generator serial number
     * @returns {Promise<Object>} Search result with matching assets
     */
    async searchGeneratorAssetsBySerial(serialNumber) {
        try {
            this.logger.info(`🔍 Searching generator equipment by serial number: ${serialNumber}...`);

            // Search by Generator_Serial_Number field
            const criteria = `(Generator_Serial_Number:equals:${serialNumber})`;
            const result = await this.makeApiRequest(
                `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
                'GET'
            );

            return {
                success: true,
                assets: result.data || []
            };
        } catch (error) {
            this.logger.error(`❌ Failed to search generator equipment by serial:`, error.message);
            return {
                success: false,
                error: error.message,
                assets: []
            };
        }
    }

    /**
     * Update service dates after work order completion
     */
    async updateServiceDates(assetId, { lastServiceDate, nextServiceDue, hoursRun }) {
        const updates = {
            Last_Service_Date: lastServiceDate,
            Next_Service_Due: nextServiceDue
        };

        if (hoursRun !== undefined) {
            updates.Hours_Run = hoursRun;
        }

        return await this.updateGeneratorAsset(assetId, updates);
    }

    /**
     * Link generator asset to service agreement
     */
    async linkServiceAgreement(assetId, serviceAgreementId) {
        const updates = {
            Service_Agreement: {
                id: serviceAgreementId
            }
        };

        return await this.updateGeneratorAsset(assetId, updates);
    }

    /**
     * Mark generator asset as decommissioned
     */
    async decommissionAsset(assetId, reason = '') {
        const updates = {
            Status: 'Decommissioned',
            Decommission_Date: new Date().toISOString().split('T')[0],
            Decommission_Reason: reason
        };

        return await this.updateGeneratorAsset(assetId, updates);
    }
}

module.exports = ZohoGeneratorAssetAPI;
