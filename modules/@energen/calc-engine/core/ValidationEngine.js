/**
 * @module ValidationEngine
 * @description Input validation for calculation payloads
 */

export class ValidationEngine {
    constructor() {
        this.version = '5.0.0';
        
        // Valid service codes
        this.validServiceCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        
        // Valid facility types
        this.validFacilityTypes = ['commercial', 'government', 'contract', 'non-contract'];
        
        // Valid injector types for diesel engines
        this.validInjectorTypes = ['pop', 'unit'];
    }
    
    /**
     * Validate complete calculation payload
     * @param {Object} payload - Input payload
     * @returns {Object} Validation result
     */
    validatePayload(payload) {
        const errors = [];
        
        // Check required fields
        if (!payload) {
            return { valid: false, errors: ['Payload is required'] };
        }
        
        // Validate generators
        if (!payload.generators || !Array.isArray(payload.generators)) {
            errors.push('Generators array is required');
        } else {
            payload.generators.forEach((gen, index) => {
                const genErrors = this.validateGenerator(gen);
                genErrors.forEach(err => errors.push(`Generator ${index}: ${err}`));
            });
        }
        
        // Validate services
        if (!payload.services || !Array.isArray(payload.services)) {
            errors.push('Services array is required');
        } else {
            payload.services.forEach(service => {
                if (!this.validServiceCodes.includes(service)) {
                    errors.push(`Invalid service code: ${service}`);
                }
            });
        }
        
        // Validate customer info if provided
        if (payload.customerInfo) {
            const customerErrors = this.validateCustomerInfo(payload.customerInfo);
            errors.push(...customerErrors);
        }
        
        // Validate contract length
        if (payload.contractLength && (payload.contractLength < 1 || payload.contractLength > 60)) {
            errors.push('Contract length must be between 1 and 60 months');
        }
        
        // Validate facility type
        if (payload.facilityType && !this.validFacilityTypes.includes(payload.facilityType)) {
            errors.push(`Invalid facility type: ${payload.facilityType}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate generator object
     * @param {Object} generator - Generator object
     * @returns {Array} Array of error messages
     */
    validateGenerator(generator) {
        const errors = [];
        
        if (!generator.kw || typeof generator.kw !== 'number') {
            errors.push('kW is required and must be a number');
        } else if (generator.kw < 2 || generator.kw > 2050) {
            errors.push('kW must be between 2 and 2050');
        }
        
        if (generator.quantity && (generator.quantity < 1 || generator.quantity > 100)) {
            errors.push('Quantity must be between 1 and 100');
        }
        
        if (generator.cylinders && (generator.cylinders < 1 || generator.cylinders > 20)) {
            errors.push('Cylinders must be between 1 and 20');
        }
        
        if (generator.injectorType && !this.validInjectorTypes.includes(generator.injectorType)) {
            errors.push(`Invalid injector type: ${generator.injectorType}`);
        }
        
        return errors;
    }
    
    /**
     * Validate customer info object
     * @param {Object} customerInfo - Customer information
     * @returns {Array} Array of error messages
     */
    validateCustomerInfo(customerInfo) {
        const errors = [];
        
        // Validate address components if provided
        if (customerInfo.zip) {
            const zipRegex = /^\d{5}(-\d{4})?$/;
            if (!zipRegex.test(customerInfo.zip)) {
                errors.push('Invalid ZIP code format');
            }
        }
        
        if (customerInfo.state) {
            const stateRegex = /^[A-Z]{2}$/;
            if (!stateRegex.test(customerInfo.state)) {
                errors.push('State must be 2-letter code (e.g., CA)');
            }
        }
        
        if (customerInfo.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerInfo.email)) {
                errors.push('Invalid email format');
            }
        }
        
        if (customerInfo.phone) {
            const phoneRegex = /^[\d\s\-\(\)\+\.]+$/;
            if (!phoneRegex.test(customerInfo.phone)) {
                errors.push('Invalid phone number format');
            }
        }
        
        return errors;
    }
    
    /**
     * Validate service code
     * @param {string} serviceCode - Service code to validate
     * @returns {boolean} True if valid
     */
    isValidServiceCode(serviceCode) {
        return this.validServiceCodes.includes(serviceCode);
    }
    
    /**
     * Validate kW value
     * @param {number} kw - kW value to validate
     * @returns {boolean} True if valid
     */
    isValidKw(kw) {
        return typeof kw === 'number' && kw >= 2 && kw <= 2050;
    }
    
    /**
     * Sanitize input payload (remove invalid fields)
     * @param {Object} payload - Input payload
     * @returns {Object} Sanitized payload
     */
    sanitizePayload(payload) {
        const sanitized = {};
        
        // Copy valid fields
        if (payload.customerInfo) {
            sanitized.customerInfo = this.sanitizeCustomerInfo(payload.customerInfo);
        }
        
        if (payload.generators) {
            sanitized.generators = payload.generators.map(gen => this.sanitizeGenerator(gen));
        }
        
        if (payload.services) {
            sanitized.services = payload.services.filter(s => this.isValidServiceCode(s));
        }
        
        sanitized.contractLength = Math.max(1, Math.min(60, payload.contractLength || 12));
        sanitized.facilityType = this.validFacilityTypes.includes(payload.facilityType) 
            ? payload.facilityType 
            : 'commercial';
        
        return sanitized;
    }
    
    /**
     * Sanitize generator object
     * @private
     */
    sanitizeGenerator(generator) {
        return {
            id: generator.id || undefined,
            kw: Math.max(2, Math.min(2050, Number(generator.kw) || 100)),
            quantity: Math.max(1, Math.min(100, Number(generator.quantity) || 1)),
            brand: String(generator.brand || '').substring(0, 100),
            model: String(generator.model || '').substring(0, 100),
            cylinders: generator.cylinders ? Math.max(1, Math.min(20, Number(generator.cylinders))) : undefined,
            injectorType: this.validInjectorTypes.includes(generator.injectorType) ? generator.injectorType : undefined
        };
    }
    
    /**
     * Sanitize customer info object
     * @private
     */
    sanitizeCustomerInfo(customerInfo) {
        return {
            companyName: String(customerInfo.companyName || '').substring(0, 200),
            address: String(customerInfo.address || '').substring(0, 200),
            city: String(customerInfo.city || '').substring(0, 100),
            state: String(customerInfo.state || '').toUpperCase().substring(0, 2),
            zip: String(customerInfo.zip || '').substring(0, 10),
            email: String(customerInfo.email || '').substring(0, 100),
            phone: String(customerInfo.phone || '').substring(0, 20)
        };
    }
}

export default ValidationEngine;