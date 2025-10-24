/**
 * @fileoverview Summary Calculator Module - Phase 3
 * Handles aggregation and display of quote summary calculations
 * Updates metrics cards and financial totals across all units
 *
 * @module frontend/modules/summary-calculator
 * @author Energen Team
 * @version 5.0.0
 */

// Import dependencies
import { updateStatus, showNotification, formatMoney } from '../js/utilities.js';
import { createLogger } from '../js/logger.js';

// Initialize logger
const logger = createLogger('SummaryCalculator');

// formatMoney imported from utilities.js

/**
 * Update metrics cards with aggregated totals
 * Reads from unit.serverCalculations for backend-calculated values
 * @param {Object} state - Application state
 */
export function updateMetrics(state) {
    logger.grandTrace('updateMetrics() FIRED', {
        unitsCount: state.units.length,
        activeSettings: state.activeSettings,
        timestamp: Date.now()
    });

    let totalQuote = 0;
    let totalHours = 0;
    let totalMaterials = 0;

    state.units.forEach(unit => {
        // Read from serverCalculations (where actual backend data is stored)
        if (unit.serverCalculations) {
            totalQuote += unit.serverCalculations.total || 0;
            // Calculate hours from labor cost and rate
            const laborRate = state.activeSettings?.laborRate || 200;
            totalHours += (unit.serverCalculations.laborCost || 0) / laborRate;
            totalMaterials += unit.serverCalculations.materialsCost || 0;
        }
    });

    // Update metric cards
    const totalQuoteEl = document.getElementById('total-quote');
    const totalHoursEl = document.getElementById('total-hours');
    const totalMaterialsEl = document.getElementById('total-materials');
    const unitCountEl = document.getElementById('unit-count');

    if (totalQuoteEl) totalQuoteEl.textContent = `$${formatMoney(totalQuote)}`;
    if (totalHoursEl) totalHoursEl.textContent = totalHours.toFixed(1);
    if (totalMaterialsEl) totalMaterialsEl.textContent = `$${formatMoney(totalMaterials)}`;
    if (unitCountEl) unitCountEl.textContent = state.units.length;
}

/**
 * Update summary display with aggregated calculations
 * REWRITTEN to be a "dumb" renderer that only reads from true state
 * @param {Object} state - Application state
 */
export function updateSummary(state) {
    logger.trace('Firing UNIFIED updateSummary()');
    logger.debug('[PHASE 3] updateSummary called, checking all units for server calculations');

    let grandTotal = 0;
    let totalLaborCost = 0;
    let totalLaborHours = 0;
    let totalMaterialsCost = 0;
    let totalMobilizationCost = 0;
    let totalMobilizationHours = 0;
    let totalMobilizationSavings = 0;
    let totalTax = 0;

    // CRITICAL FIX: Read directly from server-calculated totals
    const laborRate = state.activeSettings?.laborRate || 180;
    const mobilizationRate = state.activeSettings?.mobilizationRate || laborRate;

    state.units.forEach(unit => {
        logger.debug(`[PHASE 3] Unit ${unit.id} serverCalculations:`, unit.serverCalculations);

        if (unit.serverCalculations) {
            // Use the pre-calculated totals from the server
            const unitLaborCost = unit.serverCalculations.laborCost || 0;
            const unitMaterialsCost = unit.serverCalculations.materialsCost || 0;
            const unitMobilizationCost = unit.serverCalculations.mobilizationCost || 0;

            totalLaborCost += unitLaborCost;
            totalMaterialsCost += unitMaterialsCost;
            totalMobilizationCost += unitMobilizationCost;
            totalMobilizationSavings += unit.serverCalculations.mobilizationSavings || 0;
            totalTax += unit.serverCalculations.tax || 0;

            // Calculate hours from costs and rates
            totalLaborHours += unitLaborCost / laborRate;
            totalMobilizationHours += unitMobilizationCost / mobilizationRate;

            // Grand total is the final calculated total from server
            grandTotal += unit.serverCalculations.total || 0;
        }
    });

    logger.debug('[PHASE 3] Summary totals:', {
        grandTotal,
        totalLaborCost,
        totalLaborHours,
        totalMaterialsCost,
        totalMobilizationCost,
        totalMobilizationHours,
        totalMobilizationSavings,
        totalTax
    });

    // Update DOM elements
    updateSummaryDOM(grandTotal, totalLaborCost, totalLaborHours, totalMaterialsCost, totalMobilizationCost, totalMobilizationHours, totalTax);

    // Update unit count display
    const unitCountEl = document.querySelector('[data-metric="Units"] .metric-value');
    if (unitCountEl) unitCountEl.textContent = state.units.length;

    // Update the mobilization savings display if present
    const savingsEl = document.getElementById('mobilization-savings');
    if (savingsEl && totalMobilizationSavings > 0) {
        savingsEl.textContent = `Stacking Savings: $${totalMobilizationSavings.toFixed(2)}`;
    }
}

