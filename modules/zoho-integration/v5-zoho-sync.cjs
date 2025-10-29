/**
 * Energen Calculator v5.0 <-> Zoho CRM Integration Module
 * Comprehensive bi-directional sync for customers, quotes, and service agreements
 *
 * @module modules/zoho-integration/v5-zoho-sync
 * @version 1.0.0
 */

const axios = require('axios');

class V5ZohoSync {
  constructor(logger) {
    this.logger = logger || console;

    // Zoho OAuth credentials from environment
    this.config = {
      clientId: process.env.ZOHO_CLIENT_ID,
      clientSecret: process.env.ZOHO_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN,
      accountsUrl: process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com',
      apiUrl: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com'
    };

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
     * Ensure we have a valid access token
     * Refreshes automatically when expired
     */
  async ensureAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.config.accountsUrl}/oauth/v2/token`,
        new URLSearchParams({
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token'
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000); // 5 min buffer

      this.logger.info('Zoho access token refreshed successfully');
      return this.accessToken;

    } catch (error) {
      this.logger.error('Failed to refresh Zoho access token:', error.message);
      throw new Error(`Zoho authentication failed: ${error.message}`);
    }
  }

  /**
     * Sync customer data from v5.0 to Zoho CRM
     * Creates or updates Account record
     *
     * @param {Object} customerData - Customer data from v5.0 quote builder
     * @returns {Promise<Object>} Zoho Account record
     */
  async syncCustomerToZoho(customerData) {
    await this.ensureAccessToken();

    try {
      // First, search for existing account by name
      const existingAccount = await this.searchAccountByName(customerData.companyName || customerData.company);

      // Transform v5.0 customer data to Zoho Account format
      const accountData = {
        Account_Name: customerData.companyName || customerData.company || customerData.name,
        Phone: customerData.phone || null,
        Email: customerData.email || null,
        Website: customerData.website || null,
        Billing_Street: customerData.address || null,
        Billing_City: customerData.city || null,
        Billing_State: customerData.state || null,
        Billing_Code: customerData.zip || null,
        Billing_Country: 'USA',

        // Additional enrichment data if available
        Account_Type: this.mapIndustryToAccountType(customerData.industry),
        Service_Territory: this.determineServiceTerritory(customerData.city, customerData.state),

        // Distance and service info
        Distance_from_Shop: customerData.distance ? parseFloat(customerData.distance) : null,

        // Mark as created from Energen Calculator
        Description: `Created from Energen Calculator v5.0 on ${new Date().toLocaleDateString()}`,
        Lead_Source: 'Energen Calculator v5.0'
      };

      if (existingAccount) {
        // Update existing account
        this.logger.info(`Updating existing Zoho account: ${existingAccount.id}`);
        return await this.updateAccount(existingAccount.id, accountData);
      } else {
        // Create new account
        this.logger.info(`Creating new Zoho account for: ${accountData.Account_Name}`);
        return await this.createAccount(accountData);
      }

    } catch (error) {
      this.logger.error('Failed to sync customer to Zoho:', error.message);
      throw error;
    }
  }

  /**
     * Create new Account in Zoho CRM
     */
  async createAccount(accountData) {
    const response = await axios.post(
      `${this.config.apiUrl}/crm/v2/Accounts`,
      { data: [accountData] },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.data[0];
    if (result.code === 'SUCCESS') {
      this.logger.info(`Zoho Account created: ${result.details.id}`);
      return { id: result.details.id, ...accountData };
    } else {
      throw new Error(`Zoho Account creation failed: ${result.message}`);
    }
  }

  /**
     * Update existing Account in Zoho CRM
     */
  async updateAccount(accountId, accountData) {
    const response = await axios.put(
      `${this.config.apiUrl}/crm/v2/Accounts/${accountId}`,
      { data: [accountData] },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.data[0];
    if (result.code === 'SUCCESS') {
      this.logger.info(`Zoho Account updated: ${accountId}`);
      return { id: accountId, ...accountData };
    } else {
      throw new Error(`Zoho Account update failed: ${result.message}`);
    }
  }

  /**
     * Search for Account by company name
     */
  async searchAccountByName(companyName) {
    if (!companyName) return null;

    try {
      const response = await axios.get(
        `${this.config.apiUrl}/crm/v2/Accounts/search`,
        {
          params: { word: companyName.trim() },
          headers: { 'Authorization': `Zoho-oauthtoken ${this.accessToken}` }
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        // Return first match
        return response.data.data[0];
      }

      return null;
    } catch (error) {
      if (error.response?.status === 204) {
        // No results found
        return null;
      }
      throw error;
    }
  }

  /**
     * Sync quote/proposal from v5.0 to Zoho CRM
     * Creates Deal and Quote records with complete service breakdown
     *
     * @param {Object} quoteData - Complete quote data from buildQuoteData()
     * @param {Object} zohoAccount - Zoho Account record (from syncCustomerToZoho)
     * @returns {Promise<Object>} Created Deal and Quote records
     */
  async syncQuoteToZoho(quoteData, zohoAccount) {
    await this.ensureAccessToken();

    try {
      // Step 1: Create Deal (Opportunity)
      const dealData = this.buildDealData(quoteData, zohoAccount);
      const deal = await this.createDeal(dealData);

      // Step 2: Create Quote linked to Deal
      const zohoquoteData = this.buildQuoteData(quoteData, zohoAccount, deal);
      const quote = await this.createQuote(zohoquoteData);

      // Step 3: Create Product Line Items for quote
      await this.createQuoteLineItems(quote.id, quoteData);

      this.logger.info(`Quote synced to Zoho - Deal: ${deal.id}, Quote: ${quote.id}`);

      return {
        dealId: deal.id,
        quoteId: quote.id,
        deal: deal,
        quote: quote
      };

    } catch (error) {
      this.logger.error('Failed to sync quote to Zoho:', error.message);
      throw error;
    }
  }

  /**
     * Build Deal data from v5.0 quote
     */
  buildDealData(quoteData, zohoAccount) {
    const calculation = quoteData.calculation || quoteData.calculations;
    const metadata = quoteData.metadata || {};

    return {
      Deal_Name: `${zohoAccount.Account_Name} - Generator Maintenance ${new Date().getFullYear()}`,
      Account_Name: { id: zohoAccount.id },
      Stage: 'Proposal/Quote',
      Amount: calculation.total || 0,
      Closing_Date: this.getDefaultClosingDate(),

      // Service details
      Service_Type__c: this.determineServiceType(quoteData.services),
      Number_of_Generators__c: quoteData.generators?.length || quoteData.units?.length || 0,
      Total_kW__c: this.calculateTotalKW(quoteData.generators || quoteData.units),

      // Contract info
      Contract_Start_Date__c: new Date().toISOString().split('T')[0],
      Contract_Length_Months__c: 12,

      // Pricing breakdown
      Annual_Labor_Cost__c: calculation.laborCost || 0,
      Annual_Materials_Cost__c: calculation.materialsCost || 0,
      Annual_Mobilization_Cost__c: calculation.mobilizationCost || 0,

      // Metadata
      Quote_Number__c: metadata.estimateNumber || metadata.quoteNumber || `EST-${Date.now()}`,
      Calculation_Hash__c: metadata.calcStateHash || null,

      Description: `Generated from Energen Calculator v5.0\nServices: ${quoteData.services?.join(', ') || 'N/A'}\n\nEstimate: ${metadata.estimateNumber || 'N/A'}`,
      Lead_Source: 'Energen Calculator v5.0'
    };
  }

  /**
     * Build Quote data from v5.0 quote
     */
  buildQuoteData(quoteData, zohoAccount, deal) {
    const calculation = quoteData.calculation || quoteData.calculations;
    const metadata = quoteData.metadata || {};
    const customer = quoteData.customer || {};

    return {
      Subject: `Preventive Maintenance Proposal - ${zohoAccount.Account_Name}`,
      Deal_Name: { id: deal.id },
      Account_Name: { id: zohoAccount.id },
      Quote_Stage: 'Draft',

      // Pricing
      Sub_Total: calculation.subtotal || 0,
      Tax: calculation.tax || 0,
      Grand_Total: calculation.total || 0,
      Discount: 0,

      // Valid dates
      Valid_Till: this.getQuoteExpiryDate(),

      // Billing address (from customer data)
      Billing_Street: customer.address || null,
      Billing_City: customer.city || null,
      Billing_State: customer.state || null,
      Billing_Code: customer.zip || null,
      Billing_Country: 'USA',

      // Shipping address (same as billing for service)
      Shipping_Street: customer.address || null,
      Shipping_City: customer.city || null,
      Shipping_State: customer.state || null,
      Shipping_Code: customer.zip || null,
      Shipping_Country: 'USA',

      Description: `Preventive Maintenance Services\n\nServices Included:\n${this.formatServicesDescription(quoteData.services, calculation.breakdownByService)}\n\nTotal Generators: ${quoteData.generators?.length || 0}\nAnnual Contract Value: $${(calculation.total || 0).toLocaleString()}`
    };
  }

  /**
     * Create Deal in Zoho CRM
     */
  async createDeal(dealData) {
    const response = await axios.post(
      `${this.config.apiUrl}/crm/v2/Deals`,
      { data: [dealData] },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.data[0];
    if (result.code === 'SUCCESS') {
      this.logger.info(`Zoho Deal created: ${result.details.id}`);
      return { id: result.details.id, ...dealData };
    } else {
      throw new Error(`Zoho Deal creation failed: ${result.message}`);
    }
  }

  /**
     * Create Quote in Zoho CRM
     */
  async createQuote(quoteData) {
    const response = await axios.post(
      `${this.config.apiUrl}/crm/v2/Quotes`,
      { data: [quoteData] },
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data.data[0];
    if (result.code === 'SUCCESS') {
      this.logger.info(`Zoho Quote created: ${result.details.id}`);
      return { id: result.details.id, ...quoteData };
    } else {
      throw new Error(`Zoho Quote creation failed: ${result.message}`);
    }
  }

  /**
     * Create Quote Line Items (Product_Details)
     * Each service becomes a line item
     */
  async createQuoteLineItems(quoteId, quoteData) {
    const calculation = quoteData.calculation || quoteData.calculations;
    const breakdown = calculation.breakdownByService || calculation.serviceBreakdown || {};

    const lineItems = [];

    // Create line item for each service
    Object.entries(breakdown).forEach(([serviceCode, serviceData]) => {
      lineItems.push({
        Product_Name: `Service ${serviceCode} - ${this.getServiceName(serviceCode)}`,
        Quantity: serviceData.frequency || 1,
        List_Price: serviceData.total || serviceData.totalCost || 0,
        Discount: 0,
        Total: serviceData.total || serviceData.totalCost || 0,
        Description: `Labor Hours: ${serviceData.laborHours || 0}\nMobilization: ${serviceData.mobilizationHours || 0} hrs`
      });
    });

    // Update quote with line items
    try {
      await axios.put(
        `${this.config.apiUrl}/crm/v2/Quotes/${quoteId}`,
        {
          data: [{
            Product_Details: lineItems
          }]
        },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`Quote line items added: ${lineItems.length} services`);

    } catch (error) {
      this.logger.warn('Failed to add quote line items:', error.message);
      // Don't fail the entire sync if line items fail
    }
  }

  /**
     * Create Service Agreement when quote is won
     * Maps to custom Service_Agreements module in Zoho CRM
     *
     * @param {Object} quoteData - Complete quote data
     * @param {Object} zohoAccount - Zoho Account record
     * @param {Object} zohoDeal - Zoho Deal record
     * @returns {Promise<Object>} Service Agreement record
     */
  async createServiceAgreement(quoteData, zohoAccount, zohoDeal) {
    await this.ensureAccessToken();

    const calculation = quoteData.calculation || quoteData.calculations;
    const serviceSchedule = quoteData.serviceSchedule;

    const agreementData = {
      Name: `${zohoAccount.Account_Name} - Maintenance Agreement ${new Date().getFullYear()}`,
      Account: { id: zohoAccount.id },
      Deal: { id: zohoDeal.id },

      // Contract dates
      Start_Date: new Date().toISOString().split('T')[0],
      End_Date: this.getContractEndDate(12), // 12 month contract
      Status: 'Active',

      // Service details
      Service_Type: this.determineServiceType(quoteData.services),
      Frequency: this.determineServiceFrequency(quoteData.services),

      // Financial
      Contract_Value: calculation.total || 0,
      Annual_Value: calculation.total || 0,

      // Generator information
      Generators: JSON.stringify(this.formatGeneratorsForZoho(quoteData.generators || quoteData.units)),

      // Service schedule (quarterly assignment)
      Service_Schedule: serviceSchedule ? JSON.stringify(serviceSchedule) : null,

      // Services included
      Services_Included: (quoteData.services || []).join(', '),

      Description: `Preventive maintenance agreement for ${(quoteData.generators || quoteData.units || []).length} generators.\n\nServices: ${(quoteData.services || []).join(', ')}\nTotal kW: ${this.calculateTotalKW(quoteData.generators || quoteData.units)}`
    };

    try {
      const response = await axios.post(
        `${this.config.apiUrl}/crm/v2/Service_Agreements`,
        { data: [agreementData] },
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = response.data.data[0];
      if (result.code === 'SUCCESS') {
        this.logger.info(`Service Agreement created: ${result.details.id}`);

        // Create scheduled work orders for the agreement
        await this.createScheduledWorkOrders(result.details.id, quoteData, zohoAccount);

        return { id: result.details.id, ...agreementData };
      } else {
        throw new Error(`Service Agreement creation failed: ${result.message}`);
      }

    } catch (error) {
      this.logger.error('Failed to create Service Agreement:', error.message);
      throw error;
    }
  }

  /**
     * Create scheduled work orders based on service schedule
     */
  async createScheduledWorkOrders(agreementId, quoteData, zohoAccount) {
    const serviceSchedule = quoteData.serviceSchedule;
    if (!serviceSchedule || !serviceSchedule.quarterly) {
      this.logger.warn('No service schedule available, skipping work order creation');
      return;
    }

    const workOrders = [];

    // Create work orders for each quarter
    Object.entries(serviceSchedule.quarterly).forEach(([quarter, services]) => {
      if (services && services.length > 0) {
        const quarterDate = this.getQuarterDate(quarter);

        workOrders.push({
          Name: `${zohoAccount.Account_Name} - Q${quarter} Maintenance`,
          Account: { id: zohoAccount.id },
          Service_Agreement: { id: agreementId },
          Scheduled_Date: quarterDate,
          Priority: 'Medium',
          Status: 'Scheduled',
          Description: `Quarterly maintenance services:\n${services.join('\n')}`
        });
      }
    });

    if (workOrders.length > 0) {
      try {
        const response = await axios.post(
          `${this.config.apiUrl}/crm/v2/Work_Orders`,
          { data: workOrders },
          {
            headers: {
              'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        this.logger.info(`Created ${workOrders.length} scheduled work orders`);

      } catch (error) {
        this.logger.warn('Failed to create work orders:', error.message);
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  mapIndustryToAccountType(industry) {
    const mapping = {
      'Healthcare': 'Healthcare',
      'Education': 'Educational Institution',
      'Government/Public Service': 'Government Agency',
      'Manufacturing': 'Manufacturing',
      'Technology': 'Technology',
      'Retail': 'Retail',
      'Food Service': 'Restaurant/Food Service',
      'Financial Services': 'Financial Institution',
      'Hospitality': 'Hotel/Lodging'
    };

    return mapping[industry] || 'Customer';
  }

  determineServiceTerritory(city, state) {
    if (!city || !state) return null;

    // Map based on California regions
    const bayArea = ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Fremont', 'Hayward'];
    const sacramento = ['Sacramento', 'Roseville', 'Folsom', 'Davis'];

    if (bayArea.some(c => city.includes(c))) return 'San Francisco Bay Area';
    if (sacramento.some(c => city.includes(c))) return 'Sacramento';

    return state === 'CA' ? 'Northern California' : state;
  }

  determineServiceType(services) {
    if (!services || services.length === 0) return 'Maintenance';
    if (services.includes('A')) return 'Comprehensive Maintenance';
    if (services.length >= 3) return 'Full Service';
    return 'Preventive Maintenance';
  }

  determineServiceFrequency(services) {
    if (!services || services.length === 0) return null;

    // Determine most frequent service
    const frequencies = {
      'A': 'Annual',
      'B': 'Semi-Annual',
      'C': 'Quarterly',
      'D': 'Semi-Annual',
      'E': 'Quarterly',
      'F': 'Annual',
      'G': 'Quarterly',
      'H': 'Monthly',
      'I': 'Annual',
      'J': 'Annual'
    };

    // Return highest frequency
    if (services.includes('H')) return 'Monthly';
    if (services.includes('C') || services.includes('E') || services.includes('G')) return 'Quarterly';
    if (services.includes('B') || services.includes('D')) return 'Semi-Annual';
    return 'Annual';
  }

  calculateTotalKW(generators) {
    if (!generators || !Array.isArray(generators)) return 0;
    return generators.reduce((sum, gen) => sum + (parseFloat(gen.kw) || 0), 0);
  }

  formatGeneratorsForZoho(generators) {
    if (!generators || !Array.isArray(generators)) return [];

    return generators.map(gen => ({
      kw: gen.kw,
      brand: gen.brand || '',
      model: gen.model || '',
      location: gen.location || '',
      serialNumber: gen.serialNumber || gen.serial || ''
    }));
  }

  formatServicesDescription(services, breakdown) {
    if (!services || !Array.isArray(services)) return 'N/A';

    const serviceNames = {
      'A': 'Comprehensive Inspection',
      'B': 'Oil & Filter Change',
      'C': 'Coolant System Service',
      'D': 'Load Bank Testing',
      'E': 'Transfer Switch Maintenance',
      'F': 'Battery Maintenance',
      'G': 'Electrical System Check',
      'H': 'Exhaust System Inspection',
      'I': 'Engine Overhaul',
      'J': 'Governor & Controls'
    };

    return services.map(code => {
      const name = serviceNames[code] || `Service ${code}`;
      const data = breakdown && breakdown[code];
      const cost = data ? `$${(data.total || data.totalCost || 0).toLocaleString()}` : '';
      return `- ${name} ${cost}`;
    }).join('\n');
  }

  getServiceName(code) {
    const names = {
      'A': 'Comprehensive Inspection',
      'B': 'Oil & Filter Change',
      'C': 'Coolant System Service',
      'D': 'Load Bank Testing',
      'E': 'Transfer Switch Maintenance',
      'F': 'Battery Maintenance',
      'G': 'Electrical System Check',
      'H': 'Exhaust System Inspection',
      'I': 'Engine Overhaul',
      'J': 'Governor & Controls'
    };

    return names[code] || `Service ${code}`;
  }

  getDefaultClosingDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toISOString().split('T')[0];
  }

  getQuoteExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 60); // 60 days validity
    return date.toISOString().split('T')[0];
  }

  getContractEndDate(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  getQuarterDate(quarter) {
    const now = new Date();
    const year = now.getFullYear();

    const quarterDates = {
      '1': new Date(year, 2, 15), // March 15
      '2': new Date(year, 5, 15), // June 15
      '3': new Date(year, 8, 15), // September 15
      '4': new Date(year, 11, 15) // December 15
    };

    const date = quarterDates[quarter] || now;
    return date.toISOString().split('T')[0];
  }
}

module.exports = V5ZohoSync;
