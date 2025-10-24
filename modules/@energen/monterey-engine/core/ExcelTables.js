/**
 * @module ExcelTables
 * @description Exact data from Monterey Excel "Ser Menu 2022 Rates" sheet
 * All tables and values match Excel exactly for parity
 */

export class ExcelTables {
    constructor() {
        this.version = '1.0.0-monterey';
        this.excelFile = 'monterey_mess.xlsx';
        this.lastUpdated = '2024-01-11';
        
        this._initializeTables();
        this._initializeCostFactors();
    }
    
    /**
     * Initialize all service tables from Excel
     * @private
     */
    _initializeTables() {
        // KW Ranges used across all services
        this.kwRanges = [
            '2-14', '15-30', '35-150', '155-250', '255-400',
            '405-500', '505-670', '675-1050', '1055-1500', '1500-2050'
        ];
        
        // Table 3: SERVICE A - Comprehensive Inspection (B14:G24)
        // Excel shows: Labor varies 1-4 hours, Shop/Travel time is 2 hours for ALL
        this.serviceA = {
            ranges: this.kwRanges,
            labor: [1, 1, 2, 2, 2.5, 2.5, 3, 3, 4, 4],
            shopTime: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // Excel column D - Shop/Prep Time
            travelTime: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // Same as shop time in Excel
            // Total hours calculated: labor + shopTime
            // Total labor calculated: totalHours * F13 ($191)
            // Parts calculated with formulas - placeholder for now
        };
        
        // Table 4: SERVICE B - Oil & Filter Service (B25:J35)
        this.serviceB = {
            ranges: this.kwRanges,
            labor: [1, 1, 2, 2, 4, 6, 8, 12, 16, 16],
            shopTime: [2, 2, 2, 2, 2, 2, 4, 4, 4, 4],
            oilGallons: [1.5, 3, 5, 8, 12, 18, 30, 50, 100, 150],
            batteries: [100, 100, 150, 350, 600, 1200, 2500, 3500, 4800, 5000],
            batteryLabor: [2, 2, 2, 2, 4, 4, 4, 8, 8, 8],
            // Parts/filters to be calculated
        };
        
        // Table 5: SERVICE C - Coolant Service (B36:I46)
        // CRITICAL: Coolant quantity = Service B oil gallons * 1.5
        this.serviceC = {
            ranges: this.kwRanges,
            labor: [2, 2, 2, 3, 3, 4, 4, 6, 6, 8],
            shopTime: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            // Coolant quantities calculated from Service B: oilGallons * 1.5
            hosesAndBelts: [150, 200, 250, 300, 450, 500, 600, 650, 850, 1000]
        };
        
        // Table 6: SERVICE E - Load Bank Testing (B47:I57)  
        this.serviceE = {
            ranges: this.kwRanges,
            labor: [3, 3, 3, 4, 6, 6, 8, 8, 8, 12],
            shopTime: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            loadbankRental: [350, 350, 350, 700, 700, 1000, 1500, 1500, 2000, 2500],
            transformerRental: [0, 0, 0, 0, 0, 0, 1500, 1500, 1500, 1500],
            deliveryCost: [0, 0, 0, 0, 0, 0, 3500, 3500, 3500, 3500]
        };
        
        // Table 7: SERVICE F - Engine Tune-up (B58:G68)
        // SPECIAL: Not KW-based, uses cylinder count + injector type
        this.serviceF = {
            configurations: [
                { cylinders: 4, injectorType: 'Pop Noz', labor: 2, shopTime: 2 },
                { cylinders: 6, injectorType: 'Pop Noz', labor: 3, shopTime: 2 },
                { cylinders: 12, injectorType: 'Pop Noz', labor: 4, shopTime: 2 },
                { cylinders: 4, injectorType: 'Unit Inj', labor: 4, shopTime: 2 },
                { cylinders: 6, injectorType: 'Unit Inj', labor: 4, shopTime: 2 },
                { cylinders: 8, injectorType: 'Pop Noz', labor: 4, shopTime: 2 },
                { cylinders: 8, injectorType: 'Unit Inj', labor: 4, shopTime: 2 },
                { cylinders: 16, injectorType: 'Pop Noz', labor: 6, shopTime: 4 },
                { cylinders: 12, injectorType: 'Unit Inj', labor: 7, shopTime: 4 },
                { cylinders: 16, injectorType: 'Unit Inj', labor: 10, shopTime: 4 }
            ]
        };
        
        // Service D - Referenced but not in tables (uses fixed values)
        this.serviceD = {
            oilAnalysis: true,
            fuelAnalysis: true
        };
    }
    
