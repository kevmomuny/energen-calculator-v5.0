/**
 * Global Handlers Module
 * =====================
 * Bridges inline HTML event handlers to modular ES6 code
 *
 * This module serves as the compatibility layer between:
 * - Legacy inline onclick/onchange handlers in HTML
 * - Modern ES6 modules in modules/* and services/*
 *
 * MIGRATION PATH:
 * Phase 1 (Current): Expose functions globally for inline handlers
 * Phase 2 (Future): Convert inline handlers to data attributes + event delegation
 * Phase 3 (Future): Remove this file entirely
 */

// Automated Testing Mode - Disable all blocking popups
// Set window.AUTOMATED_TEST_MODE = true in console to enable
window.AUTOMATED_TEST_MODE = window.AUTOMATED_TEST_MODE || false;

// Wrapper functions for alerts/confirms that respect test mode
window.safeConfirm = function(message) {
    if (window.AUTOMATED_TEST_MODE) {
        console.log('[TEST MODE] Auto-confirming:', message);
        return true; // Auto-confirm in test mode
    }
    return confirm(message);
};

window.safeAlert = function(message) {
    if (window.AUTOMATED_TEST_MODE) {
        console.log('[TEST MODE] Suppressing alert:', message);
        return; // Suppress in test mode
    }

    // Use non-blocking custom modal instead of alert()
    showNonBlockingModal(message);
};

