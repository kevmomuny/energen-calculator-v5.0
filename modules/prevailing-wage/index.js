/**
 * Prevailing Wage Module
 * Handles prevailing wage determination and per diem rates
 * @module prevailing-wage
 * @version 4.5.0
 */

import { EnergenModule } from '../core/interfaces.js';

/**
 * Prevailing Wage Module for Davis-Bacon Act compliance
 */
export class PrevailingWageModule extends EnergenModule {
  constructor(config = {}) {
    super({
      name: 'PrevailingWage',
      version: '4.5.0',
      ...config
    });

    // California county to zone mapping
    this.countyToZone = {
      'Alameda': 1, 'Contra Costa': 1, 'Marin': 1, 'San Francisco': 1, 'San Mateo': 1,
      'Santa Clara': 1, 'Napa': 1, 'Solano': 1, 'Sonoma': 1,
      'Los Angeles': 2, 'Orange': 2, 'San Diego': 2, 'Santa Barbara': 2, 'Ventura': 2,
      'Riverside': 2, 'San Bernardino': 2,
      'Sacramento': 3, 'San Joaquin': 3, 'Stanislaus': 3, 'Fresno': 3, 'Kern': 3,
      'Merced': 3, 'Monterey': 3, 'San Luis Obispo': 3, 'Tulare': 3, 'Placer': 3,
      'Alpine': 4, 'Amador': 4, 'Butte': 4, 'Calaveras': 4, 'Colusa': 4, 'Del Norte': 4,
      'El Dorado': 4, 'Glenn': 4, 'Humboldt': 4, 'Imperial': 4, 'Inyo': 4, 'Kings': 4,
      'Lake': 4, 'Lassen': 4, 'Madera': 4, 'Mariposa': 4, 'Mendocino': 4, 'Modoc': 4,
      'Mono': 4, 'Nevada': 4, 'Plumas': 4, 'Shasta': 4, 'Sierra': 4, 'Siskiyou': 4,
      'Sutter': 4, 'Tehama': 4, 'Trinity': 4, 'Tuolumne': 4, 'Yolo': 4, 'Yuba': 4
    };

    // California prevailing wage rates (2025 DIR rates)
    this.californiaRates = {
      electrician: {
        journeyman: 85.50,
        foreman: 93.00
      },
      laborer: {
        skilled: 55.00,
        unskilled: 45.00
      },
      fringe: {
        healthWelfare: 15.50,
        pension: 12.00,
        vacation: 3.50,
        training: 1.00
      }
    };

    // Zone multipliers for California
    this.zoneMultipliers = {
      1: 1.15,  // Bay Area
      2: 1.10,  // LA/SD
      3: 1.00,  // Central Valley
      4: 0.90   // Rural
    };

    // ZIP to county mapping (partial - would need full database)
    this.zipToCounty = this.initializeZipMapping();
    
    // Cache for API responses
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize module
   */
  async onInit(config) {
    this.config = config;
    
    // Get event bus dependency
    const eventBus = this.getDependency('eventBus');
    if (!eventBus) {
      throw new Error('EventBus dependency not found');
    }

    // Register event listeners
    this.setupEventListeners();
    
    this.logger.info('Prevailing Wage module initialized');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const eventBus = this.getDependency('eventBus');
    
    // Listen for prevailing wage requests
    eventBus.on('prevailing-wage:request', this.handlePrevailingWageRequest.bind(this));
    eventBus.on('per-diem:request', this.handlePerDiemRequest.bind(this));
    eventBus.on('prevailing-wage:check-required', this.handleCheckRequired.bind(this));
  }

  /**
   * Handle prevailing wage data request
   */
  async handlePrevailingWageRequest(event) {
    const { requestId, data } = event;
    const { zip, state = 'CA' } = data;

    try {
      this.metrics.requestCount++;
      
      const wageData = await this.getPrevailingWageData(zip, state);
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('prevailing-wage:response', {
        requestId,
        success: true,
        data: wageData
      });
    } catch (error) {
      this.handleError(error, 'prevailing-wage:request');
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('prevailing-wage:response', {
        requestId,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle per diem request
   */
  async handlePerDiemRequest(event) {
    const { requestId, data } = event;
    const { zip, state = 'CA' } = data;

    try {
      this.metrics.requestCount++;
      
      const perDiemData = await this.getPerDiemRates(zip, state);
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('per-diem:response', {
        requestId,
        success: true,
        data: perDiemData
      });
    } catch (error) {
      this.handleError(error, 'per-diem:request');
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('per-diem:response', {
        requestId,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Check if prevailing wage is required
   */
  async handleCheckRequired(event) {
    const { requestId, data } = event;
    const { county, state = 'CA' } = data;

    const isRequired = this.isPrevailingWageArea(county, state);
    
    const eventBus = this.getDependency('eventBus');
    eventBus.emit('prevailing-wage:check-response', {
      requestId,
      success: true,
      data: { required: isRequired }
    });
  }

  /**
   * Get prevailing wage data for a location
   */
  async getPrevailingWageData(zip, state = 'CA') {
    // Check cache first
    const cacheKey = `wage-${zip}-${new Date().toDateString()}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // For California, use our local data
    if (state === 'CA' && zip) {
      const county = this.getCountyFromZip(zip);
      const zone = county ? this.countyToZone[county] : 3;
      const multiplier = this.zoneMultipliers[zone] || 1.0;
      
      // Calculate adjusted rates based on zone
      const electricianRate = this.californiaRates.electrician.journeyman * multiplier;
      const foremanRate = this.californiaRates.electrician.foreman * multiplier;
      const totalFringe = Object.values(this.californiaRates.fringe).reduce((a, b) => a + b, 0);
      
      const wageData = {
        location: {
          zip,
          state,
          county: county || 'Unknown',
          zone: zone || 3
        },
        prevailingWage: {
          electricianJourneyman: electricianRate,
          electricianForeman: foremanRate,
          laborer: this.californiaRates.laborer.skilled * multiplier,
          totalHourly: electricianRate + totalFringe,
          baseRate: electricianRate,
          fringeRate: totalFringe
        },
        breakdown: {
          base: electricianRate,
          healthWelfare: this.californiaRates.fringe.healthWelfare,
          pension: this.californiaRates.fringe.pension,
          vacation: this.californiaRates.fringe.vacation,
          training: this.californiaRates.fringe.training,
          total: electricianRate + totalFringe
        },
        isPrevailingWageRequired: this.isPrevailingWageArea(county, state),
        source: 'California DIR',
        effectiveDate: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: wageData,
        timestamp: Date.now()
      });

      return wageData;
    }

    // For other states, would integrate with federal Davis-Bacon API
    throw new Error(`Prevailing wage data not available for state: ${state}`);
  }

  /**
   * Get per diem rates for a location
   */
  async getPerDiemRates(zip, state = 'CA') {
    // Check cache
    const cacheKey = `perdiem-${zip}-${new Date().toDateString()}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // GSA per diem rates for California major metros (2025)
    const gsaRates = {
      1: { lodging: 295, meals: 79, total: 374 }, // San Francisco/Bay Area
      2: { lodging: 215, meals: 79, total: 294 }, // Los Angeles/San Diego
      3: { lodging: 125, meals: 69, total: 194 }, // Sacramento/Central Valley
      4: { lodging: 96, meals: 69, total: 165 }   // Rural/Other
    };

    const county = this.getCountyFromZip(zip);
    const zone = county ? this.countyToZone[county] : 3;
    const rates = gsaRates[zone] || gsaRates[3];

    const perDiemData = {
      location: {
        zip,
        state,
        county: county || 'Unknown',
        zone
      },
      rates: {
        lodging: rates.lodging,
        meals: rates.meals,
        incidental: 5,
        total: rates.total
      },
      source: 'GSA',
      fiscalYear: 2025,
      effectiveDate: new Date().toISOString()
    };

    // Cache the result
    this.cache.set(cacheKey, {
      data: perDiemData,
      timestamp: Date.now()
    });

    return perDiemData;
  }

  /**
   * Initialize ZIP to county mapping
   */
  initializeZipMapping() {
    return {
      // Bay Area
      '940': 'San Francisco', '941': 'San Francisco', '944': 'San Mateo',
      '945': 'Alameda', '946': 'Alameda', '947': 'Contra Costa', '948': 'Marin',
      '949': 'Marin', '943': 'San Mateo', '950': 'Santa Clara', '951': 'Santa Clara',
      '952': 'Contra Costa', '953': 'Solano', '954': 'Sonoma', '955': 'Sonoma',
      
      // Los Angeles Area
      '900': 'Los Angeles', '901': 'Los Angeles', '902': 'Los Angeles',
      '903': 'Los Angeles', '904': 'Los Angeles', '905': 'Los Angeles',
      '906': 'Los Angeles', '907': 'Los Angeles', '908': 'Los Angeles',
      '910': 'Los Angeles', '911': 'Los Angeles', '912': 'Los Angeles',
      '913': 'Los Angeles', '914': 'Los Angeles', '915': 'Los Angeles',
      '916': 'Los Angeles', '917': 'Los Angeles', '918': 'Los Angeles',
      
      // San Diego
      '919': 'San Diego', '920': 'San Diego', '921': 'San Diego',
      
      // Orange County
      '926': 'Orange', '927': 'Orange', '928': 'Orange',
      
      // Sacramento Valley
      '956': 'Sacramento', '957': 'Sacramento', '958': 'Sacramento',
      '959': 'Nevada', '960': 'Nevada', '961': 'Nevada'
    };
  }

  /**
   * Get county from ZIP code
   */
  getCountyFromZip(zip) {
    if (!zip || zip.length < 3) return null;
    const prefix3 = zip.substring(0, 3);
    return this.zipToCounty[prefix3] || null;
  }

  /**
   * Check if location requires prevailing wage
   */
  isPrevailingWageArea(county, state) {
    if (state !== 'CA') return false;
    
    // In California, public works projects always require prevailing wage
    // This is a simplified check - real implementation would check project type
    return true;
  }

  /**
   * Run health checks
   */
  runHealthChecks() {
    const checks = super.runHealthChecks();
    
    // Check cache health
    checks.push({
      name: 'cache',
      passed: this.cache.size < 1000,
      message: `Cache size: ${this.cache.size} entries`
    });

    // Check event bus connection
    const eventBus = this.dependencies.get('eventBus');
    checks.push({
      name: 'eventBus',
      passed: eventBus !== undefined,
      message: eventBus ? 'EventBus connected' : 'EventBus not connected'
    });

    return checks;
  }

  /**
   * Clean up on shutdown
   */
  async onShutdown() {
    // Clear cache
    this.cache.clear();
    
    this.logger.info('Prevailing Wage module shutdown complete');
  }
}

// Export for use in container
export default PrevailingWageModule;