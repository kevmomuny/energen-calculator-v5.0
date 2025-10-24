/**
 * Customer View Module - Zoho CRM Integration
 * Displays and manages customer records from Zoho CRM
 *
 * @module frontend/modules/customer-view
 * @version 5.0.0
 */

import { updateStatus, showNotification } from '../js/utilities.js';
import { state } from '../js/state.js';

/**
 * Customer View Module Class
 * Handles displaying, searching, and managing Zoho CRM accounts
 */
export class CustomerViewModule {
    constructor() {
        this.container = null;
        this.customers = [];
        this.selectedCustomer = null;
        this.searchQuery = '';
        this.currentPage = 1;
        this.pageSize = 20;
        this.isLoading = false;
    }

    /**
     * Initialize the customer view
     */
    async initialize() {
        console.log('[CUSTOMER VIEW] Initializing...');
        this.container = document.getElementById('customersView');

        if (!this.container) {
            console.error('[CUSTOMER VIEW] Container #customersView not found');
            return;
        }

        this.render();
        await this.loadCustomers();
    }

    /**
     * Render the customer view UI
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="customer-view-container" style="display: flex; flex-direction: column; height: 100%; gap: 16px;">
                <!-- Header Section -->
                <div class="customer-view-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle);">
                    <div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: var(--text-primary);">
                            <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 8px;">group</span>
                            Customers
                        </h2>
                        <p style="margin: 4px 0 0 0; font-size: 11px; color: var(--text-secondary);">
                            Manage Zoho CRM accounts
                        </p>
                    </div>
                    <button onclick="window.customerView.addCustomer()" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">add</span>
                        <span>New Customer</span>
                    </button>
                </div>

                <!-- Search Bar -->
                <div class="customer-search-bar" style="display: flex; gap: 12px;">
                    <div style="flex: 1; position: relative;">
                        <span class="material-symbols-outlined" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); font-size: 18px;">search</span>
                        <input
                            type="text"
                            id="customerSearchInput"
                            placeholder="Search customers by name, industry, or location..."
                            style="width: 100%; padding: 10px 12px 10px 42px; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); font-size: 13px;"
                            oninput="window.customerView.handleSearch(this.value)"
                        >
                    </div>
                    <button onclick="window.customerView.loadCustomers()" class="btn btn-secondary" style="display: flex; align-items: center; gap: 6px; padding: 10px 16px;">
                        <span class="material-symbols-outlined" style="font-size: 18px;">refresh</span>
                        <span>Refresh</span>
                    </button>
                </div>

                <!-- Customer List -->
                <div class="customer-list-container" style="flex: 1; overflow-y: auto; min-height: 0;">
                    <div id="customerList" class="customer-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; padding-right: 4px;">
                        <!-- Customer cards will be inserted here -->
                    </div>

                    <!-- Loading State -->
                    <div id="customerListLoading" style="display: none; text-align: center; padding: 48px; color: var(--text-secondary);">
                        <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                        <p>Loading customers from Zoho CRM...</p>
                    </div>

                    <!-- Empty State -->
                    <div id="customerListEmpty" style="display: none; text-align: center; padding: 64px 24px; color: var(--text-secondary);">
                        <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3; display: block; margin-bottom: 16px;">folder_open</span>
                        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">No customers found</h3>
                        <p style="margin: 0; font-size: 12px;">Try adjusting your search or add a new customer</p>
                    </div>
                </div>

                <!-- Customer Detail Panel (Slide-out) -->
                <div id="customerDetailPanel" class="customer-detail-panel" style="display: none; position: fixed; top: 48px; right: 0; bottom: 32px; width: 480px; background: var(--bg-elevated); border-left: 1px solid var(--border-subtle); z-index: 1000; overflow-y: auto; transform: translateX(100%); transition: transform 0.3s ease;">
                    <!-- Detail content will be inserted here -->
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close detail panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('customerDetailPanel');
            if (panel && !panel.contains(e.target) && !e.target.closest('.customer-card')) {
                this.closeDetailPanel();
            }
        });
    }

    /**
     * Load customers from Zoho CRM
     */
    async loadCustomers() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
            const searchParam = this.searchQuery ? `?q=${encodeURIComponent(this.searchQuery)}&limit=100` : '?limit=100';

            const response = await fetch(`${API_BASE}/api/customers/search${searchParam}`);