// Non-blocking modal for validation messages (Kapture-friendly)
function showNonBlockingModal(message) {
    // Remove existing modal if present
    const existingModal = document.getElementById('non-blocking-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'non-blocking-modal';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: var(--surface-color, #1e1e1e);
        border: 1px solid var(--border-color, #333);
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    // Create title
    const title = document.createElement('div');
    title.textContent = 'localhost:3002 says';
    title.style.cssText = `
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary, #fff);
        margin-bottom: 16px;
    `;

    // Create message
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
        font-size: 13px;
        color: var(--text-secondary, #ccc);
        margin-bottom: 20px;
        white-space: pre-line;
        line-height: 1.5;
    `;

    // Create OK button
    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.id = 'modal-ok-button';
    okButton.style.cssText = `
        background: var(--primary, #3b82f6);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 40px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        float: right;
    `;

    okButton.onclick = function() {
        modalOverlay.remove();
    };

    // Assemble modal
    modalContent.appendChild(title);
    modalContent.appendChild(messageEl);
    modalContent.appendChild(okButton);
    modalOverlay.appendChild(modalContent);

    // Add to page
    document.body.appendChild(modalOverlay);

    // Focus OK button for keyboard access
    okButton.focus();

    // Allow ESC key to close
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            modalOverlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Import all required modules
import { state } from '../js/state.js';
import { addNewUnit, renderUnit, removeUnit, updateUnit as updateUnitFromModule, handleBrandChange } from './unit-management.js';
import { updateStatus, formatMoney, debounce } from '../js/utilities.js';
import { EnrichmentService } from '../services/enrichment.js';
import { CalculationService } from '../services/calculation.js';
import { PDFService } from '../services/pdf-service.js';
import { ZohoIntegration } from '../services/zoho-integration.js';
import { logoSelector } from '../services/logo-selector.js';
import ContactManager from '../js/contact-manager.js';

// Sprint 7: Import post-creation workflow modules
import { openEmailQuoteModal } from './email-quote.js';
import { duplicateCurrentQuote } from './quote-duplication.js';
import { createRevisionForCurrentQuote } from './quote-revision.js';

// Quote data builder with service schedule + calculation hash
import { buildQuoteData } from '../services/quote-data-builder.js';

// Initialize services
const enrichmentService = new EnrichmentService();
const calculationService = window.EnergenApp?.modules?.calculation || new CalculationService(window.eventBus);
const pdfService = PDFService;
let zohoService = null;
let contactManager = null;

// Initialize contact manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        contactManager = new ContactManager();
    });
} else {
    contactManager = new ContactManager();
}

// ============================================================================
// ERROR HANDLING WRAPPER
// ============================================================================

/**
 * Wraps a handler function with comprehensive error handling
 * @param {Function} fn - The handler function to wrap
 * @param {string} handlerName - Name of the handler for error messages
 * @returns {Function} Wrapped function with error handling
 */
function safeHandler(fn, handlerName) {
    return function(...args) {
        try {
            const result = fn.apply(this, args);

            // Handle async functions
            if (result instanceof Promise) {
                return result.catch(error => {
                    console.error(`[${handlerName}] Async error:`, error);
                    updateStatus(`Error in ${handlerName}: ${error.message}`, 'error');
                    // Return rejected promise to maintain async behavior
                    return Promise.reject(error);
                });
            }

            return result;
        } catch (error) {
            console.error(`[${handlerName}] Error:`, error);
            console.error('Stack trace:', error.stack);
            updateStatus(`Error in ${handlerName}: ${error.message}`, 'error');

            // Show critical errors to user
            if (error.message.includes('state') || error.message.includes('undefined')) {
                console.error('CRITICAL: State or module initialization issue detected');
                console.error('Current state:', window.state);
                console.error('Available modules:', Object.keys(window));
            }

            throw error; // Re-throw so caller can handle if needed
        }
    };
}

// Export safe handler for use in other modules
window.safeHandler = safeHandler;

// ============================================================================
// UNIT MANAGEMENT HANDLERS
// ============================================================================

/**
 * Toggle unit expanded/collapsed state
 */
window.toggleUnit = function(unitId) {
    const unitCard = document.getElementById(unitId);
    if (!unitCard) return;

    const servicesContainer = unitCard.querySelector('.services-container');
    if (servicesContainer) {
        servicesContainer.classList.toggle('collapsed');
    }
};

/**
 * Handle brand dropdown change - show custom input if "Other" selected
 */
window.handleBrandChange = handleBrandChange;

/**
 * Update unit property (kW, brand, model, fuel, etc.)
 * IMPORTANT: Delegates to the correct updateUnit from unit-management.js
 * which handles service card enablement via updateServiceCards()
 */
window.updateUnit = function(unitId, property, value) {
    // Delegate to the proper implementation that calls updateServiceCards
    updateUnitFromModule(unitId, property, value);
};

/**
 * Toggle service selection
 */
window.toggleService = async function(unitId, serviceCode) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    const serviceIndex = unit.services.indexOf(serviceCode);
    if (serviceIndex > -1) {
        unit.services.splice(serviceIndex, 1);
    } else {
        unit.services.push(serviceCode);
    }

    // Update service card visual state
    const serviceCard = document.querySelector(`#${unitId} [data-service="${serviceCode}"]`);
    if (serviceCard) {
        serviceCard.classList.toggle('service-active');
    }

    // Recalculate unit totals
    if (window.recalculateUnit) {
        await window.recalculateUnit(unitId);
    }
};

/**
 * Set service frequency
 */
window.setFrequency = async function(unitId, serviceCode, frequency, buttonElement) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    unit.serviceFrequencies = unit.serviceFrequencies || {};
    unit.serviceFrequencies[serviceCode] = frequency;

    // Update button visual state
    if (buttonElement) {
        const parent = buttonElement.parentElement;
        parent.querySelectorAll('.freq-btn').forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
    }

    // Recalculate
    if (window.recalculateUnit) {
        await window.recalculateUnit(unitId);
    }
};

/**
 * Toggle Service D (Oil & Fuel Analysis) with fluid selection
 */
window.toggleServiceD = function(unitId) {
    if (window.toggleService) {
        window.toggleService(unitId, 'D');
    }
};

/**
 * Update Service D fluid selections
 * REMOVED: This was a legacy function that conflicted with the correct implementation in service-d-fluids.js
 * The service-d-fluids.js module exports the correct version that uses getElementById() instead of data attributes
 * Keeping this comment as a reminder that updateServiceDFluids is provided by service-d-fluids.js module
 */
// window.updateServiceDFluids = function(unitId) { ... }  // REMOVED - use service-d-fluids.js version

/**
 * Toggle Service H (5-year electrical testing)
 */
window.toggleServiceH = function(unitId) {
    if (window.toggleService) {
        window.toggleService(unitId, 'H');
    }
};

/**
 * Update custom service pricing
 */
window.updateCustomService = function(unitId) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    const customInput = document.querySelector(`#${unitId} [data-custom-price]`);
    if (customInput) {
        unit.customServicePrices = unit.customServicePrices || {};
        unit.customServicePrices.CUSTOM = parseFloat(customInput.value) || 0;
    }

    // Recalculate
    if (window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
};

/**
 * Toggle injector type visibility based on fuel type
 */
window.toggleInjectorType = function(unitId, fuelType) {
    const injectorRow = document.querySelector(`#${unitId} [data-injector-row]`);
    if (injectorRow) {
        injectorRow.style.display = fuelType === 'Natural Gas' ? 'flex' : 'none';
    }
};

/**
 * Recalculate unit totals (calls backend API)
 */
window.recalculateUnit = async function(unitId) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || !unit.kw) return;

    try {
        updateStatus('Calculating...', 'info');

        // Call calculation API with simple service codes array
        // (frequencies and options are passed separately)
        const result = await calculationService.calculate({
            kw: unit.kw,
            services: unit.services, // Just the array of service codes: ['A', 'B', 'C']
            serviceFrequencies: unit.serviceFrequencies || {},
            serviceOptions: unit.serviceOptions || {},
            serviceDFluids: unit.serviceDFluids || null,
            customServices: unit.customServicePrices || {},
            atsUnits: unit.atsUnits || [{ id: 1, includeMobilization: false }],  // ATS units for Service I
            distance: state.distance || 0,
            address: state.customer?.address || '',
            city: state.customer?.city || '',
            state: state.customer?.state || 'CA',
            zip: state.customer?.zip || '',
            settings: state.activeSettings
        });

        unit.calculations = result;

        // Update unit footer with totals
        const footerElement = document.querySelector(`#${unitId} .unit-footer`);
        if (footerElement) {
            footerElement.innerHTML = `
                <span>${unit.services.length} services selected</span>
                <span class="unit-total">$${formatMoney(result.subtotal || 0)}</span>
            `;
        }

        // CRITICAL FIX: Update summary metrics (top of UI) after recalculating unit
        if (window.updateSummary) {
            window.updateSummary(state);
        }

        updateStatus('Calculation complete', 'success');

    } catch (error) {
        // Only log if it's not the "no services selected" error
        if (!error.message.includes('At least one service must be selected')) {
            console.error('Recalculation failed:', error);
            updateStatus('Calculation failed', 'error');
        }
        // Silently ignore "no services selected" errors during initialization
    }
};

/**
 * BUG FIX 2: Recalculate all units (used when settings change)
 */
window.recalculateAllUnits = async function() {
    console.log('🔄 Recalculating all units with new settings...');

    for (const unit of state.units) {
        if (unit.kw && unit.services && unit.services.length > 0) {
            await window.recalculateUnit(unit.id);
        }
    }

    // Update summary
    if (window.updateSummary) {
        window.updateSummary(state);
    }

    updateStatus('Prices updated with new settings', 'success');
    console.log('✅ All units recalculated');
};

// ============================================================================
// CUSTOMER ENRICHMENT HANDLERS
// ============================================================================

/**
 * Handle company name input (triggers autocomplete)
 */
window.handleCompanyInput = debounce(async function() {
    const companyName = document.getElementById('companyName')?.value || '';
    
    // Clear dropdown if less than 3 characters
    if (companyName.length < 3) {
        hideAutocompleteDropdown();
        return;
    }

    try {
        updateStatus('Searching...', 'info');
        const result = await enrichmentService.autocomplete(companyName);

        if (result?.predictions?.length > 0) {
            showAutocompleteDropdown(result.predictions);
            updateStatus('', 'success');
        } else {
            // Show "no results" message in dropdown
            showNoResultsDropdown(companyName);
            updateStatus('No matches found', 'warning');
        }
    } catch (error) {
        console.error('Autocomplete failed:', error);
        showErrorDropdown('Search failed - please try again');
        updateStatus('Search failed', 'error');
    }
}, 300);

/**
 * Handle company name blur (triggers enrichment)
 */
window.handleCompanyChange = async function() {
    const companyName = document.getElementById('companyName')?.value || '';
    if (companyName.length < 2) return;

    // Trigger enrichment if we have address too
    const address = document.getElementById('address')?.value || '';
    if (address) {
        await window.enrichCustomer();
    }
};

/**
 * Handle address input
 */
window.handleAddressInput = debounce(async function() {
    const address = document.getElementById('address')?.value || '';
    const companyName = document.getElementById('companyName')?.value || '';

    if (address.length > 4 && companyName) {
        await window.enrichCustomer();
    }
}, 500);

/**
 * Enrich customer data from Google Places API
 */
window.enrichCustomer = async function() {
    const companyName = document.getElementById('companyName')?.value || '';
    const address = document.getElementById('address')?.value || '';

    if (!companyName) {
        updateStatus('Please enter a company name', 'warning');
        return;
    }

    try {
        updateStatus('Enriching customer data...', 'info');

        console.log('[ENRICHMENT] Starting with:', { companyName, address, placeId: state.selectedPlaceId });
        const enriched = await enrichmentService.enrichCustomer(companyName, address, state.selectedPlaceId);
        console.log('[ENRICHMENT] Received data:', enriched);

        // Update form fields
        if (enriched.addressComponents) {
            console.log('[ENRICHMENT] Updating address fields:', enriched.addressComponents);
            const fields = {
                street: 'address',
                city: 'city',
                state: 'state',
                zip: 'zip'
            };

            for (const [key, elementId] of Object.entries(fields)) {
                const value = enriched.addressComponents[key];
                if (value) {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.value = value;
                        console.log(`[ENRICHMENT] Set ${elementId} = ${value}`);
                    } else {
                        console.warn(`[ENRICHMENT] Element not found: ${elementId}`);
                    }
                }
            }
        } else {
            console.warn('[ENRICHMENT] No addressComponents in enriched data');
        }

        if (enriched.formatted_phone_number) {
            const phoneEl = document.getElementById('phone');
            if (phoneEl) {
                phoneEl.value = enriched.formatted_phone_number;
                console.log('[ENRICHMENT] Set phone:', enriched.formatted_phone_number);
            }
        }

        if (enriched.website) {
            const websiteEl = document.getElementById('website');
            if (websiteEl) {
                websiteEl.value = enriched.website;
                console.log('[ENRICHMENT] Set website:', enriched.website);
            }
        }

        state.enrichmentData = enriched;
        updateStatus('Customer data enriched', 'success');

        // Automatically calculate distance after enrichment
        if (enriched.addressComponents) {
            await window.calculateDistance();
        }

    } catch (error) {
        console.error('[ENRICHMENT] Failed:', error);
        updateStatus('Enrichment failed', 'error');
    }
};

