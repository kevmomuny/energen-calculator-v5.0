/**
 * Zoho Catalyst Configuration for Energen Calculator v4.5
 * Serverless backend integration
 */

const CATALYST_CONFIG = {
    // Catalyst Project Details
    project: {
        id: process.env.CATALYST_PROJECT_ID,
        name: 'energen-calculator',
        domain: process.env.CATALYST_DOMAIN || 'energen-calculator-60030959094.development.catalystserverless.com'
    },
    
    // Function URLs (deployed on Catalyst)
    functions: {
        baseUrl: process.env.CATALYST_BASE_URL || 'https://energen-calculator-60030959094.development.catalystserverless.com/server',
        endpoints: {
            // CRM Operations
            searchCustomer: '/zoho-crm-service/search',
            createLead: '/zoho-crm-service/lead/create',
            createQuote: '/zoho-crm-service/quote/create',
            updateContact: '/zoho-crm-service/contact/update',
            
            // Calculation Engine
            calculate: '/pricing-calculator/calculate',
            validateServices: '/pricing-calculator/validate',
            
            // PDF Generation
            generatePDF: '/pdf-generator/generate',
            getPDFStatus: '/pdf-generator/status',
            
            // Google Services
            searchBusiness: '/google-maps-service/search',
            calculateDistance: '/google-maps-service/distance',
            
            // Data Store Operations
            saveQuote: '/data-store/quote/save',
            getQuote: '/data-store/quote/get',
            listQuotes: '/data-store/quotes/list'
        }
    },
    
    // Catalyst Data Store Tables
    tables: {
        quotes: 'Quotes',
        customers: 'Customers',
        generators: 'Generators',
        services: 'Services',
        pricing: 'Pricing',
        configuration: 'Configuration',
        audit_log: 'AuditLog'
    },
    
    // Authentication (handled by Catalyst)
    auth: {
        type: 'catalyst-native',
        // No OAuth needed - Catalyst handles auth internally
        requiresOAuth: false,
        tokenEndpoint: '/oauth-handler/token'
    },
    
    // Environment Configuration
    environment: process.env.CATALYST_ENV || 'development',
    
    // Feature Flags
    features: {
        useCatalystDataStore: true,
        useCatalystFunctions: true,
        useServerlessBackend: true,
        enableDirectCRMAccess: true
    }
};

/**
 * Catalyst API Client
 */
class CatalystClient {
    constructor() {
        this.baseUrl = CATALYST_CONFIG.functions.baseUrl;
        this.endpoints = CATALYST_CONFIG.functions.endpoints;
    }
    
    /**
     * Make API call to Catalyst function
     */
    async callFunction(endpoint, data = {}, method = 'POST') {
        const url = `${this.baseUrl}${this.endpoints[endpoint]}`;
        
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Catalyst-Project': CATALYST_CONFIG.project.id
                },
                body: method !== 'GET' ? JSON.stringify(data) : undefined
            });
            
            if (!response.ok) {
                throw new Error(`Catalyst function error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Catalyst API Error (${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * Search for customer in Zoho CRM via Catalyst
     */
    async searchCustomer(searchTerm) {
        return this.callFunction('searchCustomer', { searchTerm });
    }
    
    /**
     * Generate PDF via Catalyst
     */
    async generatePDF(quoteData) {
        return this.callFunction('generatePDF', quoteData);
    }
    
    /**
     * Calculate pricing via Catalyst
     */
    async calculatePricing(params) {
        return this.callFunction('calculate', params);
    }
    
    /**
     * Save quote to Catalyst Data Store
     */
    async saveQuote(quoteData) {
        return this.callFunction('saveQuote', quoteData);
    }
    
    /**
     * Get distance calculation
     */
    async calculateDistance(origin, destination) {
        return this.callFunction('calculateDistance', { origin, destination });
    }
}

// Export for use in application
export { CATALYST_CONFIG, CatalystClient };

// Create singleton instance
export const catalystClient = new CatalystClient();

/**
 * Initialize Catalyst connection
 */
export async function initializeCatalyst() {
    try {
        // Test connection to Catalyst
        const response = await fetch(`${CATALYST_CONFIG.functions.baseUrl}/status`);
        const status = await response.json();
        
        if (status.status === 'ok') {
            console.log('   Functions available:', Object.keys(CATALYST_CONFIG.functions.endpoints).length);
            return true;
        }
    } catch (error) {
        console.error('❌ Catalyst connection failed:', error);
        return false;
    }
}

export default catalystClient;