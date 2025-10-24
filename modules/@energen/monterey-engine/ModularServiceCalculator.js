/**
 * Modular Service Calculator
 * Breaks down Excel's bundled calculations into individual service modules
 * Each service can be toggled independently with frequency multipliers
 */

import { XLookupEngine } from './core/XLookupEngine.js';
import { ExcelTables } from './core/ExcelTables.js';

export class ModularServiceCalculator {
    constructor(settings = {}) {
        this.xlookup = new XLookupEngine(settings);
        this.tables = new ExcelTables();
        this.laborRate = settings.laborRate || this.tables.laborRates.base; // Use settings or default $191
    }
    
    /**
     * Calculate individual service cost
     * @param {string} serviceCode - Service identifier (A-K)
     * @param {Object} params - Generator parameters
     * @param {number} frequency - Annual frequency (1, 2, 4, etc.)
     * @returns {Object} Service calculation breakdown
     */
    calculateService(serviceCode, params, frequency = 1) {
        const kwRange = this.xlookup.getKwRange(params.kw);
        params.kwRange = kwRange;
        
        switch(serviceCode) {
            case 'A':
                return this.calculateServiceA(params, frequency);
            case 'B':
                return this.calculateServiceB(params, frequency);
            case 'C':
                return this.calculateServiceC(params, frequency);
            case 'D':
                return this.calculateServiceD(params, frequency);
            case 'E':
                return this.calculateServiceE(params, frequency);
            case 'F':
                return this.calculateServiceF(params, frequency);
            case 'G':
                return this.calculateServiceG(params, frequency);
            case 'H':
                return this.calculateServiceH(params, frequency);
            case 'I':
                return this.calculateServiceI(params, frequency);
            case 'J':
                return this.calculateServiceJ(params, frequency);
            case 'K':
                return this.calculateServiceK(params, frequency);
            default:
                throw new Error(`Unknown service code: ${serviceCode}`);
        }
    }
    
    /**
     * Service A - Comprehensive Inspection
     * Excel: Column Y = W × R × $191
     */
    calculateServiceA(params, frequency = 4) {
        // Column R: Service A Hours from XLOOKUP
        const laborHours = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.serviceA.labor,
            0
        );
        
