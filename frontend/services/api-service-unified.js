/**
 * Unified API Service Module for Energen Calculator v5.0
 * Consolidates all API functionality from api.js, api-service.js, and api-modules.js
 * Provides a single, authoritative interface for all backend communications
 * @version 5.0.0-unified
 */

// Dynamic API base URL - works in both dev and production
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:3002'
    : window.location.origin;

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default
const cache = new Map();

/**
 * Cache manager for expensive API calls
 */
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = CACHE_TTL;
    }

    async getCached(key, fetcher, ttl = this.defaultTTL) {
        if (this.cache.has(key)) {
            const { data, timestamp } = this.cache.get(key);
            if (Date.now() - timestamp < ttl) {
                return data;
            }
        }

        const data = await fetcher();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    clear() {
        this.cache.clear();
    }
}

/**
 * Base API Service with generic HTTP methods
 */
class BaseAPIService {
    constructor() {
        this.baseUrl = API_BASE;
        this.cache = new CacheManager();
    }

    /**
     * Generic request method with comprehensive error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = new Error(errorData.error || `API call failed: ${response.status} ${response.statusText}`);
                error.status = response.status;
                error.statusText = response.statusText;
                error.endpoint = endpoint;
                error.method = options.method || 'GET';
                error.details = errorData;
                throw error;
            }

            return await response.json();
        } catch (error) {
            window.logError?.('api', `API Error (${endpoint})`, error);
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

/**
 * Calculation Engine Module
 * Handles all pricing and service calculations
 */
class CalculationEngine extends BaseAPIService {
    constructor() {
        super();
        this.endpoint = '/api/calculate-complete';
        this.servicePriceEndpoint = '/api/service-price';
    }

    async calculate(data) {
        try {
            // CRITICAL FIX: Use actual active settings from state, not undefined window.calculatorSettings
            const activeSettings = data.settings || window.state?.activeSettings || window.calculatorSettings || {};

            console.log('[API] calculate using settings:', {
                laborRate: activeSettings.laborRate,
                mobilizationRate: activeSettings.mobilizationRate,
                coolantPrice: activeSettings.coolantPrice,
                oilPrice: activeSettings.oilPrice
            });

            const result = await this.post(this.endpoint, {
                kw: data.kw,
                services: data.services || [],
                distance: data.distance || 0,
                settings: activeSettings,
                serviceFrequencies: data.serviceFrequencies || {},
                serviceDFluids: data.serviceDFluids || null,
                customServices: data.customServices || {},
                atsUnits: data.atsUnits || [{ id: 1, includeMobilization: false }]  // ATS units for Service I
            });

            if (!result.success) {
                throw new Error('Invalid calculation response');
            }

            // /api/calculate-complete returns { success, previewPrices, priceData }
            const priceData = result.priceData || {};

            return {
                laborCost: priceData.laborCost || 0,
                materialsCost: priceData.materialsCost || 0,
                mobilizationCost: priceData.mobilizationCost || 0,
                mobilizationSavings: priceData.mobilizationSavings || 0,
                subtotal: priceData.subtotal || 0,
                tax: priceData.tax || 0,
                total: priceData.total || 0,
                breakdown: priceData.serviceBreakdown || [],
                previewPrices: result.previewPrices || []
            };
        } catch (error) {
            window.logError?.('api', 'Calculation failed', error);
            throw error;
        }
    }

    async calculateServicePrice(data) {
        try {
            // CRITICAL FIX: Use actual active settings from state, not undefined window.calculatorSettings
            const activeSettings = data.settings || window.state?.activeSettings || window.calculatorSettings || {};

            console.log('[API] calculateServicePrice using settings:', {
                laborRate: activeSettings.laborRate,
                mobilizationRate: activeSettings.mobilizationRate,
                coolantPrice: activeSettings.coolantPrice,
                oilPrice: activeSettings.oilPrice
            });

            const result = await this.post(this.servicePriceEndpoint, {
                serviceCode: data.serviceCode,
                kw: data.kw,
                frequency: data.frequency || 1,
                settings: activeSettings,
                customData: data.customData || {}
            });

            return result;
        } catch (error) {
            console.error('Service price calculation failed:', error);

            // Fallback calculation
            const basePrices = {
                'A': 1000 + (data.kw * 14.5),
                'B': 800 + (data.kw * 10.5),
                'C': 600 + (data.kw * 10.5),
                'D': 300 + (data.kw * 1.5),
                'E': 2000 + (data.kw * 12.5),
                'F': 1500 + (data.kw * 13.5)
            };

            const base = basePrices[data.serviceCode] || 1000;
            const freqMultiplier = { 4: 1.0, 2: 0.9, 1: 0.85 };
            const annual = Math.round(base * (freqMultiplier[data.frequency] || 1));

            return {
                serviceCode: data.serviceCode,
                description: `Service ${data.serviceCode}`,
                annual,
                monthly: Math.round(annual / 12),
                perInstance: base,
                frequency: data.frequency
            };
        }
    }
}

/**
 * Enrichment Service Module
 * Handles data enrichment from various sources
 */
class EnrichmentService extends BaseAPIService {
    constructor() {
        super();
        this.baseEndpoint = '/api/enrichment';
    }

