/**
 * Energen Client Module
 * Frontend integration for the modular backend
 * @version 5.0.0
 */

export class EnergenClient {
    constructor(config = {}) {
        this.baseURL = config.baseURL || 'http://localhost:3002';
        this.headers = {
            'Content-Type': 'application/json',
            ...config.headers
        };
        
        // Module instances
        this.calculation = new CalculationClient(this);
        this.customer = new CustomerClient(this);
        this.distance = new DistanceClient(this);
        this.tax = new TaxClient(this);
        this.pdf = new PDFClient(this);
        this.zoho = new ZohoClient(this);
        
        // State management
        this.state = {
            currentQuote: null,
            customer: null,
            calculation: null,
            lastSync: null
        };
        
        // Event emitter for UI updates
        this.listeners = new Map();
    }
    
    /**
     * Make API request
     */
    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: this.headers
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`[EnergenClient] ${method} ${endpoint} failed:`, error);
            throw error;
        }
    }
    
    /**
     * Event handling
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    }
    
    /**
     * Generate complete quote
     */
    async generateQuote(payload) {
        this.emit('quote:generating', payload);
        
        try {
            const result = await this.request('POST', '/api/generate-quote', payload);
            
            this.state.currentQuote = result;
            this.state.customer = result.customer;
            this.state.calculation = result.calculation;
            
            this.emit('quote:generated', result);
            
            return result;
            
        } catch (error) {
            this.emit('quote:error', error);
            throw error;
        }
    }
    
    /**
     * Get service status
     */
    async getStatus() {
        return this.request('GET', '/api/services/status');
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        return this.request('GET', '/health');
    }
}

/**
 * Calculation Module Client
 */
class CalculationClient {
    constructor(client) {
        this.client = client;
    }
    
    async calculate(payload) {
        const result = await this.client.request('POST', '/api/calculate', payload);
        this.client.state.calculation = result.calculation;
        this.client.emit('calculation:complete', result);
        return result;
    }
    
    async batchCalculate(payloads) {
        return this.client.request('POST', '/api/batch/calculate', { payloads });
    }
}

/**
 * Customer Module Client
 */
class CustomerClient {
    constructor(client) {
        this.client = client;
    }
    
    async search(companyName) {
        const result = await this.client.request('POST', '/api/enrichment/google-places', {
            companyName
        });
        
        if (result.success && result.data) {
            this.client.state.customer = result.data;
            this.client.emit('customer:found', result.data);
        }
        
        return result;
    }
    
    async enrichWithGoogle(companyName, address) {
        return this.client.request('POST', '/api/enrichment/google-places', {
            companyName,
            address
        });
    }
    
    async getLogo(companyName, website) {
        return this.client.request('POST', '/api/enrichment/logo', {
            companyName,
            website
        });
    }
    
    async getLogoVariations(companyName, website) {
        return this.client.request('POST', '/api/enrichment/logo-variations', {
            companyName,
            website
        });
    }
}

/**
 * Distance Module Client
 */
class DistanceClient {
    constructor(client) {
        this.client = client;
    }
    
    async calculate(address) {
        const result = await this.client.request('POST', '/api/enrichment/distance', address);
        this.client.emit('distance:calculated', result);
        return result;
    }
    
    async batchCalculate(addresses) {
        return this.client.request('POST', '/api/batch/distances', { addresses });
    }
}

/**
 * Tax Module Client
 */
class TaxClient {
    constructor(client) {
        this.client = client;
    }
    
    async getRate(address) {
        const result = await this.client.request('POST', '/api/enrichment/tax-rate', address);
        this.client.emit('tax:calculated', result);
        return result;
    }
}

/**
 * PDF Module Client
 */
class PDFClient {
    constructor(client) {
        this.client = client;
    }
    
    async generate(quoteData, calculation) {
        const result = await this.client.request('POST', '/api/generate-pdf', {
            quoteData,
            calculation
        });
        
        this.client.emit('pdf:generated', result);
        return result;
    }
    
    async download(fileName) {
        window.open(`${this.client.baseURL}/pdfs/${fileName}`, '_blank');
    }
}

/**
 * Zoho Module Client
 */
class ZohoClient {
    constructor(client) {
        this.client = client;
    }
    
    async searchCustomer(companyName) {
        return this.client.request('POST', '/api/zoho/search-customer', {
            companyName
        });
    }
    
    async createQuote(quoteData) {
        const result = await this.client.request('POST', '/api/zoho/create-quote', quoteData);
        
        if (result.success) {
            this.client.state.lastSync = new Date();
            this.client.emit('zoho:synced', result);
        }
        
        return result;
    }
    
    async convertToContract(quoteId) {
        return this.client.request('POST', '/api/zoho/convert-to-contract', {
            quoteId
        });
    }
    
    async scheduleWorkOrders(contractId, scheduleData) {
        return this.client.request('POST', '/api/zoho/schedule-work-orders', {
            contractId,
            scheduleData
        });
    }
}

/**
 * UI Helper Functions
 */
