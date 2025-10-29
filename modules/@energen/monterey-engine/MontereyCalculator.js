/**
 * @module MontereyCalculator
 * @description Main Monterey Excel calculation engine
 * Implements complete Excel logic from monterey_mess.xlsx
 */

import { ExcelTables } from './core/ExcelTables.js';
import { XLookupEngine } from './core/XLookupEngine.js';

export class MontereyCalculator {
  constructor(config = {}) {
    this.version = '1.0.0-monterey';
    this.excelCompatibility = true;

    // Initialize core components
    this.tables = new ExcelTables();
    this.xlookup = new XLookupEngine(config);

    // Override default factors if provided
    if (config.costFactors) {
      Object.assign(this.tables.costFactors, config.costFactors);
    }
    if (config.markupFactors) {
      Object.assign(this.tables.markupFactors, config.markupFactors);
    }
  }

  /**
     * Calculate complete row matching Excel Annual sheet
     * @param {Object} input - Input data matching Excel columns A-K, W, X
     * @returns {Object} Complete calculation results (columns L-AL)
     */
  calculateRow(input) {
    // Validate and normalize input
    const normalized = this._normalizeInput(input);

    // Get KW range
    const kwRange = this.tables.getKwRange(normalized.kw);
    normalized.kwRange = kwRange;

    // Step 1: Get all component costs (columns L-V)
    const components = this.xlookup.getComponentCosts(normalized);

    // Step 2: Calculate dependent columns (Y-AE)
    const calculations = this._calculateDependentColumns(normalized, components);

    // Step 3: Calculate totals (AF-AH)
    const totals = this._calculateTotals(calculations);

    // Step 4: Calculate multi-year projections (AI-AL)
    const projections = this._calculateProjections(totals);

    // Combine all results
    return {
      // Input echo
      input: normalized,

      // Component costs (L-V)
      components,

      // Calculations (Y-AE)
      calculations,

      // Totals (AF-AH)
      totals,

      // Projections (AI-AL)
      projections,

      // Summary
      summary: {
        totalAnnualCost: totals.totalWithTax,
        threeYearTotal: projections.total3Year,
        monthlyAverage: totals.totalWithTax / 12
      }
    };
  }

  /**
     * Normalize and validate input data
     * @private
     */
  _normalizeInput(input) {
    return {
      // Column A-K inputs
      unitNumber: input.unitNumber || 'GEN-001',
      location: input.location || '',
      building: input.building || '',
      generator: input.generator || '',
      genModel: input.genModel || '',
      engineMake: input.engineMake || '',
      engineMode: input.engineMode || '',
      voltage: input.voltage || '480V',
      kw: parseFloat(input.kw) || 100,
      kwRange: input.kwRange || '', // Will be calculated

      // Column W, X inputs
      inspections: parseInt(input.inspections) || 4,
      milesFromHQ: parseFloat(input.milesFromHQ) || 0,

      // For Service F
      cylinders: parseInt(input.cylinders) || 6,
      injectorType: input.injectorType || 'Pop Noz'
    };
  }

  /**
     * Calculate dependent columns (Y-AE)
     * @private
     */
  _calculateDependentColumns(input, components) {
    const laborRate = this.tables.laborRates.base; // F13 = $191

    // Column Y: Inspection Total = (W2*R2*'Ser Menu 2022 Rates'!$F$13)
    const inspectionTotal = input.inspections * components.serviceAHours * laborRate;

    // Column Z: Labor = SUM(S2:T2)*'Ser Menu 2022 Rates'!$F$13
    const labor = (components.serviceBHours + components.loadbankLabor) * laborRate;

    // Column AB: Parts Plus Mark up = ROUND((L2+M2+N2+O2+P2+Q2+V2),0)*'Ser Menu 2022 Rates'!$J$5
    const partsCosts =
            components.filterCost +
            components.airFilterCost +
            components.airFilterMultiplier +
            components.coolantAdditive +
            components.fuelAnalysis +
            components.loadbankEquipment +
            components.oilSample;

    const partsMarkup = Math.round(partsCosts) * this.tables.markupFactors.partsMarkup;

    // Column AA: Freight = AB2*'Ser Menu 2022 Rates'!$J$8
    const freight = partsMarkup * this.tables.markupFactors.freightPercent;

    // Column AC: Travel Time
    // =XLOOKUP(K[row],'Ser Menu 2022 Rates'!$B$15:$B$24,'Ser Menu 2022 Rates'!$D$15:$D$24*'Ser Menu 2022 Rates'!$F$13,0)*W[row]
    // Note: B15:B24 is same as B14:B24 but offset by 1 row - using serviceA shopTime
    const shopTimeHours = this.xlookup.xlookup(
      input.kwRange,
      this.tables.kwRanges,
      this.tables.serviceA.shopTime,
      0
    );
    const travelTime = shopTimeHours * laborRate * input.inspections;

    // Column AD: Mileage = (Annual!$X2*'Ser Menu 2022 Rates'!$H$10)*Annual!$W2
    const mileage = input.milesFromHQ * this.tables.markupFactors.mileageRate * input.inspections;

    // Column AE: Loadbank subtotal = (Annual!$T2*'Ser Menu 2022 Rates'!$F$13)+Annual!$Q2
    const loadbankSubtotal = (components.loadbankLabor * laborRate) + components.loadbankEquipment;

    return {
      inspectionTotal,    // Y
      labor,             // Z
      freight,           // AA
      partsMarkup,       // AB
      travelTime,        // AC
      mileage,           // AD
      loadbankSubtotal   // AE
    };
  }

