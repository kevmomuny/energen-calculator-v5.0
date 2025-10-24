/**
 * @fileoverview PDF Generator Module - Phase 3
 * Handles PDF generation and download for quotes
 * Communicates with backend API for professional PDF creation
 *
 * @module frontend/modules/pdf-generator
 * @author Energen Team
 * @version 5.0.0
 */

// Import dependencies
import { updateStatus, showNotification } from '../js/utilities.js';
import { buildQuoteData } from './summary-calculator.js';

/**
 * Create Bid - Generate PDF with automatic Zoho CRM sync
 * Replaces the old "Generate PDF" + "Save to Zoho" two-button workflow
 * Now automatically creates account, contact, and quote in Zoho while generating PDF
 * @param {Object} state - Application state
 * @param {Event} event - Optional event object for button state management
 * @returns {Promise<void>}
 */
export async function createBid(state, event = null) {
    const bidButton = event?.target || document.getElementById('create-bid-btn');

    try {
        // Show loading state
        setButtonLoading(bidButton, true, 'Creating Bid...');
        showLoadingSpinner('Creating bid with automatic Zoho sync...', 'createBid');

        // Update sync status
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.style.display = 'inline';
            syncStatus.textContent = 'Syncing to Zoho...';
            syncStatus.style.color = '#3b82f6';
        }

        const quoteData = buildQuoteData(state);
        updateStatus('Preparing bid data...');

        // Generate PDF with AUTOMATIC Zoho sync
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
        const response = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quoteData })
        });

        const result = await response.json();

        if (result.success) {
            // PDF generation succeeded
            updateStatus('Bid created successfully');

            // Auto-download PDF first
            if (result.url) {
                const link = document.createElement('a');
                link.href = `${API_BASE}${result.url}`;
                link.download = result.filename;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // Check Zoho sync status
            if (result.zoho && result.zoho.synced) {
                // Store Zoho reference for future operations
                state.lastZohoSync = {
                    estimateNumber: result.zoho.estimateNumber,
                    accountId: result.zoho.accountId,
                    contactId: result.zoho.contactId,
                    quoteId: result.zoho.quoteId,
                    zohoUrl: result.zoho.zohoUrl,
                    timestamp: new Date().toISOString()
                };

                // Update sync status badge
                if (syncStatus) {
                    syncStatus.textContent = `✓ Synced to Zoho (#${result.zoho.estimateNumber})`;
                    syncStatus.style.color = '#10b981';
                }

                // Open Zoho sync modal with success details
                openZohoSyncModal(result.zoho, result.filename);

            } else if (result.zoho && !result.zoho.synced) {
                // PDF created but Zoho sync failed
                const warningMessage = `
                    PDF Created Successfully!

                    PDF: ${result.filename}

                    ⚠️  Zoho Sync Warning:
                    ${result.zoho.warning || result.zoho.error}

                    You can manually sync from Zoho CRM.
                `;

                showNotification(warningMessage, 'warning', 8000);

                // Update sync status
                if (syncStatus) {
                    syncStatus.textContent = '⚠️  Zoho sync failed';
                    syncStatus.style.color = '#f59e0b';
                }
            } else {
                // Legacy response without Zoho sync - just show PDF notification
                showNotification(`PDF generated: ${result.filename}`, 'success');
            }
        } else {
            throw new Error(result.error || 'Bid creation failed');
        }

    } catch (error) {
        console.error('Bid Creation Error:', error);
        updateStatus('Bid creation failed', 'error');
        showNotification(`Failed to create bid: ${error.message}`, 'error');

        // Update sync status
        const syncStatus = document.getElementById('sync-status');
        if (syncStatus) {
            syncStatus.textContent = '✗ Failed';
            syncStatus.style.color = '#ef4444';
        }

    } finally {
        // Always restore button state
        setButtonLoading(bidButton, false);
        hideLoadingSpinner('createBid');
    }
}

/**
 * Generate PDF document from quote data WITHOUT Zoho sync
 * For simple PDF generation without CRM integration
 * @param {Object} state - Application state
 * @param {Event} event - Optional event object for button state management
 * @returns {Promise<void>}
 */