/**
 * Show autocomplete dropdown
 */
function showAutocompleteDropdown(predictions) {
    const dropdown = document.getElementById('companyDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    predictions.forEach(prediction => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <div class="autocomplete-item-main">
                ${prediction.structured_formatting?.main_text || prediction.description.split(',')[0]}
            </div>
            <div class="autocomplete-item-secondary">
                ${prediction.structured_formatting?.secondary_text || ''}
            </div>
        `;
        item.onclick = () => selectAutocompleteSuggestion(prediction);
        dropdown.appendChild(item);
    });
    dropdown.classList.add('show');
}

/**
 * Select autocomplete suggestion
 */
async function selectAutocompleteSuggestion(prediction) {
    const companyName = prediction.structured_formatting?.main_text ||
                        prediction.description.split(',')[0];

    document.getElementById('companyName').value = companyName;
    state.selectedPlaceId = prediction.place_id;
    hideAutocompleteDropdown();

    // Wait for enrichment to complete before returning
    await window.enrichCustomer();
}

/**
 * Hide autocomplete dropdown
 */
function hideAutocompleteDropdown() {
    const dropdown = document.getElementById('companyDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

/**
 * Show "no results" message in dropdown
 */
function showNoResultsDropdown(query) {
    const dropdown = document.getElementById('companyDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = `
        <div class="autocomplete-item no-results" onclick="hideAutocompleteDropdown()">
            <div class="autocomplete-item-main">No companies found for "${query}"</div>
            <div class="autocomplete-item-secondary">Try a different search term or enter manually</div>
        </div>
    `;
    dropdown.classList.add('show');
}

/**
 * Show error message in dropdown
 */
function showErrorDropdown(message) {
    const dropdown = document.getElementById('companyDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = `
        <div class="autocomplete-item error" onclick="hideAutocompleteDropdown()">
            <div class="autocomplete-item-main">${message}</div>
            <div class="autocomplete-item-secondary">Click to dismiss</div>
        </div>
    `;
    dropdown.classList.add('show');
}

// ============================================================================
// CALCULATION & QUOTE HANDLERS
// ============================================================================

/**
 * Calculate quote totals
 */
window.calculateQuote = async function() {
    try {
        // VALIDATION STEP 1: Check required customer fields
        const validationErrors = [];

        const companyName = document.getElementById('companyName')?.value?.trim();
        if (!companyName) {
            validationErrors.push('Customer name is required');
        }

        const zip = document.getElementById('zip')?.value?.trim();
        if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) {
            validationErrors.push('ZIP must be 5 digits (e.g., 95123)');
        }

        // VALIDATION STEP 2: Check for at least one unit with services
        const hasValidUnits = state.units.some(unit => unit.kw && unit.services.length > 0);
        if (!hasValidUnits) {
            validationErrors.push('Add at least one generator with selected services');
        }

        // VALIDATION STEP 3: If validation service is available, use it for detailed validation
        if (window.validationService) {
            // BUG-006 FIX: Check BOTH email fields - use whichever has a value
            // There are two email fields in the UI: #email and #primaryEmail
            // Validation should succeed if EITHER field is filled
            const primaryEmail = document.getElementById('primaryEmail')?.value?.trim();
            const email = document.getElementById('email')?.value?.trim();
            const emailValue = primaryEmail || email || '';
            
            console.log('BUG-006 FIX: Email validation check', {
                primaryEmail: primaryEmail || '(empty)',
                email: email || '(empty)',
                using: emailValue || '(none)'
            });

            const customerData = {
                company_name: companyName,
                zip: zip,
                email: emailValue, // Use combined email value from either field
                phone: document.getElementById('phone')?.value?.trim()
            };

            const result = window.validationService.validateForm(customerData);
            if (!result.valid) {
                for (const [field, fieldResult] of Object.entries(result.fields)) {
                    if (!fieldResult.valid) {
                        validationErrors.push(...fieldResult.errors);
                    }
                }
            }
        }

        // VALIDATION STEP 4: Show errors if any
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.join('\n• ');
            window.safeAlert('Please fix the following before calculating:\n\n• ' + errorMessage);
            updateStatus('Validation failed', 'error');
            return; // STOP - do not proceed with calculation
        }

        // Validation passed - proceed with calculation
        updateStatus('Calculating quote...', 'info');

        // Sync customer data to state (BUG FIX: Customer state sync)
        const customerData = {
            company_name: companyName,
            zip: zip,
            email: document.getElementById('primaryEmail')?.value?.trim() || document.getElementById('email')?.value?.trim() || '',
            phone: document.getElementById('phone')?.value?.trim() || '',
            address: document.getElementById('address')?.value?.trim() || '',
            city: document.getElementById('city')?.value?.trim() || '',
            state: document.getElementById('state')?.value?.trim() || '',
            contact_name: document.getElementById('contactName')?.value?.trim() || ''
        };

        if (window.updateCustomer) {
            window.updateCustomer(customerData);
            console.log('Customer state synced:', state.customer);
        }

        // Recalculate all units
        for (const unit of state.units) {
            if (unit.kw && unit.services.length > 0) {
                await window.recalculateUnit(unit.id);
            }
        }

        // Calculate grand totals
        const grandTotal = state.units.reduce((sum, unit) => {
            return sum + (unit.calculations?.subtotal || 0);
        }, 0);

        // BUG-004 FIX: Update summary panel with complete summary
        // Call updateSummary() from summary-calculator.js to show all details
        if (window.updateSummary) {
            window.updateSummary(state);
        }

        // Also update the simple quote-summary element if it exists
        const summaryElement = document.getElementById('quote-summary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <div class="summary-line">
                    <span>Subtotal:</span>
                    <span>$${formatMoney(grandTotal)}</span>
                </div>
            `;
        }

        updateStatus('Quote calculated', 'success');

    } catch (error) {
        console.error('Quote calculation failed:', error);
        updateStatus('Calculation failed', 'error');
    }
};

/**
 * Calculate distance between office and customer
 */
window.calculateDistance = async function() {
    const address = document.getElementById('address')?.value || '';
    const city = document.getElementById('city')?.value || '';
    const state = document.getElementById('state')?.value || '';
    const zip = document.getElementById('zip')?.value || '';

    if (!address || !city) {
        updateStatus('Please enter customer address', 'warning');
        return;
    }

    try {
        updateStatus('Calculating distance...', 'info');

        // Get shop address from settings
        const settings = window.settingsManager?.getSettings() || {};
        const shopAddress = settings.shopAddress || '150 Mason Circle, Suite K, Concord, CA 94520';

        // Build customer address string
        const customerAddress = zip
            ? `${address}, ${city}, ${state} ${zip}`
            : `${address}, ${city}, ${state}`;

        const response = await fetch('/api/enrichment/distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin: shopAddress,
                destination: customerAddress
            })
        });

        if (!response.ok) throw new Error('Distance API failed');

        const result = await response.json();

        const distanceEl = document.getElementById('distance');
        if (distanceEl && result.distance) {
            // Show one-way distance in the field
            distanceEl.value = result.distance;
            // Update state with full distance data
            if (window.state) {
                window.state.distance = result.distance;
                window.state.distanceData = result;
            }
        }

        updateStatus(`Distance calculated: ${result.distance} miles one-way`, 'success');

    } catch (error) {
        console.error('Distance calculation failed:', error);
        updateStatus('Distance calculation failed', 'error');
    }
};

/**
 * Handle distance input change
 */
