/**
 * @fileoverview Calculation State Hash Generator
 * Generates SHA-256 hash from ALL inputs that affect calculation
 * Enables exact recreation of calculations and audit trail
 *
 * @module frontend/modules/calculation-hash
 * @author Energen Team
 * @version 5.0.0
 * @sprint Sprint 4: Calculation State Hash & Versioning
 */

/**
 * Generate SHA-256 hash from calculation state
 * Includes ALL inputs that affect the final calculation result
 *
 * @param {Object} state - Application state object
 * @param {Object} customerData - Customer data object (optional override)
 * @returns {Promise<Object>} Hash object with hash string and included data snapshot
 */
export async function generateCalculationHash(state, customerData = null) {
    console.log('[HASH] Generating calculation state hash...');

    try {
        // Build comprehensive state object that affects calculations
        const calcState = buildCalculationState(state, customerData);

        // Convert to stable JSON string (sorted keys for consistency)
        const stateString = JSON.stringify(calcState, Object.keys(calcState).sort());

        // Generate SHA-256 hash
        const hashHex = await sha256(stateString);

        console.log('[HASH] Generated hash:', hashHex.substring(0, 16) + '...');

        return {
            hash: hashHex,
            timestamp: new Date().toISOString(),
            includedData: calcState,
            version: '1.0'
        };

    } catch (error) {
        console.error('[HASH] Error generating hash:', error);
        throw new Error(`Failed to generate calculation hash: ${error.message}`);
    }
}

/**
 * Build calculation state object from all inputs that affect pricing
 * This is the COMPLETE list of everything that changes calculation results
 *
 * @param {Object} state - Application state
 * @param {Object} customerData - Customer data override
 * @returns {Object} Normalized calculation state
 */
function buildCalculationState(state, customerData = null) {
    const settings = state.activeSettings || {};

    // Extract customer data
    const customer = customerData || {
        companyName: document.getElementById('companyName')?.value || '',
        address: document.getElementById('address')?.value || '',
        city: document.getElementById('city')?.value || '',
        zip: document.getElementById('zip')?.value || '',
        distance: state.distance || 0
    };

    // Build normalized state object
    const calcState = {
        // VERSION: Track hash format version for future compatibility
        hashVersion: '1.0',

        // UNITS: All generator configurations
        units: state.units.map(unit => ({
            id: unit.id,
            kw: unit.kw,
            brand: unit.brand || '',
            model: unit.model || '',
            cylinders: unit.cylinders || 6,
            injectorType: unit.injectorType || 'Pop Noz',
            voltage: unit.voltage || '480V',
            services: (unit.services || []).sort(), // Sort for consistency
            serviceFrequencies: unit.serviceFrequencies || {},
            customPricing: unit.customPricing || null,
            location: unit.location || ''
        })),

        // SETTINGS: All pricing and rate settings
        settings: {
            // Labor & Travel Rates
            laborRate: settings.laborRate || 181.00,
            mobilizationRate: settings.mobilizationRate || 181.00,
            travelRate: settings.travelRate || 100.00,
            mileageRate: settings.mileageRate || 2.50,
            overtimeRate: settings.overtimeRate || 271.50,
            doubleTimeRate: settings.doubleTimeRate || 362.00,

            // Materials & Markups
            oilPrice: settings.oilPrice || 16.00,
            oilMarkup: settings.oilMarkup || 1.5,
            coolantPrice: settings.coolantPrice || 25.00,
            coolantMarkup: settings.coolantMarkup || 1.5,
            partsMarkup: settings.partsMarkup || 0.20,

            // Fluid Analysis Costs
            oilAnalysisCost: settings.oilAnalysisCost || 16.55,
            coolantAnalysisCost: settings.coolantAnalysisCost || 16.55,
            fuelAnalysisCost: settings.fuelAnalysisCost || 60.00,

            // Tax & Fees
            defaultTaxRate: settings.defaultTaxRate || 8.4,
            disposalFee: settings.disposalFee || 35.00,
            permitFee: settings.permitFee || 250.00,
            annualIncrease: settings.annualIncrease || 3.0,

            // Prevailing Wage (if applicable)
            prevailingWage: settings.prevailingWage || null,

            // Rate Mode
            rateMode: settings.rateMode || 'private',

            // PHASE 3: Service-specific data (labor hours, parts costs per kW range)
            // This allows per-quote customization to be saved with the quote hash
            services: settings.services || null
        },

        // CUSTOMER: Location-based pricing factors
        customer: {
            distance: customer.distance,
            zip: customer.zip,
            city: customer.city,
            // Tax rate can vary by location
            taxRate: settings.defaultTaxRate || 8.4,
            // Non-taxable status affects total
            nonTaxable: state.nonTaxable || false
        },

        // MOBILIZATION: Stacking settings affect pricing
        mobilization: {
            stackingEnabled: state.mobilizationStackingEnabled || false,
            shopAddress: settings.shopAddress || '150 Mason Circle, Concord, CA 94520'
        },

        // CUSTOM OVERRIDES: Any manual price adjustments
        customOverrides: state.customOverrides || null,

        // CALCULATION ENGINE VERSION: Track which engine version was used
        engineVersion: '5.0.0'
    };

    return calcState;
}

/**
 * Compare two hashes to detect if calculation would change
 *
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @returns {boolean} True if hashes are identical
 */
export function compareHashes(hash1, hash2) {
    return hash1 === hash2;
}

