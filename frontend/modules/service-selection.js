/**
 * Service Selection Module
 * Handles service selection, toggling, and frequency management
 * @module service-selection
 * @version 5.0.0
 */

// Import dependencies
import { showNotification } from '../js/utilities.js';

/**
 * Toggle service selection - WITH LIVE UPDATES
 * @param {string} unitId - The unit ID
 * @param {string} serviceCode - The service code (A-K, CUSTOM)
 */
function toggleService(unitId, serviceCode) {
    console.log('%c=== GRAND TRACE: toggleService() FIRED ===', 'background: #4b0082; color: #ffd700', { unitId, serviceCode, activeSettings: window.state.activeSettings, timestamp: Date.now() });
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) return;

    console.log('%c🔍 DIAGNOSTIC: BEFORE toggle', 'background: red; color: white', {
        unitId,
        serviceCode,
        servicesArrayBefore: [...(unit.services || [])],
        servicesLength: unit.services?.length || 0
    });

    // Validate service code
    const validServiceCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'CUSTOM'];
    if (!validServiceCodes.includes(serviceCode)) {
        if (window.showNotification) {
            window.showNotification(`Invalid service code: ${serviceCode}. Please select from available services.`, 'error');
        }
        console.error(`Invalid service code: ${serviceCode}`);
        return;
    }

    const serviceCard = document.getElementById(`${unitId}-service-${serviceCode}`);
    const index = unit.services.indexOf(serviceCode);

    if (index === -1) {
        // BUG-023 FIX: Use immutable array operation instead of direct mutation
        unit.services = [...unit.services, serviceCode];
        if (serviceCard) serviceCard.classList.add('active');
        console.log('%c✅ DIAGNOSTIC: ADDED service', 'background: green; color: white', {
            serviceCode,
            servicesArrayAfter: [...unit.services],
            servicesLength: unit.services.length
        });
    } else {
        // BUG-023 FIX: Use immutable array operation instead of direct mutation
        unit.services = unit.services.filter(s => s !== serviceCode);
        if (serviceCard) serviceCard.classList.remove('active');
        console.log('%c❌ DIAGNOSTIC: REMOVED service', 'background: orange; color: white', {
            serviceCode,
            servicesArrayAfter: [...unit.services],
            servicesLength: unit.services.length
        });
    }

    // Update service count and RECALCULATE IMMEDIATELY
    const serviceCountElement = document.getElementById(`${unitId}-service-count`);
    if (serviceCountElement) serviceCountElement.textContent = `${unit.services.length} services selected`;

    console.log('%c🔍 DIAGNOSTIC: CALLING recalculateUnit', 'background: blue; color: white', {
        unitId,
        servicesArray: [...unit.services],
        servicesLength: unit.services.length
    });
    if (window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
}

/**
 * Set service frequency
 * @param {string} unitId - The unit ID
 * @param {string} serviceCode - The service code
 * @param {number} frequency - The frequency (times per year)
 * @param {HTMLElement} buttonElement - The button element that was clicked
 */
async function setFrequency(unitId, serviceCode, frequency, buttonElement) {
    console.log('%c=== GRAND TRACE: setFrequency() FIRED ===', 'background: #8b4513; color: #ffffe0', { unitId, serviceCode, frequency, activeSettings: window.state.activeSettings, timestamp: Date.now() });
    // Update frequency buttons
    const buttons = document.querySelectorAll(`#${unitId}-service-${serviceCode} .frequency-btn`);
    buttons.forEach(btn => btn.classList.remove('active'));
    if (buttonElement) buttonElement.classList.add('active');

    // Store frequency and manage services array
    const unit = window.state.units.find(u => u.id === unitId);
    if (unit) {
        unit.serviceFrequencies = unit.serviceFrequencies || {};
        unit.serviceFrequencies[serviceCode] = frequency;

        // CRITICAL FIX: Services A, B, C, E, I, J use frequency buttons as selection mechanism
        // Clicking any frequency (Quarterly/Semi-Annual/Annual) should ADD the service
        // Services F and G have "Not Included" option, so frequency 0 removes them
        // Service D uses checkboxes (handled separately in toggleService)

        const serviceCard = document.getElementById(`${unitId}-service-${serviceCode}`);

        // Services with frequency-based selection: A, B, C, E, F, G, I, J
        // (These services don't have separate toggle - frequency button IS the selection)
        if (['A', 'B', 'C', 'E', 'F', 'G', 'I', 'J'].includes(serviceCode)) {
            if (frequency > 0) {
                // Add service if not already included
                if (!unit.services.includes(serviceCode)) {
                    unit.services.push(serviceCode);
                    if (serviceCard) serviceCard.classList.add('active');
                    console.log(`✅ setFrequency: Added ${serviceCode} to unit.services`, [...unit.services]);
                }
            } else {
                // Remove service if frequency is 0 (Not Included) - only F and G have this option
                const index = unit.services.indexOf(serviceCode);
                if (index > -1) {
                    unit.services.splice(index, 1);
                    if (serviceCard) serviceCard.classList.remove('active');
                    console.log(`❌ setFrequency: Removed ${serviceCode} from unit.services`, [...unit.services]);
                }
            }

            // Update service count display
            const serviceCountElement = document.getElementById(`${unitId}-service-count`);
            if (serviceCountElement) {
                serviceCountElement.textContent = `${unit.services.length} services selected`;
            }
        }

        // Update price for this service with breakdown
        // IMMEDIATE update for frequency changes (no debounce) for instant feedback
        // Frequency changes are deliberate user actions, not rapid typing
        if (unit.kw && window.updateServicePrices) {
            window.updateServicePrices(unitId); // Direct call, no debounce
        }
    }
}

