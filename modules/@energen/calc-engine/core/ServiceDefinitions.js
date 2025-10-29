/**
 * @module ServiceDefinitions
 * @description Complete service definitions matching Excel exactly
 * Source: complete-calculation-engine.cjs (Aug 21, 2024)
 */

export class ServiceDefinitions {
  constructor(settings = {}) {
    this.version = '5.0.0';

    // PHASE 4 FIX: Store settings for dynamic cost calculation
    this.settings = settings;

    // Service names - exact from production
    this.serviceNames = {
      'A': 'Comprehensive Inspection',
      'B': 'Oil & Filter Service',
      'C': 'Coolant Service',
      'D': 'Oil, Fuel & Coolant Analysis',
      'E': 'Load Bank Testing',
      'F': 'Engine Tune-Up (Diesel)',
      'G': 'Gas Engine Tune-Up',
      'H': 'Generator Electrical Testing',
      'I': 'Transfer Switch Service',
      'J': 'Thermal Imaging Scan'
    };

    // Initialize all service data
    this._initializeServiceData();
  }

  /**
     * Get service name
     */
  getName(serviceCode) {
    return `${serviceCode} - ${this.serviceNames[serviceCode]}`;
  }

  /**
     * Get service definition based on code and generator specs
     */
  getDefinition(serviceCode, kwRange, generator) {
    switch (serviceCode) {
      case 'A':
        return this._getServiceA(kwRange);
      case 'B':
        return this._getServiceB(kwRange);
      case 'C':
        return this._getServiceC(kwRange);
      case 'D':
        return this._getServiceD(kwRange);
      case 'E':
        return this._getServiceE(kwRange);
      case 'F':
        return this._getServiceF(generator.cylinders || 6, generator.injectorType || 'pop');
      case 'G':
        return this._getServiceG(generator.cylinders || 8);
      case 'H':
        return this._getServiceH(kwRange);
      case 'I':
        return this._getServiceI(kwRange);
      case 'J':
        return this._getServiceJ(generator.kw);
      default:
        throw new Error(`Unknown service code: ${serviceCode}`);
    }
  }

