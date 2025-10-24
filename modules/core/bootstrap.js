/**
 * Module Bootstrap and Initialization
 * Orchestrates the startup of all modules with proper dependency injection
 * @module core/bootstrap
 * @version 4.1.0
 */

import { ModuleContainer } from './container.js';
import { EventBus, EventTypes } from './event-bus.js';
import { ConfigService } from './config.js';
import { MonitoringService } from './monitoring.js';
import { EnergenModule } from './interfaces.js';

// Import refactored modules
import { CalculationEngineModule } from '../calculation-engine/module.js';
import { CustomerEnrichmentModule } from '../customer-enrichment/module.js';
import { PDFGeneratorModule } from '../pdf-generator/module.js';
import { ZohoSyncModule } from '../zoho-sync/module.js';

/**
 * Application bootstrap class
 * Initializes and manages all modules
 */
export class Bootstrap {
  constructor(options = {}) {
    this.container = new ModuleContainer();
    this.eventBus = new EventBus({ debug: options.debug });
    this.config = new ConfigService();
    this.monitoring = new MonitoringService({ eventBus: this.eventBus });
    this.logger = options.logger || console;
    this.initialized = false;
    this.modules = new Map();
  }

  /**
   * Initialize the application
   * @param {Object} options - Bootstrap options
   */
  async init(options = {}) {
    if (this.initialized) {
      this.logger.warn('Application already initialized');
      return;
    }

    try {
      this.logger.info('Starting application bootstrap...');

      // 1. Initialize core services
      await this.initializeCoreServices(options);

      // 2. Register all modules
      await this.registerModules();

      // 3. Wire up dependencies
      await this.wireDependencies();

      // 4. Initialize modules in correct order
      await this.initializeModules();

      // 5. Start monitoring
      this.startMonitoring();

      // 6. Setup shutdown handlers
      this.setupShutdownHandlers();

      this.initialized = true;
      this.eventBus.emit(EventTypes.SYSTEM_INFO, {
        message: 'Application initialized successfully',
        modules: Array.from(this.modules.keys())
      });

      this.logger.info('Application bootstrap completed successfully');
    } catch (error) {
      this.logger.error('Bootstrap failed:', error);
      this.eventBus.emit(EventTypes.SYSTEM_ERROR, { error });
      throw error;
    }
  }

  /**
   * Initialize core services
   * @private
   */
  async initializeCoreServices(options) {
    this.logger.info('Initializing core services...');

    // Initialize configuration
    await this.config.init(options.config || {});
    this.container.registerSingleton('config', this.config);

    // Register event bus
    this.container.registerSingleton('eventBus', this.eventBus);

    // Register monitoring service
    this.container.registerSingleton('monitoring', this.monitoring);

    // Register logger
    this.container.registerSingleton('logger', this.logger);

    this.logger.info('Core services initialized');
  }

