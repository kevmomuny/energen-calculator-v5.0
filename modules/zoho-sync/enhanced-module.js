/**
 * Enhanced Zoho CRM Sync Module with Catalyst Integration
 * Complete implementation with contact management and bid session snapshots
 * @module zoho-sync/enhanced-module
 * @version 4.5.0
 */

import { EnergenModule } from '../core/interfaces.js';
import axios from 'axios';

/**
 * Enhanced Zoho CRM Sync Module
 */
export class EnhancedZohoSyncModule extends EnergenModule {
  constructor(config) {
    super({
      name: 'zoho-sync-enhanced',
      version: '4.5.0',
      ...config
    });

    this.catalystEndpoint = config.catalystEndpoint || process.env.CATALYST_ENDPOINT;
    this.zohoConfig = {
      clientId: config.clientId || process.env.ZOHO_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.ZOHO_CLIENT_SECRET,
      refreshToken: config.refreshToken || process.env.ZOHO_REFRESH_TOKEN,
      accountsUrl: 'https://accounts.zoho.com',
      apiUrl: 'https://www.zohoapis.com/crm/v2'
    };

    this.accessToken = null;
    this.tokenExpiry = null;
    this.syncQueue = [];
    this.contactCache = new Map();
    this.quoteSequence = 1;
  }

  /**
   * Initialize module with Catalyst integration
   */
  async onInit(config) {
    // Validate Zoho configuration
    this.validateConfig();

    // Initialize OAuth through Catalyst
    await this.initializeCatalystAuth();

    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    await this.loadInitialData();

    this.logger.info('Enhanced Zoho sync module initialized with Catalyst');
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const required = ['clientId', 'clientSecret', 'refreshToken'];
    for (const field of required) {
      if (!this.zohoConfig[field]) {
        throw new Error(`Zoho configuration missing: ${field}`);
      }
    }
  }