  /**
     * Initialize all service data structures
     * @private
     */
  _initializeServiceData() {
    // Service A - Comprehensive Inspection (Quarterly)
    // Updated with correct parts pricing - inspection has minimal parts cost
    this.serviceA = {
      '2-14': { laborHours: 1, parts: 25, mobilization: 2 },
      '15-30': { laborHours: 1, parts: 25, mobilization: 2 },
      '35-150': { laborHours: 2, parts: 35, mobilization: 2 },
      '155-250': { laborHours: 2, parts: 35, mobilization: 2 },
      '255-400': { laborHours: 2.5, parts: 45, mobilization: 2 },
      '405-500': { laborHours: 2.5, parts: 45, mobilization: 2 },
      '505-670': { laborHours: 3, parts: 55, mobilization: 2 },
      '675-1050': { laborHours: 3, parts: 55, mobilization: 2 },
      '1055-1500': { laborHours: 4, parts: 65, mobilization: 2 },
      '1500-2050': { laborHours: 4, parts: 65, mobilization: 2 }
    };

    // Service B - Oil & Filter Service (Annual)
    // Data from Monterey Excel - Oil quantities in GALLONS
    this.serviceB = {
      '2-14': { laborHours: 1, filterCost: 171.90, oilGallons: 1.5, mobilization: 2 },
      '15-30': { laborHours: 1, filterCost: 171.90, oilGallons: 3, mobilization: 2 },
      '35-150': { laborHours: 2, filterCost: 229.20, oilGallons: 5, mobilization: 2 },
      '155-250': { laborHours: 2, filterCost: 229.20, oilGallons: 8, mobilization: 2 },
      '255-400': { laborHours: 4, filterCost: 343.80, oilGallons: 12, mobilization: 2 },
      '405-500': { laborHours: 6, filterCost: 458.40, oilGallons: 18, mobilization: 2 },
      '505-670': { laborHours: 8, filterCost: 687.60, oilGallons: 30, mobilization: 4 },
      '675-1050': { laborHours: 12, filterCost: 916.80, oilGallons: 50, mobilization: 4 },
      '1055-1500': { laborHours: 16, filterCost: 1146.00, oilGallons: 100, mobilization: 4 },
      '1500-2050': { laborHours: 16, filterCost: 1146.00, oilGallons: 150, mobilization: 4 }
    };

    // Service C - Coolant Service (Annual/Biannual)
    // Coolant in GALLONS
    this.serviceC = {
      '2-14': { laborHours: 2, coolantGallons: 2.25, hosesBelts: 150, mobilization: 2 },
      '15-30': { laborHours: 2, coolantGallons: 4.5, hosesBelts: 200, mobilization: 2 },
      '35-150': { laborHours: 2, coolantGallons: 7.5, hosesBelts: 250, mobilization: 2 },
      '155-250': { laborHours: 3, coolantGallons: 12, hosesBelts: 300, mobilization: 2 },
      '255-400': { laborHours: 3, coolantGallons: 18, hosesBelts: 450, mobilization: 2 },
      '405-500': { laborHours: 4, coolantGallons: 27, hosesBelts: 500, mobilization: 2 },
      '505-670': { laborHours: 4, coolantGallons: 45, hosesBelts: 600, mobilization: 2 },
      '675-1050': { laborHours: 6, coolantGallons: 75, hosesBelts: 650, mobilization: 2 },
      '1055-1500': { laborHours: 6, coolantGallons: 150, hosesBelts: 850, mobilization: 2 },
      '1500-2050': { laborHours: 8, coolantGallons: 225, hosesBelts: 1000, mobilization: 2 }
    };

    // Service E - Load Bank Testing (Annual)
    this.serviceE = {
      '2-14': { laborHours: 3, loadBankRental: 350, mobilization: 2 },
      '15-30': { laborHours: 3, loadBankRental: 350, mobilization: 2 },
      '35-150': { laborHours: 3, loadBankRental: 350, mobilization: 2 },
      '155-250': { laborHours: 4, loadBankRental: 700, mobilization: 2 },
      '255-400': { laborHours: 6, loadBankRental: 700, mobilization: 2 },
      '405-500': { laborHours: 6, loadBankRental: 1000, mobilization: 2 },
      '505-670': { laborHours: 8, loadBankRental: 1500, transformerRental: 1500, mobilization: 2 },
      '675-1050': { laborHours: 8, loadBankRental: 1500, transformerRental: 1500, mobilization: 2 },
      '1055-1500': { laborHours: 8, loadBankRental: 2000, transformerRental: 1500, mobilization: 2 },
      '1500-2050': { laborHours: 12, loadBankRental: 2500, transformerRental: 1500, mobilization: 2 }
    };

    // Service H - Generator Electrical Testing (Every 5 years)
    this.serviceH = {
      '2-14': { laborHours: 2, testingEquipment: 250, mobilization: 2 },
      '15-30': { laborHours: 2, testingEquipment: 250, mobilization: 2 },
      '35-150': { laborHours: 3, testingEquipment: 350, mobilization: 2 },
      '155-250': { laborHours: 4, testingEquipment: 450, mobilization: 2 },
      '255-400': { laborHours: 4, testingEquipment: 450, mobilization: 2 },
      '405-500': { laborHours: 6, testingEquipment: 650, mobilization: 2 },
      '505-670': { laborHours: 6, testingEquipment: 650, mobilization: 2 },
      '675-1050': { laborHours: 8, testingEquipment: 850, mobilization: 4 },
      '1055-1500': { laborHours: 8, testingEquipment: 850, mobilization: 4 },
      '1500-2050': { laborHours: 8, testingEquipment: 850, mobilization: 4 }
    };

    // Service I - Transfer Switch Service (Annual)
    this.serviceI = {
      '2-14': { laborHours: 2, switchMaintenance: 150, mobilization: 2 },
      '15-30': { laborHours: 2, switchMaintenance: 150, mobilization: 2 },
      '35-150': { laborHours: 3, switchMaintenance: 200, mobilization: 2 },
      '155-250': { laborHours: 3, switchMaintenance: 200, mobilization: 2 },
      '255-400': { laborHours: 4, switchMaintenance: 250, mobilization: 2 },
      '405-500': { laborHours: 4, switchMaintenance: 250, mobilization: 2 },
      '505-670': { laborHours: 6, switchMaintenance: 350, mobilization: 2 },
      '675-1050': { laborHours: 6, switchMaintenance: 350, mobilization: 2 },
      '1055-1500': { laborHours: 8, switchMaintenance: 450, mobilization: 2 },
      '1500-2050': { laborHours: 8, switchMaintenance: 450, mobilization: 2 }
    };
  }