/**
 * Detect type of change between two calculation states
 * Returns scope of changes: 'none', 'minor', or 'major'
 *
 * @param {Object} oldState - Previous calculation state
 * @param {Object} newState - Current calculation state
 * @returns {Object} Change analysis
 */
export function detectChanges(oldState, newState) {
    const changes = {
        scope: 'none',
        details: [],
        affectsPrice: false,
        affectsScope: false
    };

    if (!oldState || !newState) {
        changes.scope = 'major';
        changes.details.push('Missing comparison data');
        return changes;
    }

    // Check for unit configuration changes (MAJOR)
    if (JSON.stringify(oldState.units) !== JSON.stringify(newState.units)) {
        const unitChanges = detectUnitChanges(oldState.units, newState.units);
        changes.details.push(...unitChanges);

        // Service selection changes = MAJOR
        if (unitChanges.some(c => c.includes('services') || c.includes('added') || c.includes('removed'))) {
            changes.scope = 'major';
            changes.affectsScope = true;
        }
    }

    // Check for settings changes
    if (JSON.stringify(oldState.settings) !== JSON.stringify(newState.settings)) {
        const settingChanges = detectSettingChanges(oldState.settings, newState.settings);
        changes.details.push(...settingChanges);

        // Labor rate changes affect price but may be minor revisions
        if (settingChanges.length > 0) {
            changes.affectsPrice = true;
            // If no scope changes yet, this is a minor change
            if (changes.scope === 'none') {
                changes.scope = 'minor';
            }
        }
    }

    // Check for customer/location changes
    if (JSON.stringify(oldState.customer) !== JSON.stringify(newState.customer)) {
        changes.details.push('Customer location or tax status changed');
        changes.affectsPrice = true;
        if (changes.scope === 'none') {
            changes.scope = 'minor';
        }
    }

    return changes;
}

/**
 * Detect unit configuration changes
 * @private
 */
function detectUnitChanges(oldUnits, newUnits) {
    const changes = [];

    // Check for added/removed units
    if (oldUnits.length !== newUnits.length) {
        const diff = newUnits.length - oldUnits.length;
        changes.push(`${diff > 0 ? 'Added' : 'Removed'} ${Math.abs(diff)} unit(s)`);
    }

    // Check each unit for changes
    oldUnits.forEach((oldUnit, index) => {
        const newUnit = newUnits[index];
        if (!newUnit) return;

        // kW changes
        if (oldUnit.kw !== newUnit.kw) {
            changes.push(`Unit ${index + 1}: kW changed from ${oldUnit.kw} to ${newUnit.kw}`);
        }

        // Service selection changes
        const oldServices = (oldUnit.services || []).sort().join(',');
        const newServices = (newUnit.services || []).sort().join(',');
        if (oldServices !== newServices) {
            changes.push(`Unit ${index + 1}: Services changed`);
        }

        // Frequency changes
        if (JSON.stringify(oldUnit.serviceFrequencies) !== JSON.stringify(newUnit.serviceFrequencies)) {
            changes.push(`Unit ${index + 1}: Service frequencies changed`);
        }
    });

    return changes;
}

/**
 * Detect setting changes
 * @private
 */
function detectSettingChanges(oldSettings, newSettings) {
    const changes = [];
    const criticalSettings = ['laborRate', 'mobilizationRate', 'defaultTaxRate', 'rateMode'];

    criticalSettings.forEach(key => {
        if (oldSettings[key] !== newSettings[key]) {
            changes.push(`${key} changed from ${oldSettings[key]} to ${newSettings[key]}`);
        }
    });

    return changes;
}

/**
 * SHA-256 hash function using Web Crypto API
 * Fallback to simple hash if crypto not available
 *
 * @param {string} message - String to hash
 * @returns {Promise<string>} Hex string hash
 */
async function sha256(message) {
    // Check if Web Crypto API is available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.warn('[HASH] Web Crypto API failed, using fallback hash');
        }
    }

    // Fallback: Simple hash for older browsers
    return simpleHash(message);
}

/**
 * Simple hash fallback for environments without crypto.subtle
 * @private
 */
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and pad
    return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Validate hash format
 *
 * @param {string} hash - Hash string to validate
 * @returns {boolean} True if valid hash format
 */
export function isValidHash(hash) {
    // SHA-256 should be 64 hex characters
    // Fallback hash is 16 hex characters
    return /^[a-f0-9]{16,64}$/i.test(hash);
}

/**
 * Get human-readable summary of calculation state
 * Useful for audit trails and debugging
 *
 * @param {Object} hashResult - Result from generateCalculationHash
 * @returns {string} Human-readable summary
 */
export function getHashSummary(hashResult) {
    const state = hashResult.includedData;
    const unitCount = state.units.length;
    const totalKw = state.units.reduce((sum, u) => sum + (u.kw || 0), 0);
    const allServices = new Set();
    state.units.forEach(u => u.services.forEach(s => allServices.add(s)));

    return `Hash: ${hashResult.hash.substring(0, 16)}... | Units: ${unitCount} (${totalKw}kW) | Services: ${allServices.size} | Labor Rate: $${state.settings.laborRate} | Tax: ${state.customer.taxRate}%`;
}

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.calculationHash = {
        generateCalculationHash,
        compareHashes,
        detectChanges,
        isValidHash,
        getHashSummary
    };
}

export default {
    generateCalculationHash,
    compareHashes,
    detectChanges,
    isValidHash,
    getHashSummary
};