  /**
     * Calculate totals (AF-AH)
     * @private
     */
  _calculateTotals(calculations) {
    // Column AF: Sub-Total = SUM(Y2:AD2)
    const subTotal =
            calculations.inspectionTotal +
            calculations.labor +
            calculations.freight +
            calculations.partsMarkup +
            calculations.travelTime +
            calculations.mileage +
            calculations.loadbankSubtotal;

    // Column AG: TOTAL W/TAX = ROUND(SUM(AF2),2)
    const totalWithTax = Math.round(subTotal * 100) / 100;

    // Column AH: Total Without Mobilization and loadbank = AG2-(AD2+AE2)
    const totalWithoutMobilization = totalWithTax - (calculations.mileage + calculations.loadbankSubtotal);

    return {
      subTotal,                    // AF
      totalWithTax,                // AG
      totalWithoutMobilization     // AH
    };
  }

  /**
     * Calculate multi-year projections (AI-AL)
     * @private
     */
  _calculateProjections(totals) {
    const cpiMultiplier = this.tables.costFactors.yearlyMultiplier; // 1.05 (5% annual escalation)

    // Column AI: Rounded Total 2026 = ROUND(AG2,0)
    const total2026 = Math.round(totals.totalWithTax);

    // Column AJ: Rounded Total 2027 = ROUND(AI2*'Ser Menu 2022 Rates'!$J$10,0)
    const total2027 = Math.round(total2026 * cpiMultiplier);

    // Column AK: Rounded Total 2028 = ROUND(AJ2*'Ser Menu 2022 Rates'!$J$10,0)
    const total2028 = Math.round(total2027 * cpiMultiplier);

    // Column AL: Rounded Total 2029 = SUM(AI2:AK2)
    const total3Year = total2026 + total2027 + total2028;

    return {
      total2026,    // AI
      total2027,    // AJ
      total2028,    // AK
      total3Year    // AL
    };
  }

  /**
     * Calculate Service F separately (cylinder-based)
     * @param {number} cylinders - Number of cylinders
     * @param {string} injectorType - 'Pop Noz' or 'Unit Inj'
     * @returns {Object} Service F calculation
     */
  calculateServiceF(cylinders, injectorType) {
    return this.xlookup.getServiceFData(cylinders, injectorType);
  }

  /**
     * Calculate multiple rows (like Excel sheet with multiple generators)
     * @param {Array} rows - Array of input objects
     * @returns {Array} Array of calculation results
     */
  calculateMultipleRows(rows) {
    return rows.map((row, index) => {
      const result = this.calculateRow(row);
      result.rowNumber = index + 2; // Excel rows start at 2 (after header)
      return result;
    });
  }

  /**
     * Get summary totals for multiple rows
     * @param {Array} results - Array of calculation results
     * @returns {Object} Summary totals
     */
  getSummaryTotals(results) {
    const summary = {
      totalGenerators: results.length,
      grandTotal2026: 0,
      grandTotal2027: 0,
      grandTotal2028: 0,
      grandTotal3Year: 0,
      totalInspections: 0,
      totalMileage: 0
    };

    results.forEach(result => {
      summary.grandTotal2026 += result.projections.total2026;
      summary.grandTotal2027 += result.projections.total2027;
      summary.grandTotal2028 += result.projections.total2028;
      summary.grandTotal3Year += result.projections.total3Year;
      summary.totalInspections += result.input.inspections;
      summary.totalMileage += result.calculations.mileage;
    });

    return summary;
  }

  /**
     * Export results in Excel-compatible format
     * @param {Object} result - Calculation result
     * @returns {Object} Excel row format
     */
  toExcelFormat(result) {
    return {
      A: result.input.unitNumber,
      B: result.input.location,
      C: '', // Column2 - unused
      D: result.input.building,
      E: result.input.generator,
      F: result.input.genModel,
      G: result.input.engineMake,
      H: result.input.engineMode,
      I: result.input.voltage,
      J: result.input.kw,
      K: result.input.kwRange,
      L: result.components.filterCost,
      M: result.components.airFilterCost,
      N: result.components.airFilterMultiplier,
      O: result.components.coolantAdditive,
      P: result.components.fuelAnalysis,
      Q: result.components.loadbankEquipment,
      R: result.components.serviceAHours,
      S: result.components.serviceBHours,
      T: result.components.loadbankLabor,
      U: result.components.fuelPolishing,
      V: result.components.oilSample,
      W: result.input.inspections,
      X: result.input.milesFromHQ,
      Y: result.calculations.inspectionTotal,
      Z: result.calculations.labor,
      AA: result.calculations.freight,
      AB: result.calculations.partsMarkup,
      AC: result.calculations.travelTime,
      AD: result.calculations.mileage,
      AE: result.calculations.loadbankSubtotal,
      AF: result.totals.subTotal,
      AG: result.totals.totalWithTax,
      AH: result.totals.totalWithoutMobilization,
      AI: result.projections.total2026,
      AJ: result.projections.total2027,
      AK: result.projections.total2028,
      AL: result.projections.total3Year
    };
  }
}

export default MontereyCalculator;
