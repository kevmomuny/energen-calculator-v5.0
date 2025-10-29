/**
 * Centralized Configuration Service
 * Manages all application configuration with environment overrides
 * @module core/config
 * @version 4.1.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration service for managing app settings
 */
export class ConfigService {
  constructor(options = {}) {
    this.config = new Map();
    this.defaults = new Map();
    this.validators = new Map();
    this.listeners = new Map();
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.configPath = options.configPath || path.join(__dirname, '../../config');
    this.logger = options.logger || console;

    // Load order priority
    this.loadOrder = [
      'default',
      this.environment,
      'local'
    ];

    this.initialized = false;
  }

  /**
   * Initialize configuration
   * @param {Object} initialConfig - Initial configuration object
   */
  async init(initialConfig = {}) {
    if (this.initialized) {
      this.logger.warn('ConfigService already initialized');
      return;
    }

    try {
      // Load default configuration
      await this.loadDefaults();

      // Load configuration files
      await this.loadConfigFiles();

      // Apply environment variables
      this.loadEnvironmentVariables();

      // Apply initial config overrides
      this.merge(initialConfig);

      // Validate configuration
      this.validateAll();

      this.initialized = true;
      this.logger.info('Configuration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize configuration:', error);
      throw error;
    }
  }

  /**
   * Load default configuration
   */
  async loadDefaults() {
    const defaults = {
      // Application settings
      app: {
        name: 'Energen Calculator',
        version: '4.1.0',
        environment: this.environment,
        debug: this.environment === 'development',
        port: 3002,
        host: 'localhost'
      },

      // API settings
      api: {
        baseUrl: 'http://localhost:3002',
        timeout: 30000,
        retries: 3,
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 100
        }
      },

      // Database settings
      database: {
        type: 'sqlite',
        path: './data/energen.db',
        logging: false,
        synchronize: this.environment === 'development'
      },

      // Module settings
      modules: {
        calculation: {
          laborRate: 175,
          defaultTaxRate: 0.1025,
          markupPercentage: 0.15,
          travelRate: 175
        },
        enrichment: {
          cacheEnabled: true,
          cacheTTL: 3600000, // 1 hour
          providers: {
            google: {
              enabled: true,
              apiKey: process.env.GOOGLE_MAPS_API_KEY
            },
            brandfetch: {
              enabled: true,
              apiKey: process.env.BRANDFETCH_API_KEY
            }
          }
        },
        pdf: {
          outputPath: './output/pdfs',
          templatePath: './templates',
          compression: true
        },
        zoho: {
          enabled: false,
          clientId: process.env.ZOHO_CLIENT_ID,
          clientSecret: process.env.ZOHO_CLIENT_SECRET,
          redirectUri: process.env.ZOHO_REDIRECT_URI,
          scope: 'ZohoCRM.modules.ALL'
        }
      },

      // Logging settings
      logging: {
        level: this.environment === 'production' ? 'info' : 'debug',
        format: 'json',
        transports: ['console', 'file'],
        filePath: './logs/app.log'
      },

      // Security settings
      security: {
        cors: {
          enabled: true,
          origin: '*',
          credentials: true
        },
        helmet: {
          enabled: true
        },
        rateLimit: {
          enabled: true
        }
      },

      // Cache settings
      cache: {
        enabled: true,
        type: 'memory',
        ttl: 300000, // 5 minutes
        maxSize: 100
      },

      // Feature flags
      features: {
        googlePlacesEnrichment: true,
        pdfGeneration: true,
        zohoIntegration: false,
        advancedCalculations: true,
        caching: true,
        monitoring: true
      }
    };

