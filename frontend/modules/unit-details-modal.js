/**
 * Unit Details Modal Module
 * Handles the Unit Details modal with AI search functionality
 * Dependencies: state.js, ai-unit-search.js
 */

import { state } from '../js/state.js';
import { AIUnitSearchService } from '../services/ai-unit-search.js';

// Initialize AI search service
const aiSearchService = new AIUnitSearchService();

// Track currently open unit
let currentUnitId = null;

/**
 * Open Unit Details Modal for a specific unit
 * @param {string} unitId - Unit ID to open modal for
 */
export function openUnitDetails(unitId) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) {
        console.error('Unit not found:', unitId);
        return;
    }

    currentUnitId = unitId;
    const modal = document.getElementById('unitDetailsModal');

    // Populate modal with current unit data
    populateModalData(unit);

    // Show modal
    modal.style.display = 'flex';

    console.log('Opened Unit Details modal for:', unitId, unit);
}

/**
 * Close Unit Details Modal
 */
export function closeUnitDetails() {
    const modal = document.getElementById('unitDetailsModal');
    modal.style.display = 'none';
    currentUnitId = null;

    // Clear AI search status
    const statusDiv = document.getElementById('aiSearchStatus');
    if (statusDiv) statusDiv.style.display = 'none';

    // Clear confidence indicators
    clearConfidenceIndicators();
}

/**
 * Populate modal with unit data
 * @param {Object} unit - Unit object
 */
function populateModalData(unit) {
    // Update header
    document.getElementById('modalUnitBadge').textContent = `#${unit.number}`;
    document.getElementById('modalUnitTitle').textContent =
        `${unit.kw ? unit.kw + 'kW' : 'Unconfigured'} ${unit.brand || 'Generator'}`;
    document.getElementById('modalUnitSpecs').textContent =
        `${unit.brand || 'No brand'} ${unit.model || 'No model'} ${unit.serial ? '(S/N: ' + unit.serial + ')' : ''}`;

    // Populate engine specs
    document.getElementById('modalCylinders').value = unit.cylinders || '';
    document.getElementById('modalInjectorType').value = unit.injectorType || '';

    // Show/hide injector type based on fuel
    const injectorGroup = document.getElementById('modalInjectorGroup');
    if (injectorGroup) {
        injectorGroup.style.display = unit.fuel === 'Natural Gas' ? '' : 'none';
    }

    // Populate maintenance data if exists
    if (unit.maintenanceData) {
        const data = unit.maintenanceData;

        // Fluids
        if (data.fluids) {
            document.getElementById('modalOilType').value = data.fluids.oilType || '';
            document.getElementById('modalOilCapacity').value = data.fluids.oilCapacity || '';
            document.getElementById('modalCoolantType').value = data.fluids.coolantType || '';
            document.getElementById('modalCoolantCapacity').value = data.fluids.coolantCapacity || '';
        }

        // Consumables
        if (data.consumables) {
            document.getElementById('modalOilFilter').value = data.consumables.oilFilter || '';
            document.getElementById('modalAirFilter').value = data.consumables.airFilter || '';
            document.getElementById('modalFuelFilter').value = data.consumables.fuelFilter || '';
            document.getElementById('modalBelts').value = data.consumables.belts ? data.consumables.belts.join(', ') : '';
        }

        // Intervals
        if (data.intervals) {
            document.getElementById('modalOilChange').value = data.intervals.oilChange || '';
            document.getElementById('modalAirFilterInterval').value = data.intervals.airFilter || '';
        }

        // Show data source
        if (data.source) {
            const dataSourceDiv = document.getElementById('dataSourceInfo');
            document.getElementById('dataSourceText').textContent = data.source;
            dataSourceDiv.style.display = 'block';
        }

        // Show confidence indicators if data was AI-populated
        if (data.confidence === 'high') {
            showConfidenceIndicators();
        }
    } else {
        // Clear all fields
        clearModalFields();
    }
}

/**
 * Clear all modal input fields
 */
function clearModalFields() {
    const fieldIds = [
        'modalOilType', 'modalOilCapacity', 'modalCoolantType', 'modalCoolantCapacity',
        'modalOilFilter', 'modalAirFilter', 'modalFuelFilter', 'modalBelts',
        'modalOilChange', 'modalAirFilterInterval'
    ];

    fieldIds.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });

    // Hide data source
    document.getElementById('dataSourceInfo').style.display = 'none';
}

/**
 * Show confidence indicators for AI-populated fields
 */
