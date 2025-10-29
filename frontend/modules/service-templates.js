/**
 * Service Templates Module
 * Clean template rendering system - no external HTML files, no string replacements
 * Uses JavaScript template literals for inline, fast rendering
 */

import { state } from '../js/state.js';

/**
 * Get fluid analysis prices from settings
 * @returns {Object} Fluid prices
 */
function getFluidPrices() {
  const settings = state.activeSettings || {};
  return {
    oil: settings.fluidAnalysisPrices?.oil || 16.55,
    coolant: settings.fluidAnalysisPrices?.coolant || 16.55,
    fuel: settings.fluidAnalysisPrices?.fuel || 60
  };
}

/**
 * Generate AI enrichment badge if service uses verified AI data
 * @param {Object} unit - Unit object
 * @param {string} serviceCode - Service code (A, B, C, etc.)
 * @returns {string} HTML for AI badge or empty string
 */
function generateAIEnrichmentBadge(unit, serviceCode) {
  // Only show badge for verified AI data
  if (!unit.aiData || !unit.aiData.verified || unit.aiData.confidence !== 'high') {
    return '';
  }

  // Check which services use AI data
  let hasAIData = false;
  let tooltipText = '';

  switch (serviceCode) {
    case 'B': // Oil & Filter Service
      if (unit.aiData.oilCapacityGallons && unit.aiData.oilType) {
        hasAIData = true;
        tooltipText = `Using AI-verified oil capacity: ${unit.aiData.oilCapacityGallons} gallons (${unit.aiData.oilType})`;
      }
      break;
    case 'C': // Coolant Service
      if (unit.aiData.coolantCapacityGallons && unit.aiData.coolantType) {
        hasAIData = true;
        tooltipText = `Using AI-verified coolant capacity: ${unit.aiData.coolantCapacityGallons} gallons (${unit.aiData.coolantType})`;
      }
      break;
    // Future: Add more services that use AI data
  }

  if (!hasAIData) {
    return '';
  }

  return `
    <span class="ai-enriched-badge" title="${tooltipText}" style="
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      cursor: help;
    ">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8V4H8"/>
        <rect x="4" y="8" width="16" height="12" rx="2"/>
        <path d="M2 14h2M20 14h2M8 14v-2M16 14v-2"/>
        <circle cx="9" cy="17" r="1"/>
        <circle cx="15" cy="17" r="1"/>
      </svg>
      <span>AI</span>
    </span>
  `;
}

/**
 * Render frequency selector buttons
 * @param {string} unitId - Unit ID
 * @param {string} code - Service code
 * @param {number} defaultFreq - Default frequency
 * @returns {string} HTML for frequency buttons
 */
function renderFrequencyButtons(unitId, code, defaultFreq) {
  return `
    <div class="frequency-selector" onclick="event.stopPropagation()">
      <button class="frequency-btn ${defaultFreq === 4 ? 'active' : ''}"
              data-freq="4"
              onclick="setFrequency('${unitId}', '${code}', 4, this)">Quarterly</button>
      <button class="frequency-btn ${defaultFreq === 2 ? 'active' : ''}"
              data-freq="2"
              onclick="setFrequency('${unitId}', '${code}', 2, this)">Semi-Annual</button>
      <button class="frequency-btn ${defaultFreq === 1 ? 'active' : ''}"
              data-freq="1"
              onclick="setFrequency('${unitId}', '${code}', 1, this)">Annual</button>
    </div>
  `;
}