/**
 * Toggle Service H (5-year electrical testing)
 * @param {string} unitId - The unit ID
 */
function toggleServiceH(unitId) {
    const checkbox = document.getElementById(`${unitId}-service-H-checkbox`);
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) return;

    const serviceCard = document.getElementById(`${unitId}-service-H`);

    if (checkbox && checkbox.checked) {
        // Add Service H
        if (!unit.services.includes('H')) {
            unit.services.push('H');
            if (serviceCard) serviceCard.classList.add('active');
        }
    } else {
        // Remove Service H
        const index = unit.services.indexOf('H');
        if (index > -1) {
            unit.services.splice(index, 1);
            if (serviceCard) serviceCard.classList.remove('active');
        }
    }

    const serviceCountElement = document.getElementById(`${unitId}-service-count`);
    if (serviceCountElement) serviceCountElement.textContent = `${unit.services.length} services selected`;

    if (window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
}

/**
 * Add a new custom service entry
 * @param {string} unitId - The unit ID
 */
function addCustomServiceEntry(unitId) {
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Initialize customServices array if needed
    if (!unit.customServices) {
        unit.customServices = {};
    }
    if (!Array.isArray(unit.customServices.CUSTOM)) {
        unit.customServices.CUSTOM = [];
    }

    // Create new entry with unique ID
    const entryId = Date.now();
    const entry = {
        id: entryId,
        description: '',
        details: '',
        cost: 0
    };

    unit.customServices.CUSTOM.push(entry);

    // Render the entry in the UI
    renderCustomServiceEntry(unitId, entry);

    // Focus on the new description input
    setTimeout(() => {
        document.getElementById(`${unitId}-custom-description-${entryId}`)?.focus();
    }, 100);
}

/**
 * Render a custom service entry in the UI
 * @param {string} unitId - The unit ID
 * @param {Object} entry - The entry data
 */
