/**
 * Excel-Exact Service Calculator
 * Replicates Excel's exact (messy) calculation logic for perfect parity
 * This includes Excel's quirks like double-counting loadbank equipment
 */

export class ExcelExactCalculator {
    constructor() {
        // Excel's exact constants from SSOT
        this.laborRate = 191.00;
        this.partsMarkup = 1.2;
        this.freightPercent = 0.05;
        this.mileageRate = 2.50;
        this.annualMultiplier = 1.05;
    }
    
    /**
     * Get kW range for exact Excel matching
     */
    getKwRange(kw) {
        if (kw >= 2 && kw <= 14) return '2-14';
        if (kw >= 15 && kw <= 30) return '15-30';
        if (kw >= 35 && kw <= 150) return '35-150';
        if (kw >= 155 && kw <= 250) return '155-250';
        if (kw >= 255 && kw <= 400) return '255-400';
        if (kw >= 405 && kw <= 500) return '405-500';
        if (kw >= 505 && kw <= 670) return '505-670';
        if (kw >= 675 && kw <= 1050) return '675-1050';
        if (kw >= 1055 && kw <= 1500) return '1055-1500';
        if (kw >= 1501 && kw <= 2050) return '1500-2050';
        return kw < 2 ? '2-14' : '1500-2050';
    }
    
    /**
     * Calculate exactly as Excel does (including all quirks)
     */
    calculateExcelExact(params) {
        const kwRange = this.getKwRange(params.kw);
        const inspections = params.inspections || 4;
        const miles = params.milesFromHQ || 0;
        
        // Get all component values based on kW range
        const components = this.getExcelComponents(kwRange);
        
        // EXCEL COLUMN CALCULATIONS (exact formulas)
        
        // Column L: Filter Cost
        const L = components.filterCost;
        
        // Column M: Air Filter Cost (manual $100)
        const M = 100.00;
        
        // Column N: Multiplier air filter = M × 0.5
        const N = M * 0.5;
        
        // Column O: Coolant additive (varies by kW)
        const O = components.coolantAdditive;
        
        // Column P: Fuel analysis (fixed $60)
        const P = 60.00;
        
        // Column Q: Loadbank Equipment
        const Q = components.loadbankEquipment;
        
        // Column R: Service A Hours
        const R = components.serviceAHours;
        
        // Column S: Service B Hours
        const S = components.serviceBHours;
        
        // Column T: Loadbank Labor Hours
        const T = components.loadbankLabor;
        
        // Column U: Fuel polishing (always 0 in Excel)
        const U = 0.00;
        
        // Column V: Oil sample (fixed $16.55)
        const V = 16.55;
        
        // Column W: Number of Inspections
        const W = inspections;
        
        // Column X: Miles from HQ
        const X = miles;
        
        // CALCULATED COLUMNS
        
        // Column Y: Inspection Total = W × R × $191
        const Y = W * R * this.laborRate;
        
        // Column Z: Labor = (S + T) × $191
        const Z = (S + T) * this.laborRate;
        
        // Column AB: Parts Plus Markup = ROUND(L+M+N+O+P+Q+V,0) × 1.2
        // NOTE: Excel includes Q (loadbank equipment) in parts markup!
        const partsSum = L + M + N + O + P + Q + V;
        const AB = Math.round(partsSum) * this.partsMarkup;
        
        // Column AA: Freight = AB × 0.05
        const AA = AB * this.freightPercent;
        
        // Column AC: Travel Time = Shop hours × $191 × W
        const shopHours = components.shopHours;
        const AC = shopHours * this.laborRate * W;
        
        // Column AD: Mileage = X × $2.50 × W
        const AD = X * this.mileageRate * W;
        
        // Column AE: Loadbank subtotal = (T × $191) + Q
        const AE = (T * this.laborRate) + Q;
        
        // Column AF: Sub-Total = SUM(Y:AE)
        // Note: This sums Y, Z, AA, AB, AC, AD, AE
        const AF = Y + Z + AA + AB + AC + AD + AE;
        
        // Column AG: TOTAL W/TAX = ROUND(AF, 2)
        const AG = Math.round(AF * 100) / 100;
        
        // Column AH: Total Without Mobilization = AG - (AD + AE)
        const AH = AG - (AD + AE);
        
        // Multi-year projections
        // Column AI: Rounded Total 2026 = ROUND(AG, 0)
        const AI = Math.round(AG);
        
        // Column AJ: Rounded Total 2027 = ROUND(AI × 1.05, 0)
        const AJ = Math.round(AI * this.annualMultiplier);
        
        // Column AK: Rounded Total 2028 = ROUND(AJ × 1.05, 0)
        const AK = Math.round(AJ * this.annualMultiplier);
        
        // Column AL: 3-Year Total = AI + AJ + AK
        const AL = AI + AJ + AK;
        
        return {
            // Input parameters
            params: {
                kw: params.kw,
                kwRange: kwRange,
                inspections: W,
                milesFromHQ: X
            },
            // Component columns (L-V)
            components: {
                L_filterCost: L,
                M_airFilter: M,
                N_airFilterMult: N,
                O_coolantAdditive: O,
                P_fuelAnalysis: P,
                Q_loadbankEquipment: Q,
                R_serviceAHours: R,
                S_serviceBHours: S,
                T_loadbankLabor: T,
                U_fuelPolishing: U,
                V_oilSample: V
            },
            // Calculated columns (Y-AE)
            calculations: {
                Y_inspectionTotal: Y,
                Z_labor: Z,
                AA_freight: AA,
                AB_partsMarkup: AB,
                AC_travelTime: AC,
                AD_mileage: AD,
                AE_loadbankSubtotal: AE
            },
            // Totals (AF-AH)
            totals: {
                AF_subTotal: AF,
                AG_totalWithTax: AG,
                AH_totalWithoutMobilization: AH
            },
            // Projections (AI-AL)
            projections: {
                AI_year1: AI,
                AJ_year2: AJ,
                AK_year3: AK,
                AL_threeYearTotal: AL
            }
        };
    }
    
