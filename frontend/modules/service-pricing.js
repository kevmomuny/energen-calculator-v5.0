/**
 * Service Pricing Module
 * Handles all service price calculations and updates
 * @module service-pricing
 * @version 5.0.0
 */

// Import dependencies
import { updateStatus, showNotification, debounce } from '../js/utilities.js';

// debounce imported from utilities.js

/**
 * Update service prices based on kW and frequency - CONSOLIDATED SERVER CALCULATION
 * Fetches both preview prices AND totals in one API request
 * @param {string} unitId - The ID of the unit to update prices for
 * @returns {Promise<void>}
 */
async function updateServicePrices(unitId) {
    console.log('%c=== CONSOLIDATED PRICING: updateServicePrices() START ===', 'background: #00008b; color: #00ffff', { unitId, activeSettings: window.state.activeSettings, timestamp: Date.now() });
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit || !unit.kw) {
        console.warn(`Skipping price update for unit ${unitId}, missing data.`);
        return;
    }

    try {
        // MANDATORY SETTINGS LOAD - NO CALCULATIONS WITHOUT THEM
        // This blocks until settings are loaded or timeout occurs
        if (!window.state.settingsLoaded || !window.state.activeSettings) {
            console.warn('⚠️ Settings not loaded, blocking until ready...');
            try {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        clearInterval(checkSettings);
                        reject(new Error('Settings failed to load within 5 seconds'));
                    }, 5000);

                    const checkSettings = setInterval(() => {
                        if (window.state.settingsLoaded && window.state.activeSettings) {
                            clearInterval(checkSettings);
                            clearTimeout(timeout);
                            resolve();
                        }
                    }, 50);
                });
            } catch (error) {
                console.error('❌ FATAL: Settings not loaded - cannot calculate prices');
                showNotification('Settings failed to load. Please refresh the page.', 'error');
                throw error; // Stop execution - no fallback calculations allowed
            }
        }

        // Now extract settings directly - NO fallbacks, settings are guaranteed loaded
        const essentialSettings = {
            laborRate: window.state.activeSettings.laborRate,
            mobilizationRate: window.state.activeSettings.mobilizationRate,
            oilPrice: window.state.activeSettings.oilPrice,
            oilMarkup: window.state.activeSettings.oilMarkup,
            coolantPrice: window.state.activeSettings.coolantPrice,
            coolantMarkup: window.state.activeSettings.coolantMarkup,
            partsMarkup: window.state.activeSettings.partsMarkup,
            freightMarkup: window.state.activeSettings.freightMarkup,
            oilAnalysisCost: window.state.activeSettings.oilAnalysisCost,
            coolantAnalysisCost: window.state.activeSettings.coolantAnalysisCost,
            fuelAnalysisCost: window.state.activeSettings.fuelAnalysisCost,
            shopPrepRate: window.state.activeSettings.shopPrepRate,
            taxRate: window.state.activeSettings.taxRate,
            // Include service data structures for calculation engine
            serviceA: window.state.activeSettings.serviceA,
            serviceB: window.state.activeSettings.serviceB,
            serviceC: window.state.activeSettings.serviceC,
            serviceD: window.state.activeSettings.serviceD,
            serviceE: window.state.activeSettings.serviceE,
            serviceF: window.state.activeSettings.serviceF,
            serviceG: window.state.activeSettings.serviceG,
            serviceH: window.state.activeSettings.serviceH,
            serviceI: window.state.activeSettings.serviceI,
            serviceJ: window.state.activeSettings.serviceJ
        };

        // DIAGNOSTIC: Check services array right before API call
        console.log('%c🚨 CRITICAL DIAGNOSTIC: RIGHT BEFORE API CALL', 'background: red; color: yellow; font-size: 16px', {
            unitId,
            servicesArray: [...(unit.services || [])],
            servicesLength: unit.services?.length || 0,
            unitObject: unit,
            timestamp: Date.now()
        });

        // CONSOLIDATED API CALL: Get both preview prices AND totals in one request
        const response = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/calculate-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kw: unit.kw,
                services: unit.services || [],
                distance: window.state.distance || 25,
                settings: essentialSettings,
                serviceFrequencies: unit.serviceFrequencies || {},
                serviceDFluids: unit.serviceDFluids || {},
                customServices: unit.customServices || {},
                atsUnits: unit.atsUnits || [{ id: 1, includeMobilization: false }] // ATS units for Service I
            })
        });

        if (!response.ok) {
            throw new Error('Consolidated calculation failed');
        }

        const { previewPrices, priceData } = await response.json();
        console.log('✅ Received preview prices:', previewPrices);

        // Update each service card with preview pricing
        for (const service of previewPrices) {
            const serviceCode = service.serviceCode;

            // Skip Service D (handled by fluid checkboxes)
            if (serviceCode === 'D') continue;

            // Calculate mobilization cost from hours and rate (settings guaranteed loaded)
            const mobilizationRate = essentialSettings.mobilizationRate;
            const mobilizationCost = Math.round((service.mobilizationHours || 0) * mobilizationRate);
            const completeTotal = service.laborCost + service.partsCost + mobilizationCost;

            // Update price display with complete total (labor + parts + mobilization)
            const priceElement = document.getElementById(`${unitId}-service-${serviceCode}-price`);
            if (priceElement && completeTotal != null) {
                // BUG-025 FIX: Use DOM methods instead of innerHTML to prevent XSS
                const span = document.createElement('span');
                span.style.color = 'var(--accent-electric)';
                span.style.fontWeight = '600';
                span.textContent = `$${completeTotal.toLocaleString()}/yr`;
                priceElement.replaceChildren(span);
            }

            // Update breakdown display with 3 or 4 components based on service type
            const breakdownElement = document.getElementById(`${unitId}-service-${serviceCode}-breakdown`);
            if (breakdownElement && service.laborCost != null && service.partsCost != null) {
                let breakdownText = '';

                if (serviceCode === 'B' && service.oilCost !== undefined && service.filterCost !== undefined) {
                    // Service B: Labor, Mob, Oil, Filters (4 components)
                    breakdownText = `Labor: $${service.laborCost.toLocaleString()} • Mob: $${mobilizationCost.toLocaleString()} • Oil: $${service.oilCost.toLocaleString()} • Filters: $${service.filterCost.toLocaleString()}`;
                } else if (serviceCode === 'C' && service.coolantCost !== undefined && service.hosesBeltsCost !== undefined) {
                    // Service C: Labor, Mob, Coolant, Parts (hoses/belts) (4 components)
                    breakdownText = `Labor: $${service.laborCost.toLocaleString()} • Mob: $${mobilizationCost.toLocaleString()} • Coolant: $${service.coolantCost.toLocaleString()} • Parts: $${service.hosesBeltsCost.toLocaleString()}`;
                } else if (serviceCode === 'E' && service.loadBankRental !== undefined) {
                    // Service E: Variable components based on size
                    // Small units: Labor, Mob, Rental (3 components)
                    // Large units (501+ kW): Labor, Mob, Rental, Transformer, Delivery (5 components)
                    if (service.transformerRental && service.deliveryCost) {
                        breakdownText = `Labor: $${service.laborCost.toLocaleString()} • Mob: $${mobilizationCost.toLocaleString()} • Rental: $${service.loadBankRental.toLocaleString()} • Transformer: $${service.transformerRental.toLocaleString()} • Delivery: $${service.deliveryCost.toLocaleString()}`;
                    } else {
                        breakdownText = `Labor: $${service.laborCost.toLocaleString()} • Mob: $${mobilizationCost.toLocaleString()} • Rental: $${service.loadBankRental.toLocaleString()}`;
                    }
                } else {
                    // All other services: Labor, Mob, Parts/Equip/Rental (3 components)
                    let partsLabel = 'Parts';
                    if (serviceCode === 'H') partsLabel = 'Equip';
                    if (serviceCode === 'E') partsLabel = 'Rental';
                    breakdownText = `Labor: $${service.laborCost.toLocaleString()} • Mob: $${mobilizationCost.toLocaleString()} • ${partsLabel}: $${service.partsCost.toLocaleString()}`;
                }

                breakdownElement.textContent = breakdownText;
            }
        }

        // PART 2: Handle selected service totals if priceData is returned
        if (priceData && unit.services.length > 0) {
            console.log('✅ Received server-calculated totals:', priceData);

            // Store the server-calculated totals directly in unit state
            if (!unit.serverCalculations) {
                unit.serverCalculations = {};
            }

            unit.serverCalculations = {
                laborCost: priceData.laborCost || 0,
                materialsCost: priceData.materialsCost || 0,
                mobilizationCost: priceData.mobilizationCost || 0,
                mobilizationSavings: priceData.mobilizationSavings || 0,
                subtotal: priceData.subtotal || 0,
                tax: priceData.tax || 0,
                total: priceData.total || 0,
                quarterlyTotals: priceData.quarterlyTotals || null,  // CRITICAL: Quarterly breakdown for PDF/Zoho
                breakdown: priceData.serviceBreakdown || [],  // Used by summary-calculator.js buildQuoteData()
                serviceBreakdown: priceData.serviceBreakdown || [],  // Keep for backwards compatibility
                lastUpdated: Date.now()
            };

            console.log('🔍 Stored serverCalculations with serviceBreakdown:', {
                unitId: unit.id,
                hasServiceBreakdown: !!priceData.serviceBreakdown,
                serviceCount: priceData.serviceBreakdown ? priceData.serviceBreakdown.length : 0,
                services: priceData.serviceBreakdown ? priceData.serviceBreakdown.map(s => s.name) : [],
                totalStored: unit.serverCalculations.total
            });

            // Update individual service card displays if breakdown is available
            if (priceData.serviceBreakdown && Array.isArray(priceData.serviceBreakdown)) {
                console.log('📊 Service breakdown received:', priceData.serviceBreakdown);

                // PHASE 3 FIX: Enhanced logging to diagnose display issues
                console.log('[PHASE 3] Total services in breakdown:', priceData.serviceBreakdown.length);
                console.log('[PHASE 3] Unit ID being updated:', unitId);

                priceData.serviceBreakdown.forEach(service => {
                    console.log('[PHASE 3] Processing service:', service);

                    // Extract service code - handle both formats: "A" and "A - Comprehensive Inspection"
                    let serviceCode = '';
                    if (service.name) {
                        // First try to extract just the letter code
                        if (service.name.includes(' - ')) {
                            serviceCode = service.name.split(' - ')[0].trim();
                        } else {
                            // If no hyphen, assume the whole name is the code
                            serviceCode = service.name.trim();
                        }
                    }

                    console.log(`[PHASE 3] Service code extracted: "${serviceCode}" from name: "${service.name}"`);
                    console.log(`[PHASE 3] Service total cost: $${service.totalCost}`);

                    if (serviceCode) {
                        // Skip Service D (handled by fluid checkboxes with custom pricing)
                        if (serviceCode === 'D') {
                            console.log(`[PHASE 3] Skipping Service D - uses custom pricing`);
                            return; // Return instead of continue in forEach
                        }

                        // Update price display for this service
                        const elementId = `${unitId}-service-${serviceCode}-price`;
                        console.log(`[PHASE 3] Looking for element ID: "${elementId}"`);

                        // Calculate mobilization cost for selected service (settings guaranteed loaded)
                        const mobilizationRate = essentialSettings.mobilizationRate;
                        const serviceMobilizationCost = Math.round((service.mobilizationHours || 0) * mobilizationRate);
                        const serviceCompleteTotal = service.laborCost + service.partsCost + serviceMobilizationCost;

                        const priceElement = document.getElementById(elementId);
                        if (priceElement && serviceCompleteTotal != null) {
                            const previousContent = priceElement.innerHTML;
                            // BUG-025 FIX: Use DOM methods instead of innerHTML to prevent XSS
                            const span = document.createElement('span');
                            span.style.color = 'var(--accent-electric)';
                            span.style.fontWeight = '600';
                            span.textContent = `$${serviceCompleteTotal.toFixed(2)}`;
                            priceElement.replaceChildren(span);
                            console.log(`✅ [PHASE 3] Updated price element for service ${serviceCode}`);
                            console.log(`   Previous content: ${previousContent}`);
                            console.log(`   New content: $${serviceCompleteTotal.toFixed(2)}`);
                        } else if (!priceElement) {
                            console.error(`❌ [PHASE 3] Could not find price element: ${elementId}`);
                            // Try to find all elements with similar IDs for debugging
                            const allServiceElements = document.querySelectorAll('[id*="-service-"][id*="-price"]');
                            console.log(`[PHASE 3] All service price elements found:`, Array.from(allServiceElements).map(el => el.id));
                        } else {
                            console.error(`❌ [PHASE 3] Service ${serviceCode} has null/undefined totalCost:`, service);
                        }

                        // Update breakdown display with all three components (Labor, Mob, Parts/Equip order)
                        const breakdownElement = document.getElementById(`${unitId}-service-${serviceCode}-breakdown`);
                        if (breakdownElement && service.laborCost != null && service.partsCost != null) {
                            // Service H uses "Equip" instead of "Parts" (testing equipment, not consumables)
                            const partsLabel = serviceCode === 'H' ? 'Equip' : 'Parts';
                            breakdownElement.textContent = `Labor: $${service.laborCost.toFixed(2)} • Mob: $${serviceMobilizationCost.toFixed(2)} • ${partsLabel}: $${service.partsCost.toFixed(2)}`;
                        } else if (breakdownElement) {
                            console.error(`❌ [PHASE 3] Service ${serviceCode} has null/undefined laborCost or partsCost:`, service);
                        }
                    }
                });
            } else {
                console.warn('⚠️ No service breakdown received from server');
            }

            console.log('✅ Unit server calculations stored:', unit.serverCalculations);

            // Update the summary and metrics to reflect new calculations
            if (window.updateSummary) window.updateSummary();
            if (window.updateMetrics) window.updateMetrics();
        }

    } catch (error) {
        console.error(`❌ Consolidated calculation failed for unit ${unitId}:`, error);
        // Show error state on all service cards
        const SERVICES = window.SERVICES || {};
        for (const code of Object.keys(SERVICES)) {
            const priceElement = document.getElementById(`${unitId}-service-${code}-price`);
            if (priceElement) {
                // BUG-025 FIX: Use DOM methods instead of innerHTML to prevent XSS
                const span = document.createElement('span');
                span.style.color = '#999';
                span.textContent = 'Error';
                priceElement.replaceChildren(span);
            }
        }
    }
}

