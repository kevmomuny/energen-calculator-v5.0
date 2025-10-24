/**
 * State Management Module
 * Global application state - THE SINGLE SOURCE OF TRUTH
 * No dependencies - this module is imported first
 */

export const state = {
    units: [],
    customer: {},
    enrichmentData: {},
    calculations: {},
    modules: null,
    unitCounter: 1,
    activeSettings: null,    // THE SINGLE SOURCE OF TRUTH for all settings
    settingsLoaded: false,   // Flag to ensure settings are loaded before calculations
    settingsSource: null,    // Track where settings came from: 'localStorage' | 'config'
    sessionSettings: null,   // Keep for backward compatibility temporarily
    defaultSettings: null,   // Keep for backward compatibility temporarily
    unitEventListeners: {},  // Track event listeners for cleanup
    distance: 25             // Default distance in miles
};

// DEBUGGING: Global State Tracker (optional - won't break if not present)
export const stateDebugger = {
    history: [],
    track: function(location, details) {
        const entry = {
            timestamp: new Date().toISOString(),
            location: location,
            laborRate: state.activeSettings?.laborRate,
            settingsSource: state.settingsSource,
            details: details,
            stackTrace: new Error().stack
        };
        this.history.push(entry);
        console.log(`🔍 STATE TRACK [${location}]:`, {
            laborRate: entry.laborRate,
            source: state.settingsSource,
            details: details
        });
    },
    report: function() {
        console.group('📊 STATE HISTORY REPORT');
        this.history.forEach((entry, i) => {
            console.log(`${i + 1}. [${entry.timestamp}] ${entry.location}`);
            console.log(`   Labor Rate: $${entry.laborRate}, Source: ${entry.settingsSource}`);
            if (entry.details) console.log(`   Details:`, entry.details);
        });
        console.groupEnd();
        return this.history;
    }
};

// ============================================================================
// STATE HELPER FUNCTIONS
// ============================================================================

/**
 * Get active settings with fallback chain
 * @returns {Object} Current settings object
 */
export function getSettings() {
    return state.activeSettings || state.defaultSettings || {};
}

/**
 * Update settings and trigger re-render
 * @param {Object} newSettings - Settings to update
 */
export function updateSettings(newSettings) {
    state.activeSettings = { ...state.activeSettings, ...newSettings };
    state.settingsLoaded = true;
    state.settingsSource = 'manual';

    stateDebugger.track('SETTINGS_UPDATED', {
        source: 'manual',
        keys: Object.keys(newSettings)
    });

    // Persist to localStorage
    try {
        localStorage.setItem('energenSettings', JSON.stringify(state.activeSettings));
    } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
    }

    // Trigger recalculation if available
    if (typeof window !== 'undefined' && window.recalculateAll) {
        window.recalculateAll();
    }
}

/**
 * Add a unit to the state
 * @param {Object} unit - Unit data
 */
export function addUnit(unit) {
    const newUnit = {
        id: unit.id || `unit-${state.unitCounter}`,
        kw: unit.kw || '',
        location: unit.location || '',
        services: unit.services || [],
        serviceFrequencies: unit.serviceFrequencies || {},
        calculations: unit.calculations || null,
        ...unit
    };

    state.units.push(newUnit);
    state.unitCounter++;

    stateDebugger.track('UNIT_ADDED', {
        id: newUnit.id,
        kw: newUnit.kw,
        serviceCount: newUnit.services.length
    });

    return newUnit;
}

/**
 * Remove a unit from the state
 * @param {string} unitId - Unit ID to remove
 */
export function removeUnit(unitId) {
    const index = state.units.findIndex(u => u.id === unitId);
    if (index !== -1) {
        const removed = state.units.splice(index, 1)[0];
        stateDebugger.track('UNIT_REMOVED', {
            id: unitId,
            kw: removed.kw
        });
        return removed;
    }
    return null;
}

/**
 * Update a specific unit
 * @param {string} unitId - Unit ID to update
 * @param {Object} updates - Fields to update
 */
export function updateUnit(unitId, updates) {
    const unit = state.units.find(u => u.id === unitId);
    if (unit) {
        Object.assign(unit, updates);
        stateDebugger.track('UNIT_UPDATED', {
            id: unitId,
            updatedFields: Object.keys(updates)
        });
        return unit;
    }
    return null;
}

/**
 * Get a unit by ID
 * @param {string} unitId - Unit ID
 * @returns {Object|null} Unit object or null
 */
export function getUnit(unitId) {
    return state.units.find(u => u.id === unitId) || null;
}

/**
 * Clear all units
 */
export function clearUnits() {
    const count = state.units.length;
    state.units = [];
    state.unitCounter = 1;
    stateDebugger.track('UNITS_CLEARED', { count });
}

/**
 * Update customer data
 * @param {Object} customerData - Customer fields to update
 */
export function updateCustomer(customerData) {
    Object.assign(state.customer, customerData);
    stateDebugger.track('CUSTOMER_UPDATED', {
        fields: Object.keys(customerData)
    });
}

/**
 * Clear customer data
 */
export function clearCustomer() {
    state.customer = {};
    stateDebugger.track('CUSTOMER_CLEARED');
}

/**
 * Reset entire state to initial values
 */
export function resetState() {
    state.units = [];
    state.customer = {};
    state.enrichmentData = {};
    state.calculations = {};
    state.unitCounter = 1;
    state.selectedPlaceId = null;
    state.lastGeneratedPDF = null;

    stateDebugger.track('STATE_RESET');
}

// ============================================================================
// GLOBAL EXPOSURE (Backward Compatibility)
// ============================================================================

// Expose to window for backward compatibility and global access
// TODO: Remove after migrating inline onclick handlers to event delegation
if (typeof window !== 'undefined') {
    window.state = state;
    window.stateDebugger = stateDebugger;

    // Also expose helper functions for gradual migration
    window.getSettings = getSettings;
    window.updateSettings = updateSettings;
    window.addUnit = addUnit;
    window.removeUnit = removeUnit;
    window.updateUnit = updateUnit;
    window.getUnit = getUnit;
    window.clearUnits = clearUnits;
    window.updateCustomer = updateCustomer;
    window.clearCustomer = clearCustomer;
    window.resetState = resetState;
}