function renderCustomServiceEntry(unitId, entry) {
    const container = document.getElementById(`${unitId}-custom-services-container`);
    if (!container) return;

    const entryHTML = `
        <div id="${unitId}-custom-entry-${entry.id}" style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <input type="text"
                    id="${unitId}-custom-description-${entry.id}"
                    placeholder="Description (e.g., Subcontractor Labor)"
                    value="${entry.description || ''}"
                    onchange="window.updateCustomServiceEntry('${unitId}', ${entry.id})"
                    style="flex: 1; padding: 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 11px; margin-right: 6px;">
                <button
                    type="button"
                    onclick="window.removeCustomServiceEntry('${unitId}', ${entry.id})"
                    style="padding: 4px 8px; background: var(--danger, #dc3545); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">
                    ×
                </button>
            </div>

            <input type="text"
                id="${unitId}-custom-details-${entry.id}"
                placeholder="Details (e.g., R.F. MacDonald Co. Quote #QUO-167613)"
                value="${entry.details || ''}"
                onchange="window.updateCustomServiceEntry('${unitId}', ${entry.id})"
                style="width: 100%; padding: 4px; margin-bottom: 6px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 11px;">

            <div style="display: flex; gap: 8px; align-items: center;">
                <label style="font-size: 10px; white-space: nowrap;">Cost: $</label>
                <input type="number"
                    id="${unitId}-custom-cost-${entry.id}"
                    placeholder="0.00"
                    value="${entry.cost || ''}"
                    min="0"
                    step="0.01"
                    onchange="window.updateCustomServiceEntry('${unitId}', ${entry.id})"
                    style="flex: 1; padding: 4px; background: var(--bg-primary); border: 1px solid var(--border-subtle); color: var(--text-primary); font-size: 11px;">
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', entryHTML);
}

/**
 * Update a custom service entry
 * @param {string} unitId - The unit ID
 * @param {number} entryId - The entry ID
 */
function updateCustomServiceEntry(unitId, entryId) {
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit || !Array.isArray(unit.customServices?.CUSTOM)) return;

    const entry = unit.customServices.CUSTOM.find(e => e.id === entryId);
    if (!entry) return;

    // Update entry data from inputs
    const descInput = document.getElementById(`${unitId}-custom-description-${entryId}`);
    const detailsInput = document.getElementById(`${unitId}-custom-details-${entryId}`);
    const costInput = document.getElementById(`${unitId}-custom-cost-${entryId}`);

    entry.description = descInput?.value || '';
    entry.details = detailsInput?.value || '';
    entry.cost = parseFloat(costInput?.value) || 0;

    // Recalculate totals
    updateCustomServiceTotals(unitId);
}

/**
 * Remove a custom service entry
 * @param {string} unitId - The unit ID
 * @param {number} entryId - The entry ID
 */
function removeCustomServiceEntry(unitId, entryId) {
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit || !Array.isArray(unit.customServices?.CUSTOM)) return;

    // Remove from array
    unit.customServices.CUSTOM = unit.customServices.CUSTOM.filter(e => e.id !== entryId);

    // Remove from DOM
    const entryElement = document.getElementById(`${unitId}-custom-entry-${entryId}`);
    if (entryElement) {
        entryElement.remove();
    }

    // Recalculate totals
    updateCustomServiceTotals(unitId);
}

/**
 * Update custom service totals
 * @param {string} unitId - The unit ID
 */
function updateCustomServiceTotals(unitId) {
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Calculate total from all custom service entries
    const entries = unit.customServices?.CUSTOM || [];
    const total = entries.reduce((sum, entry) => sum + (entry.cost || 0), 0);

    // Update the price display
    const priceElement = document.getElementById(`${unitId}-service-CUSTOM-price`);
    if (priceElement) {
        priceElement.textContent = total > 0 ? `$${total.toFixed(2)}` : '$0.00';
    }

    // Update breakdown
    const breakdownElement = document.getElementById(`${unitId}-service-CUSTOM-breakdown`);
    if (breakdownElement && entries.length > 0) {
        const breakdownText = entries
            .filter(e => e.cost > 0)
            .map(e => `${e.description || 'Item'}: $${e.cost.toFixed(2)}`)
            .join(' | ');
        breakdownElement.textContent = breakdownText;
    }

    // Recalculate if this service is selected
    if (unit.services.includes('CUSTOM') && window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
}

/**
 * Update custom service pricing (legacy compatibility)
 * @param {string} unitId - The unit ID
 */
function updateCustomService(unitId) {
    updateCustomServiceTotals(unitId);
}

/**
 * Recalculate unit pricing
 * GRAND FINALE: Unified calculation pipeline - all calculations go through updateServicePrices
 * @param {string} unitId - The unit ID
 */
async function recalculateUnit(unitId) {
    console.log('%c=== GRAND FINALE: Redirecting to unified pipeline ===', 'background: #00ff00; color: #000');
    // Simply call the correct, unified function
    // NOTE: debouncedUpdateServicePrices is debounced, so await doesn't actually wait for completion
    // The updateSummary() call happens inside updateServicePrices() after API response is received
    if (window.debouncedUpdateServicePrices) {
        window.debouncedUpdateServicePrices(unitId);
    }
    // Don't call updateSummary/updateMetrics here - they're called inside updateServicePrices after API completes
    return; // Exit early to skip all legacy code below
}

// Export functions
export {
    toggleService,
    setFrequency,
    toggleServiceH,
    updateCustomService,
    addCustomServiceEntry,
    renderCustomServiceEntry,
    updateCustomServiceEntry,
    removeCustomServiceEntry,
    updateCustomServiceTotals,
    recalculateUnit
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.toggleService = toggleService;
    window.setFrequency = setFrequency;
    window.toggleServiceH = toggleServiceH;
    window.updateCustomService = updateCustomService;
    window.addCustomServiceEntry = addCustomServiceEntry;
    window.renderCustomServiceEntry = renderCustomServiceEntry;
    window.updateCustomServiceEntry = updateCustomServiceEntry;
    window.removeCustomServiceEntry = removeCustomServiceEntry;
    window.updateCustomServiceTotals = updateCustomServiceTotals;
    window.recalculateUnit = recalculateUnit;
}