  /**
     * Service A - Comprehensive Inspection
     * @private
     */
  _getServiceA(kwRange) {
    return this.serviceA[kwRange] || this.serviceA['35-150'];
  }

  /**
     * Service B - Oil & Filter Service
     * @private
     */
  _getServiceB(kwRange) {
    return this.serviceB[kwRange] || this.serviceB['35-150'];
  }

  /**
     * Service C - Coolant Service
     * @private
     */
  _getServiceC(kwRange) {
    return this.serviceC[kwRange] || this.serviceC['35-150'];
  }

  /**
     * Service D - Oil & Fuel Analysis
     * @private
     */
  _getServiceD(kwRange) {
    // PHASE 4 FIX: Use settings for analysis costs if available
    const oilAnalysis = this.settings.oilAnalysisCost || 125;
    const fuelAnalysis = this.settings.fuelAnalysisCost || 95;
    const coolantAnalysis = this.settings.coolantAnalysisCost || 85;
    const comprehensiveAnalysis = this.settings.comprehensiveAnalysisCost || 150;

    // Simplified ranges for analysis
    if (['2-14', '15-30', '35-150'].includes(kwRange)) {
      return {
        laborHours: 0.5,
        oilAnalysis: oilAnalysis,
        fuelAnalysis: fuelAnalysis,
        parts: oilAnalysis + fuelAnalysis, // Combined for simplicity
        mobilization: 0.5
      };
    } else if (['155-250', '255-400', '405-500'].includes(kwRange)) {
      return {
        laborHours: 0.5,
        oilAnalysis: oilAnalysis,
        fuelAnalysis: fuelAnalysis,
        coolantAnalysis: coolantAnalysis,
        parts: oilAnalysis + fuelAnalysis + coolantAnalysis,
        mobilization: 0.5
      };
    } else {
      return {
        laborHours: 1,
        oilAnalysis: oilAnalysis,
        fuelAnalysis: fuelAnalysis,
        coolantAnalysis: coolantAnalysis,
        comprehensiveAnalysis: comprehensiveAnalysis,
        parts: oilAnalysis + fuelAnalysis + coolantAnalysis + comprehensiveAnalysis,
        mobilization: 0.5
      };
    }
  }

  /**
     * Service E - Load Bank Testing
     * FTB Special: $0 transformer, $1000 delivery, 1.5x labor for weekend
     * @private
     */
  _getServiceE(kwRange) {
    const data = this.serviceE[kwRange] || this.serviceE['35-150'];

    // FTB SPECIAL PRICING:
    // - Transformer rental: $0 (was $1500)
    // - Delivery: $1000 fixed
    // - Load bank rental: use standard pricing
    // - Labor: 1.5x for weekend overtime (applied in calculation engine)

    const parts = data.loadBankRental + 1000; // Load bank + $1000 delivery, NO transformer

    return {
      laborHours: data.laborHours,
      laborMultiplier: 1.5,  // Weekend overtime
      mobilization: data.mobilization,
      parts: parts,
      weekendOvertime: true  // Flag for weekend work
    };
  }