    /**
     * Get Excel component values for kW range
     */
    getExcelComponents(kwRange) {
        // Exact values from Excel SSOT
        const data = {
            '2-14': {
                filterCost: 171.90,
                coolantAdditive: 15.00,
                loadbankEquipment: 350,
                serviceAHours: 1,
                serviceBHours: 1,
                loadbankLabor: 3,
                shopHours: 2
            },
            '15-30': {
                filterCost: 171.90,
                coolantAdditive: 15.00,
                loadbankEquipment: 350,
                serviceAHours: 1,
                serviceBHours: 1,
                loadbankLabor: 3,
                shopHours: 2
            },
            '35-150': {
                filterCost: 229.20,
                coolantAdditive: 18.75,
                loadbankEquipment: 350,
                serviceAHours: 2,
                serviceBHours: 2,
                loadbankLabor: 3,
                shopHours: 2
            },
            '155-250': {
                filterCost: 229.20,
                coolantAdditive: 30.00,
                loadbankEquipment: 700,
                serviceAHours: 2,
                serviceBHours: 2,
                loadbankLabor: 4,
                shopHours: 2
            },
            '255-400': {
                filterCost: 343.80,
                coolantAdditive: 45.00,
                loadbankEquipment: 700,
                serviceAHours: 2.5,
                serviceBHours: 4,
                loadbankLabor: 6,
                shopHours: 2
            },
            '405-500': {
                filterCost: 458.40,
                coolantAdditive: 67.50,
                loadbankEquipment: 1000,
                serviceAHours: 2.5,
                serviceBHours: 6,
                loadbankLabor: 6,
                shopHours: 2
            },
            '505-670': {
                filterCost: 687.60,
                coolantAdditive: 112.50,
                loadbankEquipment: 1500,
                serviceAHours: 3,
                serviceBHours: 8,
                loadbankLabor: 8,
                shopHours: 2
            },
            '675-1050': {
                filterCost: 916.80,
                coolantAdditive: 187.50,
                loadbankEquipment: 1500,
                serviceAHours: 3,
                serviceBHours: 12,
                loadbankLabor: 8,
                shopHours: 2
            },
            '1055-1500': {
                filterCost: 1146.00,
                coolantAdditive: 375.00,
                loadbankEquipment: 2000,
                serviceAHours: 4,
                serviceBHours: 16,
                loadbankLabor: 8,
                shopHours: 2
            },
            '1500-2050': {
                filterCost: 1146.00,
                coolantAdditive: 562.50,
                loadbankEquipment: 2500,
                serviceAHours: 4,
                serviceBHours: 16,
                loadbankLabor: 12,
                shopHours: 2
            }
        };
        
        return data[kwRange] || data['35-150'];
    }
    
    /**
     * Break down Excel calculation into modular services
     * This shows how Excel's bundled calc maps to individual services
     */
    extractModularServices(excelResult) {
        const { components, calculations } = excelResult;
        
        return {
            serviceA: {
                name: 'Comprehensive Inspection',
                frequency: excelResult.params.inspections,
                laborCost: calculations.Y_inspectionTotal + calculations.AC_travelTime, // Combine field labor + travel
                travelCost: 0, // Travel is already included in laborCost
                mileageCost: calculations.AD_mileage,
                total: calculations.Y_inspectionTotal + calculations.AC_travelTime + calculations.AD_mileage
            },
            serviceB: {
                name: 'Oil & Filter Service',
                frequency: 1,
                laborCost: components.S_serviceBHours * this.laborRate,
                filterCost: components.L_filterCost,
                // Note: Filter cost is included in central Parts Markup, not here
                total: components.S_serviceBHours * this.laborRate  // Labor only!
            },
            serviceC: {
                name: 'Coolant Service',
                frequency: 1,
                partsCost: components.O_coolantAdditive,
                // Coolant parts are in central Parts Markup
                total: 0  // No separate charge - included in PARTS
            },
            serviceD: {
                name: 'Analysis',
                frequency: 1,
                fuelAnalysis: components.P_fuelAnalysis,
                oilSample: components.V_oilSample,
                // Analysis costs are in central Parts Markup
                total: 0  // No separate charge - included in PARTS
            },
            serviceE: {
                name: 'Load Bank Testing',
                frequency: 1,
                laborCost: components.T_loadbankLabor * this.laborRate,
                equipmentCost: components.Q_loadbankEquipment,
                // Excel double-counts loadbank: labor + equipment here, equipment also in parts
                total: calculations.AE_loadbankSubtotal  // This is the Excel quirk!
            },
            additionalParts: {
                name: 'Air Filters & Freight',
                airFilter: components.M_airFilter + components.N_airFilterMult,
                freight: calculations.AA_freight,
                total: (components.M_airFilter + components.N_airFilterMult) * this.partsMarkup + calculations.AA_freight
            }
        };
    }
}