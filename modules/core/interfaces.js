/**
 * Core Module Interfaces and Types
 * Defines the contract all Energen modules must implement
 * @module core/interfaces
 * @version 4.1.0
 */

/**
 * Module configuration interface
 * @typedef {Object} ModuleConfig
 * @property {string} name - Module identifier
 * @property {string} version - Module version
 * @property {Object} settings - Module-specific settings
 * @property {Object} dependencies - Required dependencies
 * @property {boolean} [debug] - Enable debug logging
 */

/**
 * Module health status
 * @typedef {Object} HealthStatus
 * @property {boolean} healthy - Overall health status
 * @property {string} status - Status message
 * @property {number} uptime - Uptime in milliseconds
 * @property {Object} metrics - Module-specific metrics
 * @property {Array<Object>} checks - Individual health checks
 * @property {Date} timestamp - Health check timestamp
 */

/**
 * Module lifecycle events
 * @typedef {Object} ModuleEvents
 * @property {string} INITIALIZING - Module is initializing
 * @property {string} READY - Module is ready to use
 * @property {string} ERROR - Module encountered an error
 * @property {string} SHUTTING_DOWN - Module is shutting down
 * @property {string} SHUTDOWN - Module has shut down
 */

export const ModuleEvents = {
  INITIALIZING: 'module:initializing',
  READY: 'module:ready',
  ERROR: 'module:error',
  SHUTTING_DOWN: 'module:shuttingDown',
  SHUTDOWN: 'module:shutdown'
};

/**
 * Base interface for all Energen modules
 * All modules must extend this class
 */
export class EnergenModule {
  constructor(config = {}) {
    this.name = config.name || this.constructor.name;
    this.version = config.version || '4.1.0';
    this.config = config;
    this.dependencies = new Map();
    this.metrics = {
      initialized: false,
      startTime: null,
      requestCount: 0,
      errorCount: 0,
      lastError: null
    };
    this.state = 'uninitialized';
    this.logger = config.logger || console;
  }

