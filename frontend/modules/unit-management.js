/**
 * Unit Management Module
 * Handles CRUD operations for generator units
 * Dependencies: state.js, utilities.js, initialization.js, service-pricing.js, service-templates.js
 */

import { state } from '../js/state.js';
import { updateStatus, getLaborRateForKW } from '../js/utilities.js';
import { SERVICES } from '../js/initialization.js';
import { debouncedUpdateServicePrices } from './service-pricing.js';
import { renderServiceCard } from './service-templates.js';
import { createLogger } from '../js/logger.js';

// Initialize logger
const logger = createLogger('UnitManagement');

/**
 * Add a new generator unit
 * @returns {void}
 */
export function addNewUnit() {
    logger.debug('addNewUnit called, state.unitCounter:', state.unitCounter);
    const unitId = 'unit-' + state.unitCounter++;
    const unit = {
        id: unitId,
        number: state.unitCounter - 1,
        kw: '',
        brand: '',
        model: '',
        fuel: '',
        location: '',
        services: [],
        serviceFrequencies: {},
        serviceDFluids: { oil: false, coolant: false, fuel: false },
        customServicePrices: {},
        calculations: null,
        aiData: {
            // AI-gathered specifications (cylinders, fluids, filters, intervals)
            cylinders: null,
            oilType: null,
            oilCapacityGallons: null,
            coolantType: null,
            coolantCapacityGallons: null,
            oilFilter: null,
            airFilter: null,
            fuelFilter: null,
            oilChangeInterval: null,
            airFilterInterval: null,
            fuelFilterInterval: null,
            coolantServiceInterval: null,
            engine: null,
            injectorType: null,
            verified: false,
            confidence: 'none',
            source: null,
            lastUpdated: null
        }
    };

    logger.debug('Created unit:', unit);
    state.units.push(unit);
    logger.debug('Calling renderUnit...');
    renderUnit(unit);
    updateMetrics();
    updateStatus(`Added Unit ${unit.number}`);
}

/**
 * Render service cards for a unit
 * @param {Object} unit - Unit object
 * @returns {string} HTML string of all service cards
 */
function renderServiceCards(unit) {
    return Object.entries(SERVICES)
        .map(([code, serviceDef]) => renderServiceCard(code, serviceDef, unit))
        .join('');
}

/**
 * Render a unit card with all services
 * @param {Object} unit - Unit object
 * @returns {void}
 */
