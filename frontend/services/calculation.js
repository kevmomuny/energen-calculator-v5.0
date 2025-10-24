/**
 * Calculation Service
 * Handles all pricing and service calculations
 */

// Get API service dynamically (it may not be available at module load time)
function getAPI() {
  return window.apiService || window.EnergenApp?.modules?.api;
}

export class CalculationService {
  constructor(eventBus = null) {
    this.eventBus = eventBus
    this.laborRate = 191
    this.settings = this.loadSettings()
    this.services = {
      'A': { name: 'Comprehensive Inspection', description: 'Complete system inspection' },
      'B': { name: 'Oil & Filter Service', description: 'Oil change and filters' },
      'C': { name: 'Coolant Service', description: 'Coolant flush and refill' },
      'D': { name: 'Oil & Fuel Analysis', description: 'Laboratory testing' },
      'E': { name: 'Load Bank Testing', description: 'Full load testing' },
      'F': { name: 'Engine Tune-Up', description: 'Engine optimization' },
      'G': { name: 'Gas Engine Tune-Up', description: 'Natural gas engine service' },
      'H': { name: 'Generator Electrical Testing', description: 'Electrical system testing' },
      'I': { name: 'Transfer Switch Service', description: 'Transfer switch maintenance' },
      'J': { name: 'Thermal Imaging Scan', description: 'Infrared thermal analysis' }
    }

    // Listen for settings updates
    if (this.eventBus) {
      this.eventBus.on('settings:updated', (newSettings) => {
        this.handleSettingsUpdate(newSettings)
      })
    }

    // Also listen for window messages from settings modal
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SETTINGS_UPDATED') {
        this.handleSettingsUpdate(event.data.settings)
      }
    })
  }

  loadSettings() {
    const stored = localStorage.getItem('energenSettings')
    if (stored) {
      return JSON.parse(stored)
    }

    // Default settings
    return {
      laborRate: 191,
      mileageRate: 1.5,
      travelTimeRate: 191,
      oilPrice: 10.54,
      oilMarkup: 1.5,
      coolantPrice: 20,
      coolantMarkup: 1.5,
      disposalFee: 2.34,
      permitFee: 50,
      adminFee: 100,
      taxRate: 0.0775
    }
  }

  handleSettingsUpdate(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    localStorage.setItem('energenSettings', JSON.stringify(this.settings))

    // Emit event to trigger recalculation
    if (this.eventBus) {
      this.eventBus.emit('calculation:refresh', {
        reason: 'settings_updated',
        settings: this.settings
      })
    }

    // Also dispatch custom event for other listeners
    window.dispatchEvent(new CustomEvent('settingsUpdated', {
      detail: this.settings
    }))
  }

  /**
   * Calculate service pricing for a unit
   */
  async calculate(unitData) {
    // Validate input
    if (!unitData.kw || unitData.kw <= 0) {
      throw new Error('Valid kW rating is required')
    }
    
    if (!unitData.services || unitData.services.length === 0) {
      throw new Error('At least one service must be selected')
    }
    
    try {
      // CRITICAL FIX: Use unitData.settings (from window.state.activeSettings) as primary source
      // Fall back to this.settings (localStorage) only if not provided
      const settings = unitData.settings || this.settings;

      console.log('[CALCULATION.JS] Using settings:', {
        laborRate: settings.laborRate,
        coolantPrice: settings.coolantPrice,
        oilPrice: settings.oilPrice,
        hasServiceD: !!settings.serviceD
      });

      // Call the API with validated data and current settings
      const api = getAPI();
      if (!api) {
        throw new Error('API service not available');
      }
      const result = await api.calculate({
        kw: parseInt(unitData.kw),
        services: unitData.services,
        serviceFrequencies: unitData.serviceFrequencies || {},
        serviceOptions: unitData.serviceOptions || {},
        serviceDFluids: unitData.serviceDFluids || null,  // CRITICAL: Pass serviceDFluids!
        customServices: unitData.customServices || {},
        atsUnits: unitData.atsUnits || [{ id: 1, includeMobilization: false }],  // CRITICAL: Pass atsUnits for Service I!
        distance: unitData.distance || 0,
        unitCount: 1,
        address: unitData.address || '',
        city: unitData.city || '',
        state: unitData.state || 'CA',
        zip: unitData.zip || '',
        contractYears: unitData.contractYears || 1,
        settings: settings  // CRITICAL: Pass complete settings object including serviceD!
      })
      
      // Add service details
      result.services = unitData.services.map(code => ({
        code,
        name: this.services[code]?.name || 'Unknown Service',
        description: this.services[code]?.description || ''
      }))
      
      return result
    } catch (error) {
      console.error('Calculation failed:', error)
      throw error
    }
  }

  /**
   * Calculate service price with frequency adjustment
   */
  async calculateServicePrice(serviceCode, kw, frequency = 4) {
    try {
      // Call the API endpoint for accurate service pricing
      const result = await api.calculateServicePrice({
        serviceCode,
        kw,
        frequency
      })
      
      return result
    } catch (error) {
      console.error('Service price calculation failed:', error)
      
      // NO FALLBACK - real data only
      throw new Error('Service price calculation unavailable - API required')
    }
  }

  /**
   * Calculate total for multiple units
   */
  async calculateMultipleUnits(units, sharedData) {
    const calculations = []
    let totals = {
      laborHours: 0,
      laborCost: 0,
      materialsCost: 0,
      travelCost: 0,
      shopTime: 0,
      subtotal: 0,
      tax: 0,
      total: 0
    }
    
    for (const unit of units) {
      try {
        const calc = await this.calculate({
          ...unit,
          ...sharedData
        })
        
        calculations.push(calc)
        
        // Aggregate totals
        totals.laborHours += calc.laborHours
        totals.laborCost += calc.laborCost
        totals.materialsCost += calc.materialsCost
        totals.travelCost += calc.travelCost
        totals.shopTime += calc.shopTime
        totals.subtotal += calc.subtotal
        totals.tax += calc.tax
        totals.total += calc.total
      } catch (error) {
        console.error(`Calculation failed for unit ${unit.id}:`, error)
        calculations.push(null)
      }
    }
    
    return {
      unitCalculations: calculations,
      totals,
      yearlyProjections: {
        year1: totals.total,
        year2: totals.total * 1.03,
        year3: totals.total * 1.0609
      }
    }
  }

  /**
   * Get service definitions
   */
  getServices() {
    return this.services
  }

  /**
   * Get service by code
   */
  getService(code) {
    return this.services[code] || null
  }

  /**
   * Validate service codes
   */
  validateServices(serviceCodes) {
    const valid = []
    const invalid = []
    
    for (const code of serviceCodes) {
      if (this.services[code]) {
        valid.push(code)
      } else {
        invalid.push(code)
      }
    }
    
    return { valid, invalid }
  }
}