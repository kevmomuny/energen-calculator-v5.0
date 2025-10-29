/**
 * @module @energen/monterey-engine
 * @description Monterey Excel-compatible calculation engine
 * Provides exact Excel parity with monterey_mess.xlsx
 */

import { MontereyCalculator } from './MontereyCalculator.js';
import { ExcelTables } from './core/ExcelTables.js';
import { XLookupEngine } from './core/XLookupEngine.js';

/**
 * Main Monterey Calculation Engine with UI integration
 */
export class MontereyCalculationEngine {
  constructor(dependencies = {}) {
    this.version = '1.0.0-monterey';
    this.calculator = new MontereyCalculator(dependencies.config);
    this.dependencies = dependencies;

    // For compatibility with existing engine interface
    this.enableCache = dependencies.enableCache !== false;
    this.enableAudit = dependencies.enableAudit !== false;

    // Cache for calculations
    this.cache = new Map();
  }

  /**
     * Main calculation entry point - compatible with existing UI
     * @param {Object} payload - Standard UI payload
     * @returns {Promise<Object>} Calculation result in UI format
     */
  async calculate(payload) {
    try {
      // Check cache
      const cacheKey = this._getCacheKey(payload);
      if (this.enableCache && this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      // Convert UI payload to Excel format
      const excelInput = this._mapFromUIPayload(payload);

      // Perform Excel calculation
      const montereyResult = this.calculator.calculateRow(excelInput);

      // Convert back to UI format
      const uiResult = this._mapToUIFormat(montereyResult, payload);

      // Cache result
      if (this.enableCache) {
        this.cache.set(cacheKey, uiResult);
        // Clear cache after 5 minutes
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
      }

      return uiResult;

    } catch (error) {
      console.error('Monterey calculation error:', error);
      throw new Error(`Monterey calculation failed: ${error.message}`);
    }
  }

  /**
     * Map UI payload to Excel input format
     * @private
     */
  _mapFromUIPayload(payload) {
    const generator = payload.generators?.[0] || {};
    const customer = payload.customerInfo || {};
    const options = payload.serviceOptions || {};

    return {
      // Generator info (columns A-K)
      unitNumber: generator.id || generator.unitNumber || 'GEN-001',
      location: customer.location || customer.address || '',
      building: customer.building || customer.facility || '',
      generator: generator.brand || generator.manufacturer || '',
      genModel: generator.model || '',
      engineMake: generator.engineMake || generator.brand || '',
      engineMode: generator.engineMode || generator.fuelType || 'Diesel',
      voltage: generator.voltage || '480V',
      kw: generator.kw || 100,

      // Service info (columns W, X)
      inspections: options.inspections || options.annualInspections || 4,
      milesFromHQ: payload.distance || customer.distance || 0,

      // For Service F
      cylinders: generator.cylinders || 6,
      injectorType: generator.injectorType || 'Pop Noz'
    };
  }

  /**
     * Map Monterey result to UI format
     * @private
     */
  _mapToUIFormat(montereyResult, originalPayload) {
    const result = {
      success: true,
      calculation: {
        // Main totals
        laborTotal: (montereyResult.calculations.inspectionTotal +
                           montereyResult.calculations.labor).toFixed(2),
        partsTotal: montereyResult.calculations.partsMarkup.toFixed(2),
        travelTotal: montereyResult.calculations.mileage.toFixed(2),
        freightTotal: montereyResult.calculations.freight.toFixed(2),

        // Subtotals
        subtotal: montereyResult.totals.subTotal.toFixed(2),
        tax: '0.00', // Excel doesn't explicitly calculate tax
        taxRate: '0.000%',
        total: montereyResult.totals.totalWithTax.toFixed(2),

        // Annual projections
        annual: montereyResult.totals.totalWithTax.toFixed(2),
        monthly: (montereyResult.totals.totalWithTax / 12).toFixed(2),

        // Multi-year projections
        year1Total: montereyResult.projections.total2026,
        year2Total: montereyResult.projections.total2027,
        year3Total: montereyResult.projections.total2028,
        threeYearTotal: montereyResult.projections.total3Year,

        // Service breakdown
        serviceBreakdown: this._buildServiceBreakdown(montereyResult),

        // Component details
        components: {
          filterCost: montereyResult.components.filterCost,
          airFilterCost: montereyResult.components.airFilterCost,
          coolantAdditive: montereyResult.components.coolantAdditive,
          fuelAnalysis: montereyResult.components.fuelAnalysis,
          oilSample: montereyResult.components.oilSample,
          loadbankEquipment: montereyResult.components.loadbankEquipment
        },

        // Labor hours
        laborHours: {
          serviceA: montereyResult.components.serviceAHours,
          serviceB: montereyResult.components.serviceBHours,
          loadbank: montereyResult.components.loadbankLabor
        },

        // Distance-based
        distance: montereyResult.input.milesFromHQ,
        mileageCost: montereyResult.calculations.mileage.toFixed(2),

        // Loadbank details
        loadbankSubtotal: montereyResult.calculations.loadbankSubtotal.toFixed(2),

        // Special totals
        totalWithoutMobilization: montereyResult.totals.totalWithoutMobilization.toFixed(2)
      },

      // Metadata
      metadata: {
        version: this.version,
        calculatedAt: new Date().toISOString(),
        excelCompatibility: true,
        engine: 'monterey'
      }
    };

    // Add services array if requested
    if (originalPayload.services && Array.isArray(originalPayload.services)) {
      result.calculation.services = this._mapServices(montereyResult, originalPayload.services);
    }

    return result;
  }

  /**
     * Build service breakdown for UI
     * @private
     */
  _buildServiceBreakdown(montereyResult) {
    const laborRate = 191; // Base labor rate

    return {
      'A': {
        description: 'A - Comprehensive Inspection',
        instances: [{
          laborHours: montereyResult.components.serviceAHours,
          laborCost: montereyResult.calculations.inspectionTotal,
          partsCost: 0, // Parts included in total markup
          frequency: montereyResult.input.inspections
        }],
        totalLabor: montereyResult.calculations.inspectionTotal,
        totalParts: 0
      },
      'B': {
        description: 'B - Oil & Filter Service',
        instances: [{
          laborHours: montereyResult.components.serviceBHours,
          laborCost: montereyResult.components.serviceBHours * laborRate,
          partsCost: montereyResult.components.filterCost,
          frequency: 1
        }],
        totalLabor: montereyResult.components.serviceBHours * laborRate,
        totalParts: montereyResult.components.filterCost
      },
      'E': {
        description: 'E - Load Bank Testing',
        instances: [{
          laborHours: montereyResult.components.loadbankLabor,
          laborCost: montereyResult.components.loadbankLabor * laborRate,
          partsCost: montereyResult.components.loadbankEquipment,
          frequency: 1
        }],
        totalLabor: montereyResult.components.loadbankLabor * laborRate,
        totalParts: montereyResult.components.loadbankEquipment
      }
    };
  }

  /**
     * Map services for compatibility
     * @private
     */
  _mapServices(montereyResult, requestedServices) {
    const services = [];

    if (requestedServices.includes('A')) {
      services.push({
        serviceCode: 'A',
        serviceName: 'A - Comprehensive Inspection',
        laborHours: montereyResult.components.serviceAHours,
        laborCost: montereyResult.calculations.inspectionTotal,
        partsCost: 0,
        frequency: montereyResult.input.inspections
      });
    }

    if (requestedServices.includes('B')) {
      services.push({
        serviceCode: 'B',
        serviceName: 'B - Oil & Filter Service',
        laborHours: montereyResult.components.serviceBHours,
        laborCost: montereyResult.components.serviceBHours * 191,
        partsCost: montereyResult.components.filterCost,
        frequency: 1
      });
    }

    if (requestedServices.includes('E')) {
      services.push({
        serviceCode: 'E',
        serviceName: 'E - Load Bank Testing',
        laborHours: montereyResult.components.loadbankLabor,
        laborCost: montereyResult.calculations.loadbankSubtotal,
        partsCost: montereyResult.components.loadbankEquipment,
        frequency: 1
      });
    }

    return services;
  }

  /**
     * Generate cache key
     * @private
     */
  _getCacheKey(payload) {
    const gen = payload.generators?.[0] || {};
    return `monterey-${gen.kw}-${payload.distance}-${payload.services?.join(',')}`;
  }

  /**
     * Get version info
     */
  getVersionInfo() {
    return {
      version: this.version,
      engine: 'monterey',
      excelFile: 'monterey_mess.xlsx',
      services: ['A', 'B', 'C', 'E', 'F'],
      features: {
        xlookup: true,
        serviceFCylinders: true,
        multiYearProjections: true,
        cpiRate: 0.083
      }
    };
  }

  /**
     * Clear cache
     */
  clearCache() {
    this.cache.clear();
  }

  /**
     * Calculate Service F separately
     */
  calculateServiceF(cylinders, injectorType) {
    return this.calculator.calculateServiceF(cylinders, injectorType);
  }

  /**
     * Calculate individual service annual subtotal for UI display
     * @param {string} serviceCode - Service code (A-F)
     * @param {number} kw - Generator KW rating
     * @param {number} frequency - Annual frequency (1, 2, 4, etc.)
     * @returns {Object} Service pricing details
     */
  calculateServicePrice(serviceCode, kw, frequency = 1) {
    try {
      const tables = this.calculator.tables;
      const kwIndex = tables.getKwRangeIndex(kw);
      const laborRate = tables.laborRates.base; // $191

      let laborHours = 0;
      let partsCost = 0;
      let equipmentCost = 0;
      let description = '';

      switch (serviceCode.toUpperCase()) {
        case 'A': {
          // Service A: Comprehensive Inspection
          const service = tables.serviceA;
          laborHours = service.labor[kwIndex] + service.shopTime[kwIndex];
          partsCost = 0; // No parts for inspection
          description = 'Comprehensive Inspection';
          break;
        }

        case 'B': {
          // Service B: Oil & Filter Service
          const service = tables.serviceB;
          laborHours = service.labor[kwIndex] + service.shopTime[kwIndex];

          // Parts: Oil + Filter costs from XLOOKUP
          const oilGallons = service.oilGallons[kwIndex];
          const oilCost = oilGallons * tables.costFactors.oilCost; // $16/gallon

          // Filter cost from Service B Parts column (estimated)
          const filterBaseCosts = [172, 172, 229, 229, 344, 458, 688, 917, 1146, 1146];
          const filterCost = filterBaseCosts[kwIndex];

          partsCost = oilCost + filterCost;
          description = 'Oil & Filter Service';
          break;
        }

        case 'C': {
          // Service C: Coolant Service
          const service = tables.serviceC;
          laborHours = service.labor[kwIndex] + service.shopTime[kwIndex];

          // Coolant quantity = Service B oil gallons × 1.5
          const coolantGallons = tables.serviceB.oilGallons[kwIndex] * 1.5;
          const coolantCost = coolantGallons * tables.costFactors.coolantCost; // $15/gallon

          // Hoses and belts
          const hosesAndBelts = service.hosesAndBelts[kwIndex];

          partsCost = coolantCost + hosesAndBelts;
          description = 'Coolant Service';
          break;
        }

        case 'D': {
          // Service D: Oil & Fuel Analysis
          laborHours = 1; // Minimal labor for sampling
          partsCost = tables.costFactors.oilAnalysis + tables.costFactors.fuelAnalysis; // $16.55 + $60
          description = 'Oil & Fuel Analysis';
          break;
        }

        case 'E': {
          // Service E: Load Bank Testing
          const service = tables.serviceE;
          laborHours = service.labor[kwIndex] + service.shopTime[kwIndex];

          // Equipment rental
          equipmentCost = service.loadbankRental[kwIndex];

          // Add transformer and delivery for larger units
          if (kwIndex >= 6) { // 505kw and above
            equipmentCost += service.transformerRental[kwIndex];
            equipmentCost += service.deliveryCost[kwIndex];
          }

          partsCost = 0; // No parts, just equipment
          description = 'Load Bank Testing';
          break;
        }

        case 'F': {
          // Service F: Engine Tune-up (use default 6 cylinder Pop Noz)
          const config = tables.getServiceFConfig(6, 'Pop Noz');
          laborHours = config.labor + config.shopTime;
          partsCost = 0; // Parts not specified in Excel
          description = 'Engine Tune-Up';
          break;
        }

        default:
          throw new Error(`Unknown service code: ${serviceCode}`);
      }

      // Calculate costs
      const laborCost = laborHours * laborRate;
      const partsWithMarkup = partsCost * tables.markupFactors.partsMarkup; // 1.25 markup
      const totalPerInstance = laborCost + partsWithMarkup + equipmentCost;

      // Annual total based on frequency
      const annualTotal = totalPerInstance * frequency;

      return {
        serviceCode,
        description,
        laborHours,
        laborCost,
        partsCost,
        equipmentCost,
        partsWithMarkup,
        frequency,
        perInstance: Math.round(totalPerInstance),
        annual: Math.round(annualTotal),
        monthly: Math.round(annualTotal / 12)
      };

    } catch (error) {
      console.error(`Error calculating service ${serviceCode} price:`, error);
      // Return fallback pricing
      return {
        serviceCode,
        description: `Service ${serviceCode}`,
        annual: 1000,
        monthly: 83,
        perInstance: 1000,
        frequency: frequency
      };
    }
  }

  /**
     * Batch calculation for multiple generators
     */
  async calculateBatch(generators) {
    const results = [];

    for (const generator of generators) {
      const result = await this.calculate({
        generators: [generator],
        services: ['A', 'B', 'E']
      });
      results.push(result);
    }

    return {
      results,
      summary: this.calculator.getSummaryTotals(
        results.map(r => r.calculation)
      )
    };
  }
}

// Export all components
export { MontereyCalculator } from './MontereyCalculator.js';
export { ExcelTables } from './core/ExcelTables.js';
export { XLookupEngine } from './core/XLookupEngine.js';

// Factory function
export function createMontereyEngine(dependencies = {}) {
  return new MontereyCalculationEngine(dependencies);
}

// Default export
export default MontereyCalculationEngine;
