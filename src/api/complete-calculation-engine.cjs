/**
 * ENERGEN CALCULATOR - COMPLETE CALCULATION ENGINE
 * 100% Excel Parity with ALL Services (A-J)
 * All fluids in GALLONS
 * Real-time CDTFA tax calculation
 */

const fetch = require('node-fetch');
const { MobilizationStackingEngine } = require('../../modules/@energen/mobilization-stacking/index.cjs');

class EnergenCalculationEngine {
    // THIS IS THE FINAL, CORRECT CONSTRUCTOR.
    constructor(settings = {}, logger = null) {
        // BUG-028 FIX: Use Winston logger instead of this.logger.debug
        this.logger = logger || console; // Fallback to console if no logger provided

        this.logger.info('--- CALCULATION ENGINE CANARY --- VERSION 2 --- THE FIX IS LIVE ---');

        // Phase 1: Initialize the trace log
        this.trace = [];

        // BLACK BOX RECORDER - STEP 1: Log the incoming user settings
        this.logger.debug('--- CONSTRUCTOR TRACE 1/4: Incoming User Settings ---');
        this.logger.debug(JSON.stringify(settings, null, 2));

        // Phase 2: Load the master service data definitions from the SSOT config file
        const serviceDataDefaults = require('../../frontend/config/default-settings.json');

        // BLACK BOX RECORDER - STEP 2: Log the loaded default data
        this.logger.debug('--- CONSTRUCTOR TRACE 2/4: Loaded Default Data ---');
        this.logger.debug(`Loaded ${Object.keys(serviceDataDefaults).length} keys from JSON.`);

        // Phase 3: DEEP MERGE - Implement a recursive merge function
        /**
         * Deep merge utility - recursively merges source into target
         * @param {Object} target - The base object
         * @param {Object} source - The object to merge in
         * @returns {Object} The merged object
         */
        const deepMerge = (target, source) => {
            const output = { ...target };

            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        // If both target and source have an object at this key, merge them
                        if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
                            output[key] = deepMerge(target[key], source[key]);
                        } else {
                            // Otherwise, use the source value
                            output[key] = source[key];
                        }
                    } else {
                        // For primitives and arrays, use the source value
                        output[key] = source[key];
                    }
                }
            }

            return output;
        };

        // Apply deep merge to preserve nested service data while allowing overrides
        this.settings = deepMerge(serviceDataDefaults, settings);

        // BLACK BOX RECORDER - STEP 3: Log the final, merged settings object
        this.logger.debug('--- CONSTRUCTOR TRACE 3/4: Final Merged Settings ---');
        this.logger.debug(`laborRate in merged settings: ${this.settings.laborRate}`);
        this.logger.debug(`First 5 keys: ${Object.keys(this.settings).slice(0, 5).join(', ')}`);
        // Additional validation to confirm service data is preserved
        this.logger.debug(`ServiceA has data: ${!!this.settings.serviceA?.data}`);
        this.logger.debug(`ServiceA data keys: ${Object.keys(this.settings.serviceA?.data || {}).length}`);

        // Phase 4: Assign the authoritative settings to the direct class properties
        this.laborRate = this.settings.laborRate;
        this.partsMarkup = this.settings.partsMarkup;
        this.freightMarkup = this.settings.freightMarkup;
        this.oilPrice = this.settings.oilPrice;
        this.oilMarkup = this.settings.oilMarkup;
        this.coolantPrice = this.settings.coolantPrice;
        this.coolantMarkup = this.settings.coolantMarkup;

        // BLACK BOX RECORDER - STEP 4: Log the final, assigned labor rate
        this.logger.debug('--- CONSTRUCTOR TRACE 4/4: Final Assigned Labor Rate ---');
        this.logger.debug(`this.laborRate = ${this.laborRate}`);

        // Phase 5: Initialize service names mapping
        this.serviceNames = {
            'A': 'Comprehensive Inspection',
            'B': 'Oil & Filter Service',
            'C': 'Coolant Service',
            'D': 'Oil & Fuel Analysis',
            'E': 'Load Bank Testing',
            'F': 'Diesel Engine Tune-Up',
            'G': 'Gas Engine Tune-Up',
            'H': 'Electrical Testing',
            'I': 'Transfer Switch Service',
            'J': 'Thermal Imaging',
            'K': 'Battery Replacement'
        };

        // Phase 6: Map frontend settings structure to expected format
        // The frontend sends services.serviceA as an array, but the engine expects serviceDataA.data
        // Extract the .data object directly from services (avoid double nesting)
        if (this.settings.services) {
            this.settings.serviceDataA = this.settings.services.serviceA?.data || this.settings.serviceA?.data || {};
            this.settings.serviceDataB = this.settings.services.serviceB?.data || this.settings.serviceB?.data || {};
            this.settings.serviceDataC = this.settings.services.serviceC?.data || this.settings.serviceC?.data || {};
            this.settings.serviceDataH = this.settings.services.serviceH?.data || this.settings.serviceH?.data || {};
            this.settings.serviceDataI = this.settings.services.serviceI?.data || this.settings.serviceI?.data || {};
        } else {
            // Fallback for old structure
            this.settings.serviceDataA = this.settings.serviceA?.data || {};
            this.settings.serviceDataB = this.settings.serviceB?.data || {};
            this.settings.serviceDataC = this.settings.serviceC?.data || {};
            this.settings.serviceDataH = this.settings.serviceH?.data || {};
            this.settings.serviceDataI = this.settings.serviceI?.data || {};
        }

        // Phase 7: THE FINAL, MISSING PIECE: Initialize the MobilizationStackingEngine
        this.mobilizationEngine = new MobilizationStackingEngine({
            enabled: this.settings.mobilizationStacking?.enabled ?? true,
            stackingDiscount: this.settings.mobilizationStacking?.discount ?? 35,
            mobilizationRate: this.settings.mobilizationRate,
            minimumHours: 1
        });
    }
    
    /**
     * Log a trace entry for audit trail
     * @param {string} source - Source of the value (Settings, Hardcoded, Calculated)
     * @param {string} service - Service context (Global, Service A, etc.)
     * @param {string} description - Human-readable description
     * @param {number|string} value - The actual value
     * @param {string} calculation - Optional calculation formula
     * @param {string} notes - Optional notes or warnings
     */
    logTrace(source, service, description, value, calculation = '', notes = '') {
        this.trace.push({
            source,
            service,
            description,
            value,
            calculation,
            notes,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Get kW range for calculations
     */
    getKwRange(kw) {
        // --- BEGIN getKwRange DIAGNOSTICS ---
        this.logger.debug(`[getKwRange TRACE] Input kw: ${kw} (Type: ${typeof kw})`);
        
        // NEW, ROBUST, AND GAP-FREE getKwRange function
        // Each range key corresponds to the exact data keys in our settings
        // The min/max values are contiguous to prevent any gaps
        const ranges = [
            { min: 2,    max: 14,   key: '2-14' },
            { min: 15,   max: 30,   key: '15-30' },
            { min: 31,   max: 150,  key: '35-150' },    // Maps 31-150 to '35-150' key
            { min: 151,  max: 250,  key: '151-250' },   // Maps 151-250 to '155-250' key
            { min: 251,  max: 400,  key: '251-400' },   // Maps 251-400 to '255-400' key
            { min: 401,  max: 500,  key: '401-500' },   // Maps 401-500 to '405-500' key
            { min: 501,  max: 670,  key: '501-670' },   // Maps 501-670 to '505-670' key
            { min: 671,  max: 1050, key: '671-1050' },  // Maps 671-1050 to '675-1050' key
            { min: 1051, max: 1500, key: '1051-1500' }, // Maps 1051-1500 to '1055-1500' key
            { min: 1501, max: 2050, key: '1501-2050' }  // Maps 1501-2050 to '1501-2050' key
        ];
        
        this.logger.debug('[getKwRange TRACE] Available ranges:', JSON.stringify(ranges));

        const kwNum = Number(kw);
        this.logger.debug(`[getKwRange TRACE] Converted kwNum: ${kwNum}`);
        
        // BUG-014 FIX: Throw error instead of returning null
        // Returning null causes silent $0 quotes
        if (kwNum < 2) {
            this.logger.error(`[getKwRange] kW value ${kw} is below minimum supported (2 kW)`);
            this.logger.debug('[getKwRange TRACE] Throwing error (below minimum)');
            // --- END getKwRange DIAGNOSTICS ---
            throw new Error(`Generator size ${kw} kW is below minimum supported (2 kW)`);
        }
        
        // Find the matching range
        const foundRange = ranges.find(r => {
            const matches = kwNum >= r.min && kwNum <= r.max;
            this.logger.debug(`[getKwRange TRACE] Testing range ${r.key}: kwNum(${kwNum}) >= min(${r.min}) && kwNum(${kwNum}) <= max(${r.max}) = ${matches}`);
            return matches;
        });
        
        if (foundRange) {
            this.logger.debug(`[getKwRange TRACE] Output range: ${foundRange.key}`);
            // --- END getKwRange DIAGNOSTICS ---
            return foundRange.key;
        }
        
        // Handle very large generators (>2050 kW)
        if (kwNum > 2050) {
            this.logger.debug('[getKwRange TRACE] Output range: 1501-2050 (above maximum)');
            // --- END getKwRange DIAGNOSTICS ---
            return '1501-2050'; // Use highest range for very large generators
        }
        
        // BUG-014 FIX: Throw error instead of returning null
        // This should never happen with gap-free ranges
        this.logger.error(`[getKwRange] CRITICAL ERROR: Could not find valid kW range for: ${kw}`);
        this.logger.debug('[getKwRange TRACE] Throwing error (no match found - CRITICAL ERROR)');
        // --- END getKwRange DIAGNOSTICS ---
        throw new Error(`Invalid kW value: ${kw}. Must be between 2-2050 kW`);
    }

    /**
     * Get California tax rate from CDTFA API
     */
    async getTaxRate(address, city, zip) {
        try {
            const url = `https://services.maps.cdtfa.ca.gov/api/taxrate`;
            const params = new URLSearchParams({ address, city, zip });
            const response = await fetch(`${url}?${params}`);
            
            if (response.ok) {
                const data = await response.json();
                return data.totalRate / 100; // Convert percentage to decimal
            }
        } catch (error) {
            this.logger.warn('Tax rate API failed, using default CA rate:', {
                error: error.message,
                address,
                city,
                zip,
                defaultRate: 0.1025
            });
        }
        
        // Default California tax rate if API fails
        return 0.1025; // 10.25%
    }
    
    /**
     * Service A - Comprehensive Inspection (Quarterly)
     */
    getServiceA(kwRange) {
        // DIAGNOSTIC LOGGING
        this.logger.debug('🔍 DEBUG getServiceA called with kwRange:', kwRange);
        this.logger.debug('🔍 this.settings.serviceA:', this.settings.serviceA);
        this.logger.debug('🔍 this.settings.serviceDataA:', this.settings.serviceDataA);
        
        // Check if data is stored directly as an object (not in a .data array)
        const serviceAData = this.settings.serviceA?.data || this.settings.serviceDataA;
        this.logger.debug('🔍 serviceAData resolved to:', serviceAData);
        
        // Handle both formats: direct object or nested in .data array
        if (serviceAData && typeof serviceAData === 'object' && !Array.isArray(serviceAData)) {
            // Direct object format (e.g., serviceDataA: { "2-14": {...}, "15-30": {...} })
            const data = serviceAData[kwRange];
            if (!data) {
                // BUG-020 FIX: Throw error instead of silently returning zeros
                throw new Error(`CRITICAL: Service A data missing for kW range ${kwRange}. Cannot generate quote.`);
            }
            // Normalize the property names to match expected format
            return {
                laborHours: data.labor || data.laborHours || 0,
                mobilization: data.mobilization || 0,
                parts: data.parts || 0
            };
        } else if (serviceAData?.data && Array.isArray(serviceAData.data)) {
            // Array format (legacy)
            const data = serviceAData.data.find(item => item.kwRange === kwRange);
            if (!data) {
                this.logger.error(`No Service A data found for kwRange: ${kwRange}`);
                return {
                    laborHours: 0,
                    mobilization: 0,
                    parts: 0
                };
            }
            return data;
        } else {
            this.logger.error(`Invalid Service A data structure:`, serviceAData);
            return {
                laborHours: 0,
                mobilization: 0,
                parts: 0
            };
        }
    }
    
    /**
     * Service B - Oil & Filter Service (Annual)
     * Oil quantities are in GALLONS (sourced from Excel original quart values)
     */
    getServiceB(kwRange) {
        // Check settings first, then fallback to hardcoded defaults
        const serviceBData = this.settings.serviceB?.data || this.settings.serviceDataB;

        // DEBUG: Log to verify custom settings are being read
        if (this.logger) {
            this.logger.info('getServiceB called', {
                kwRange,
                hasCustomData: !!serviceBData,
                settings: this.settings.serviceB
            })
        }

        if (serviceBData && typeof serviceBData === 'object' && !Array.isArray(serviceBData)) {
            const data = serviceBData[kwRange];
            if (data) {
                // Normalize property names to match expected format
                const normalized = {
                    laborHours: data.labor || data.laborHours || 0,
                    mobilization: data.mobilization || 0,
                    filterCost: data.filterCost || 0,
                    oilGallons: data.oilGallons || 0
                };

                if (this.logger) {
                    this.logger.info('Service B custom data found', { kwRange, normalized })
                }

                return normalized;
            }
        }
        
        // Fallback to hardcoded defaults if settings not available
        const hardcodedData = {
            '2-14': { laborHours: 1, mobilization: 2, filterCost: 171.90, oilGallons: 1.5 },
            '15-30': { laborHours: 1, mobilization: 2, filterCost: 171.90, oilGallons: 3.0 },
            '35-150': { laborHours: 2, mobilization: 2, filterCost: 229.20, oilGallons: 5.0 },
            '151-250': { laborHours: 2, mobilization: 2, filterCost: 229.20, oilGallons: 8.0 },
            '251-400': { laborHours: 4, mobilization: 2, filterCost: 343.80, oilGallons: 12.0 },
            '401-500': { laborHours: 6, mobilization: 2, filterCost: 458.40, oilGallons: 18.0 },
            '501-670': { laborHours: 8, mobilization: 4, filterCost: 687.60, oilGallons: 30.0 },
            '671-1050': { laborHours: 12, mobilization: 4, filterCost: 916.80, oilGallons: 50.0 },
            '1051-1500': { laborHours: 16, mobilization: 4, filterCost: 1146.00, oilGallons: 100.0 },
            '1501-2050': { laborHours: 16, mobilization: 4, filterCost: 1146.00, oilGallons: 150.0 }
        };
        return hardcodedData[kwRange];
    }
    
    /**
     * Service C - Coolant Service (Annual/Biannual)
     */
    getServiceC(kwRange) {
        const serviceData = this.settings.serviceDataC;

        // Handle both formats: direct object or nested in .data array
        if (serviceData && typeof serviceData === 'object' && !Array.isArray(serviceData)) {
            // Direct object format (e.g., serviceDataC: { "151-250": {...}, "251-400": {...} })
            const data = serviceData[kwRange];
            if (!data) {
                this.logger.error(`No Service C data found for kwRange: ${kwRange}`);
                return {
                    labor: 0,
                    mobilization: 0,
                    coolantGallons: 0,
                    hoseBeltCost: 0
                };
            }
            return data;
        } else if (serviceData?.data && Array.isArray(serviceData.data)) {
            // Array format (legacy)
            const data = serviceData.data.find(item => item.kwRange === kwRange);
            if (!data) {
                this.logger.error(`No Service C data found for kwRange: ${kwRange} in array:`, serviceData.data);
                return {
                    labor: 0,
                    mobilization: 0,
                    coolantGallons: 0,
                    hoseBeltCost: 0
                };
            }
            return data;
        } else {
            this.logger.error(`No Service C data found. serviceDataC:`, serviceData);
            return {
                labor: 0,
                mobilization: 0,
                coolantGallons: 0,
                hoseBeltCost: 0
            };
        }
    }
    
    /**
     * Service D - Oil, Fuel & Coolant Analysis (Annual)
     * NOTE: Service D does not use kwRange-based data structure
     * NO LABOR, NO MOBILIZATION - just analysis costs based on checkbox selections
     */
    getServiceD(kwRange) {
        // Service D has a flat structure, not kwRange-based
        // No labor or mobilization charges - only analysis costs
        return {
            labor: 0,  // No labor - samples collected during other services
            mobilization: 0,  // No mobilization - analysis done at lab
            // Analysis costs are accessed directly from settings in the calculate method
        };
    }
    
    /**
     * Service E - Load Bank Testing (Annual)
     * FTB SPECIAL: $0 transformer, $1000 delivery, 1.5x weekend labor
     */
    getServiceE(kwRange) {
        const serviceEData = this.settings.serviceE?.data || this.settings.serviceDataE || {};
        const rangeData = serviceEData[kwRange];

        if (!rangeData) {
            this.logger.debug(`No Service E data found for kwRange: ${kwRange}`);
            return {
                laborHours: 3,
                laborMultiplier: 1.5,  // FTB: Weekend overtime
                mobilization: 2,
                loadBankRental: 350,
                transformerRental: 0,   // FTB: $0 transformer
                deliveryCost: 1000,     // FTB: $1000 delivery
                parts: 1350             // FTB: loadBank + delivery
            };
        }

        // FTB SPECIAL PRICING:
        const loadBank = rangeData.loadBankRental || 0;
        const delivery = 1000;  // Fixed $1000 delivery
        const transformer = 0;  // $0 transformer (was $1500)

        // Return with standardized property names + FTB special fields
        return {
            laborHours: rangeData.labor || rangeData.laborHours || 3,
            laborMultiplier: 1.5,  // FTB: Weekend overtime multiplier
            mobilization: rangeData.mobilization || rangeData.travelHours || 2,
            loadBankRental: loadBank,
            transformerRental: transformer,  // FTB: $0
            deliveryCost: delivery,           // FTB: $1000
            parts: loadBank + delivery        // FTB: Combined parts cost
        };
    }

    /**
     * Service F - Engine Tune-Up (Diesel) - Based on cylinder count and injector type
     * From Excel: Ser Menu 2022 Rates, Rows 58-68
     * @param {number} cylinders - Number of cylinders (4, 6, 8, 12, 16)
     * @param {string} injectorType - Type of injector: 'pop' for Pop Nozzle, 'unit' for Unit Injector
     */
    getServiceF(cylinders = 6, injectorType = 'pop') {
        // Try to use settings data first
        const popData = this.settings.serviceF?.popNozzleInjectors || [];
        const unitData = this.settings.serviceF?.unitInjectors || [];

        const dataArray = injectorType === 'unit' ? unitData : popData;
        let match = dataArray.find(item => item.cylinders === cylinders);

        // If found in settings, return it (note: settings uses 'mobilization' not 'travel')
        if (match) {
            return {
                labor: match.labor,
                travel: match.mobilization, // Map mobilization to travel for consistency
                parts: match.parts
            };
        }

        // Fallback to hardcoded data if settings not available
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
        return data[cylinders] || { labor: 4, travel: 2, parts: 500 }; // Default fallback
    }
    
    /**
     * Service G - Gas Engine Tune-Up
     */
    getServiceG(cylinders = 8) {
        // serviceG.data is an array of objects with cylinder counts
        const dataArray = this.settings.serviceG?.data;
        if (!dataArray || !Array.isArray(dataArray)) {
            this.logger.error(`No Service G data array found. serviceG:`, this.settings.serviceG);
            return {
                labor: 0,
                mobilization: 0,
                sparkPlugs: 0,
                ignitionKit: 0
            };
        }

        // Find the entry for the given cylinder count
        const data = dataArray.find(item => item.cylinders === cylinders);
        if (!data) {
            // Default to 8 cylinder if not found
            const defaultData = dataArray.find(item => item.cylinders === 8);
            if (!defaultData) {
                this.logger.error(`No Service G data found for ${cylinders} cylinders and no 8-cylinder default. Array:`, dataArray);
                return {
                    labor: 0,
                    mobilization: 0,
                    sparkPlugs: 0,
                    ignitionKit: 0
                };
            }
            return defaultData;
        }
        return data;
    }
    
    /**
     * Service H - Generator Electrical Testing (Every 5 years)
     */
    getServiceH(kwRange) {
        const serviceData = this.settings.serviceDataH;
        if (!serviceData) {
            return { labor: 0, mobilization: 0, testingEquipment: 0 };
        }

        // Handle array format: serviceDataH.data = [{kwRange: "2-14", ...}]
        if (serviceData.data && Array.isArray(serviceData.data)) {
            const data = serviceData.data.find(item => item.kwRange === kwRange);
            return data || { labor: 0, mobilization: 0, testingEquipment: 0 };
        }

        // Handle object format: serviceDataH = {"2-14": {...}, "15-30": {...}}
        const data = serviceData[kwRange];
        return data || { labor: 0, mobilization: 0, testingEquipment: 0 };
    }
    
    /**
     * Service I - Transfer Switch Service (Annual)
     */
    getServiceI(kwRange) {
        const serviceData = this.settings.serviceDataI;
        if (!serviceData) {
            return { labor: 0, mobilization: 0, switchMaintenance: 0 };
        }

        // Handle array format: serviceDataI.data = [{kwRange: "2-14", ...}]
        if (serviceData.data && Array.isArray(serviceData.data)) {
            const data = serviceData.data.find(item => item.kwRange === kwRange);
            return data || { labor: 0, mobilization: 0, switchMaintenance: 0 };
        }

        // Handle object format: serviceDataI = {"2-14": {...}, "15-30": {...}}
        const data = serviceData[kwRange];
        return data || { labor: 0, mobilization: 0, switchMaintenance: 0 };
    }
    
    /**
     * Service J - Thermal Imaging Scan (Annual)
     */
    getServiceJ(kw) {
        const serviceData = this.settings.serviceJ;
        if (!serviceData) {
            return { labor: 0, mobilization: 0, equipmentCost: 0 };
        }

        // Handle object format: serviceJ.byKw = {"150": {...}, "500": {...}}
        if (serviceData.byKw) {
            const tier = kw <= 150 ? '150' : kw <= 500 ? '500' : '9999';
            return serviceData.byKw[tier] || { labor: 0, mobilization: 0, equipmentCost: 0 };
        }

        // Handle array format: serviceJ.kwCategory = [{category: "Up to 150 kW", ...}]
        if (serviceData.kwCategory && Array.isArray(serviceData.kwCategory)) {
            let data;
            if (kw <= 150) {
                data = serviceData.kwCategory[0]; // "Up to 150 kW"
            } else if (kw <= 500) {
                data = serviceData.kwCategory[1]; // "151 - 500 kW"
            } else {
                data = serviceData.kwCategory[2]; // "Over 500 kW"
            }
            return data || { labor: 0, mobilization: 0, equipmentCost: 0 };
        }

        return { labor: 0, mobilization: 0, equipmentCost: 0 };
    }

    /**
     * Get Fuel Polishing service data by kW range
     * Returns labor, mobilization, tankSize, pricePerGallon, equipment
     */
    getFuelPolishing(kwRange) {
        const data = this.settings.fuelPolishing?.data;
        const serviceData = data?.[kwRange];

        if (!serviceData) {
            return {
                labor: 0,
                mobilization: 0,
                tankSize: 0,
                pricePerGallon: 0,
                equipment: 0
            };
        }

        return serviceData;
    }

    /**
     * Get Battery Service data by kW range
     * Returns labor, mobilization, batteryCost, quantity
     */
    getBatteryService(kwRange) {
        const data = this.settings.batteryService?.data;
        const serviceData = data?.[kwRange];

        if (!serviceData) {
            return {
                labor: 0,
                mobilization: 0,
                batteryCost: 0,
                quantity: 1
            };
        }

        return serviceData;
    }
    
    /**
     * Main calculation method - Architecturally Refactored
     * This method follows a direct, data-driven approach where:
     * 1. Service data contains pre-calculated per-visit costs
     * 2. We apply frequency multipliers to get annual costs
     * 3. We accumulate totals across all services and generators
     */
    async calculate(payload) {
        const {
            customerInfo,
            generators,
            services,
            serviceFrequencies = {},  // User-selected frequencies per service
            serviceDFluids = {},  // Fluid test selections for Service D
            contractLength = 12,
            facilityType = 'commercial',
            settings = {}
        } = payload;
        
        // ========== STEP 1: Initialize Accumulators ==========
        let totalAnnualLaborCost = 0;
        let totalAnnualPartsCost = 0;
        let totalAnnualMobilizationHours = 0;
        const serviceBreakdown = [];
        
        // Get tax rate from CDTFA (use defaults if customerInfo not provided)
        const taxRate = await this.getTaxRate(
            customerInfo?.address || '',
            customerInfo?.city || '',
            customerInfo?.zip || ''
        );
        
        // Auto-fetch CPI data based on customer ZIP
        let cpiRate = settings?.annualEscalation || 3.0; // Default 3.0% (historical average)
        if (customerInfo?.zip && !settings?.annualEscalation) {
            try {
                const CPIService = require('./cpi-service.cjs');
                const cpiService = new CPIService();
                const metroArea = cpiService.getMetroFromZip(customerInfo.zip);

                // Skip API call if no key provided
                if (process.env.FRED_API_KEY) {
                    const cpiData = await cpiService.getCPIData(metroArea, process.env.FRED_API_KEY);
                    if (cpiData?.annualInflation) {
                        cpiRate = cpiData.annualInflation;

                    }
                } else {
                    this.logger.debug(`Using default CPI rate ${cpiRate}% (no FRED API key configured)`);
                }
            } catch (error) {
                // BUG-019 FIX: Add logging for CPI service errors
                if (error.response?.status === 400) {
                    this.logger.warn(`Invalid ZIP for CPI lookup: ${customerInfo?.zip}`);
                } else {
                    this.logger.error('CPI service error:', error.message);
                }
            }
        }
        
        // Auto-fetch prevailing wage data based on customer ZIP
        let prevailingWageData = null;
        let laborRateMultiplier = 1.0;
        if (customerInfo?.zip && settings?.prevailingWageRequired) {
            try {
                const PrevailingWageService = require('./prevailing-wage-service.cjs');
                const wageService = new PrevailingWageService();
                prevailingWageData = await wageService.getPrevailingWageData(
                    customerInfo.zip, 
                    customerInfo.state || 'CA'
                );
                
                if (prevailingWageData) {

                    // Calculate labor rate multiplier based on prevailing wage
                    const standardRate = laborRate || 191;
                    const prevailingRate = prevailingWageData.prevailingWage.totalHourly;
                    laborRateMultiplier = Math.max(1.0, prevailingRate / standardRate);
                    this.logger.debug(`Prevailing wage multiplier: ${laborRateMultiplier.toFixed(2)}x`);
                }
            } catch (error) {
                // BUG-019 FIX: Add logging for prevailing wage service errors
                this.logger.error('Prevailing wage service error:', error.message);
            }
        }
        
        // ========== STEP 2: Multi-Unit Mobilization Grouping ==========
        // Group all units by service+frequency to apply multi-unit discount
        const visitGroups = {}; // Key: serviceCode_frequency, Value: array of {generator, kw, mobilizationHours}
        
        // First pass: Build visit groups
        for (const generator of generators) {
            const kw = generator.kw;
            const kwRange = this.getKwRange(kw);
            
            for (const serviceLetter of services) {
                // Get frequency for this service
                let frequencyMultiplier = 1;
                if (serviceFrequencies && serviceFrequencies[serviceLetter]) {
                    frequencyMultiplier = serviceFrequencies[serviceLetter];
                } else {
                    const defaultFrequencies = {
                        'A': 4, 'B': 1, 'C': 1, 'D': 1, 'E': 1,
                        'F': 1, 'G': 1, 'H': 1, 'I': 1, 'J': 1
                    };
                    frequencyMultiplier = defaultFrequencies[serviceLetter] || 1;
                }
                
                // Get service definition to find mobilization hours
                let serviceDef;
                switch(serviceLetter) {
                    case 'A': serviceDef = this.getServiceA(kwRange); break;
                    case 'B': serviceDef = this.getServiceB(kwRange); break;
                    case 'C': serviceDef = this.getServiceC(kwRange); break;
                    case 'D': serviceDef = this.getServiceD(kwRange); break;
                    case 'E': serviceDef = this.getServiceE(kwRange); break;
                    case 'F': serviceDef = this.getServiceF(generator.cylinders || 6, generator.injectorType || 'pop'); break;
                    case 'G': serviceDef = this.getServiceG(generator.cylinders || 8); break;
                    case 'H': serviceDef = this.getServiceH(kwRange); break;
                    case 'I': serviceDef = this.getServiceI(kwRange); break;
                    case 'J': serviceDef = this.getServiceJ(kw); break;
                    default: continue;
                }
                
                const mobilizationHours = serviceDef.mobilization || serviceDef.travel || 2;
                
                // Create visit group key
                const groupKey = `${serviceLetter}_${frequencyMultiplier}`;
                
                if (!visitGroups[groupKey]) {
                    visitGroups[groupKey] = [];
                }
                
                visitGroups[groupKey].push({
                    generator,
                    kw,
                    mobilizationHours,
                    serviceLetter,
                    frequency: frequencyMultiplier
                });
            }
        }
        
        // Second pass: Apply multi-unit discount within each visit group
        const mobilizationMultipliers = new Map(); // Key: generator+service, Value: multiplier
        const mobilizationSettings = settings.mobilizationStacking || {};
        const mobilizationEnabled = mobilizationSettings.enabled !== false; // Default true
        const stackingDiscount = mobilizationSettings.stackingDiscount || 65; // Default 65% discount
        
        for (const [groupKey, unitsInVisit] of Object.entries(visitGroups)) {
            if (unitsInVisit.length === 1 || !mobilizationEnabled) {
                // Single unit or stacking disabled: full mobilization for all
                unitsInVisit.forEach(unitData => {
                    const key = `${unitData.generator.id || unitData.generator.model}_${unitData.serviceLetter}`;
                    mobilizationMultipliers.set(key, 1.0);
                });
            } else {
                // Multiple units on same visit: apply discount
                // Sort by kW descending (largest first = primary)
                unitsInVisit.sort((a, b) => b.kw - a.kw);
                
                unitsInVisit.forEach((unitData, index) => {
                    const key = `${unitData.generator.id || unitData.generator.model}_${unitData.serviceLetter}`;
                    
                    if (index === 0) {
                        // Primary unit (largest kW): full mobilization
                        mobilizationMultipliers.set(key, 1.0);
                    } else {
                        // Secondary units: apply discount
                        // stackingDiscount = % to discount (0-100)
                        // chargePercent = what to actually charge
                        const chargePercent = (100 - stackingDiscount) / 100;
                        mobilizationMultipliers.set(key, chargePercent);
                    }
                });
            }
        }
        
        // ========== STEP 3: Loop Through Generators and Services (with adjusted mobilization) ==========
        for (const generator of generators) {
            const kw = generator.kw;
            const quantity = generator.quantity || 1;
            const kwRange = this.getKwRange(kw);
            
            // Process each service
            for (const serviceLetter of services) {
                // ========== STEP 4: Core Service Processing ==========
                
                // 4a. Get Frequency Multiplier
                let frequencyMultiplier = 1;
                if (serviceFrequencies && serviceFrequencies[serviceLetter]) {
                    frequencyMultiplier = serviceFrequencies[serviceLetter];
                } else {
                    const defaultFrequencies = {
                        'A': 4, 'B': 1, 'C': 1, 'D': 1, 'E': 1,
                        'F': 1, 'G': 1, 'H': 1, 'I': 1, 'J': 1
                    };
                    frequencyMultiplier = defaultFrequencies[serviceLetter] || 1;
                }
                
                const serviceName = `${serviceLetter} - ${this.serviceNames[serviceLetter]}`;
                
                // 4b. Get Per-Visit Data
                let serviceData;
                let perVisitLaborHours = 0;
                let perVisitMobilizationHours = 0;
                let perVisitPartsCost = 0;
                
                // Retrieve service data based on service type
                switch(serviceLetter) {
                    case 'A':
                        serviceData = this.getServiceA(kwRange);
                        // Use labor hours and apply rate to get per-visit labor cost
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // Parts prices in settings are FINAL (already include markup)
                        // Do NOT apply partsMarkup - these are estimated prices from lookup tables
                        // Future: AI enrichment will calculate from unit specs + apply 20% markup
                        perVisitPartsCost = serviceData.parts || 0;
                        break;
                        
                    case 'B':
                        serviceData = this.getServiceB(kwRange);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // Parts: filters + oil (in GALLONS with markup)
                        // filterCost in settings is FINAL (already includes markup)
                        const oilCost = serviceData.oilGallons * this.oilPrice * this.oilMarkup;
                        perVisitPartsCost = serviceData.filterCost + oilCost;
                        // Store oil cost separately for breakdown display
                        serviceData.oilCost = oilCost;
                        serviceData.filterCost = serviceData.filterCost; // Already available
                        break;
                        
                    case 'C':
                        serviceData = this.getServiceC(kwRange);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // Parts: coolant (in GALLONS) + hoses/belts
                        const coolantCost = serviceData.coolantGallons * this.coolantPrice * this.coolantMarkup;
                        // hoseBeltCost in settings is FINAL (already includes markup)
                        const hoseBeltCost = serviceData.hoseBeltCost || serviceData.hosesBelts || 0;
                        perVisitPartsCost = coolantCost + hoseBeltCost;
                        // Store coolant cost separately for breakdown display
                        serviceData.coolantCost = coolantCost;
                        serviceData.hoseBeltCost = hoseBeltCost; // Already available
                        break;
                        
                    case 'D':
                        serviceData = this.getServiceD(kwRange);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;

                        // Parts: Only charge for selected fluid analyses (oil, coolant, fuel)
                        perVisitPartsCost = 0;
                        const fluidSelections = generator.serviceDFluids || serviceDFluids || {};

                        // BUG-016 FIX: Use Boolean() for truthiness instead of strict === true
                        // Handles 1, "true", "yes", etc. from frontend
                        const oilSelected = Boolean(fluidSelections.oil);
                        const coolantSelected = Boolean(fluidSelections.coolant);
                        const fuelSelected = Boolean(fluidSelections.fuel);

                        // BUG-FIX: Analysis costs are nested under serviceD in settings
                        if (oilSelected) {
                            perVisitPartsCost += this.settings.serviceD?.oilAnalysisCost || this.settings.oilAnalysisCost || 0;
                        }
                        if (coolantSelected) {
                            perVisitPartsCost += this.settings.serviceD?.coolantAnalysisCost || this.settings.coolantAnalysisCost || 0;
                        }
                        if (fuelSelected) {
                            perVisitPartsCost += this.settings.serviceD?.fuelAnalysisCost || this.settings.fuelAnalysisCost || 0;
                        }
                        break;
                        
                    case 'E':
                        serviceData = this.getServiceE(kwRange);  // Pass kwRange to match data structure
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;

                        // FTB SPECIAL: Apply 1.5x labor multiplier for weekend overtime
                        if (serviceData.laborMultiplier) {
                            perVisitLaborHours *= serviceData.laborMultiplier;
                        }

                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // FTB SPECIAL: parts = loadBankRental + $1000 delivery (NO transformer)
                        perVisitPartsCost = serviceData.parts || 0;
                        break;
                        
                    case 'F':
                        // Diesel Tune-Up - based on cylinder count and injector type
                        const dieselCylinders = generator.cylinders || 6; // Default to 6 cylinders
                        const injectorType = generator.injectorType || 'pop'; // Default to Pop Nozzle
                        serviceData = this.getServiceF(dieselCylinders, injectorType);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || serviceData.travel || 0;
                        // Parts cost from cylinder/injector lookup table
                        perVisitPartsCost = serviceData.parts || 0;
                        break;
                        
                    case 'G':
                        // Gas Tune-Up - needs cylinder count
                        const gasCylinders = generator.cylinders || 8; // Default to 8 cylinders
                        serviceData = this.getServiceG(gasCylinders);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // Parts: spark plugs + ignition kit
                        // sparkPlugs and ignitionKit prices are FINAL (already include markup)
                        const sparkPlugsCost = (serviceData.sparkPlugs || 25) * gasCylinders;
                        perVisitPartsCost = sparkPlugsCost + (serviceData.ignitionKit || 0);
                        break;
                        
                    case 'H':
                        serviceData = this.getServiceH(kwRange);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        perVisitPartsCost = serviceData.testingEquipment || 0;
                        break;
                        
                    case 'I':
                        // Transfer Switch Service - Multiple ATS Units Support
                        serviceData = this.getServiceI(kwRange);
                        
                        // Get ATS units data from generator object
                        const atsUnits = generator.atsUnits || [{ id: 1, includeMobilization: false }];
                        const atsQuantity = atsUnits.length;
                        
                        // Base labor and parts for first ATS unit
                        perVisitLaborHours = (serviceData.laborHours || serviceData.labor || 0) * atsQuantity;
                        perVisitPartsCost = (serviceData.switchMaintenance || 0) * atsQuantity;
                        
                        // Mobilization logic:
                        // - First ATS unit: always includes mobilization
                        // - Additional units: only if includeMobilization is true
                        let totalMobilizationHours = serviceData.mobilization || 0; // First unit always included
                        
                        if (atsQuantity > 1) {
                            // Add mobilization for additional units if flagged
                            for (let i = 1; i < atsUnits.length; i++) {
                                if (atsUnits[i].includeMobilization === true) {
                                    totalMobilizationHours += (serviceData.mobilization || 0);
                                }
                            }
                        }
                        
                        perVisitMobilizationHours = totalMobilizationHours;
                        break;
                        
                    case 'J':
                        serviceData = this.getServiceJ(kw);
                        perVisitLaborHours = serviceData.laborHours || serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // equipmentCost/reportGeneration are FINAL (already include markup)
                        perVisitPartsCost = serviceData.equipmentCost || serviceData.reportGeneration || 0;
                        break;
                        
                    case 'K':
                        // Battery Replacement Service - Settings-based lookup
                        serviceData = this.getBatteryService(kwRange);
                        perVisitLaborHours = serviceData.labor || 0;
                        perVisitMobilizationHours = serviceData.mobilization || 0;
                        // Battery cost includes quantity multiplier from settings
                        const batteryQuantity = serviceData.quantity || 1;
                        perVisitPartsCost = (serviceData.batteryCost || 0) * batteryQuantity;
                        break;
                        
                    default:
                        // Skip unknown services
                        continue;
                }
                
                // ========== 4c. Extract Per-Visit Values with Multi-Unit Discount ==========
                // Calculate per-visit labor cost (hours * rate * quantity)
                const perVisitLaborCost = perVisitLaborHours * this.laborRate * quantity;
                const perVisitParts = perVisitPartsCost * quantity;
                
                // Apply multi-unit mobilization discount
                const mobilizationKey = `${generator.id || generator.model}_${serviceLetter}`;
                const mobilizationMultiplier = mobilizationMultipliers.get(mobilizationKey) || 1.0;
                const adjustedMobilizationHours = perVisitMobilizationHours * mobilizationMultiplier;
                const perVisitMobilization = adjustedMobilizationHours * quantity;
                
                // ========== 4d. Calculate Annual Costs for THIS Service ==========
                const annualServiceLaborCost = perVisitLaborCost * frequencyMultiplier;
                const annualServicePartsCost = perVisitParts * frequencyMultiplier;
                const annualServiceMobilizationHours = perVisitMobilization * frequencyMultiplier;
                const mobilizationRate = this.settings.mobilizationRate || this.laborRate || 180;
                const annualServiceMobilizationCost = annualServiceMobilizationHours * mobilizationRate;

                // ========== 4e. Accumulate Grand Totals ==========
                totalAnnualLaborCost += annualServiceLaborCost;
                totalAnnualPartsCost += annualServicePartsCost;
                totalAnnualMobilizationHours += annualServiceMobilizationHours;

                // ========== 4f. Build the Breakdown ==========
                const breakdownEntry = {
                    serviceLetter: serviceLetter,
                    serviceName: serviceName,
                    generator: `${generator.brand || ''} ${generator.model || ''} ${kw}kW`,
                    generatorKw: kw,
                    frequencyMultiplier: frequencyMultiplier,
                    perVisitLaborCost: perVisitLaborCost,
                    perVisitPartsCost: perVisitParts,
                    perVisitMobilizationHours: perVisitMobilization,
                    mobilizationMultiplier: mobilizationMultiplier, // Track multi-unit discount (1.0 = primary, <1.0 = secondary)
                    baseMobilizationHours: perVisitMobilizationHours, // Original hours before discount
                    annualLaborCost: annualServiceLaborCost,
                    annualPartsCost: annualServicePartsCost,
                    annualMobilizationHours: annualServiceMobilizationHours,
                    annualMobilizationCost: annualServiceMobilizationCost,
                    annualTotalCost: annualServiceLaborCost + annualServicePartsCost + annualServiceMobilizationCost
                };
                
                // Add component-specific costs for Services B, C, and E
                if (serviceLetter === 'B' && serviceData.oilCost !== undefined) {
                    breakdownEntry.oilCost = Math.round(serviceData.oilCost * frequencyMultiplier);
                    breakdownEntry.filterCost = Math.round(serviceData.filterCost * frequencyMultiplier);
                } else if (serviceLetter === 'C' && serviceData.coolantCost !== undefined) {
                    breakdownEntry.coolantCost = Math.round(serviceData.coolantCost * frequencyMultiplier);
                    breakdownEntry.hoseBeltCost = Math.round(serviceData.hoseBeltCost * frequencyMultiplier);
                } else if (serviceLetter === 'E') {
                    // Service E: Load Bank Testing - separate rental components
                    const eData = this.getServiceE(this.getKwRange(generator.kw));
                    breakdownEntry.loadBankRental = Math.round((eData.loadBankRental || 0) * frequencyMultiplier);
                    breakdownEntry.transformerRental = Math.round((eData.transformerRental || 0) * frequencyMultiplier);
                    breakdownEntry.deliveryCost = Math.round((eData.deliveryCost || 0) * frequencyMultiplier);
                }
                
                serviceBreakdown.push(breakdownEntry);
            }
        }
        
        // ========== STEP 5: After the Loops - Final Assembly ==========
        
        // 5a. Calculate Total Mobilization Cost
        const mobilizationRate = this.settings.mobilizationRate || this.laborRate || 180;
        const totalMobilizationCost = totalAnnualMobilizationHours * mobilizationRate;
        
        // 5b. Environmental Data (tax rate already fetched above)
        
        // 5c. Calculate Final Tax (on parts only)
        const finalTax = totalAnnualPartsCost * taxRate;
        
        // 5d. Calculate Grand Total
        const grandTotal = totalAnnualLaborCost + totalAnnualPartsCost + totalMobilizationCost + finalTax;
        
        // Calculate contract year multiplier
        const contractYears = contractLength / 12;
        
        // Multi-year handling with auto-fetched CPI
        const yearlyTotals = [];
        const baseYearTotal = grandTotal / contractYears;
        
        // Use the auto-fetched CPI rate (already fetched above)
        const escalationRate = typeof cpiRate === 'string' ? parseFloat(cpiRate) / 100 : cpiRate / 100;
        
        for (let year = 1; year <= Math.ceil(contractYears); year++) {
            const escalation = Math.pow(1 + escalationRate, year - 1);
            yearlyTotals.push({
                year,
                total: (baseYearTotal * escalation).toFixed(2)
            });
        }
        
        // 5e. Return the Final Object
        // Group breakdown by service for display
        const breakdownByService = {};
        serviceBreakdown.forEach(entry => {
            if (!breakdownByService[entry.serviceName]) {
                breakdownByService[entry.serviceName] = {
                    laborCost: 0,
                    partsCost: 0,
                    totalCost: 0,
                    laborHours: 0,
                    mobilizationHours: 0,
                    frequency: entry.frequencyMultiplier,  // BUG FIX #8: Include frequency for Zoho CPQ pricing
                    details: []
                };
            }
            breakdownByService[entry.serviceName].laborCost += entry.annualLaborCost;
            breakdownByService[entry.serviceName].partsCost += entry.annualPartsCost;
            breakdownByService[entry.serviceName].totalCost += entry.annualTotalCost;
            breakdownByService[entry.serviceName].laborHours += entry.annualLaborCost / this.laborRate;
            breakdownByService[entry.serviceName].mobilizationHours += entry.annualMobilizationHours;

            // Preserve fluid-specific costs for Service B and C
            if (entry.oilCost !== undefined) {
                breakdownByService[entry.serviceName].oilCost = (breakdownByService[entry.serviceName].oilCost || 0) + entry.oilCost;
            }
            if (entry.filterCost !== undefined) {
                breakdownByService[entry.serviceName].filterCost = (breakdownByService[entry.serviceName].filterCost || 0) + entry.filterCost;
            }
            if (entry.coolantCost !== undefined) {
                breakdownByService[entry.serviceName].coolantCost = (breakdownByService[entry.serviceName].coolantCost || 0) + entry.coolantCost;
            }
            if (entry.hoseBeltCost !== undefined) {
                breakdownByService[entry.serviceName].hoseBeltCost = (breakdownByService[entry.serviceName].hoseBeltCost || 0) + entry.hoseBeltCost;
            }
        });

        // ========== STEP 6: Calculate Quarterly Totals for PDF Generation ==========
        // Build quarterly breakdown based on service frequencies
        // Services with frequency 4+ distribute evenly across Q1-Q4
        // Services with frequency 1 appear in Q1 only
        // Services with frequency 2 appear in Q1 and Q3
        const quarterlyTotals = {
            q1: { labor: 0, materials: 0, mobilization: 0, total: 0 },
            q2: { labor: 0, materials: 0, mobilization: 0, total: 0 },
            q3: { labor: 0, materials: 0, mobilization: 0, total: 0 },
            q4: { labor: 0, materials: 0, mobilization: 0, total: 0 }
        };

        // Helper function to distribute costs based on frequency
        const distributeCostQuarterly = (annualCost, frequency) => {
            if (frequency >= 4) {
                // Quarterly or more frequent - distribute evenly
                const perQuarter = annualCost / 4;
                return [perQuarter, perQuarter, perQuarter, perQuarter];
            } else if (frequency === 2) {
                // Semi-annual - Q1 and Q3
                const perOccurrence = annualCost / 2;
                return [perOccurrence, 0, perOccurrence, 0];
            } else if (frequency === 1) {
                // Annual - Q1 only
                return [annualCost, 0, 0, 0];
            } else {
                // Less than annual - spread evenly
                const perQuarter = annualCost / 4;
                return [perQuarter, perQuarter, perQuarter, perQuarter];
            }
        };

        // Accumulate quarterly costs from each service
        Object.values(breakdownByService).forEach(service => {
            const frequency = service.frequency || 1;

            // Distribute labor costs
            const laborQuarterly = distributeCostQuarterly(service.laborCost || 0, frequency);
            quarterlyTotals.q1.labor += laborQuarterly[0];
            quarterlyTotals.q2.labor += laborQuarterly[1];
            quarterlyTotals.q3.labor += laborQuarterly[2];
            quarterlyTotals.q4.labor += laborQuarterly[3];

            // Distribute materials costs (parts)
            const materialsQuarterly = distributeCostQuarterly(service.partsCost || 0, frequency);
            quarterlyTotals.q1.materials += materialsQuarterly[0];
            quarterlyTotals.q2.materials += materialsQuarterly[1];
            quarterlyTotals.q3.materials += materialsQuarterly[2];
            quarterlyTotals.q4.materials += materialsQuarterly[3];

            // Distribute mobilization costs
            const mobilizationCost = (service.mobilizationHours || 0) * mobilizationRate;
            const mobilizationQuarterly = distributeCostQuarterly(mobilizationCost, frequency);
            quarterlyTotals.q1.mobilization += mobilizationQuarterly[0];
            quarterlyTotals.q2.mobilization += mobilizationQuarterly[1];
            quarterlyTotals.q3.mobilization += mobilizationQuarterly[2];
            quarterlyTotals.q4.mobilization += mobilizationQuarterly[3];
        });

        // Calculate totals for each quarter (including tax proportionally)
        const taxPerQuarter = finalTax / 4; // Distribute tax evenly across quarters
        quarterlyTotals.q1.total = quarterlyTotals.q1.labor + quarterlyTotals.q1.materials + quarterlyTotals.q1.mobilization + taxPerQuarter;
        quarterlyTotals.q2.total = quarterlyTotals.q2.labor + quarterlyTotals.q2.materials + quarterlyTotals.q2.mobilization + taxPerQuarter;
        quarterlyTotals.q3.total = quarterlyTotals.q3.labor + quarterlyTotals.q3.materials + quarterlyTotals.q3.mobilization + taxPerQuarter;
        quarterlyTotals.q4.total = quarterlyTotals.q4.labor + quarterlyTotals.q4.materials + quarterlyTotals.q4.mobilization + taxPerQuarter;

        return {
            success: true,
            calculation: {
                laborTotal: totalAnnualLaborCost.toFixed(2),
                partsTotal: totalAnnualPartsCost.toFixed(2),
                mobilizationTotal: totalMobilizationCost.toFixed(2),
                mobilizationSavings: "0.00",
                subtotal: (totalAnnualLaborCost + totalAnnualPartsCost + totalMobilizationCost).toFixed(2),
                tax: finalTax.toFixed(2),
                taxRate: (taxRate * 100).toFixed(3) + '%',
                total: grandTotal.toFixed(2),
                yearlyTotals,
                serviceBreakdown: breakdownByService,
                quarterlyTotals: quarterlyTotals,  // NEW: Quarterly breakdown for PDF generation
                mobilization: {
                    total: Math.round(totalMobilizationCost),
                    savings: 0,  // No stacking in the new model
                    hours: totalAnnualMobilizationHours,
                    rate: mobilizationRate
                },
                generators: generators.map(g => ({
                    ...g,
                    kwRange: this.getKwRange(g.kw)
                })),
                prevailingWageData: prevailingWageData,
                laborRateMultiplier: laborRateMultiplier,
                effectiveLaborRate: this.laborRate.toFixed(2),
                cpiRate: cpiRate
            }
        };
    }
    
    /**
     * Get frequency multiplier based on services and contract length
     */
    getFrequencyMultiplier(services, contractMonths) {
        // This function should NOT be used for individual service frequencies
        // Each service already has its frequency built into the calculation
        // This is only for contract year multiplier
        return contractMonths / 12;
    }
    
    /**
     * Get service frequency (visits per year)
     * This should use user-selected frequencies from the payload, not hardcoded values
     * For now, using hardcoded business rules:
     * - Annual: 1 visit per year
     * - Semi-Annual: 2 visits per year
     * - Quarterly: 4 visits per year
     */
    getServiceFrequency(serviceLetter, userFrequency = null) {
        // If user frequency is provided directly, use it
        if (userFrequency !== null && userFrequency !== undefined) {
            return userFrequency;
        }
        
        // TEMPORARY FIX: Use correct business logic defaults
        // These should eventually come from the frontend payload
        const defaultFrequencies = {
            'A': 1,  // Changed from 4 to 1 for Annual as per business requirement
            'B': 1,  // Annual
            'C': 1,  // Annual
            'D': 1,  // Annual
            'E': 1,  // Annual
            'F': 0,  // As needed
            'G': 0,  // As needed
            'H': 0,  // As needed
            'I': 1,  // Annual
            'J': 1   // Annual
        };
        
        // Return the corrected default frequency for the service
        return defaultFrequencies[serviceLetter] || 1;
    }
}

module.exports = EnergenCalculationEngine;