/**
 * Zoho CRM Service
 * Handles OAuth2, API calls, and data synchronization
 * @module zoho-sync/zoho-service
 * @version 4.5.0
 */

import axios from 'axios';

export class ZohoCRMService {
  constructor(config) {
    this.clientId = config.clientId || process.env.ZOHO_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.ZOHO_CLIENT_SECRET;
    this.refreshToken = config.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
    this.accountsUrl = config.accountsUrl || 'https://accounts.zoho.com';
    this.apiDomain = config.apiDomain || 'https://www.zohoapis.com';
    this.apiVersion = config.apiVersion || 'v3';

    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
     * Refresh access token using refresh token
     */
  async refreshAccessToken() {
    try {
      const url = `${this.accountsUrl}/oauth/v2/token`;
      const params = new URLSearchParams({
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token'
      });

      const response = await axios.post(url, params);

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        return this.accessToken;
      }

      throw new Error('Failed to refresh access token');
    } catch (error) {
      console.error('Zoho OAuth error:', error.message);
      throw error;
    }
  }

  /**
     * Ensure valid access token
     */
  async ensureAccessToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  /**
     * Make authenticated API request
     */
  async apiRequest(method, endpoint, data = null) {
    const token = await this.ensureAccessToken();
    const url = `${this.apiDomain}/crm/${this.apiVersion}/${endpoint}`;

    const config = {
      method,
      url,
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Zoho API error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
     * Create or update a lead
     */
  async upsertLead(leadData) {
    const data = {
      data: [{
        Company: leadData.company,
        Last_Name: leadData.lastName || leadData.company,
        First_Name: leadData.firstName || '',
        Email: leadData.email,
        Phone: leadData.phone,
        Street: leadData.address,
        City: leadData.city,
        State: leadData.state,
        Zip_Code: leadData.zip,
        Lead_Source: leadData.source || 'Energen Calculator',
        Lead_Status: leadData.status || 'Not Contacted',
        Description: leadData.description || 'Generated from Energen Calculator v4.5'
      }],
      duplicate_check_fields: ['Email', 'Phone'],
      trigger: ['workflow', 'blueprint']
    };

    return await this.apiRequest('POST', 'Leads/upsert', data);
  }

  /**
     * Create a quote
     */
  async createQuote(quoteData) {
    const data = {
      data: [{
        Subject: `Quote ${quoteData.quoteNumber}`,
        Quote_Stage: 'Draft',
        Valid_Till: this.getValidTillDate(),
        Account_Name: quoteData.accountId,
        Contact_Name: quoteData.contactId,
        Billing_Street: quoteData.address,
        Billing_City: quoteData.city,
        Billing_State: quoteData.state,
        Billing_Code: quoteData.zip,
        Product_Details: this.formatProductDetails(quoteData.services),
        Grand_Total: quoteData.grandTotal,
        Sub_Total: quoteData.subtotal,
        Tax: quoteData.tax,
        Adjustment: quoteData.mileageCost,
        Terms_and_Conditions: 'Quote valid for 30 days. Payment terms: Net 30.',
        Description: quoteData.description || 'Generator maintenance services quote'
      }]
    };

    return await this.apiRequest('POST', 'Quotes', data);
  }

  /**
     * Create or update an account
     */
  async upsertAccount(accountData) {
    const data = {
      data: [{
        Account_Name: accountData.company,
        Phone: accountData.phone,
        Website: accountData.website,
        Billing_Street: accountData.address,
        Billing_City: accountData.city,
        Billing_State: accountData.state,
        Billing_Code: accountData.zip,
        Account_Type: accountData.type || 'Customer',
        Industry: accountData.industry,
        Employees: accountData.employees,
        Annual_Revenue: accountData.revenue
      }],
      duplicate_check_fields: ['Account_Name', 'Phone'],
      trigger: ['workflow']
    };

    return await this.apiRequest('POST', 'Accounts/upsert', data);
  }

  /**
     * Search for accounts
     */
  async searchAccounts(searchTerm) {
    const criteria = `(Account_Name:contains:${searchTerm})or(Phone:contains:${searchTerm})`;
    return await this.apiRequest('GET', `Accounts/search?criteria=${encodeURIComponent(criteria)}`);
  }

  /**
     * Search for contacts
     */
  async searchContacts(searchTerm) {
    const criteria = `(Email:contains:${searchTerm})or(Phone:contains:${searchTerm})or(Last_Name:contains:${searchTerm})`;
    return await this.apiRequest('GET', `Contacts/search?criteria=${encodeURIComponent(criteria)}`);
  }

  /**
     * Create activity/task
     */
  async createActivity(activityData) {
    const data = {
      data: [{
        Subject: activityData.subject,
        Due_Date: activityData.dueDate || this.getTomorrowDate(),
        Status: 'Not Started',
        Priority: activityData.priority || 'Normal',
        What_Id: activityData.relatedTo, // Related record ID
        Description: activityData.description,
        Activity_Type: activityData.type || 'Call'
      }]
    };

    return await this.apiRequest('POST', 'Tasks', data);
  }

  /**
     * Format product details for quote
     */
  formatProductDetails(services) {
    const serviceMap = {
      'A': { name: 'Comprehensive Inspection', price: 500 },
      'B': { name: 'Oil & Filter Service', price: 400 },
      'C': { name: 'Coolant Service', price: 350 },
      'D': { name: 'Oil & Fuel Analysis', price: 200 },
      'E': { name: 'Load Bank Testing', price: 800 },
      'F': { name: 'Engine Tune-Up (Diesel)', price: 600 },
      'G': { name: 'Gas Engine Tune-Up', price: 550 },
      'H': { name: 'Generator Electrical Testing', price: 700 },
      'I': { name: 'Transfer Switch Service', price: 450 },
      'J': { name: 'Thermal Imaging Scan', price: 300 }
    };

    return services.map((service, index) => ({
      product: {
        Product_Code: `SVC-${service}`,
        name: serviceMap[service]?.name || `Service ${service}`
      },
      quantity: 1,
      Discount: 0,
      total_after_discount: serviceMap[service]?.price || 0,
      net_total: serviceMap[service]?.price || 0,
      list_price: serviceMap[service]?.price || 0,
      unit_price: serviceMap[service]?.price || 0,
      line_tax: [],
      product_description: serviceMap[service]?.name || `Service ${service}`
    }));
  }

  /**
     * Get date 30 days from now
     */
  getValidTillDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  /**
     * Get tomorrow's date
     */
  getTomorrowDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }
}

export default ZohoCRMService;