window.handleDistanceChange = function() {
    // Trigger recalculation with new distance
    if (window.calculateQuote) {
        window.calculateQuote();
    }
};

// ============================================================================
// PDF & EXPORT HANDLERS
// ============================================================================

/**
 * Generate PDF quote
 */
window.generatePDF = async function() {
    try {
        updateStatus('Generating PDF...', 'info');

        // BUILD QUOTE DATA WITH SERVICE SCHEDULE + HASH
        const quoteData = await buildQuoteData(state);
        const result = await pdfService.generate(quoteData);

        if (result.success && result.pdfPath) {
            updateStatus('PDF generated successfully', 'success');

            // Open PDF in new tab
            window.open(result.pdfPath, '_blank');
        } else {
            throw new Error('PDF generation failed');
        }

    } catch (error) {
        console.error('PDF generation failed:', error);
        updateStatus('PDF generation failed', 'error');
    }
};

/**
 * Save quote to database
 */
window.saveQuote = async function() {
    try {
        updateStatus('Saving quote...', 'info');

        // BUILD QUOTE DATA WITH SERVICE SCHEDULE + HASH
        const quoteData = await buildQuoteData(state);

        const response = await fetch('/api/save-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteData)
        });

        if (!response.ok) throw new Error('Save failed');

        const result = await response.json();

        updateStatus(`Quote saved: ${result.quoteNumber}`, 'success');

    } catch (error) {
        console.error('Save failed:', error);
        updateStatus('Failed to save quote', 'error');
    }
};

/**
 * Duplicate quote - Sprint 7 implementation
 * Opens modal with smart data handling
 */
window.duplicateQuote = async function() {
    try {
        await duplicateCurrentQuote();
    } catch (error) {
        console.error('[DUPLICATE] Handler error:', error);
        updateStatus('Failed to duplicate quote', 'error');
    }
};

/**
 * Email quote - Sprint 7 implementation
 * Opens professional email modal with preview
 */
window.emailQuote = async function() {
    try {
        // BUILD QUOTE DATA WITH SERVICE SCHEDULE + HASH
        const quoteData = await buildQuoteData(state);
        await openEmailQuoteModal(quoteData);
    } catch (error) {
        console.error('[EMAIL] Handler error:', error);
        updateStatus('Failed to open email modal', 'error');
    }
};

/**
 * Create revision - Sprint 7 implementation
 * Opens revision modal with change detection
 */
window.createRevision = async function() {
    try {
        await createRevisionForCurrentQuote();
    } catch (error) {
        console.error('[REVISION] Handler error:', error);
        updateStatus('Failed to create revision', 'error');
    }
};

/**
 * Sync with Zoho CRM
 */
window.syncWithZoho = async function() {
    if (!zohoService) {
        zohoService = new ZohoIntegration();
    }

    try {
        updateStatus('Syncing with Zoho...', 'info');

        const quoteData = buildQuoteData();
        const result = await zohoService.export(quoteData);

        if (result.success) {
            updateStatus('Synced with Zoho successfully', 'success');
        } else {
            throw new Error('Zoho sync failed');
        }

    } catch (error) {
        console.error('Zoho sync failed:', error);
        updateStatus('Zoho sync failed', 'error');
    }
};

// ============================================================================
// CONTACT & MODAL HANDLERS
// ============================================================================

/**
 * Add contact to quote - Creates dynamic modal
 */
window.addContact = function() {
    // Create modern modal dialog for adding contacts
    const existingModal = document.querySelector('.contact-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Get current company name from Zoho selected account or customer form
    const companyName = state.customer?.companyName ||
                       document.getElementById('companyName')?.value || '';

    const modal = document.createElement('div');
    modal.className = 'contact-modal-overlay';
    modal.innerHTML = `
        <div class="contact-modal">
            <div class="contact-modal-header">
                <h3>Add New Contact</h3>
                <button class="modal-close-btn" onclick="closeContactModal()">&times;</button>
            </div>
            <div class="contact-modal-body">
                <form id="contactForm" onsubmit="handleContactSubmit(event)">
                    <!-- Business Card Upload Section -->
                    <div class="form-group" style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 20px; color: var(--accent-primary);">credit_card</span>
                            <span>Business Card Auto-Fill (Optional)</span>
                        </label>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <label for="businessCardUpload" style="cursor: pointer; flex: 1; padding: 12px; border: 2px dashed var(--border-subtle); border-radius: 6px; text-align: center; background: var(--bg-primary); transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <span class="material-symbols-outlined" style="font-size: 24px; color: var(--accent-primary);">upload_file</span>
                                <span style="font-size: 12px; color: var(--text-secondary);">Click or drag business card image</span>
                            </label>
                            <input type="file" id="businessCardUpload" accept="image/*" style="display: none;" onchange="processBusinessCard(event)">
                            <button type="button" class="btn btn-sm" onclick="captureBusinessCard()" style="padding: 12px; white-space: nowrap;">
                                <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">photo_camera</span>
                                Take Photo
                            </button>
                        </div>
                        <div id="businessCardPreview" style="margin-top: 12px; display: none;">
                            <img id="businessCardImage" style="max-width: 100%; max-height: 200px; border-radius: 6px; border: 1px solid var(--border-subtle);" alt="Business card preview">
                            <div style="font-size: 10px; color: var(--accent-success); margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                                <span class="material-symbols-outlined" style="font-size: 16px;">check_circle</span>
                                <span>Processing business card with AI OCR...</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="contactName">Full Name *</label>
                        <input type="text" id="contactName" required placeholder="John Smith">
                    </div>
                    <div class="form-group">
                        <label for="contactCompany">Company *</label>
                        <input type="text" id="contactCompany" required placeholder="ABC Corporation" value="${companyName}">
                        <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 4px;">You can edit this field if needed</div>
                    </div>
                    <div class="form-group">
                        <label for="contactEmail">Email *</label>
                        <input type="email" id="contactEmail" required placeholder="john@abccorp.com">
                    </div>

                    <!-- Multiple Phone Numbers Section -->
                    <div class="form-group">
                        <label>Phone Numbers</label>
                        <div id="phoneNumbersList">
                            <div class="phone-entry" style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <input type="tel" class="phone-input" placeholder="(555) 123-4567" style="flex: 1;">
                                <select class="phone-type" style="width: 120px; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary);">
                                    <option value="work">Work</option>
                                    <option value="mobile">Mobile</option>
                                    <option value="home">Home</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <button type="button" class="btn btn-sm" onclick="addPhoneNumber()" style="font-size: 11px; padding: 6px 12px; margin-top: 4px;">
                            <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">add</span>
                            Add Phone
                        </button>
                    </div>

                    <div class="form-group">
                        <label for="contactTitle">Job Title</label>
                        <input type="text" id="contactTitle" placeholder="Facilities Manager">
                    </div>

                    <!-- Contact Photo Section -->
                    <div class="form-group">
                        <label for="contactPhoto">Contact Photo (Optional)</label>
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div id="contactPhotoPreview" style="width: 64px; height: 64px; border-radius: 50%; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid var(--border-subtle);">
                                <span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-tertiary);">person</span>
                            </div>
                            <div style="flex: 1;">
                                <input type="url" id="contactPhoto" placeholder="https://example.com/photo.jpg" style="width: 100%; padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); font-size: 14px;" oninput="updateContactPhotoPreview(this.value)">
                                <button type="button" class="btn btn-sm" onclick="scrapeContactPhoto()" style="font-size: 10px; padding: 4px 8px; margin-top: 6px;">
                                    <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">search</span>
                                    Find Photo (Social Media)
                                </button>
                                <div style="font-size: 9px; color: var(--text-tertiary); margin-top: 4px;">We'll search Instagram, Facebook, LinkedIn (95% confidence)</div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="contactNotes">Notes</label>
                        <textarea id="contactNotes" rows="3" placeholder="Additional notes..."></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="closeContactModal()">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Contact</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Add modal styles if not already present
    if (!document.getElementById('contact-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'contact-modal-styles';
        style.textContent = `
            .contact-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            }
            .contact-modal {
                background: var(--bg-elevated);
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                border: 1px solid var(--border-subtle);
            }
            .contact-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px 16px;
                border-bottom: 1px solid var(--border-subtle);
            }
            .contact-modal-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: var(--text-primary);
            }
            .modal-close-btn {
                background: none;
                border: none;
                font-size: 28px;
                color: var(--text-tertiary);
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s;
            }
            .modal-close-btn:hover {
                background: var(--bg-hover);
                color: var(--text-primary);
            }
            .contact-modal-body {
                padding: 24px;
            }
            .form-group {
                margin-bottom: 16px;
            }
            .form-group label {
                display: block;
                margin-bottom: 6px;
                font-size: 14px;
                font-weight: 500;
                color: var(--text-secondary);
            }
            .form-group input,
            .form-group textarea {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid var(--border-subtle);
                border-radius: 6px;
                background: var(--bg-primary);
                color: var(--text-primary);
                font-size: 14px;
                font-family: inherit;
                transition: all 0.2s;
                box-sizing: border-box;
            }
            .form-group input:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: var(--accent-primary);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            .modal-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid var(--border-subtle);
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Pre-fill company name from current customer
    const companyInput = document.getElementById('contactCompany');
    if (companyInput && state.customer?.companyName) {
        companyInput.value = state.customer.companyName;
    }

    // Focus first input
    setTimeout(() => {
        const nameInput = document.getElementById('contactName');
        if (nameInput) nameInput.focus();
    }, 100);
};

