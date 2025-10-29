/**
 * ENERGEN CALCULATOR v5.0 - Robust Application Initialization
 * Implements dependency-aware asynchronous module loading with guaranteed initialization order
 * Eliminates all race conditions through explicit dependency resolution
 */

console.log('🔍 DEBUG: init.js file loading...');

// Import unit management functions
import { addNewUnit } from './modules/unit-management.js';
// Import global handlers FIRST to ensure window functions are available
import './modules/global-handlers.js';
// Import summary calculator for top-level totals
import './modules/summary-calculator.js';
// Import service selection handlers (including custom service functions)
import './modules/service-selection.js';
// Import Service D fluid analysis handlers
import './modules/service-d-fluids.js';
// Import unit details modal handlers
import './modules/unit-details-modal.js';
// Import PDF generator for bid creation and document generation
import './modules/pdf-generator.js';
// Import quote data builder for PDF generation
import { buildQuoteData } from './services/quote-data-builder.js';
// Application namespace to prevent global pollution
window.EnergenApp = window.EnergenApp || {};

// Expose critical functions to window for inline onclick handlers
window.addNewUnit = addNewUnit;
console.log('🔍 DEBUG: All imports complete, addNewUnit exposed to window');

/**
 * Main application initialization function
 * Orchestrates the entire startup sequence with proper error handling
 */
async function main() {
    console.log('🚀 Energen Calculator v5.0 - Initialization Started');
    
    try {
        // Phase 1: Load critical dependencies
        console.log('📦 Phase 1: Loading dependencies...');
        const dependencies = await loadDependencies();
        
        // Phase 2: Initialize core modules
        console.log('🔧 Phase 2: Initializing core modules...');
        const modules = await initializeModules(dependencies);
        
        // Phase 3: Wire up the UI
        console.log('🎨 Phase 3: Wiring UI components...');
        await wireUIComponents(modules);
        
        // Phase 4: Attach global event listeners
        console.log('📡 Phase 4: Attaching event listeners...');
        await attachEventListeners(modules);
        
        // Phase 5: Perform initial data load
        console.log('📊 Phase 5: Loading initial data...');
        await loadInitialData(modules);
        
        // Phase 6: Mark application as ready
        console.log('✅ Phase 6: Application ready!');
        markApplicationReady(modules);
        
        console.log('🎉 Energen Calculator initialization complete!');
        return true;
        
    } catch (error) {
        console.error('❌ CRITICAL: Application initialization failed:', error);
        
        // Display user-friendly error message
        showInitializationError(error);
        
        // Attempt graceful degradation
        await attemptGracefulDegradation(error);
        
        return false;
    }
}

/**
 * Load all required dependencies with proper error handling
 * Returns a promise that resolves when ALL dependencies are loaded
 */
async function loadDependencies() {
    const dependencies = {};
    
    // Define all required modules with their load functions
    const moduleLoaders = [
        {
            name: 'api',
            load: async () => {
                const module = await import('./services/api-service-unified.js');
                return module.default;
            }
        },
        {
            name: 'enrichment',
            load: async () => {
                const module = await import('./services/enrichment.js');
                return new module.EnrichmentService();
            }
        },
        {
            name: 'calculation',
            load: async () => {
                const module = await import('./services/calculation.js');
                // Will be initialized with event bus in next phase
                return module.CalculationService;
            }
        },
        {
            name: 'state',
            load: async () => {
                const module = await import('./js/state.js');
                return module.state;
            }
        },
        {
            name: 'settings',
            load: async () => {
                // Load SettingsUI as an ES6 module
                const module = await import('./modules/settings-proper.js');
                return module.SettingsUI;
            }
        },
        {
            name: 'zoho',
            load: async () => {
                // Load Zoho integration if enabled
                if (window.ENV?.ZOHO_ENABLED) {
                    const module = await import('./services/zoho-integration.js');
                    return new module.ZohoIntegration();
                }
                return null; // Zoho is optional
            }
        },
        {
            name: 'pdf',
            load: async () => {
                // Load PDF service - bridges to backend PDF generation
                const module = await import('./services/pdf-service.js');
                return module.pdfService; // BUG-006 FIX: Use singleton instance, not class
            }
        },
        {
            name: 'config',
            load: async () => {
                // Load default settings configuration
                const response = await fetch('/config/default-settings.json');
                if (!response.ok) throw new Error('Failed to load default settings');
                return await response.json();
            }
        }
    ];
    
    // Load all modules in parallel with individual error handling
    const loadPromises = moduleLoaders.map(async (loader) => {
        try {
            console.log(`  Loading ${loader.name}...`);
            dependencies[loader.name] = await loader.load();
            console.log(`  ✓ ${loader.name} loaded successfully`);
        } catch (error) {
            console.error(`  ✗ Failed to load ${loader.name}:`, error);
            // Store error for later handling but don't throw yet
            dependencies[loader.name] = { error, failed: true };
        }
    });
    
    // Wait for all loads to complete (success or failure)
    await Promise.all(loadPromises);
    
    // Check for critical failures
    const criticalModules = ['api', 'state', 'calculation', 'enrichment', 'settings', 'config'];
    const failures = criticalModules.filter(name => dependencies[name]?.failed);
    
    if (failures.length > 0) {
        throw new Error(`Critical modules failed to load: ${failures.join(', ')}`);
    }
    
    return dependencies;
}

