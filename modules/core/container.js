/**
 * Dependency Injection Container
 * Manages module dependencies and lifecycle
 * @module core/container
 * @version 4.1.0
 */

import { EnergenModule } from './interfaces.js';

/**
 * Dependency injection container for managing module dependencies
 */
export class Container {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.aliases = new Map();
    this.resolving = new Set(); // Prevent circular dependencies
    this.logger = console;
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {any} service - Service instance or factory
   * @param {Object} options - Registration options
   */
  register(name, service, options = {}) {
    const {
      singleton = true,
      factory = false,
      alias = null,
      dependencies = []
    } = options;

    if (alias) {
      this.aliases.set(alias, name);
    }

    if (factory) {
      this.factories.set(name, {
        factory: service,
        singleton,
        dependencies
      });
    } else if (singleton) {
      this.singletons.set(name, service);
    } else {
      this.services.set(name, service);
    }

    this.logger.debug(`Registered service: ${name}`, { singleton, factory, alias });
  }

  /**
   * Register a factory function
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Array<string>} dependencies - Required dependencies
   */
  registerFactory(name, factory, dependencies = []) {
    this.register(name, factory, {
      factory: true,
      singleton: true,
      dependencies
    });
  }

  /**
   * Register a singleton service
   * @param {string} name - Service name
   * @param {any} service - Service instance
   */
  registerSingleton(name, service) {
    this.register(name, service, { singleton: true });
  }

  /**
   * Register a transient service (new instance each time)
   * @param {string} name - Service name
   * @param {Function} ServiceClass - Service class constructor
   */
  registerTransient(name, ServiceClass) {
    this.register(name, ServiceClass, { singleton: false, factory: true });
  }

  /**
   * Resolve a service
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  resolve(name) {
    // Check for circular dependencies
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    try {
      this.resolving.add(name);

      // Resolve aliases
      const actualName = this.aliases.get(name) || name;

      // Check singletons first
      if (this.singletons.has(actualName)) {
        return this.singletons.get(actualName);
      }

      // Check factories
      if (this.factories.has(actualName)) {
        return this.resolveFactory(actualName);
      }

      // Check regular services
      if (this.services.has(actualName)) {
        return this.services.get(actualName);
      }

      // Try to auto-resolve if it's a class
      return this.autoResolve(actualName);
    } finally {
      this.resolving.delete(name);
    }
  }

  /**
   * Resolve a factory
   * @private
   * @param {string} name - Factory name
   * @returns {any} Created instance
   */
  resolveFactory(name) {
    const { factory, singleton, dependencies } = this.factories.get(name);

    // Resolve dependencies
    const resolvedDeps = dependencies.map(dep => this.resolve(dep));

    // Create instance
    const instance = typeof factory === 'function'
      ? factory(...resolvedDeps)
      : new factory(...resolvedDeps);

    // Store as singleton if configured
    if (singleton) {
      this.singletons.set(name, instance);
      this.factories.delete(name); // Remove factory after creating singleton
    }

    return instance;
  }

  /**
   * Auto-resolve a service by analyzing constructor
   * @private
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  autoResolve(name) {
    // This would need the actual class reference
    // For now, throw an error
    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  has(name) {
    const actualName = this.aliases.get(name) || name;
    return this.singletons.has(actualName) ||
           this.factories.has(actualName) ||
           this.services.has(actualName);
  }

  /**
   * Get all registered service names
   * @returns {Array<string>}
   */
  getRegisteredServices() {
    return [
      ...this.singletons.keys(),
      ...this.factories.keys(),
      ...this.services.keys()
    ];
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.aliases.clear();
    this.resolving.clear();
  }

  /**
   * Create a child container
   * @returns {Container}
   */
  createChild() {
    const child = new Container();

    // Copy parent registrations
    for (const [name, service] of this.singletons) {
      child.singletons.set(name, service);
    }

    for (const [name, config] of this.factories) {
      child.factories.set(name, config);
    }

    for (const [name, service] of this.services) {
      child.services.set(name, service);
    }

    for (const [alias, name] of this.aliases) {
      child.aliases.set(alias, name);
    }

    return child;
  }
}

