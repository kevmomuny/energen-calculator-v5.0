/**
 * Quote Duplication Module
 * Sprint 7: Post-Creation Workflows
 *
 * Duplicates existing quotes with smart data handling:
 * - Copies: customer, units, services, calculations
 * - Resets: bid number, status, timestamps
 * - Preserves: calculation state hash (for reference)
 * - Adds: "Duplicated from BID-XXXX" note
 *
 * @module frontend/modules/quote-duplication
 * @version 5.0.0
 * @sprint Sprint 7
 */

import { state } from '../js/state.js';
import { updateStatus, showNotification } from '../js/utilities.js';
import { initializeQuoteVersion, QuoteStatus } from './quote-versioning.js';
import { generateCalculationHash } from './calculation-hash.js';

/**
 * Duplicate quote confirmation modal
 *
 * @param {Object} sourceQuote - Quote to duplicate
 * @returns {Promise<void>}
 */
export async function openDuplicateQuoteModal(sourceQuote) {
    console.log('[DUPLICATE] Opening modal for quote:', sourceQuote.bidNumber || 'DRAFT');

    if (!sourceQuote) {
        showNotification('No quote selected for duplication', 'error');
        return;
    }

    const modalHTML = `
        <div class="modal-overlay" id="duplicateQuoteModal" onclick="closeDuplicateQuoteModal(event)">
            <div class="modal-content duplicate-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>
                        <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">content_copy</span>
                        Duplicate Quote
                    </h2>
                    <button class="close-btn" onclick="closeDuplicateQuoteModal()">&times;</button>
                </div>

                <div class="modal-body" style="padding: 24px;">
                    <div class="info-box" style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                        <div style="display: flex; align-items: start; gap: 12px;">
                            <span class="material-symbols-outlined" style="color: #2196f3; font-size: 24px;">info</span>
                            <div>
                                <h4 style="margin: 0 0 8px 0; color: #1565c0;">What will be duplicated?</h4>
                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #424242;">
                                    All customer data, units, services, and calculations will be copied to a new draft quote.
                                    The bid number will be reset and you can modify the duplicate before creating it in Zoho.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div class="source-quote-info" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1a1a2e;">Source Quote</h3>
                        <table style="width: 100%;">
                            <tr>
                                <td style="padding: 6px 0; color: #666;">Bid Number:</td>
                                <td style="padding: 6px 0; font-weight: 600; text-align: right;">${sourceQuote.bidNumber || 'DRAFT'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666;">Customer:</td>
                                <td style="padding: 6px 0; font-weight: 600; text-align: right;">${sourceQuote.customer?.companyName || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666;">Total Units:</td>
                                <td style="padding: 6px 0; font-weight: 600; text-align: right;">${(sourceQuote.units || sourceQuote.generators || []).length}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #666;">Annual Total:</td>
                                <td style="padding: 6px 0; font-weight: 600; text-align: right;">$${(sourceQuote.calculations?.total || sourceQuote.total || 0).toLocaleString()}</td>
                            </tr>
                        </table>
                    </div>

                    <div class="duplication-options">
                        <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1a1a2e;">Duplication Settings</h3>

                        <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                            <input type="checkbox" id="duplicateAsTemplate" checked>
                            <span>Mark as template (for similar future quotes)</span>
                        </label>

                        <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                            <input type="checkbox" id="clearCustomPricing">
                            <span>Reset any custom pricing overrides</span>
                        </label>

                        <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                            <input type="checkbox" id="preserveNotes" checked>
                            <span>Preserve notes and annotations</span>
                        </label>
                    </div>

                    <div class="warning-box" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin-top: 24px; border-radius: 4px;">
                        <div style="display: flex; align-items: start; gap: 12px;">
                            <span class="material-symbols-outlined" style="color: #ff8f00; font-size: 20px;">warning</span>
                            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #424242;">
                                <strong>Note:</strong> The duplicated quote will be a new draft. You'll need to generate
                                a new PDF and create it in Zoho to get a bid number.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeDuplicateQuoteModal()">Cancel</button>
                    <button class="btn-primary" onclick="confirmDuplicateQuote()" id="duplicateBtn">
                        <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">content_copy</span>
                        Create Duplicate
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inject modal
    const existingModal = document.getElementById('duplicateQuoteModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store source quote
    window.sourceDuplicateQuote = sourceQuote;
}

/**
 * Close duplicate modal
 */
window.closeDuplicateQuoteModal = function(event) {
    if (event && event.target.classList.contains('modal-overlay')) {
        // Clicked outside
    } else if (event && event.target.classList.contains('close-btn')) {
        // Clicked X
    } else if (!event) {
        // Programmatic
    } else {
        return;
    }

    const modal = document.getElementById('duplicateQuoteModal');
    if (modal) modal.remove();

    delete window.sourceDuplicateQuote;
};

/**
 * Confirm and execute duplication
 */
window.confirmDuplicateQuote = async function() {
    const sourceQuote = window.sourceDuplicateQuote;
    if (!sourceQuote) {
        showNotification('Source quote not found', 'error');
        return;
    }

    // Get options
    const asTemplate = document.getElementById('duplicateAsTemplate')?.checked || false;
    const clearCustomPricing = document.getElementById('clearCustomPricing')?.checked || false;
    const preserveNotes = document.getElementById('preserveNotes')?.checked || false;

    // Disable button
    const duplicateBtn = document.getElementById('duplicateBtn');
    if (duplicateBtn) {
        duplicateBtn.disabled = true;
        duplicateBtn.innerHTML = '<span class="spinner-small"></span> Duplicating...';
    }

    try {
        updateStatus('Duplicating quote...', 'info');

        // Create duplicate
        const duplicatedQuote = await duplicateQuote(sourceQuote, {
            asTemplate,
            clearCustomPricing,
            preserveNotes
        });

        // Load duplicated quote into calculator
        await loadQuoteIntoCalculator(duplicatedQuote);

        showNotification('Quote duplicated successfully!', 'success');
        updateStatus('Duplicate created - make any changes and save', 'success');

        // Close modal
        window.closeDuplicateQuoteModal();

    } catch (error) {
        console.error('[DUPLICATE] Failed:', error);
        showNotification(`Duplication failed: ${error.message}`, 'error');

        if (duplicateBtn) {
            duplicateBtn.disabled = false;
            duplicateBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">content_copy</span> Create Duplicate';
        }
    }
};

/**
 * Core duplication logic
 * Creates a deep copy with specific fields reset
 *
 * @param {Object} sourceQuote - Source quote to duplicate
 * @param {Object} options - Duplication options
 * @returns {Promise<Object>} Duplicated quote object
 */
export async function duplicateQuote(sourceQuote, options = {}) {
    console.log('[DUPLICATE] Creating duplicate from:', sourceQuote.bidNumber || 'DRAFT');

    // Deep clone to avoid mutations
    const duplicate = JSON.parse(JSON.stringify(sourceQuote));

    // === WHAT GETS COPIED (preserved) ===
    // ✅ customer (all data)
    // ✅ units/generators (all configurations)
    // ✅ services (all selections)
    // ✅ calculations (for reference)
    // ✅ serviceFrequencies
    // ✅ customServices
    // ✅ settings used

    // === WHAT GETS RESET ===
    // ❌ bidNumber → null
    // ❌ status → "draft"
    // ❌ timestamps → new Date()
    // ❌ pdfPath → null
    // ❌ pdfFilename → null
    // ❌ zohoQuoteId → null
    // ❌ version → v1.0

    // Reset quote identification
    duplicate.bidNumber = null;
    duplicate.status = QuoteStatus.DRAFT;

    // Reset timestamps
    duplicate.createdAt = new Date().toISOString();
    duplicate.modifiedAt = new Date().toISOString();
    delete duplicate.officializedAt;
    delete duplicate.supersededAt;

    // Reset PDF data
    duplicate.pdfPath = null;
    duplicate.pdfFilename = null;

    // Reset Zoho integration
    duplicate.zohoQuoteId = null;
    duplicate.zohoDealId = null;
    delete duplicate.zohoSyncStatus;

    // Initialize version (draft v1.0)
    duplicate.version = initializeQuoteVersion();

    // Preserve original calculation hash for reference
    if (sourceQuote.calcStateHash) {
        duplicate.metadata = duplicate.metadata || {};
        duplicate.metadata.duplicatedFromHash = sourceQuote.calcStateHash.hash;
        duplicate.metadata.duplicatedFromBidNumber = sourceQuote.bidNumber;
        duplicate.metadata.duplicatedAt = new Date().toISOString();
    }

    // Add duplication note
    duplicate.notes = duplicate.notes || [];
    duplicate.notes.unshift({
        timestamp: new Date().toISOString(),
        type: 'duplication',
        message: `Duplicated from ${sourceQuote.bidNumber || 'DRAFT'} on ${new Date().toLocaleDateString()}`
    });

    // Handle options
    if (options.clearCustomPricing) {
        // Reset any custom price overrides
        if (duplicate.units) {
            duplicate.units.forEach(unit => {
                delete unit.customPricing;
                delete unit.priceOverrides;
            });
        }
    }

    if (!options.preserveNotes) {
        // Only keep duplication note
        duplicate.notes = duplicate.notes.filter(note => note.type === 'duplication');
    }

    if (options.asTemplate) {
        duplicate.metadata = duplicate.metadata || {};
        duplicate.metadata.isTemplate = true;
        duplicate.metadata.templateSource = sourceQuote.bidNumber;
    }

    // Generate new unique ID for duplicate
    duplicate.id = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Reset unit IDs to avoid conflicts
    if (duplicate.units) {
        duplicate.units = duplicate.units.map((unit, index) => ({
            ...unit,
            id: `unit-${Date.now()}-${index}`
        }));
    }

    console.log('[DUPLICATE] Created duplicate:', {
        originalBid: sourceQuote.bidNumber,
        duplicateId: duplicate.id,
        unitsCount: duplicate.units?.length || 0,
        status: duplicate.status
    });

    return duplicate;
}

/**
 * Load duplicated quote into calculator UI
 *
 * @param {Object} quote - Quote to load
 * @returns {Promise<void>}
 */
async function loadQuoteIntoCalculator(quote) {
    console.log('[DUPLICATE] Loading into calculator:', quote.id);

    // Clear current state
    state.units = [];
    state.currentQuote = quote;

    // Load customer data
    if (quote.customer) {
        // Populate customer fields
        if (window.updateCustomerUI) {
            window.updateCustomerUI(quote.customer);
        }

        // Set company name
        const companyField = document.getElementById('companyName');
        if (companyField) companyField.value = quote.customer.companyName || '';

        // Set address fields
        const addressField = document.getElementById('address');
        if (addressField) addressField.value = quote.customer.address || '';

        const cityField = document.getElementById('city');
        if (cityField) cityField.value = quote.customer.city || '';

        const stateField = document.getElementById('state');
        if (stateField) stateField.value = quote.customer.state || '';

        const zipField = document.getElementById('zip');
        if (zipField) zipField.value = quote.customer.zip || '';
    }

    // Load units
    if (quote.units && Array.isArray(quote.units)) {
        for (const unitData of quote.units) {
            // Add unit to state
            state.units.push(unitData);

            // Render unit card
            if (window.renderUnit) {
                window.renderUnit(unitData);
            }
        }
    }

    // Update metrics and summary
    if (window.updateMetrics) window.updateMetrics();
    if (window.updateSummary) window.updateSummary();

    // Show duplicate indicator
    const statusBar = document.querySelector('.status-message');
    if (statusBar) {
        statusBar.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">content_copy</span>
            Duplicate created from ${quote.metadata?.duplicatedFromBidNumber || 'previous quote'} - Review and modify as needed
        `;
        statusBar.style.background = '#2196f3';
        statusBar.style.color = 'white';
    }
}

/**
 * Duplicate current quote (called from UI button)
 *
 * @returns {Promise<void>}
 */
export async function duplicateCurrentQuote() {
    const currentQuote = state.currentQuote || window.buildQuoteData?.();

    if (!currentQuote) {
        showNotification('No quote available to duplicate', 'error');
        return;
    }

    await openDuplicateQuoteModal(currentQuote);
}

// Note: Functions already exported inline above (lines 27, 362)
// No duplicate exports needed - prevents "Duplicate export" errors
