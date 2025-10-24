/**
 * @fileoverview Summary Calculator Module - Enhanced with Hashing & Versioning
 * Extends summary-calculator.js with calculation state hash and version management
 * Sprint 4: Calculation State Hash & Versioning
 *
 * @module frontend/modules/summary-calculator-enhanced
 * @author Energen Team
 * @version 5.0.0
 */

import { updateStatus, showNotification, formatMoney } from '../js/utilities.js';
import { generateCalculationHash, getHashSummary } from './calculation-hash.js';
import {
    initializeQuoteVersion,
    QuoteStatus,
    generateFilename,
    getWatermark
} from './quote-versioning.js';

// Import base functions from original module
import {
    updateMetrics as baseUpdateMetrics,
    updateSummary as baseUpdateSummary,
    calculateQuote as baseCalculateQuote
} from './summary-calculator.js';

/**
 * Enhanced buildQuoteData with calculation hash and versioning
 * This replaces the original buildQuoteData function
 *
 * @param {Object} state - Application state
 * @param {Object} options - Build options
 * @param {Object} options.customerData - Optional customer data override
 * @param {boolean} options.includeHash - Include calculation hash (default: true)
 * @param {boolean} options.includeVersion - Include version metadata (default: true)
 * @returns {Promise<Object>} Complete quote data with hash and version
 */
export async function buildQuoteDataEnhanced(state, options = {}) {
    const {
        customerData = null,
        includeHash = true,
        includeVersion = true
    } = options;

    console.log('[ENHANCED] Building quote data with hash and versioning...');

    // Build base quote data (original function logic)
    const baseQuote = buildBaseQuoteData(state, customerData);

    // Generate calculation state hash
    let hashResult = null;
    if (includeHash) {
        try {
            hashResult = await generateCalculationHash(state, customerData);
            console.log('[ENHANCED] Hash generated:', getHashSummary(hashResult));
        } catch (error) {
            console.error('[ENHANCED] Failed to generate hash:', error);
            // Continue without hash rather than failing
        }
    }

    // Initialize or retrieve version metadata
    let versionMeta = null;
    if (includeVersion) {
        // Check if quote already has version metadata
        if (state.quoteMetadata?.version) {
            versionMeta = state.quoteMetadata;
        } else {
            // Initialize new version metadata
            versionMeta = initializeQuoteVersion();
        }

        // Attach hash to version metadata
        if (hashResult) {
            versionMeta.calcStateHash = hashResult;
        }
    }

    // Enhanced metadata
    const enhancedMetadata = {
        ...baseQuote.metadata,

        // Calculation state hash
        calcStateHash: hashResult?.hash || null,
        hashTimestamp: hashResult?.timestamp || null,
        hashVersion: hashResult?.version || '1.0',

        // Version control
        version: versionMeta?.version || { major: 1, minor: 0, string: 'v1.0' },
        status: versionMeta?.status || QuoteStatus.DRAFT,
        bidNumber: versionMeta?.bidNumber || null,

        // Timestamps
        createdAt: versionMeta?.createdAt || new Date().toISOString(),
        modifiedAt: new Date().toISOString(),

        // Version history
        previousVersion: versionMeta?.previousVersion || null,
        changeLog: versionMeta?.changeLog || [],

        // System version
        engineVersion: '5.0.0',

        // Watermark info (for PDF generation)
        watermark: getWatermark(versionMeta?.status || QuoteStatus.DRAFT, versionMeta?.supersededBy),

        // Filename info (for PDF generation)
        suggestedFilename: generateFilename(
            versionMeta?.status || QuoteStatus.DRAFT,
            versionMeta?.bidNumber,
            versionMeta?.version,
            new Date()
        )
    };

    return {
        ...baseQuote,
        metadata: enhancedMetadata
    };
}

/**
 * Base quote data builder (original logic from summary-calculator.js)
 * @private
 */
