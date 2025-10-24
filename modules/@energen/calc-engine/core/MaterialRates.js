/**
 * @module MaterialRates
 * @description Material costs and markup rates - Excel parity critical
 * Source: complete-calculation-engine.cjs (Aug 21, 2024)
 */

export class MaterialRates {
    constructor(settings = {}) {
        this.version = '5.0.0';

        // PHASE 3 FIX: Material costs SHOULD come from settings
        // Log warnings if using defaults
        if (!settings.oilCost && !settings.oilPricePerGallon) {
            console.warn('MaterialRates: Using default oil price - should come from settings modal');
        }
        if (!settings.coolantPrice && !settings.coolantPricePerGallon) {
            console.warn('MaterialRates: Using default coolant price - should come from settings modal');
        }

        // Base material costs - ALL IN GALLONS (not quarts!)
        this.materials = {
            oilPricePerGallon: settings.oilPricePerGallon || settings.oilCost || 16.00,  // From settings modal
            coolantPricePerGallon: settings.coolantPricePerGallon || settings.coolantPrice || 25.00, // From settings modal
            defPricePerGallon: settings.defPricePerGallon || settings.defPrice || 12.00  // From settings modal
        };

        // Markup rates from settings or Excel defaults
        this.markups = {
            parts: settings.partsMarkup || 1.2,           // 20% markup from settings
            oil: settings.oilMarkup || 1.5,               // 50% markup from settings
            coolant: settings.coolantMarkup || 1.5,       // 50% markup from settings
            freight: settings.freightRate || settings.freightMarkup || 0.05  // 5% freight from settings
        };

        // Convert freight percentage to multiplier if needed
        if (this.markups.freight < 1) {
            this.markups.freight = 1 + this.markups.freight; // Convert 0.05 to 1.05
        }

        // Validate all rates are positive
        this._validateRates();
    }
    
    /**
     * Get oil price per gallon
     */
    getOilPrice() {
        return this.materials.oilPricePerGallon;
    }
    
    /**
     * Get coolant price per gallon
     */
    getCoolantPrice() {
        return this.materials.coolantPricePerGallon;
    }
    
    /**
     * Get DEF price per gallon
     */
    getDefPrice() {
        return this.materials.defPricePerGallon;
    }
    
    /**
     * Get oil markup multiplier
     */
    getOilMarkup() {
        return this.markups.oil;
    }
    
    /**
     * Get coolant markup multiplier
     */
    getCoolantMarkup() {
        return this.markups.coolant;
    }
    
    /**
     * Get parts markup multiplier
     */
    getPartsMarkup() {
        return this.markups.parts;
    }
    
    /**
     * Get freight markup multiplier
     */
    getFreightMarkup() {
        return this.markups.freight;
    }
    
    /**
     * Calculate oil cost with markup
     * @param {number} gallons - Oil quantity in gallons
     * @returns {number} Total cost with markup
     */
    calculateOilCost(gallons) {
        return gallons * this.materials.oilPricePerGallon * this.markups.oil * this.markups.freight;
    }
    
    /**
     * Calculate coolant cost with markup
     * @param {number} gallons - Coolant quantity in gallons
     * @returns {number} Total cost with markup
     */
    calculateCoolantCost(gallons) {
        return gallons * this.materials.coolantPricePerGallon * this.markups.coolant * this.markups.freight;
    }
    
    /**
     * Calculate parts cost with markup
     * @param {number} baseCost - Base parts cost
     * @returns {number} Total cost with markup
     */
    calculatePartsCost(baseCost) {
        return baseCost * this.markups.parts * this.markups.freight;
    }
    
    /**
     * Convert quarts to gallons
     * Excel shows quarts but we bill in gallons
     * @param {number} quarts - Quantity in quarts
     * @returns {number} Quantity in gallons
     */
    quartsToGallons(quarts) {
        return quarts / 4;
    }
    
    /**
     * Get all rates as configuration object
     */
    getConfiguration() {
        return {
            materials: { ...this.materials },
            markups: { ...this.markups }
        };
    }
    
    /**
     * Validate all rates are positive numbers
     * @private
     */
    _validateRates() {
        // Check materials
        for (const [key, value] of Object.entries(this.materials)) {
            // BUG-031 FIX: Add isFinite() check to reject NaN (typeof NaN === 'number' is true)
            if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
                throw new Error(`Invalid material rate for ${key}: ${value}`);
            }
        }

        // Check markups (must be >= 1.0)
        for (const [key, value] of Object.entries(this.markups)) {
            // BUG-031 FIX: Add isFinite() check to reject NaN
            if (typeof value !== 'number' || !isFinite(value) || value < 1) {
                throw new Error(`Invalid markup rate for ${key}: ${value}`);
            }
        }
    }
}

export default MaterialRates;