export function renderUnit(unit) {
    const container = document.getElementById('units-container');
    if (!container) {
        logger.error('Error: units-container element not found!');
        return;
    }

    // BUG-001 FIX: Check if unit card already exists to prevent duplicates
    if (document.getElementById(unit.id)) {
        logger.warn(`Unit card ${unit.id} already exists, skipping render`);
        return;
    }

    // Clear loading message if present
    const loadingDiv = container.querySelector('div');
    if (loadingDiv && loadingDiv.innerText.trim() === 'Loading units...') {
        logger.debug('Clearing loading message...');
        container.innerHTML = '';
        logger.debug('Loading message cleared');
    } else if (loadingDiv) {
        logger.debug('Loading div found but text does not match:', loadingDiv.innerText);
    }

    // Create unit card HTML using template literal
    const unitHtml = `
        <div class="unit-card" id="${unit.id}" data-unit-id="${unit.id}">
            <div class="unit-header">
                <span class="unit-badge" data-badge-id="${unit.id}">#${unit.number}</span>
                <span class="unit-title" data-unit-title id="${unit.id}-title">${unit.kw ? unit.kw + 'kW' : 'Custom Bid'} ${unit.brand || ''}</span>
                <button class="unit-remove" onclick="removeUnit('${unit.id}')" title="Remove unit">×</button>
            </div>

            <!-- Generator Specifications -->
            <div class="generator-specs-section">
                <div class="specs-grid">
                    <div class="spec-group">
                        <label class="spec-label">kW Rating</label>
                        <input type="number" class="spec-value" id="${unit.id}-kw"
                               onchange="updateUnit('${unit.id}', 'kw', this.value); if(window.checkEnrichmentEligibility) window.checkEnrichmentEligibility('${unit.id}')"
                               value="${unit.kw || ''}" placeholder="Enter kW" min="0" max="2050">
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Brand</label>
                        <select class="spec-value" id="${unit.id}-brand"
                                onchange="handleBrandChange('${unit.id}', this.value)">
                            <option value="">Select Brand</option>
                            <option ${unit.brand === 'CAT' ? 'selected' : ''}>CAT</option>
                            <option ${unit.brand === 'Caterpillar' ? 'selected' : ''}>Caterpillar</option>
                            <option ${unit.brand === 'Cummins' ? 'selected' : ''}>Cummins</option>
                            <option ${unit.brand === 'Detroit Diesel' ? 'selected' : ''}>Detroit Diesel</option>
                            <option ${unit.brand === 'Generac' ? 'selected' : ''}>Generac</option>
                            <option ${unit.brand === 'Katolight' ? 'selected' : ''}>Katolight</option>
                            <option ${unit.brand === 'Kohler' ? 'selected' : ''}>Kohler</option>
                            <option ${unit.brand === 'MTU' ? 'selected' : ''}>MTU</option>
                            <option ${unit.brand === 'Multiquip' ? 'selected' : ''}>Multiquip</option>
                            <option ${unit.brand === 'Stamford' ? 'selected' : ''}>Stamford</option>
                            <option ${unit.brand === 'Sullivan-Palatek' ? 'selected' : ''}>Sullivan-Palatek</option>
                            <option ${unit.brand === 'Volvo' ? 'selected' : ''}>Volvo</option>
                            <option value="Other">Other</option>
                        </select>
                        <input type="text" class="spec-value" id="${unit.id}-brand-custom"
                               style="display: none; margin-top: 4px;"
                               placeholder="Enter custom brand"
                               onchange="updateUnit('${unit.id}', 'brand', this.value); if(window.checkEnrichmentEligibility) window.checkEnrichmentEligibility('${unit.id}')">
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Model</label>
                        <input type="text" class="spec-value" id="${unit.id}-model"
                               onchange="updateUnit('${unit.id}', 'model', this.value); if(window.checkEnrichmentEligibility) window.checkEnrichmentEligibility('${unit.id}')"
                               value="${unit.model || ''}" placeholder="Enter model">
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Serial</label>
                        <input type="text" class="spec-value" id="${unit.id}-serial"
                               onchange="updateUnit('${unit.id}', 'serial', this.value)"
                               value="${unit.serial || ''}" placeholder="Enter serial">
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Fuel Type</label>
                        <select class="spec-value" id="${unit.id}-fuel"
                                onchange="updateUnit('${unit.id}', 'fuel', this.value); toggleInjectorType('${unit.id}', this.value)">
                            <option value="">Select Fuel</option>
                            <option ${unit.fuel === 'Diesel' ? 'selected' : ''}>Diesel</option>
                            <option ${unit.fuel === 'Natural Gas' ? 'selected' : ''}>Natural Gas</option>
                            <option ${unit.fuel === 'Propane' ? 'selected' : ''}>Propane</option>
                        </select>
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Location</label>
                        <input type="text" class="spec-value" id="${unit.id}-location"
                               onchange="updateUnit('${unit.id}', 'location', this.value)"
                               value="${unit.location || ''}" placeholder="Building/Area">
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Install Year</label>
                        <input type="number" class="spec-value" id="${unit.id}-year"
                               onchange="updateUnit('${unit.id}', 'year', this.value)"
                               value="${unit.year || ''}" placeholder="Year" min="1980" max="2025">
                    </div>
                    <div class="spec-group">
                        <label class="spec-label">Cylinders</label>
                        <select class="spec-value" id="${unit.id}-cylinders"
                                onchange="updateUnit('${unit.id}', 'cylinders', this.value)">
                            <option value="">Select Cylinders</option>
                            <option value="2" ${unit.cylinders === '2' ? 'selected' : ''}>2 Cylinder</option>
                            <option value="3" ${unit.cylinders === '3' ? 'selected' : ''}>3 Cylinder</option>
                            <option value="4" ${unit.cylinders === '4' ? 'selected' : ''}>4 Cylinder</option>
                            <option value="6" ${unit.cylinders === '6' ? 'selected' : ''}>6 Cylinder</option>
                            <option value="8" ${unit.cylinders === '8' ? 'selected' : ''}>8 Cylinder</option>
                            <option value="10" ${unit.cylinders === '10' ? 'selected' : ''}>10 Cylinder</option>
                            <option value="12" ${unit.cylinders === '12' ? 'selected' : ''}>12 Cylinder</option>
                            <option value="16" ${unit.cylinders === '16' ? 'selected' : ''}>16 Cylinder</option>
                            <option value="18" ${unit.cylinders === '18' ? 'selected' : ''}>18 Cylinder</option>
                            <option value="20" ${unit.cylinders === '20' ? 'selected' : ''}>20 Cylinder</option>
                            <option value="24" ${unit.cylinders === '24' ? 'selected' : ''}>24 Cylinder</option>
                        </select>
                    </div>
                    <div class="spec-group" data-injector-row style="${unit.fuel === 'Natural Gas' ? '' : 'display: none;'}">
                        <label class="spec-label">Injector Type</label>
                        <select class="spec-value" id="${unit.id}-injectorType"
                                onchange="updateUnit('${unit.id}', 'injectorType', this.value)">
                            <option value="">Select Type</option>
                            <option value="pop" ${unit.injectorType === 'pop' ? 'selected' : ''}>Pop Nozzle</option>
                            <option value="unit" ${unit.injectorType === 'unit' ? 'selected' : ''}>Unit Injector</option>
                        </select>
                    </div>
                </div>

                <!-- Generator Enrichment Panel -->
                <div id="${unit.id}-enrichment-panel" class="enrichment-panel" style="display: none;">
                    <!-- Confidence Badge -->
                    <div class="confidence-container">
                        <div id="${unit.id}-confidence-badge" class="confidence-badge">
                            <span class="confidence-icon material-symbols-outlined">verified</span>
                            <div class="confidence-info">
                                <span id="${unit.id}-confidence-label" class="confidence-label">High Confidence</span>
                                <span id="${unit.id}-confidence-score" class="confidence-score">85%</span>
                            </div>
                            <span id="${unit.id}-enrichment-tier" class="enrichment-tier">AI Enrichment</span>
                        </div>
                    </div>
                    
                    <!-- Enriched Specifications -->
                    <div class="enriched-specs">
                        <h4>Enriched Specifications</h4>
                        
                        <!-- Engine Details -->
                        <div id="${unit.id}-engine-specs" class="spec-section" style="display: none;">
                            <h5><span class="material-symbols-outlined">settings</span> Engine</h5>
                            <div class="spec-grid">
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Make:</span>
                                    <span id="${unit.id}-engine-make" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Model:</span>
                                    <span id="${unit.id}-engine-model" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Cylinders:</span>
                                    <span id="${unit.id}-engine-cylinders" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Displacement:</span>
                                    <span id="${unit.id}-engine-displacement" class="spec-value-enrichment">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Fluid Capacities -->
                        <div id="${unit.id}-fluid-specs" class="spec-section" style="display: none;">
                            <h5><span class="material-symbols-outlined">water_drop</span> Fluids</h5>
                            <div class="spec-grid">
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Oil Capacity:</span>
                                    <span id="${unit.id}-oil-capacity" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Oil Type:</span>
                                    <span id="${unit.id}-oil-type" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Coolant Capacity:</span>
                                    <span id="${unit.id}-coolant-capacity" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Coolant Type:</span>
                                    <span id="${unit.id}-coolant-type" class="spec-value-enrichment">-</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Maintenance Intervals -->
                        <div id="${unit.id}-maintenance-specs" class="spec-section" style="display: none;">
                            <h5><span class="material-symbols-outlined">schedule</span> Maintenance</h5>
                            <div class="spec-grid">
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Service A:</span>
                                    <span id="${unit.id}-service-a-interval" class="spec-value-enrichment">-</span>
                                </div>
                                <div class="spec-item">
                                    <span class="spec-label-enrichment">Service B:</span>
                                    <span id="${unit.id}-service-b-interval" class="spec-value-enrichment">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Enrichment Sources -->
                    <div id="${unit.id}-enrichment-sources" class="enrichment-sources">
                        <span class="sources-label">Data sources:</span>
                        <span id="${unit.id}-sources-text" class="sources-text">-</span>
                    </div>
                </div>

                <!-- Enrich Button -->
                <button id="${unit.id}-enrich-btn" class="btn-enrich" onclick="enrichGenerator('${unit.id}')" style="display: none;">
                    <span class="material-symbols-outlined">auto_awesome</span>
                    Enrich Generator Data
                </button>
                
                <!-- Unit Details Button -->
                <div style="margin-top: 12px; padding: 0 12px;">
                    <button class="btn btn-secondary" onclick="openUnitDetails('${unit.id}')" 
                            style="width: 100%; padding: 10px; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">manage_search</span>
                        <span>Unit Details & AI Search</span>
                    </button>
                </div>
            </div>

            <!-- Services Section -->
            <div class="services-section">
                <div class="section-title">
                    <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">build</span>
                    Service Selection
                </div>
                <div class="services-grid" data-services-container></div>
            </div>

            <div class="unit-footer">
                <span id="${unit.id}-service-count">No services selected</span>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', unitHtml);

    // Insert service cards into the services container
    const servicesContainer = document.querySelector(`#${unit.id} [data-services-container]`);
    if (servicesContainer) {
        const servicesHtml = renderServiceCards(unit);
        servicesContainer.innerHTML = servicesHtml;
    }

    // Initialize default frequencies
    setTimeout(() => {
        if (!unit.serviceFrequencies) unit.serviceFrequencies = {};

        Object.entries(SERVICES).forEach(([code, service]) => {
            // NEW POLICY: All services start unselected (defaultFreq is for frequency buttons only)
            const defaultFreq = service.defaultFreq || 0;
            unit.serviceFrequencies[code] = defaultFreq;

            // CHANGED: No services are auto-initialized anymore
            // Users must explicitly select services by clicking on service cards
            // This ensures clean starting state with no pre-selected services

            // Note: Service D and H checkboxes are handled by their respective update functions
            // when user clicks to activate those services

            // Remove 'active' class from all service cards (ensures clean state)
            if (unit.services.includes(code)) {
                const serviceCard = document.getElementById(`${unit.id}-service-${code}`);
                if (serviceCard) serviceCard.classList.add('active');
            }
        });

        // BUG FIX: Initialize Service D checkbox states AFTER DOM is ready
        // The checkboxes are rendered with checked="true" but updateServiceDFluids() needs
        // to be called to sync the checkbox states to unit.serviceDFluids
        // This must happen after the service cards are in the DOM
        logger.debug('[INIT] About to call updateServiceDFluids for:', unit.id);
        if (window.updateServiceDFluids) {
            logger.debug('[INIT] updateServiceDFluids exists, calling...');
            window.updateServiceDFluids(unit.id);
            logger.debug('[INIT] updateServiceDFluids called');
        } else {
            logger.error('[INIT] updateServiceDFluids NOT available on window!');
        }

        // Update service count display
        const serviceCountElement = document.getElementById(`${unit.id}-service-count`);
        if (serviceCountElement) {
            const count = unit.services.length;
            serviceCountElement.textContent = count === 0
                ? 'No services selected'
                : `${count} service${count === 1 ? '' : 's'} selected`;
        }

        // Trigger initial calculation
        // kW is optional when ONLY custom services are selected
        const hasOnlyCustomServices = unit.services.length > 0 &&
            unit.services.every(svc => svc === 'CUSTOM');
        const canCalculate = (unit.kw || hasOnlyCustomServices) && unit.services.length > 0;

        if (canCalculate && window.recalculateUnit) {
            window.recalculateUnit(unit.id);
        } else if (canCalculate && debouncedUpdateServicePrices) {
            debouncedUpdateServicePrices(unit.id);
        }
    }, 100);
}