    this.setDefaults(defaults);
  }

  /**
   * Load configuration files
   */
  async loadConfigFiles() {
    for (const fileName of this.loadOrder) {
      const filePath = path.join(this.configPath, `${fileName}.json`);

      if (fs.existsSync(filePath)) {
        try {
          const fileConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          this.merge(fileConfig);
          this.logger.debug(`Loaded config file: ${fileName}.json`);
        } catch (error) {
          this.logger.warn(`Failed to load config file ${fileName}.json:`, error.message);
        }
      }
    }
  }

  /**
   * Load environment variables
   */
  loadEnvironmentVariables() {
    const envMappings = {
      'PORT': 'app.port',
      'NODE_ENV': 'app.environment',
      'API_BASE_URL': 'api.baseUrl',
      'GOOGLE_MAPS_API_KEY': 'modules.enrichment.providers.google.apiKey',
      'BRANDFETCH_API_KEY': 'modules.enrichment.providers.brandfetch.apiKey',
      'ZOHO_CLIENT_ID': 'modules.zoho.clientId',
      'ZOHO_CLIENT_SECRET': 'modules.zoho.clientSecret',
      'ZOHO_REDIRECT_URI': 'modules.zoho.redirectUri',
      'LABOR_RATE': 'modules.calculation.laborRate',
      'TAX_RATE': 'modules.calculation.defaultTaxRate',
      'DEBUG': 'app.debug',
      'LOG_LEVEL': 'logging.level'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        const value = this.parseEnvValue(process.env[envVar]);
        this.set(configPath, value);
        this.logger.debug(`Applied env var ${envVar} to ${configPath}`);
      }
    }
  }

  /**
   * Parse environment variable value
   */
  parseEnvValue(value) {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value;
    }
  }

  /**
   * Get a configuration value
   * @param {string} path - Dot-notated path to config value
   * @param {any} defaultValue - Default value if not found
   * @returns {any}
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = this.config;

    for (const key of keys) {
      if (current instanceof Map) {
        current = current.get(key);
      } else if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return defaultValue;
      }

      if (current === undefined) {
        return this.getDefault(path, defaultValue);
      }
    }

    return current;
  }

  /**
   * Set a configuration value
   * @param {string} path - Dot-notated path to config value
   * @param {any} value - Value to set
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = this.config;

    for (const key of keys) {
      if (!current.has(key)) {
        current.set(key, new Map());
      }
      current = current.get(key);
    }

    const oldValue = current.get(lastKey);
    current.set(lastKey, value);

    // Validate new value
    if (this.validators.has(path)) {
      const validator = this.validators.get(path);
      if (!validator(value)) {
        current.set(lastKey, oldValue);
        throw new Error(`Invalid value for ${path}`);
      }
    }

    // Notify listeners
    this.notifyListeners(path, value, oldValue);
  }

  /**
   * Set default values
   * @param {Object} defaults - Default configuration object
   */
  setDefaults(defaults) {
    this.defaults = this.objectToMap(defaults);
    this.config = this.objectToMap(defaults);
  }

  /**
   * Get default value
   * @param {string} path - Configuration path
   * @param {any} fallback - Fallback value
   * @returns {any}
   */
  getDefault(path, fallback) {
    const keys = path.split('.');
    let current = this.defaults;

    for (const key of keys) {
      if (current instanceof Map) {
        current = current.get(key);
      } else if (current && typeof current === 'object') {
        current = current[key];
      } else {
        return fallback;
      }

      if (current === undefined) {
        return fallback;
      }
    }

    return current;
  }

  /**
   * Merge configuration objects
   * @param {Object} config - Configuration to merge
   */
  merge(config) {
    const configMap = this.objectToMap(config);
    this.deepMerge(this.config, configMap);
  }

  /**
   * Deep merge two maps
   * @private
   */
  deepMerge(target, source) {
    for (const [key, value] of source) {
      if (value instanceof Map && target.has(key) && target.get(key) instanceof Map) {
        this.deepMerge(target.get(key), value);
      } else {
        target.set(key, value);
      }
    }
  }

  /**
   * Convert object to nested Map
   * @private
   */
  objectToMap(obj) {
    const map = new Map();

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        map.set(key, this.objectToMap(value));
      } else {
        map.set(key, value);
      }
    }

    return map;
  }

  /**
   * Convert Map to object
   * @private
   */
  mapToObject(map) {
    const obj = {};

    for (const [key, value] of map) {
      if (value instanceof Map) {
        obj[key] = this.mapToObject(value);
      } else {
        obj[key] = value;
      }
    }

    return obj;
  }

  /**
   * Get all configuration as object
   * @returns {Object}
   */
  getAll() {
    return this.mapToObject(this.config);
  }

  /**
   * Register a validator for a configuration path
   * @param {string} path - Configuration path
   * @param {Function} validator - Validation function
   */
  registerValidator(path, validator) {
    this.validators.set(path, validator);
  }

  /**
   * Validate all configuration
   */
  validateAll() {
    const errors = [];

    for (const [path, validator] of this.validators) {
      const value = this.get(path);
      if (!validator(value)) {
        errors.push(`Invalid configuration for ${path}: ${value}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Watch for configuration changes
   * @param {string} path - Configuration path to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  watch(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(path);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Notify listeners of configuration changes
   * @private
   */
  notifyListeners(path, newValue, oldValue) {
    // Notify exact path listeners
    if (this.listeners.has(path)) {
      for (const callback of this.listeners.get(path)) {
        callback(newValue, oldValue, path);
      }
    }

    // Notify parent path listeners
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      if (this.listeners.has(parentPath)) {
        for (const callback of this.listeners.get(parentPath)) {
          callback(this.get(parentPath), undefined, parentPath);
        }
      }
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = new Map(this.defaults);
    this.notifyListeners('', this.getAll(), {});
  }

  /**
   * Export configuration to JSON
   * @returns {string}
   */
  export() {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /**
   * Import configuration from JSON
   * @param {string} json - JSON configuration
   */
  import(json) {
    const config = JSON.parse(json);
    this.merge(config);
  }

  /**
   * Check if configuration has a value
   * @param {string} path - Configuration path
   * @returns {boolean}
   */
  has(path) {
    return this.get(path) !== undefined;
  }

  /**
   * Delete a configuration value
   * @param {string} path - Configuration path
   */
  delete(path) {
    this.set(path, undefined);
  }
}

// Create singleton instance
export const config = new ConfigService();
export default config;