    /**
     * Initialize cost factors and adjustable parameters
     * @private
     */
    _initializeCostFactors() {
        // Table 1: Labor Rates (B4:D8)
        this.laborRates = {
            base: 191,              // F13 - base labor rate
            contract: 182,          // C6 - calculated in Excel
            nonContract: 191,       // D5
            contractOvertime: 255.5,    // C7 - calculated
            nonContractOvertime: 255.5, // D7 - calculated
            contractDoubleTime: 382,    // C8 - calculated
            nonContractDoubleTime: 382  // D8 - calculated
        };
        
        // Table 2: Cost Factors (B10:E11, various cells)
        this.costFactors = {
            oilCost: 16.00,         // C10 - per gallon
            coolantCost: 15.00,     // C11 - per gallon
            fuelAnalysis: 60.00,    // E10
            oilAnalysis: 16.55,     // E11
            
            // Additional factors from various cells
            cpi: 0.083,             // E6 - 8.3% inflation (not used in main calcs)
            yearlyMultiplier: 1.05  // J10 - SSOT verified 1.05 (not 1.083)
        };
        
        // Markup factors from SSOT exact cell references
        this.markupFactors = {
            partsMarkup: 1.2,       // J5 - SSOT verified 1.2 (not 1.25)
            freightPercent: 0.05,   // J8 - SSOT verified 0.05
            airFilterMultiplier: 0.5,    // Column N formula
            coolantAdditiveMultiplier: 2.5, // Column O formula
            mileageRate: 2.50       // H10 - SSOT verified $2.50
        };
    }
    
    /**
     * Get service table by service code
     * @param {string} serviceCode - Service code (A, B, C, E, F)
     * @returns {Object} Service table data
     */
    getServiceTable(serviceCode) {
        switch(serviceCode.toUpperCase()) {
            case 'A': return this.serviceA;
            case 'B': return this.serviceB;
            case 'C': return this.serviceC;
            case 'E': return this.serviceE;
            case 'F': return this.serviceF;
            case 'D': return this.serviceD;
            default: 
                throw new Error(`Unknown service code: ${serviceCode}`);
        }
    }
    
    /**
     * Get coolant quantities for Service C
     * Formula: Service B oil gallons * 1.5
     * @returns {Array} Coolant quantities
     */
    getServiceCCoolantQuantities() {
        return this.serviceB.oilGallons.map(gallons => gallons * 1.5);
    }
    
    /**
     * Get KW range index from KW value
     * @param {number} kw - Generator KW rating
     * @returns {number} Index in arrays
     */
    getKwRangeIndex(kw) {
        if (kw <= 14) return 0;   // '2-14'
        if (kw <= 30) return 1;   // '15-30'
        if (kw <= 150) return 2;  // '35-150'
        if (kw <= 250) return 3;  // '155-250'
        if (kw <= 400) return 4;  // '255-400'
        if (kw <= 500) return 5;  // '405-500'
        if (kw <= 670) return 6;  // '505-670'
        if (kw <= 1050) return 7; // '675-1050'
        if (kw <= 1500) return 8; // '1055-1500'
        return 9;                  // '1500-2050'
    }
    
    /**
     * Get KW range string from KW value
     * @param {number} kw - Generator KW rating
     * @returns {string} KW range string
     */
    getKwRange(kw) {
        const index = this.getKwRangeIndex(kw);
        return this.kwRanges[index];
    }
    
    /**
     * Get Service F configuration
     * @param {number} cylinders - Number of cylinders
     * @param {string} injectorType - 'Pop Noz' or 'Unit Inj'
     * @returns {Object} Service F configuration
     */
    getServiceFConfig(cylinders, injectorType) {
        const config = this.serviceF.configurations.find(
            c => c.cylinders === cylinders && c.injectorType === injectorType
        );
        
        if (!config) {
            // Default fallback
            console.warn(`No Service F config for ${cylinders} cyl ${injectorType}, using default`);
            return { cylinders: 8, injectorType: 'Pop Noz', labor: 4, shopTime: 2 };
        }
        
        return config;
    }
}

export default ExcelTables;