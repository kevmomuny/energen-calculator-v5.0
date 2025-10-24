/**
 * Calculation Engine Module Wrapper
 * Provides modular interface for the Excel-parity calculation engine
 * @module @energen/calc-engine/module
 * @version 5.0.0
 */

import { EnergenModule } from '../../core/interfaces.js';
import { CalculationCore } from './core/CalculationCore.js';
import { ServiceDefinitions } from './core/ServiceDefinitions.js';
import { DualModeCalculationEngine } from './DualModeEngine.js';

/**
 * Calculation Engine Module
 */
export class CalculationEngineModule extends EnergenModule {
    constructor(config = {}) {
        super({
            name: 'calculation-engine',
            version: '5.0.0',
            ...config
        });
        
        this.calculationCore = new CalculationCore();
        this.calculationEngine = new DualModeCalculationEngine({
            useMontereyMode: true, // Default to Monterey engine for Excel parity
            autoDetectMode: true,
            ...config
        });
        this.cache = new Map();
        this.cacheEnabled = config.enableCache !== false;
        this.auditEnabled = config.enableAudit !== false;
    }

    /**
     * Initialize the module
     */
    async onInit(config) {
        this.logger.info('Calculation engine module initialized', {
            cacheEnabled: this.cacheEnabled,
            auditEnabled: this.auditEnabled
        });
        
        // Set up event listeners if event bus is available
        if (this.eventBus) {
            this.setupEventListeners();
        }
    }

    /**
     * Set up event listeners for calculation requests
     */
    setupEventListeners() {
        // Listen for calculation requests
        this.eventBus.on('calc:request', async (data) => {
            try {
                const result = await this.calculate(data);
                this.eventBus.emit('calc:complete', {
                    requestId: data.requestId,
                    result,
                    success: true
                });
            } catch (error) {
                this.eventBus.emit('calc:error', {
                    requestId: data.requestId,
                    error: error.message,
                    success: false
                });
            }
        });

        // Listen for customer updates
        this.eventBus.on('calculation:updateCustomer', (data) => {
            // Update cached calculations if needed
            if (this.cacheEnabled && data.customerId) {
                this.invalidateCache(data.customerId);
            }
        });
    }

    /**
     * Perform calculation with Excel parity
     */
    async calculate(params) {
        const {
            kw,
            services = [],
            serviceFrequencies = {}, // Accept custom frequencies
            serviceOptions = {}, // Accept service options like battery replacement
            distance = 0,
            unitCount = 1,
            address,
            city,
            state,
            zip,
            contractYears = 1,
            taxRate
        } = params;

        // Check cache if enabled
        const cacheKey = this.getCacheKey(params);
        if (this.cacheEnabled && this.cache.has(cacheKey)) {
            this.logger.debug('Returning cached calculation', { cacheKey });
            return this.cache.get(cacheKey);
        }

        // Convert to engine format and calculate
        const enginePayload = {
            generators: [{ kw, quantity: unitCount || 1 }],
            services,
            serviceFrequencies, // Pass custom frequencies
            serviceOptions, // Pass service options
            contractLength: contractYears * 12,
            customerInfo: {
                distance,
                taxRate: taxRate || 0.1025
            }
        };
        
        // Use the actual calculation engine
        const result = await this.calculationEngine.calculate(enginePayload);

        // Add audit trail if enabled
        if (this.auditEnabled) {
            this.audit('calculation', {
                params,
                result,
                timestamp: new Date().toISOString()
            });
        }

        // Cache result if enabled
        if (this.cacheEnabled) {
            this.cache.set(cacheKey, result);
            
            // Set cache expiry (5 minutes)
            setTimeout(() => {
                this.cache.delete(cacheKey);
            }, 5 * 60 * 1000);
        }

        // Emit calculation complete event
        if (this.eventBus) {
            this.eventBus.emit('calc:processing', { status: 'complete', result });
        }

        return result;
    }

    /**
     * Get service definitions
     */
    getServiceDefinitions() {
        return ServiceDefinitions;
    }

    /**
     * Get service details by code
     */
    getServiceDetails(serviceCode) {
        return ServiceDefinitions.getServiceDetails(serviceCode);
    }

    /**
     * Calculate single service cost
     */
    calculateService(serviceCode, kw, unitCount = 1) {
        return this.calculationCore.calculateServiceCost(
            serviceCode,
            kw,
            unitCount
        );
    }
    
    /**
     * Calculate individual service price for UI display
     * @param {string} serviceCode - Service code (A-F)
     * @param {number} kw - Generator KW rating
     * @param {number} frequency - Annual frequency
     * @returns {Object} Service pricing details
     */
    calculateServicePrice(serviceCode, kw, frequency = 1) {
        // Use the DualMode engine's calculateServicePrice method
        if (this.calculationEngine && this.calculationEngine.calculateServicePrice) {
            return this.calculationEngine.calculateServicePrice(serviceCode, kw, frequency);
        }
        
        // Fallback calculation
        const basePrice = 1000;
        return {
            serviceCode,
            description: `Service ${serviceCode}`,
            annual: basePrice * frequency,
            monthly: Math.round((basePrice * frequency) / 12),
            perInstance: basePrice,
            frequency
        };
    }

    /**
     * Generate cache key from parameters
     */
    getCacheKey(params) {
        const { kw, services, distance, unitCount, contractYears, taxRate } = params;
        return `${kw}-${services.sort().join(',')}-${distance}-${unitCount}-${contractYears}-${taxRate}`;
    }

    /**
     * Invalidate cache for a customer
     */
    invalidateCache(customerId) {
        // In a real implementation, we'd track which cache entries
        // belong to which customer
        this.logger.debug('Cache invalidated for customer', { customerId });
    }

    /**
     * Run health checks
     */
    async runHealthChecks() {
        const health = {
            status: 'healthy',
            checks: {}
        };

        try {
            // Test calculation
            const testResult = this.calculate({
                kw: 100,
                services: ['A'],
                distance: 10,
                unitCount: 1
            });

            if (testResult && testResult.success) {
                health.checks.calculation = { status: 'pass' };
            } else {
                health.checks.calculation = { status: 'fail', error: 'Calculation failed' };
                health.status = 'degraded';
            }
        } catch (error) {
            health.checks.calculation = { status: 'fail', error: error.message };
            health.status = 'unhealthy';
        }

        // Check cache status
        if (this.cacheEnabled) {
            health.checks.cache = {
                status: 'pass',
                entries: this.cache.size
            };
        }

        return health;
    }

    /**
     * Handle configuration changes
     */
    async onConfigChange(newConfig) {
        if (newConfig.enableCache !== undefined) {
            this.cacheEnabled = newConfig.enableCache;
            if (!this.cacheEnabled) {
                this.cache.clear();
            }
        }

        if (newConfig.enableAudit !== undefined) {
            this.auditEnabled = newConfig.enableAudit;
        }

        this.logger.info('Configuration updated', {
            cacheEnabled: this.cacheEnabled,
            auditEnabled: this.auditEnabled
        });
    }

    /**
     * Clean up on shutdown
     */
    async onShutdown() {
        this.cache.clear();
        this.logger.info('Calculation engine module shut down');
    }
}

export default CalculationEngineModule;