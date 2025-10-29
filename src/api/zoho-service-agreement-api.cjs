/**
 * Zoho Service Agreement API
 * Manages service agreements in Zoho CRM
 *
 * Links calculator quotes to ongoing service contracts
 */

const fetch = require('node-fetch');
require('dotenv').config();

class ZohoServiceAgreementAPI {
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

    this.moduleName = 'Service_Agreements';
  }

  /**
     * Get or refresh access token
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
     * Make authenticated API request
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
     * Create service agreement from calculator quote data
     */
  async createServiceAgreement(quoteData) {
    const {
      // Reference IDs
      quoteId,
      customerId,
      customerName,
      generatorAssetIds = [],  // Array of Generator_Asset IDs

      // Agreement Details
      agreementNumber,
      startDate,
      endDate,
      autoRenew = false,

      // Services Included (from calculator)
      servicesIncluded = [],  // Array of service codes: ['A', 'B', 'C', 'CUSTOM']

      // Financial
      annualValue,
      quarterlyValue,
      paymentTerms = 'Net 30',
      billingFrequency = 'Quarterly',

      // Contact
      primaryContactId,
      billingContactId,

      // Status
      status = 'Draft'
    } = quoteData;

    const record = {
      data: [{
        Agreement_Number: agreementNumber,

        // Link to Quote and Customer
        Related_Quote: quoteId ? { id: quoteId } : null,
        Customer_Account: customerId ? {
          id: customerId,
          name: customerName
        } : null,

        // Agreement Period
        Start_Date: startDate,
        End_Date: endDate,
        Auto_Renew: autoRenew,

        // Services (stored as multi-select picklist or JSON)
        Services_Included: servicesIncluded.join(';'),  // Multi-select format

        // Financial Details
        Annual_Value: annualValue,
        Quarterly_Value: quarterlyValue,
        Payment_Terms: paymentTerms,
        Billing_Frequency: billingFrequency,

        // Contacts
        Primary_Contact: primaryContactId ? { id: primaryContactId } : null,
        Billing_Contact: billingContactId ? { id: billingContactId } : null,

        // Status
        Status: status,
        Created_From_Calculator: true,
        Calculator_Version: '5.0'
      }]
    };

    try {
      this.logger.info('📝 Creating service agreement in Zoho CRM...');
      const result = await this.makeApiRequest(`/${this.moduleName}`, 'POST', record);

      if (result.data && result.data[0]) {
        const created = result.data[0];
        const agreementId = created.details.id;

        this.logger.info(`✅ Service agreement created: ${agreementId}`);

        // Link generator assets to this agreement
        if (generatorAssetIds.length > 0) {
          await this.linkGeneratorAssets(agreementId, generatorAssetIds);
        }

        return {
          success: true,
          agreementId: agreementId,
          data: created.details
        };
      }

      throw new Error('Unexpected response format from Zoho');
    } catch (error) {
      this.logger.error('❌ Failed to create service agreement:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Link generator assets to service agreement
     */
  async linkGeneratorAssets(agreementId, assetIds) {
    try {
      // This requires the Generator_Assets module to have a lookup field to Service_Agreements
      // We'll update each asset to reference this agreement
      const ZohoGeneratorAssetAPI = require('./zoho-generator-asset-api.cjs');
      const assetAPI = new ZohoGeneratorAssetAPI(this.logger);

      for (const assetId of assetIds) {
        await assetAPI.linkServiceAgreement(assetId, agreementId);
      }

      this.logger.info(`✅ Linked ${assetIds.length} generator assets to agreement ${agreementId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('❌ Failed to link generator assets:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Update service agreement
     */
  async updateServiceAgreement(agreementId, updates) {
    const record = {
      data: [{
        id: agreementId,
        ...updates
      }]
    };

    try {
      this.logger.info(`📝 Updating service agreement ${agreementId}...`);
      const result = await this.makeApiRequest(`/${this.moduleName}`, 'PUT', record);

      if (result.data && result.data[0]) {
        this.logger.info(`✅ Service agreement updated: ${agreementId}`);
        return {
          success: true,
          agreementId: agreementId,
          data: result.data[0]
        };
      }

      throw new Error('Unexpected response format from Zoho');
    } catch (error) {
      this.logger.error(`❌ Failed to update service agreement ${agreementId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Get service agreement by ID
     */
  async getServiceAgreement(agreementId) {
    try {
      this.logger.info(`🔍 Fetching service agreement ${agreementId}...`);
      const result = await this.makeApiRequest(`/${this.moduleName}/${agreementId}`, 'GET');

      if (result.data && result.data[0]) {
        return {
          success: true,
          agreement: result.data[0]
        };
      }

      throw new Error('Agreement not found');
    } catch (error) {
      this.logger.error(`❌ Failed to fetch service agreement ${agreementId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Search service agreements by customer
     */
  async searchServiceAgreementsByCustomer(customerId) {
    try {
      this.logger.info(`🔍 Searching service agreements for customer ${customerId}...`);

      const criteria = `(Customer_Account:equals:${customerId})`;
      const result = await this.makeApiRequest(
        `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        'GET'
      );

      return {
        success: true,
        agreements: result.data || []
      };
    } catch (error) {
      this.logger.error('❌ Failed to search service agreements:', error.message);
      return {
        success: false,
        error: error.message,
        agreements: []
      };
    }
  }

  /**
     * Activate service agreement (change status from Draft to Active)
     */
  async activateAgreement(agreementId) {
    const updates = {
      Status: 'Active',
      Activation_Date: new Date().toISOString().split('T')[0]
    };

    return await this.updateServiceAgreement(agreementId, updates);
  }

  /**
     * Renew service agreement
     */
  async renewAgreement(agreementId, { newStartDate, newEndDate, newAnnualValue }) {
    const updates = {
      Start_Date: newStartDate,
      End_Date: newEndDate,
      Annual_Value: newAnnualValue,
      Status: 'Active',
      Renewal_Date: new Date().toISOString().split('T')[0]
    };

    return await this.updateServiceAgreement(agreementId, updates);
  }

  /**
     * Cancel service agreement
     */
  async cancelAgreement(agreementId, reason = '') {
    const updates = {
      Status: 'Cancelled',
      Cancellation_Date: new Date().toISOString().split('T')[0],
      Cancellation_Reason: reason
    };

    return await this.updateServiceAgreement(agreementId, updates);
  }

  /**
     * Get active agreements requiring service scheduling
     */
  async getActiveAgreements() {
    try {
      this.logger.info('🔍 Fetching active service agreements...');

      const criteria = '(Status:equals:Active)';
      const result = await this.makeApiRequest(
        `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        'GET'
      );

      return {
        success: true,
        agreements: result.data || []
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch active agreements:', error.message);
      return {
        success: false,
        error: error.message,
        agreements: []
      };
    }
  }
}

module.exports = ZohoServiceAgreementAPI;
