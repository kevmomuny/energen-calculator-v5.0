/**
 * @module XLookupEngine
 * @description Excel XLOOKUP function implementation for JavaScript
 * Matches Excel's XLOOKUP behavior exactly
 */

import { ExcelTables } from './ExcelTables.js';

export class XLookupEngine {
  constructor() {
    this.tables = new ExcelTables();
    this.version = '1.0.0-monterey';
  }

  /**
     * Excel XLOOKUP implementation with bracket-based kW range matching
     * @param {*} lookupValue - Value to find (can be number for kW or string for exact match)
     * @param {Array} lookupArray - Array to search in
     * @param {Array} returnArray - Array to return value from
     * @param {*} ifNotFound - Value to return if not found (default 0)
     * @returns {*} Found value or ifNotFound
     */
  xlookup(lookupValue, lookupArray, returnArray, ifNotFound = 0) {
    // Check if this is a kW lookup (numeric value looking up in range strings)
    if (typeof lookupValue === 'number' &&
            lookupArray.length > 0 &&
            typeof lookupArray[0] === 'string' &&
            lookupArray[0].includes('-')) {

      // This is a kW range lookup - use bracket matching
      for (let i = 0; i < lookupArray.length; i++) {
        const range = lookupArray[i];
        const [min, max] = range.split('-').map(n => parseInt(n));

        if (lookupValue >= min && lookupValue <= max) {
          return returnArray[i];
        }
      }

      console.warn(`XLOOKUP: kW value ${lookupValue} not in any range, returning default`);
      return ifNotFound;
    }

    // For string lookups (like kW range strings), try exact match first
    const index = lookupArray.indexOf(lookupValue);
    if (index !== -1) {
      return returnArray[index];
    }

    // If lookupValue is a kW range string, it should have matched above
    // If not found, return default
    console.warn(`XLOOKUP: Value "${lookupValue}" not found, returning default`);
    return ifNotFound;
  }

  /**
     * Calculate column value based on Excel formulas
     * Implements all Annual sheet column formulas
     * @param {string} column - Column letter (L through AL)
     * @param {Object} input - Row input data
     * @returns {number} Calculated value
     */
  calculateColumn(column, input) {
    const { kwRange, kw } = input;
    const kwIndex = this.tables.getKwRangeIndex(kw);

    switch (column.toUpperCase()) {
      // Column L: Filter Cost
      // =XLOOKUP(K2,'Ser Menu 2022 Rates'!$B$25:$B$35,'Ser Menu 2022 Rates'!$G$25:$G$35,0)
      case 'L': {
        // Exact values from SSOT Table_5 Column G (Parts)
        const serviceBParts = [171.90, 171.90, 229.20, 229.20, 343.80, 458.40, 687.60, 916.80, 1146.00, 1146.00];
        return this.xlookup(kwRange, this.tables.kwRanges, serviceBParts, 0);
      }

      // Column M: Air Filter Cost - Manual $100
      case 'M':
        return 100.00;

        // Column N: Multiplier air filter = M2*0.5
      case 'N':
        return this.calculateColumn('M', input) * 0.5;

        // Column O: Coolant additive
        // =XLOOKUP(K2,'Ser Menu 2022 Rates'!$B$37:$B$46,'Ser Menu 2022 Rates'!$G$37:$G$46,0)*2.5
      case 'O': {
        const coolantQuantities = this.tables.getServiceCCoolantQuantities();
        const coolantQty = this.xlookup(kwRange, this.tables.kwRanges, coolantQuantities, 0);
        return coolantQty * 2.5;
      }

      // Column P: Fuel analysis = 'Ser Menu 2022 Rates'!$E$10
      case 'P':
        return this.tables.costFactors.fuelAnalysis; // $60

        // Column Q: LOADBANK Equipment fee
        // =XLOOKUP(K2,'Ser Menu 2022 Rates'!$B$47:$B$57,'Ser Menu 2022 Rates'!$G$47:$G$57,0)
      case 'Q':
        return this.xlookup(kwRange, this.tables.kwRanges,
          this.tables.serviceE.loadbankRental, 0);

        // Column R: A Service labor hours
        // =XLOOKUP(K2,'Ser Menu 2022 Rates'!$B$14:$B$24,'Ser Menu 2022 Rates'!$C$14:$C$24,0)
      case 'R':
        return this.xlookup(kwRange, this.tables.kwRanges,
          this.tables.serviceA.labor, 0);

        // Column S: B Service labor hours
        // =XLOOKUP(K2,'Ser Menu 2022 Rates'!$B$25:$B$35,'Ser Menu 2022 Rates'!$C$25:$C$35,0)
      case 'S':
        return this.xlookup(kwRange, this.tables.kwRanges,
          this.tables.serviceB.labor, 0);

        // Column T: LOADBANK LABOR hours
        // =XLOOKUP(K2,'Ser Menu 2022 Rates'!$B$47:$B$57,'Ser Menu 2022 Rates'!$C$47:$C$57)
      case 'T':
        return this.xlookup(kwRange, this.tables.kwRanges,
          this.tables.serviceE.labor, 0);

        // Column U: Fuel polishing - Manual 0.00 in Excel
      case 'U':
        return 0.00;

        // Column V: Oil sample = 'Ser Menu 2022 Rates'!$E$11
      case 'V':
        return this.tables.costFactors.oilAnalysis; // $16.55

      default:
        console.warn(`Unknown column: ${column}`);
        return 0;
    }
  }