function showConfidenceIndicators() {
    const indicators = [
        'oilTypeConfidence', 'oilCapacityConfidence', 'coolantTypeConfidence', 'coolantCapacityConfidence',
        'oilFilterConfidence', 'airFilterConfidence', 'fuelFilterConfidence', 'beltsConfidence',
        'oilChangeConfidence', 'airFilterIntervalConfidence'
    ];

    indicators.forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) indicator.style.display = 'inline-block';
    });
}

/**
 * Clear confidence indicators
 */
function clearConfidenceIndicators() {
    const indicators = [
        'oilTypeConfidence', 'oilCapacityConfidence', 'coolantTypeConfidence', 'coolantCapacityConfidence',
        'oilFilterConfidence', 'airFilterConfidence', 'fuelFilterConfidence', 'beltsConfidence',
        'oilChangeConfidence', 'airFilterIntervalConfidence'
    ];

    indicators.forEach(id => {
        const indicator = document.getElementById(id);
        if (indicator) indicator.style.display = 'none';
    });
}

/**
 * Perform AI search for unit specifications
 */
export async function performAISearch() {
    if (!currentUnitId) {
        console.error('No unit selected');
        return;
    }

    const unit = state.units.find(u => u.id === currentUnitId);
    if (!unit) {
        console.error('Unit not found:', currentUnitId);
        return;
    }

    // Validate required fields
    if (!unit.kw || !unit.brand || !unit.model) {
        alert('Please enter kW, Brand, and Model before searching for specifications.');
        return;
    }

    // Show loading state
    const statusDiv = document.getElementById('aiSearchStatus');
    const statusText = document.getElementById('aiSearchStatusText');
    const searchBtn = document.getElementById('aiSearchBtn');

    statusDiv.style.display = 'block';
    statusText.textContent = 'Searching manufacturer websites...';
    searchBtn.disabled = true;

    try {
        console.log('Starting AI search for unit:', unit);

        // Perform AI search
        const unitData = {
            kw: unit.kw,
            brand: unit.brand,
            model: unit.model,
            serial: unit.serial || ''
        };

        const searchResults = await aiSearchService.searchUnitSpecs(unitData);

        console.log('AI search results:', searchResults);

        if (searchResults.found) {
            statusText.textContent = 'Found specifications! Populating fields...';

            // Populate fields with high-confidence data
            populateFromAIResults(searchResults);

            // Update status
            setTimeout(() => {
                statusText.textContent = '✓ Specifications loaded (100% confidence data only)';
                statusDiv.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                statusDiv.style.borderLeft = '3px solid var(--accent-success)';
            }, 500);
        } else {
            statusText.textContent = 'No high-confidence data found. You can enter specifications manually.';
            statusDiv.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            statusDiv.style.borderLeft = '3px solid var(--accent-warning)';
        }
    } catch (error) {
        console.error('AI search error:', error);
        statusText.textContent = 'Search failed. Please enter specifications manually.';
        statusDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        statusDiv.style.borderLeft = '3px solid var(--accent-danger)';
    } finally {
        searchBtn.disabled = false;
    }
}

/**
 * Populate modal fields from AI search results
 * @param {Object} results - AI search results
 */
function populateFromAIResults(results) {
    const data = results.maintenanceData;

    // Fluids
    if (data.fluids) {
        if (data.fluids.oilType) {
            document.getElementById('modalOilType').value = data.fluids.oilType;
            document.getElementById('oilTypeConfidence').style.display = 'inline-block';
        }
        if (data.fluids.oilCapacity) {
            document.getElementById('modalOilCapacity').value = data.fluids.oilCapacity;
            document.getElementById('oilCapacityConfidence').style.display = 'inline-block';
        }
        if (data.fluids.coolantType) {
            document.getElementById('modalCoolantType').value = data.fluids.coolantType;
            document.getElementById('coolantTypeConfidence').style.display = 'inline-block';
        }
        if (data.fluids.coolantCapacity) {
            document.getElementById('modalCoolantCapacity').value = data.fluids.coolantCapacity;
            document.getElementById('coolantCapacityConfidence').style.display = 'inline-block';
        }
    }

    // Consumables
    if (data.consumables) {
        if (data.consumables.oilFilter) {
            document.getElementById('modalOilFilter').value = data.consumables.oilFilter;
            document.getElementById('oilFilterConfidence').style.display = 'inline-block';
        }
        if (data.consumables.airFilter) {
            document.getElementById('modalAirFilter').value = data.consumables.airFilter;
            document.getElementById('airFilterConfidence').style.display = 'inline-block';
        }
        if (data.consumables.fuelFilter) {
            document.getElementById('modalFuelFilter').value = data.consumables.fuelFilter;
            document.getElementById('fuelFilterConfidence').style.display = 'inline-block';
        }
        if (data.consumables.belts && data.consumables.belts.length > 0) {
            document.getElementById('modalBelts').value = data.consumables.belts.join(', ');
            document.getElementById('beltsConfidence').style.display = 'inline-block';
        }
    }

    // Intervals
    if (data.intervals) {
        if (data.intervals.oilChange) {
            document.getElementById('modalOilChange').value = data.intervals.oilChange;
            document.getElementById('oilChangeConfidence').style.display = 'inline-block';
        }
        if (data.intervals.airFilter) {
            document.getElementById('modalAirFilterInterval').value = data.intervals.airFilter;
            document.getElementById('airFilterIntervalConfidence').style.display = 'inline-block';
        }
    }

    // Show data source
    if (data.source) {
        const dataSourceDiv = document.getElementById('dataSourceInfo');
        document.getElementById('dataSourceText').textContent = data.source;
        dataSourceDiv.style.display = 'block';
    }
}

