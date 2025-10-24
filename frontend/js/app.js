/**
 * Main Application Entry Point
 * Energen Calculator v4.5
 */

import '../core/EventBus.js';
import '../services/api-service-unified.js';
import '../modules/energen-client.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize event bus
    if (window.EnergenEventBus) {
        window.EnergenEventBus.emit('app:initialized', {
            version: '4.5.0',
            timestamp: new Date().toISOString()
        });
    }
    
    // Load settings if available
    const settings = localStorage.getItem('energenSettings');
    if (settings) {
        try {
            window.energenSettings = JSON.parse(settings);
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
    
    // Initialize API service
    if (window.EnergenAPI) {
        window.EnergenAPI.setBaseURL('http://localhost:3002');
    }
});

// Export for webpack
export default {
    version: '4.5.0',
    name: 'Energen Calculator'
};