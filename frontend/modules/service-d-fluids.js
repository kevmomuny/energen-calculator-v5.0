/**
 * Service D Fluids Module
 * Handles Service D (Fluid Analysis) fluid selection and pricing
 * @module service-d-fluids
 * @version 5.0.0
 */

// No external dependencies - this module is self-contained

/**
 * Get fluid analysis prices from settings or default configuration
 * @returns {Object} Object with oil, coolant, and fuel prices
 */
function getFluidAnalysisPrices() {
    // First try to get from settingsUI instance if available
    if (window.settingsUI && window.settingsUI.settings) {
        const settings = window.settingsUI.settings;
        // Check both new field names and legacy field names
        const oilPrice = settings.oilAnalysisPrice || settings.oilAnalysisCost;
        const coolantPrice = settings.coolantAnalysisPrice || settings.coolantAnalysisCost;
        const fuelPrice = settings.fuelAnalysisPrice || settings.fuelAnalysisCost;

        if (oilPrice !== undefined && coolantPrice !== undefined && fuelPrice !== undefined) {
            return {
                oil: parseFloat(oilPrice) || 16.55,
                coolant: parseFloat(coolantPrice) || 16.55,
                fuel: parseFloat(fuelPrice) || 60.00
            };
        }
    }

    // Then try state settings
    if (window.state && window.state.defaultSettings) {
        const oilPrice = window.state.defaultSettings.oilAnalysisPrice ||
                       window.state.defaultSettings.oilAnalysisCost;
        const coolantPrice = window.state.defaultSettings.coolantAnalysisPrice ||
                           window.state.defaultSettings.coolantAnalysisCost;
        const fuelPrice = window.state.defaultSettings.fuelAnalysisPrice ||
                        window.state.defaultSettings.fuelAnalysisCost;

        if (oilPrice && coolantPrice && fuelPrice) {
            return {
                oil: parseFloat(oilPrice) || 16.55,
                coolant: parseFloat(coolantPrice) || 16.55,
                fuel: parseFloat(fuelPrice) || 60.00
            };
        }
    }

    // Check if we have Excel tables configuration available
    if (window.excelTables && window.excelTables.costFactors) {
        return {
            oil: window.excelTables.costFactors.oilAnalysis || 16.55,
            coolant: window.excelTables.costFactors.coolantAnalysis || 16.55,  // Same as oil analysis
            fuel: window.excelTables.costFactors.fuelAnalysis || 60.00
        };
    }

    // Default fallback values matching settings modal
    return {
        oil: 16.55,      // Matches settings modal default
        coolant: 16.55,  // Matches settings modal default
        fuel: 60.00      // Matches settings modal default
    };
}

/**
 * Update Service D fluid labels with current prices
 * @param {string} unitId - The unit ID
 */
function updateServiceDLabels(unitId) {
    const prices = getFluidAnalysisPrices();

    const oilLabel = document.getElementById(`${unitId}-service-D-oil-label`);
    const coolantLabel = document.getElementById(`${unitId}-service-D-coolant-label`);
    const fuelLabel = document.getElementById(`${unitId}-service-D-fuel-label`);

    if (oilLabel) oilLabel.textContent = `Oil Analysis - $${prices.oil.toFixed(2)}`;
    if (coolantLabel) coolantLabel.textContent = `Coolant Analysis - $${prices.coolant.toFixed(2)}`;
    if (fuelLabel) fuelLabel.textContent = `Fuel Analysis - $${prices.fuel.toFixed(2)}`;
}

/**
 * Initialize Service D with checkboxes unchecked by default
 * @param {string} unitId - The unit ID
 */
function initializeServiceD(unitId) {
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Initialize with NO fluids selected by default
    if (!unit.serviceDFluids) {
        unit.serviceDFluids = {
            oil: false,
            coolant: false,
            fuel: false
        };
    }

    // Don't call updateServiceDFluids here - service should not be auto-selected
}

/**
 * Toggle Service D - special handling for fluid analysis
 * @param {string} unitId - The unit ID
 */
function toggleServiceD(unitId) {
    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit) return;

    const serviceCard = document.getElementById(`${unitId}-service-D`);
    const index = unit.services.indexOf('D');

    // Check if clicking on a checkbox - if so, don't toggle the card
    if (event && event.target && (event.target.type === 'checkbox' || event.target.closest('label'))) {
        return; // Let the checkbox handle its own state
    }

    if (index === -1) {
        // Adding Service D
        unit.services.push('D');
        if (serviceCard) serviceCard.classList.add('active');
    } else {
        // Removing Service D
        unit.services.splice(index, 1);
        if (serviceCard) serviceCard.classList.remove('active');

        // Also uncheck all fluid checkboxes
        const oilCheckbox = document.getElementById(`${unitId}-service-D-oil`);
        const coolantCheckbox = document.getElementById(`${unitId}-service-D-coolant`);
        const fuelCheckbox = document.getElementById(`${unitId}-service-D-fuel`);

        if (oilCheckbox) oilCheckbox.checked = false;
        if (coolantCheckbox) coolantCheckbox.checked = false;
        if (fuelCheckbox) fuelCheckbox.checked = false;

        // Clear the fluid selections in the unit
        unit.serviceDFluids = { oil: false, coolant: false, fuel: false };
    }

    // Update service count and recalculate
    const serviceCountElement = document.getElementById(`${unitId}-service-count`);
    if (serviceCountElement) serviceCountElement.textContent = `${unit.services.length} services selected`;

    if (window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
}

// Throttle map for Service D fluid updates (prevent cascade)
const serviceDThrottle = new Map();

/**
 * Update Service D fluid analysis selections
 * @param {string} unitId - The unit ID
 */
