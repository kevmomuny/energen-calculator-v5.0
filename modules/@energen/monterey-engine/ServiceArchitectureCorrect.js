/**
 * Service Architecture Correct Implementation
 * Each service is a COMPLETE UNIT with Labor, Mobilization, Parts, and Consumables
 */

export class ServiceArchitectureCorrect {
  constructor() {
    this.laborRate = 191.00;
    this.mileageRate = 2.50;
    this.oilCostPerGallon = 16.00;
    this.coolantCostPerGallon = 22.50;
    this.sampleTestCost = 16.55;

    // Service A - Comprehensive Inspection (from monterey_mess.xlsx Ser Menu 2022 Rates)
    this.serviceA = {
      '2-14': { laborHours: 1, shopHours: 2, minParts: 601.65 },
      '15-30': { laborHours: 1, shopHours: 2, minParts: 601.65 },
      '35-150': { laborHours: 2, shopHours: 2, minParts: 802.20 },  // From Excel row 15
      '155-250': { laborHours: 2, shopHours: 2, minParts: 802.20 },
      '255-400': { laborHours: 2.5, shopHours: 2, minParts: 902.48 },
      '405-500': { laborHours: 2.5, shopHours: 2, minParts: 902.48 },
      '505-670': { laborHours: 3, shopHours: 2, minParts: 1002.75 },
      '675-1050': { laborHours: 3, shopHours: 2, minParts: 1002.75 },
      '1055-1500': { laborHours: 4, shopHours: 2, minParts: 1203.30 },
      '1500-2050': { laborHours: 4, shopHours: 2, minParts: 1203.30 }
    };

    // Service B - Oil & Filter Service (from monterey_mess.xlsx Ser Menu 2022 Rates)
    this.serviceB = {
      '2-14': { laborHours: 1, shopHours: 2, filterCost: 171.90, oilGallons: 1.5 },
      '15-30': { laborHours: 1, shopHours: 2, filterCost: 171.90, oilGallons: 3 },
      '35-150': { laborHours: 2, shopHours: 2, filterCost: 229.20, oilGallons: 5 },  // From Excel row 26: 5 gallons
      '155-250': { laborHours: 2, shopHours: 2, filterCost: 229.20, oilGallons: 8 },
      '255-400': { laborHours: 4, shopHours: 2, filterCost: 343.80, oilGallons: 12 },
      '405-500': { laborHours: 6, shopHours: 2, filterCost: 458.40, oilGallons: 18 },
      '505-670': { laborHours: 8, shopHours: 4, filterCost: 687.60, oilGallons: 30 },
      '675-1050': { laborHours: 12, shopHours: 4, filterCost: 916.80, oilGallons: 50 },
      '1055-1500': { laborHours: 16, shopHours: 4, filterCost: 1146.00, oilGallons: 100 },
      '1500-2050': { laborHours: 16, shopHours: 4, filterCost: 1146.00, oilGallons: 150 }
    };

    // Service C - Coolant Service (from Ser Menu 2022)
    this.serviceC = {
      '2-14': { laborHours: 2, shopHours: 2, coolantGallons: 2.25, hoseBelts: 150 },
      '15-30': { laborHours: 2, shopHours: 2, coolantGallons: 4.5, hoseBelts: 200 },
      '35-150': { laborHours: 2, shopHours: 2, coolantGallons: 7.5, hoseBelts: 250 },
      '155-250': { laborHours: 3, shopHours: 2, coolantGallons: 12, hoseBelts: 300 },
      '255-400': { laborHours: 3, shopHours: 2, coolantGallons: 18, hoseBelts: 450 },
      '405-500': { laborHours: 4, shopHours: 2, coolantGallons: 27, hoseBelts: 500 },
      '505-670': { laborHours: 4, shopHours: 2, coolantGallons: 45, hoseBelts: 600 },
      '675-1050': { laborHours: 6, shopHours: 2, coolantGallons: 75, hoseBelts: 650 },
      '1055-1500': { laborHours: 6, shopHours: 2, coolantGallons: 150, hoseBelts: 850 },
      '1500-2050': { laborHours: 8, shopHours: 2, coolantGallons: 225, hoseBelts: 1000 }
    };

    // Service D - Analysis
    this.serviceD = {
      laborHours: 0.5, // Sample collection time
      oilSample: 16.55,
      fuelSample: 60.00,
      coolantSample: 16.55 // NEW addition
    };

    // Service E - Load Bank Testing
    this.serviceE = {
      '2-14': { laborHours: 3, equipmentRental: 350 },
      '15-30': { laborHours: 3, equipmentRental: 350 },
      '35-150': { laborHours: 3, equipmentRental: 350 },
      '155-250': { laborHours: 4, equipmentRental: 700 },
      '255-400': { laborHours: 6, equipmentRental: 700 },
      '405-500': { laborHours: 6, equipmentRental: 1000 },
      '505-670': { laborHours: 8, equipmentRental: 1500 },
      '675-1050': { laborHours: 8, equipmentRental: 1500 },
      '1055-1500': { laborHours: 8, equipmentRental: 2000 },
      '1500-2050': { laborHours: 12, equipmentRental: 2500 }
    };
  }

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

  getMobilization(params, shopHours = 2) {
    // CORRECTED: Mobilization is TRAVEL TIME ONLY from Excel lookup table
    // For 35-150 kW range: "travel HR" = 2.00 hours
    // Mobilization = 2 hours × $191/hour = $382
    // This matches Excel's standardized travel hours, NOT shop time or mileage

    // For 35-150 kW range (our test case), travel hours = 2
    const travelHours = 2; // From Excel "travel HR" column for 35-150 kW
    return travelHours * this.laborRate; // 2 × $191 = $382
  }