function buildBaseQuoteData(state, customerData = null) {
    // Aggregate calculations from all units
    let aggregatedCalculations = {
        laborTotal: 0,
        partsTotal: 0,
        travelTotal: 0,
        mileageCost: 0,
        freightTotal: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        annual: 0,
        threeYearTotal: 0,
        laborHours: {
            serviceA: 0,
            serviceB: 0,
            loadbank: 0
        },
        serviceBreakdown: {},
        services: {}
    };

    // Aggregate from each unit's calculations
    state.units.forEach(unit => {
        if (unit.calculations) {
            // Handle both nested and flat structure
            const calc = unit.calculations.calculation || unit.calculations;

            // Add up totals
            aggregatedCalculations.laborTotal += parseFloat(calc.laborTotal || 0);
            aggregatedCalculations.partsTotal += parseFloat(calc.partsTotal || 0);
            aggregatedCalculations.travelTotal += parseFloat(calc.travelTotal || calc.travelCost || 0);
            aggregatedCalculations.mileageCost += parseFloat(calc.mileageCost || calc.travelTotal || 0);
            aggregatedCalculations.freightTotal += parseFloat(calc.freightTotal || 0);
            aggregatedCalculations.subtotal += parseFloat(calc.subtotal || 0);
            aggregatedCalculations.tax += parseFloat(calc.tax || 0);
            aggregatedCalculations.total += parseFloat(calc.total || 0);
            aggregatedCalculations.annual += parseFloat(calc.annual || calc.total || 0);
            aggregatedCalculations.threeYearTotal += parseFloat(calc.threeYearTotal || 0);

            // Add up labor hours
            if (calc.laborHours) {
                aggregatedCalculations.laborHours.serviceA += parseFloat(calc.laborHours.serviceA || 0);
                aggregatedCalculations.laborHours.serviceB += parseFloat(calc.laborHours.serviceB || 0);
                aggregatedCalculations.laborHours.loadbank += parseFloat(calc.laborHours.loadbank || 0);
            }

            // Merge service breakdowns
            if (calc.serviceBreakdown) {
                Object.keys(calc.serviceBreakdown).forEach(service => {
                    if (!aggregatedCalculations.services[service]) {
                        aggregatedCalculations.services[service] = {
                            grandTotal: 0
                        };
                    }
                    aggregatedCalculations.services[service].grandTotal +=
                        parseFloat(calc.serviceBreakdown[service].totalLabor || 0) +
                        parseFloat(calc.serviceBreakdown[service].totalParts || 0);
                });
            }
        }
    });

    // Collect all selected services from units
    const allServices = new Set();
    state.units.forEach(unit => {
        if (unit.services) {
            unit.services.forEach(service => allServices.add(service));
        }
    });

    // Build generators array from units
    const generators = state.units.map(unit => ({
        id: unit.id,
        kw: unit.kw,
        model: unit.model || '',
        brand: unit.brand || '',
        voltage: unit.voltage || '480V',
        cylinders: unit.cylinders || 6,
        injectorType: unit.injectorType || 'Pop Noz',
        location: unit.location || 'Main Facility'
    }));

    // Get customer data
    const customer = customerData || {
        companyName: document.getElementById('companyName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        address: document.getElementById('address')?.value || '',
        city: document.getElementById('city')?.value || '',
        zip: document.getElementById('zip')?.value || '',
        ...state.enrichmentData
    };

    return {
        customer,
        units: state.units,
        generators,
        services: Array.from(allServices),
        calculations: aggregatedCalculations,
        metadata: {
            createdAt: new Date().toISOString(),
            version: '5.0.0'
        }
    };
}

/**
 * Quick build without hash/version for performance-critical scenarios
 * @param {Object} state - Application state
 * @returns {Object} Quote data without hash/version
 */
export function buildQuoteDataFast(state) {
    return buildBaseQuoteData(state);
}

// Re-export base functions
export {
    baseUpdateMetrics as updateMetrics,
    baseUpdateSummary as updateSummary,
    baseCalculateQuote as calculateQuote
};

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.summaryCalculatorEnhanced = {
        buildQuoteDataEnhanced,
        buildQuoteDataFast,
        updateMetrics: baseUpdateMetrics,
        updateSummary: baseUpdateSummary,
        calculateQuote: baseCalculateQuote
    };

    // Also expose as default buildQuoteData (replaces original)
    window.buildQuoteData = buildQuoteDataEnhanced;
}

export default {
    buildQuoteDataEnhanced,
    buildQuoteDataFast,
    updateMetrics: baseUpdateMetrics,
    updateSummary: baseUpdateSummary,
    calculateQuote: baseCalculateQuote
};
