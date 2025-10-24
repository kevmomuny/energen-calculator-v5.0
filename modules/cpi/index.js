/**
 * Consumer Price Index (CPI) Module
 * Handles CPI data retrieval and inflation adjustments
 * @module cpi
 * @version 4.5.0
 */

import { EnergenModule } from '../core/interfaces.js';
import fetch from 'node-fetch';

/**
 * CPI Module for inflation adjustments
 */
export class CPIModule extends EnergenModule {
  constructor(config = {}) {
    super({
      name: 'CPI',
      version: '4.5.0',
      ...config
    });

    // FRED API configuration
    this.fredApiKey = null; // Will be set from config
    this.fredBaseUrl = 'https://api.stlouisfed.org/fred/series/observations';
    
    // Metropolitan area CPI series IDs
    this.metroSeriesIds = {
      'SF': 'CUURS49BSA0',      // San Francisco-Oakland-Hayward
      'LA': 'CUURS49ASA0',      // Los Angeles-Long Beach-Anaheim
      'SD': 'CUURS49ESA0',      // San Diego-Carlsbad
      'RIVERSIDE': 'CUURA421SA0', // Riverside-San Bernardino-Ontario
      'US': 'CPIAUCSL'          // US City Average (fallback)
    };

    // ZIP to metro area mapping
    this.zipToMetro = this.initializeZipToMetro();
    
    // Cache for CPI data
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    // Latest CPI values cache
    this.latestCPI = new Map();
  }

  /**
   * Initialize module
   */
  async onInit(config) {
    this.config = config;
    
    // Get API key from config
    this.fredApiKey = config.fredApiKey || process.env.FRED_API_KEY;
    
    if (!this.fredApiKey) {
      this.logger.warn('FRED API key not configured - CPI adjustments will use default values');
    }
    
    // Get event bus dependency
    const eventBus = this.getDependency('eventBus');
    if (!eventBus) {
      throw new Error('EventBus dependency not found');
    }

    // Register event listeners
    this.setupEventListeners();
    
    // Initialize CPI data
    await this.initializeCPIData();
    
    this.logger.info('CPI module initialized');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const eventBus = this.getDependency('eventBus');
    
    // Listen for CPI requests
    eventBus.on('cpi:request', this.handleCPIRequest.bind(this));
    eventBus.on('cpi:calculate-adjustment', this.handleAdjustmentRequest.bind(this));
    eventBus.on('cpi:get-metro', this.handleMetroRequest.bind(this));
  }

