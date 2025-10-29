/**
 * Zoho Work Order API
 * Manages service work orders in Zoho CRM
 *
 * Auto-schedules work orders from service agreements
 * Tracks technician assignments and completion
 */

const fetch = require('node-fetch');
require('dotenv').config();

class ZohoWorkOrderAPI {
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

    this.moduleName = 'Work_Orders';
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
     * Create work order from service schedule
     */
  async createWorkOrder(workOrderData) {
    const {
      // References
      serviceAgreementId,
      generatorAssetId,
      customerId,
      customerName,

      // Work Order Details
      workOrderNumber,
      serviceType,  // Service code from calculator: 'A', 'B', 'C', etc.
      scheduledDate,
      scheduledTime,

      // Location
      serviceAddress,
      siteContact,
      sitePhone,

      // Assignment
      technicianId,
      technicianName,

      // Status
      status = 'Scheduled',
      priority = 'Normal',

      // Service Details (from calculator)
      serviceName,
      estimatedDuration,  // In hours
      partsRequired = [],
      specialInstructions = ''
    } = workOrderData;

    const record = {
      data: [{
        Work_Order_Number: workOrderNumber,

        // Link to related records
        Service_Agreement: serviceAgreementId ? { id: serviceAgreementId } : null,
        Generator_Asset: generatorAssetId ? { id: generatorAssetId } : null,
        Customer_Account: customerId ? {
          id: customerId,
          name: customerName
        } : null,

        // Service Details
        Service_Type: serviceType,
        Service_Name: serviceName,

        // Schedule
        Scheduled_Date: scheduledDate,
        Scheduled_Time: scheduledTime,
        Estimated_Duration: estimatedDuration,

        // Location
        Service_Address: serviceAddress,
        Site_Contact: siteContact,
        Site_Phone: sitePhone,

        // Assignment
        Assigned_Technician: technicianId ? {
          id: technicianId,
          name: technicianName
        } : null,

        // Status
        Status: status,
        Priority: priority,

        // Additional Details
        Parts_Required: partsRequired.join(';'),  // Multi-select or JSON
        Special_Instructions: specialInstructions,

        // Tracking
        Created_From_Calculator: true,
        Auto_Scheduled: true
      }]
    };

    try {
      this.logger.info('📝 Creating work order in Zoho CRM...');
      const result = await this.makeApiRequest(`/${this.moduleName}`, 'POST', record);

      if (result.data && result.data[0]) {
        const created = result.data[0];
        this.logger.info(`✅ Work order created: ${created.details.id}`);
        return {
          success: true,
          workOrderId: created.details.id,
          data: created.details
        };
      }

      throw new Error('Unexpected response format from Zoho');
    } catch (error) {
      this.logger.error('❌ Failed to create work order:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Update work order
     */
  async updateWorkOrder(workOrderId, updates) {
    const record = {
      data: [{
        id: workOrderId,
        ...updates
      }]
    };

    try {
      this.logger.info(`📝 Updating work order ${workOrderId}...`);
      const result = await this.makeApiRequest(`/${this.moduleName}`, 'PUT', record);

      if (result.data && result.data[0]) {
        this.logger.info(`✅ Work order updated: ${workOrderId}`);
        return {
          success: true,
          workOrderId: workOrderId,
          data: result.data[0]
        };
      }

      throw new Error('Unexpected response format from Zoho');
    } catch (error) {
      this.logger.error(`❌ Failed to update work order ${workOrderId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Get work order by ID
     */
  async getWorkOrder(workOrderId) {
    try {
      this.logger.info(`🔍 Fetching work order ${workOrderId}...`);
      const result = await this.makeApiRequest(`/${this.moduleName}/${workOrderId}`, 'GET');

      if (result.data && result.data[0]) {
        return {
          success: true,
          workOrder: result.data[0]
        };
      }

      throw new Error('Work order not found');
    } catch (error) {
      this.logger.error(`❌ Failed to fetch work order ${workOrderId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Get work orders by service agreement
     */
  async getWorkOrdersByAgreement(agreementId) {
    try {
      this.logger.info(`🔍 Fetching work orders for agreement ${agreementId}...`);

      const criteria = `(Service_Agreement:equals:${agreementId})`;
      const result = await this.makeApiRequest(
        `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        'GET'
      );

      return {
        success: true,
        workOrders: result.data || []
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch work orders:', error.message);
      return {
        success: false,
        error: error.message,
        workOrders: []
      };
    }
  }

  /**
     * Get work orders by technician
     */
  async getWorkOrdersByTechnician(technicianId, status = null) {
    try {
      this.logger.info(`🔍 Fetching work orders for technician ${technicianId}...`);

      let criteria = `(Assigned_Technician:equals:${technicianId})`;
      if (status) {
        criteria = `((Assigned_Technician:equals:${technicianId})and(Status:equals:${status}))`;
      }

      const result = await this.makeApiRequest(
        `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        'GET'
      );

      return {
        success: true,
        workOrders: result.data || []
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch work orders:', error.message);
      return {
        success: false,
        error: error.message,
        workOrders: []
      };
    }
  }

  /**
     * Get work orders by date range
     */
  async getWorkOrdersByDateRange(startDate, endDate, status = null) {
    try {
      this.logger.info(`🔍 Fetching work orders from ${startDate} to ${endDate}...`);

      let criteria = `((Scheduled_Date:greater_equal:${startDate})and(Scheduled_Date:less_equal:${endDate}))`;
      if (status) {
        criteria = `((Scheduled_Date:greater_equal:${startDate})and(Scheduled_Date:less_equal:${endDate})and(Status:equals:${status}))`;
      }

      const result = await this.makeApiRequest(
        `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        'GET'
      );

      return {
        success: true,
        workOrders: result.data || []
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch work orders:', error.message);
      return {
        success: false,
        error: error.message,
        workOrders: []
      };
    }
  }

  /**
     * Assign work order to technician
     */
  async assignTechnician(workOrderId, technicianId, technicianName) {
    const updates = {
      Assigned_Technician: {
        id: technicianId,
        name: technicianName
      },
      Status: 'Assigned',
      Assignment_Date: new Date().toISOString().split('T')[0]
    };

    return await this.updateWorkOrder(workOrderId, updates);
  }

  /**
     * Start work order (technician arrives on site)
     */
  async startWorkOrder(workOrderId) {
    const updates = {
      Status: 'In Progress',
      Actual_Start_Time: new Date().toISOString()
    };

    return await this.updateWorkOrder(workOrderId, updates);
  }

  /**
     * Complete work order with service report
     */
  async completeWorkOrder(workOrderId, completionData) {
    const {
      completionNotes,
      hoursRun,
      partsUsed = [],
      nextServiceDue,
      technicianSignature,
      customerSignature
    } = completionData;

    const updates = {
      Status: 'Completed',
      Completion_Date: new Date().toISOString().split('T')[0],
      Actual_End_Time: new Date().toISOString(),
      Completion_Notes: completionNotes,
      Hours_Run: hoursRun,
      Parts_Used: partsUsed.join(';'),
      Next_Service_Due: nextServiceDue,
      Technician_Signature: technicianSignature,
      Customer_Signature: customerSignature
    };

    const result = await this.updateWorkOrder(workOrderId, updates);

    // If successful, update the generator asset with new service dates
    if (result.success && result.data) {
      const workOrder = await this.getWorkOrder(workOrderId);
      if (workOrder.success && workOrder.workOrder.Generator_Asset) {
        const ZohoGeneratorAssetAPI = require('./zoho-generator-asset-api.cjs');
        const assetAPI = new ZohoGeneratorAssetAPI(this.logger);

        await assetAPI.updateServiceDates(workOrder.workOrder.Generator_Asset.id, {
          lastServiceDate: updates.Completion_Date,
          nextServiceDue: nextServiceDue,
          hoursRun: hoursRun
        });
      }
    }

    return result;
  }

  /**
     * Cancel work order
     */
  async cancelWorkOrder(workOrderId, reason = '') {
    const updates = {
      Status: 'Cancelled',
      Cancellation_Date: new Date().toISOString().split('T')[0],
      Cancellation_Reason: reason
    };

    return await this.updateWorkOrder(workOrderId, updates);
  }

  /**
     * Reschedule work order
     */
  async rescheduleWorkOrder(workOrderId, newDate, newTime, reason = '') {
    const updates = {
      Scheduled_Date: newDate,
      Scheduled_Time: newTime,
      Reschedule_Reason: reason,
      Reschedule_Count: 1  // This should increment existing value
    };

    return await this.updateWorkOrder(workOrderId, updates);
  }

  /**
     * Get upcoming scheduled work orders
     */
  async getUpcomingWorkOrders(daysAhead = 30) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date(Date.now() + (daysAhead * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

      this.logger.info(`🔍 Fetching upcoming work orders (next ${daysAhead} days)...`);

      const criteria = `((Scheduled_Date:greater_equal:${today})and(Scheduled_Date:less_equal:${futureDate})and(Status:equals:Scheduled))`;
      const result = await this.makeApiRequest(
        `/${this.moduleName}/search?criteria=${encodeURIComponent(criteria)}`,
        'GET'
      );

      return {
        success: true,
        workOrders: result.data || []
      };
    } catch (error) {
      this.logger.error('❌ Failed to fetch upcoming work orders:', error.message);
      return {
        success: false,
        error: error.message,
        workOrders: []
      };
    }
  }
}

module.exports = ZohoWorkOrderAPI;