    async autocomplete(input) {
        if (!input || input.length < 3) return { predictions: [] };

        try {
            // Use dual-source autocomplete (Zoho CRM + Google Places)
            const result = await this.get(`/api/enrichment/dual-search?q=${encodeURIComponent(input)}&limit=10`);
            return result;
        } catch (error) {
            window.logError?.('api', 'Autocomplete failed', error);
            return { predictions: [] };
        }
    }

    async enrichCustomer(companyName, address, placeId = null) {
        if (!companyName) throw new Error('Company name is required');

        try {
            const result = await this.post(`${this.baseEndpoint}/google-places`, {
                companyName,
                address: address || '',
                placeId,
                query: companyName
            });

            if (!result.success) {
                throw new Error(result.error || 'Enrichment failed');
            }

            return result.data;
        } catch (error) {
            window.logError?.('api', 'Customer enrichment failed', error);
            // Return minimal data on failure
            return {
                name: companyName,
                formatted_address: address || '',
                types: ['business'],
                no_enrichment: true
            };
        }
    }

    async getCompanyLogo(companyName, website) {
        const cacheKey = `logo:${companyName}:${website}`;

        return this.cache.getCached(cacheKey, async () => {
            try {
                const result = await this.post(`${this.baseEndpoint}/logo`, {
                    companyName,
                    domain: website
                });
                return result.logoUrl || null;
            } catch (error) {
                window.logError?.('api', 'Logo fetch failed', error);
                return null;
            }
        });
    }

    async getTaxRate(address, city, zip, state = 'CA') {
        const cacheKey = `tax:${zip || city}`;

        return this.cache.getCached(cacheKey, async () => {
            try {
                const result = await this.post(`${this.baseEndpoint}/tax-rate`, {
                    address,
                    city,
                    zip,
                    state
                });
                return result.taxRate || 0.1025;
            } catch (error) {
                window.logError?.('api', 'Tax rate fetch failed', error);
                return 0.1025; // Default CA tax rate
            }
        }, 24 * 60 * 60 * 1000); // Cache for 24 hours
    }

    async calculateDistance(origin, destination) {
        if (!origin || !destination) throw new Error('Origin and destination required');

        const cacheKey = `distance:${origin}:${destination}`;

        return this.cache.getCached(cacheKey, async () => {
            try {
                const result = await this.post(`/api/enrichment/distance`, {
                    origin,
                    destination
                });

                if (typeof result.distance !== 'number') {
                    throw new Error('Invalid distance returned');
                }

                return result.distance;
            } catch (error) {
                window.logError?.('api', 'Distance calculation failed', error);
                throw error;
            }
        }, 60 * 60 * 1000); // Cache for 1 hour
    }
}

/**
 * PDF Generator Module
 * Handles professional PDF generation
 */
class PDFGenerator extends BaseAPIService {
    constructor() {
        super();
        this.endpoint = '/api/generate-pdf';
    }

    async generate(quoteData) {
        try {
            window.updateStatus?.('Generating PDF...');

            const result = await this.post(this.endpoint, quoteData);

            if (!result.success) {
                throw new Error(result.error || 'PDF generation failed');
            }

            window.updateStatus?.('PDF generated successfully');
            window.showNotification?.(`PDF created: ${result.filename}`, 'success');

            // Auto-download if URL provided
            if (result.url) {
                const link = document.createElement('a');
                link.href = `${this.baseUrl}${result.url}`;
                link.download = result.filename;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            return result;
        } catch (error) {
            window.logError?.('api', 'PDF generation failed', error);
            throw error;
        }
    }
}

/**
 * Zoho CRM Integration Module
 * Handles CRM synchronization and customer management
 */
class ZohoIntegration extends BaseAPIService {
    constructor() {
        super();
        this.baseEndpoint = '/api/zoho';
    }

    async searchCustomer(companyName) {
        try {
            const result = await this.post(`${this.baseEndpoint}/search-customer`, { companyName });

            if (!result.success || !result.customer) {
                return null;
            }

            return result.customer;
        } catch (error) {
            window.logError?.('api', 'Zoho search failed', error);
            return null; // Don't break flow if Zoho is down
        }
    }