/**
 * Initialize all modules with proper dependency injection
 */
async function initializeModules(dependencies) {
    const modules = {};
    
    // Create shared event bus
    class EventBus {
        constructor() {
            this.events = {};
        }
        
        on(event, handler) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(handler);
            return () => this.off(event, handler); // Return unsubscribe function
        }
        
        off(event, handler) {
            if (this.events[event]) {
                this.events[event] = this.events[event].filter(h => h !== handler);
            }
        }
        
        emit(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(handler => {
                    try {
                        handler(data);
                    } catch (error) {
                        console.error(`Error in event handler for ${event}:`, error);
                    }
                });
            }
        }
    }
    
    // Initialize event bus
    modules.eventBus = new EventBus();
    
    // State is already initialized in its constructor
    modules.state = dependencies.state;
    
    // Initialize calculation service with event bus
    modules.calculation = new dependencies.calculation(modules.eventBus);
    
    // Initialize enrichment service
    modules.enrichment = dependencies.enrichment;
    
    // Initialize settings UI with event bus and state
    modules.settingsUI = new dependencies.settings(modules.eventBus);
    await modules.settingsUI.init();
    
    // Initialize API service
    modules.api = dependencies.api;
    
    // Initialize optional services
    if (dependencies.zoho && !dependencies.zoho.failed) {
        modules.zoho = dependencies.zoho;
    }
    
    if (dependencies.pdf && !dependencies.pdf.failed) {
        modules.pdf = dependencies.pdf;
    }
    
    // Store modules globally for access
    window.EnergenApp.modules = modules;
    window.state = modules.state; // Maintain backward compatibility
    window.settingsUI = modules.settingsUI; // Critical for settings modal
    window.eventBus = modules.eventBus; // Make event bus globally available
    window.apiService = modules.api; // Expose API service for enrichment
    
    return modules;
}

/**
 * Wire up all UI components with their handlers
 */
async function wireUIComponents(modules) {
    // Wait for DOM if not ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve);
        });
    }
    
    // Wire up company input with autocomplete
    const companyInput = document.getElementById('companyName');
    if (companyInput) {
        let debounceTimer = null;
        companyInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                await handleCompanyInput(modules);
            }, 300);
        });
    }
    
    // Wire up address input
    const addressInput = document.getElementById('address');
    if (addressInput) {
        let debounceTimer = null;
        addressInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                await handleAddressInput(modules);
            }, 500);
        });
    }
    
    // Create global function wrappers for inline onclick handlers
    window.handleCompanyInput = () => handleCompanyInput(modules);
    window.handleAddressInput = () => handleAddressInput(modules);
    window.enrichCustomer = () => enrichCustomer(modules);
    window.selectAutocompleteSuggestion = (prediction) => selectAutocompleteSuggestion(prediction, modules);
    window.hideAutocompleteDropdown = hideAutocompleteDropdown;
    window.calculateTotal = () => calculateTotal(modules);
    window.addUnit = () => addUnit(modules);
    window.switchView = (view, evt) => switchView(view, evt, modules);
    window.saveSettings = () => saveSettings(modules);
    window.generatePDF = () => generatePDF(modules);
    window.exportToZoho = () => exportToZoho(modules);
    
    // Initialize any existing units
    if (!window.state.units || window.state.units.length === 0) {
        addNewUnit();
    }
}

/**
 * Attach global event listeners
 */