/**
 * Service locator pattern for global access
 */
export class ServiceLocator {
  static container = new Container();

  /**
   * Get a service from the global container
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  static get(name) {
    return this.container.resolve(name);
  }

  /**
   * Register a service in the global container
   * @param {string} name - Service name
   * @param {any} service - Service instance or factory
   * @param {Object} options - Registration options
   */
  static register(name, service, options) {
    return this.container.register(name, service, options);
  }

  /**
   * Check if a service is registered
   * @param {string} name - Service name
   * @returns {boolean}
   */
  static has(name) {
    return this.container.has(name);
  }

  /**
   * Reset the global container
   */
  static reset() {
    this.container = new Container();
  }
}

/**
 * Decorator for dependency injection
 * @param {Array<string>} dependencies - Required dependencies
 */
export function Injectable(...dependencies) {
  return function(target) {
    target.dependencies = dependencies;
    return target;
  };
}

/**
 * Module-aware container that integrates with EnergenModule
 */
export class ModuleContainer extends Container {
  constructor() {
    super();
    this.modules = new Map();
    this.moduleLoadOrder = [];
  }

  /**
   * Register an Energen module
   * @param {string} name - Module name
   * @param {EnergenModule} module - Module instance
   * @param {Object} options - Registration options
   */
  registerModule(name, module, options = {}) {
    if (!(module instanceof EnergenModule)) {
      throw new Error(`Module ${name} must extend EnergenModule`);
    }

    this.modules.set(name, module);
    this.moduleLoadOrder.push(name);

    // Register the module as a singleton service
    this.registerSingleton(name, module);

    // Inject dependencies if specified
    if (options.dependencies) {
      for (const [depName, depService] of Object.entries(options.dependencies)) {
        module.inject(depName, depService);
      }
    }

    this.logger.debug(`Registered module: ${name}`);
  }

  /**
   * Initialize all registered modules
   * @returns {Promise<void>}
   */
  async initializeModules() {
    for (const name of this.moduleLoadOrder) {
      const module = this.modules.get(name);

      // Auto-inject common dependencies
      this.injectCommonDependencies(module);

      await module.init(module.config);
      this.logger.info(`Initialized module: ${name}`);
    }
  }

  /**
   * Inject common dependencies into a module
   * @private
   * @param {EnergenModule} module
   */
  injectCommonDependencies(module) {
    // Inject container itself
    module.inject('container', this);

    // Inject event bus if available
    if (this.has('eventBus')) {
      module.inject('eventBus', this.resolve('eventBus'));
    }

    // Inject logger if available
    if (this.has('logger')) {
      module.inject('logger', this.resolve('logger'));
    }

    // Inject config service if available
    if (this.has('config')) {
      module.inject('config', this.resolve('config'));
    }
  }

  /**
   * Shutdown all modules
   * @returns {Promise<void>}
   */
  async shutdownModules() {
    // Shutdown in reverse order
    for (let i = this.moduleLoadOrder.length - 1; i >= 0; i--) {
      const name = this.moduleLoadOrder[i];
      const module = this.modules.get(name);
      await module.shutdown();
      this.logger.info(`Shutdown module: ${name}`);
    }
  }

  /**
   * Get health status of all modules
   * @returns {Object}
   */
  getModuleHealth() {
    const health = {};
    for (const [name, module] of this.modules) {
      health[name] = module.getHealth();
    }
    return health;
  }

  /**
   * Get module metadata
   * @returns {Object}
   */
  getModuleMetadata() {
    const metadata = {};
    for (const [name, module] of this.modules) {
      metadata[name] = module.getMetadata();
    }
    return metadata;
  }
}

// Export a default container instance
export const container = new ModuleContainer();
export default container;