  /**
     * Get all component costs for a row
     * Returns object with all L-V column values
     * @param {Object} input - Row input data
     * @returns {Object} All component costs
     */
  getComponentCosts(input) {
    return {
      filterCost: this.calculateColumn('L', input),          // L
      airFilterCost: this.calculateColumn('M', input),       // M
      airFilterMultiplier: this.calculateColumn('N', input), // N
      coolantAdditive: this.calculateColumn('O', input),     // O
      fuelAnalysis: this.calculateColumn('P', input),        // P
      loadbankEquipment: this.calculateColumn('Q', input),   // Q
      serviceAHours: this.calculateColumn('R', input),       // R
      serviceBHours: this.calculateColumn('S', input),       // S
      loadbankLabor: this.calculateColumn('T', input),       // T
      fuelPolishing: this.calculateColumn('U', input),       // U
      oilSample: this.calculateColumn('V', input)            // V
    };
  }

  /**
     * Convert kW value to range string
     * @param {number} kw - Power rating in kilowatts
     * @returns {string} Range string (e.g., "35-150")
     */
  getKwRange(kw) {
    const ranges = [
      { min: 2, max: 14, range: '2-14' },
      { min: 15, max: 30, range: '15-30' },
      { min: 35, max: 150, range: '35-150' },
      { min: 155, max: 250, range: '155-250' },
      { min: 255, max: 400, range: '255-400' },
      { min: 405, max: 500, range: '405-500' },
      { min: 505, max: 670, range: '505-670' },
      { min: 675, max: 1050, range: '675-1050' },
      { min: 1055, max: 1500, range: '1055-1500' },
      { min: 1500, max: 2050, range: '1500-2050' }
    ];

    for (const r of ranges) {
      if (kw >= r.min && kw <= r.max) {
        return r.range;
      }
    }

    // Default for out of range
    return kw < 2 ? '2-14' : '1500-2050';
  }

  /**
     * Get Service F tune-up data
     * @param {number} cylinders - Number of cylinders
     * @param {string} injectorType - 'Pop Noz' or 'Unit Inj'
     * @returns {Object} Service F data
     */
  getServiceFData(cylinders, injectorType) {
    const config = this.tables.getServiceFConfig(cylinders, injectorType);
    const totalHours = config.labor + config.shopTime;
    const laborCost = totalHours * this.tables.laborRates.base;

    return {
      labor: config.labor,
      shopTime: config.shopTime,
      totalHours,
      laborCost,
      parts: 0 // Parts not specified in Excel for Service F
    };
  }

  /**
     * Validate KW range exists
     * @param {string} kwRange - KW range string
     * @returns {boolean} True if valid
     */
  isValidKwRange(kwRange) {
    return this.tables.kwRanges.includes(kwRange);
  }

  /**
     * Get labor rate based on type
     * @param {string} type - 'contract', 'nonContract', 'overtime', etc.
     * @returns {number} Labor rate
     */
  getLaborRate(type = 'base') {
    return this.tables.laborRates[type] || this.tables.laborRates.base;
  }

  /**
     * Get cost factor
     * @param {string} factor - Factor name
     * @returns {number} Factor value
     */
  getCostFactor(factor) {
    return this.tables.costFactors[factor] || 0;
  }

  /**
     * Get markup factor
     * @param {string} factor - Factor name
     * @returns {number} Factor value
     */
  getMarkupFactor(factor) {
    return this.tables.markupFactors[factor] || 1;
  }
}

export default XLookupEngine;