  /**
   * Register all application modules
   * @private
   */
  async registerModules() {
    this.logger.info('Registering modules...');

    // Define module registry with dependencies
    const moduleRegistry = [
      {
        name: 'calculation',
        module: CalculationEngineModule,
        config: this.config.get('modules.calculation'),
        dependencies: []
      },
      {
        name: 'enrichment',
        module: CustomerEnrichmentModule,
        config: this.config.get('modules.enrichment'),
        dependencies: ['config']
      },
      {
        name: 'pdf',
        module: PDFGeneratorModule,
        config: this.config.get('modules.pdf'),
        dependencies: ['calculation']
      },
      {
        name: 'zoho',
        module: ZohoSyncModule,
        config: this.config.get('modules.zoho'),
        dependencies: ['config', 'enrichment']
      }
    ];

    // Register each module
    for (const entry of moduleRegistry) {
      try {
        const moduleInstance = new entry.module({
          name: entry.name,
          ...entry.config
        });

        this.modules.set(entry.name, {
          instance: moduleInstance,
          dependencies: entry.dependencies,
          config: entry.config
        });

        this.container.registerModule(entry.name, moduleInstance);
        this.monitoring.registerModule(entry.name, moduleInstance);

        this.logger.info(`Registered module: ${entry.name}`);
      } catch (error) {
        this.logger.error(`Failed to register module ${entry.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Wire up module dependencies
   * @private
   */
  async wireDependencies() {
    this.logger.info('Wiring module dependencies...');

    for (const [name, moduleData] of this.modules) {
      const { instance, dependencies } = moduleData;

      // Inject core dependencies
      instance.inject('container', this.container);
      instance.inject('eventBus', this.eventBus);
      instance.inject('config', this.config);
      instance.inject('logger', this.logger);

      // Inject module-specific dependencies
      for (const dep of dependencies) {
        if (this.container.has(dep)) {
          instance.inject(dep, this.container.resolve(dep));
          this.logger.debug(`Injected ${dep} into ${name}`);
        } else {
          this.logger.warn(`Dependency ${dep} not found for module ${name}`);
        }
      }
    }

    this.logger.info('Dependencies wired successfully');
  }

  /**
   * Initialize all modules in dependency order
   * @private
   */
  async initializeModules() {
    this.logger.info('Initializing modules...');

    const initOrder = this.calculateInitOrder();

    for (const moduleName of initOrder) {
      const moduleData = this.modules.get(moduleName);
      
      try {
        this.eventBus.emit(EventTypes.MODULE_INIT, { module: moduleName });
        
        await moduleData.instance.init(moduleData.config);
        
        this.eventBus.emit(EventTypes.MODULE_READY, { module: moduleName });
        this.logger.info(`Module ${moduleName} initialized`);
      } catch (error) {
        this.logger.error(`Failed to initialize module ${moduleName}:`, error);
        this.eventBus.emit(EventTypes.MODULE_ERROR, { module: moduleName, error });
        throw error;
      }
    }

    this.logger.info('All modules initialized');
  }

  /**
   * Calculate module initialization order based on dependencies
   * @private
   */
  calculateInitOrder() {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (name) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      visiting.add(name);

      const moduleData = this.modules.get(name);
      if (moduleData) {
        for (const dep of moduleData.dependencies) {
          if (this.modules.has(dep)) {
            visit(dep);
          }
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.modules.keys()) {
      visit(name);
    }

    return order;
  }

  /**
   * Start monitoring service
   * @private
   */
  startMonitoring() {
    if (this.config.get('features.monitoring')) {
      this.monitoring.start();
      this.logger.info('Monitoring service started');
    }
  }

  /**
   * Setup graceful shutdown handlers
   * @private
   */
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }

  /**
   * Shutdown the application
   */
  async shutdown() {
    if (!this.initialized) {
      return;
    }

    this.logger.info('Starting application shutdown...');

    try {
      // Stop monitoring
      this.monitoring.stop();

      // Shutdown modules in reverse order
      const shutdownOrder = this.calculateInitOrder().reverse();
      
      for (const moduleName of shutdownOrder) {
        const moduleData = this.modules.get(moduleName);
        
        try {
          this.eventBus.emit(EventTypes.MODULE_SHUTDOWN, { module: moduleName });
          await moduleData.instance.shutdown();
          this.logger.info(`Module ${moduleName} shut down`);
        } catch (error) {
          this.logger.error(`Error shutting down module ${moduleName}:`, error);
        }
      }

      // Clear container
      this.container.clear();

      this.initialized = false;
      this.logger.info('Application shutdown completed');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get application status
   * @returns {Object}
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      uptime: this.initialized ? Date.now() - this.startTime : 0,
      modules: {},
      health: this.monitoring.getDashboard()
    };

    for (const [name, moduleData] of this.modules) {
      status.modules[name] = {
        state: moduleData.instance.state,
        initialized: moduleData.instance.metrics?.initialized || false
      };
    }

    return status;
  }

  /**
   * Get a module instance
   * @param {string} name - Module name
   * @returns {EnergenModule}
   */
  getModule(name) {
    const moduleData = this.modules.get(name);
    return moduleData ? moduleData.instance : null;
  }

  /**
   * Reload a specific module
   * @param {string} name - Module name
   */
  async reloadModule(name) {
    const moduleData = this.modules.get(name);
    
    if (!moduleData) {
      throw new Error(`Module ${name} not found`);
    }

    this.logger.info(`Reloading module ${name}...`);

    // Shutdown the module
    await moduleData.instance.shutdown();

    // Re-initialize the module
    await moduleData.instance.init(moduleData.config);

    this.logger.info(`Module ${name} reloaded successfully`);
  }

  /**
   * Hot reload configuration
   * @param {Object} newConfig - New configuration
   */
  async hotReloadConfig(newConfig) {
    this.logger.info('Hot reloading configuration...');

    // Update configuration
    this.config.merge(newConfig);

    // Notify modules of config change
    for (const [name, moduleData] of this.modules) {
      if (typeof moduleData.instance.onConfigChange === 'function') {
        await moduleData.instance.onConfigChange(this.config.get(`modules.${name}`));
      }
    }

    this.logger.info('Configuration hot reloaded');
  }
}

// Export singleton instance
export const bootstrap = new Bootstrap();
export default bootstrap;