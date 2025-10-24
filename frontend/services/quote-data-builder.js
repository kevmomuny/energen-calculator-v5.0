/**
 * Quote Data Builder - Constructs complete quote data for PDF/exports
 * @module frontend/services/quote-data-builder
 * @version 5.0.0
 *
 * Ported from v4.5 buildQuoteData() to ensure PDF generation receives
 * complete data structure including aggregated calculations, formatted
 * generators array, and enrichment data.
 */

// Import service schedule calculator and calculation hash
import { calculateServiceSchedule } from '../modules/service-schedule-calculator.js';
import { generateCalculationHash } from '../modules/calculation-hash.js';

/**
 * Build complete quote data from application state
 * @param {Object} state - Application state object
 * @param {Object} options - Optional parameters for quote generation
 * @returns {Promise<Object>} Complete quote data structure for PDF/export
 */
export async function buildQuoteData(state, options = {}) {
    // Aggregate calculations from all units
    let aggregatedCalculations = {
        laborCost: 0,
        materialsCost: 0,
        mobilizationCost: 0,
        mobilizationSavings: 0,
        subtotal: 0,
        tax: 0,
        total: 0,
        annual: 0,
        laborHours: 0,
        mobilizationHours: 0,
        serviceBreakdown: {},
        breakdown: []
    };

    // Aggregate from each unit's calculations
    // BUG FIX: Read from serverCalculations (Phase 3 backend data) not calculations
    state.units.forEach(unit => {
        if (unit.serverCalculations) {
            const calc = unit.serverCalculations;

            // Add up totals
            aggregatedCalculations.laborCost += parseFloat(calc.laborCost || 0);
            aggregatedCalculations.materialsCost += parseFloat(calc.materialsCost || 0);
            aggregatedCalculations.mobilizationCost += parseFloat(calc.mobilizationCost || 0);
            aggregatedCalculations.mobilizationSavings += parseFloat(calc.mobilizationSavings || 0);
            aggregatedCalculations.subtotal += parseFloat(calc.subtotal || 0);
            aggregatedCalculations.tax += parseFloat(calc.tax || 0);
            aggregatedCalculations.total += parseFloat(calc.total || 0);
            aggregatedCalculations.annual += parseFloat(calc.total || 0); // Annual = total in v5.0
            aggregatedCalculations.laborHours += parseFloat(calc.laborHours || 0);
            aggregatedCalculations.mobilizationHours += parseFloat(calc.mobilizationHours || 0);

            // Merge service breakdowns from serviceBreakdown array
            if (calc.serviceBreakdown && Array.isArray(calc.serviceBreakdown)) {
                calc.serviceBreakdown.forEach(service => {
                    const serviceCode = service.serviceCode || service.code;
                    if (!aggregatedCalculations.serviceBreakdown[serviceCode]) {
                        aggregatedCalculations.serviceBreakdown[serviceCode] = {
                            name: service.name,
                            laborCost: 0,
                            partsCost: 0,
                            totalCost: 0,
                            laborHours: 0,
                            mobilizationHours: 0,
                            frequency: service.frequency || 1,
                            quarterlyTotal: 0
                        };
                    }

                    const breakdown = aggregatedCalculations.serviceBreakdown[serviceCode];
                    breakdown.laborCost += parseFloat(service.laborCost || 0);
                    breakdown.partsCost += parseFloat(service.partsCost || 0);
                    breakdown.totalCost += parseFloat(service.totalCost || 0);
                    breakdown.laborHours += parseFloat(service.laborHours || 0);
                    breakdown.mobilizationHours += parseFloat(service.mobilizationHours || 0);

                    // Calculate quarterly total based on frequency
                    const frequency = service.frequency || 1;
                    breakdown.quarterlyTotal = breakdown.totalCost * frequency;
                });
            }
        }
    });

    // Convert serviceBreakdown object to array for PDF
    aggregatedCalculations.breakdown = Object.entries(aggregatedCalculations.serviceBreakdown)
        .map(([code, data]) => ({
            serviceCode: code,
            name: data.name,
            laborCost: data.laborCost,
            partsCost: data.partsCost,
            totalCost: data.totalCost,
            laborHours: data.laborHours,
            mobilizationHours: data.mobilizationHours,
            frequency: data.frequency,
            quarterlyTotal: data.quarterlyTotal
        }));

    // CRITICAL: Also create breakdownByService for PDF generator compatibility
    // The PDF service expects calculation.breakdownByService[serviceCode]
    aggregatedCalculations.breakdownByService = {};
    Object.entries(aggregatedCalculations.serviceBreakdown).forEach(([code, data]) => {
        aggregatedCalculations.breakdownByService[code] = {
            grandTotal: data.totalCost,
            total: data.totalCost,
            laborCost: data.laborCost,
            partsCost: data.partsCost,
            laborHours: data.laborHours,
            mobilizationHours: data.mobilizationHours,
            frequency: data.frequency
        };
    });

    // Collect all selected services from units
    const allServices = new Set();
    state.units.forEach(unit => {
        if (unit.services && Array.isArray(unit.services)) {
            unit.services.forEach(service => allServices.add(service));
        }
    });

    // Build generators array from units with formatted data for PDF
    const generators = state.units.map(unit => ({
        id: unit.id,
        number: unit.number,
        kw: unit.kw,
        model: unit.model || '',
        brand: unit.brand || '',
        fuel: unit.fuel || 'Diesel',
        location: unit.location || 'Main Facility',
        serialNumber: unit.serialNumber || unit.serial || '',
        installYear: unit.installYear || '',
        cylinders: unit.cylinders || '',
        voltage: unit.voltage || '480V',
        // Include the unit's services for per-unit breakdown
        services: unit.services || [],
        serviceFrequencies: unit.serviceFrequencies || {},
        // BUG FIX: Pass serverCalculations (backend data) to PDF/Zoho
        calculations: unit.serverCalculations || unit.calculations || {}
    }));

    // Get customer data from DOM elements
    const companyName = document.getElementById('companyName')?.value || '';
    const customer = {
        companyName: companyName,
        company: companyName,  // PDF service expects 'company' field
        name: companyName,     // Backend also checks 'name' field
        phone: document.getElementById('phone')?.value || '',
        email: document.getElementById('email')?.value || '',
        address: document.getElementById('address')?.value || '',
        city: document.getElementById('city')?.value || '',
        state: document.getElementById('state')?.value || '',
        zip: document.getElementById('zip')?.value || '',
        extension: document.getElementById('extension')?.value || '',
        website: document.getElementById('website')?.value || '',
        distance: parseFloat(document.getElementById('distance')?.value || 0)
    };

    // Add enrichment data if available (contact person, etc.)
    if (state.enrichmentData) {
        Object.assign(customer, state.enrichmentData);
    }

    // Add contact if available
    if (state.contacts && state.contacts.length > 0) {
        customer.contact = state.contacts[0];
    }

    // WORKFLOW BIBLE REQUIREMENT: Calculate service schedule (quarterly assignment)
    // This is called BEFORE PDF generation as per Phase 2.5 in COMPLETE_BID_WORKFLOW.md
    let serviceSchedule = null;
    try {
        const bidCreationDate = options.bidCreationDate || new Date();
        serviceSchedule = calculateServiceSchedule(state, bidCreationDate);
        console.log('[QUOTE BUILDER] Service schedule calculated:', serviceSchedule);
    } catch (error) {
        console.error('[QUOTE BUILDER] Failed to calculate service schedule:', error);
        // Continue without schedule - not critical for quote
    }

    // WORKFLOW BIBLE REQUIREMENT: Generate calculation state hash
    // Enables exact recreation of calculations and audit trail (Phase 4, lines 276-292)
    let calcStateHash = null;
    let hashResult = null;
    try {
        hashResult = await generateCalculationHash(state, customer);
        calcStateHash = hashResult.hash;
        console.log('[QUOTE BUILDER] Calculation hash generated:', calcStateHash?.substring(0, 16) + '...');
    } catch (error) {
        console.error('[QUOTE BUILDER] Failed to generate calculation hash:', error);
        // Continue without hash - not critical for quote
    }

    // Collect CUSTOM services from all units for Zoho Product Configurator
    const customServices = {};
    state.units.forEach(unit => {
        if (unit.customServices && unit.customServices.CUSTOM) {
            if (!customServices.CUSTOM) {
                customServices.CUSTOM = [];
            }
            // Aggregate custom service entries from all units
            customServices.CUSTOM = customServices.CUSTOM.concat(unit.customServices.CUSTOM);
        }
    });

    // Build complete quote data structure
    return {
        customer: customer,
        units: state.units,
        generators: generators,
        services: Array.from(allServices),
        calculation: aggregatedCalculations,      // PDF service expects 'calculation' (singular)
        calculations: aggregatedCalculations,     // Keep for backward compatibility
        customServices: customServices,           // CUSTOM services for Zoho Product Configurator
        settings: state.activeSettings || {},
        serviceSchedule: serviceSchedule,         // WORKFLOW BIBLE: Quarterly service assignment
        metadata: {
            createdAt: new Date().toISOString(),
            version: '5.0.0',
            estimateNumber: `EST-${Date.now()}`,
            calcStateHash: calcStateHash,         // WORKFLOW BIBLE: Calculation state hash
            hashDetails: hashResult               // Full hash result with included data
        }
    };
}

/**
 * Export singleton helper for convenience
 */
export default {
    buildQuoteData
};
