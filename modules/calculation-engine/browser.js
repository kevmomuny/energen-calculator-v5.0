/**
 * Browser-compatible Calculation Engine
 * Energen Calculator v4.5
 */

import { CalculationCore } from '../@energen/calc-engine/core/CalculationCore.js';
import ServiceDefinitions from '../@energen/calc-engine/core/ServiceDefinitions.js';

class BrowserCalculationEngine {
    constructor() {
        this.engine = new CalculationCore();
        this.services = ServiceDefinitions;
    }
    
    /**
     * Calculate service costs
     */
    async calculate(params) {
        const { kw, services, distance = 50, unitCount = 1, taxRate = 0.1025 } = params;
        
        // Build calculation request
        const request = {
            customerInfo: {
                distance: distance
            },
            generators: [{
                kw: kw,
                quantity: unitCount
            }],
            services: services,
            taxRate: taxRate
        };
        
        // Run calculation
        return this.engine.calculate(request);
    }
    
    /**
     * Get service definitions
     */
    getServices() {
        return this.services.getServices();
    }
    
    /**
     * Get service by code
     */
    getService(code) {
        return this.services.getService(code);
    }
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.EnergenCalculation = new BrowserCalculationEngine();
}

export default BrowserCalculationEngine;