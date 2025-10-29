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

    // UPDATE QUARTERLY TOTALS (FIX FOR ISSUE #2)
    // Calculate quarterly distribution (assuming equal distribution for now)
    // TODO: Get actual quarterly breakdown from API response if available
    const quarterlyTotal = grandTotal / 4;

    const q1El = document.getElementById('q1-total');
    const q2El = document.getElementById('q2-total');
    const q3El = document.getElementById('q3-total');
    const q4El = document.getElementById('q4-total');

    if (q1El) q1El.textContent = `$${formatMoney(quarterlyTotal)}`;
    if (q2El) q2El.textContent = `$${formatMoney(quarterlyTotal)}`;
    if (q3El) q3El.textContent = `$${formatMoney(quarterlyTotal)}`;
    if (q4El) q4El.textContent = `$${formatMoney(quarterlyTotal)}`;
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

    // Build comprehensive settings object from state.activeSettings
    // FIXED: Use ALL settings from modal, not just labor rates
    const settings = {
        // Labor & Travel rates
        laborRate: state.activeSettings?.laborRate || 180.00,
        mobilizationRate: state.activeSettings?.mobilizationRate || 180.00,
        overtimeRate: state.activeSettings?.overtimeRate || 270.00,
        doubleTimeRate: state.activeSettings?.doubleTimeRate || 360.00,
        travelTimeRate: state.activeSettings?.travelTimeRate || 100.00,
        mileageRate: state.activeSettings?.mileageRate || 2.50,

        // Shop location
        shopAddress: state.activeSettings?.shopAddress || '150 Mason Circle, Suite K, Concord, CA 94520',
        distanceFromShop: state.activeSettings?.distanceFromShop || 0,

        // Tax settings
        currentTaxRate: state.activeSettings?.currentTaxRate || 8.4,

        // Material costs - use settings, allow UI override if present
        oilCost: state.activeSettings?.oilCost || 16.00,
        oilMarkup: state.activeSettings?.oilMarkup || 1.5,
        coolantCost: state.activeSettings?.coolantCost || 15.00,
        coolantMarkup: state.activeSettings?.coolantMarkup || 1.5,
        partsMarkup: state.activeSettings?.partsMarkup || 1.25,
        freightRate: state.activeSettings?.freightRate || 0.05,

        // Analysis & Inspection costs
        fuelAnalysisCost: state.activeSettings?.fuelAnalysisCost || 60.00,
        oilAnalysisCost: state.activeSettings?.oilAnalysisCost || 16.55,
        coolantAnalysisCost: state.activeSettings?.coolantAnalysisCost || 16.55,
        airFilterCost: state.activeSettings?.airFilterCost || 100.00,
        numberOfInspections: state.activeSettings?.numberOfInspections || 4,

        // Other costs
        transformerRental: state.activeSettings?.transformerRental || 1500.00,
        deliveryCost: state.activeSettings?.deliveryCost || 3500.00,
        annualEscalation: state.activeSettings?.annualEscalation || 2.5,

        // Allow UI override for oil price/markup (for backwards compatibility)
        oilPrice: parseFloat(document.getElementById('oilPrice')?.value) || state.activeSettings?.oilCost || 16.00,
        oilPriceMarkup: parseFloat(document.getElementById('oilMarkup')?.value) || state.activeSettings?.oilMarkup || 1.5,

        // CRITICAL: Include service-specific data (labor hours, mobilization hours, parts costs per kW range)
        // This allows per-quote customization from the settings modal
        // Format: serviceA: { name, frequency, data: { "2-14": { labor, mobilization, parts } } }
        ...(state.activeSettings?.services || {})
    };

    // Override labor rate if prevailing wage is enabled
    if (state.prevailingWageRequired) {
        // Try to get final rate from settings modal
        const pwFinalRate = parseFloat(document.getElementById('pwFinalRate')?.value);

        if (pwFinalRate && pwFinalRate > 0) {
            settings.laborRate = pwFinalRate;
            settings.mobilizationRate = pwFinalRate;

            console.log('Using prevailing wage labor rate:', pwFinalRate);
        } else {
            console.warn('Prevailing wage enabled but no rate found, using default');
        }
    }

    // Include prevailing wage metadata if enabled
    let prevailingWageData = null;
    if (state.prevailingWageRequired) {
        prevailingWageData = {
            enabled: true,
            apiRate: parseFloat(document.getElementById('pwApiRate')?.value) || 0,
            businessOverhead: parseFloat(document.getElementById('businessOverhead')?.value) || 0,
            calculatedRate: parseFloat(document.getElementById('pwCalculatedRate')?.value) || 0,
            finalRate: parseFloat(document.getElementById('pwFinalRate')?.value) || 0,
            isOverridden: document.getElementById('pwFinalRate')?.dataset.manualOverride === 'true',
            zipCode: document.getElementById('pwZipCode')?.value || '',
            county: document.getElementById('pwCounty')?.value || '',
            classification: document.getElementById('pwClassification')?.value || ''
        };
    }

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
        settings: settings,
        prevailingWageData: prevailingWageData,
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
