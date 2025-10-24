/**
 * Email Quote Enhancement Module
 * Sprint 7: Post-Creation Workflows
 *
 * Professional email template with:
 * - Quote summary in body
 * - PDF attachment
 * - Recipient selection
 * - Zoho tracking
 *
 * @module frontend/modules/email-quote
 * @version 5.0.0
 * @sprint Sprint 7
 */

import { state } from '../js/state.js';
import { updateStatus, showNotification, formatMoney } from '../js/utilities.js';

/**
 * Email template structure
 * @typedef {Object} EmailTemplate
 * @property {string} subject - Email subject line
 * @property {string} body - HTML email body
 * @property {Array<string>} attachments - Attachment file paths
 */

/**
 * Open email quote modal
 * Shows recipient selection and preview
 *
 * @param {Object} quote - Quote object with all data
 * @returns {Promise<void>}
 */
async function openEmailQuoteModal(quote) {
    console.log('[EMAIL QUOTE] Opening modal for quote:', quote.bidNumber || 'DRAFT');

    // Validate quote has required data
    if (!quote.customer?.companyName) {
        showNotification('Quote must have customer information', 'error');
        return;
    }

    // Check if quote has PDF
    if (!quote.pdfPath && !quote.bidNumber) {
        showNotification('Generate PDF before sending email', 'warning');
        return;
    }

    // Build modal HTML
    const modalHTML = `
        <div class="modal-overlay" id="emailQuoteModal" onclick="closeEmailQuoteModal(event)">
            <div class="modal-content email-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h2>
                        <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">email</span>
                        Email Quote ${quote.bidNumber || 'DRAFT'}
                    </h2>
                    <button class="close-btn" onclick="closeEmailQuoteModal()">&times;</button>
                </div>

                <div class="modal-body" style="padding: 24px;">
                    <!-- Recipient Selection -->
                    <div class="form-section">
                        <label class="form-label">
                            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">person</span>
                            Select Recipient(s)
                        </label>
                        <div id="recipientsList" class="recipients-list">
                            ${renderRecipientOptions(quote)}
                        </div>
                        <button class="btn-secondary" onclick="addCustomRecipient()">
                            <span class="material-symbols-outlined" style="font-size: 16px;">add</span>
                            Add Custom Recipient
                        </button>
                    </div>

                    <!-- Email Preview -->
                    <div class="form-section" style="margin-top: 24px;">
                        <label class="form-label">
                            <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">preview</span>
                            Email Preview
                        </label>
                        <div class="email-preview">
                            <div class="email-subject">
                                <strong>Subject:</strong> ${generateSubject(quote)}
                            </div>
                            <div class="email-body">
                                ${generateEmailBody(quote)}
                            </div>
                            <div class="email-attachment">
                                <span class="material-symbols-outlined" style="vertical-align: middle;">attach_file</span>
                                <strong>Attachment:</strong> ${quote.pdfFilename || generatePDFFilename(quote)}
                            </div>
                        </div>
                    </div>

                    <!-- Custom Message (Optional) -->
                    <div class="form-section" style="margin-top: 24px;">
                        <label class="form-label">Custom Message (optional)</label>
                        <textarea
                            id="customMessage"
                            rows="3"
                            placeholder="Add a personal note to the email..."
                            style="width: 100%; padding: 12px; border: 1px solid var(--border-primary); border-radius: 8px;"
                        ></textarea>
                    </div>

                    <!-- Send Options -->
                    <div class="form-section" style="margin-top: 24px;">
                        <label class="checkbox-label">
                            <input type="checkbox" id="ccMyself" checked>
                            <span>Send me a copy</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="trackInZoho" checked>
                            <span>Track email in Zoho CRM</span>
                        </label>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeEmailQuoteModal()">Cancel</button>
                    <button class="btn-primary" onclick="sendQuoteEmail()" id="sendEmailBtn">
                        <span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">send</span>
                        Send Email
                    </button>
                </div>
            </div>
        </div>
    `;

    // Inject modal into DOM
    const existingModal = document.getElementById('emailQuoteModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store quote in window for access by handlers
    window.currentEmailQuote = quote;
}

/**
 * Render recipient checkbox options
 * @private
 */
function renderRecipientOptions(quote) {
    const recipients = [];

    // Primary contact
    if (quote.customer?.email) {
        recipients.push({
            name: quote.customer.contactName || 'Primary Contact',
            email: quote.customer.email,
            type: 'primary'
        });
    }

    // Additional contacts from Zoho
    if (quote.additionalContacts && Array.isArray(quote.additionalContacts)) {
        quote.additionalContacts.forEach(contact => {
            if (contact.email) {
                recipients.push({
                    name: contact.name || contact.fullName || 'Contact',
                    email: contact.email,
                    type: 'additional'
                });
            }
        });
    }

    if (recipients.length === 0) {
        return '<p style="color: #999;">No contacts available. Add a custom recipient.</p>';
    }

    return recipients.map((recipient, index) => `
        <label class="recipient-option">
            <input
                type="checkbox"
                name="recipient"
                value="${recipient.email}"
                ${index === 0 ? 'checked' : ''}
                class="recipient-checkbox"
            >
            <div class="recipient-info">
                <div class="recipient-name">${recipient.name}</div>
                <div class="recipient-email">${recipient.email}</div>
            </div>
            ${recipient.type === 'primary' ? '<span class="badge-primary">Primary</span>' : ''}
        </label>
    `).join('');
}

/**
 * Generate email subject line
 * @private
 */
function generateSubject(quote) {
    const bidNumber = quote.bidNumber || 'DRAFT';
    const company = quote.customer?.companyName || 'Customer';

    if (quote.bidNumber) {
        return `Quote ${bidNumber} - Generator Service Proposal for ${company}`;
    } else {
        return `Generator Service Proposal (Draft) - ${company}`;
    }
}

/**
 * Generate professional email body HTML
 * @private
 */
function generateEmailBody(quote) {
    const company = quote.customer?.companyName || '[Company Name]';
    const contactName = quote.customer?.contactName || '[Contact Name]';
    const bidNumber = quote.bidNumber || 'DRAFT';
    const total = quote.calculations?.total || quote.total || 0;
    const services = quote.services || [];
    const units = quote.units || quote.generators || [];
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">

            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #00d4ff; margin: 0; font-size: 28px;">Generator Service Proposal</h1>
                <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px;">Energen Power Services</p>
            </div>

            <div style="background: #ffffff; padding: 32px; border: 1px solid #e0e0e0; border-top: none;">

                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Dear ${contactName},
                </p>

                <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    Thank you for the opportunity to provide ${company} with a comprehensive generator maintenance proposal.
                    Please find attached our detailed quote for your review.
                </p>

                <!-- Quote Summary Box -->
                <div style="background: #f8f9fa; border-left: 4px solid #00d4ff; padding: 20px; margin: 24px 0; border-radius: 4px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a2e;">Quote Summary</h2>

                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Quote Number:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${bidNumber}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Customer:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${company}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Quote Date:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Total Units:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${units.length}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #666;">Total kW:</td>
                            <td style="padding: 8px 0; font-weight: 600; text-align: right;">${units.reduce((sum, u) => sum + (u.kw || 0), 0)} kW</td>
                        </tr>
                        <tr style="border-top: 2px solid #dee2e6;">
                            <td style="padding: 16px 0 0 0; color: #1a1a2e; font-size: 18px; font-weight: 600;">Annual Total:</td>
                            <td style="padding: 16px 0 0 0; font-size: 24px; font-weight: 700; text-align: right; color: #00d4ff;">${formatMoney(total)}</td>
                        </tr>
                    </table>
                </div>

                <!-- Services Included -->
                ${services.length > 0 ? `
                <div style="margin: 24px 0;">
                    <h3 style="font-size: 16px; color: #1a1a2e; margin: 0 0 12px 0;">Services Included:</h3>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                        ${services.map(s => `<li style="color: #555;">${s.name || s.code}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <p style="font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    Our proposal includes comprehensive maintenance services designed to keep your generator fleet
                    operating at peak performance. All services are scheduled quarterly for optimal reliability.
                </p>

                <p style="font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    Please review the attached PDF for complete details including:
                </p>

                <ul style="margin: 0 0 24px 0; padding-left: 20px; line-height: 1.8;">
                    <li>Detailed service breakdown by quarter</li>
                    <li>Labor and parts pricing</li>
                    <li>Service schedules and frequencies</li>
                    <li>Equipment specifications</li>
                </ul>

                <p style="font-size: 16px; line-height: 1.6; margin: 24px 0;">
                    If you have any questions or would like to discuss this proposal, please don't hesitate to contact us.
                </p>

                <p style="font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                    Best regards,<br>
                    <strong>Energen Power Services Team</strong>
                </p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="margin: 0; font-size: 12px; color: #666;">
                    This quote is valid for 30 days from the date above.<br>
                    Energen Power Services | Reliable Generator Maintenance
                </p>
            </div>

        </div>
    `;
}

/**
 * Generate PDF filename
 * @private
 */
function generatePDFFilename(quote) {
    const bidNumber = quote.bidNumber || 'DRAFT';
    const version = quote.version?.string || 'v1.0';
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

    if (quote.bidNumber) {
        return `Energen_Bid_${bidNumber}_${version}_${date}.pdf`;
    } else {
        return `Energen_Bid_DRAFT_${Date.now()}.pdf`;
    }
}

/**
 * Close email modal
 */
window.closeEmailQuoteModal = function(event) {
    if (event && event.target.classList.contains('modal-overlay')) {
        // Clicked outside modal
    } else if (event && event.target.classList.contains('close-btn')) {
        // Clicked X button
    } else if (!event) {
        // Called programmatically
    } else {
        return; // Clicked inside modal
    }

    const modal = document.getElementById('emailQuoteModal');
    if (modal) modal.remove();

    delete window.currentEmailQuote;
};

/**
 * Add custom recipient field
 */
window.addCustomRecipient = function() {
    const recipientsList = document.getElementById('recipientsList');
    if (!recipientsList) return;

    const customRecipientHTML = `
        <div class="custom-recipient" style="display: flex; gap: 8px; margin-top: 12px;">
            <input
                type="text"
                placeholder="Name"
                class="custom-recipient-name"
                style="flex: 1; padding: 8px; border: 1px solid var(--border-primary); border-radius: 4px;"
            >
            <input
                type="email"
                placeholder="email@example.com"
                class="custom-recipient-email"
                style="flex: 2; padding: 8px; border: 1px solid var(--border-primary); border-radius: 4px;"
            >
            <button
                class="btn-icon"
                onclick="this.parentElement.remove()"
                style="padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;"
            >
                <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
            </button>
        </div>
    `;

    recipientsList.insertAdjacentHTML('beforeend', customRecipientHTML);
};

/**
 * Send quote email
 */
window.sendQuoteEmail = async function() {
    const quote = window.currentEmailQuote;
    if (!quote) {
        showNotification('Quote data not found', 'error');
        return;
    }

    // Get selected recipients
    const selectedCheckboxes = document.querySelectorAll('.recipient-checkbox:checked');
    const recipients = Array.from(selectedCheckboxes).map(cb => cb.value);

    // Get custom recipients
    const customRecipients = [];
    document.querySelectorAll('.custom-recipient').forEach(customDiv => {
        const name = customDiv.querySelector('.custom-recipient-name')?.value;
        const email = customDiv.querySelector('.custom-recipient-email')?.value;
        if (email && validateEmail(email)) {
            customRecipients.push({ name: name || 'Customer', email });
        }
    });

    const allRecipients = [...recipients, ...customRecipients.map(r => r.email)];

    if (allRecipients.length === 0) {
        showNotification('Please select at least one recipient', 'warning');
        return;
    }

    // Get options
    const customMessage = document.getElementById('customMessage')?.value || '';
    const ccMyself = document.getElementById('ccMyself')?.checked || false;
    const trackInZoho = document.getElementById('trackInZoho')?.checked || false;

    // Disable send button
    const sendBtn = document.getElementById('sendEmailBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="spinner-small"></span> Sending...';
    }

    try {
        updateStatus('Sending email...', 'info');

        // Call backend API
        const response = await fetch('/api/email-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quote: {
                    ...quote,
                    customMessage
                },
                recipients: allRecipients,
                ccMyself,
                trackInZoho,
                emailBody: generateEmailBody(quote),
                emailSubject: generateSubject(quote)
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send email');
        }

        const result = await response.json();

        showNotification('Email sent successfully!', 'success');
        updateStatus(`Email sent to ${allRecipients.length} recipient(s)`, 'success');

        // Track in Zoho if enabled
        if (trackInZoho && result.zohoActivityId) {
            console.log('[EMAIL] Tracked in Zoho:', result.zohoActivityId);
        }

        // Close modal
        window.closeEmailQuoteModal();

    } catch (error) {
        console.error('[EMAIL] Send failed:', error);
        showNotification(`Failed to send email: ${error.message}`, 'error');

        // Re-enable button
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px; margin-right: 4px;">send</span> Send Email';
        }
    }
};

/**
 * Validate email address
 * @private
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Export functions
export {
    openEmailQuoteModal,
    generateEmailBody,
    generateSubject
};

// Note: This function is exposed via global-handlers.js as window.emailQuote()
// No need to expose directly - prevents duplicate export errors
