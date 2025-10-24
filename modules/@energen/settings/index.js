/**
 * Settings Module
 * Manages application settings and preferences
 * @module @energen/settings
 * @version 4.5.0
 */

import { EnergenModule } from '../../core/interfaces.js';

export class SettingsModule extends EnergenModule {
  constructor() {
    super();
    this.name = 'settings';
    this.version = '4.5.0';
    this.settings = {};
    this.defaults = {
      laborRate: 191,
      markupRate: 0.20,
      taxRate: 0.0875,
      annualIncrease: 0.03,
      theme: 'dark',
      autoSave: true,
      syncInterval: 30000,
      shopLocation: {
        lat: 37.9774,
        lng: -122.0311,
        address: '150 Mason Circle, Concord, CA 94520'
      },
      api: {
        googleMapsEnabled: true,
        zohoSyncEnabled: true,
        pdfGenerationEnabled: true
      }
    };
  }

  async onInit(config) {
    this.config = config;
    this.eventBus = config.eventBus;
    this.logger = config.logger;
    
    // Load saved settings or use defaults
    this.settings = { ...this.defaults, ...this.loadSettings() };
    
    // Register event listeners
    this.registerEventListeners();
    
    this.logger?.info('Settings module initialized', { settings: this.settings });
    
    // Emit ready event
    this.eventBus?.emit('settings:ready', this.settings);
    
    return true;
  }

  registerEventListeners() {
    // Listen for settings requests
    this.eventBus?.on('settings:get', (callback) => {
      callback(this.settings);
    });

    // Listen for settings updates
    this.eventBus?.on('settings:update', (data) => {
      this.updateSettings(data.settings);
      data.callback?.({ success: true, settings: this.settings });
    });

    // Listen for specific setting requests
    this.eventBus?.on('settings:getValue', (data) => {
      const value = this.getSetting(data.key);
      data.callback?.(value);
    });

    // Listen for reset requests
    this.eventBus?.on('settings:reset', (callback) => {
      this.resetSettings();
      callback?.({ success: true, settings: this.settings });
    });
  }

  loadSettings() {
    try {
      // In browser environment, use localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('energen_settings');
        return saved ? JSON.parse(saved) : {};
      }
      // In Node environment, could use file system
      return {};
    } catch (error) {
      this.logger?.error('Failed to load settings', error);
      return {};
    }
  }

  saveSettings() {
    try {
      // In browser environment, use localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('energen_settings', JSON.stringify(this.settings));
      }
      // Emit settings changed event
      this.eventBus?.emit('settings:changed', this.settings);
      return true;
    } catch (error) {
      this.logger?.error('Failed to save settings', error);
      return false;
    }
  }

  getSetting(key) {
    const keys = key.split('.');
    let value = this.settings;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value;
  }

  setSetting(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this.settings;
    
    for (const k of keys) {
      if (!target[k]) target[k] = {};
      target = target[k];
    }
    
    target[lastKey] = value;
    this.saveSettings();
    
    // Emit specific setting change
    this.eventBus?.emit(`settings:${key}:changed`, value);
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  resetSettings() {
    this.settings = { ...this.defaults };
    this.saveSettings();
  }

  runHealthChecks() {
    const checks = [];
    
    // Check settings loaded
    checks.push({
      name: 'Settings Loaded',
      status: Object.keys(this.settings).length > 0 ? 'healthy' : 'unhealthy',
      message: `${Object.keys(this.settings).length} settings loaded`
    });

    // Check critical settings
    const criticalKeys = ['laborRate', 'markupRate', 'taxRate'];
    const missingKeys = criticalKeys.filter(key => !this.settings[key]);
    
    checks.push({
      name: 'Critical Settings',
      status: missingKeys.length === 0 ? 'healthy' : 'warning',
      message: missingKeys.length === 0 
        ? 'All critical settings present'
        : `Missing: ${missingKeys.join(', ')}`
    });

    const healthy = checks.every(c => c.status !== 'unhealthy');
    
    return {
      healthy,
      status: healthy ? 'Settings module operational' : 'Settings issues detected',
      uptime: Date.now() - this.startTime,
      metrics: {
        settingsCount: Object.keys(this.settings).length,
        lastSaved: this.lastSaveTime || null
      },
      checks,
      timestamp: new Date()
    };
  }

  async onShutdown() {
    // Save settings before shutdown
    this.saveSettings();
    this.logger?.info('Settings module shutting down');
  }
}

export default SettingsModule;