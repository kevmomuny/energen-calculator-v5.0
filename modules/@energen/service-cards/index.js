/**
 * Service Cards Module Index
 * Complete export of all service card components
 * @module @energen/service-cards
 * @version 4.5.0
 */

// Import all service cards
import { ServiceACard } from './ServiceACard.js';
import { ServiceBCard } from './ServiceBCard.js';
import { ServiceCCard } from './ServiceCCard.js';
import { ServiceDCard } from './ServiceDCard.js';
import { ServiceECard } from './ServiceECard.js';
import { CalculatorUI } from './CalculatorUI.js';

/**
 * Service card registry with metadata
 */
export const ServiceRegistry = {
  A: {
    card: ServiceACard,
    name: 'Comprehensive Inspection',
    defaultFrequency: 4,
    description: 'Quarterly comprehensive system inspection'
  },
  B: {
    card: ServiceBCard,
    name: 'Oil & Filter Service',
    defaultFrequency: 1,
    description: 'Annual oil change and filter replacement'
  },
  C: {
    card: ServiceCCard,
    name: 'Coolant Service',
    defaultFrequency: 1,
    description: 'Annual/Biannual coolant flush and hose/belt inspection'
  },
  D: {
    card: ServiceDCard,
    name: 'Fluid Analysis',
    defaultFrequency: 1,
    description: 'Annual oil, fuel, and coolant analysis'
  },
  E: {
    card: ServiceECard,
    name: 'Load Bank Testing',
    defaultFrequency: 1,
    description: 'Annual full load testing'
  }
};

/**
 * Create all service cards with consistent settings
 * @param {Object} settings - Settings from Settings Modal
 * @param {number} kWRange - Generator kW rating
 * @returns {Object} Object with all service card instances
 */
export function createAllServiceCards(settings, kWRange = 80) {
  return {
    A: new ServiceACard(settings, kWRange),
    B: new ServiceBCard(settings, kWRange),
    C: new ServiceCCard(settings, kWRange),
    D: new ServiceDCard(settings, kWRange),
    E: new ServiceECard(settings, kWRange)
  };
}

/**
 * Calculate bundle total from service cards
 * @param {Object} services - Object with service card instances
 * @param {Object} enabledStates - Object with boolean states for each service
 * @returns {Object} Bundle calculation with breakdown
 */
export function calculateBundleTotal(services, enabledStates = {}) {
  const defaultStates = {
    A: true,
    B: true,
    C: true,
    D: true,
    E: true
  };

  const states = { ...defaultStates, ...enabledStates };
  const breakdown = {};
  let total = 0;

  Object.entries(services).forEach(([code, service]) => {
    if (service && states[code]) {
      const calc = service.calculateService();
      breakdown[code] = {
        enabled: states[code],
        serviceName: calc.serviceName,
        frequency: calc.frequency,
        perVisit: calc.perVisit,
        annual: calc.annual,
        details: calc
      };
      total += calc.annual;
    }
  });

  return {
    total,
    breakdown,
    enabledCount: Object.values(states).filter(Boolean).length,
    totalServices: Object.keys(services).length
  };
}

/**
 * Load settings from localStorage or Settings Modal
 * @returns {Object} Settings object
 */
