/**
 * Default Settings Constants - Hard-Coded Factory Defaults
 * @module frontend/config/default-settings-constants
 * @version 5.0.0
 *
 * IMPORTANT: These are the ONLY source of truth for default values.
 * Changes to these values require manual code editing.
 * Used for "Reset to Defaults" functionality.
 */

export const DEFAULT_SETTINGS = {
    // ===========================
    // LABOR & TRAVEL RATES
    // ===========================
    laborRate: 181.00,
    mobilizationRate: 181.00,
    travelRate: 100.00,              // Portal-to-portal overnight travel
    mileageRate: 2.50,               // Vehicle expenses per mile

    // Auto-calculated rates (based on laborRate)
    overtimeRate: 271.50,            // 1.5 × laborRate
    doubleTimeRate: 362.00,          // 2.0 × laborRate

    // ===========================
    // PRICING MODE
    // ===========================
    rateMode: 'private',             // 'private' | 'public-works' | 'government'

    // ===========================
    // MATERIALS & MARKUPS
    // ===========================
    oilPrice: 16.00,                 // Per gallon base cost
    oilMarkup: 1.5,                  // 150% markup
    coolantPrice: 25.00,             // Per gallon base cost
    coolantMarkup: 1.5,              // 150% markup
    partsMarkup: 0.20,               // 20% parts markup

    // ===========================
    // FLUID ANALYSIS (Service D)
    // ===========================
    oilAnalysisCost: 16.55,
    coolantAnalysisCost: 16.55,
    fuelAnalysisCost: 60.00,

    // ===========================
    // TAX & FEES
    // ===========================
    defaultTaxRate: 8.4,             // 8.4% default (can be overridden by API lookup)
    disposalFee: 35.00,
    permitFee: 250.00,
    annualIncrease: 3.0,             // 3% annual price increase

    // ===========================
    // SHOP LOCATION
    // ===========================
    shopAddress: '150 Mason Circle, Concord, CA 94520',
    distanceUnit: 'miles',           // 'miles' | 'km'
    defaultDistance: 0,              // Miles from shop (calculated per customer)

    // ===========================
    // SERVICE DEFAULTS
    // ===========================
    defaultFrequency: 'quarterly',   // Default service frequency
    includeTravel: true,
    includeTax: true,

    // ===========================
    // PREVAILING WAGE SETTINGS
    // ===========================
    prevailingWage: {
        enabled: false,
        classification: 'group8',    // Operating Engineers Group 8
        zone: 'zone3',               // Central Valley base rate
        zoneMultiplier: 1.00,
        baseWage: 0,                 // Set dynamically based on classification
        fringeBenefits: 0,
        healthWelfare: 0,
        pension: 0
    },

    // ===========================
    // PDF SETTINGS
    // ===========================
    showLogo: true,
    showTerms: true,
    pdfOrientation: 'portrait',

    // ===========================
    // API INTEGRATION TOGGLES
    // ===========================
    api: {
        googleMapsEnabled: true,
        googlePlacesEnabled: true,
        zohoSyncEnabled: true,
        pdfGenerationEnabled: true,
        taxLookupEnabled: true,
        brandFetchEnabled: true
    },

    // ===========================
    // DISPLAY SETTINGS
    // ===========================
    display: {
        theme: 'dark',
        showMetrics: true,
        showAnimations: true
    },

    // ===========================
    // AUTO-SAVE SETTINGS
    // ===========================
    autoSave: true,
    autoSyncZoho: true,

    // ===========================
    // SERVICE A - COMPREHENSIVE INSPECTION
    // ===========================
    serviceA: {
        name: 'Service A - Comprehensive Inspection (Quarterly)',
        frequency: 4,
        enabled: true
    },

    // ===========================
    // SERVICE B - OIL & FILTER
    // ===========================
    serviceB: {
        name: 'Service B - Oil & Filter Service (Annual)',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // SERVICE C - COOLANT
    // ===========================
    serviceC: {
        name: 'Service C - Coolant Service (Annual/Biannual)',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // SERVICE D - FLUID ANALYSIS
    // ===========================
    serviceD: {
        name: 'Service D - Oil, Fuel & Coolant Analysis',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // SERVICE E - LOAD BANK
    // ===========================
    serviceE: {
        name: 'Service E - Load Bank Testing',
        frequency: 1,
        enabled: true,
        loadBankRentalBase: 500,
        transformerRentalBase: 300
    },

    // ===========================
    // SERVICE F - DIESEL TUNE-UP
    // ===========================
    serviceF: {
        name: 'Service F - Engine Tune-Up (Diesel)',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // SERVICE G - GAS TUNE-UP
    // ===========================
    serviceG: {
        name: 'Service G - Gas Engine Tune-Up',
        frequency: 1,
        enabled: true,
        sparkPlugCost: 25.00,
        ignitionKitBase: 150.00
    },

    // ===========================
    // SERVICE H - ELECTRICAL TEST
    // ===========================
    serviceH: {
        name: 'Service H - Generator Electrical Testing',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // SERVICE I - TRANSFER SWITCH
    // ===========================
    serviceI: {
        name: 'Service I - Transfer Switch Service',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // SERVICE J - THERMAL IMAGING
    // ===========================
    serviceJ: {
        name: 'Service J - Thermal Imaging Scan',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // BATTERY SERVICE
    // ===========================
    batteryService: {
        name: 'Battery Service',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // FUEL POLISHING
    // ===========================
    fuelPolishing: {
        name: 'Fuel Polishing',
        frequency: 1,
        enabled: true
    },

    // ===========================
    // METADATA
    // ===========================
    version: '5.0.0',
    lastModified: '2025-01-04',
    description: 'Energen Calculator Default Settings - Factory Baseline'
};

/**
 * Get a deep clone of default settings
 * Prevents mutations to the original defaults
 */
export function getDefaultSettings() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

/**
 * Reset specific setting to default value
 * @param {string} path - Dot notation path (e.g., 'laborRate' or 'api.zohoSyncEnabled')
 */
export function getDefaultValue(path) {
    const keys = path.split('.');
    let value = DEFAULT_SETTINGS;

    for (const key of keys) {
        if (value[key] === undefined) {
            console.warn(`Default value not found for path: ${path}`);
            return null;
        }
        value = value[key];
    }

    return value;
}

/**
 * Validate settings object against defaults structure
 * @param {Object} settings - Settings object to validate
 * @returns {Object} Validated settings with defaults filled in for missing values
 */
export function validateSettings(settings) {
    const defaults = getDefaultSettings();

    function mergeDefaults(target, source) {
        const result = { ...source };

        for (const key in target) {
            if (typeof target[key] === 'object' && !Array.isArray(target[key]) && target[key] !== null) {
                result[key] = mergeDefaults(target[key], source[key] || {});
            } else if (source[key] === undefined) {
                result[key] = target[key];
            }
        }

        return result;
    }

    return mergeDefaults(defaults, settings);
}

export default DEFAULT_SETTINGS;
