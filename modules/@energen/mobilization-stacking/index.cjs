/**
 * CommonJS wrapper for mobilization-stacking module
 * Loads the ES module version using dynamic import
 */

let mobilizationModule;

async function loadModule() {
  if (!mobilizationModule) {
    mobilizationModule = await import('./index.js');
  }
  return mobilizationModule;
}

// Synchronous wrapper - creates a proxy that loads on first use
class MobilizationStackingEngineWrapper {
  constructor(config) {
    this._config = config;
    this._engine = null;
    this._loadPromise = null;
  }

  async _ensureLoaded() {
    if (!this._engine) {
      if (!this._loadPromise) {
        this._loadPromise = loadModule().then(mod => {
          this._engine = new mod.MobilizationStackingEngine(this._config);
        });
      }
      await this._loadPromise;
    }
    return this._engine;
  }

  // Proxy all methods
  async calculateServiceMobilization(...args) {
    const engine = await this._ensureLoaded();
    return engine.calculateServiceMobilization(...args);
  }

  async calculateStackedMobilization(...args) {
    const engine = await this._ensureLoaded();
    return engine.calculateStackedMobilization(...args);
  }

  async optimizeVisitSchedule(...args) {
    const engine = await this._ensureLoaded();
    return engine.optimizeVisitSchedule(...args);
  }

  async generateAnnualSchedule(...args) {
    const engine = await this._ensureLoaded();
    return engine.generateAnnualSchedule(...args);
  }

  async calculateAnnualSavings(...args) {
    const engine = await this._ensureLoaded();
    return engine.calculateAnnualSavings(...args);
  }
}

module.exports = {
  MobilizationStackingEngine: MobilizationStackingEngineWrapper,
  loadModule
};
