/**
 * Customer Enrichment Module
 * Refactored to use new modular architecture
 * @module customer-enrichment/module
 * @version 4.1.0
 */

import { EnergenModule } from '../core/interfaces.js';
import { CustomerEnrichmentService } from './index.js';

/**
 * Customer Enrichment Module implementation
 */
export class CustomerEnrichmentModule extends EnergenModule {
  constructor(config) {
    super({
      name: 'customer-enrichment',
      version: '4.1.0',
      ...config
    });
    
    this.enrichmentService = null;
    this.providers = new Map();
  }

  /**
   * Module-specific initialization
   */
  async onInit(config) {
    // Initialize enrichment service
    this.enrichmentService = new CustomerEnrichmentService();
    
    // Configure providers
    if (config.providers) {
      await this.configureProviders(config.providers);
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Configure caching
    if (config.cacheEnabled) {
      this.setupCaching(config);
    }
    
    this.logger.info('Customer enrichment module initialized');
  }

  /**
   * Configure enrichment providers
   */
  async configureProviders(providers) {
    // Google Places provider
    if (providers.google?.enabled) {
      this.providers.set('google', {
        enabled: true,
        apiKey: providers.google.apiKey,
        rateLimit: providers.google.rateLimit || 100
      });
      this.logger.info('Google Places provider configured');
    }
    
    // Brandfetch provider
    if (providers.brandfetch?.enabled) {
      this.providers.set('brandfetch', {
        enabled: true,
        apiKey: providers.brandfetch.apiKey,
        rateLimit: providers.brandfetch.rateLimit || 50
      });
      this.logger.info('Brandfetch provider configured');
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const eventBus = this.getDependency('eventBus');
    
    // Listen for enrichment requests
    eventBus.on('enrichment:request', async (data) => {
      try {
        const result = await this.enrich(data.customer, data.options);
        eventBus.emit('enrichment:response', {
          requestId: data.requestId,
          result
        });
      } catch (error) {
        eventBus.emit('enrichment:error', {
          requestId: data.requestId,
          error: error.message
        });
      }
    });
    
    // Listen for batch enrichment requests
    eventBus.on('enrichment:batchRequest', async (data) => {
      try {
        const results = await this.batchEnrich(data.customers, data.options);
        eventBus.emit('enrichment:batchResponse', {
          requestId: data.requestId,
          results
        });
      } catch (error) {
        eventBus.emit('enrichment:batchError', {
          requestId: data.requestId,
          error: error.message
        });
      }
    });
  }

  /**
   * Set up caching
   */
  setupCaching(config) {
    this.cacheConfig = {
      enabled: true,
      ttl: config.cacheTTL || 3600000, // 1 hour default
      maxSize: config.cacheMaxSize || 1000
    };
    
    // Clear cache periodically
    setInterval(() => {
      this.enrichmentService.clearCaches();
      this.logger.debug('Enrichment cache cleared');
    }, this.cacheConfig.ttl);
  }

  /**
   * Enrich customer data
   */
  async enrich(customer, options = {}) {
    this.metrics.requestCount++;
    const startTime = Date.now();
    
    try {
      // Check provider availability
      const availableProviders = this.getAvailableProviders(options);
      
      // Perform enrichment
      const enriched = await this.enrichmentService.enrichCustomerData(customer, {
        ...options,
        providers: availableProviders
      });
      
      // Track metrics
      const duration = Date.now() - startTime;
      this.trackMetric('enrichmentTime', duration);
      
      // Emit success event
      this.emit('enrichment:complete', {
        customer: enriched,
        duration,
        providers: availableProviders
      });
      
      return enriched;
    } catch (error) {
      this.handleError(error, 'enrich');
      throw error;
    }
  }

  /**
   * Batch enrich multiple customers
   */
  async batchEnrich(customers, options = {}) {
    const startTime = Date.now();
    
    try {
      const results = await this.enrichmentService.batchEnrich(customers, {
        ...options,
        batchSize: options.batchSize || 5,
        delayBetweenBatches: options.delayBetweenBatches || 1000
      });
      
      // Track metrics
      const duration = Date.now() - startTime;
      this.trackMetric('batchEnrichmentTime', duration);
      this.trackMetric('batchSize', customers.length);
      
      // Emit completion event
      this.emit('enrichment:batchComplete', {
        count: customers.length,
        duration,
        successCount: results.filter(r => !r.enrichment?.failed).length
      });
      
      return results;
    } catch (error) {
      this.handleError(error, 'batchEnrich');
      throw error;
    }
  }

  /**
   * Get available providers based on configuration
   */
  getAvailableProviders(options) {
    const providers = [];
    
    for (const [name, config] of this.providers) {
      if (config.enabled && (!options.providers || options.providers.includes(name))) {
        providers.push(name);
      }
    }
    
    return providers;
  }

  /**
   * Get enrichment statistics
   */
  getStatistics() {
    const stats = this.enrichmentService.getStats();
    
    return {
      ...stats,
      providers: Object.fromEntries(this.providers),
      caching: this.cacheConfig,
      moduleMetrics: {
        totalRequests: this.metrics.requestCount,
        errorCount: this.metrics.errorCount,
        averageEnrichmentTime: this.metrics.enrichmentTime 
          ? this.metrics.enrichmentTime / this.metrics.requestCount
          : 0
      }
    };
  }

  /**
   * Update configuration dynamically
   */
  async onConfigChange(newConfig) {
    // Update providers
    if (newConfig.providers) {
      await this.configureProviders(newConfig.providers);
    }
    
    // Update caching
    if (newConfig.cacheEnabled !== undefined) {
      if (newConfig.cacheEnabled) {
        this.setupCaching(newConfig);
      } else {
        this.cacheConfig = { enabled: false };
        this.enrichmentService.clearCaches();
      }
    }
    
    this.logger.info('Customer enrichment configuration updated');
  }

  /**
   * Module-specific health checks
   */
  runHealthChecks() {
    const checks = super.runHealthChecks();
    
    // Check provider availability
    for (const [name, config] of this.providers) {
      checks.push({
        name: `provider_${name}`,
        passed: config.enabled && config.apiKey,
        message: config.enabled 
          ? `${name} provider configured`
          : `${name} provider disabled`
      });
    }
    
    // Check enrichment service
    checks.push({
      name: 'enrichmentService',
      passed: this.enrichmentService !== null,
      message: 'Enrichment service available'
    });
    
    // Check cache status
    if (this.cacheConfig?.enabled) {
      checks.push({
        name: 'cache',
        passed: true,
        message: `Cache enabled (TTL: ${this.cacheConfig.ttl}ms)`
      });
    }
    
    return checks;
  }

  /**
   * Module cleanup
   */
  async onShutdown() {
    this.enrichmentService.clearCaches();
    this.providers.clear();
    this.logger.info('Customer enrichment module shut down');
  }
}

export default CustomerEnrichmentModule;