/**
 * @module LegacyAdapter
 * @description Backward compatibility adapter for existing code
 * Maps old EnergenCalculationEngine interface to new modular system
 */

import { EnergenCalculationEngine } from '../index.js';

/**
 * Legacy-compatible calculation engine
 * Drop-in replacement for complete-calculation-engine.cjs
 */
export class LegacyCalculationEngine {
    constructor() {
        // Initialize new engine with default providers
        this.engine = new EnergenCalculationEngine({
            enableCache: true,
            enableAudit: true,
            taxRateProvider: this._legacyTaxRateProvider.bind(this),
            config: {
                laborRates: {
                    standard: 191,
                    nonContract: 200,
                    overtime: 255.50,
                    doubleTime: 400,
                    government: 191
                },
                mileageRate: 2.50
            }
        });
        
        // Copy legacy constants for backward compatibility
        this.laborRate = 191;
        this.nonContractRate = 200;
        this.overtimeRate = 255.50;
        this.doubleTimeRate = 400;
        this.oilPrice = 16;
        this.coolantPrice = 15;
        this.mileageRate = 2.50;
        this.partsMarkup = 1.2;
        this.oilMarkup = 1.5;
        this.coolantMarkup = 1.5;
        this.freightMarkup = 1.05;
        
        // Service names for compatibility
        this.serviceNames = {
            'A': 'Comprehensive Inspection',
            'B': 'Oil & Filter Service',
            'C': 'Coolant Service',
            'D': 'Oil & Fuel Analysis',
            'E': 'Load Bank Testing',
            'F': 'Engine Tune-Up (Diesel)',
            'G': 'Gas Engine Tune-Up',
            'H': 'Generator Electrical Testing',
            'I': 'Transfer Switch Service',
            'J': 'Thermal Imaging Scan'
        };
        
        // Mobilization hours for compatibility
        this.mobilizationHours = {
            'A': 0.5,
            'B': 1.0,
            'C': 1.0,
            'D': 0.5,
            'E': 2.0,
            'F': 1.5,
            'G': 1.5,
            'H': 1.0,
            'I': 1.0,
            'J': 0.5
        };
    }
    
    /**
     * Legacy kW range method
     */
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
    
    /**
     * Legacy quarts to gallons conversion
     */
    quartsToGallons(quarts) {
        return quarts / 4;
    }
    
    /**
     * Legacy tax rate method (async)
     */
    async getTaxRate(address, city, zip) {
        const customerInfo = { address, city, zip };
        return this._legacyTaxRateProvider(customerInfo);
    }
    
    /**
     * Legacy service methods - delegate to new engine
     */
    getServiceA(kwRange) {
        const data = {
            '2-14': { labor: 1, travel: 1.5, parts: 0 },
            '15-30': { labor: 1, travel: 1.5, parts: 0 },
            '35-150': { labor: 2, travel: 1.5, parts: 0 },
            '155-250': { labor: 2, travel: 1.5, parts: 0 },
            '255-400': { labor: 2.5, travel: 1.5, parts: 0 },
            '405-500': { labor: 2.5, travel: 1.5, parts: 0 },
            '505-670': { labor: 3, travel: 1.5, parts: 0 },
            '675-1050': { labor: 3, travel: 1.5, parts: 0 },
            '1055-1500': { labor: 4, travel: 1.5, parts: 0 },
            '1500-2050': { labor: 4, travel: 1.5, parts: 0 }
        };
        return data[kwRange];
    }
    
    getServiceB(kwRange) {
        const data = {
            '2-14': { labor: 1, travel: 2, filterCost: 171.90, oilGallons: 0.375 },
            '15-30': { labor: 1, travel: 2, filterCost: 171.90, oilGallons: 0.75 },
            '35-150': { labor: 2, travel: 2, filterCost: 229.20, oilGallons: 1.25 },
            '155-250': { labor: 2, travel: 2, filterCost: 229.20, oilGallons: 2 },
            '255-400': { labor: 4, travel: 2, filterCost: 343.80, oilGallons: 3 },
            '405-500': { labor: 6, travel: 2, filterCost: 458.40, oilGallons: 4.5 },
            '505-670': { labor: 8, travel: 4, filterCost: 687.60, oilGallons: 7.5 },
            '675-1050': { labor: 12, travel: 4, filterCost: 916.80, oilGallons: 12.5 },
            '1055-1500': { labor: 16, travel: 4, filterCost: 1146.00, oilGallons: 25 },
            '1500-2050': { labor: 16, travel: 4, filterCost: 1146.00, oilGallons: 37.5 }
        };
        return data[kwRange];
    }
    