  /**
   * Handle CPI data request
   */
  async handleCPIRequest(event) {
    const { requestId, data } = event;
    const { zip, metro } = data;

    try {
      this.metrics.requestCount++;
      
      const metroArea = metro || this.getMetroFromZip(zip);
      const cpiData = await this.getCPIData(metroArea);
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('cpi:response', {
        requestId,
        success: true,
        data: cpiData
      });
    } catch (error) {
      this.handleError(error, 'cpi:request');
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('cpi:response', {
        requestId,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle adjustment calculation request
   */
  async handleAdjustmentRequest(event) {
    const { requestId, data } = event;
    const { amount, fromYear, toYear, metro } = data;

    try {
      this.metrics.requestCount++;
      
      const adjustment = await this.calculateAdjustment(amount, fromYear, toYear, metro);
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('cpi:adjustment-response', {
        requestId,
        success: true,
        data: adjustment
      });
    } catch (error) {
      this.handleError(error, 'cpi:calculate-adjustment');
      
      const eventBus = this.getDependency('eventBus');
      eventBus.emit('cpi:adjustment-response', {
        requestId,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle metro area lookup request
   */
  handleMetroRequest(event) {
    const { requestId, data } = event;
    const { zip } = data;

    const metro = this.getMetroFromZip(zip);
    
    const eventBus = this.getDependency('eventBus');
    eventBus.emit('cpi:metro-response', {
      requestId,
      success: true,
      data: { metro, zip }
    });
  }

  /**
   * Initialize CPI data
   */
  async initializeCPIData() {
    // Load latest CPI values for all metros
    for (const [metro, seriesId] of Object.entries(this.metroSeriesIds)) {
      try {
        const data = await this.fetchCPIFromFRED(seriesId);
        if (data && data.length > 0) {
          this.latestCPI.set(metro, {
            value: parseFloat(data[data.length - 1].value),
            date: data[data.length - 1].date,
            seriesId
          });
        }
      } catch (error) {
        this.logger.warn(`Failed to load CPI for ${metro}: ${error.message}`);
      }
    }

    // If FRED API fails, use fallback values
    if (this.latestCPI.size === 0) {
      this.useFallbackCPI();
    }
  }

  /**
   * Get CPI data for a metro area
   */
  async getCPIData(metro = 'US') {
    // Check cache
    const cacheKey = `cpi-${metro}-${new Date().toDateString()}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Get series ID for metro
    const seriesId = this.metroSeriesIds[metro] || this.metroSeriesIds['US'];
    
    try {
      // Fetch from FRED if API key available
      if (this.fredApiKey) {
        const observations = await this.fetchCPIFromFRED(seriesId);
        
        if (observations && observations.length > 0) {
          const latest = observations[observations.length - 1];
          const yearAgo = observations[observations.length - 13] || observations[0];
          
          const cpiData = {
            metro,
            seriesId,
            current: {
              value: parseFloat(latest.value),
              date: latest.date
            },
            yearAgo: {
              value: parseFloat(yearAgo.value),
              date: yearAgo.date
            },
            annualInflation: ((parseFloat(latest.value) - parseFloat(yearAgo.value)) / parseFloat(yearAgo.value) * 100).toFixed(2),
            source: 'FRED',
            lastUpdated: new Date().toISOString()
          };

          // Cache the result
          this.cache.set(cacheKey, {
            data: cpiData,
            timestamp: Date.now()
          });

          return cpiData;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to fetch CPI from FRED: ${error.message}`);
    }

    // Return fallback data
    return this.getFallbackCPI(metro);
  }

  /**
   * Fetch CPI data from FRED API
   */
  async fetchCPIFromFRED(seriesId) {
    if (!this.fredApiKey) {
      throw new Error('FRED API key not configured');
    }

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const params = new URLSearchParams({
      series_id: seriesId,
      api_key: this.fredApiKey,
      file_type: 'json',
      observation_start: startDate,
      observation_end: endDate,
      sort_order: 'asc'
    });

    const response = await fetch(`${this.fredBaseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();
    return data.observations;
  }

  /**
   * Calculate inflation adjustment
   */
  async calculateAdjustment(amount, fromYear, toYear, metro = 'US') {
    const fromCPI = await this.getCPIForYear(fromYear, metro);
    const toCPI = await this.getCPIForYear(toYear, metro);
    
    const adjustedAmount = amount * (toCPI / fromCPI);
    const inflationRate = ((toCPI - fromCPI) / fromCPI * 100).toFixed(2);
    
    return {
      originalAmount: amount,
      adjustedAmount: adjustedAmount.toFixed(2),
      fromYear,
      toYear,
      fromCPI,
      toCPI,
      inflationRate,
      metro
    };
  }

  /**
   * Get CPI for a specific year
   */
  async getCPIForYear(year, metro = 'US') {
    // This would fetch historical CPI data
    // For now, use approximation based on latest data
    const latest = this.latestCPI.get(metro) || this.latestCPI.get('US');
    
    if (!latest) {
      // Use fallback value
      return 300; // Approximate CPI value
    }

    const currentYear = new Date().getFullYear();
    const yearDiff = currentYear - year;
    
    // Assume 2.5% annual inflation for approximation
    const approximateCPI = latest.value / Math.pow(1.025, yearDiff);
    return approximateCPI;
  }

  /**
   * Initialize ZIP to metro mapping
   */
  initializeZipToMetro() {
    return {
      // San Francisco Bay Area
      '940': 'SF', '941': 'SF', '942': 'SF', '943': 'SF', '944': 'SF',
      '945': 'SF', '946': 'SF', '947': 'SF', '948': 'SF', '949': 'SF',
      '950': 'SF', '951': 'SF', '952': 'SF', '953': 'SF', '954': 'SF',
      '955': 'SF',
      
      // Los Angeles Area
      '900': 'LA', '901': 'LA', '902': 'LA', '903': 'LA', '904': 'LA',
      '905': 'LA', '906': 'LA', '907': 'LA', '908': 'LA', '910': 'LA',
      '911': 'LA', '912': 'LA', '913': 'LA', '914': 'LA', '915': 'LA',
      '916': 'LA', '917': 'LA', '918': 'LA',
      
      // San Diego
      '919': 'SD', '920': 'SD', '921': 'SD',
      
      // Riverside-San Bernardino
      '922': 'RIVERSIDE', '923': 'RIVERSIDE', '924': 'RIVERSIDE',
      '925': 'RIVERSIDE', '926': 'RIVERSIDE', '927': 'RIVERSIDE',
      '928': 'RIVERSIDE'
    };
  }

  /**
   * Get metro area from ZIP code
   */
  getMetroFromZip(zip) {
    if (!zip || zip.length < 3) return 'US';
    const prefix3 = zip.substring(0, 3);
    return this.zipToMetro[prefix3] || 'US';
  }

  /**
   * Use fallback CPI values
   */
  useFallbackCPI() {
    // Fallback CPI values (approximate for 2025)
    const fallbackValues = {
      'SF': { value: 320, date: '2025-01-01' },
      'LA': { value: 310, date: '2025-01-01' },
      'SD': { value: 305, date: '2025-01-01' },
      'RIVERSIDE': { value: 295, date: '2025-01-01' },
      'US': { value: 300, date: '2025-01-01' }
    };

    for (const [metro, data] of Object.entries(fallbackValues)) {
      this.latestCPI.set(metro, {
        ...data,
        seriesId: this.metroSeriesIds[metro]
      });
    }
  }

  /**
   * Get fallback CPI data
   */
  getFallbackCPI(metro) {
    const data = this.latestCPI.get(metro) || this.latestCPI.get('US');
    
    return {
      metro,
      seriesId: this.metroSeriesIds[metro] || this.metroSeriesIds['US'],
      current: {
        value: data.value,
        date: data.date
      },
      yearAgo: {
        value: data.value * 0.975, // Assume 2.5% inflation
        date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      annualInflation: '2.50',
      source: 'Fallback',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Run health checks
   */
  runHealthChecks() {
    const checks = super.runHealthChecks();
    
    // Check API key configuration
    checks.push({
      name: 'apiKey',
      passed: this.fredApiKey !== null,
      message: this.fredApiKey ? 'FRED API key configured' : 'No FRED API key'
    });

    // Check cache health
    checks.push({
      name: 'cache',
      passed: this.cache.size < 1000,
      message: `Cache size: ${this.cache.size} entries`
    });

    // Check CPI data availability
    checks.push({
      name: 'cpiData',
      passed: this.latestCPI.size > 0,
      message: `CPI data loaded for ${this.latestCPI.size} metros`
    });

    return checks;
  }

  /**
   * Clean up on shutdown
   */
  async onShutdown() {
    // Clear caches
    this.cache.clear();
    this.latestCPI.clear();
    
    this.logger.info('CPI module shutdown complete');
  }
}

// Export for use in container
export default CPIModule;