/**
 * Documents View Module
 * Displays and manages generated PDFs, quotes, and documents
 * Integrates with Zoho for document syncing
 *
 * @module frontend/modules/documents-view
 * @version 5.0.0
 */

import { updateStatus, formatMoney, showNotification } from '../js/utilities.js';

/**
 * Documents View Module Class
 * Handles displaying, filtering, and downloading generated documents
 */
export class DocumentsViewModule {
    constructor() {
        this.container = null;
        this.documents = [];
        this.filteredDocuments = [];
        this.filterType = 'all';
        this.filterCustomer = '';
        this.filterDateStart = '';
        this.filterDateEnd = '';
        this.isLoading = false;
        this.API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
    }

    /**
     * Initialize the documents view
     */
    async initialize() {
        console.log('[DOCUMENTS VIEW] Initializing...');
        this.container = document.getElementById('documentsView');

        if (!this.container) {
            console.error('[DOCUMENTS VIEW] Container #documentsView not found');
            return;
        }

        this.render();
        await this.loadDocuments();
    }

    /**
     * Render the documents view UI
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="documents-view-container" style="display: flex; flex-direction: column; height: 100%; gap: 16px; padding: 20px;">
                <!-- Header Section -->
                <div class="documents-view-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle);">
                    <div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 12px;">
                            <span class="material-symbols-outlined">folder</span>
                            Documents
                        </h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--text-secondary);">
                            Generated quotes, PDFs, and reports
                        </p>
                    </div>
                    <button onclick="window.documentsView.refreshDocuments()" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
                        <span>Refresh</span>
                    </button>
                </div>

                <!-- Filter Bar -->
                <div class="documents-filter-bar" style="display: grid; grid-template-columns: 200px 1fr 200px 200px; gap: 12px; padding: 16px; background: var(--bg-elevated); border-radius: 8px;">
                    <div>
                        <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Type</label>
                        <select id="documentTypeFilter" onchange="window.documentsView.handleFilterChange()"
                                style="width: 100%; padding: 8px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                            <option value="all">All Types</option>
                            <option value="quote">Quotes</option>
                            <option value="agreement">Service Agreements</option>
                            <option value="invoice">Invoices</option>
                            <option value="report">Reports</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Search</label>
                        <input type="text" id="documentSearchInput"
                               placeholder="Search by customer or filename..."
                               oninput="window.documentsView.handleFilterChange()"
                               style="width: 100%; padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Start Date</label>
                        <input type="date" id="documentDateStart"
                               onchange="window.documentsView.handleFilterChange()"
                               style="width: 100%; padding: 8px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 10px; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">End Date</label>
                        <input type="date" id="documentDateEnd"
                               onchange="window.documentsView.handleFilterChange()"
                               style="width: 100%; padding: 8px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-primary); font-size: 12px;">
                    </div>
                </div>

                <!-- Documents Grid -->
                <div id="documentsGridContainer" style="flex: 1; overflow-y: auto;">
                    <!-- Documents will be rendered here -->
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">hourglass_empty</span>
                        <p>Loading documents...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load documents from API
     */
    async loadDocuments() {
        if (this.isLoading) return;

        this.isLoading = true;
        updateStatus('Loading documents...', 'info');

        try {
            const response = await fetch(`${this.API_BASE}/api/documents/list`);

            if (!response.ok) {
                throw new Error(`Failed to load documents: ${response.statusText}`);
            }

            this.documents = await response.json();
            this.filteredDocuments = [...this.documents];

            console.log('[DOCUMENTS VIEW] Loaded documents:', this.documents.length);

            this.renderDocuments();
            updateStatus(`Loaded ${this.documents.length} documents`, 'success');

        } catch (error) {
            console.error('[DOCUMENTS VIEW] Error loading documents:', error);
            updateStatus('Failed to load documents', 'error');
            this.renderError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Handle filter changes
     */
    handleFilterChange() {
        const typeFilter = document.getElementById('documentTypeFilter')?.value || 'all';
        const searchInput = document.getElementById('documentSearchInput')?.value.toLowerCase() || '';
        const dateStart = document.getElementById('documentDateStart')?.value || '';
        const dateEnd = document.getElementById('documentDateEnd')?.value || '';

        this.filteredDocuments = this.documents.filter(doc => {
            // Type filter
            if (typeFilter !== 'all' && doc.type !== typeFilter) return false;

            // Search filter
            if (searchInput && !doc.filename.toLowerCase().includes(searchInput) &&
                !doc.customer?.toLowerCase().includes(searchInput)) {
                return false;
            }

            // Date range filter
            if (dateStart && new Date(doc.created) < new Date(dateStart)) return false;
            if (dateEnd && new Date(doc.created) > new Date(dateEnd)) return false;

            return true;
        });

        this.renderDocuments();
    }

    /**
     * Render documents grid
     */
    renderDocuments() {
        const container = document.getElementById('documentsGridContainer');
        if (!container) return;

        if (this.filteredDocuments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.2;">folder_open</span>
                    <h3 style="margin-top: 16px; color: var(--text-primary);">No Documents Found</h3>
                    <p>No documents match your current filters</p>
                </div>
            `;
            return;
        }

        const grid = this.filteredDocuments.map(doc => this.renderDocumentCard(doc)).join('');

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 4px;">
                ${grid}
            </div>
        `;
    }

    /**
     * Render a single document card
     */
    renderDocumentCard(doc) {
        const icon = this.getDocumentIcon(doc.type);
        const formattedDate = new Date(doc.created).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const sizeKB = (doc.size / 1024).toFixed(1);

        return `
            <div class="document-card" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; transition: all 0.2s; cursor: pointer;"
                 onmouseenter="this.style.borderColor='var(--accent-blue)'; this.style.transform='translateY(-2px)';"
                 onmouseleave="this.style.borderColor='var(--border-subtle)'; this.style.transform='translateY(0)';">

                <!-- Document Icon & Type -->
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-outlined" style="color: var(--accent-blue); font-size: 28px;">${icon}</span>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 10px; text-transform: uppercase; color: var(--text-tertiary); letter-spacing: 0.5px; margin-bottom: 4px;">
                            ${doc.type || 'Document'}
                        </div>
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.3; word-break: break-word;">
                            ${this.escapeHtml(doc.filename.replace(/\.[^/.]+$/, ''))}
                        </div>
                    </div>
                </div>

                <!-- Document Metadata -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; padding: 8px 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
                    ${doc.customer ? `
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">business</span>
                            <span style="color: var(--text-secondary);">${this.escapeHtml(doc.customer)}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">schedule</span>
                        <span style="color: var(--text-secondary);">${formattedDate}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">insert_drive_file</span>
                        <span style="color: var(--text-secondary);">${sizeKB} KB</span>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="window.documentsView.previewDocument('${this.escapeHtml(doc.filename)}')"
                            class="btn btn-secondary"
                            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: 11px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
                        <span>Preview</span>
                    </button>
                    <button onclick="window.documentsView.downloadDocument('${this.escapeHtml(doc.filename)}')"
                            class="btn btn-primary"
                            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: 11px;">
                        <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                        <span>Download</span>
                    </button>
                    ${doc.type === 'quote' && doc.zohoQuoteId ? `
                    <button onclick="window.documentsView.convertToInvoice('${this.escapeHtml(doc.filename)}')"
                            class="btn btn-secondary"
                            style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; font-size: 11px; background: var(--accent-success); color: white;"
                            title="Convert to Zoho Books Invoice">
                        <span class="material-symbols-outlined" style="font-size: 16px;">receipt_long</span>
                        <span>Invoice</span>
                    </button>
                    ` : ''}
                    <button onclick="window.documentsView.deleteDocument('${this.escapeHtml(doc.filename)}')"
                            class="btn btn-secondary"
                            style="padding: 8px; font-size: 11px; color: var(--accent-danger);"
                            title="Delete document">
                        <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get icon for document type
     */
    getDocumentIcon(type) {
        const icons = {
            'quote': 'description',
            'agreement': 'assignment',
            'invoice': 'receipt',
            'report': 'insights',
            'default': 'insert_drive_file'
        };
        return icons[type] || icons.default;
    }

    /**
     * Preview document (open in new tab)
     */
    previewDocument(filename) {
        const url = `${this.API_BASE}/api/documents/download/${encodeURIComponent(filename)}`;
        window.open(url, '_blank');
        updateStatus(`Opening ${filename}`, 'info');
    }

    /**
     * Download document
     */
    downloadDocument(filename) {
        const url = `${this.API_BASE}/api/documents/download/${encodeURIComponent(filename)}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        updateStatus(`Downloading ${filename}`, 'success');
    }

    /**
     * Delete document
     */
    async deleteDocument(filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            updateStatus(`Deleting ${filename}...`, 'info');

            const response = await fetch(`${this.API_BASE}/api/documents/delete/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Failed to delete: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                updateStatus(`Document deleted: ${filename}`, 'success');
                showNotification('Document deleted successfully', 'success');

                // Remove from local array
                this.documents = this.documents.filter(doc => doc.filename !== filename);
                this.filteredDocuments = this.filteredDocuments.filter(doc => doc.filename !== filename);

                // Re-render
                this.renderDocuments();
            } else {
                throw new Error(result.error || 'Unknown error');
            }

        } catch (error) {
            console.error('[DOCUMENTS VIEW] Delete error:', error);
            updateStatus('Failed to delete document', 'error');
            showNotification(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Convert quote to Zoho Books invoice
     */
    async convertToInvoice(filename) {
        try {
            updateStatus('Converting to invoice...', 'info');
            showNotification('Creating invoice in Zoho Books...', 'info');

            // Load the quote data from the document metadata or session
            // In a real implementation, this would retrieve the full quote data
            const quoteData = await this.loadQuoteDataForDocument(filename);

            if (!quoteData) {
                throw new Error('Quote data not found. Please regenerate the quote.');
            }

            // Call the backend to create invoice
            const response = await fetch(`${this.API_BASE}/api/zoho/books/create-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quoteData })
            });

            const result = await response.json();

            if (result.success) {
                showNotification(`✅ Invoice created: ${result.invoice.invoiceNumber}`, 'success');
                updateStatus(`Invoice ${result.invoice.invoiceNumber} created successfully`, 'success');

                // Optionally open invoice in Zoho Books
                if (result.invoice.invoiceUrl) {
                    const openInvoice = confirm('Invoice created! Would you like to open it in Zoho Books?');
                    if (openInvoice) {
                        window.open(result.invoice.invoiceUrl, '_blank');
                    }
                }
            } else {
                throw new Error(result.error || 'Invoice creation failed');
            }

        } catch (error) {
            console.error('[DOCUMENTS VIEW] Invoice conversion error:', error);
            updateStatus('Invoice conversion failed', 'error');
            showNotification(`❌ Failed to create invoice: ${error.message}`, 'error');
        }
    }

    /**
     * Load quote data for a document
     * This retrieves the quote data needed for invoice creation
     */
    async loadQuoteDataForDocument(filename) {
        try {
            // Extract quote ID from filename (e.g., "Energen_Bid_LBNL-2025.pdf" -> "LBNL-2025")
            const match = filename.match(/Energen_Bid_(.+?)\.pdf/);
            if (!match) {
                throw new Error('Could not extract quote ID from filename');
            }

            const quoteId = match[1];

            // Try to load from session storage first
            const sessionKey = `quote_${quoteId}`;
            const sessionData = sessionStorage.getItem(sessionKey);

            if (sessionData) {
                return JSON.parse(sessionData);
            }

            // Otherwise, we need to retrieve it from the server
            // This assumes you have an endpoint to retrieve saved quotes
            const response = await fetch(`${this.API_BASE}/api/quote/${encodeURIComponent(quoteId)}`);

            if (!response.ok) {
                throw new Error('Quote data not found on server');
            }

            const quoteData = await response.json();
            return quoteData;

        } catch (error) {
            console.error('[DOCUMENTS VIEW] Failed to load quote data:', error);
            return null;
        }
    }

    /**
     * Refresh documents list
     */
    async refreshDocuments() {
        updateStatus('Refreshing documents...', 'info');
        await this.loadDocuments();
    }

    /**
     * Render error message
     */
    renderError(message) {
        const container = document.getElementById('documentsGridContainer');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.2; color: var(--accent-danger);">error</span>
                <h3 style="margin-top: 16px; color: var(--text-primary);">Failed to Load Documents</h3>
                <p>${this.escapeHtml(message)}</p>
                <button onclick="window.documentsView.refreshDocuments()" class="btn btn-primary" style="margin-top: 16px;">
                    Try Again
                </button>
            </div>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export instance for global access
export const documentsView = new DocumentsViewModule();

// Make available globally for inline handlers
window.documentsView = documentsView;