    getServiceC(kwRange) {
        const data = {
            '2-14': { labor: 2, travel: 2, coolantGallons: 2.25, hosesBelts: 150 },
            '15-30': { labor: 2, travel: 2, coolantGallons: 4.5, hosesBelts: 200 },
            '35-150': { labor: 2, travel: 2, coolantGallons: 7.5, hosesBelts: 250 },
            '155-250': { labor: 3, travel: 2, coolantGallons: 12, hosesBelts: 300 },
            '255-400': { labor: 3, travel: 2, coolantGallons: 18, hosesBelts: 450 },
            '405-500': { labor: 4, travel: 2, coolantGallons: 27, hosesBelts: 500 },
            '505-670': { labor: 4, travel: 2, coolantGallons: 45, hosesBelts: 600 },
            '675-1050': { labor: 6, travel: 2, coolantGallons: 75, hosesBelts: 650 },
            '1055-1500': { labor: 6, travel: 2, coolantGallons: 150, hosesBelts: 850 },
            '1500-2050': { labor: 8, travel: 2, coolantGallons: 225, hosesBelts: 1000 }
        };
        return data[kwRange];
    }
    
    getServiceD(kwRange) {
        if (kwRange === '2-14' || kwRange === '15-30' || kwRange === '35-150') {
            return { labor: 0.5, travel: 0, oilAnalysis: 125, fuelAnalysis: 95 };
        } else if (kwRange === '155-250' || kwRange === '255-400' || kwRange === '405-500') {
            return { labor: 0.5, travel: 0, oilAnalysis: 125, fuelAnalysis: 95, coolantAnalysis: 85 };
        } else {
            return { labor: 1, travel: 0, oilAnalysis: 125, fuelAnalysis: 95, coolantAnalysis: 85, comprehensiveAnalysis: 150 };
        }
    }
    
    getServiceE(kwRange) {
        const data = {
            '2-14': { labor: 3, travel: 2, loadBankRental: 350 },
            '15-30': { labor: 3, travel: 2, loadBankRental: 350 },
            '35-150': { labor: 3, travel: 2, loadBankRental: 350 },
            '155-250': { labor: 4, travel: 2, loadBankRental: 700 },
            '255-400': { labor: 6, travel: 2, loadBankRental: 700 },
            '405-500': { labor: 6, travel: 2, loadBankRental: 1000 },
            '505-670': { labor: 8, travel: 2, loadBankRental: 1500, transformerRental: 1500 },
            '675-1050': { labor: 8, travel: 2, loadBankRental: 1500, transformerRental: 1500 },
            '1055-1500': { labor: 8, travel: 2, loadBankRental: 2000, transformerRental: 1500 },
            '1500-2050': { labor: 12, travel: 2, loadBankRental: 2500, transformerRental: 1500 }
        };
        return data[kwRange];
    }
    
    getServiceF(cylinders, injectorType = 'pop') {
        const popNozzleData = {
            4: { labor: 2, travel: 2, parts: 250 },
            6: { labor: 3, travel: 2, parts: 350 },
            8: { labor: 4, travel: 2, parts: 450 },
            12: { labor: 4, travel: 2, parts: 550 },
            16: { labor: 6, travel: 4, parts: 750 }
        };
        
        const unitInjectorData = {
            4: { labor: 4, travel: 2, parts: 450 },
            6: { labor: 4, travel: 2, parts: 550 },
            8: { labor: 4, travel: 2, parts: 650 },
            12: { labor: 7, travel: 4, parts: 850 },
            16: { labor: 10, travel: 4, parts: 1050 }
        };
        
        const data = injectorType === 'unit' ? unitInjectorData : popNozzleData;
        return data[cylinders] || { labor: 4, travel: 2, parts: 500 };
    }
    