function updateServiceDFluids(unitId) {
    console.log('=== DEBUG: updateServiceDFluids START ===');
    console.log('1. Unit ID:', unitId);

    // Throttle: Skip if update already in progress for this unit
    if (serviceDThrottle.has(unitId)) {
        console.log('⏸️ Throttled: Service D update already in progress');
        return;
    }

    // Set throttle flag
    serviceDThrottle.set(unitId, true);

    const unit = window.state.units.find(u => u.id === unitId);
    if (!unit || !unit.kw) {
        console.log('ERROR: No unit found or unit has no kW');
        serviceDThrottle.delete(unitId);
        return;
    }

    const oilCheckbox = document.getElementById(`${unitId}-service-D-oil`);
    const coolantCheckbox = document.getElementById(`${unitId}-service-D-coolant`);
    const fuelCheckbox = document.getElementById(`${unitId}-service-D-fuel`);

    console.log('2. Checkbox states:');
    console.log('   Oil checkbox:', oilCheckbox?.checked, 'exists?', oilCheckbox !== null);
    console.log('   Coolant checkbox:', coolantCheckbox?.checked, 'exists?', coolantCheckbox !== null);
    console.log('   Fuel checkbox:', fuelCheckbox?.checked, 'exists?', fuelCheckbox !== null);

    // Store fluid selections in unit metadata
    if (!unit.serviceDFluids) {
        unit.serviceDFluids = {};
    }

    unit.serviceDFluids.oil = oilCheckbox ? oilCheckbox.checked : false;
    unit.serviceDFluids.coolant = coolantCheckbox ? coolantCheckbox.checked : false;
    unit.serviceDFluids.fuel = fuelCheckbox ? fuelCheckbox.checked : false;

    console.log('3. Unit fluid selections:', unit.serviceDFluids);

    // Check if at least one fluid is selected
    const hasSelection = unit.serviceDFluids.oil || unit.serviceDFluids.coolant || unit.serviceDFluids.fuel;

    // Ensure frequencies object exists
    if (!unit.frequencies) {
        unit.frequencies = {};
        console.log('   Created unit.frequencies object');
    }

    if (hasSelection) {
        // Add Service D if not already added
        if (!unit.services.includes('D')) {
            unit.services.push('D');
            unit.frequencies['D'] = 1; // Default to annual
            console.log('   Added Service D to unit.services');
        }
    } else {
        // Remove Service D if no fluids selected
        const serviceIndex = unit.services.indexOf('D');
        if (serviceIndex > -1) {
            unit.services.splice(serviceIndex, 1);
            delete unit.frequencies['D'];
            console.log('   Removed Service D from unit.services');
        }
    }

    // Update the service card visually - use 'active' class like other services
    const serviceCard = document.getElementById(`${unitId}-service-D`);
    if (serviceCard) {
        if (hasSelection) {
            serviceCard.classList.add('active');
        } else {
            serviceCard.classList.remove('active');
        }
    }

    // Calculate the custom price based on selected fluids using settings prices
    const fluidPrices = getFluidAnalysisPrices();
    console.log('4. Fluid prices from settings:', fluidPrices);

    let customPrice = 0;
    if (unit.serviceDFluids.oil) {
        customPrice += fluidPrices.oil;
        console.log('   Adding oil price:', fluidPrices.oil);
    }
    if (unit.serviceDFluids.coolant) {
        customPrice += fluidPrices.coolant;
        console.log('   Adding coolant price:', fluidPrices.coolant);
    }
    if (unit.serviceDFluids.fuel) {
        customPrice += fluidPrices.fuel;
        console.log('   Adding fuel price:', fluidPrices.fuel);
    }
    console.log('5. Total custom price for Service D:', customPrice);

    // Store the custom price for Service D
    if (!unit.customServicePrices) {
        unit.customServicePrices = {};
    }
    unit.customServicePrices['D'] = customPrice;
    console.log('6. Stored in unit.customServicePrices[D]:', unit.customServicePrices['D']);

    // Update the price display
    const priceElement = document.getElementById(`${unitId}-service-D-price`);
    if (priceElement && hasSelection) {
        const frequency = unit.frequencies['D'] || 1;
        const totalPrice = customPrice * frequency;
        priceElement.innerHTML = `$${totalPrice.toFixed(2)} <span style="font-size: 9px; color: var(--text-secondary)">/ year</span>`;

        // Update breakdown
        const breakdownElement = document.getElementById(`${unitId}-service-D-breakdown`);
        if (breakdownElement) {
            const selectedFluids = [];
            if (unit.serviceDFluids.oil) selectedFluids.push('Oil');
            if (unit.serviceDFluids.coolant) selectedFluids.push('Coolant');
            if (unit.serviceDFluids.fuel) selectedFluids.push('Fuel');
            breakdownElement.textContent = `Testing: ${selectedFluids.join(', ')}`;
        }
    } else if (priceElement) {
        priceElement.innerHTML = '<span style="color: var(--text-tertiary)">Select fluids to test</span>';
    }

    // Trigger calculation update
    console.log('7. Calling recalculateUnit for:', unitId);
    console.log('=== DEBUG: updateServiceDFluids END ===');

    if (window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }

    // Clear throttle flag after 100ms to allow next update
    setTimeout(() => {
        serviceDThrottle.delete(unitId);
    }, 100);
}

// Export functions
export {
    getFluidAnalysisPrices,
    updateServiceDLabels,
    initializeServiceD,
    toggleServiceD,
    updateServiceDFluids
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.getFluidAnalysisPrices = getFluidAnalysisPrices;
    window.updateServiceDLabels = updateServiceDLabels;
    window.initializeServiceD = initializeServiceD;
    window.toggleServiceD = toggleServiceD;
    window.updateServiceDFluids = updateServiceDFluids;
}
