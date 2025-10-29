/**
 * Zoho CRM Sync Module
 * Refactored to use new modular architecture
 * @module zoho-sync/module
 * @version 4.1.0
 */

import { EnergenModule } from '../core/interfaces.js';

/**
 * Zoho CRM Sync Module implementation
 */
export class ZohoSyncModule extends EnergenModule {
  constructor(config) {
    super({
      name: 'zoho-sync',
      version: '4.1.0',
      ...config
    });

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.syncQueue = [];
    this.syncHistory = new Map();
    this.maxSyncHistorySize = 100;
  }

  /**
   * Module-specific initialization
   */
  async onInit(config) {
    // Validate configuration
    this.validateZohoConfig(config);

    // Initialize OAuth if tokens provided
    if (config.refreshToken) {
      await this.initializeOAuth(config);
    }

    // Set up event listeners
    this.setupEventListeners();

    // Start sync processor if enabled
    if (config.enabled && config.autoSync) {
      this.startSyncProcessor();
    }

    this.logger.info('Zoho sync module initialized', {
      enabled: config.enabled,
      autoSync: config.autoSync,
      hasTokens: !!this.accessToken
    });
  }

  /**
   * Validate Zoho configuration
   */
  validateZohoConfig(config) {
    if (config.enabled) {
      const required = ['clientId', 'clientSecret', 'redirectUri'];
      for (const field of required) {
        if (!config[field]) {
          throw new Error(`Zoho configuration missing required field: ${field}`);
        }
      }
    }
  }