/**
 * Handle contact form submission
 */
window.handleContactSubmit = async function(event) {
    event.preventDefault();

    const name = document.getElementById('contactName')?.value;
    const company = document.getElementById('contactCompany')?.value;
    const email = document.getElementById('contactEmail')?.value;
    const title = document.getElementById('contactTitle')?.value;
    const notes = document.getElementById('contactNotes')?.value;
    const photoUrl = document.getElementById('contactPhoto')?.value;

    if (!name || !company || !email) {
        updateStatus('Please fill in all required fields', 'error');
        return;
    }

    // Collect all phone numbers
    const phoneEntries = document.querySelectorAll('.phone-entry');
    const phones = [];
    phoneEntries.forEach(entry => {
        const phoneInput = entry.querySelector('.phone-input');
        const typeSelect = entry.querySelector('.phone-type');
        if (phoneInput && phoneInput.value.trim()) {
            phones.push({
                number: phoneInput.value.trim(),
                type: typeSelect?.value || 'work'
            });
        }
    });

    // Add contact to state
    if (!state.customer.contacts) {
        state.customer.contacts = [];
    }

    const contact = {
        id: Date.now(),
        name,
        company,
        email,
        phones: phones, // Array of phone objects instead of single phone
        title,
        notes,
        photoUrl: photoUrl || null,
        createdAt: new Date().toISOString()
    };

    state.customer.contacts.push(contact);

    // Use ContactManager if available for Zoho sync
    if (window.contactManager && typeof window.contactManager.addContact === 'function') {
        updateStatus('Saving contact...', 'info');
        try {
            await window.contactManager.addContact(contact);
            window.contactManager.renderContactList();
            console.log('Contact added:', contact);
            updateStatus(`Contact added: ${name}`, 'success');
        } catch (error) {
            console.error('Contact save error:', error);
            updateStatus(`Contact saved locally (Zoho sync failed: ${error.message})`, 'warning');
        }
    }

    // Close modal
    closeContactModal();
};

/**
 * Close contact modal
 */
window.closeContactModal = function() {
    const modal = document.querySelector('.contact-modal-overlay');
    if (modal) {
        modal.remove();
    }
};

/**
 * Add phone number field
 */
window.addPhoneNumber = function() {
    const list = document.getElementById('phoneNumbersList');
    if (!list) return;

    const phoneEntry = document.createElement('div');
    phoneEntry.className = 'phone-entry';
    phoneEntry.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
    phoneEntry.innerHTML = `
        <input type="tel" class="phone-input" placeholder="(555) 123-4567" style="flex: 1;">
        <select class="phone-type" style="width: 120px; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary);">
            <option value="work">Work</option>
            <option value="mobile">Mobile</option>
            <option value="home">Home</option>
            <option value="other">Other</option>
        </select>
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="padding: 10px; width: 40px;">
            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
        </button>
    `;
    list.appendChild(phoneEntry);
};

/**
 * Scrape contact photo from social media
 */
window.scrapeContactPhoto = async function() {
    const nameInput = document.getElementById('contactName');
    const companyInput = document.getElementById('contactCompany');
    const photoInput = document.getElementById('contactPhoto');
    const photoPreview = document.getElementById('contactPhotoPreview');

    if (!nameInput?.value) {
        updateStatus('Please enter contact name first', 'warning');
        return;
    }

    try {
        updateStatus('Searching for contact photo...', 'info');

        const response = await fetch('/api/enrichment/contact-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nameInput.value,
                company: companyInput?.value || '',
                sources: ['linkedin', 'facebook', 'instagram']
            })
        });

        if (!response.ok) throw new Error('Photo search failed');

        const result = await response.json();

        if (result.success && result.photoUrl && result.confidence >= 95) {
            photoInput.value = result.photoUrl;
            photoPreview.innerHTML = `<img src="${result.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Contact">`;
            updateStatus(`Photo found (${result.confidence}% confidence from ${result.source})`, 'success');
        } else if (result.confidence < 95) {
            updateStatus(`Photo found but confidence too low (${result.confidence}%). Manual verification needed.`, 'warning');
        } else {
            updateStatus('No photo found with 95%+ confidence', 'warning');
        }
    } catch (error) {
        console.error('Photo scraping failed:', error);
        updateStatus('Photo search unavailable - you can enter URL manually', 'info');
    }
};

/**
 * Update contact photo preview when URL is entered
 */
window.updateContactPhotoPreview = function(url) {
    const photoPreview = document.getElementById('contactPhotoPreview');
    if (!photoPreview) return;

    if (url && url.startsWith('http')) {
        photoPreview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Contact" onerror="this.parentElement.innerHTML='<span class=\\"material-symbols-outlined\\" style=\\"font-size: 32px; color: var(--text-tertiary);\\">person</span>'">`;
    } else {
        photoPreview.innerHTML = `<span class="material-symbols-outlined" style="font-size: 32px; color: var(--text-tertiary);">person</span>`;
    }
};

/**
 * Process business card image upload
 */
