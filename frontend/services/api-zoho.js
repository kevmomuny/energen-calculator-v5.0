/**
 * Zoho API Connector
 * Handles Zoho CRM integration API calls
 * Dependencies: utilities.js
 */

import { updateStatus } from '../js/utilities.js';

/**
 * Create Zoho API Connector
 * @returns {Object} API connector with Zoho methods
 */
export function createZohoAPIConnector() {
    return {
        /**
         * Sync quote to Zoho CRM
         * @param {Object} data - Quote data to sync
         * @returns {Promise<Object>} Sync result
         */
        syncQuote: async function(data) {
            updateStatus('Syncing with Zoho...');

            // NO TRY/CATCH - FAIL IMMEDIATELY
            const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin;
            const response = await fetch(`${API_BASE}/api/zoho/create-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Zoho sync failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            const syncTime = new Date().toLocaleTimeString();
            const lastSyncEl = document.getElementById('last-sync');
            if (lastSyncEl) {
                lastSyncEl.textContent = syncTime;
            }
            updateStatus('Zoho sync complete', 'success');
            return result;
        },

        /**
         * Search for customer in Zoho CRM
         * @param {string} companyName - Company name to search
         * @returns {Promise<Object|null>} Customer data or null if not found
         */
        searchCustomer: async function(companyName) {
            // NO TRY/CATCH - FAIL IMMEDIATELY
            const response = await fetch((window.location.hostname === 'localhost' ? 'http://localhost:3002' : window.location.origin) + '/api/zoho/search-customer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName: companyName })
            });

            if (!response.ok) {
                throw new Error(`Zoho search failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            // Return null if not found instead of throwing error
            if (!data.success || !data.customer) {
                return null;
            }
            return data.customer;
        }
    };
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.createZohoAPIConnector = createZohoAPIConnector;
}
