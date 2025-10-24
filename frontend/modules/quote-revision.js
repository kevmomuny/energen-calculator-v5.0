/**
 * Quote Revision Workflow Module
 * Sprint 7: Post-Creation Workflows
 *
 * Implements intelligent revision management:
 * - Minor revisions (v1.1, v1.2) - price adjustments, settings
 * - Major revisions (v2.0) - scope changes, services, units
 * - Auto-detection of change magnitude
 * - Zoho quote cloning for major revisions
 * - Superseded watermark application
 *
 * Uses Sprint 4 versioning system
 *
 * @module frontend/modules/quote-revision
 * @version 5.0.0
 * @sprint Sprint 7
 */

import { state } from '../js/state.js';
import { updateStatus, showNotification } from '../js/utilities.js';
import {
    createRevision,
    detectVersionIncrement,
    markAsSuperseded,
    getWatermark,
    generateFilename,
    QuoteStatus
} from './quote-versioning.js';
import { generateCalculationHash } from './calculation-hash.js';

/**
 * Open revision creation modal
 * Shows detected changes and revision type
 *
 * @param {Object} currentQuote - Current quote metadata
 * @returns {Promise<void>}
 */
export async function openRevisionModal(currentQuote) {
    console.log('[REVISION] Opening modal for quote:', currentQuote.bidNumber);

    if (!currentQuote || !currentQuote.bidNumber) {
        showNotification('Only official quotes can be revised', 'warning');
        return;
    }

    updateStatus('Analyzing changes...', 'info');

    try {
        // Generate hash for current state
        const currentState = window.buildQuoteData?.() || state;
        const currentHash = await generateCalculationHash(currentState);

        // Detect what kind of revision is needed
        const increment = detectVersionIncrement(
            currentQuote.calcStateHash,
            currentHash
        );

        console.log('[REVISION] Change detection:', increment);

        // Build modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="revisionModal" onclick="closeRevisionModal(event)">
                <div class="modal-content revision-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h2>
                            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">edit_document</span>
                            Create Revision - ${currentQuote.bidNumber}
                        </h2>
                        <button class="close-btn" onclick="closeRevisionModal()">&times;</button>
                    </div>

                    <div class="modal-body" style="padding: 24px;">
                        <!-- Current Version Info -->
                        <div class="current-version-info" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1a1a2e;">Current Version</h3>
                            <table style="width: 100%;">
                                <tr>
                                    <td style="padding: 6px 0; color: #666;">Bid Number:</td>
                                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${currentQuote.bidNumber}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;">Current Version:</td>
                                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">${currentQuote.version?.string || 'v1.0'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #666;">Status:</td>
                                    <td style="padding: 6px 0; font-weight: 600; text-align: right;">
                                        <span style="color: #28a745;">Official</span>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        ${renderRevisionAnalysis(increment, currentQuote)}

                        ${increment.increment !== 'none' ? renderRevisionOptions(increment) : ''}
                    </div>

                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeRevisionModal()">Cancel</button>
                        ${increment.increment !== 'none' ? `
                            <button class="btn-primary" onclick="confirmCreateRevision()" id="createRevisionBtn">
                                <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">update</span>
                                Create ${increment.increment === 'major' ? 'Major' : 'Minor'} Revision
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Inject modal
        const existingModal = document.getElementById('revisionModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Store data for confirmation
        window.revisionData = {
            currentQuote,
            currentHash,
            increment
        };

    } catch (error) {
        console.error('[REVISION] Analysis failed:', error);
        showNotification(`Failed to analyze changes: ${error.message}`, 'error');
    }
}

/**
 * Render change analysis section
 * @private
 */
function renderRevisionAnalysis(increment, currentQuote) {
    if (increment.increment === 'none') {
        return `
            <div class="info-box" style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <div style="display: flex; align-items: start; gap: 12px;">
                    <span class="material-symbols-outlined" style="color: #4caf50; font-size: 24px;">check_circle</span>
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: #2e7d32;">No Changes Detected</h4>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #424242;">
                            The current quote data matches the official version ${currentQuote.version?.string || 'v1.0'}.
                            No revision is needed at this time.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    const isMajor = increment.increment === 'major';
    const color = isMajor ? '#ff9800' : '#2196f3';
    const bgColor = isMajor ? '#fff3e0' : '#e3f2fd';
    const icon = isMajor ? 'warning' : 'info';

    return `
        <div class="revision-analysis" style="background: ${bgColor}; border-left: 4px solid ${color}; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <div style="display: flex; align-items: start; gap: 12px;">
                <span class="material-symbols-outlined" style="color: ${color}; font-size: 24px;">${icon}</span>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; color: ${isMajor ? '#e65100' : '#1565c0'};">
                        ${isMajor ? 'Major Revision Detected (v2.0)' : 'Minor Revision Detected'}
                    </h4>
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #424242;">
                        ${increment.reason}
                    </p>

                    ${increment.changes?.details && increment.changes.details.length > 0 ? `
                        <div style="margin-top: 12px;">
                            <strong style="font-size: 13px; color: #424242;">Changes detected:</strong>
                            <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
                                ${increment.changes.details.map(detail => `<li style="color: #616161;">${detail}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>

        ${isMajor ? `
            <div class="warning-box" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <div style="display: flex; align-items: start; gap: 12px;">
                    <span class="material-symbols-outlined" style="color: #ff8f00; font-size: 20px;">priority_high</span>
                    <div>
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #424242;">
                            <strong>Major Revision:</strong> This will create a new v2.0 quote in Zoho.
                            The current ${currentQuote.version?.string || 'v1.0'} will be marked as "Superseded by v2.0".
                            ${increment.requiresApproval ? '<br><strong>Re-approval may be required from customer.</strong>' : ''}
                        </p>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Render revision options
 * @private
 */
function renderRevisionOptions(increment) {
    const isMajor = increment.increment === 'major';

    return `
        <div class="revision-options">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1a1a2e;">Revision Settings</h3>

            ${isMajor ? `
                <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                    <input type="checkbox" id="cloneInZoho" checked>
                    <span>Create new quote in Zoho (clone linked to same Deal)</span>
                </label>

                <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                    <input type="checkbox" id="applySupersededWatermark" checked>
                    <span>Mark previous version as superseded (watermark on old PDF)</span>
                </label>

                <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                    <input type="checkbox" id="notifyCustomer">
                    <span>Send email notification to customer about revision</span>
                </label>
            ` : `
                <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                    <input type="checkbox" id="updateExistingZoho" checked>
                    <span>Update existing Zoho quote (same bid number)</span>
                </label>

                <label class="checkbox-label" style="display: block; margin-bottom: 12px;">
                    <input type="checkbox" id="regeneratePDF" checked>
                    <span>Generate new PDF with updated version number</span>
                </label>
            `}

            <div class="form-section" style="margin-top: 20px;">
                <label class="form-label">Revision Notes (optional)</label>
                <textarea
                    id="revisionNotes"
                    rows="3"
                    placeholder="Describe what changed and why..."
                    style="width: 100%; padding: 12px; border: 1px solid var(--border-primary); border-radius: 8px;"
                ></textarea>
            </div>
        </div>
    `;
}

/**
 * Close revision modal
 */
window.closeRevisionModal = function(event) {
    if (event && event.target.classList.contains('modal-overlay')) {
        // Clicked outside
    } else if (event && event.target.classList.contains('close-btn')) {
        // Clicked X
    } else if (!event) {
        // Programmatic
    } else {
        return;
    }

    const modal = document.getElementById('revisionModal');
    if (modal) modal.remove();

    delete window.revisionData;
};

/**
 * Confirm and create revision
 */
window.confirmCreateRevision = async function() {
    const data = window.revisionData;
    if (!data) {
        showNotification('Revision data not found', 'error');
        return;
    }

    const { currentQuote, currentHash, increment } = data;
    const isMajor = increment.increment === 'major';

    // Get options
    const revisionNotes = document.getElementById('revisionNotes')?.value || '';
    const cloneInZoho = isMajor && (document.getElementById('cloneInZoho')?.checked || false);
    const applySupersededWatermark = isMajor && (document.getElementById('applySupersededWatermark')?.checked || false);
    const notifyCustomer = isMajor && (document.getElementById('notifyCustomer')?.checked || false);
    const updateExistingZoho = !isMajor && (document.getElementById('updateExistingZoho')?.checked || false);
    const regeneratePDF = document.getElementById('regeneratePDF')?.checked || false;

    // Disable button
    const createBtn = document.getElementById('createRevisionBtn');
    if (createBtn) {
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="spinner-small"></span> Creating Revision...';
    }

    try {
        updateStatus(`Creating ${isMajor ? 'major' : 'minor'} revision...`, 'info');

        // Create revision metadata
        const currentState = window.buildQuoteData?.() || state;
        const revision = await createRevision(currentQuote, currentState);

        if (!revision) {
            throw new Error('No changes detected for revision');
        }

        // Add custom notes
        if (revisionNotes) {
            revision.changeLog[revision.changeLog.length - 1].notes = revisionNotes;
        }

        // Call backend to process revision
        const response = await fetch('/api/quote/create-revision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentQuote,
                revision,
                options: {
                    isMajor,
                    cloneInZoho,
                    applySupersededWatermark,
                    notifyCustomer,
                    updateExistingZoho,
                    regeneratePDF
                },
                quoteData: currentState
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create revision');
        }

        const result = await response.json();

        // Update state with new revision
        state.currentQuote = result.revision;

        // Show success
        showNotification(
            `Revision ${result.revision.version.string} created successfully!`,
            'success'
        );

        updateStatus(
            `Quote updated to ${result.revision.version.string}`,
            'success'
        );

        // If major revision with superseded watermark, update old PDF
        if (isMajor && applySupersededWatermark && result.supersededPDF) {
            console.log('[REVISION] Superseded watermark applied to:', result.supersededPDF);
        }

        // Close modal
        window.closeRevisionModal();

        // Optionally regenerate PDF
        if (regeneratePDF && window.generatePDF) {
            setTimeout(() => {
                window.generatePDF();
            }, 500);
        }

        // Optionally send notification
        if (notifyCustomer && window.openEmailQuoteModal) {
            setTimeout(() => {
                window.openEmailQuoteModal(result.revision);
            }, 1000);
        }

    } catch (error) {
        console.error('[REVISION] Creation failed:', error);
        showNotification(`Revision failed: ${error.message}`, 'error');

        if (createBtn) {
            createBtn.disabled = false;
            createBtn.innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">update</span>
                Create ${isMajor ? 'Major' : 'Minor'} Revision
            `;
        }
    }
};

/**
 * Create revision for current quote (called from UI button)
 *
 * @returns {Promise<void>}
 */
export async function createRevisionForCurrentQuote() {
    const currentQuote = state.currentQuote;

    if (!currentQuote || !currentQuote.bidNumber) {
        showNotification('No official quote to revise', 'warning');
        return;
    }

    await openRevisionModal(currentQuote);
}

/**
 * Quick minor revision (for simple price adjustments)
 * Bypasses modal for streamlined workflow
 *
 * @returns {Promise<void>}
 */
async function quickMinorRevision() {
    const currentQuote = state.currentQuote;

    if (!currentQuote || !currentQuote.bidNumber) {
        showNotification('No official quote to revise', 'warning');
        return;
    }

    try {
        updateStatus('Creating quick revision...', 'info');

        const currentState = window.buildQuoteData?.() || state;
        const revision = await createRevision(currentQuote, currentState);

        if (!revision) {
            showNotification('No changes detected', 'info');
            return;
        }

        if (revision.version.major > currentQuote.version.major) {
            // Major changes detected - use full modal
            showNotification('Major changes detected - use Create Revision for full options', 'warning');
            await openRevisionModal(currentQuote);
            return;
        }

        // Auto-execute minor revision
        const response = await fetch('/api/quote/create-revision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentQuote,
                revision,
                options: {
                    isMajor: false,
                    updateExistingZoho: true,
                    regeneratePDF: true
                },
                quoteData: currentState
            })
        });

        if (!response.ok) {
            throw new Error('Quick revision failed');
        }

        const result = await response.json();
        state.currentQuote = result.revision;

        showNotification(`Quick revision ${result.revision.version.string} created!`, 'success');

        // Auto-regenerate PDF
        if (window.generatePDF) {
            setTimeout(() => window.generatePDF(), 500);
        }

    } catch (error) {
        console.error('[REVISION] Quick revision failed:', error);
        showNotification(`Quick revision failed: ${error.message}`, 'error');
    }
}

// Note: Functions already exported inline above (lines 38, 396, 413)
// No duplicate exports needed - prevents "Duplicate export" errors
