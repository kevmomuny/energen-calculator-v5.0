/**
 * @module @energen/calc-engine
 * @description Pure calculation engine for Energen generator services
 * @version 5.0.0
 * @author Energen Systems Inc.
 * @license PROPRIETARY - All calculations are trade secrets
 *
 * CRITICAL: This module contains Excel-parity calculations verified against
 * ServiceCalculator.xlsx (Aug 13, 2024). ANY change must be validated.
 *
 * ARCHITECTURE PRINCIPLES:
 * 1. Pure functions - no side effects, same input = same output
 * 2. Zero external dependencies in core logic
 * 3. Dependency injection for all external services
 * 4. Immutable data structures
 * 5. Full calculation audit trail
 * 6. Platform agnostic (Node.js, Browser, React Native)
 */

import { CalculationCore } from './core/CalculationCore.js';
import { ServiceDefinitions } from './core/ServiceDefinitions.js';
import { MaterialRates } from './core/MaterialRates.js';
import { KwRangeMapper } from './core/KwRangeMapper.js';
import { ValidationEngine } from './core/ValidationEngine.js';
import { AuditLogger } from './core/AuditLogger.js';
import { CacheManager } from './core/CacheManager.js';
import { XLookupEngine } from './xlookup-engine.js';

/**
 * Main calculation engine with dependency injection
 * @class EnergenCalculationEngine
 */
export class EnergenCalculationEngine {
  /**
     * @param {Object} dependencies - Injected dependencies
     * @param {Function} dependencies.taxRateProvider - Async function to get tax rates
     * @param {Function} dependencies.distanceProvider - Async function to get distances
     * @param {Object} dependencies.config - Configuration overrides
     * @param {boolean} dependencies.enableCache - Enable calculation caching
     * @param {boolean} dependencies.enableAudit - Enable audit logging
     */
  constructor(dependencies = {}) {
    // Core modules - pure business logic
    this.core = new CalculationCore();
    // PHASE 4 FIX: Pass config to ServiceDefinitions for dynamic costs
    this.serviceDefinitions = new ServiceDefinitions(dependencies.config);
    // PHASE 3 FIX: Pass full config to MaterialRates for settings access
    this.materialRates = new MaterialRates(dependencies.config);
    this.kwRangeMapper = new KwRangeMapper();
    this.validator = new ValidationEngine();
    this.xlookupEngine = new XLookupEngine(dependencies.config); // Excel XLOOKUP replication with settings

    // Optional features
    this.auditLogger = dependencies.enableAudit !== false ? new AuditLogger() : null;
    this.cacheManager = dependencies.enableCache !== false ? new CacheManager() : null;

    // External service providers (injected)
    this.taxRateProvider = dependencies.taxRateProvider || this._defaultTaxRateProvider;
    this.distanceProvider = dependencies.distanceProvider || this._defaultDistanceProvider;

    // Configuration
    this.config = {
      ...this._getDefaultConfig(),
      ...dependencies.config
    };

    // Metadata
    this.version = '5.0.0';
    this.excelParityDate = '2024-08-13';
  }