/**
 * Toggle unit collapse/expand
 * @param {string} unitId - Unit ID
 * @returns {void}
 */
export function toggleUnit(unitId) {
    const unitElement = document.getElementById(unitId);
    if (unitElement) {
        unitElement.classList.toggle('collapsed');
    }
}

/**
 * Handle brand dropdown change - show custom input if "Other" selected
 * @param {string} unitId - The unit ID
 * @param {string} value - The selected brand value
 * @returns {void}
 */
export function handleBrandChange(unitId, value) {
    const customInput = document.getElementById(`${unitId}-brand-custom`);

    if (value === 'Other') {
        // Show custom input field
        if (customInput) {
            customInput.style.display = 'block';
            customInput.focus();
        }
    } else {
        // Hide custom input and update with selected brand
        if (customInput) {
            customInput.style.display = 'none';
            customInput.value = '';
        }
        updateUnit(unitId, 'brand', value);
        if (window.checkEnrichmentEligibility) {
            window.checkEnrichmentEligibility(unitId);
        }
    }
}

/**
 * Update unit property
 * @param {string} unitId - Unit ID
 * @param {string} property - Property name
 * @param {any} value - New value
 * @returns {void}
 */
export function updateUnit(unitId, property, value) {
    logger.grandTrace('updateUnit() FIRED', { unitId, property, value, activeSettings: state.activeSettings, timestamp: Date.now() });
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Update property (convert kW to number for calculations)
    // ENHANCED FIX: Always convert kW to number, handle empty/null/undefined
    const convertedValue = property === 'kw'
        ? (value === '' || value === null || value === undefined ? value : Number(value) || value)
        : value;

    unit[property] = convertedValue;

    // Update display elements
    const titleElement = document.getElementById(`${unitId}-title`);
    if (titleElement && property === 'kw') {
        titleElement.textContent = `${value}kW ${unit.brand || 'Generator'}`;
    }

    // Enable/disable service cards based on kW
    if (property === 'kw') {
        updateServiceCards(unitId, !!value);
        // BUG-002 FIX: Always update service prices when kW changes (even if no services selected yet)
        // This updates the preview prices shown on service cards so users can see what each service costs
        if (value && debouncedUpdateServicePrices) {
            debouncedUpdateServicePrices(unitId);
        }

        // BUG FIX 4: Look up correct labor rate for this kW from settings tiers
        if (value && getLaborRateForKW) {
            const laborRate = getLaborRateForKW(value);
            if (laborRate && laborRate !== state.activeSettings?.laborRate) {
                logger.debug(`[KW LOOKUP] ${value}kW → $${laborRate}/hr`);
                // Note: This logs the rate but doesn't change settings - just informs user
                // The actual rate will be used during calculation via state.activeSettings
            }
        }
    }

    // Filter services by fuel type
    if (property === 'fuel') {
        filterServicesByFuelType(unitId, value);
    }

    // Trigger recalculation if unit has services selected
    if (unit.services.length > 0 && window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
}

/**
 * Filter services based on fuel type
 * @param {string} unitId - Unit ID
 * @param {string} fuelType - Fuel type
 * @returns {void}
 */
function filterServicesByFuelType(unitId, fuelType) {
    Object.entries(SERVICES).forEach(([code, service]) => {
        const serviceCard = document.getElementById(`${unitId}-service-${code}`);
        if (serviceCard && service.fuelType) {
            // Show only if fuel type matches or no fuel type specified
            if (service.fuelType === fuelType || !fuelType) {
                serviceCard.style.display = '';
            } else {
                serviceCard.style.display = 'none';
            }
        }
    });
}

/**
 * Enable/disable service cards
 * @param {string} unitId - Unit ID
 * @param {boolean} enabled - Enable or disable
 * @returns {void}
 */
function updateServiceCards(unitId, enabled) {
    logger.debug('🔄 updateServiceCards called:', { unitId, enabled });
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) {
        logger.warn('updateServiceCards: unit not found:', unitId);
        return;
    }

    // Re-render service cards with updated unit data
    const servicesContainer = document.querySelector(`#${unitId} [data-services-container]`);
    if (servicesContainer) {
        logger.debug('📝 Re-rendering service cards for kW:', unit.kw);
        const servicesHtml = renderServiceCards(unit);
        servicesContainer.innerHTML = servicesHtml;

        // Restore selected services after re-render
        unit.services.forEach(code => {
            const serviceCard = document.getElementById(`${unitId}-service-${code}`);
            if (serviceCard) {
                serviceCard.classList.add('active');
            }
        });

        // Restore frequency selections
        Object.entries(unit.serviceFrequencies || {}).forEach(([code, freq]) => {
            const freqButtons = document.querySelectorAll(`#${unitId}-service-${code} .frequency-btn`);
            freqButtons.forEach(btn => {
                if (parseInt(btn.dataset.freq) === freq) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });

        // BUG FIX: Re-initialize Service D checkbox states after re-render
        // When service cards are re-rendered (e.g., when kW changes), the checkboxes
        // are rendered with checked="true" but the state needs to be synced
        logger.debug('[UPDATE] About to call updateServiceDFluids for:', unitId);
        if (window.updateServiceDFluids) {
            logger.debug('[UPDATE] updateServiceDFluids exists, calling...');
            window.updateServiceDFluids(unitId);
            logger.debug('[UPDATE] updateServiceDFluids called');
        } else {
            logger.error('[UPDATE] updateServiceDFluids NOT available on window!');
        }

        logger.debug('✅ Service cards re-rendered successfully');
    } else {
        logger.warn('updateServiceCards: services container not found for', unitId);
    }
}

/**
 * Remove a unit
 * @param {string} unitId - Unit ID
 * @returns {void}
 */
export function removeUnit(unitId) {
    if (!confirm('Remove this generator unit?')) return;

    // Remove from DOM
    const unitElement = document.getElementById(unitId);
    if (unitElement) {
        unitElement.remove();
    }

    // Remove from state
    state.units = state.units.filter(u => u.id !== unitId);

    // Clean up references
    delete state.unitEventListeners?.[unitId];

    if (window.updateMetrics) window.updateMetrics();
    if (window.updateSummary) window.updateSummary();
    updateStatus('Unit removed');
}

/**
 * Update metrics display (helper function)
 * @returns {void}
 */
function updateMetrics() {
    if (window.updateMetrics) {
        window.updateMetrics();
    }
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.addNewUnit = addNewUnit;
    window.renderUnit = renderUnit;
    window.toggleUnit = toggleUnit;
    window.updateUnit = updateUnit;
    window.removeUnit = removeUnit;
}