export class EnergenUI {
    constructor(client) {
        this.client = client;
        this.elements = {};
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        // Cache DOM elements
        this.elements = {
            // Customer fields
            companyName: document.getElementById('companyName'),
            phone: document.getElementById('phone'),
            website: document.getElementById('website'),
            address: document.getElementById('address'),
            city: document.getElementById('city'),
            state: document.getElementById('state'),
            zip: document.getElementById('zip'),
            companyLogo: document.getElementById('companyLogo'),
            
            // Generator fields
            kw: document.getElementById('kw'),
            unitCount: document.getElementById('unitCount'),
            
            // Service checkboxes
            services: {
                A: document.getElementById('serviceA'),
                B: document.getElementById('serviceB'),
                C: document.getElementById('serviceC'),
                D: document.getElementById('serviceD'),
                E: document.getElementById('serviceE'),
                F: document.getElementById('serviceF'),
                G: document.getElementById('serviceG'),
                H: document.getElementById('serviceH'),
                I: document.getElementById('serviceI'),
                J: document.getElementById('serviceJ')
            },
            
            // Results
            distance: document.getElementById('distance'),
            taxRate: document.getElementById('taxRate'),
            totalDisplay: document.getElementById('totalDisplay'),
            
            // Status
            connectionStatus: document.getElementById('connection-status')
        };
    }
    
    attachEventListeners() {
        // Listen to client events
        this.client.on('customer:found', (customer) => {
            this.populateCustomerFields(customer);
        });
        
        this.client.on('calculation:complete', (result) => {
            this.updateCalculationDisplay(result);
        });
        
        this.client.on('distance:calculated', (result) => {
            if (this.elements.distance) {
                this.elements.distance.value = result.distance || 50;
            }
        });
        
        this.client.on('tax:calculated', (result) => {
            if (this.elements.taxRate) {
                this.elements.taxRate.value = (result.rate * 100).toFixed(2) + '%';
            }
        });
        
        this.client.on('pdf:generated', (result) => {
            this.showNotification('PDF generated successfully', 'success');
        });
        
        this.client.on('zoho:synced', (result) => {
            this.showNotification('Synced with Zoho CRM', 'success');
        });
    }
    
    populateCustomerFields(customer) {
        if (customer.companyName) this.elements.companyName.value = customer.companyName;
        if (customer.phone) this.elements.phone.value = customer.phone;
        if (customer.website) this.elements.website.value = customer.website;
        if (customer.address) this.elements.address.value = customer.address;
        if (customer.city) this.elements.city.value = customer.city;
        if (customer.state) this.elements.state.value = customer.state;
        if (customer.zip) this.elements.zip.value = customer.zip;
        
        if (customer.logo) {
            this.elements.companyLogo.src = customer.logo;
        }
    }
    
    updateCalculationDisplay(result) {
        if (this.elements.totalDisplay) {
            this.elements.totalDisplay.textContent = `$${result.calculation?.total || '0.00'}`;
        }
        
        // Update other displays as needed
        const displays = {
            'laborTotal': result.calculation?.laborTotal,
            'partsTotal': result.calculation?.partsTotal,
            'travelTotal': result.calculation?.travelTotal,
            'subtotal': result.calculation?.subtotal,
            'tax': result.calculation?.tax,
            'annual': result.calculation?.annual,
            'monthly': result.calculation?.monthly,
            'quarterly': result.calculation?.quarterly
        };
        
        for (const [id, value] of Object.entries(displays)) {
            const element = document.getElementById(id);
            if (element && value !== undefined) {
                element.textContent = typeof value === 'number' 
                    ? `$${value.toFixed(2)}`
                    : value;
            }
        }
    }
    
    getFormData() {
        // Collect all form data
        const services = [];
        for (const [code, checkbox] of Object.entries(this.elements.services)) {
            if (checkbox?.checked) {
                services.push(code);
            }
        }
        
        return {
            customerInfo: {
                companyName: this.elements.companyName?.value,
                phone: this.elements.phone?.value,
                website: this.elements.website?.value,
                address: this.elements.address?.value,
                city: this.elements.city?.value,
                state: this.elements.state?.value,
                zip: this.elements.zip?.value
            },
            generators: [{
                kw: parseInt(this.elements.kw?.value) || 100,
                quantity: parseInt(this.elements.unitCount?.value) || 1
            }],
            services,
            contractLength: 12, // Default or from UI
            distance: parseFloat(this.elements.distance?.value),
            syncToZoho: false // Or from UI toggle
        };
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    async handleCalculate() {
        const data = this.getFormData();
        
        try {
            this.showNotification('Calculating...', 'info');
            const result = await this.client.calculation.calculate(data);
            this.showNotification('Calculation complete', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async handleGenerateQuote() {
        const data = this.getFormData();
        
        try {
            this.showNotification('Generating quote...', 'info');
            const result = await this.client.generateQuote(data);
            this.showNotification(`Quote ${result.quoteNumber} generated`, 'success');
            
            // Auto-download PDF if generated
            if (result.pdf?.fileName) {
                this.client.pdf.download(result.pdf.fileName);
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.EnergenClient = EnergenClient;
    window.EnergenUI = EnergenUI;
    
    // Create global instance
    window.addEventListener('DOMContentLoaded', () => {
        window.energenClient = new EnergenClient();
        window.energenUI = new EnergenUI(window.energenClient);

    });
}

export default EnergenClient;