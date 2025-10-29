/**
 * CommonJS wrapper for ServiceDefinitions module
 * Loads the ES module version using dynamic import
 */

let serviceDefinitionsModule;

async function loadModule() {
  if (!serviceDefinitionsModule) {
    serviceDefinitionsModule = await import('./ServiceDefinitions.js');
  }
  return serviceDefinitionsModule;
}

// Synchronous wrapper
class ServiceDefinitionsWrapper {
  constructor(settings) {
    this._settings = settings;
    this._instance = null;
    this._loadPromise = null;
  }

  async _ensureLoaded() {
    if (!this._instance) {
      if (!this._loadPromise) {
        this._loadPromise = loadModule().then(mod => {
          this._instance = new mod.ServiceDefinitions(this._settings);
        });
      }
      await this._loadPromise;
    }
    return this._instance;
  }

  // Proxy all methods
  async getName(...args) {
    const instance = await this._ensureLoaded();
    return instance.getName(...args);
  }

  async getDefinition(...args) {
    const instance = await this._ensureLoaded();
    return instance.getDefinition(...args);
  }

  async getAllServices() {
    const instance = await this._ensureLoaded();
    return instance.getAllServices();
  }
}

module.exports = {
  ServiceDefinitions: ServiceDefinitionsWrapper,
  loadModule
};