  /**
     * Service F - Engine Tune-Up (Diesel)
     * @private
     */
  _getServiceF(cylinders, injectorType = 'pop') {
    // Pop Nozzle configurations
    const popNozzleData = {
      4: { laborHours: 2, mobilization: 2, parts: 250 },
      6: { laborHours: 3, mobilization: 2, parts: 350 },
      8: { laborHours: 4, mobilization: 2, parts: 450 },
      12: { laborHours: 4, mobilization: 2, parts: 550 },
      16: { laborHours: 6, mobilization: 4, parts: 750 }
    };

    // Unit Injector configurations
    const unitInjectorData = {
      4: { laborHours: 4, mobilization: 2, parts: 450 },
      6: { laborHours: 4, mobilization: 2, parts: 550 },
      8: { laborHours: 4, mobilization: 2, parts: 650 },
      12: { laborHours: 7, mobilization: 4, parts: 850 },
      16: { laborHours: 10, mobilization: 4, parts: 1050 }
    };

    const data = injectorType === 'unit' ? unitInjectorData : popNozzleData;
    return data[cylinders] || { laborHours: 4, mobilization: 2, parts: 500 };
  }

  /**
     * Service G - Gas Engine Tune-Up
     * @private
     */
  _getServiceG(cylinders) {
    const data = {
      4: { laborHours: 2, mobilization: 2, sparkPlugs: 4, sparkPlugCost: 25, ignitionKit: 150 },
      6: { laborHours: 3, mobilization: 2, sparkPlugs: 6, sparkPlugCost: 25, ignitionKit: 175 },
      8: { laborHours: 4, mobilization: 2, sparkPlugs: 8, sparkPlugCost: 25, ignitionKit: 200 },
      10: { laborHours: 5, mobilization: 2, sparkPlugs: 10, sparkPlugCost: 25, ignitionKit: 225 },
      12: { laborHours: 6, mobilization: 2, sparkPlugs: 12, sparkPlugCost: 25, ignitionKit: 275 },
      16: { laborHours: 8, mobilization: 4, sparkPlugs: 16, sparkPlugCost: 25, ignitionKit: 350 }
    };

    const serviceData = data[cylinders] || data[8];

    // Calculate total parts cost
    const sparkPlugsCost = serviceData.sparkPlugs * serviceData.sparkPlugCost;
    const parts = sparkPlugsCost + serviceData.ignitionKit;

    return {
      laborHours: serviceData.laborHours,
      mobilization: serviceData.mobilization,
      parts: parts
    };
  }

  /**
     * Service H - Generator Electrical Testing
     * @private
     */
  _getServiceH(kwRange) {
    const data = this.serviceH[kwRange] || this.serviceH['35-150'];
    return {
      laborHours: data.laborHours,
      mobilization: data.mobilization,
      parts: data.testingEquipment
    };
  }

  /**
     * Service I - Transfer Switch Service
     * @private
     */
  _getServiceI(kwRange) {
    const data = this.serviceI[kwRange] || this.serviceI['35-150'];
    return {
      laborHours: data.laborHours,
      mobilization: data.mobilization,
      parts: data.switchMaintenance
    };
  }

  /**
     * Service J - Thermal Imaging Scan
     * @private
     */
  _getServiceJ(kw) {
    if (kw <= 150) {
      return { laborHours: 2, mobilization: 2, parts: 100 };
    } else if (kw <= 500) {
      return { laborHours: 3, mobilization: 2, parts: 150 };
    } else {
      return { laborHours: 4, mobilization: 2, parts: 200 };
    }
  }
}

// Dual module export pattern - supports both ES6 and CommonJS
// This is the best practice for modular Node.js packages
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS export for Node.js (server-secure.cjs can require() this)
  module.exports = ServiceDefinitions;
  module.exports.ServiceDefinitions = ServiceDefinitions;
  module.exports.default = ServiceDefinitions;
}

// ES6 export for modern JavaScript (browser, webpack, etc.)
export default ServiceDefinitions;