            if (!response.ok) {
                throw new Error(`Failed to load customers: ${response.statusText}`);
            }

            const result = await response.json();
            this.customers = result.customers || [];

            console.log(`[CUSTOMER VIEW] Loaded ${this.customers.length} customers from Zoho`);

            this.renderCustomerList();
            updateStatus(`Loaded ${this.customers.length} customers from Zoho`, 'success');

        } catch (error) {
            console.error('[CUSTOMER VIEW] Load error:', error);
            updateStatus('Failed to load customers from Zoho', 'error');
            showNotification(`Error: ${error.message}`, 'error');
            this.customers = [];
            this.renderCustomerList();
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        this.searchQuery = query.trim();

        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            if (this.searchQuery.length >= 2 || this.searchQuery.length === 0) {
                this.loadCustomers();
            }
        }, 500);
    }

    /**
     * Render customer list
     */
    renderCustomerList() {
        const listEl = document.getElementById('customerList');
        const emptyEl = document.getElementById('customerListEmpty');

        if (!listEl || !emptyEl) return;

        if (this.customers.length === 0) {
            listEl.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }

        listEl.style.display = 'grid';
        emptyEl.style.display = 'none';

        listEl.innerHTML = this.customers.map(customer => this.renderCustomerCard(customer)).join('');
    }

    /**
     * Render a single customer card
     */
    renderCustomerCard(customer) {
        const status = customer.type || 'Customer';
        const statusColor = status.toLowerCase().includes('prospect') ? 'var(--accent-warning)' : 'var(--accent-success)';

        return `
            <div class="customer-card" onclick="window.customerView.showCustomerDetail('${customer.id}')" style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;">
                <!-- Status Badge -->
                <div style="position: absolute; top: 12px; right: 12px;">
                    <span style="font-size: 9px; padding: 3px 8px; background: ${statusColor}20; color: ${statusColor}; border-radius: 4px; font-weight: 600; text-transform: uppercase;">${status}</span>
                </div>

                <!-- Company Info -->
                <div style="margin-bottom: 12px;">
                    <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: var(--text-primary); padding-right: 80px;">${this.escapeHtml(customer.name)}</h3>
                    ${customer.type ? `<p style="margin: 0; font-size: 10px; color: var(--text-tertiary);">${customer.type}</p>` : ''}
                </div>

                <!-- Contact Info -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; font-size: 11px; color: var(--text-secondary);">
                    ${customer.phone ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">phone</span>
                            <span>${this.escapeHtml(customer.phone)}</span>
                        </div>
                    ` : ''}
                    ${customer.email ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">email</span>
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(customer.email)}</span>
                        </div>
                    ` : ''}
                    ${customer.address ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="material-symbols-outlined" style="font-size: 14px; color: var(--text-tertiary);">location_on</span>
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(customer.address)}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                    <button onclick="event.stopPropagation(); window.customerView.loadIntoCalculator('${customer.id}')" class="btn btn-sm btn-primary" style="flex: 1; font-size: 10px; padding: 6px 12px;">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">calculate</span>
                        <span>New Quote</span>
                    </button>
                    <button onclick="event.stopPropagation(); window.customerView.showCustomerDetail('${customer.id}')" class="btn btn-sm btn-secondary" style="font-size: 10px; padding: 6px 12px;">
                        <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">visibility</span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Show customer detail panel
     */
    async showCustomerDetail(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        this.selectedCustomer = customer;
        const panel = document.getElementById('customerDetailPanel');
        if (!panel) return;

        panel.innerHTML = `
            <div style="padding: 24px;">
                <!-- Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary);">Customer Details</h2>
                    <button onclick="window.customerView.closeDetailPanel()" class="btn btn-sm" style="padding: 6px;">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Company Name -->
                <div style="margin-bottom: 24px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: var(--text-primary);">${this.escapeHtml(customer.name)}</h3>
                    ${customer.type ? `<p style="margin: 0; font-size: 12px; color: var(--text-secondary);">${customer.type}</p>` : ''}
                </div>

                <!-- Contact Information -->
                <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 600;">Contact Information</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px; font-size: 12px;">
                        ${customer.phone ? `
                            <div>
                                <div style="color: var(--text-tertiary); font-size: 10px; margin-bottom: 2px;">Phone</div>
                                <div style="color: var(--text-primary); font-weight: 500;">${this.escapeHtml(customer.phone)}</div>
                            </div>
                        ` : ''}
                        ${customer.email ? `
                            <div>
                                <div style="color: var(--text-tertiary); font-size: 10px; margin-bottom: 2px;">Email</div>
                                <div style="color: var(--text-primary); font-weight: 500;">${this.escapeHtml(customer.email)}</div>
                            </div>
                        ` : ''}
                        ${customer.website ? `
                            <div>
                                <div style="color: var(--text-tertiary); font-size: 10px; margin-bottom: 2px;">Website</div>
                                <div style="color: var(--accent-blue);"><a href="${this.escapeHtml(customer.website)}" target="_blank" style="color: inherit; text-decoration: none;">${this.escapeHtml(customer.website)}</a></div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Address -->
                ${customer.address ? `
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 600;">Address</h4>
                        <div style="font-size: 12px; color: var(--text-primary); line-height: 1.6;">
                            ${this.escapeHtml(customer.address)}<br>
                            ${customer.city ? `${this.escapeHtml(customer.city)}, ` : ''}${customer.state || ''} ${customer.zip || ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Service Territory -->
                ${customer.serviceTerritory ? `
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                        <h4 style="margin: 0 0 12px 0; font-size: 12px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 600;">Service Territory</h4>
                        <div style="font-size: 12px; color: var(--text-primary);">${this.escapeHtml(customer.serviceTerritory)}</div>
                    </div>
                ` : ''}

                <!-- Actions -->
                <div style="display: flex; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-subtle);">
                    <button onclick="window.customerView.loadIntoCalculator('${customer.id}')" class="btn btn-primary" style="flex: 1;">
                        <span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 6px;">calculate</span>
                        <span>Create Quote</span>
                    </button>
                    <button onclick="window.customerView.editCustomer('${customer.id}')" class="btn btn-secondary">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                </div>
            </div>
        `;

        // Show panel with animation
        panel.style.display = 'block';
        setTimeout(() => {
            panel.style.transform = 'translateX(0)';
        }, 10);
    }

    /**
     * Close customer detail panel
     */
    closeDetailPanel() {
        const panel = document.getElementById('customerDetailPanel');
        if (!panel) return;

        panel.style.transform = 'translateX(100%)';
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }

    /**
     * Load customer into calculator for new quote
     */
    async loadIntoCalculator(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        try {
            updateStatus('Loading customer into calculator...', 'info');

            // Populate customer form fields
            const fields = {
                'companyName': customer.name,
                'phone': customer.phone,
                'email': customer.email,
                'website': customer.website,
                'address': customer.address,
                'city': customer.city,
                'state': customer.state,
                'zip': customer.zip
            };

            for (const [fieldId, value] of Object.entries(fields)) {
                const el = document.getElementById(fieldId);
                if (el && value) {
                    el.value = value;
                }
            }

            // Update state
            state.customer = {
                zohoAccountId: customer.id,
                companyName: customer.name,
                phone: customer.phone || '',
                email: customer.email || '',
                website: customer.website || '',
                address: customer.address || '',
                city: customer.city || '',
                state: customer.state || '',
                zip: customer.zip || '',
                serviceTerritory: customer.serviceTerritory || ''
            };

            // Switch to calculator view
            if (window.switchView) {
                window.switchView('calculator');
            }

            this.closeDetailPanel();

            updateStatus(`Customer loaded: ${customer.name}`, 'success');
            showNotification(`Customer loaded successfully. Ready to create quote.`, 'success');

        } catch (error) {
            console.error('[CUSTOMER VIEW] Load into calculator error:', error);
            updateStatus('Failed to load customer', 'error');
            showNotification(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Add new customer (opens modal)
     */
    addCustomer() {
        showNotification('Add customer feature coming soon - currently using calculator form', 'info');
        if (window.switchView) {
            window.switchView('calculator');
        }
    }

    /**
     * Edit customer (opens modal)
     */
    editCustomer(customerId) {
        showNotification('Edit customer feature coming soon - use Zoho CRM directly', 'info');
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        const loadingEl = document.getElementById('customerListLoading');
        const listEl = document.getElementById('customerList');

        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }
        if (listEl && show) {
            listEl.style.display = 'none';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create and expose global instance
window.customerView = new CustomerViewModule();

// Export for module imports
export default CustomerViewModule;