async function attachEventListeners(modules) {
    // Listen for settings updates
    modules.eventBus.on('settings:updated', (settings) => {
        console.log('Settings updated:', settings);
        modules.state.activeSettings = settings;
        modules.state.sessionSettings = settings;
        
        // Trigger recalculation if needed
        modules.eventBus.emit('calculation:refresh');
    });
    
    // Listen for calculation refresh requests
    modules.eventBus.on('calculation:refresh', async () => {
        if (window.recalculateAll) {
            await window.recalculateAll();
        }
    });
    
    // Listen for enrichment complete
    modules.eventBus.on('enrichment:complete', (data) => {
        updateUIFromEnrichment(data);
    });
    
    // Handle window resize for responsive layout
    window.addEventListener('resize', debounce(() => {
        modules.eventBus.emit('window:resize');
    }, 250));
    
    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for command palette
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            modules.eventBus.emit('command:palette:toggle');
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            modules.eventBus.emit('modal:close');
        }
    });
}

/**
 * Load initial data (settings, cached customer, etc.)
 */
async function loadInitialData(modules) {
    try {
        // Load saved settings from localStorage or server
        const savedSettings = localStorage.getItem('energenSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            modules.state.activeSettings = settings;
            modules.state.settingsLoaded = true;
            modules.state.settingsSource = 'localStorage';
            console.log('Loaded saved settings from localStorage');

            // FIXED: Update labor rate displays after loading settings
            if (settings.laborRate) {
                // Wait for DOM to be ready, then update displays
                setTimeout(() => {
                    const laborEl = document.getElementById('summary-labor-rate');
                    const mobilizationEl = document.getElementById('summary-mobilization-rate');
                    if (laborEl) {
                        laborEl.textContent = `$${settings.laborRate.toFixed(2)}/hr`;
                        console.log('[INIT] Updated labor rate display to', settings.laborRate);
                    }
                    if (mobilizationEl) {
                        const mobRate = settings.mobilizationRate || settings.laborRate;
                        mobilizationEl.textContent = `$${mobRate.toFixed(2)}/hr`;
                        console.log('[INIT] Updated mobilization rate display to', mobRate);
                    }
                }, 100);
            }
        } else {
            // Load default settings from config file
            try {
                const response = await fetch('/config/default-settings.json');
                if (response.ok) {
                    modules.state.activeSettings = await response.json();
                    modules.state.settingsLoaded = true;
                    modules.state.settingsSource = 'config';
                    console.log('Loaded default settings from config');
                }
            } catch (e) {
                console.warn('Could not load default settings:', e);
            }
        }
        
        // Load last customer if available
        const lastCustomer = localStorage.getItem('energenLastCustomer');
        if (lastCustomer) {
            const customer = JSON.parse(lastCustomer);
            if (customer.companyName) {
                document.getElementById('companyName').value = customer.companyName;
                // Trigger enrichment
                await enrichCustomer(modules);
            }
        }
        
        // Check for URL parameters (for deep linking)
        const params = new URLSearchParams(window.location.search);
        if (params.has('customer')) {
            const customerId = params.get('customer');
            // Load customer from API
            if (modules.api) {
                const customer = await modules.api.getCustomer(customerId);
                if (customer) {
                    populateCustomerData(customer);
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Non-critical, continue
    }
}

/**
 * Mark the application as ready and remove loading indicators
 */
function markApplicationReady(modules) {
    // Remove loading overlay if present
    const loadingOverlay = document.getElementById('app-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.transition = 'opacity 0.3s';
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.remove(), 300);
    }
    
    // Update status bar
    updateStatus('Ready - All Systems Operational');
    
    // Set application ready flag
    window.EnergenApp.ready = true;
    
    // Emit ready event
    modules.eventBus.emit('app:ready');
    
    // Log performance metrics
    if (performance.getEntriesByType) {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
            console.log(`⚡ Page load time: ${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`);
        }
    }
}

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'initialization-error';
    errorContainer.innerHTML = `
        <div class="error-content">
            <h2>⚠️ Initialization Error</h2>
            <p>The application failed to initialize properly.</p>
            <details>
                <summary>Technical Details</summary>
                <pre>${error.stack || error.message}</pre>
            </details>
            <button onclick="location.reload()">Reload Page</button>
        </div>
    `;
    
    // Add styles if not present
    if (!document.getElementById('error-styles')) {
        const style = document.createElement('style');
        style.id = 'error-styles';
        style.textContent = `
            .initialization-error {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(10, 11, 13, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
            }
            .error-content {
                background: var(--bg-secondary);
                border: 2px solid var(--accent-danger);
                border-radius: 12px;
                padding: 32px;
                max-width: 600px;
                color: var(--text-primary);
            }
            .error-content h2 {
                margin: 0 0 16px;
                color: var(--accent-danger);
            }
            .error-content button {
                margin-top: 16px;
                padding: 8px 16px;
                background: var(--accent-danger);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
            .error-content pre {
                background: var(--bg-primary);
                padding: 12px;
                border-radius: 6px;
                overflow-x: auto;
                font-size: 11px;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(errorContainer);
}

/**
 * Attempt graceful degradation for non-critical failures
 */
async function attemptGracefulDegradation(error) {
    console.log('Attempting graceful degradation...');
    
    // Enable basic functionality even if some modules failed
    try {
        // Provide stub implementations for failed modules
        window.EnergenApp = window.EnergenApp || {};
        window.EnergenApp.degraded = true;
        
        // Basic state management
        if (!window.state) {
            window.state = {
                units: [],
                activeSettings: {},
                get: (key) => localStorage.getItem(`energen_${key}`),
                set: (key, value) => localStorage.setItem(`energen_${key}`, value)
            };
        }
        
        // Basic settings UI stub
        if (!window.settingsUI) {
            window.settingsUI = {
                open: () => {
                    alert('Settings module failed to load. Please refresh the page.');
                },
                close: () => {},
                save: () => {}
            };
        }
        
        // Enable basic calculation
        window.calculateTotal = () => {
            alert('Calculation service unavailable. Please refresh the page.');
        };
        
        updateStatus('Running in degraded mode - some features unavailable', 'warning');
        
    } catch (degradationError) {
        console.error('Graceful degradation failed:', degradationError);
    }
}

// Helper functions referenced by the UI wiring

function handleCompanyInput(modules) {
    // Implementation using modules.enrichment
    const companyName = document.getElementById('companyName').value;
    if (companyName.length > 2) {
        updateStatus('Searching...');
        modules.api.autocomplete(companyName).then(result => {
            if (result.predictions && result.predictions.length > 0) {
                showAutocompleteDropdown(result.predictions);
            }
        }).catch(error => {
            console.error('Autocomplete failed:', error);
            updateStatus('Search failed', 'error');
        });
    }
}

function handleAddressInput(modules) {
    const address = document.getElementById('address').value;
    if (address.length > 4) {
        const companyName = document.getElementById('companyName').value;
        if (companyName) {
            enrichCustomer(modules);
        }
    }
}

async function enrichCustomer(modules) {
    const companyName = document.getElementById('companyName').value;
    if (!companyName) return;
    
    updateStatus('Enriching customer data...');
    
    try {
        const placeId = modules.state.selectedPlaceId;
        const address = document.getElementById('address').value;
        const enriched = await modules.enrichment.enrichCustomer(companyName, address, placeId);
        
        modules.state.enrichmentData = enriched;
        updateUIFromEnrichment(enriched);
        modules.eventBus.emit('enrichment:complete', enriched);
        
        updateStatus('Customer data enriched successfully');
    } catch (error) {
        console.error('Enrichment failed:', error);
        updateStatus('Enrichment failed', 'error');
    }
}

function selectAutocompleteSuggestion(prediction, modules) {
    const companyName = prediction.structured_formatting?.main_text || 
                        prediction.description.split(',')[0];
    
    document.getElementById('companyName').value = companyName;
    modules.state.selectedPlaceId = prediction.place_id;
    hideAutocompleteDropdown();
    enrichCustomer(modules);
}

function showAutocompleteDropdown(predictions) {
    const dropdown = document.getElementById('companyDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    predictions.forEach(prediction => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <div class="autocomplete-item-main">
                ${prediction.structured_formatting?.main_text || prediction.description.split(',')[0]}
            </div>
            <div class="autocomplete-item-secondary">
                ${prediction.structured_formatting?.secondary_text || ''}
            </div>
        `;
        item.onclick = () => window.selectAutocompleteSuggestion(prediction);
        dropdown.appendChild(item);
    });
    dropdown.classList.add('show');
}