/**
 * Update summary DOM elements
 * @param {number} grandTotal - Total quote amount
 * @param {number} totalLaborCost - Total labor costs
 * @param {number} totalLaborHours - Total labor hours
 * @param {number} totalMaterialsCost - Total materials costs
 * @param {number} totalMobilizationCost - Total mobilization costs
 * @param {number} totalMobilizationHours - Total mobilization hours
 * @param {number} totalTax - Total tax amount
 */
function updateSummaryDOM(grandTotal, totalLaborCost, totalLaborHours, totalMaterialsCost, totalMobilizationCost, totalMobilizationHours, totalTax) {
    // BUG FIX: Summary labor hours (was showing $0)
    const summaryHoursEl = document.getElementById('summary-hours');
    if (summaryHoursEl) {
        summaryHoursEl.textContent = `${totalLaborHours.toFixed(1)} hrs`;
    }

    // Summary labor cost
    const summaryLaborEl = document.getElementById('summary-labor');
    if (summaryLaborEl) {
        summaryLaborEl.textContent = `$${formatMoney(totalLaborCost)}`;
    }

    // Summary materials
    const summaryMaterialsEl = document.getElementById('summary-materials');
    if (summaryMaterialsEl) {
        summaryMaterialsEl.textContent = `$${formatMoney(totalMaterialsCost)}`;
    }

    // BUG FIX: Summary mobilization hours (was showing $0)
    const summaryMobHoursEl = document.getElementById('summary-mobilization-hours');
    if (summaryMobHoursEl) {
        summaryMobHoursEl.textContent = `${totalMobilizationHours.toFixed(1)} hrs`;
    }

    // Summary mobilization cost
    const summaryMobilizationEl = document.getElementById('summary-mobilization');
    if (summaryMobilizationEl) {
        summaryMobilizationEl.textContent = `$${formatMoney(totalMobilizationCost)}`;
    }

    // BUG FIX: Summary tax (was showing $0)
    const summaryTaxEl = document.getElementById('summary-tax-amount');
    if (summaryTaxEl) {
        summaryTaxEl.textContent = `$${formatMoney(totalTax)}`;
    }

    // Grand total
    const summaryTotalEl = document.getElementById('summary-total');
    if (summaryTotalEl) {
        summaryTotalEl.textContent = `$${formatMoney(grandTotal)}`;
    }

    // Also update the large total display if it exists
    const largeTotalEl = document.getElementById('total-quote');
    if (largeTotalEl) {
        largeTotalEl.textContent = `$${formatMoney(grandTotal)}`;
    }

    // BUG FIX: Update annual-total in right sidebar
    const annualTotalEl = document.getElementById('annual-total');
    if (annualTotalEl) {
        annualTotalEl.textContent = `$${formatMoney(grandTotal)}`;
        console.log('[SIDEBAR] Updated annual-total:', grandTotal);
    }
}

/**
 * Calculate full quote across all units
 * Triggers recalculation for each unit and updates summary
 * @param {Object} state - Application state
 * @param {Event} event - Optional event object
 * @returns {Promise<void>}
 */
