/**
 * PDF API Connector
 * Handles PDF generation API calls
 * Dependencies: utilities.js
 */

import { updateStatus } from '../js/utilities.js';

/**
 * Show notification (helper function)
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
function showNotification(message, type) {
    // Simple notification - could be enhanced with a toast library
    console.log(`[${type.toUpperCase()}] ${message}`);
    updateStatus(message, type);
}

/**
 * Create PDF API Connector
 * @returns {Object} API connector with PDF methods
 */
export function createPDFAPIConnector() {
    return {
        /**
         * Generate PDF document
         * @param {Object} data - PDF generation data
         * @returns {Promise<void>}
         */
        generate: async function(data) {
            updateStatus('Generating PDF...');
            // Simulate PDF generation
            await new Promise(resolve => setTimeout(resolve, 1000));

            updateStatus('PDF generated successfully', 'success');
            showNotification('PDF generation complete', 'success');
        }
    };
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
    window.createPDFAPIConnector = createPDFAPIConnector;
}
