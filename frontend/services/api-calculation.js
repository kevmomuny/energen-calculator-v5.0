/**
 * Calculation API Connector
 * Handles all calculation-related API calls to the backend
 * Dependencies: state.js, initialization.js (SERVICES), error-handler.js
 */

import { state } from '../js/state.js';
import { SERVICES } from '../js/initialization.js';
import { retryAPICall, errorHandler } from './error-handler.js';

/**
 * Create Calculation API Connector
 * @returns {Object} API connector with calculation methods
 */
export function createCalculationAPIConnector() {
    return {
        /**
         * Calculate service price for a specific service
         * @param {string} serviceCode - Service code (A-K, CUSTOM)
         * @param {number} kw - Kilowatt value
         * @param {number} frequency - Service frequency (1-4)
         * @param {Object|null} serviceDFluids - Service D fluid selections {oil, coolant, fuel}
         * @returns {Promise<Object>} Service price data
         */
        calculateServicePrice: async function(serviceCode, kw, frequency = 1, serviceDFluids = null) {
            console.log(`📡 API call: calculateServicePrice(${serviceCode}, ${kw}kW, freq=${frequency})`);

            // Wrap in retryable API call for resilience
            return retryAPICall(async () => {
                // Call the real backend API which uses the actual calculation engine
                // CRITICAL: Always use activeSettings as the single source of truth
                const settings = state.activeSettings || {};
                const url = (window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/service-price';

                const requestBody = {
                    serviceCode,
                    kw,
                    frequency,
                    settings: {
                        laborRate: settings.laborRate,
                        travelTimeRate: settings.travelTimeRate,
                        oilPrice: settings.oilPrice || 16.00,
                        coolantPrice: settings.coolantPrice || 25.00,
                        oilAnalysisCost: settings.oilAnalysisCost || 16.55,
                        coolantAnalysisCost: settings.coolantAnalysisCost || 16.55,
                        fuelAnalysisCost: settings.fuelAnalysisCost || 60.00,
                        ...settings
                    }
                };

                // Add Service D fluid selections if provided
                if (serviceCode === 'D' && serviceDFluids) {
                    requestBody.serviceDFluids = serviceDFluids;
                }

                // BUG-022 FIX: Add timeout to prevent hung requests
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        console.error('   - API failed:', response.status);
                        throw new Error(`Service price API failed: ${response.status}`);
                    }

                    const result = await response.json();
                    return result;
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        throw new Error('Request timeout - calculation service took too long. Please try again.');
                    }
                    throw error;
                }
            }, 2, 500).catch(error => {
                errorHandler.handleError('Service Price API', error, { serviceCode, kw, frequency });
                throw error;
            });
        },

        /**
         * Calculate complete service package
         * @param {Object} data - Calculation data {kw, services, ...}
         * @returns {Promise<Object>} Complete calculation results
         */
        calculate: async function(data) {
            // Call the REAL calculation API
            // Get distance from DOM since units don't store it
            // BUG-026 FIX: Add radix parameter to prevent octal parsing
            const distanceValue = parseInt(document.getElementById('distance')?.value, 10) || 0;

            // BUG-022 FIX: Add timeout to prevent hung requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/calculate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kw: data.kw,
                        services: data.services,
                        distance: distanceValue,
                        unitCount: 1,
                        address: document.getElementById('address')?.value || '',
                        city: document.getElementById('city')?.value || '',
                        state: document.getElementById('state')?.value || 'CA',
                        zip: document.getElementById('zip')?.value || '',
                        contractYears: 1,
                        // Pass settings from modal
                        settings: window.calculatorSettings || {},
                        // Pass mobilization stacking settings
                        mobilizationStacking: {
                            enabled: window.mobilizationSettings?.enabled ?? true,
                            stackingCharge: window.mobilizationSettings?.stackingCharge ?? 65
                        }
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Calculation API failed: ${response.status}`);
                }

                const result = await response.json();

                // Map API response to UI format
                return {
                    laborHours: parseFloat(result.laborHours) || 0,
                    laborCost: parseFloat(result.labor) || 0,
                    materialsCost: parseFloat(result.parts) || 0,
                    travelCost: parseFloat(result.travel) || 0,
                    shopTime: parseFloat(result.shopTime) || 0,
                    subtotal: parseFloat(result.subtotal) || 0,
                    tax: parseFloat(result.tax) || 0,
                    total: parseFloat(result.annual) || parseFloat(result.total) || 0,
                    breakdown: result.breakdown,
                    services: data.services.map(s => ({
                        code: s,
                        name: SERVICES[s]?.name || 'Unknown',
                        price: 0
                    }))
                };
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout - calculation service took too long. Please try again.');
                }
                throw error;
            }
        }
    };
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.createCalculationAPIConnector = createCalculationAPIConnector;
}