export async function calculateQuote(state, event = null) {
    logger.grandTrace('calculateQuote() START', {
        unitsCount: state.units.length,
        activeSettings: state.activeSettings,
        timestamp: Date.now()
    });

    const calcButton = event?.target || document.querySelector('[onclick*="calculateQuote"]');

    // BUG-006 FIX: Promise-based locking to prevent duplicate calculations
    // Wait for any ongoing calculation to complete before starting a new one
    if (state.calculationPromise) {
        logger.warn('⏸️ Calculation already in progress, waiting for completion');
        showNotification('Please wait, calculation in progress...', 'info', 1500);
        try {
            await state.calculationPromise;
        } catch (error) {
            // Previous calculation failed, continue with new one
        }
    }

    try {
        // Create new calculation promise that will be tracked
        let resolveCalculation, rejectCalculation;
        state.calculationPromise = new Promise((resolve, reject) => {
            resolveCalculation = resolve;
            rejectCalculation = reject;
        });
        
        // Legacy flag for backward compatibility
        state.isCalculating = true;

        // Show loading state
        setButtonLoading(calcButton, true, 'Calculating...');
        updateStatus('Calculating quote...');

        // Brief delay for UI responsiveness
        await new Promise(resolve => setTimeout(resolve, 50));

        // Perform calculations for each unit
        for (const unit of state.units) {
            updateStatus(`Calculating unit ${unit.number}...`);
            if (window.recalculateUnit) {
                await window.recalculateUnit(unit.id);
            }
        }

        updateStatus('Quote calculated successfully');
        showNotification('Quote calculation complete', 'success', 2000);
        
        // BUG-006 FIX: Resolve promise on success
        if (resolveCalculation) resolveCalculation();

    } catch (error) {
        logger.error('Calculation Error:', error);
        updateStatus('Calculation failed', 'error');
        showNotification(`Calculation failed: ${error.message}`, 'error');
        
        // BUG-006 FIX: Reject promise on error
        if (rejectCalculation) rejectCalculation(error);

    } finally {
        // Always restore button state and clear flags
        setButtonLoading(calcButton, false);
        state.isCalculating = false;
        state.calculationPromise = null; // BUG-006 FIX: Clear promise after completion
    }
}

/**
 * Build complete quote data model for export/save
 * Aggregates all unit data and calculations
 * @param {Object} state - Application state
 * @returns {Object} Complete quote data object
 */