  /**
   * Initialize the module
   * @param {ModuleConfig} config - Module configuration
   * @returns {Promise<void>}
   */
  async init(config = {}) {
    if (this.state === 'initialized') {
      this.logger.warn(`Module ${this.name} already initialized`);
      return;
    }

    this.state = 'initializing';
    this.metrics.startTime = Date.now();
    
    try {
      // Validate configuration
      this.validateConfig(config);
      
      // Initialize dependencies
      await this.initializeDependencies();
      
      // Module-specific initialization
      await this.onInit(config);
      
      this.state = 'initialized';
      this.metrics.initialized = true;
      this.logger.info(`Module ${this.name} v${this.version} initialized successfully`);
    } catch (error) {
      this.state = 'error';
      this.metrics.lastError = error;
      this.logger.error(`Failed to initialize module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Module-specific initialization logic (override in subclass)
   * @param {ModuleConfig} config
   * @returns {Promise<void>}
   */
  async onInit(config) {
    // Override in subclass
  }

  /**
   * Initialize module dependencies
   * @returns {Promise<void>}
   */
  async initializeDependencies() {
    // Override in subclass if dependencies needed
  }

  /**
   * Validate module configuration
   * @param {ModuleConfig} config
   * @throws {Error} If configuration is invalid
   */
  validateConfig(config) {
    // Override in subclass for specific validation
  }

  /**
   * Get module health status
   * @returns {HealthStatus}
   */
  getHealth() {
    const uptime = this.metrics.startTime 
      ? Date.now() - this.metrics.startTime 
      : 0;

    const checks = this.runHealthChecks();
    const healthy = checks.every(check => check.passed);

    return {
      healthy,
      status: this.state,
      uptime,
      metrics: {
        requestCount: this.metrics.requestCount,
        errorCount: this.metrics.errorCount,
        errorRate: this.metrics.requestCount > 0 
          ? (this.metrics.errorCount / this.metrics.requestCount * 100).toFixed(2) + '%'
          : '0%'
      },
      checks,
      timestamp: new Date()
    };
  }

  /**
   * Run module-specific health checks
   * @returns {Array<Object>} Health check results
   */
  runHealthChecks() {
    const checks = [];

    // Basic initialization check
    checks.push({
      name: 'initialization',
      passed: this.state === 'initialized',
      message: `Module state: ${this.state}`
    });

    // Error rate check
    const errorRate = this.metrics.requestCount > 0 
      ? this.metrics.errorCount / this.metrics.requestCount 
      : 0;
    
    checks.push({
      name: 'errorRate',
      passed: errorRate < 0.1, // Less than 10% error rate
      message: `Error rate: ${(errorRate * 100).toFixed(2)}%`
    });

    return checks;
  }

  /**
   * Inject a dependency
   * @param {string} name - Dependency name
   * @param {any} dependency - Dependency instance
   */
  inject(name, dependency) {
    this.dependencies.set(name, dependency);
    this.logger.debug(`Injected dependency '${name}' into module ${this.name}`);
  }

  /**
   * Get an injected dependency
   * @param {string} name - Dependency name
   * @returns {any} Dependency instance
   */
  getDependency(name) {
    if (!this.dependencies.has(name)) {
      throw new Error(`Dependency '${name}' not found in module ${this.name}`);
    }
    return this.dependencies.get(name);
  }

  /**
   * Emit an event (for event bus integration)
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  emit(event, data) {
    const eventBus = this.dependencies.get('eventBus');
    if (eventBus) {
      eventBus.emit(event, { module: this.name, data });
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    const eventBus = this.dependencies.get('eventBus');
    if (eventBus) {
      eventBus.on(event, handler);
    }
  }

  /**
   * Track a metric
   * @param {string} metric - Metric name
   * @param {any} value - Metric value
   */
  trackMetric(metric, value) {
    if (!this.metrics[metric]) {
      this.metrics[metric] = 0;
    }
    this.metrics[metric] += value;
  }

  /**
   * Handle errors consistently
   * @param {Error} error - Error to handle
   * @param {string} context - Error context
   */
  handleError(error, context) {
    this.metrics.errorCount++;
    this.metrics.lastError = { error, context, timestamp: new Date() };
    this.logger.error(`Error in module ${this.name} (${context}):`, error);
    this.emit(ModuleEvents.ERROR, { error, context });
  }

  /**
   * Shutdown the module gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    if (this.state === 'shutdown') {
      this.logger.warn(`Module ${this.name} already shutdown`);
      return;
    }

    this.state = 'shutting_down';
    this.emit(ModuleEvents.SHUTTING_DOWN, { module: this.name });

    try {
      // Module-specific shutdown logic
      await this.onShutdown();
      
      // Clear dependencies
      this.dependencies.clear();
      
      this.state = 'shutdown';
      this.emit(ModuleEvents.SHUTDOWN, { module: this.name });
      this.logger.info(`Module ${this.name} shutdown successfully`);
    } catch (error) {
      this.logger.error(`Error shutting down module ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Module-specific shutdown logic (override in subclass)
   * @returns {Promise<void>}
   */
  async onShutdown() {
    // Override in subclass
  }

  /**
   * Get module metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      state: this.state,
      uptime: this.metrics.startTime ? Date.now() - this.metrics.startTime : 0,
      dependencies: Array.from(this.dependencies.keys()),
      metrics: this.metrics
    };
  }
}

/**
 * Interface for modules that provide API endpoints
 */
export class ApiModule extends EnergenModule {
  constructor(config) {
    super(config);
    this.routes = [];
    this.middleware = [];
  }

  /**
   * Register API routes
   * @param {Object} router - Express router instance
   */
  registerRoutes(router) {
    throw new Error('ApiModule subclass must implement registerRoutes()');
  }

  /**
   * Register middleware
   * @param {Function} middleware - Express middleware function
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Get all registered routes
   * @returns {Array} Route definitions
   */
  getRoutes() {
    return this.routes;
  }
}

/**
 * Interface for worker modules (background processing)
 */
export class WorkerModule extends EnergenModule {
  constructor(config) {
    super(config);
    this.jobs = new Map();
    this.processing = false;
  }

  /**
   * Start processing jobs
   * @returns {Promise<void>}
   */
  async start() {
    this.processing = true;
    await this.onStart();
  }

  /**
   * Stop processing jobs
   * @returns {Promise<void>}
   */
  async stop() {
    this.processing = false;
    await this.onStop();
  }

  /**
   * Module-specific start logic
   * @returns {Promise<void>}
   */
  async onStart() {
    // Override in subclass
  }

  /**
   * Module-specific stop logic
   * @returns {Promise<void>}
   */
  async onStop() {
    // Override in subclass
  }

  /**
   * Queue a job for processing
   * @param {string} type - Job type
   * @param {Object} data - Job data
   * @returns {string} Job ID
   */
  queueJob(type, data) {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(jobId, { type, data, status: 'queued', createdAt: new Date() });
    return jobId;
  }

  /**
   * Get job status
   * @param {string} jobId - Job ID
   * @returns {Object} Job status
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId);
  }
}

/**
 * Module loader interface
 */
export class ModuleLoader {
  constructor() {
    this.modules = new Map();
    this.loadOrder = [];
  }

  /**
   * Register a module
   * @param {string} name - Module name
   * @param {EnergenModule} module - Module instance
   */
  register(name, module) {
    this.modules.set(name, module);
    this.loadOrder.push(name);
  }

  /**
   * Get a module
   * @param {string} name - Module name
   * @returns {EnergenModule} Module instance
   */
  get(name) {
    return this.modules.get(name);
  }

  /**
   * Initialize all modules
   * @returns {Promise<void>}
   */
  async initializeAll() {
    for (const name of this.loadOrder) {
      const module = this.modules.get(name);
      await module.init();
    }
  }

  /**
   * Shutdown all modules
   * @returns {Promise<void>}
   */
  async shutdownAll() {
    // Shutdown in reverse order
    for (let i = this.loadOrder.length - 1; i >= 0; i--) {
      const module = this.modules.get(this.loadOrder[i]);
      await module.shutdown();
    }
  }

  /**
   * Get health status of all modules
   * @returns {Object} Combined health status
   */
  getAllHealth() {
    const health = {};
    for (const [name, module] of this.modules) {
      health[name] = module.getHealth();
    }
    return health;
  }
}