export async function generatePDF(state, event = null) {
    const pdfButton = event?.target || document.querySelector('[onclick*="generatePDF"]');

    try {
        // Show loading state
        setButtonLoading(pdfButton, true, 'Generating PDF...');
        showLoadingSpinner('Generating PDF document...', 'generatePDF');

        const quoteData = buildQuoteData(state);
        updateStatus('Preparing PDF...');

        // Generate PDF WITHOUT Zoho sync (use skipZoho parameter)
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
        const response = await fetch(`${API_BASE}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quoteData,
                skipZoho: true  // Skip Zoho sync for simple PDF generation
            })
        });

        const result = await response.json();

        if (result.success) {
            // PDF generation succeeded
            updateStatus('PDF generated successfully');

            // Auto-download PDF
            if (result.url) {
                const link = document.createElement('a');
                link.href = `${API_BASE}${result.url}`;
                link.download = result.filename;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            showNotification(`PDF generated: ${result.filename}`, 'success');
        } else {
            throw new Error(result.error || 'PDF generation failed');
        }

    } catch (error) {
        console.error('PDF Generation Error:', error);
        updateStatus('PDF generation failed', 'error');
        showNotification(`Failed to generate PDF: ${error.message}`, 'error');

    } finally {
        // Always restore button state
        setButtonLoading(pdfButton, false);
        hideLoadingSpinner('generatePDF');
    }
}

/**
 * Sync quote with Zoho CRM
 * Creates or updates quote in Zoho system
 * @param {Object} state - Application state
 * @param {Event} event - Optional event object for button state management
 * @returns {Promise<void>}
 */
export async function syncWithZoho(state, event = null) {
    const zohoButton = event?.target || document.querySelector('[onclick*="syncWithZoho"]');

    try {
        // Show loading state
        setButtonLoading(zohoButton, true, 'Syncing to CRM...');
        showLoadingSpinner('Synchronizing quote with Zoho CRM...', 'syncWithZoho');

        if (!state.modules?.zoho) {
            showNotification('Zoho sync module not available. Please check server connection.', 'warning');
            return;
        }

        const quoteData = buildQuoteData(state);
        updateStatus('Preparing CRM data...');

        // Real Zoho API call
        const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
        const response = await fetch(`${API_BASE}/api/zoho/create-quote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ quoteData })
        });

        const result = await response.json();

        if (result.success) {
            updateStatus('Quote synced to Zoho CRM');
            showNotification(`Quote synced to Zoho CRM: ${result.id}`, 'success');

            // Store sync reference for future updates
            state.lastZohoSync = {
                id: result.id,
                timestamp: new Date().toISOString()
            };

        } else {
            throw new Error(result.error || 'Zoho sync failed');
        }

    } catch (error) {
        console.error('Zoho Sync Error:', error);
        updateStatus('Zoho sync failed', 'error');
        showNotification(`Failed to sync with Zoho CRM: ${error.message}`, 'error');

    } finally {
        // Always restore button state
        setButtonLoading(zohoButton, false);
        hideLoadingSpinner('syncWithZoho');
    }
}

/**
 * Save quote to local storage (session only)
 * @param {Object} state - Application state
 */
export function saveQuote(state) {
    const quoteData = buildQuoteData(state);
    // Use sessionStorage instead of localStorage to prevent persistence between sessions
    sessionStorage.setItem('currentQuote', JSON.stringify(quoteData));
    updateStatus('Quote saved locally (for this session only)');
    showNotification('Quote saved for current session', 'success', 2000);
}

/**
 * Email quote to customer
 * Opens email client with quote details
 * @param {Object} state - Application state
 * @returns {Promise<void>}
 */
export async function emailQuote(state) {
    try {
        const quoteData = buildQuoteData(state);
        const customer = state.customer || quoteData.customer;
        const total = quoteData.calculations?.total || 0;

        // Generate email content
        const subject = encodeURIComponent(`Energen Generator Service Quote - ${customer.companyName || 'Customer'}`);
        const body = encodeURIComponent(`
Dear ${customer.companyName || 'Valued Customer'},

Thank you for considering Energen Systems for your generator service needs.

Quote Details:
${quoteData.units.map((unit, index) =>
    `Unit ${index + 1}: ${unit.kw}kW Generator
Services: ${unit.services ? unit.services.join(', ') : 'Not specified'}
Subtotal: $${unit.calculations?.total ? unit.calculations.total.toFixed(2) : '0.00'}`
).join('\n')}

Total Quote: $${total.toFixed(2)}

This quote is valid for 30 days. Please contact us to schedule your service.

Best regards,
Energen Systems Inc.
Phone: (925) 676-8552
Email: service@energensystems.com
        `);

        // Try modern Web Share API first (mobile/modern browsers)
        if (navigator.share) {
            await navigator.share({
                title: `Energen Quote - ${customer.companyName || 'Customer'}`,
                text: decodeURIComponent(body),
                url: window.location.href
            });
            updateStatus('Quote shared successfully');
        } else {
            // Fallback to mailto
            const mailtoUrl = `mailto:${customer.email || ''}?subject=${subject}&body=${body}`;
            window.location.href = mailtoUrl;
            updateStatus('Opening email client...');
        }
    } catch (error) {
        console.error('Email quote error:', error);
        updateStatus('Error preparing email. Please try again.');
        showNotification('Failed to prepare email', 'error');
    }
}