export function buildQuoteData(state) {
    logger.grandTrace('buildQuoteData() FIRED', {
        units: state.units,
        activeSettings: state.activeSettings,
        timestamp: Date.now()
    });

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
        breakdownByService: {}, // CRITICAL FIX: PDF service expects this property name
        services: {}
    };

    // Aggregate from each unit's calculations
    state.units.forEach(unit => {
        // CRITICAL FIX: Use serverCalculations (where backend stores actual pricing data)
        // Fallback to calculations for backwards compatibility
        const calc = unit.serverCalculations || unit.calculations?.calculation || unit.calculations;

        if (calc) {

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
                    // Extract service code (e.g., "A - Comprehensive Inspection" -> "A")
                    const serviceCode = service.charAt(0);

                    // Build both old format (services) and new format (breakdownByService)
                    if (!aggregatedCalculations.services[service]) {
                        aggregatedCalculations.services[service] = {
                            grandTotal: 0
                        };
                    }

                    const serviceTotal = parseFloat(calc.serviceBreakdown[service].totalLabor || 0) +
                        parseFloat(calc.serviceBreakdown[service].totalParts || 0);

                    aggregatedCalculations.services[service].grandTotal += serviceTotal;

                    // CRITICAL FIX: Build breakdownByService for PDF generation
                    if (!aggregatedCalculations.breakdownByService[serviceCode]) {
                        aggregatedCalculations.breakdownByService[serviceCode] = {
                            grandTotal: 0,
                            total: 0,
                            laborCost: 0,
                            partsCost: 0
                        };
                    }

                    aggregatedCalculations.breakdownByService[serviceCode].grandTotal += serviceTotal;
                    aggregatedCalculations.breakdownByService[serviceCode].total += serviceTotal;
                    aggregatedCalculations.breakdownByService[serviceCode].laborCost += parseFloat(calc.serviceBreakdown[service].totalLabor || 0);
                    aggregatedCalculations.breakdownByService[serviceCode].partsCost += parseFloat(calc.serviceBreakdown[service].totalParts || 0);
                });
            }
        }
    });

    // CRITICAL FIX FOR ZOHO CPQ: Build rich service objects with pricing data
    // CPQ integration expects service.perVisitPrice field (see zoho-cpq-integration.cjs line 354)
    const allServiceCodes = new Set();
    const serviceDataMap = {};

    state.units.forEach(unit => {
        if (unit.services) {
            unit.services.forEach(serviceCode => {
                allServiceCodes.add(serviceCode);

                // Build service data object with pricing from serverCalculations
                if (!serviceDataMap[serviceCode] && unit.serverCalculations?.breakdown) {
                    // Find matching service in breakdown array
                    const svcData = unit.serverCalculations.breakdown.find(item =>
                        item.service && item.service.startsWith(serviceCode)
                    );

                    if (svcData) {
                        const frequency = unit.serviceFrequencies?.[serviceCode] || 1;
                        const totalCost = parseFloat(svcData.totalCost || svcData.total || 0);

                        serviceDataMap[serviceCode] = {
                            code: serviceCode,
                            name: svcData.service || `Service ${serviceCode}`,
                            frequency: frequency,
                            perVisitPrice: frequency > 0 ? totalCost / frequency : totalCost, // CRITICAL for CPQ
                            price: frequency > 0 ? totalCost / frequency : totalCost,
                            totalCost: totalCost,
                            laborCost: parseFloat(svcData.laborCost || 0),
                            partsCost: parseFloat(svcData.partsCost || 0),
                            laborHours: parseFloat(svcData.laborHours || 0)
                        };
                    }
                }
            });
        }
    });

    // Convert service map to array of rich service objects for Zoho CPQ
    const servicesArray = Array.from(allServiceCodes).map(code =>
        serviceDataMap[code] || { code, name: `Service ${code}`, perVisitPrice: 0 }
    );

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

    // Build customer object with correct property names for PDF service
    const companyName = document.getElementById('companyName')?.value || '';

    return {
        customer: {
            // CRITICAL FIX: PDF service expects 'company' or 'name', not 'companyName'
            company: companyName,
            name: companyName,
            companyName: companyName, // Keep for backwards compatibility
            phone: document.getElementById('phone')?.value || '',
            address: document.getElementById('address')?.value || '',
            city: document.getElementById('city')?.value || '',
            zip: document.getElementById('zip')?.value || '',
            state: state.enrichmentData?.state || '',
            ...state.enrichmentData
        },
        units: state.units,
        generators: generators,
        // CRITICAL FIX: Send simple array for PDF (expects codes), but also include rich objects for Zoho CPQ
        services: Array.from(allServiceCodes), // PDF service expects ["A", "B", "C"]
        servicesData: servicesArray, // Zoho CPQ expects rich objects with perVisitPrice
        calculations: aggregatedCalculations,
        metadata: {
            createdAt: new Date().toISOString(),
            version: '5.0.0'
        }
    };
}

// Helper functions - imported or accessed via window for UI functions
// formatMoney, updateStatus, showNotification imported from utilities.js

function setButtonLoading(button, loading, text = null) {
    if (window.setButtonLoading) {
        window.setButtonLoading(button, loading, text);
    }
}

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.summaryCalculator = {
        updateMetrics,
        updateSummary,
        calculateQuote,
        buildQuoteData
    };

    // BUG-004 FIX: Also expose functions directly on window for legacy code compatibility
    // service-pricing.js and other modules check for window.updateSummary and window.updateMetrics
    window.updateSummary = (stateOverride) => {
        const currentState = stateOverride || window.state;
        updateSummary(currentState);
    };

    window.updateMetrics = (stateOverride) => {
        const currentState = stateOverride || window.state;
        updateMetrics(currentState);
    };
}