/**
 * Save unit details from modal
 */
export function saveUnitDetails() {
    if (!currentUnitId) {
        console.error('No unit selected');
        return;
    }

    const unit = state.units.find(u => u.id === currentUnitId);
    if (!unit) {
        console.error('Unit not found:', currentUnitId);
        return;
    }

    // Update engine specs
    unit.cylinders = document.getElementById('modalCylinders').value;
    unit.injectorType = document.getElementById('modalInjectorType').value;

    // Also update the main form fields (cylinders and injector type)
    const cylindersField = document.getElementById(`${currentUnitId}-cylinders`);
    const injectorField = document.getElementById(`${currentUnitId}-injectorType`);
    if (cylindersField) cylindersField.value = unit.cylinders;
    if (injectorField) injectorField.value = unit.injectorType;

    // Helper function: extract gallons from capacity string
    function extractGallons(capacityString) {
        if (!capacityString) return null;
        const match = capacityString.match(/(\d+\.?\d*)\s*gallons?/i);
        return match ? parseFloat(match[1]) : null;
    }

    // Build maintenance data object (legacy format)
    const maintenanceData = {
        fluids: {
            oilType: document.getElementById('modalOilType').value,
            oilCapacity: document.getElementById('modalOilCapacity').value,
            coolantType: document.getElementById('modalCoolantType').value,
            coolantCapacity: document.getElementById('modalCoolantCapacity').value
        },
        consumables: {
            oilFilter: document.getElementById('modalOilFilter').value,
            airFilter: document.getElementById('modalAirFilter').value,
            fuelFilter: document.getElementById('modalFuelFilter').value,
            belts: document.getElementById('modalBelts').value.split(',').map(b => b.trim()).filter(b => b)
        },
        intervals: {
            oilChange: document.getElementById('modalOilChange').value,
            airFilter: document.getElementById('modalAirFilterInterval').value
        },
        source: document.getElementById('dataSourceText').textContent || 'Manual entry',
        confidence: document.getElementById('oilTypeConfidence').style.display === 'inline-block' ? 'high' : 'manual',
        lastUpdated: new Date().toISOString()
    };

    // Save to unit (legacy)
    unit.maintenanceData = maintenanceData;

    // ALSO save to aiData structure for calculation engine
    unit.aiData = {
        cylinders: unit.cylinders,
        oilType: maintenanceData.fluids.oilType,
        oilCapacityGallons: extractGallons(maintenanceData.fluids.oilCapacity),
        coolantType: maintenanceData.fluids.coolantType,
        coolantCapacityGallons: extractGallons(maintenanceData.fluids.coolantCapacity),
        oilFilter: maintenanceData.consumables.oilFilter,
        airFilter: maintenanceData.consumables.airFilter,
        fuelFilter: maintenanceData.consumables.fuelFilter,
        oilChangeInterval: maintenanceData.intervals.oilChange,
        airFilterInterval: maintenanceData.intervals.airFilter,
        fuelFilterInterval: null, // Not in modal yet
        coolantServiceInterval: null, // Not in modal yet
        engine: unit.engine || null,
        injectorType: unit.injectorType,
        verified: maintenanceData.confidence === 'high',
        confidence: maintenanceData.confidence,
        source: maintenanceData.source,
        lastUpdated: maintenanceData.lastUpdated
    };

    console.log('Saved maintenance data for unit:', currentUnitId, maintenanceData);

    // Close modal
    closeUnitDetails();

    // Show success message
    if (window.updateStatus) {
        window.updateStatus('Unit details saved');
    }
}

// Expose functions to window for onclick handlers
if (typeof window !== 'undefined') {
    window.openUnitDetails = openUnitDetails;
    window.closeUnitDetails = closeUnitDetails;
    window.performAISearch = performAISearch;
    window.saveUnitDetails = saveUnitDetails;
}