    getServiceG(cylinders) {
        const data = {
            4: { labor: 2, travel: 2, sparkPlugs: 4, sparkPlugCost: 25, ignitionKit: 150 },
            6: { labor: 3, travel: 2, sparkPlugs: 6, sparkPlugCost: 25, ignitionKit: 175 },
            8: { labor: 4, travel: 2, sparkPlugs: 8, sparkPlugCost: 25, ignitionKit: 200 },
            10: { labor: 5, travel: 2, sparkPlugs: 10, sparkPlugCost: 25, ignitionKit: 225 },
            12: { labor: 6, travel: 2, sparkPlugs: 12, sparkPlugCost: 25, ignitionKit: 275 },
            16: { labor: 8, travel: 4, sparkPlugs: 16, sparkPlugCost: 25, ignitionKit: 350 }
        };
        return data[cylinders] || { labor: 4, travel: 2, sparkPlugs: 8, sparkPlugCost: 25, ignitionKit: 200 };
    }
    
    getServiceH(kwRange) {
        const data = {
            '2-14': { labor: 2, travel: 2, testingEquipment: 250 },
            '15-30': { labor: 2, travel: 2, testingEquipment: 250 },
            '35-150': { labor: 3, travel: 2, testingEquipment: 350 },
            '155-250': { labor: 4, travel: 2, testingEquipment: 450 },
            '255-400': { labor: 4, travel: 2, testingEquipment: 450 },
            '405-500': { labor: 6, travel: 2, testingEquipment: 650 },
            '505-670': { labor: 6, travel: 2, testingEquipment: 650 },
            '675-1050': { labor: 8, travel: 4, testingEquipment: 850 },
            '1055-1500': { labor: 8, travel: 4, testingEquipment: 850 },
            '1500-2050': { labor: 8, travel: 4, testingEquipment: 850 }
        };
        return data[kwRange];
    }
    
    getServiceI(kwRange) {
        const data = {
            '2-14': { labor: 2, travel: 2, switchMaintenance: 150 },
            '15-30': { labor: 2, travel: 2, switchMaintenance: 150 },
            '35-150': { labor: 3, travel: 2, switchMaintenance: 200 },
            '155-250': { labor: 3, travel: 2, switchMaintenance: 200 },
            '255-400': { labor: 4, travel: 2, switchMaintenance: 250 },
            '405-500': { labor: 4, travel: 2, switchMaintenance: 250 },
            '505-670': { labor: 6, travel: 2, switchMaintenance: 350 },
            '675-1050': { labor: 6, travel: 2, switchMaintenance: 350 },
            '1055-1500': { labor: 8, travel: 2, switchMaintenance: 450 },
            '1500-2050': { labor: 8, travel: 2, switchMaintenance: 450 }
        };
        return data[kwRange];
    }
    
    getServiceJ(kw) {
        if (kw <= 150) {
            return { labor: 2, travel: 2, reportGeneration: 100 };
        } else if (kw <= 500) {
            return { labor: 3, travel: 2, reportGeneration: 150 };
        } else {
            return { labor: 4, travel: 2, reportGeneration: 200 };
        }
    }
    
    /**
     * Main calculation method - delegates to new engine
     */
    async calculate(payload) {
        // Use new engine with same interface
        return this.engine.calculate(payload);
    }
    
    /**
     * Get frequency multiplier - for compatibility
     */
    getFrequencyMultiplier(services, contractMonths) {
        const frequencies = {
            'A': 4,
            'B': 1,
            'C': 0.5,
            'D': 1,
            'E': 1,
            'F': 0.33,
            'G': 0.33,
            'H': 0.2,
            'I': 1,
            'J': 1
        };
        
        return contractMonths / 12;
    }
    
    /**
     * Legacy tax rate provider
     * @private
     */
    async _legacyTaxRateProvider(customerInfo) {
        // In production, this would call CDTFA API
        // For now, return California default
        return 0.1025;
    }
}

// Export for CommonJS compatibility
export default LegacyCalculationEngine;

// Named export for modern usage
export { LegacyCalculationEngine as EnergenCalculationEngine };