export function loadSettings() {
  try {
    // Check if localStorage is available (browser environment)
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('energenSettings');
      if (stored) {
        return JSON.parse(stored);
      }
    }

    // Try window.energenSettings (from Settings Modal)
    if (typeof window !== 'undefined' && window.energenSettings) {
      return window.energenSettings;
    }
  } catch (e) {
    console.warn('Could not load settings:', e);
  }

  // Return default settings with complete service configurations
  return {
    labor: {
      straightTime: 191,
      overtime: 255.50,
      doubleTime: 382
    },
    calculationMode: 'standard',
    partsMarkup: 1.2,
    freightPercent: 0.05,
    oilMarkup: 1.5,
    coolantMarkup: 1.5,
    // Service A configurations
    serviceA: {
      '2-14': { laborHours: 1, mobilizationHours: 2, parts: 252.00 },
      '15-30': { laborHours: 1, mobilizationHours: 2, parts: 385.20 },
      '35-150': { laborHours: 2, mobilizationHours: 2, parts: 802.20 },
      '155-250': { laborHours: 2, mobilizationHours: 2, parts: 965.40 },
      '255-400': { laborHours: 3, mobilizationHours: 2, parts: 1204.80 },
      '405-500': { laborHours: 3, mobilizationHours: 2, parts: 1400.40 },
      '505-670': { laborHours: 4, mobilizationHours: 2, parts: 1596.00 },
      '675-1050': { laborHours: 4, mobilizationHours: 2, parts: 1857.60 },
      '1055-1500': { laborHours: 6, mobilizationHours: 2, parts: 2250.00 },
      '1500-2050': { laborHours: 8, mobilizationHours: 2, parts: 2700.00 }
    },
    // Service B configurations
    serviceB: {
      '2-14': { laborHours: 1, mobilizationHours: 2, filterCost: 105.60, oilGallons: 2 },
      '15-30': { laborHours: 1, mobilizationHours: 2, filterCost: 151.20, oilGallons: 3 },
      '35-150': { laborHours: 2, mobilizationHours: 2, filterCost: 229.20, oilGallons: 5 },
      '155-250': { laborHours: 2, mobilizationHours: 2, filterCost: 338.40, oilGallons: 8 },
      '255-400': { laborHours: 3, mobilizationHours: 2, filterCost: 421.20, oilGallons: 12 },
      '405-500': { laborHours: 3, mobilizationHours: 2, filterCost: 487.20, oilGallons: 18 },
      '505-670': { laborHours: 4, mobilizationHours: 2, filterCost: 556.80, oilGallons: 30 },
      '675-1050': { laborHours: 4, mobilizationHours: 2, filterCost: 648.00, oilGallons: 50 },
      '1055-1500': { laborHours: 6, mobilizationHours: 2, filterCost: 900.00, oilGallons: 100 },
      '1500-2050': { laborHours: 8, mobilizationHours: 2, filterCost: 1200.00, oilGallons: 150 }
    },
    // Service C configurations
    serviceC: {
      '2-14': { laborHours: 2, mobilizationHours: 2, coolantGallons: 2.25, hosesBelts: 150 },
      '15-30': { laborHours: 2, mobilizationHours: 2, coolantGallons: 4.5, hosesBelts: 200 },
      '35-150': { laborHours: 2, mobilizationHours: 2, coolantGallons: 7.5, hosesBelts: 250 },
      '155-250': { laborHours: 3, mobilizationHours: 2, coolantGallons: 12, hosesBelts: 300 },
      '255-400': { laborHours: 3, mobilizationHours: 2, coolantGallons: 18, hosesBelts: 450 },
      '405-500': { laborHours: 4, mobilizationHours: 2, coolantGallons: 27, hosesBelts: 500 },
      '505-670': { laborHours: 4, mobilizationHours: 2, coolantGallons: 45, hosesBelts: 600 },
      '675-1050': { laborHours: 6, mobilizationHours: 2, coolantGallons: 75, hosesBelts: 650 },
      '1055-1500': { laborHours: 6, mobilizationHours: 2, coolantGallons: 150, hosesBelts: 850 },
      '1500-2050': { laborHours: 8, mobilizationHours: 2, coolantGallons: 225, hosesBelts: 1000 }
    },
    // Service D configurations (same for all kW ranges)
    serviceD: {
      laborHours: 0.5,
      mobilizationHours: 1,
      oilSample: 16.55,
      fuelSample: 60.00,
      coolantSample: 16.55
    },
    // Service E configurations
    serviceE: {
      '2-14': { laborHours: 3, mobilizationHours: 2, equipmentRental: 100 },
      '15-30': { laborHours: 3, mobilizationHours: 2, equipmentRental: 150 },
      '35-150': { laborHours: 3, mobilizationHours: 2, equipmentRental: 350 },
      '155-250': { laborHours: 4, mobilizationHours: 2, equipmentRental: 450 },
      '255-400': { laborHours: 4, mobilizationHours: 2, equipmentRental: 550 },
      '405-500': { laborHours: 5, mobilizationHours: 2, equipmentRental: 650 },
      '505-670': { laborHours: 5, mobilizationHours: 2, equipmentRental: 750 },
      '675-1050': { laborHours: 6, mobilizationHours: 2, equipmentRental: 950 },
      '1055-1500': { laborHours: 8, mobilizationHours: 2, equipmentRental: 1250 },
      '1500-2050': { laborHours: 10, mobilizationHours: 2, equipmentRental: 1500 }
    }
  };
}

/**
 * Update all service cards with new settings
 * @param {Object} services - Object with service card instances
 * @param {Object} newSettings - New settings to apply
 */
export function updateAllSettings(services, newSettings) {
  Object.values(services).forEach(service => {
    if (service && service.updateSettings) {
      service.updateSettings(newSettings);
    }
  });
}

/**
 * Update all service cards with new kW rating
 * @param {Object} services - Object with service card instances
 * @param {number} newKW - New kW rating
 */
export function updateAllKW(services, newKW) {
  Object.values(services).forEach(service => {
    if (service && service.updateKW) {
      service.updateKW(newKW);
    }
  });
}

// Export individual cards
export {
  ServiceACard,
  ServiceBCard,
  ServiceCCard,
  ServiceDCard,
  ServiceECard,
  CalculatorUI
};

// Export for browser global access
if (typeof window !== 'undefined') {
  window.ServiceCards = {
    ServiceACard,
    ServiceBCard,
    ServiceCCard,
    ServiceDCard,
    ServiceECard,
    CalculatorUI,
    ServiceRegistry,
    createAllServiceCards,
    calculateBundleTotal,
    loadSettings,
    updateAllSettings,
    updateAllKW
  };
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ServiceACard,
    ServiceBCard,
    ServiceCCard,
    ServiceDCard,
    ServiceECard,
    CalculatorUI,
    ServiceRegistry,
    createAllServiceCards,
    calculateBundleTotal,
    loadSettings,
    updateAllSettings,
    updateAllKW
  };
}