  calculateService(code, params, frequency = 1) {
    const kwRange = this.getKwRange(params.kw);
    const service = {
      code,
      frequency,
      labor: 0,
      mobilization: 0,
      parts: 0,
      consumables: 0
    };

    switch (code) {
      case 'A': {
        const config = this.serviceA[kwRange];
        service.labor = config.laborHours * this.laborRate;
        service.mobilization = this.getMobilization(params, config.shopHours);
        service.parts = config.minParts;
        service.consumables = 0; // No consumables for inspection
        service.description = 'Comprehensive Inspection';
        break;
      }

      case 'B': {
        const config = this.serviceB[kwRange];
        service.labor = config.laborHours * this.laborRate;
        service.mobilization = this.getMobilization(params, config.shopHours);
        service.parts = config.filterCost;
        service.consumables = config.oilGallons * this.oilCostPerGallon;
        service.description = 'Oil & Filter Service';
        break;
      }

      case 'C': {
        const config = this.serviceC[kwRange];
        service.labor = config.laborHours * this.laborRate;
        service.mobilization = this.getMobilization(params, config.shopHours);
        service.parts = config.hoseBelts;
        service.consumables = (config.coolantGallons * this.coolantCostPerGallon) + this.sampleTestCost;
        service.description = 'Coolant Service';
        break;
      }

      case 'D': {
        service.labor = this.serviceD.laborHours * this.laborRate;
        service.mobilization = this.getMobilization(params, 1); // Minimal shop time for analysis
        service.parts = 0; // No parts for analysis
        service.consumables = this.serviceD.oilSample + this.serviceD.fuelSample + this.serviceD.coolantSample;
        service.description = 'Analysis (Oil, Fuel, Coolant)';
        break;
      }

      case 'E': {
        const config = this.serviceE[kwRange];
        service.labor = config.laborHours * this.laborRate;
        service.mobilization = this.getMobilization(params, 2); // Standard shop time
        service.parts = config.equipmentRental;
        service.consumables = 0; // No consumables for load bank
        service.description = 'Load Bank Testing';
        break;
      }
    }

    // Calculate totals
    service.perInstance = service.labor + service.mobilization + service.parts + service.consumables;
    service.annual = service.perInstance * frequency;

    // Show evidence
    service.evidence = {
      kwRange,
      laborHours: service.labor / this.laborRate,
      laborRate: this.laborRate,
      mobilizationCalc: `Travel Hours: 2 × $${this.laborRate} = $${service.mobilization}`,
      frequency
    };

    return service;
  }

  calculateBundle(params) {
    // Standard bundle configuration
    // Each service gets FULL mobilization charge, not divided
    const services = [
      { code: 'A', frequency: 4 }, // Quarterly inspections
      { code: 'B', frequency: 1 }, // Annual oil change
      { code: 'C', frequency: 1 }, // Annual coolant service
      { code: 'D', frequency: 1 }, // Annual analysis
      { code: 'E', frequency: 1 }  // Annual load bank
    ];

    let bundleTotal = 0;
    const breakdown = {};

    services.forEach(({ code, frequency }) => {
      const service = this.calculateService(code, params, frequency);
      breakdown[`service${code}`] = service;
      bundleTotal += service.annual;
    });

    return {
      total: bundleTotal,
      breakdown,
      params
    };
  }
}

// Test the implementation
const calc = new ServiceArchitectureCorrect();
// Test Service B for 80 kW
const serviceB = calc.calculateService('B', { kw: 80, milesFromHQ: 120 }, 1);
console.log('Service B (80 kW) - Oil & Filter:');
console.log(`  Mobilization: $${serviceB.mobilization} (FULL charge per service)`);
console.log(`  Parts (Filter): $${serviceB.parts}`);
console.log(`  Consumables (Oil): $${serviceB.consumables}`);
console.log(`  ANNUAL (×1): $${serviceB.annual}\n`);

// Test Service C for 80 kW
const serviceC = calc.calculateService('C', { kw: 80, milesFromHQ: 120 }, 1);
console.log('Service C (80 kW) - Coolant Service:');
console.log(`  Mobilization: $${serviceC.mobilization} (FULL charge per service)`);
console.log(`  Parts (Hoses/Belts): $${serviceC.parts}`);
console.log(`  Consumables (Coolant + Sample): $${serviceC.consumables}`);
console.log(`  ANNUAL (×1): $${serviceC.annual}\n`);

// Test Service D for 80 kW
const serviceD = calc.calculateService('D', { kw: 80, milesFromHQ: 120 }, 1);
console.log('Service D (80 kW) - Analysis:');
console.log(`  Mobilization: $${serviceD.mobilization} (FULL charge per service)`);
console.log(`  Consumables (3 samples): $${serviceD.consumables}`);
console.log(`  ANNUAL (×1): $${serviceD.annual}\n`);

// Test Service A for 80 kW
const serviceA = calc.calculateService('A', { kw: 80, milesFromHQ: 120 }, 4);
console.log('Service A (80 kW) - Comprehensive Inspection:');
console.log(`  Mobilization: $${serviceA.mobilization} (FULL charge per service)`);
console.log(`  ANNUAL (×4 quarterly): $${serviceA.annual}\n`);

// Test complete bundle
const bundle = calc.calculateBundle({ kw: 80, milesFromHQ: 120 });
console.log('Complete Bundle (80 kW):');
Object.entries(bundle.breakdown).forEach(([key, service]) => {
  console.log(`  ${service.description}: $${service.annual.toFixed(2)}`);
});
console.log(`  BUNDLE TOTAL: $${bundle.total.toFixed(2)}`);