window.processBusinessCard = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('businessCardPreview');
    const image = document.getElementById('businessCardImage');

    // Show preview
    if (preview && image) {
        const reader = new FileReader();
        reader.onload = function(e) {
            image.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    try {
        updateStatus('Reading business card with AI OCR...', 'info');

        // Create FormData to send image
        const formData = new FormData();
        formData.append('businessCard', file);

        const response = await fetch('/api/enrichment/business-card-ocr', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Business card OCR failed');

        const result = await response.json();

        if (result.success && result.confidence >= 90) {
            // Auto-fill form fields
            if (result.name) document.getElementById('contactName').value = result.name;
            if (result.company) document.getElementById('contactCompany').value = result.company;
            if (result.email) document.getElementById('contactEmail').value = result.email;
            if (result.title) document.getElementById('contactTitle').value = result.title;

            // Handle multiple phone numbers
            const phonesList = document.getElementById('phoneNumbersList');
            if (phonesList && result.phones && result.phones.length > 0) {
                phonesList.innerHTML = ''; // Clear existing
                result.phones.forEach((phone, index) => {
                    const phoneEntry = document.createElement('div');
                    phoneEntry.className = 'phone-entry';
                    phoneEntry.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px;';
                    phoneEntry.innerHTML = `
                        <input type="tel" class="phone-input" placeholder="(555) 123-4567" style="flex: 1;" value="${phone.number || phone}">
                        <select class="phone-type" style="width: 120px; padding: 10px; border: 1px solid var(--border-subtle); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary);">
                            <option value="work" ${phone.type === 'work' ? 'selected' : ''}>Work</option>
                            <option value="mobile" ${phone.type === 'mobile' ? 'selected' : ''}>Mobile</option>
                            <option value="home" ${phone.type === 'home' ? 'selected' : ''}>Home</option>
                            <option value="other" ${phone.type === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                        ${index > 0 ? `<button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="padding: 10px; width: 40px;">
                            <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                        </button>` : '<div style="width: 40px;"></div>'}
                    `;
                    phonesList.appendChild(phoneEntry);
                });
            }

            updateStatus(`Business card processed (${result.confidence}% confidence)`, 'success');
        } else if (result.confidence < 90) {
            updateStatus(`Business card read but low confidence (${result.confidence}%). Please verify data.`, 'warning');
        } else {
            updateStatus('Could not read business card. Please enter manually.', 'warning');
        }
    } catch (error) {
        console.error('Business card OCR failed:', error);
        updateStatus('Business card OCR unavailable - please enter manually', 'info');
    }
};

/**
 * Capture business card with camera
 */
window.captureBusinessCard = async function() {
    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Use back camera on mobile
        });

        // Create video preview modal
        const cameraModal = document.createElement('div');
        cameraModal.className = 'camera-modal-overlay';
        cameraModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10001;';
        cameraModal.innerHTML = `
            <video id="cameraPreview" autoplay playsinline style="max-width: 90%; max-height: 70vh; border-radius: 8px;"></video>
            <div style="margin-top: 20px; display: flex; gap: 12px;">
                <button class="btn btn-primary" onclick="takeBusinessCardSnapshot()" style="padding: 12px 24px;">
                    <span class="material-symbols-outlined" style="font-size: 20px; vertical-align: middle;">photo_camera</span>
                    Capture
                </button>
                <button class="btn btn-secondary" onclick="closeCameraModal()" style="padding: 12px 24px;">Cancel</button>
            </div>
        `;

        document.body.appendChild(cameraModal);

        const video = document.getElementById('cameraPreview');
        video.srcObject = stream;

        // Store stream for cleanup
        window.currentCameraStream = stream;

    } catch (error) {
        console.error('Camera access failed:', error);
        updateStatus('Camera access denied or unavailable', 'error');
    }
};

/**
 * Take snapshot of business card from camera
 */
window.takeBusinessCardSnapshot = function() {
    const video = document.getElementById('cameraPreview');
    if (!video) return;

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to blob and process
    canvas.toBlob(async (blob) => {
        const file = new File([blob], 'business-card.jpg', { type: 'image/jpeg' });

        // Create fake event for processBusinessCard
        const fakeEvent = {
            target: {
                files: [file]
            }
        };

        // Close camera modal
        window.closeCameraModal();

        // Process the captured image
        await window.processBusinessCard(fakeEvent);
    }, 'image/jpeg', 0.95);
};

/**
 * Close camera modal and stop stream
 */
window.closeCameraModal = function() {
    const modal = document.querySelector('.camera-modal-overlay');
    if (modal) modal.remove();

    if (window.currentCameraStream) {
        window.currentCameraStream.getTracks().forEach(track => track.stop());
        window.currentCameraStream = null;
    }
};

// ============================================================================
// UI & SETTINGS HANDLERS
// ============================================================================

/**
 * Switch view (calculator, customers, settings, etc.)
 */
window.switchView = function(view, event) {
    if (event) event.preventDefault();

    // Update active state in activity bar
    document.querySelectorAll('.activity-item').forEach(item => {
        item.classList.remove('active');
    });

    if (event && event.target) {
        event.target.closest('.activity-item')?.classList.add('active');
    }

    // Hide all views
    const calculatorView = document.getElementById('calculatorView');
    const rfpUploadView = document.getElementById('rfpUploadView');
    const customersView = document.getElementById('customersView');
    const documentsView = document.getElementById('documentsView');
    const reportsView = document.getElementById('reportsView');
    
    if (calculatorView) calculatorView.style.display = 'none';
    if (rfpUploadView) rfpUploadView.style.display = 'none';
    if (customersView) customersView.style.display = 'none';
    if (documentsView) documentsView.style.display = 'none';
    if (reportsView) reportsView.style.display = 'none';

    // Show selected view
    if (view === 'calculator') {
        if (calculatorView) calculatorView.style.display = 'block';
    } else if (view === 'rfp-upload') {
        if (rfpUploadView) rfpUploadView.style.display = 'block';
    } else if (view === 'customers') {
        if (customersView) {
            customersView.style.display = 'block';
            // Initialize customer view on first show
            if (window.customerView && !window.customerView.container) {
                window.customerView.initialize();
            }
        }
    } else if (view === 'documents') {
        if (documentsView) {
            documentsView.style.display = 'block';
            // Initialize documents view on first show
            if (window.documentsView && !window.documentsView.container) {
                window.documentsView.initialize();
            }
        }
    } else if (view === 'reports') {
        if (reportsView) {
            reportsView.style.display = 'block';
            // Initialize reports view on first show
            if (window.reportsView && typeof window.reportsView.initialize === 'function') {
                if (!window.reportsView.currentData) {
                    window.reportsView.initialize();
                }
            }
        }
    } else if (view === 'settings' && window.settingsUI) {
        window.settingsUI.open();
        // Keep calculator view visible when settings modal opens
        if (calculatorView) calculatorView.style.display = 'block';
    }
};

/**
 * Show logo picker modal
 */
window.showLogoPicker = function() {
    const website = document.getElementById('website')?.value || '';
    const companyName = document.getElementById('companyName')?.value || '';
    const currentLogoUrl = state.customer?.logoUrl || '';

    if (logoSelector && logoSelector.showSelector) {
        logoSelector.showSelector(website, companyName, currentLogoUrl, (logoUrl) => {
            // Callback when logo is selected
            if (state.customer) {
                state.customer.logoUrl = logoUrl;
            }
            // Update the company logo display
            const logoDisplay = document.getElementById('companyLogo');
            const logoPlaceholder = document.getElementById('logoPlaceholder');
            
            if (logoDisplay && logoUrl) {
                logoDisplay.src = logoUrl;
                logoDisplay.style.display = 'block';
                
                // Hide placeholder when logo is loaded
                if (logoPlaceholder) {
                    logoPlaceholder.style.display = 'none';
                }
            }
        });
    }
};

/**
 * Close logo picker modal
 */
window.closeLogoPicker = function() {
    if (logoSelector && logoSelector.hideModal) {
        logoSelector.hideModal();
    }
};