        // Column D: Shop Time Hours for travel calculation
        const shopHours = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.serviceA.shopTime,
            0
        );
        
        // Labor cost
        const laborCost = laborHours * this.laborRate * frequency;
        
        // Travel time (pro-rated per inspection)
        const travelCost = shopHours * this.laborRate * frequency;
        
        // Mileage (pro-rated per inspection)
        const mileageCost = params.milesFromHQ * this.tables.markupFactors.mileageRate * frequency;
        
        return {
            serviceCode: 'A',
            serviceName: 'Comprehensive Inspection',
            frequency: frequency,
            laborHours: laborHours,
            laborCost: laborCost,
            partsCost: 0, // No direct parts for Service A
            travelCost: travelCost,
            mileageCost: mileageCost,
            subtotal: laborCost + travelCost + mileageCost,
            breakdown: {
                laborHoursPerVisit: laborHours,
                laborCostPerVisit: laborHours * this.laborRate,
                annualVisits: frequency,
                travelPerVisit: shopHours * this.laborRate,
                mileagePerVisit: params.milesFromHQ * this.tables.markupFactors.mileageRate
            }
        };
    }
    
    /**
     * Service B - Oil & Filter Service
     * Excel: Column S (labor) + Column L (filter)
     */
    calculateServiceB(params, frequency = 1) {
        // Column S: Service B Hours
        const laborHours = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.serviceB.laborHours,
            0
        );
        
        // Column L: Filter Cost
        const filterCost = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.serviceB.filterCost,
            0
        );
        
        // Oil quantity and cost
        const oilGallons = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.serviceB.oilGallons,
            0
        );
        const oilCost = oilGallons * 16; // $16/gallon from Excel
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsCost = (filterCost + oilCost) * frequency;
        const partsWithMarkup = partsCost * this.tables.markupFactors.partsMarkup;
        
        return {
            serviceCode: 'B',
            serviceName: 'Oil & Filter Service',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsWithMarkup,
            travelCost: 0, // Travel included in Service A
            mileageCost: 0, // Mileage included in Service A
            subtotal: laborCost + partsWithMarkup,
            breakdown: {
                laborHoursPerService: laborHours,
                filterCost: filterCost,
                oilGallons: oilGallons,
                oilCost: oilCost,
                partsBeforeMarkup: filterCost + oilCost,
                markupFactor: this.tables.markupFactors.partsMarkup
            }
        };
    }
    
    /**
     * Service C - Coolant Service
     * Excel: Column O (coolant additive) + labor
     */
    calculateServiceC(params, frequency = 1) {
        // Coolant additive from Column O
        const coolantAdditive = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.parts.coolantAdditive,
            0
        );
        
        // Labor hours (estimated 1-2 hours based on kW)
        const laborHours = params.kw <= 150 ? 1 : 2;
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsCost = coolantAdditive * frequency;
        const partsWithMarkup = partsCost * this.tables.markupFactors.partsMarkup;
        
        return {
            serviceCode: 'C',
            serviceName: 'Coolant Service',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsWithMarkup,
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost + partsWithMarkup,
            breakdown: {
                laborHoursPerService: laborHours,
                coolantAdditiveCost: coolantAdditive,
                markupFactor: this.tables.markupFactors.partsMarkup
            }
        };
    }
    
    /**
     * Service D - Oil & Fuel Analysis
     * Custom fluid analysis based on user selection
     */
    calculateServiceD(params, frequency = 1) {
        // Get custom fluid selections or default to all
        const fluids = params.serviceDFluids || { oil: true, coolant: true, fuel: true };

        // Get prices from settings or use defaults
        const settings = params.settings || {};
        const oilAnalysisCost = settings.oilAnalysisCost || 16.55;
        const coolantAnalysisCost = settings.coolantAnalysisCost || 16.55;
        const fuelAnalysisCost = settings.fuelAnalysisCost || 60.00;

        // Calculate total based on selected fluids
        let totalCost = 0;
        const breakdown = {};

        if (fluids.oil) {
            totalCost += oilAnalysisCost;
            breakdown.oilAnalysisCost = oilAnalysisCost;
        }
        if (fluids.coolant) {
            totalCost += coolantAnalysisCost;
            breakdown.coolantAnalysisCost = coolantAnalysisCost;
        }
        if (fluids.fuel) {
            totalCost += fuelAnalysisCost;
            breakdown.fuelAnalysisCost = fuelAnalysisCost;
        }

        const partsCost = totalCost * frequency;
        const partsWithMarkup = partsCost * this.tables.markupFactors.partsMarkup;

        return {
            serviceCode: 'D',
            serviceName: 'Oil & Fuel Analysis',
            frequency: frequency,
            laborHours: 0, // No labor for fluid analysis
            laborCost: 0,
            partsCost: partsWithMarkup,
            travelCost: 0,
            mileageCost: 0,
            mobilizationHours: 0, // No mobilization for drop-off samples
            subtotal: partsWithMarkup,
            breakdown: {
                ...breakdown,
                totalBeforeMarkup: totalCost,
                markupFactor: this.tables.markupFactors.partsMarkup
            }
        };
    }
    
    /**
     * Service E - Load Bank Testing
     * Excel: Column AE = (T × $191) + Q
     */
    calculateServiceE(params, frequency = 1) {
        // Column T: Loadbank Labor Hours
        const laborHours = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.loadbank.laborHours,
            0
        );
        
        // Column Q: Loadbank Equipment
        const equipmentCost = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.loadbank.equipment,
            0
        );
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsCost = equipmentCost * frequency;
        
        return {
            serviceCode: 'E',
            serviceName: 'Load Bank Testing',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsCost, // Equipment rental, no markup
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost + partsCost,
            breakdown: {
                laborHoursPerTest: laborHours,
                laborRate: this.laborRate,
                equipmentRental: equipmentCost
            }
        };
    }
    
    /**
     * Service F - Diesel Engine Tune-Up
     * Cylinder and injector-based calculation
     */
    calculateServiceF(params, frequency = 0) {
        if (frequency === 0) return this.getZeroService('F', 'Diesel Engine Tune-Up');
        
        const cylinders = params.cylinders || 6;
        const injectorType = params.injectorType || 'Pop Noz';
        
        // Labor based on cylinders
        const laborHours = cylinders <= 6 ? 4 : cylinders <= 12 ? 6 : 8;
        
        // Parts based on injector type
        const partsBase = injectorType === 'Pop Noz' ? 800 : 1200;
        const partsCost = partsBase * (cylinders / 6);
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsWithMarkup = partsCost * this.tables.markupFactors.partsMarkup * frequency;
        
        return {
            serviceCode: 'F',
            serviceName: 'Diesel Engine Tune-Up',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsWithMarkup,
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost + partsWithMarkup,
            breakdown: {
                cylinders: cylinders,
                injectorType: injectorType,
                laborHoursPerService: laborHours,
                partsBeforeMarkup: partsCost
            }
        };
    }
    
    /**
     * Service G - Gas Engine Tune-Up
     * Cylinder-based calculation for natural gas engines
     */
    calculateServiceG(params, frequency = 0) {
        if (frequency === 0) return this.getZeroService('G', 'Gas Engine Tune-Up');
        
        const cylinders = params.cylinders || 8;
        
        // Labor based on cylinders
        const laborHours = cylinders <= 4 ? 2 : cylinders <= 8 ? 4 : 6;
        
        // Parts (spark plugs, ignition components)
        const partsCost = 100 * cylinders; // $100 per cylinder for plugs and components
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsWithMarkup = partsCost * this.tables.markupFactors.partsMarkup * frequency;
        
        return {
            serviceCode: 'G',
            serviceName: 'Gas Engine Tune-Up',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsWithMarkup,
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost + partsWithMarkup,
            breakdown: {
                cylinders: cylinders,
                laborHoursPerService: laborHours,
                partsPerCylinder: 100,
                partsBeforeMarkup: partsCost
            }
        };
    }
    
    /**
     * Service H - Generator Electrical Testing
     * 5-year interval service
     */
    calculateServiceH(params, frequency = 0.2) {
        // Convert 5-year to annual (1/5 = 0.2)
        const annualFrequency = frequency;
        
        // Labor based on kW
        const laborHours = params.kw <= 150 ? 2 : params.kw <= 500 ? 4 : 8;
        
        const laborCost = laborHours * this.laborRate * annualFrequency;
        
        return {
            serviceCode: 'H',
            serviceName: 'Generator Electrical Testing',
            frequency: annualFrequency,
            laborHours: laborHours * annualFrequency,
            laborCost: laborCost,
            partsCost: 0, // Testing only, no parts
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost,
            breakdown: {
                interval: '5 years',
                laborHoursPerTest: laborHours,
                annualizedFrequency: annualFrequency
            }
        };
    }
    
    /**
     * Service I - Transfer Switch Service
     */
    calculateServiceI(params, frequency = 1) {
        // Labor based on kW
        const laborHours = params.kw <= 150 ? 1 : params.kw <= 500 ? 2 : 4;
        
        // Minimal parts for cleaning/lubrication
        const partsCost = params.kw <= 150 ? 50 : params.kw <= 500 ? 100 : 200;
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsWithMarkup = partsCost * this.tables.markupFactors.partsMarkup * frequency;
        
        return {
            serviceCode: 'I',
            serviceName: 'Transfer Switch Service',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsWithMarkup,
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost + partsWithMarkup,
            breakdown: {
                laborHoursPerService: laborHours,
                partsBeforeMarkup: partsCost
            }
        };
    }
    
    /**
     * Service J - Thermal Imaging Scan
     */
    calculateServiceJ(params, frequency = 1) {
        // Flat rate service
        const laborHours = 1; // 1 hour regardless of kW
        
        const laborCost = laborHours * this.laborRate * frequency;
        
        return {
            serviceCode: 'J',
            serviceName: 'Thermal Imaging Scan',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: 0, // Equipment included in labor
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost,
            breakdown: {
                laborHoursPerScan: laborHours,
                equipment: 'Included in service'
            }
        };
    }
    
    /**
     * Service K - Battery Replacement
     */
    calculateServiceK(params, frequency = 0) {
        if (frequency === 0) return this.getZeroService('K', 'Battery Replacement');
        
        // Get battery cost from Service B table
        const batteryCost = this.xlookup.xlookup(
            params.kwRange,
            this.tables.kwRanges,
            this.tables.serviceB.batteryCost,
            100 // Default battery cost
        );
        
        // Labor from Service B battery labor
        const laborHours = params.kw <= 150 ? 2 : params.kw <= 500 ? 4 : 8;
        
        const laborCost = laborHours * this.laborRate * frequency;
        const partsWithMarkup = batteryCost * this.tables.markupFactors.partsMarkup * frequency;
        
        return {
            serviceCode: 'K',
            serviceName: 'Battery Replacement',
            frequency: frequency,
            laborHours: laborHours * frequency,
            laborCost: laborCost,
            partsCost: partsWithMarkup,
            travelCost: 0,
            mileageCost: 0,
            subtotal: laborCost + partsWithMarkup,
            breakdown: {
                laborHoursPerReplacement: laborHours,
                batteryCostBeforeMarkup: batteryCost,
                markupFactor: this.tables.markupFactors.partsMarkup
            }
        };
    }
    
    /**
     * Helper for services with 0 frequency
     */
    getZeroService(code, name) {
        return {
            serviceCode: code,
            serviceName: name,
            frequency: 0,
            laborHours: 0,
            laborCost: 0,
            partsCost: 0,
            travelCost: 0,
            mileageCost: 0,
            subtotal: 0,
            breakdown: {
                status: 'Not Included'
            }
        };
    }
    
    /**
     * Calculate total for selected services
     * @param {Object} params - Generator parameters
     * @param {Object} serviceSelections - { A: 4, B: 1, C: 0, ... }
     * @returns {Object} Combined calculation results
     */
    calculateCombinedServices(params, serviceSelections) {
        const results = {
            services: {},
            totals: {
                laborHours: 0,
                laborCost: 0,
                partsCost: 0,
                travelCost: 0,
                mileageCost: 0,
                freightCost: 0,
                subtotal: 0,
                total: 0
            },
            breakdown: []
        };
        
        // Calculate each selected service
        for (const [code, frequency] of Object.entries(serviceSelections)) {
            if (frequency > 0) {
                const serviceResult = this.calculateService(code, params, frequency);
                results.services[code] = serviceResult;
                results.breakdown.push(serviceResult);
                
                // Aggregate totals
                results.totals.laborHours += serviceResult.laborHours;
                results.totals.laborCost += serviceResult.laborCost;
                results.totals.partsCost += serviceResult.partsCost;
                results.totals.travelCost += serviceResult.travelCost;
                results.totals.mileageCost += serviceResult.mileageCost;
            }
        }
        
        // Calculate freight (5% of parts)
        results.totals.freightCost = results.totals.partsCost * this.tables.markupFactors.freightPercent;
        
        // Calculate grand total
        results.totals.subtotal = 
            results.totals.laborCost +
            results.totals.partsCost +
            results.totals.travelCost +
            results.totals.mileageCost +
            results.totals.freightCost;
        
        results.totals.total = Math.round(results.totals.subtotal * 100) / 100;
        
        // Add multi-year projections
        results.projections = this.calculateProjections(results.totals.total);
        
        return results;
    }
    
    /**
     * Calculate multi-year projections
     */
    calculateProjections(annualTotal) {
        const multiplier = this.tables.costFactors.yearlyMultiplier; // 1.05
        
        const year1 = Math.round(annualTotal);
        const year2 = Math.round(year1 * multiplier);
        const year3 = Math.round(year2 * multiplier);
        
        return {
            year1: year1,
            year2: year2,
            year3: year3,
            threeYearTotal: year1 + year2 + year3
        };
    }
    
    /**
     * Validate modular calculations against Excel bundle
     * @param {Object} modularResult - Result from calculateCombinedServices
     * @param {Object} excelResult - Result from MontereyCalculator
     * @returns {Object} Validation report
     */
    validateAgainstExcel(modularResult, excelResult) {
        const validation = {
            isValid: false,
            variance: 0,
            details: {}
        };
        
        // Compare totals
        const modularTotal = modularResult.totals.total;
        const excelTotal = excelResult.totals.totalWithTax;
        
        validation.variance = Math.abs(modularTotal - excelTotal);
        validation.isValid = validation.variance < 0.01; // Allow penny difference
        
        validation.details = {
            modularTotal: modularTotal,
            excelTotal: excelTotal,
            variance: validation.variance,
            percentDifference: (validation.variance / excelTotal * 100).toFixed(2) + '%'
        };
        
        return validation;
    }
}