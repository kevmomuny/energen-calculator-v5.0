/**
 * Initialization Module
 * Handles app startup, settings loading, and UI component setup
 * Dependencies: state.js, utilities.js, stateDebugger
 */

import { state, stateDebugger } from './state.js';
import { updateStatus, showCriticalError } from './utilities.js';

/**
 * Service Definitions - Structure only, prices from calculation engine
 */
export const SERVICES = {
    'A': { name: 'A-Comprehensive Inspection', description: 'Complete system inspection', defaultFreq: 0 },
    'B': { name: 'B-Oil & Filter Service', description: 'Oil change and filters', defaultFreq: 0 },
    'C': { name: 'C-Coolant Service', description: 'Coolant flush and refill', defaultFreq: 0 },
    'D': { name: 'D-Oil & Fuel Analysis', description: 'Laboratory testing', defaultFreq: 0 },
    'E': { name: 'E-Load Bank Testing', description: 'Full load testing', defaultFreq: 0 },
    'F': { name: 'F-Diesel Engine Tune-Up', description: 'Diesel engine optimization', defaultFreq: 0, fuelType: 'Diesel' },
    'G': { name: 'G-Gas Engine Tune-Up', description: 'Gas engine optimization', defaultFreq: 0, fuelType: 'Natural Gas' },
    'H': { name: 'H-Electrical Testing', description: 'Generator electrical testing (5 year)', defaultFreq: 0 },
    'I': { name: 'I-Transfer Switch Service', description: 'Transfer switch maintenance', defaultFreq: 0 },
    'J': { name: 'J-Thermal Imaging', description: 'Infrared thermal scan', defaultFreq: 0 },
    'K': { name: 'K-Battery Replacement', description: 'Battery maintenance and replacement', defaultFreq: 0, isCustom: false },
    'CUSTOM': { name: 'Custom Service/Parts', description: 'Additional services or parts', defaultFreq: 0, isCustom: true }
};

/**
 * Initialize application settings from localStorage or config
 * @throws {Error} If settings cannot be loaded
 */
export async function initializeSettings() {
    console.log('%c=== GRAND TRACE: initializeSettings() START ===', 'background: #222; color: #bada55', { timestamp: Date.now(), activeSettings: state.activeSettings });

    // Try to load user settings from localStorage
    const savedSettings = localStorage.getItem('energenSettings');

    if (savedSettings) {
        try {
            state.activeSettings = JSON.parse(savedSettings);
            state.settingsSource = 'localStorage';
            // Also set to old properties for backward compatibility
            state.defaultSettings = state.activeSettings;
            state.sessionSettings = state.activeSettings;
            console.log('✅ Loaded user settings from localStorage');
        } catch (e) {
            console.error('⚠️ Failed to parse localStorage settings:', e);
            state.activeSettings = null;
        }
    }

    // If no valid user settings, load defaults from config
    if (!state.activeSettings) {
        const response = await fetch('/config/default-settings.json');
        if (!response.ok) {
            throw new Error('Failed to load default settings from server');
        }
        state.activeSettings = await response.json();
        state.settingsSource = 'config';
        // Also set to old properties for backward compatibility
        state.defaultSettings = state.activeSettings;
        state.sessionSettings = state.activeSettings;
        console.log('✅ Loaded default settings from config/default-settings.json');
    }

    // Mark settings as loaded
    state.settingsLoaded = true;

    // DEBUGGING: Track settings initialization
    if (stateDebugger) {
        stateDebugger.track('SETTINGS_INITIALIZED', {
            source: state.settingsSource,
            laborRate: state.activeSettings.laborRate
        });
    }

    // Validate that critical settings exist
    if (!state.activeSettings.laborRate || !state.activeSettings.mileageRate) {
        throw new Error('Invalid settings structure: missing critical fields');
    }

    console.log('%c=== SETTINGS INITIALIZED ===', 'background: #222; color: #0f0');
}

/**
 * Initialize UI component event listeners
 * Sets up event delegation for dynamic unit cards
 */
export function initializeUIComponents() {
    const unitsContainer = document.getElementById('units-container');
    if (unitsContainer) {
        // Delegate all unit-related events
        unitsContainer.addEventListener('click', (e) => {
            // Handle service toggle
            if (e.target.closest('[data-action="toggle-service"]')) {
                const element = e.target.closest('[data-action="toggle-service"]');
                const unitId = element.dataset.unitId;
                const serviceCode = element.dataset.serviceCode;
                // Call global function (attached by app-main.js)
                if (window.toggleService) {
                    window.toggleService(unitId, serviceCode);
                }
                e.stopPropagation();
            }

            // Handle frequency selection
            if (e.target.closest('[data-action="set-frequency"]')) {
                const element = e.target.closest('[data-action="set-frequency"]');
                const unitId = element.dataset.unitId;
                const serviceCode = element.dataset.serviceCode;
                const frequency = parseInt(element.dataset.frequency);
                // Call global function (attached by app-main.js)
                if (window.setFrequency) {
                    window.setFrequency(unitId, serviceCode, frequency, element);
                }
                e.stopPropagation();
            }

            // Handle unit removal
            if (e.target.closest('[data-action="remove-unit"]')) {
                const element = e.target.closest('[data-action="remove-unit"]');
                const unitId = element.dataset.unitId;
                // Call global function (attached by app-main.js)
                if (window.removeUnit) {
                    window.removeUnit(unitId);
                }
                e.stopPropagation();
            }
        });

        // Delegate change events
        unitsContainer.addEventListener('change', (e) => {
            if (e.target.matches('[data-action="update-unit"]')) {
                const unitId = e.target.dataset.unitId;
                const property = e.target.dataset.property;
                // Call global function (attached by app-main.js)
                if (window.updateUnit) {
                    window.updateUnit(unitId, property, e.target.value);
                }
            }
        });
    }
}

/**
 * Clear contact form fields and session data
 */
export function clearContactForm() {
    const contactFields = [
        'companyName', 'phone', 'address', 'city', 'state', 'zip',
        'website', 'primaryEmail', 'secondaryEmail', 'distance'
    ];

    contactFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
        }
    });

    // Clear state customer data
    state.customer = {};
    state.enrichmentData = {};

    // Remove any quote data from previous sessions
    localStorage.removeItem('currentQuote');
    localStorage.removeItem('duplicateQuote');

    // Clear any session-specific data that shouldn't persist
    sessionStorage.clear();
}

/**
 * Initialize API connector modules
 * @param {Object} apiConnectors - Object containing all API connector creator functions
 * @returns {Object} Initialized modules
 */
export async function initializeModules(apiConnectors) {
    // Initialize API connectors that communicate with the real backend services
    return {
        calc: apiConnectors.createCalculationAPIConnector(),
        pdf: apiConnectors.createPDFAPIConnector(),
        zoho: apiConnectors.createZohoAPIConnector(),
        enrichment: apiConnectors.createEnrichmentAPIConnector()
    };
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.initializeSettings = initializeSettings;
    window.initializeUIComponents = initializeUIComponents;
    window.clearContactForm = clearContactForm;
    // window.initializeModules = initializeModules; // HTML has its own version
    window.SERVICES = SERVICES;
}