/**
 * Show company logo selector
 */
window.showLogoSelector = function(website, companyName) {
    const currentLogoUrl = state.customer?.logoUrl || '';
    if (logoSelector && logoSelector.showSelector) {
        logoSelector.showSelector(website, companyName, currentLogoUrl, (logoUrl) => {
            if (state.customer) {
                state.customer.logoUrl = logoUrl;
            }
        });
    }
};

/**
 * Format phone number as user types
 */
window.formatPhoneNumber = function(event) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 0) {
        if (value.length <= 3) {
            value = value;
        } else if (value.length <= 6) {
            value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
        } else {
            value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
        }
    }

    input.value = value;
};

/**
 * Handle website change
 */
window.handleWebsiteChange = function(event) {
    const website = event.target.value;
    // Could trigger logo lookup here
};

/**
 * Handle prevailing wage toggle
 * ENHANCED: Auto-fetch API data and switch settings mode
 */
window.handlePrevailingWageChangeEnhanced = async function() {
    const checkbox = document.getElementById('prevailingWageRequired');
    const details = document.getElementById('prevailingWageDetails');

    if (!checkbox) {
        console.error('Prevailing wage checkbox not found');
        return;
    }

    // Toggle details display
    if (details) {
        details.style.display = checkbox.checked ? 'block' : 'none';
    }

    // Store preference in state
    if (window.state) {
        window.state.prevailingWageRequired = checkbox.checked;
    }

    if (checkbox.checked) {
        // Get ZIP code from customer info
        const zip = document.getElementById('zip')?.value;

        if (zip && zip.length === 5) {
            try {
                // Fetch prevailing wage data
                const response = await fetch(`/api/prevailing-wage/${zip}`);
                if (response.ok) {
                    const data = await response.json();

                    // Update details panel if it exists
                    if (document.getElementById('pwZip')) {
                        document.getElementById('pwZip').textContent = zip;
                    }

                    console.log('Prevailing wage data loaded for ZIP:', zip, data);
                } else {
                    console.warn('Failed to fetch prevailing wage data');
                }
            } catch (error) {
                console.error('Error fetching prevailing wage:', error);
            }
        } else {
            console.warn('Please enter a valid ZIP code before enabling prevailing wage');
        }

        // Switch settings modal to public works mode (if modal exists)
        if (window.document.getElementById('rateMode')) {
            window.document.getElementById('rateMode').value = 'public-works';
            if (typeof window.updateRateMode === 'function') {
                window.updateRateMode();
            }
        }
    }

    // Recalculate if needed
    if (window.calculateQuote) {
        window.calculateQuote();
    }
};

/**
 * Fetch tax rate for location
 */
window.fetchTaxRate = async function() {
    const zip = document.getElementById('zip')?.value || '';
    if (!zip || zip.length < 5) return;

    try {
        const response = await fetch(`/api/tax-rate?zip=${zip}`);
        if (!response.ok) throw new Error('Tax rate fetch failed');

        const result = await response.json();

        const taxRateEl = document.getElementById('taxRate');
        if (taxRateEl && result.rate) {
            taxRateEl.value = result.rate;
        }

    } catch (error) {
        console.error('Tax rate fetch failed:', error);
    }
};

/**
 * Clear all data
 * FIXED: E2E-002 (Performance) - Use specific field IDs instead of querySelectorAll
 * FIXED: E2E-003 (Missing fields) - Include phone (tel), website (url), and primaryEmail/primaryPhone
 */
window.clearAll = function() {
    if (safeConfirm('Are you sure you want to clear all data? This cannot be undone.')) {
        // Clear state (fast)
        state.units = [];
        state.unitCounter = 1;  // BUG FIX #5: Reset counter to 1
        state.customer = {};
        state.enrichmentData = {};

        // Clear units container (fast - single DOM operation)
        const unitsContainer = document.getElementById('units-container');
        if (unitsContainer) {
            unitsContainer.innerHTML = '';
        }

        // FIX E2E-002 & E2E-003: Clear specific fields by ID (much faster than querySelectorAll)
        // This takes <10ms vs 5000+ms for querySelectorAll on full DOM
        const fieldsToClear = [
            'companyName',
            'phone',           // E2E-003: Was missing (type="tel")
            'extension',
            'email',
            'website',         // E2E-003: Was missing (type="url")
            'address',
            'city',
            'state',
            'zip',
            'distance',
            'primaryEmail',    // E2E-003: Was missing
            'primaryPhone'     // E2E-003: Was missing
        ];

        fieldsToClear.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });

        // Clear logo display
        const logoDisplay = document.getElementById('companyLogo');
        const logoPlaceholder = document.getElementById('logoPlaceholder');
        if (logoDisplay) {
            logoDisplay.style.display = 'none';
            logoDisplay.src = '';
        }
        if (logoPlaceholder) {
            logoPlaceholder.style.display = 'flex';
        }

        // Clear autocomplete dropdown
        const dropdown = document.getElementById('companyDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }

        // Add initial unit back
        addNewUnit();

        updateStatus('All data cleared', 'success');
    }
};

/**
 * Toggle mobilization stacking
 */
window.toggleMobilizationStacking = function() {
    const checkbox = document.getElementById('mobilizationStacking');
    if (!checkbox) return;

    const enabled = checkbox.checked;

    window.mobilizationSettings = window.mobilizationSettings || {};
    window.mobilizationSettings.enabled = enabled;

    localStorage.setItem('mobilizationSettings', JSON.stringify(window.mobilizationSettings));

    if (window.calculateQuote) {
        window.calculateQuote();
    }
};

/**
 * Update mobilization charge
 * NOTE: Slider value represents DISCOUNT percentage (0% = full price, 100% = free)
 */
window.updateMobilizationCharge = function(value) {
    const discountPercent = parseFloat(value) || 65;
    
    window.mobilizationSettings = window.mobilizationSettings || {};
    window.mobilizationSettings.stackingDiscount = discountPercent;
    
    // Update display
    const percentageEl = document.getElementById('charge-percentage');
    if (percentageEl) {
        percentageEl.textContent = `${discountPercent}%`;
    }
    
    // Update example calculation
    updateMobilizationExample(discountPercent);
    
    // Update active preset button
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    localStorage.setItem('mobilizationSettings', JSON.stringify(window.mobilizationSettings));

    if (window.calculateQuote) {
        window.calculateQuote();
    }
};

/**
 * Update mobilization example with current discount
 */
function updateMobilizationExample(discountPercent) {
    const mobilizationRate = 150;
    const baseHours = 2;
    
    // Unit 1: Always full price
    const unit1Cost = baseHours * mobilizationRate; // $300
    
    // Units 2 & 3: Discount applied
    const discountMultiplier = (100 - discountPercent) / 100; // If 65% discount, charge 35%
    const secondaryUnitCost = baseHours * discountMultiplier * mobilizationRate;
    
    const totalCost = unit1Cost + (2 * secondaryUnitCost);
    const fullCost = 3 * unit1Cost; // $900
    const savings = fullCost - totalCost;
    
    // Update UI
    document.getElementById('example-discount').textContent = `${Math.round((100 - discountPercent))}%`;
    document.getElementById('example-discount-2').textContent = `${Math.round((100 - discountPercent))}%`;
    document.getElementById('example-unit2').textContent = `$${Math.round(secondaryUnitCost)}`;
    document.getElementById('example-unit3').textContent = `$${Math.round(secondaryUnitCost)}`;
    document.getElementById('example-total').textContent = `$${Math.round(totalCost)}`;
    document.getElementById('example-savings').textContent = `$${Math.round(savings)}`;
}