/**
 * Render Service D - Fluid Analysis
 * @param {string} unitId - Unit ID
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceD(unitId, serviceDef, unit) {
  const fluidPrices = getFluidPrices();

  // Calculate price based on selected fluids (if any)
  let priceText;
  if (!unit.kw) {
    priceText = '<span style="color: var(--text-tertiary)">Enter kW first</span>';
  } else if (unit.serviceDFluids && (unit.serviceDFluids.oil || unit.serviceDFluids.coolant || unit.serviceDFluids.fuel)) {
    // Calculate total from selected fluids
    let customPrice = 0;
    if (unit.serviceDFluids.oil) customPrice += fluidPrices.oil;
    if (unit.serviceDFluids.coolant) customPrice += fluidPrices.coolant;
    if (unit.serviceDFluids.fuel) customPrice += fluidPrices.fuel;

    const frequency = unit.frequencies?.D || 1;
    const totalPrice = customPrice * frequency;
    priceText = `$${totalPrice.toFixed(2)} <span style="font-size: 9px; color: var(--text-secondary)">/ year</span>`;
  } else {
    priceText = '<span style="color: var(--text-tertiary)">Select to add</span>';
  }

  const disabled = !unit.kw ? 'opacity: 0.5; pointer-events: none;' : '';

  return `
    <div class="service-card" id="${unitId}-service-D" style="${disabled}" onclick="toggleServiceD('${unitId}')">
      <div class="service-name">${serviceDef.name}</div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>
      <div class="service-price" id="${unitId}-service-D-price">${priceText}</div>
      <div class="service-breakdown" id="${unitId}-service-D-breakdown" style="font-size: 9px; color: var(--text-secondary); margin-top: 4px;"></div>

      <div class="service-d-checkboxes" style="padding: 8px 0; border-top: 1px solid var(--border-subtle); margin-top: 8px; ">
        <div style="margin-bottom: 6px;">
          <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
            <input type="checkbox" id="${unitId}-service-D-oil" onchange="updateServiceDFluids('${unitId}')" onclick="event.stopPropagation()" style="margin-right: 6px;">
            <span id="${unitId}-service-D-oil-label">Oil Analysis - $${fluidPrices.oil.toFixed(2)}</span>
          </label>
        </div>
        <div style="margin-bottom: 6px;">
          <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
            <input type="checkbox" id="${unitId}-service-D-coolant" onchange="updateServiceDFluids('${unitId}')" onclick="event.stopPropagation()" style="margin-right: 6px;">
            <span id="${unitId}-service-D-coolant-label">Coolant Analysis - $${fluidPrices.coolant.toFixed(2)}</span>
          </label>
        </div>
        <div style="margin-bottom: 6px;">
          <label style="display: flex; align-items: center; cursor: pointer; font-size: 10px;">
            <input type="checkbox" id="${unitId}-service-D-fuel" onchange="updateServiceDFluids('${unitId}')" onclick="event.stopPropagation()" style="margin-right: 6px;">
            <span id="${unitId}-service-D-fuel-label">Fuel Analysis - $${fluidPrices.fuel.toFixed(2)}</span>
          </label>
        </div>
      </div>

      <div class="frequency-selector-d" style="">
        ${renderFrequencyButtons(unitId, 'D', serviceDef.defaultFreq || 1)}
      </div>
    </div>
  `;
}

/**
 * Render Service H - 5-Year Electrical Testing
 * @param {string} unitId - Unit ID
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceH(unitId, serviceDef, unit) {
  const priceText = unit.kw
    ? '<span style="color: var(--text-tertiary)">Select to add</span>'
    : '<span style="color: var(--text-tertiary)">Enter kW first</span>';
  const disabled = !unit.kw ? 'opacity: 0.5; pointer-events: none;' : '';

  return `
    <div class="service-card" id="${unitId}-service-H" style="${disabled}">
      <div class="service-name">${serviceDef.name}</div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>
      <div class="service-price" id="${unitId}-service-H-price">${priceText}</div>

      <div style="padding: 8px 0;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="${unitId}-service-H-checkbox" onchange="toggleServiceH('${unitId}')" style="margin-right: 8px;">
          <span style="font-size: 10px;">Include 5-Year Electrical Testing</span>
        </label>
      </div>
    </div>
  `;
}

/**
 * Render Service I - Transfer Switch Service (Multiple ATS Units)
 * @param {string} unitId - Unit ID
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceI(unitId, serviceDef, unit) {
  const defaultFreq = serviceDef.defaultFreq || 1;
  const priceText = unit.kw
    ? '<span style="color: var(--text-tertiary)">Select to add</span>'
    : '<span style="color: var(--text-tertiary)">Enter kW first</span>';
  const disabled = !unit.kw ? 'opacity: 0.5; pointer-events: none;' : '';

  return `
    <div class="service-card" id="${unitId}-service-I" data-fuel-type="" style="${disabled}" onclick="toggleService('${unitId}', 'I')">
      <div class="service-name">${serviceDef.name}</div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>

      <!-- ATS Quantity Controls -->
      <div style="display: flex; align-items: center; gap: 12px; margin: 8px 0; padding: 8px; background: var(--bg-secondary); border-radius: 4px;" onclick="event.stopPropagation();">
        <label style="font-size: 10px; color: var(--text-secondary);">ATS Units:</label>
        <button class="frequency-btn" onclick="adjustATSQuantity('${unitId}', -1); event.stopPropagation();" style="padding: 4px 12px;">−</button>
        <span id="${unitId}-ats-quantity" style="min-width: 24px; text-align: center; font-weight: 600;">1</span>
        <button class="frequency-btn" onclick="adjustATSQuantity('${unitId}', 1); event.stopPropagation();" style="padding: 4px 12px;">+</button>
        <button class="frequency-btn active" onclick="showATSDetails('${unitId}'); event.stopPropagation();" style="margin-left: auto; font-size: 9px;">
          📋 Details
        </button>
      </div>

      <!-- ATS Units List -->
      <div id="${unitId}-ats-list" style="margin: 8px 0; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
        <!-- Dynamically populated ATS unit cards -->
      </div>

      <div class="service-price" id="${unitId}-service-I-price">${priceText}</div>
      <div class="service-breakdown" id="${unitId}-service-I-breakdown" style="font-size: 9px; color: var(--text-secondary); margin-top: 4px;"></div>

      ${renderFrequencyButtons(unitId, 'I', defaultFreq)}
    </div>
  `;
}

/**
 * Render Services F & G - By Recommendation (Fuel-specific)
 * @param {string} unitId - Unit ID
 * @param {string} code - Service code (F or G)
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceFG(unitId, code, serviceDef, unit) {
  const priceText = unit.kw
    ? '<span style="color: var(--text-tertiary)">Select to add</span>'
    : '<span style="color: var(--text-tertiary)">Enter kW first</span>';
  const disabled = !unit.kw ? 'opacity: 0.5; pointer-events: none;' : '';

  return `
    <div class="service-card" id="${unitId}-service-${code}" data-fuel-type="${serviceDef.fuelType || ''}" style="${disabled}" onclick="toggleService('${unitId}', '${code}')">
      <div class="service-name">${serviceDef.name}</div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>
      <div class="service-price" id="${unitId}-service-${code}-price">${priceText}</div>

      <!-- Not Included / Add Service Toggle -->
      <div class="frequency-selector">
        <button class="frequency-btn active" data-freq="0" onclick="event.stopPropagation();">Not Included</button>
        <button class="frequency-btn" data-freq="1" onclick="event.stopPropagation();">Add Service</button>
      </div>
    </div>
  `;
}

/**
 * Render CUSTOM Service
 * @param {string} unitId - Unit ID
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceCustom(unitId, serviceDef, unit) {
  // Custom services don't require kW - always enabled
  const priceText = '<span style="color: var(--text-tertiary)">$0.00</span>';

  return `
    <div class="service-card" id="${unitId}-service-CUSTOM" onclick="toggleService('${unitId}', 'CUSTOM')">
      <div class="service-name">${serviceDef.name}</div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>
      <div class="service-price" id="${unitId}-service-CUSTOM-price">${priceText}</div>
      <div class="service-breakdown" id="${unitId}-service-CUSTOM-breakdown" style="font-size: 9px; color: var(--text-secondary); margin-top: 4px;"></div>

      <!-- Custom Services Container (supports multiple entries) -->
      <div id="${unitId}-custom-services-container" style="padding: 8px 0;">
        <!-- Custom service entries will be added here -->
      </div>

      <!-- Add Custom Service Button -->
      <button
        type="button"
        onclick="event.stopPropagation(); window.addCustomServiceEntry('${unitId}')"
        style="width: 100%; padding: 6px; margin-top: 6px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500;">
        + Add Custom Service/Part
      </button>
    </div>
  `;
}

/**
 * Render Service K - Battery Replacement
 * @param {string} unitId - Unit ID
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceK(unitId, serviceDef, unit) {
  const priceText = unit.kw
    ? '<span style="color: var(--text-tertiary)">Select to add</span>'
    : '<span style="color: var(--text-tertiary)">Enter kW first</span>';
  const disabled = !unit.kw ? 'opacity: 0.5; pointer-events: none;' : '';

  return `
    <div class="service-card" id="${unitId}-service-K" style="${disabled}" onclick="toggleService('${unitId}', 'K')">
      <div class="service-name">${serviceDef.name}</div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>
      <div class="service-price" id="${unitId}-service-K-price">${priceText}</div>
      <div class="service-breakdown" id="${unitId}-service-K-breakdown" style="font-size: 9px; color: var(--text-secondary); margin-top: 4px;"></div>
    </div>
  `;
}

/**
 * Render default service card (A, B, C, E, I, J)
 * @param {string} unitId - Unit ID
 * @param {string} code - Service code
 * @param {Object} serviceDef - Service definition
 * @param {Object} unit - Unit object
 * @returns {string} HTML
 */
