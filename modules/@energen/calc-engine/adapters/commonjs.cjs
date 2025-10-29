/**
 * CommonJS adapter for @energen/calc-engine
 * Allows require() usage in Node.js
 */

// Use dynamic import for ESM modules
let engineModule = null;

// Lazy load the ESM module
async function loadEngine() {
  if (!engineModule) {
    engineModule = await import('../index.js');
  }
  return engineModule;
}

/**
 * CommonJS-compatible calculation engine
 */
class EnergenCalculationEngine {
  constructor() {
    this._engine = null;
    this._initialized = false;
    this._initPromise = null;
  }

  /**
     * Initialize the engine (async)
     */
  async _init() {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const module = await loadEngine();
      this._engine = new module.EnergenCalculationEngine({
        enableCache: true,
        enableAudit: true
      });
      this._initialized = true;
    })();

    return this._initPromise;
  }

  /**
     * Main calculation method
     */
  async calculate(payload) {
    await this._init();
    return this._engine.calculate(payload);
  }

  // Legacy compatibility methods
  getKwRange(kw) {
    if (kw <= 14) return '2-14';
    if (kw <= 30) return '15-30';
    if (kw <= 150) return '35-150';
    if (kw <= 250) return '155-250';
    if (kw <= 400) return '255-400';
    if (kw <= 500) return '405-500';
    if (kw <= 670) return '505-670';
    if (kw <= 1050) return '675-1050';
    if (kw <= 1500) return '1055-1500';
    return '1500-2050';
  }

  quartsToGallons(quarts) {
    return quarts / 4;
  }

  async getTaxRate(address, city, zip) {
    // Default California rate
    return 0.1025;
  }
}

// Export for CommonJS
module.exports = EnergenCalculationEngine;