/**
 * Duplicate current quote
 * Saves copy to session storage for duplication
 * @param {Object} state - Application state
 */
export function duplicateQuote(state) {
    const quoteData = buildQuoteData(state);
    // Use sessionStorage instead of localStorage to prevent persistence between sessions
    sessionStorage.setItem('duplicateQuote', JSON.stringify(quoteData));
    updateStatus('Quote duplicated (for this session)');
    showNotification('Quote duplicated successfully', 'success', 2000);
}

/**
 * Export quote as JSON file
 * Downloads quote data as JSON for backup/import
 * @param {Object} state - Application state
 */
export function exportQuoteJSON(state) {
    try {
        const quoteData = buildQuoteData(state);
        const dataStr = JSON.stringify(quoteData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `energen-quote-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        updateStatus('Quote exported as JSON');
        showNotification('Quote exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export quote', 'error');
    }
}

/**
 * Print quote (browser print dialog)
 * @param {Object} state - Application state
 */
export function printQuote(state) {
    try {
        // Store current state for print view
        window.printQuoteData = buildQuoteData(state);

        // Trigger browser print
        window.print();

        updateStatus('Print dialog opened');
    } catch (error) {
        console.error('Print error:', error);
        showNotification('Failed to open print dialog', 'error');
    }
}

// Helper functions - imported or accessed via window for UI functions
// buildQuoteData imported from summary-calculator.js
// updateStatus and showNotification imported from utilities.js

function setButtonLoading(button, loading, text = null) {
    if (window.setButtonLoading) {
        window.setButtonLoading(button, loading, text);
    }
}

function showLoadingSpinner(message, id) {
    if (window.showLoadingSpinner) {
        window.showLoadingSpinner(message, id);
    }
}

function hideLoadingSpinner(id) {
    if (window.hideLoadingSpinner) {
        window.hideLoadingSpinner(id);
    }
}

/**
 * Open Zoho sync modal with success details
 * @param {Object} zohoData - Zoho sync result data
 * @param {string} pdfFilename - PDF filename for reference
 */
function openZohoSyncModal(zohoData, pdfFilename) {
    const modal = document.getElementById('zohoSyncModal');
    if (!modal) {
        console.warn('[ZOHO MODAL] Modal element not found');
        // Fallback to simple confirm dialog
        const openZoho = confirm(`
            Bid created successfully and synced to Zoho!

            Account: ${zohoData.accountName}
            Quote #: ${zohoData.estimateNumber}

            Open in Zoho CRM?
        `);

        if (openZoho && zohoData.zohoUrl) {
            window.open(zohoData.zohoUrl, '_blank');
        }
        return;
    }

    // Get modal elements
    const loading = document.getElementById('zohoSyncLoading');
    const success = document.getElementById('zohoSyncSuccess');
    const error = document.getElementById('zohoSyncError');

    // Hide loading and error, show success
    if (loading) loading.style.display = 'none';
    if (error) error.style.display = 'none';
    if (success) success.style.display = 'block';

    // Populate success details
    const accountName = document.getElementById('zohoAccountName');
    const quoteNumber = document.getElementById('zohoQuoteNumber');
    const accountLink = document.getElementById('zohoAccountLink');
    const quoteLink = document.getElementById('zohoQuoteLink');
    const generatorsInfo = document.getElementById('zohoGeneratorsInfo');
    const generatorCount = document.getElementById('zohoGeneratorCount');

    if (accountName) accountName.textContent = zohoData.accountName || 'Unknown';
    if (quoteNumber) quoteNumber.textContent = zohoData.estimateNumber || zohoData.quoteNumber || 'N/A';

    if (accountLink && zohoData.accountUrl) {
        accountLink.href = zohoData.accountUrl;
        accountLink.style.display = 'flex';
    }

    if (quoteLink && zohoData.zohoUrl) {
        quoteLink.href = zohoData.zohoUrl;
        quoteLink.style.display = 'flex';
    }

    if (zohoData.generatorCount && zohoData.generatorCount > 0) {
        if (generatorsInfo) generatorsInfo.style.display = 'block';
        if (generatorCount) generatorCount.textContent = zohoData.generatorCount;
    }

    // Show the modal
    modal.classList.add('active');
}

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.pdfGenerator = {
        createBid,
        generatePDF,
        syncWithZoho,
        saveQuote,
        emailQuote,
        duplicateQuote,
        exportQuoteJSON,
        printQuote
    };

    // Also expose createBid directly for button onclick
    window.createBid = (event) => createBid(window.state, event);
}