  /**
   * Initialize Catalyst OAuth
   */
  async initializeCatalystAuth() {
    try {
      // Use Catalyst for OAuth token management
      if (this.catalystEndpoint) {
        const response = await axios.post(`${this.catalystEndpoint}/oauth/token`, {
          grant_type: 'refresh_token',
          refresh_token: this.zohoConfig.refreshToken,
          client_id: this.zohoConfig.clientId,
          client_secret: this.zohoConfig.clientSecret
        });

        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      } else {
        // Direct OAuth refresh
        await this.refreshAccessToken();
      }
    } catch (error) {
      this.logger.error('Catalyst auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const response = await axios.post(
        `${this.zohoConfig.accountsUrl}/oauth/v2/token`,
        null,
        {
          params: {
            grant_type: 'refresh_token',
            refresh_token: this.zohoConfig.refreshToken,
            client_id: this.zohoConfig.clientId,
            client_secret: this.zohoConfig.clientSecret
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      this.logger.info('Access token refreshed successfully');
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Ensure valid access token
   */
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const eventBus = this.getDependency('eventBus');

    // Quote events
    eventBus.on('zoho:createQuote', async (data) => {
      const result = await this.createQuote(data);
      eventBus.emit('zoho:quoteCreated', result);
    });

    // Contact management events
    eventBus.on('zoho:syncContacts', async (data) => {
      const result = await this.syncContacts(data);
      eventBus.emit('zoho:contactsSynced', result);
    });

    // Bid session snapshot events
    eventBus.on('zoho:saveBidSession', async (data) => {
      const result = await this.saveBidSessionSnapshot(data);
      eventBus.emit('zoho:bidSessionSaved', result);
    });

    // Customer search events
    eventBus.on('zoho:searchCustomer', async (data) => {
      const result = await this.searchCustomers(data.query);
      eventBus.emit('zoho:customerSearchResults', result);
    });
  }

  /**
   * Load initial data from Zoho
   */
  async loadInitialData() {
    try {
      // Get current quote sequence number
      const lastQuote = await this.getLastQuoteNumber();
      if (lastQuote) {
        const parts = lastQuote.split('-');
        this.quoteSequence = parseInt(parts[2]) + 1;
      }
    } catch (error) {
      this.logger.warn('Could not load initial data:', error);
    }
  }

  /**
   * Create quote in Zoho CRM
   */
  async createQuote(quoteData) {
    const token = await this.ensureValidToken();

    try {
      // Generate quote number
      const quoteNumber = this.generateQuoteNumber();

      // Prepare quote data for Zoho
      const zohoQuote = {
        data: [{
          Quote_Number: quoteNumber,
          Subject: `Service Quote - ${quoteData.customer.name}`,
          Account_Name: quoteData.customer.name,
          Valid_Till: this.getValidTillDate(),
          Quote_Stage: 'Draft',

          // Customer information
          Billing_Street: quoteData.customer.address,
          Billing_City: quoteData.customer.city,
          Billing_State: quoteData.customer.state,
          Billing_Code: quoteData.customer.zip,

          // Equipment details
          Equipment_Details: this.formatEquipmentDetails(quoteData.generators),

          // Service details
          Description: this.formatServiceDetails(quoteData.services),

          // Pricing
          Sub_Total: quoteData.calculation.subtotal,
          Tax: quoteData.calculation.tax,
          Grand_Total: quoteData.calculation.grandTotal,

          // Custom fields
          Travel_Distance: quoteData.travelDistance,
          Business_Type: quoteData.enrichment?.businessType,
          Industry: quoteData.enrichment?.industry,

          // Contacts
          Contact_Details: this.formatContacts(quoteData.contacts)
        }]
      };

      // Create quote in Zoho
      const response = await axios.post(
        `${this.zohoConfig.apiUrl}/Quotes`,
        zohoQuote,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.data[0];

      // Create associated records
      if (quoteData.contacts && quoteData.contacts.length > 0) {
        await this.createContacts(result.details.id, quoteData.contacts);
      }

      // Save bid session snapshot
      await this.saveBidSessionSnapshot({
        quoteId: result.details.id,
        quoteNumber: quoteNumber,
        sessionData: quoteData
      });

      return {
        success: true,
        quoteId: result.details.id,
        quoteNumber: quoteNumber,
        message: 'Quote created successfully in Zoho CRM'
      };

    } catch (error) {
      this.logger.error('Failed to create quote:', error);
      throw error;
    }
  }

  /**
   * Sync contacts with Zoho CRM
   */
  async syncContacts(contactData) {
    const token = await this.ensureValidToken();

    try {
      const { accountId, contacts } = contactData;

      // Validate contact limit (max 4)
      if (contacts.length > 4) {
        throw new Error('Maximum 4 contacts allowed per customer');
      }

      const syncedContacts = [];

      for (const contact of contacts) {
        // Prepare contact data
        const zohoContact = {
          data: [{
            First_Name: contact.firstName,
            Last_Name: contact.lastName || contact.firstName,
            Account_Name: { id: accountId },
            Title: contact.title,
            Email: contact.email,
            Phone: contact.phoneOffice,
            Mobile: contact.phoneMobile,
            Decision_Maker: contact.decisionMaker || false,
            Contact_Role: this.mapContactRole(contact.title)
          }]
        };

        // Check if contact exists
        const existingContact = await this.findContact(contact.email);

        let result;
        if (existingContact) {
          // Update existing contact
          result = await axios.put(
            `${this.zohoConfig.apiUrl}/Contacts/${existingContact.id}`,
            zohoContact,
            {
              headers: {
                'Authorization': `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } else {
          // Create new contact
          result = await axios.post(
            `${this.zohoConfig.apiUrl}/Contacts`,
            zohoContact,
            {
              headers: {
                'Authorization': `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
        }

        syncedContacts.push({
          ...contact,
          zohoId: result.data.data[0].details.id
        });
      }

      // Cache contacts
      this.contactCache.set(accountId, syncedContacts);

      return {
        success: true,
        contacts: syncedContacts,
        message: `${syncedContacts.length} contacts synced successfully`
      };

    } catch (error) {
      this.logger.error('Failed to sync contacts:', error);
      throw error;
    }
  }

  /**
   * Save bid session snapshot to Zoho
   */
  async saveBidSessionSnapshot(snapshotData) {
    const token = await this.ensureValidToken();

    try {
      // Create custom module record for bid session
      const bidSession = {
        data: [{
          Name: `Bid Session - ${snapshotData.quoteNumber}`,
          Quote_ID: snapshotData.quoteId,
          Quote_Number: snapshotData.quoteNumber,
          Session_Date: new Date().toISOString(),

          // Session settings
          Generator_Config: JSON.stringify(snapshotData.sessionData.generators),
          Service_Selection: JSON.stringify(snapshotData.sessionData.services),
          Calculation_Details: JSON.stringify(snapshotData.sessionData.calculation),

          // Customer data at time of bid
          Customer_Data: JSON.stringify({
            name: snapshotData.sessionData.customer.name,
            address: snapshotData.sessionData.customer.address,
            city: snapshotData.sessionData.customer.city,
            state: snapshotData.sessionData.customer.state,
            zip: snapshotData.sessionData.customer.zip,
            businessType: snapshotData.sessionData.enrichment?.businessType,
            industry: snapshotData.sessionData.enrichment?.industry
          }),

          // Travel and tax data
          Travel_Distance: snapshotData.sessionData.travelDistance,
          Tax_Rate: snapshotData.sessionData.taxRate,

          // Pricing snapshot
          Subtotal: snapshotData.sessionData.calculation.subtotal,
          Tax_Amount: snapshotData.sessionData.calculation.tax,
          Total: snapshotData.sessionData.calculation.grandTotal,

          // User and timestamp
          Created_By: snapshotData.sessionData.userId || 'System',
          Created_Time: new Date().toISOString()
        }]
      };

      // Save to custom module (Bid_Sessions)
      const response = await axios.post(
        `${this.zohoConfig.apiUrl}/Bid_Sessions`,
        bidSession,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        sessionId: response.data.data[0].details.id,
        message: 'Bid session snapshot saved successfully'
      };

    } catch (error) {
      this.logger.error('Failed to save bid session:', error);

      // Fallback: Save as attachment to quote
      return this.saveBidSessionAsAttachment(snapshotData);
    }
  }

  /**
   * Save bid session as attachment (fallback)
   */
  async saveBidSessionAsAttachment(snapshotData) {
    const token = await this.ensureValidToken();

    try {
      // Create JSON file content
      const jsonContent = JSON.stringify(snapshotData.sessionData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      // Create form data
      const formData = new FormData();
      formData.append('file', blob, `bid_session_${snapshotData.quoteNumber}.json`);

      // Upload as attachment
      const response = await axios.post(
        `${this.zohoConfig.apiUrl}/Quotes/${snapshotData.quoteId}/Attachments`,
        formData,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return {
        success: true,
        attachmentId: response.data.data[0].details.id,
        message: 'Bid session saved as attachment'
      };

    } catch (error) {
      this.logger.error('Failed to save bid session as attachment:', error);
      throw error;
    }
  }

  /**
   * Search customers in Zoho CRM
   */
  async searchCustomers(query) {
    const token = await this.ensureValidToken();

    try {
      const response = await axios.get(
        `${this.zohoConfig.apiUrl}/Accounts/search`,
        {
          params: {
            criteria: `(Account_Name:contains:${query})`,
            per_page: 20
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`
          }
        }
      );

      if (response.data.data) {
        return response.data.data.map(account => ({
          id: account.id,
          name: account.Account_Name,
          address: account.Billing_Street,
          city: account.Billing_City,
          state: account.Billing_State,
          zip: account.Billing_Code,
          phone: account.Phone,
          website: account.Website,
          industry: account.Industry,
          contacts: [] // Will be loaded separately if needed
        }));
      }

      return [];

    } catch (error) {
      if (error.response?.status === 204) {
        // No results found
        return [];
      }
      this.logger.error('Customer search failed:', error);
      throw error;
    }
  }

  /**
   * Get contacts for an account
   */
  async getAccountContacts(accountId) {
    const token = await this.ensureValidToken();

    // Check cache first
    if (this.contactCache.has(accountId)) {
      return this.contactCache.get(accountId);
    }

    try {
      const response = await axios.get(
        `${this.zohoConfig.apiUrl}/Contacts/search`,
        {
          params: {
            criteria: `(Account_Name.id:equals:${accountId})`,
            per_page: 4 // Max 4 contacts
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`
          }
        }
      );

      if (response.data.data) {
        const contacts = response.data.data.map(contact => ({
          id: contact.id,
          firstName: contact.First_Name,
          lastName: contact.Last_Name,
          name: contact.Full_Name,
          title: contact.Title,
          email: contact.Email,
          phoneOffice: contact.Phone,
          phoneMobile: contact.Mobile,
          decisionMaker: contact.Decision_Maker || false
        }));

        // Cache contacts
        this.contactCache.set(accountId, contacts);

        return contacts;
      }

      return [];

    } catch (error) {
      if (error.response?.status === 204) {
        return [];
      }
      this.logger.error('Failed to get account contacts:', error);
      throw error;
    }
  }

  /**
   * Create or update account
   */
  async upsertAccount(accountData) {
    const token = await this.ensureValidToken();

    try {
      // Search for existing account
      const existing = await this.searchCustomers(accountData.name);

      const zohoAccount = {
        data: [{
          Account_Name: accountData.name,
          Billing_Street: accountData.address,
          Billing_City: accountData.city,
          Billing_State: accountData.state,
          Billing_Code: accountData.zip,
          Phone: accountData.phone,
          Website: accountData.website,
          Industry: accountData.industry,
          Account_Type: accountData.businessType || 'Customer'
        }]
      };

      let result;
      if (existing.length > 0) {
        // Update existing account
        result = await axios.put(
          `${this.zohoConfig.apiUrl}/Accounts/${existing[0].id}`,
          zohoAccount,
          {
            headers: {
              'Authorization': `Zoho-oauthtoken ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        // Create new account
        result = await axios.post(
          `${this.zohoConfig.apiUrl}/Accounts`,
          zohoAccount,
          {
            headers: {
              'Authorization': `Zoho-oauthtoken ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      return {
        success: true,
        accountId: result.data.data[0].details.id,
        isNew: existing.length === 0
      };

    } catch (error) {
      this.logger.error('Failed to upsert account:', error);
      throw error;
    }
  }

  /**
   * Helper: Generate quote number
   */
  generateQuoteNumber() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const sequence = String(this.quoteSequence++).padStart(4, '0');
    return `${month}-${year}-${sequence}`;
  }

  /**
   * Helper: Get last quote number from Zoho
   */
  async getLastQuoteNumber() {
    const token = await this.ensureValidToken();

    try {
      const response = await axios.get(
        `${this.zohoConfig.apiUrl}/Quotes`,
        {
          params: {
            sort_by: 'Created_Time',
            sort_order: 'desc',
            per_page: 1,
            fields: 'Quote_Number'
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`
          }
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0].Quote_Number;
      }

      return null;

    } catch (error) {
      this.logger.warn('Could not get last quote number:', error);
      return null;
    }
  }

  /**
   * Helper: Find contact by email
   */
  async findContact(email) {
    const token = await this.ensureValidToken();

    try {
      const response = await axios.get(
        `${this.zohoConfig.apiUrl}/Contacts/search`,
        {
          params: {
            criteria: `(Email:equals:${email})`,
            per_page: 1
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`
          }
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }

      return null;

    } catch (error) {
      if (error.response?.status === 204) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Helper: Create contacts for quote
   */
  async createContacts(quoteId, contacts) {
    for (const contact of contacts) {
      await this.syncContacts({
        accountId: quoteId,
        contacts: [contact]
      });
    }
  }

  /**
   * Helper: Map contact role
   */
  mapContactRole(title) {
    const titleLower = (title || '').toLowerCase();

    if (titleLower.includes('ceo') || titleLower.includes('president') ||
        titleLower.includes('owner')) {
      return 'Decision Maker';
    }
    if (titleLower.includes('manager') || titleLower.includes('director')) {
      return 'Evaluator';
    }
    if (titleLower.includes('engineer') || titleLower.includes('technician')) {
      return 'Technical';
    }
    if (titleLower.includes('finance') || titleLower.includes('accounting')) {
      return 'Finance';
    }

    return 'Contact';
  }

  /**
   * Helper: Format equipment details
   */
  formatEquipmentDetails(generators) {
    if (!generators || generators.length === 0) return '';

    return generators.map((gen, index) =>
      `Unit ${index + 1}: ${gen.size}kW ${gen.type} ${gen.model || ''}`
    ).join('\n');
  }

  /**
   * Helper: Format service details
   */
  formatServiceDetails(services) {
    if (!services || services.length === 0) return '';

    return services.map(service =>
      `${service.description}: ${service.frequency || 'As needed'}`
    ).join('\n');
  }

  /**
   * Helper: Format contacts
   */
  formatContacts(contacts) {
    if (!contacts || contacts.length === 0) return '';

    return contacts.map(contact =>
      `${contact.name} (${contact.title}): ${contact.email} / ${contact.phoneOffice || contact.phoneMobile}`
    ).join('\n');
  }

  /**
   * Helper: Get valid till date (30 days from now)
   */
  getValidTillDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  /**
   * Run health checks
   */
  runHealthChecks() {
    const checks = [];

    // Check OAuth token
    checks.push({
      name: 'oauth_token',
      status: this.accessToken ? 'healthy' : 'unhealthy',
      message: this.accessToken ? 'Token valid' : 'No access token'
    });

    // Check Catalyst connection
    checks.push({
      name: 'catalyst_connection',
      status: this.catalystEndpoint ? 'healthy' : 'warning',
      message: this.catalystEndpoint ? 'Catalyst configured' : 'Direct OAuth mode'
    });

    // Check sync queue
    checks.push({
      name: 'sync_queue',
      status: this.syncQueue.length < 100 ? 'healthy' : 'warning',
      message: `${this.syncQueue.length} items in queue`
    });

    return checks;
  }
}

export default EnhancedZohoSyncModule;
