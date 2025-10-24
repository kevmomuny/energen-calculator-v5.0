/**
 * Mobilization Settings Service
 *
 * Manages mobilization stacking configuration
 * Integrates with state management for persistent settings
 */

import { state } from './state.js';
import { api } from './api.js';

class MobilizationSettingsService {
    constructor() {
        // Default configuration
        this.defaults = {
            enabled: true,
            stackingDiscount: 35, // 35% competitive default
            presets: {
                aggressive: 0,
                competitive: 35,
                standard: 70,
                full: 100
            }
        };

        // Initialize from state or defaults
        this.settings = this.loadSettings();
    }

    /**
     * Load settings from state
     */
    loadSettings() {
        const stored = state.settings?.mobilizationStacking;
        return {
            ...this.defaults,
            ...stored
        };
    }

    /**
     * Save settings to state
     */
    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        // Update state
        state.updateSettings({
            ...state.settings,
            mobilizationStacking: this.settings
        });

        // Persist to localStorage
        this.persistToStorage();

        // Emit change event
        this.emitChange();

        return this.settings;
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Enable/disable mobilization stacking
     */
    setEnabled(enabled) {
        return this.saveSettings({ enabled });
    }

    /**
     * Set stacking discount percentage
     */
    setStackingDiscount(discount) {
        // Clamp between 0 and 100
        const clamped = Math.max(0, Math.min(100, discount));
        return this.saveSettings({ stackingDiscount: clamped });
    }

    /**
     * Apply a preset
     */
    applyPreset(presetName) {
        const discount = this.defaults.presets[presetName];
        if (discount !== undefined) {
            return this.setStackingDiscount(discount);
        }
        throw new Error(`Unknown preset: ${presetName}`);
    }

    /**
     * Calculate example savings
     */
    calculateExample(services = ['A', 'B', 'C'], kw = 30) {
        const mobilizationRate = 150;
        const hoursPerService = 2; // Typical for small generators

        const standardTotal = services.length * hoursPerService * mobilizationRate;
        const largestMobilization = hoursPerService * mobilizationRate;
        const otherMobilizations = (services.length - 1) * hoursPerService * mobilizationRate;
        const discountedOthers = otherMobilizations * (this.settings.stackingDiscount / 100);
        const stackedTotal = largestMobilization + discountedOthers;
        const savings = standardTotal - stackedTotal;

        return {
            kw,
            services,
            stackingDiscount: this.settings.stackingDiscount,
            standardTotal,
            stackedTotal,
            savings,
            percentSaved: Math.round((savings / standardTotal) * 100),
            enabled: this.settings.enabled
        };
    }

    /**
     * Get preset info
     */
    getPresetInfo() {
        return {
            aggressive: {
                value: 0,
                label: 'Aggressive',
                description: 'Maximum discount - only charge largest mobilization',
                savings: this.calculateExample(['A', 'B', 'C'], 30).savings
            },
            competitive: {
                value: 35,
                label: 'Competitive',
                description: 'Balanced pricing - competitive but profitable',
                savings: this.calculateExample(['A', 'B', 'C'], 30).savings
            },
            standard: {
                value: 70,
                label: 'Standard',
                description: 'Standard pricing - moderate discount',
                savings: this.calculateExample(['A', 'B', 'C'], 30).savings
            },
            full: {
                value: 100,
                label: 'Full Price',
                description: 'No discount - charge all mobilizations',
                savings: 0
            }
        };
    }

    /**
     * Persist to localStorage
     */
    persistToStorage() {
        try {
            localStorage.setItem('mobilizationSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to persist mobilization settings:', e);
        }
    }

    /**
     * Load from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('mobilizationSettings');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.settings = { ...this.defaults, ...parsed };
                return true;
            }
        } catch (e) {
            console.warn('Failed to load mobilization settings:', e);
        }
        return false;
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        return this.saveSettings(this.defaults);
    }

    /**
     * Emit change event
     */
    emitChange() {
        window.dispatchEvent(new CustomEvent('mobilizationSettingsChanged', {
            detail: this.settings
        }));
    }

    /**
     * Subscribe to changes
     */
    onChange(callback) {
        const handler = (e) => callback(e.detail);
        window.addEventListener('mobilizationSettingsChanged', handler);

        // Return unsubscribe function
        return () => {
            window.removeEventListener('mobilizationSettingsChanged', handler);
        };
    }

    /**
     * Sync with server settings
     */
    async syncWithServer() {
        try {
            const response = await api.getSettings();
            if (response?.mobilizationStacking) {
                this.settings = { ...this.defaults, ...response.mobilizationStacking };
                this.persistToStorage();
                this.emitChange();
            }
        } catch (error) {
            console.error('Failed to sync mobilization settings:', error);
        }
    }
}

// Create singleton instance
const mobilizationSettings = new MobilizationSettingsService();

// Auto-load from storage on init
mobilizationSettings.loadFromStorage();

// Export the service
export { mobilizationSettings };