/**
 * Set mobilization charge (preset buttons)
 */
window.setMobilizationCharge = function(value) {
    const slider = document.getElementById('mobilization-charge-slider');
    if (slider) {
        slider.value = value;
        window.updateMobilizationCharge(value);
    }
    
    // Highlight active preset
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.onclick && btn.onclick.toString().includes(`setMobilizationCharge(${value})`)) {
            btn.classList.add('active');
        }
    });
};

// ============================================================================
// ATS (TRANSFER SWITCH) MANAGEMENT - SERVICE I
// ============================================================================

/**
 * Adjust ATS quantity for a unit
 */
window.adjustATSQuantity = function(unitId, delta) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Initialize ATS data if not present
    if (!unit.atsUnits) {
        unit.atsUnits = [{ id: 1, brand: '', model: '', serial: '', includeMobilization: false }];
    }

    const currentQty = unit.atsUnits.length;
    const newQty = Math.max(1, currentQty + delta); // Minimum 1 ATS unit

    if (newQty > currentQty) {
        // Add new ATS units
        for (let i = currentQty; i < newQty; i++) {
            unit.atsUnits.push({
                id: i + 1,
                brand: '',
                model: '',
                serial: '',
                includeMobilization: false // Default: no mobilization for additional units
            });
        }
    } else if (newQty < currentQty) {
        // Remove ATS units
        unit.atsUnits = unit.atsUnits.slice(0, newQty);
    }

    // Update UI
    const quantityEl = document.getElementById(`${unitId}-ats-quantity`);
    if (quantityEl) {
        quantityEl.textContent = newQty;
    }

    renderATSList(unitId);

    // BUG FIX: Call backend recalculation for ATS quantity changes
    if (window.recalculateUnit) {
        window.recalculateUnit(unitId);
    }
};

/**
 * Show ATS details modal
 */
window.showATSDetails = function(unitId) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit) return;

    // Initialize ATS data if not present
    if (!unit.atsUnits) {
        unit.atsUnits = [{ id: 1, brand: '', model: '', serial: '', includeMobilization: false }];
    }

    const modal = document.getElementById('atsDetailsModal');
    const container = document.getElementById('atsDetailsContainer');
    if (!modal || !container) return;

    // Store current unit ID for saving
    modal.dataset.unitId = unitId;

    // Render ATS detail forms
    container.innerHTML = unit.atsUnits.map((ats, index) => `
        <div class="ats-detail-card" style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h4 style="margin-bottom: 12px; color: var(--accent-electric);">ATS Unit ${index + 1}</h4>
            
            <div style="display: grid; gap: 12px;">
                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Brand</label>
                    <input type="text" 
                           id="ats-${unitId}-${index}-brand" 
                           value="${ats.brand || ''}" 
                           placeholder="e.g., Generac, Kohler, Cummins"
                           style="width: 100%; padding: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 4px;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Model</label>
                    <input type="text" 
                           id="ats-${unitId}-${index}-model" 
                           value="${ats.model || ''}" 
                           placeholder="Model number"
                           style="width: 100%; padding: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 4px;">
                </div>
                
                <div>
                    <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px;">Serial Number</label>
                    <input type="text" 
                           id="ats-${unitId}-${index}-serial" 
                           value="${ats.serial || ''}" 
                           placeholder="Serial number"
                           style="width: 100%; padding: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: 4px;">
                </div>
                
                ${index > 0 ? `
                <div style="padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="checkbox" 
                               id="ats-${unitId}-${index}-mobilization" 
                               ${ats.includeMobilization ? 'checked' : ''}
                               style="margin-right: 8px;">
                        <span style="font-size: 10px;">Include mobilization charge for this unit</span>
                    </label>
                    <div style="font-size: 9px; color: var(--text-tertiary); margin-top: 4px; margin-left: 24px;">
                        By default, additional ATS units use the same service visit (no extra mobilization)
                    </div>
                </div>
                ` : `
                <div style="font-size: 9px; color: var(--text-secondary); font-style: italic; padding: 8px; background: var(--bg-primary); border-radius: 4px;">
                    Primary ATS - Mobilization always included
                </div>
                `}
            </div>
        </div>
    `).join('');

    modal.style.display = 'flex';
};

/**
 * Close ATS details modal
 */
window.closeATSDetails = function() {
    const modal = document.getElementById('atsDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

/**
 * Save ATS details from modal
 */
window.saveATSDetails = function() {
    const modal = document.getElementById('atsDetailsModal');
    const unitId = modal?.dataset.unitId;
    if (!unitId) return;

    const unit = state.units.find(u => u.id === unitId);
    if (!unit || !unit.atsUnits) return;

    // Save data from form inputs
    unit.atsUnits.forEach((ats, index) => {
        const brandInput = document.getElementById(`ats-${unitId}-${index}-brand`);
        const modelInput = document.getElementById(`ats-${unitId}-${index}-model`);
        const serialInput = document.getElementById(`ats-${unitId}-${index}-serial`);
        const mobilizationInput = document.getElementById(`ats-${unitId}-${index}-mobilization`);

        if (brandInput) ats.brand = brandInput.value;
        if (modelInput) ats.model = modelInput.value;
        if (serialInput) ats.serial = serialInput.value;
        if (mobilizationInput) ats.includeMobilization = mobilizationInput.checked;
    });

    // Update ATS list display
    renderATSList(unitId);

    // Recalculate pricing
    if (window.updateServicePrices) {
        window.updateServicePrices(unitId);
    }

    // Close modal
    window.closeATSDetails();
    
    updateStatus('ATS details saved', 'success');
};

/**
 * Render ATS units list in service card
 */
function renderATSList(unitId) {
    const unit = state.units.find(u => u.id === unitId);
    if (!unit || !unit.atsUnits) return;

    const listContainer = document.getElementById(`${unitId}-ats-list`);
    if (!listContainer) return;

    listContainer.innerHTML = unit.atsUnits.map((ats, index) => {
        const hasDetails = ats.brand || ats.model || ats.serial;
        const detailsText = hasDetails 
            ? `${ats.brand || '?'} ${ats.model || '?'} ${ats.serial ? `(SN: ${ats.serial})` : ''}`
            : 'No details entered';
        
        const mobilizationBadge = index > 0 && ats.includeMobilization
            ? '<span style="font-size: 8px; background: var(--accent-warning); color: #000; padding: 2px 6px; border-radius: 3px; margin-left: 6px;">+Mob</span>'
            : '';

        return `
            <div style="font-size: 9px; padding: 4px 8px; background: var(--bg-primary); border-radius: 4px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>
                    <span style="color: var(--accent-electric); font-weight: 600;">ATS ${index + 1}:</span>
                    <span style="color: var(--text-secondary); margin-left: 6px;">${detailsText}</span>
                    ${mobilizationBadge}
                </span>
            </div>
        `;
    }).join('');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build quote data object from current state
 * DEPRECATED: Now using imported buildQuoteData from quote-data-builder.js
 * This local version is kept for backward compatibility but calls the real implementation
 */
async function buildQuoteDataLocal() {
    // Delegate to the real buildQuoteData which includes service schedule + hash
    return await buildQuoteData(state);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

console.log('✅ Global handlers module loaded');

// Export for testing (optional)
export {
    enrichmentService,
    calculationService,
    pdfService,
    buildQuoteData
};