  /**
     * Main calculation entry point - maintains backward compatibility
     * @param {Object} payload - Calculation input
     * @returns {Promise<Object>} Calculation result
     */
  async calculate(payload) {
    const startTime = performance.now();

    try {
      // Step 1: Validate input
      const validation = this.validator.validatePayload(payload);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 2: Check cache
      if (this.cacheManager) {
        const cacheKey = this.cacheManager.generateKey(payload);
        const cached = this.cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Step 3: Start audit trail
      const audit = this.auditLogger?.startAudit(payload);

      // Step 4: Parse and normalize input
      const normalizedInput = this._normalizeInput(payload);
      if (audit && typeof audit.log === 'function') {
        audit.log('normalized_input', normalizedInput);
      }

      // Step 5: Perform core calculations
      const calculations = await this._performCalculations(normalizedInput, audit);

      // Step 6: Format output
      const result = this._formatOutput(calculations, normalizedInput);

      // Step 7: Add metadata
      result.metadata = {
        version: this.version,
        calculatedAt: new Date().toISOString(),
        duration: performance.now() - startTime,
        excelParityDate: this.excelParityDate
      };

      // Step 8: Complete audit
      audit?.complete(result);

      // Step 9: Cache result
      if (this.cacheManager) {
        const cacheKey = this.cacheManager.generateKey(payload);
        this.cacheManager.set(cacheKey, result);
      }

      return result;

    } catch (error) {
      // Log error in audit if logger exists and has logError method
      if (this.auditLogger && typeof this.auditLogger.logError === 'function') {
        this.auditLogger.logError(error);
      }

      // Re-throw with context
      throw new CalculationError(
        error.message,
        'CALC_ERROR',
        { payload, version: this.version }
      );
    }
  }

  /**
     * Perform core calculations
     * @private
     */
  async _performCalculations(input, audit) {
    const { customerInfo, generators, services, serviceOptions, contractLength, facilityType } = input;

    // Get external data (tax rate, distance)
    const [taxRate, distance] = await Promise.all([
      this._getTaxRate(customerInfo),
      this._getDistance(customerInfo)
    ]);

    if (audit && typeof audit.log === 'function') {
      audit.log('external_data', { taxRate, distance });
    }

    // Initialize accumulators
    const calculations = {
      services: [],
      laborTotal: 0,
      partsTotal: 0,
      travelTotal: 0,
      breakdownByService: {}
    };

    // Process each generator
    for (const generator of generators) {
      const kwRange = this.kwRangeMapper.getRange(generator.kw);
      if (audit && typeof audit.log === 'function') {
        audit.log('kw_range', { kw: generator.kw, range: kwRange });
      }

      // Process each service
      for (const serviceCode of services) {
        const serviceCalc = this._calculateService({
          serviceCode,
          generator,
          kwRange,
          contractLength,
          facilityType,
          serviceOptions
        });

        calculations.services.push(serviceCalc);
        calculations.laborTotal += serviceCalc.laborCost;
        calculations.partsTotal += serviceCalc.partsCost;
        calculations.travelTotal += serviceCalc.travelCost;

        // Aggregate by service type
        if (!calculations.breakdownByService[serviceCode]) {
          calculations.breakdownByService[serviceCode] = {
            description: this.serviceDefinitions.getName(serviceCode),
            instances: [],
            totalLabor: 0,
            totalParts: 0,
            totalShop: 0
          };
        }

        calculations.breakdownByService[serviceCode].instances.push(serviceCalc);
        calculations.breakdownByService[serviceCode].totalLabor += serviceCalc.laborCost;
        calculations.breakdownByService[serviceCode].totalParts += serviceCalc.partsCost;
        calculations.breakdownByService[serviceCode].totalTravel += serviceCalc.travelCost;

        if (audit && typeof audit.log === 'function') {
          audit.log(`service_${serviceCode}_${generator.id}`, serviceCalc);
        }
      }
    }

    // Apply tax
    calculations.tax = calculations.partsTotal * taxRate;
    calculations.taxRate = taxRate;

    // Calculate totals
    calculations.subtotal = calculations.laborTotal + calculations.partsTotal + calculations.travelTotal;
    calculations.total = calculations.subtotal + calculations.tax;

    // Add distance-based calculations
    calculations.distance = distance;
    calculations.mileageCost = this._calculateMileageCost(distance, services.length, contractLength);

    if (audit && typeof audit.log === 'function') {
      audit.log('calculations_complete', calculations);
    }

    return calculations;
  }

  /**
     * Calculate individual service
     * @private
     */
  _calculateService({ serviceCode, generator, kwRange, contractLength, facilityType, serviceOptions }) {
    // Get service definition
    const serviceDef = this.serviceDefinitions.getDefinition(serviceCode, kwRange, generator);

    // Calculate labor
    const laborHours = serviceDef.laborHours || 0;
    const mobilizationHours = this._getMobilizationHours(laborHours);
    const totalLaborHours = (laborHours + mobilizationHours) * generator.quantity;
    const laborRate = this._getLaborRate(facilityType);
    const laborCost = totalLaborHours * laborRate;

    // Calculate parts
    let partsCost = 0;

    // Oil costs (Service B)
    if (serviceDef.oilGallons) {
      const oilPrice = this.materialRates.getOilPrice();
      const oilMarkup = this.materialRates.getOilMarkup();
      partsCost += serviceDef.oilGallons * oilPrice * oilMarkup;
    }

    // Coolant costs (Service C)
    if (serviceDef.coolantGallons) {
      const coolantPrice = this.materialRates.getCoolantPrice();
      const coolantMarkup = this.materialRates.getCoolantMarkup();
      partsCost += serviceDef.coolantGallons * coolantPrice * coolantMarkup;
    }

    // Hoses and belts (Service C)
    if (serviceDef.hosesBelts) {
      partsCost += serviceDef.hosesBelts;
    }

    // Filter costs
    if (serviceDef.filterCost) {
      partsCost += serviceDef.filterCost;
    }

    // Air filter costs (fixed $100 per unit for applicable services)
    if (serviceCode === 'B' || serviceCode === 'A') {
      partsCost += 100; // Fixed air filter cost from Excel
    }

    // Coolant additive (based on kW range)
    if (serviceCode === 'C') {
      const coolantAdditives = {
        '2-14': 50,
        '15-30': 75,
        '35-150': 100,
        '155-250': 125,
        '255-400': 150,
        '405-500': 175,
        '505-670': 200,
        '675-1050': 225,
        '1055-1500': 250,
        '1500-2050': 275
      };
      partsCost += coolantAdditives[kwRange] || 100;
    }

    // Fuel analysis cost (Service D)
    if (serviceCode === 'D') {
      partsCost += 60; // Fixed fuel analysis cost from Excel
    }

    // Oil sample analysis (Service D)
    if (serviceCode === 'D') {
      partsCost += 16.55; // Fixed oil sample cost from Excel
    }

    // Transformer and delivery costs (Service E for large units)
    if (serviceCode === 'E' && serviceDef.transformerRental) {
      partsCost += serviceDef.transformerRental;
      // Add delivery cost for large units
      if (generator.kw >= 505) {
        partsCost += 3500; // Delivery cost from Excel
      }
    }

    // Other parts
    if (serviceDef.parts) {
      partsCost += serviceDef.parts;
    }

    // Battery costs for Service B (if option is selected)
    let batteryLabor = 0;
    if (serviceCode === 'B' && serviceOptions && serviceOptions.includeBattery) {
      if (serviceDef.batteryCost) {
        partsCost += serviceDef.batteryCost;
      }
      if (serviceDef.batteryLabor) {
        batteryLabor = serviceDef.batteryLabor * laborRate * generator.quantity;
      }
    }

    // Apply parts markup and freight
    const partsMarkup = this.materialRates.getPartsMarkup();
    const freightMarkup = this.materialRates.getFreightMarkup();
    partsCost = partsCost * partsMarkup * freightMarkup * generator.quantity;

    // Calculate mobilization
    const shopHours = serviceDef.shopHours || 0;
    const shopCost = shopHours * laborRate * generator.quantity;

    // Apply frequency multiplier
    const frequency = this._getServiceFrequency(serviceCode, contractLength);

    return {
      serviceCode,
      serviceName: this.serviceDefinitions.getName(serviceCode),
      generatorId: generator.id,
      generatorKw: generator.kw,
      quantity: generator.quantity,
      laborHours: totalLaborHours,
      laborCost: (laborCost + batteryLabor) * frequency,
      partsCost: partsCost * frequency,
      shopCost: shopCost * frequency,
      frequency,
      details: serviceDef
    };
  }

  /**
     * Get mobilization hours based on service and kW
     * @private
     */
  _getMobilizationHours(laborHours) {
    // Mobilization is 100% of labor hours
    // This represents prep and documentation time
    return laborHours * 1.0;
  }

  /**
     * Get labor rate based on facility type
     * @private
     */
  _getLaborRate(facilityType) {
    const rates = this.config.laborRates;

    switch (facilityType) {
      case 'government':
        return rates.government || 191;
      case 'contract':
        return rates.standard || 191;
      case 'non-contract':
        return rates.nonContract || 200;
      case 'overtime':
        return rates.overtime || 255.50;
      case 'double-time':
        return rates.doubleTime || 400;
      default:
        return rates.standard || 191;
    }
  }

  /**
     * Get service frequency multiplier
     * @private
     */
  _getServiceFrequency(serviceCode, contractMonths) {
    const annualFrequencies = {
      'A': 4,    // Quarterly
      'B': 1,    // Annual
      'C': 0.5,  // Biannual
      'D': 1,    // Annual
      'E': 1,    // Annual
      'F': 0.33, // Every 3 years
      'G': 0.33, // Every 3 years
      'H': 0.2,  // Every 5 years
      'I': 1,    // Annual
      'J': 1     // Annual
    };

    const annualFrequency = annualFrequencies[serviceCode] || 1;
    return annualFrequency * (contractMonths / 12);
  }

  /**
     * Calculate mileage cost
     * @private
     */
  _calculateMileageCost(distance, serviceCount, contractMonths) {
    if (!distance || distance <= 0) return 0;

    const mileageRate = this.config.mileageRate; // No fallback - required from settings
    const tripsPerMonth = Math.ceil(serviceCount / 3); // Combine services
    const totalTrips = tripsPerMonth * contractMonths;
    const totalMiles = distance * 2 * totalTrips; // Round trip

    return totalMiles * mileageRate;
  }

  /**
     * Get tax rate (async)
     * @private
     */
  async _getTaxRate(customerInfo) {
    try {
      return await this.taxRateProvider(customerInfo);
    } catch (error) {
      console.warn('Tax rate provider failed, using default:', error.message);
      return 0.1025; // California default
    }
  }

  /**
     * Get distance (async)
     * @private
     */
  async _getDistance(customerInfo) {
    try {
      return await this.distanceProvider(customerInfo);
    } catch (error) {
      console.warn('Distance provider failed, using zero:', error.message);
      return 0;
    }
  }

  /**
     * Default tax rate provider
     * @private
     */
  async _defaultTaxRateProvider(customerInfo) {
    // Default California rate
    // In production, this would call CDTFA API
    return 0.1025;
  }

  /**
     * Default distance provider
     * @private
     */
  async _defaultDistanceProvider(customerInfo) {
    // Default no distance
    // In production, this would call Google Distance Matrix API
    return 0;
  }

  /**
     * Normalize input payload
     * @private
     */
  _normalizeInput(payload) {
    // Handle both old and new payload formats
    const normalized = {
      customerInfo: payload.customerInfo || {},
      generators: payload.generators || [],
      services: payload.services || [],
      serviceOptions: payload.serviceOptions || {},
      contractLength: payload.contractLength || payload.contractMonths || 12,
      facilityType: payload.facilityType || 'commercial'
    };

    // Ensure generators have IDs
    normalized.generators = normalized.generators.map((gen, index) => ({
      id: gen.id || `gen_${index}`,
      kw: gen.kw || 100,
      quantity: gen.quantity || gen.unitCount || 1,
      brand: gen.brand || '',
      model: gen.model || '',
      cylinders: gen.cylinders,
      injectorType: gen.injectorType
    }));

    return normalized;
  }

  /**
     * Format output for backward compatibility
     * @private
     */
  _formatOutput(calculations, input) {
    return {
      success: true,
      calculation: {
        // Totals
        laborTotal: calculations.laborTotal.toFixed(2),
        partsTotal: calculations.partsTotal.toFixed(2),
        travelTotal: calculations.travelTotal.toFixed(2),
        subtotal: calculations.subtotal.toFixed(2),
        tax: calculations.tax.toFixed(2),
        taxRate: (calculations.taxRate * 100).toFixed(3) + '%',
        total: calculations.total.toFixed(2),

        // Breakdown
        serviceBreakdown: calculations.breakdownByService,
        services: calculations.services,

        // Annual/contract totals
        annual: calculations.total.toFixed(2),
        monthly: (calculations.total / input.contractLength).toFixed(2),

        // Distance
        distance: calculations.distance,
        mileageCost: calculations.mileageCost?.toFixed(2)
      }
    };
  }

  /**
     * Get default configuration
     * @private
     */
  _getDefaultConfig() {
    return {
      laborRates: {
        standard: 191,
        nonContract: 200,
        overtime: 255.50,
        doubleTime: 400,
        government: 191
      },
      mileageRate: 2.50
    };
  }

  /**
     * Get calculation audit log
     * @returns {Array} Audit trail
     */
  getAuditLog() {
    return this.auditLogger?.getLog() || [];
  }

  /**
     * Clear cache
     */
  clearCache() {
    this.cacheManager?.clear();
  }

  /**
     * Get engine version info
     * @returns {Object} Version information
     */
  getVersionInfo() {
    return {
      version: this.version,
      excelParityDate: this.excelParityDate,
      modules: {
        core: this.core.version,
        serviceDefinitions: this.serviceDefinitions.version,
        materialRates: this.materialRates.version
      }
    };
  }
}

/**
 * Custom error class for calculation errors
 */
export class CalculationError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'CalculationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Factory function for creating engine instances
 */
export function createCalculationEngine(dependencies = {}) {
  return new EnergenCalculationEngine(dependencies);
}

// Export with both names for compatibility
export { EnergenCalculationEngine as CalculationEngine };

// Default export
export default EnergenCalculationEngine;