function renderServiceDefault(unitId, code, serviceDef, unit) {
  const defaultFreq = serviceDef.defaultFreq || 1;
  const isNotIncluded = defaultFreq === 0;
  const priceText = unit.kw
    ? '<span style="color: var(--text-tertiary)">Select to add</span>'
    : '<span style="color: var(--text-tertiary)">Enter kW first</span>';
  const disabled = !unit.kw ? 'opacity: 0.5; pointer-events: none;' : '';

  const freqButtons = isNotIncluded ? '' : renderFrequencyButtons(unitId, code, defaultFreq);
  const aiEnrichedBadge = generateAIEnrichmentBadge(unit, code);

  return `
    <div class="service-card" id="${unitId}-service-${code}" data-fuel-type="${serviceDef.fuelType || ''}" style="${disabled}" onclick="toggleService('${unitId}', '${code}')">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div class="service-name">${serviceDef.name}</div>
        ${aiEnrichedBadge}
      </div>
      <div style="font-size: 9px; color: var(--text-secondary); margin-bottom: 8px;">${serviceDef.description}</div>
      <div class="service-price" id="${unitId}-service-${code}-price">${priceText}</div>
      <div class="service-breakdown" id="${unitId}-service-${code}-breakdown" style="font-size: 9px; color: var(--text-secondary); margin-top: 4px;"></div>
      ${freqButtons}
    </div>
  `;
}

/**
 * Main service card renderer - routes to appropriate template
 * @param {string} code - Service code
 * @param {Object} serviceDef - Service definition from SERVICES
 * @param {Object} unit - Unit object
 * @returns {string} HTML for service card
 */
export function renderServiceCard(code, serviceDef, unit) {
  const unitId = unit.id;

  // Route to specialized templates
  switch (code) {
    case 'D':
      return renderServiceD(unitId, serviceDef, unit);
    case 'H':
      return renderServiceH(unitId, serviceDef, unit);
    case 'I':
      return renderServiceI(unitId, serviceDef, unit);
    case 'F':
    case 'G':
      return renderServiceFG(unitId, code, serviceDef, unit);
    case 'K':
      return renderServiceK(unitId, serviceDef, unit);
    case 'CUSTOM':
      return renderServiceCustom(unitId, serviceDef, unit);
    default:
      return renderServiceDefault(unitId, code, serviceDef, unit);
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.renderServiceCard = renderServiceCard;
}