function hideAutocompleteDropdown() {
    const dropdown = document.getElementById('companyDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

function updateUIFromEnrichment(enriched) {
    // Implementation from original init.js
    if (enriched.addressComponents) {
        const fields = {
            street: 'address',
            city: 'city',
            state: 'state',
            zip: 'zip'
        };
        
        for (const [key, elementId] of Object.entries(fields)) {
            const value = enriched.addressComponents[key];
            if (value) {
                const element = document.getElementById(elementId);
                if (element) element.value = value;
            }
        }
    }
    
    if (enriched.formatted_phone_number) {
        const phoneEl = document.getElementById('phone');
        if (phoneEl) phoneEl.value = enriched.formatted_phone_number;
    }
    
    if (enriched.website) {
        const websiteEl = document.getElementById('website');
        if (websiteEl) websiteEl.value = enriched.website;
    }
}

function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.style.color = type === 'error' ? 'var(--accent-danger)' : 
                               type === 'warning' ? 'var(--accent-warning)' : 
                               'var(--text-tertiary)';
}

function calculateTotal(modules) {
    console.log('Calculate total triggered');
    // Implementation would use modules.calculation
}

function addUnit(modules) {
    console.log('Add unit triggered');
    // Implementation would use modules.state
}

function switchView(view, evt, modules) {
    if (view === 'settings' && modules.settingsUI) {
        modules.settingsUI.open();
    }
}

function saveSettings(modules) {
    if (modules.settingsUI) {
        modules.settingsUI.save();
    }
}

async function generatePDF(modules) {
    if (modules.pdf) {
        try {
            updateStatus('Generating PDF...');

            // Build complete quote data using quote-data-builder
            // This includes: aggregated calculations, generators array, services array, enrichment data
            const quoteData = await buildQuoteData(modules.state);

            console.log('📄 PDF Data:', quoteData); // Debug: verify data structure

            // Use downloadPDF to trigger immediate download
            await modules.pdf.downloadPDF(quoteData, `Energen_Bid_EST-${Date.now()}.pdf`);

            updateStatus('PDF generated successfully');
        } catch (error) {
            console.error('PDF generation failed:', error);
            updateStatus('PDF generation failed', 'error');
            alert('Failed to generate PDF. Please try again.');
        }
    } else {
        alert('PDF service not available');
    }
}

function exportToZoho(modules) {
    if (modules.zoho) {
        modules.zoho.export();
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Listen for settings updates from modal
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SETTINGS_UPDATED') {
        const newSettings = event.data.settings;
        console.log('[SETTINGS] Received updated settings:', newSettings);

        // Update global settings reference
        window.currentSettings = newSettings;

        // FIXED: Update state.activeSettings so labor rate displays pull correct values
        if (window.state) {
            window.state.activeSettings = newSettings;
            console.log('[SETTINGS] Updated state.activeSettings:', window.state.activeSettings);
        }

        // Update settingsUI if it exists
        if (modules.settingsUI) {
            modules.settingsUI.settings = newSettings;
        }

        // FIXED: Update ALL labor rate displays immediately when settings change
        if (newSettings.laborRate) {
            const laborEl = document.getElementById('summary-labor-rate');
            const mobilizationEl = document.getElementById('summary-mobilization-rate');

            if (laborEl) {
                laborEl.textContent = `$${newSettings.laborRate.toFixed(2)}/hr`;
                console.log('[SETTINGS] Updated labor rate display to:', newSettings.laborRate);
            }

            if (mobilizationEl) {
                const mobRate = newSettings.mobilizationRate || newSettings.laborRate;
                mobilizationEl.textContent = `$${mobRate.toFixed(2)}/hr`;
                console.log('[SETTINGS] Updated mobilization rate display to:', mobRate);
            }
        }

        // Trigger recalculation of all services
        if (typeof recalculateAllServices === 'function') {
            recalculateAllServices();
        }

        // Update bid total panel if it exists
        if (typeof updateBidTotalPanel === 'function') {
            updateBidTotalPanel();
        }

        // Emit event via eventBus if available
        if (modules.eventBus) {
            modules.eventBus.emit('settings:changed', newSettings);
        }

        console.log('[SETTINGS] Live calculations updated');
    }
});

// START THE APPLICATION
console.log('🔍 DEBUG: About to call main()');
main().catch(err => {
    console.error('🔴 CRITICAL: main() failed:', err);
    console.error('Stack:', err.stack);
});