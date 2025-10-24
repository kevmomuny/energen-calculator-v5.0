/**
 * Main Application Entry Point
 * Phase 2: Foundation + API Connectors
 * This entry point includes all Phase 1 & 2 modules
 */

// Import Phase 1 modules in dependency order
import { state, stateDebugger } from './state.js';
import {
    updateStatus,
    showCriticalError,
    formatMoney,
    debounce,
    getKwRange,
    calculateHaversineDistance
} from './utilities.js';
import {
    initializeSettings,
    initializeUIComponents,
    clearContactForm,
    initializeModules,
    SERVICES
} from './initialization.js';

// Import Phase 2: API Connectors
import { createCalculationAPIConnector } from '../services/api-calculation.js';
import { createPDFAPIConnector } from '../services/api-pdf.js';
import { createZohoAPIConnector } from '../services/api-zoho.js';
import { createEnrichmentAPIConnector } from '../services/api-enrichment.js';

/**
 * Phase 2: Foundation + API Connectors
 * Verifies that Phase 1 works with Phase 2 API modules
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c=== PHASE 2: API CONNECTORS TEST ===', 'background: #0066ff; color: #fff; font-size: 16px; padding: 4px;');
    console.log('✅ app-main.js loaded successfully');
    console.log('✅ State module imported:', typeof state);
    console.log('✅ Utilities module imported:', typeof updateStatus);
    console.log('✅ Initialization module imported:', typeof initializeSettings);
    console.log('✅ API Calculation module imported:', typeof createCalculationAPIConnector);
    console.log('✅ API PDF module imported:', typeof createPDFAPIConnector);
    console.log('✅ API Zoho module imported:', typeof createZohoAPIConnector);
    console.log('✅ API Enrichment module imported:', typeof createEnrichmentAPIConnector);

    // Critical: Initialize settings before anything else
    try {
        await initializeSettings();
        console.log('✅ Settings initialized successfully');

        // Initialize API connector modules
        state.modules = await initializeModules({
            createCalculationAPIConnector,
            createPDFAPIConnector,
            createZohoAPIConnector,
            createEnrichmentAPIConnector
        });
        console.log('✅ API modules initialized:', Object.keys(state.modules));

        // Now safe to initialize UI components
        initializeUIComponents();
        console.log('✅ UI components initialized');

        // Update status to show ready
        updateStatus('Phase 2: API connectors loaded successfully', 'success');

        console.log('%c=== PHASE 2 COMPLETE ===', 'background: #00ff00; color: #000; font-size: 16px; padding: 4px;');
        console.log('State:', state);
        console.log('Settings loaded from:', state.settingsSource);
        console.log('Labor rate:', state.activeSettings?.laborRate);
        console.log('Modules:', state.modules);
    } catch (error) {
        console.error('❌ CRITICAL: Failed to initialize:', error);
        showCriticalError('Failed to load application. Please refresh the page.');
    }
});

// Log when module is first parsed
console.log('%c📦 app-main.js module parsed (Phase 2)', 'color: #00ff00');