  /**
   * Initialize OAuth tokens
   */
  async initializeOAuth(config) {
    try {
      // In production, would refresh the access token
      this.refreshToken = config.refreshToken;

      // Mock token refresh
      this.accessToken = 'mock_access_token_' + Date.now();
      this.tokenExpiry = Date.now() + 3600000; // 1 hour

      this.logger.info('Zoho OAuth tokens initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Zoho OAuth:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const eventBus = this.getDependency('eventBus');

    // Listen for sync requests
    eventBus.on('zoho:sync', async (data) => {
      try {
        const result = await this.syncData(data);
        eventBus.emit('zoho:syncComplete', {
          requestId: data.requestId,
          result
        });
      } catch (error) {
        eventBus.emit('zoho:syncError', {
          requestId: data.requestId,
          error: error.message
        });
      }
    });

    // Listen for customer search requests
    eventBus.on('zoho:searchCustomer', async (data) => {
      try {
        const result = await this.searchCustomer(data.query);
        eventBus.emit('zoho:customerFound', {
          requestId: data.requestId,
          result
        });
      } catch (error) {
        eventBus.emit('zoho:searchError', {
          requestId: data.requestId,
          error: error.message
        });
      }
    });

    // Listen for data changes to sync
    eventBus.on('data:updated', (data) => {
      if (this.config.autoSync) {
        this.queueSync(data);
      }
    });
  }

  /**
   * Start sync processor
   */
  startSyncProcessor() {
    this.syncInterval = setInterval(async () => {
      await this.processSyncQueue();
    }, this.config.syncInterval || 30000); // 30 seconds default

    this.logger.info('Sync processor started');
  }

  /**
   * Process sync queue
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    const batch = this.syncQueue.splice(0, 10); // Process up to 10 items

    for (const item of batch) {
      try {
        await this.syncData(item);
        this.recordSyncHistory(item, 'success');
      } catch (error) {
        this.logger.error('Sync failed for item:', error);
        this.recordSyncHistory(item, 'failed', error.message);

        // Re-queue if retryable
        if (item.retries < 3) {
          item.retries = (item.retries || 0) + 1;
          this.syncQueue.push(item);
        }
      }
    }
  }

  /**
   * Queue data for sync
   */
  queueSync(data) {
    this.syncQueue.push({
      ...data,
      queuedAt: new Date(),
      retries: 0
    });

    this.logger.debug(`Queued sync for ${data.type}: ${data.id}`);
  }

  /**
   * Sync data to Zoho CRM
   */
  async syncData(data) {
    this.metrics.requestCount++;
    const startTime = Date.now();

    try {
      // Check token validity
      await this.ensureValidToken();

      // Determine sync type
      const syncResult = await this.performSync(data);

      // Track metrics
      const duration = Date.now() - startTime;
      this.trackMetric('syncTime', duration);

      // Emit success event
      this.emit('zoho:synced', {
        type: data.type,
        id: data.id,
        duration,
        result: syncResult
      });

      return syncResult;
    } catch (error) {
      this.handleError(error, 'syncData');
      throw error;
    }
  }

  /**
   * Perform the actual sync
   */
  async performSync(data) {
    // Mock implementation - would call actual Zoho API
    const { type, id, entity } = data;

    switch (type) {
      case 'customer':
        return await this.syncCustomer(entity);

      case 'quote':
        return await this.syncQuote(entity);

      case 'invoice':
        return await this.syncInvoice(entity);

      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }

  /**
   * Sync customer to Zoho
   */
  async syncCustomer(customer) {
    // Mock implementation
    const zohoCustomer = {
      id: 'ZOHO_' + Date.now(),
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      syncedAt: new Date()
    };

    this.logger.info(`Synced customer to Zoho: ${zohoCustomer.id}`);

    return zohoCustomer;
  }

  /**
   * Sync quote to Zoho
   */
  async syncQuote(quote) {
    // Mock implementation
    const zohoQuote = {
      id: 'ZOHO_QUOTE_' + Date.now(),
      customerId: quote.customerId,
      items: quote.items,
      total: quote.total,
      status: 'draft',
      syncedAt: new Date()
    };

    this.logger.info(`Synced quote to Zoho: ${zohoQuote.id}`);

    return zohoQuote;
  }

  /**
   * Sync invoice to Zoho
   */
  async syncInvoice(invoice) {
    // Mock implementation
    const zohoInvoice = {
      id: 'ZOHO_INV_' + Date.now(),
      customerId: invoice.customerId,
      items: invoice.items,
      total: invoice.total,
      status: 'pending',
      syncedAt: new Date()
    };

    this.logger.info(`Synced invoice to Zoho: ${zohoInvoice.id}`);

    return zohoInvoice;
  }

  /**
   * Search customer in Zoho CRM
   */
  async searchCustomer(query) {
    this.metrics.requestCount++;

    try {
      // Check token validity
      await this.ensureValidToken();

      // Mock search implementation
      const results = this.mockCustomerSearch(query);

      this.emit('zoho:searchComplete', {
        query,
        resultCount: results.length
      });

      return results;
    } catch (error) {
      this.handleError(error, 'searchCustomer');
      throw error;
    }
  }

  /**
   * Mock customer search
   */
  mockCustomerSearch(query) {
    // In production, would call actual Zoho Search API
    if (!query || query.length < 3) {
      return [];
    }

    return [
      {
        id: 'ZOHO_CUST_001',
        name: 'Sample Customer',
        email: 'sample@example.com',
        phone: '555-0100',
        company: 'Sample Corp',
        matchScore: 0.95
      }
    ];
  }

  /**
   * Ensure valid access token
   */
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      // Mock token refresh - would call actual Zoho OAuth endpoint
      this.accessToken = 'mock_refreshed_token_' + Date.now();
      this.tokenExpiry = Date.now() + 3600000; // 1 hour

      this.logger.info('Zoho access token refreshed');
    } catch (error) {
      this.logger.error('Failed to refresh Zoho token:', error);
      throw error;
    }
  }

  /**
   * Record sync history
   */
  recordSyncHistory(data, status, error = null) {
    const historyEntry = {
      type: data.type,
      id: data.id,
      status,
      error,
      timestamp: new Date()
    };

    const key = `${data.type}_${data.id}`;

    if (!this.syncHistory.has(key)) {
      this.syncHistory.set(key, []);
    }

    const history = this.syncHistory.get(key);
    history.push(historyEntry);

    // Limit history size
    if (history.length > 10) {
      history.shift();
    }

    // Limit total history size
    if (this.syncHistory.size > this.maxSyncHistorySize) {
      const firstKey = this.syncHistory.keys().next().value;
      this.syncHistory.delete(firstKey);
    }
  }

  /**
   * Get sync statistics
   */
  getStatistics() {
    const stats = {
      enabled: this.config.enabled,
      connected: !!this.accessToken,
      tokenValid: this.accessToken && Date.now() < this.tokenExpiry,
      queueSize: this.syncQueue.length,
      syncHistory: this.syncHistory.size,
      totalSyncs: this.metrics.requestCount,
      averageSyncTime: this.metrics.syncTime
        ? this.metrics.syncTime / this.metrics.requestCount
        : 0,
      errorRate: this.metrics.requestCount > 0
        ? (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) + '%'
        : '0%'
    };

    // Count sync history by status
    let successCount = 0;
    let failedCount = 0;

    for (const history of this.syncHistory.values()) {
      for (const entry of history) {
        if (entry.status === 'success') successCount++;
        else if (entry.status === 'failed') failedCount++;
      }
    }

    stats.recentSyncs = {
      success: successCount,
      failed: failedCount
    };

    return stats;
  }

  /**
   * Update configuration dynamically
   */
  async onConfigChange(newConfig) {
    // Update OAuth if credentials changed
    if (newConfig.clientId !== this.config.clientId ||
        newConfig.clientSecret !== this.config.clientSecret) {
      this.accessToken = null;
      this.tokenExpiry = null;

      if (newConfig.refreshToken) {
        await this.initializeOAuth(newConfig);
      }
    }

    // Update sync settings
    if (newConfig.autoSync !== this.config.autoSync) {
      if (newConfig.autoSync) {
        this.startSyncProcessor();
      } else if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }
    }

    this.config = { ...this.config, ...newConfig };
    this.logger.info('Zoho sync configuration updated');
  }

  /**
   * Module-specific health checks
   */
  runHealthChecks() {
    const checks = super.runHealthChecks();

    // Check OAuth status
    checks.push({
      name: 'oauth',
      passed: !!this.accessToken,
      message: this.accessToken
        ? 'OAuth tokens available'
        : 'No OAuth tokens'
    });

    // Check token validity
    if (this.accessToken) {
      const tokenValid = Date.now() < this.tokenExpiry;
      checks.push({
        name: 'tokenValidity',
        passed: tokenValid,
        message: tokenValid
          ? `Token valid for ${Math.floor((this.tokenExpiry - Date.now()) / 60000)} minutes`
          : 'Token expired'
      });
    }

    // Check sync queue
    checks.push({
      name: 'syncQueue',
      passed: this.syncQueue.length < 100,
      message: `${this.syncQueue.length} items in sync queue`
    });

    return checks;
  }

  /**
   * Module cleanup
   */
  async onShutdown() {
    // Stop sync processor
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Process remaining queue items
    if (this.syncQueue.length > 0) {
      this.logger.info(`Processing ${this.syncQueue.length} remaining sync items...`);
      await this.processSyncQueue();
    }

    // Clear sensitive data
    this.accessToken = null;
    this.refreshToken = null;

    this.logger.info('Zoho sync module shut down');
  }
}

export default ZohoSyncModule;
