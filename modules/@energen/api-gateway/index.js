/**
 * API Gateway Module - Central integration point for all Energen modules
 * @module @energen/api-gateway
 * @version 5.0.0
 */

import { Container } from '../../core/container.js';
import { EventBus } from '../../core/event-bus.js';
import { ConfigService } from '../../core/config.js';
import { MonitoringService } from '../../core/monitoring.js';

// Import all modules
import { CalculationEngineModule } from '../calc-engine/module.js';
import { CustomerEnrichmentModule } from '../../customer-enrichment/module.js';
import { PDFGeneratorModule } from '../../pdf-generator/module.js';
import { EnhancedZohoSyncModule as ZohoSyncModule } from '../../zoho-sync/enhanced-module.js';
import { PrevailingWageModule } from '../../prevailing-wage/index.js';
import { CPIModule } from '../../cpi/index.js';

/**
 * API Gateway class that orchestrates all modules
 */
export class APIGateway {
  constructor(config = {}) {
    this.config = config;
    this.container = new Container();
    this.eventBus = new EventBus();
    this.monitoring = new MonitoringService();
    this.modules = new Map();
    this.isInitialized = false;
  }

  /**
     * Initialize all modules with dependency injection
     */
  async initialize() {
    if (this.isInitialized) return;
    // Register core services
    this.container.register('eventBus', this.eventBus);
    this.container.register('config', this.config);
    this.container.register('monitoring', this.monitoring);

    // Initialize and register modules
    await this.initializeModules();

    // Set up inter-module communication
    this.setupEventHandlers();

    this.isInitialized = true;
  }

  /**
     * Initialize all modules
     */
  async initializeModules() {
    // Calculation Engine
    const calcEngine = new CalculationEngineModule(this.config.calculation || {});
    calcEngine.setDependency('eventBus', this.eventBus);
    calcEngine.setDependency('container', this.container);
    await this.registerModule('calculation', calcEngine);

    // Customer Enrichment
    const customerModule = new CustomerEnrichmentModule(this.config.customer || {});
    customerModule.setDependency('eventBus', this.eventBus);
    customerModule.setDependency('container', this.container);
    await this.registerModule('customer', customerModule);

    // PDF Generator
    const pdfModule = new PDFGeneratorModule(this.config.pdf || {});
    pdfModule.setDependency('eventBus', this.eventBus);
    pdfModule.setDependency('container', this.container);
    pdfModule.setDependency('calculation', calcEngine);
    await this.registerModule('pdf', pdfModule);

    // Zoho Sync
    if (this.config.zoho?.clientId) {
      const zohoModule = new ZohoSyncModule(this.config.zoho || {});
      zohoModule.setDependency('eventBus', this.eventBus);
      zohoModule.setDependency('container', this.container);
      await this.registerModule('zoho', zohoModule);
    }

    // Prevailing Wage Module
    const prevailingWageModule = new PrevailingWageModule(this.config.prevailingWage || {});
    prevailingWageModule.inject('eventBus', this.eventBus);
    prevailingWageModule.inject('container', this.container);
    await this.registerModule('prevailingWage', prevailingWageModule);

    // CPI Module
    const cpiModule = new CPIModule(this.config.cpi || {
      fredApiKey: process.env.FRED_API_KEY
    });
    cpiModule.inject('eventBus', this.eventBus);
    cpiModule.inject('container', this.container);
    await this.registerModule('cpi', cpiModule);
  }

  /**
     * Register a module
     */
  async registerModule(name, module) {
    try {
      // Initialize module
      await module.init(this.config[name] || {});

      // Register in container
      this.container.register(name, module);

      // Store reference
      this.modules.set(name, module);
    } catch (error) {
      console.error(`❌ Failed to register module ${name}:`, error);
      throw error;
    }
  }

  /**
     * Set up event handlers for inter-module communication
     */
  setupEventHandlers() {
    // Calculation complete -> Generate PDF
    this.eventBus.on('calculation:complete', async (data) => {
      if (data.generatePDF) {
        this.eventBus.emit('pdf:generate', data);
      }
    });

    // PDF generated -> Sync to Zoho
    this.eventBus.on('pdf:generated', async (data) => {
      if (this.modules.has('zoho') && data.syncToZoho) {
        this.eventBus.emit('zoho:sync', data);
      }
    });

    // Customer enriched -> Update calculation
    this.eventBus.on('enrichment:complete', async (data) => {
      this.eventBus.emit('calculation:updateCustomer', data);
    });
  }

  /**
     * Get a module instance
     */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
     * Calculate pricing
     */
  async calculate(params) {
    const calcEngine = this.getModule('calculation');
    if (!calcEngine) throw new Error('Calculation engine not initialized');

    const result = await calcEngine.calculate(params);
    this.eventBus.emit('calculation:complete', { ...params, result });

    return result;
  }

  /**
     * Enrich customer data
     */
  async enrichCustomer(customerData) {
    const customerModule = this.getModule('customer');
    if (!customerModule) throw new Error('Customer module not initialized');

    const enriched = await customerModule.enrich(customerData);
    this.eventBus.emit('enrichment:complete', enriched);

    return enriched;
  }

  /**
     * Generate PDF
     */
  async generatePDF(data) {
    const pdfModule = this.getModule('pdf');
    if (!pdfModule) throw new Error('PDF module not initialized');

    const result = await pdfModule.generateQuote(data);
    this.eventBus.emit('pdf:generated', { ...data, ...result });

    return result;
  }

  /**
     * Sync to Zoho CRM
     */
  async syncToZoho(data) {
    const zohoModule = this.getModule('zoho');
    if (!zohoModule) throw new Error('Zoho module not initialized');

    const result = await zohoModule.syncQuote(data);
    this.eventBus.emit('zoho:syncComplete', result);

    return result;
  }

  /**
     * Get health status of all modules
     */
  async getHealth() {
    const health = {
      status: 'healthy',
      modules: {},
      timestamp: new Date().toISOString()
    };

    for (const [name, module] of this.modules) {
      try {
        const moduleHealth = await module.runHealthChecks();
        health.modules[name] = moduleHealth;

        if (moduleHealth.status !== 'healthy') {
          health.status = 'degraded';
        }
      } catch (error) {
        health.modules[name] = {
          status: 'error',
          error: error.message
        };
        health.status = 'unhealthy';
      }
    }

    return health;
  }

  /**
     * Shutdown all modules gracefully
     */
  async shutdown() {
    for (const [name, module] of this.modules) {
      try {
        await module.shutdown();
      } catch (error) {
        console.error(`❌ Error shutting down module ${name}:`, error);
      }
    }

    this.isInitialized = false;
  }
}

/**
 * Factory function to create and initialize API Gateway
 */
export async function createAPIGateway(config = {}) {
  const gateway = new APIGateway(config);
  await gateway.initialize();
  return gateway;
}

export default APIGateway;