    async syncQuote(quoteData) {
        try {
            window.updateStatus?.('Syncing with Zoho CRM...');

            const result = await this.post(`${this.baseEndpoint}/create-quote`, quoteData);

            if (!result.success) {
                throw new Error(result.error || 'Zoho sync failed');
            }

            const syncTime = new Date().toLocaleTimeString();
            const syncElement = document.getElementById('last-sync');
            if (syncElement) {
                syncElement.textContent = syncTime;
            }

            window.updateStatus?.('Zoho sync complete');
            window.showNotification?.('Quote synced to Zoho CRM', 'success');

            return result;
        } catch (error) {
            window.logError?.('api', 'Zoho sync failed', error);
            throw error;
        }
    }

    async createContact(contactData) {
        try {
            const result = await this.post(`${this.baseEndpoint}/contacts`, contactData);
            return result;
        } catch (error) {
            window.logError?.('api', 'Contact creation failed', error);
            throw error;
        }
    }
}

/**
 * Settings Management Module
 * Handles application settings
 */
class SettingsService extends BaseAPIService {
    constructor() {
        super();
        this.endpoint = '/api/settings';
    }

    async getSettings() {
        try {
            return await this.get(this.endpoint);
        } catch (error) {
            window.logError?.('api', 'Failed to fetch settings', error);
            return {};
        }
    }

    async saveSettings(settings) {
        try {
            return await this.post(this.endpoint, settings);
        } catch (error) {
            window.logError?.('api', 'Failed to save settings', error);
            throw error;
        }
    }
}

/**
 * Quote Management Module
 * Handles quote persistence
 */
class QuoteService extends BaseAPIService {
    constructor() {
        super();
        this.endpoint = '/api/save-quote';
    }

    async saveQuote(quoteData) {
        try {
            return await this.post(this.endpoint, quoteData);
        } catch (error) {
            window.logError?.('api', 'Failed to save quote', error);
            throw error;
        }
    }
}

/**
 * Unified API Service Factory
 * Creates and manages all API modules
 */
class UnifiedAPIService {
    constructor() {
        // Initialize all service modules
        this.calculation = new CalculationEngine();
        this.enrichment = new EnrichmentService();
        this.pdf = new PDFGenerator();
        this.zoho = new ZohoIntegration();
        this.settings = new SettingsService();
        this.quote = new QuoteService();

        // Base service for generic requests
        this.base = new BaseAPIService();

        // Shared cache manager
        this.cache = new CacheManager();

        // Test connectivity on initialization
        this.testConnectivity();
    }

    async testConnectivity() {
        try {
            const healthCheck = await fetch(`${API_BASE}/health`);
            if (!healthCheck.ok) {
                console.warn('⚠️ API server may be unavailable');
            }
        } catch (error) {
            console.error('❌ API connection failed:', error);
        }
    }

    // Convenience methods that delegate to appropriate modules

    // Calculation methods
    async calculate(data) {
        return this.calculation.calculate(data);
    }

    async calculateServicePrice(data) {
        return this.calculation.calculateServicePrice(data);
    }

    // Enrichment methods
    async autocomplete(input) {
        return this.enrichment.autocomplete(input);
    }

    async enrichCustomer(companyName, address, placeId) {
        return this.enrichment.enrichCustomer(companyName, address, placeId);
    }

    async getCompanyLogo(companyName, website) {
        return this.enrichment.getCompanyLogo(companyName, website);
    }

    async getTaxRate(address, city, zip, state) {
        return this.enrichment.getTaxRate(address, city, zip, state);
    }

    async calculateDistance(origin, destination) {
        return this.enrichment.calculateDistance(origin, destination);
    }

    // PDF methods
    async generatePDF(quoteData) {
        return this.pdf.generate(quoteData);
    }

    // Zoho methods
    async searchZohoCustomer(companyName) {
        return this.zoho.searchCustomer(companyName);
    }

    async syncToZoho(quoteData) {
        return this.zoho.syncQuote(quoteData);
    }

    async createZohoContact(contactData) {
        return this.zoho.createContact(contactData);
    }

    // Settings methods
    async getSettings() {
        return this.settings.getSettings();
    }

    async saveSettings(settings) {
        return this.settings.saveSettings(settings);
    }

    // Quote methods
    async saveQuote(quoteData) {
        return this.quote.saveQuote(quoteData);
    }

    // Health check
    async healthCheck() {
        return this.base.get('/health');
    }

    // Cache management
    clearCache() {
        this.cache.clear();
        this.enrichment.cache.clear();
    }
}

// Create singleton instance
const unifiedAPI = new UnifiedAPIService();

// Export for ES6 modules
export default unifiedAPI;
export { UnifiedAPIService };

// Also export as named export for compatibility with api.js pattern
export const api = unifiedAPI;

// Make available globally for debugging (compatibility with api.js)
window.apiService = unifiedAPI;

// Export individual service classes for advanced usage
export {
    BaseAPIService,
    CalculationEngine,
    EnrichmentService,
    PDFGenerator,
    ZohoIntegration,
    SettingsService,
    QuoteService,
    CacheManager
};