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

        // Check if Claude Code AI is required
        if (searchResults.requiresClaudeCodeAI) {
            statusDiv.style.display = 'block';
            statusDiv.style.backgroundColor = 'rgba(96, 165, 250, 0.1)';
            statusDiv.style.borderLeft = '3px solid var(--accent-electric)';
            statusDiv.style.padding = '16px';

            statusText.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <strong style="color: var(--accent-electric);">⚡ Claude Code AI Search Required</strong>
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">
                    Model <strong>${searchResults.searchQuery.model}</strong> not found in database.
                </div>
                <div style="background: var(--bg-primary); border-radius: 6px; padding: 12px; margin-bottom: 12px; font-family: 'Courier New', monospace; font-size: 10px; color: var(--text-primary); cursor: pointer;" onclick="navigator.clipboard.writeText(this.textContent.trim()); this.style.background='rgba(16, 185, 129, 0.2)'; setTimeout(() => this.style.background='var(--bg-primary)', 1000);" title="Click to copy">
                    ${searchResults.claudePrompt}
                </div>
                <div style="font-size: 10px; color: var(--text-secondary); line-height: 1.6;">
                    <strong>Instructions:</strong><br>
                    1. Click the prompt above to copy it<br>
                    2. Open Claude Code AI interface (this chat)<br>
                    3. Paste and send the prompt<br>
                    4. Claude will search manufacturer websites<br>
                    5. Copy the specifications returned by Claude<br>
                    6. Manually enter them in the fields below
                </div>
            `;

            searchBtn.textContent = '📋 Copy Claude Prompt';
            searchBtn.onclick = () => {
                navigator.clipboard.writeText(searchResults.claudePrompt);
                searchBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    searchBtn.textContent = '📋 Copy Claude Prompt';
                    searchBtn.onclick = () => performAISearch();
                }, 2000);
            };

            return;
        }

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
        } else if (searchResults.searchResults && searchResults.searchResults.length > 0) {
            // We found documents but couldn't auto-extract specs
            // Show the documents to the user so they can manually review them
            displaySpecificationDocuments(searchResults.searchResults, statusDiv, statusText);
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
 * Display specification documents found by Google search
 * @param {Array} documents - Search results with specification documents
 * @param {HTMLElement} statusDiv - Status div element
 * @param {HTMLElement} statusText - Status text element
 */
function displaySpecificationDocuments(documents, statusDiv, statusText) {
    statusDiv.style.display = 'block';
    statusDiv.style.backgroundColor = 'rgba(96, 165, 250, 0.1)';
    statusDiv.style.borderLeft = '3px solid var(--accent-electric)';
    statusDiv.style.padding = '16px';

    const documentLinks = documents.map((doc, index) => {
        const isPDF = doc.link && doc.link.toLowerCase().endsWith('.pdf');
        const icon = isPDF ? '📄' : '🔗';
        return `
            <div style="margin-bottom: 8px; padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                <a href="${doc.link}" target="_blank" style="color: var(--accent-electric); text-decoration: none; font-size: 11px; display: flex; align-items: start; gap: 8px;">
                    <span style="flex-shrink: 0;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${doc.title}</div>
                        <div style="color: var(--text-secondary); font-size: 10px; line-height: 1.4;">${doc.snippet}</div>
                        <div style="color: var(--accent-electric); font-size: 9px; margin-top: 4px;">${doc.displayLink || new URL(doc.link).hostname}</div>
                    </div>
                </a>
            </div>
        `;
    }).join('');

    statusText.innerHTML = `
        <div style="margin-bottom: 12px;">
            <strong style="color: var(--accent-electric);">✓ Found ${documents.length} Specification Document${documents.length > 1 ? 's' : ''}</strong>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">
            Could not automatically extract specifications from snippets. Click documents below to view full specifications and manually enter them in the fields.
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${documentLinks}
        </div>
        <div style="font-size: 10px; color: var(--text-secondary); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
            <strong>💡 Tip:</strong> Look for sections labeled "Specifications", "Maintenance", "Fluids & Lubricants", or "Service Intervals" in the documents.
        </div>
    `;
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