/**
 * Create debounced version of updateServicePrices to prevent API flooding
 * Reduced from 300ms to 100ms for faster user feedback
 */
const debouncedUpdateServicePrices = debounce(updateServicePrices, 100);

/**
 * Calculate service price - delegates to API
 * @param {string} serviceCode - Service code (A-K, CUSTOM)
 * @param {number} kw - Unit kW rating
 * @param {number} frequency - Service frequency (times per year)
 * @param {string} unitId - Unit ID for context
 * @returns {Promise<Object>} Service price calculation result
 */
async function calculateServicePrice(serviceCode, kw, frequency, unitId) {
    const unit = window.state.units.find(u => u.id === unitId);

    // Handle custom service - MUST use API
    if (serviceCode === 'CUSTOM' && unit?.customServices?.CUSTOM) {
        // NO LOCAL CALCULATIONS - delegate to API
        try {
            const result = await window.state.modules.api.calculateCustomService({
                unitId,
                customService: unit.customServices.CUSTOM
            });
            return result;
        } catch (error) {
            console.error('Custom service API error:', error);
            throw new Error('Service temporarily unavailable');
        }
    }

    // Handle battery replacement - MUST use API
    if (serviceCode === 'K') {
        // NO LOCAL CALCULATIONS - delegate to API
        try {
            const result = await window.state.modules.api.calculateBatteryService({
                kw,
                unitId
            });
            return result;
        } catch (error) {
            console.error('Battery service API error:', error);
            throw new Error('Service temporarily unavailable');
        }
    }

    // Use the API module to calculate service price with breakdown
    // Oil and coolant quantities are determined by kW range in the backend
    if (window.state.modules?.calc && window.state.modules.calc.calculateServicePrice) {
        try {
            // Get Service D fluid selections if applicable
            let serviceDFluids = null;
            if (serviceCode === 'D' && unit?.serviceDFluids) {
                serviceDFluids = unit.serviceDFluids;
            }

            const result = await window.state.modules.calc.calculateServicePrice(
                serviceCode,
                kw,
                frequency,
                serviceDFluids
            );

            // DO NOT add per diem to individual services
            // Per diem is a job-level cost, not a service-level cost
            // It will be added once at the unit total level

            return result;
        } catch (error) {
            console.warn('Failed to get price from API:', error);
        }
    }

    // NO FALLBACK CALCULATIONS ALLOWED - Security violation
    // ALL calculations MUST happen in backend
    console.error('Frontend calculation attempted - security violation');
    throw new Error('Service temporarily unavailable. Please refresh and try again.');
}

// Export functions
export {
    updateServicePrices,
    debouncedUpdateServicePrices,
    calculateServicePrice
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.updateServicePrices = updateServicePrices;
    window.debouncedUpdateServicePrices = debouncedUpdateServicePrices;
    window.calculateServicePrice = calculateServicePrice;
}
