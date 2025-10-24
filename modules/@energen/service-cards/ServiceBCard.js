/**
 * Service B Card Module - Oil & Filter Service (Annual)
 * @module @energen/service-cards/ServiceBCard
 * @version 4.5.0
 */

export class ServiceBCard {
  constructor(settings = null, kWRange = 80) {
    this.settings = settings || this.loadSettingsFromStorage();
    this.kWRange = kWRange;
    this.frequency = 1; // Annual service
    this.serviceCode = 'B';
    this.serviceName = 'Oil & Filter Service';
    this.description = 'Oil change and filter replacement';
    
    // kW range mappings
    this.kwRanges = {
      '2-14': { min: 2, max: 14 },
      '15-30': { min: 15, max: 30 },
      '35-150': { min: 35, max: 150 },
      '155-250': { min: 155, max: 250 },
      '255-400': { min: 255, max: 400 },
      '405-500': { min: 405, max: 500 },
      '505-670': { min: 505, max: 670 },
      '675-1050': { min: 675, max: 1050 },
      '1055-1500': { min: 1055, max: 1500 },
      '1500-2050': { min: 1500, max: 2050 }
    };
    
    this.oilCostPerGallon = 16.00;
  }

  loadSettingsFromStorage() {
    try {
      const stored = localStorage.getItem('energenSettings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load settings from storage:', e);
    }
    
    // Default settings from monterey_mess.xlsx
    return {
      labor: {
        straightTime: 191,
        overtime: 255.50,
        doubleTime: 382
      },
      calculationMode: 'standard',
      serviceB: {
        '2-14': { laborHours: 1, mobilizationHours: 2, filterCost: 171.90, oilGallons: 1.5 },
        '15-30': { laborHours: 1, mobilizationHours: 2, filterCost: 171.90, oilGallons: 3 },
        '35-150': { laborHours: 2, mobilizationHours: 2, filterCost: 229.20, oilGallons: 5 },
        '155-250': { laborHours: 2, mobilizationHours: 2, filterCost: 229.20, oilGallons: 8 },
        '255-400': { laborHours: 4, mobilizationHours: 2, filterCost: 343.80, oilGallons: 12 },
        '405-500': { laborHours: 6, mobilizationHours: 2, filterCost: 458.40, oilGallons: 18 },
        '505-670': { laborHours: 8, mobilizationHours: 4, filterCost: 687.60, oilGallons: 30 },
        '675-1050': { laborHours: 12, mobilizationHours: 4, filterCost: 916.80, oilGallons: 50 },
        '1055-1500': { laborHours: 16, mobilizationHours: 4, filterCost: 1146.00, oilGallons: 100 },
        '1500-2050': { laborHours: 16, mobilizationHours: 4, filterCost: 1146.00, oilGallons: 150 }
      },
      partsMarkup: 1.2,
      freightPercent: 0.05,
      oilMarkup: 1.5 // Oil gets different markup
    };
  }

  getKwRangeKey() {
    const kw = this.kWRange;
    for (const [key, range] of Object.entries(this.kwRanges)) {
      if (kw >= range.min && kw <= range.max) {
        return key;
      }
    }
    return '35-150'; // Default range
  }

  calculateService() {
    const rangeKey = this.getKwRangeKey();
    const config = this.settings.serviceB[rangeKey];
    const laborRate = parseFloat(this.settings.labor.straightTime);
    
    // Calculate components
    const labor = config.laborHours * laborRate;
    const mobilization = config.mobilizationHours * laborRate;
    
    // Calculate parts (filter)
    let filterCost = config.filterCost;
    if (this.settings.calculationMode === 'job-specific' && rangeKey === '35-150') {
      // Use simplified parts for job-specific mode
      filterCost = 229.20; // Keep exact filter cost
    }
    
    // Calculate oil cost
    const oilCost = config.oilGallons * this.oilCostPerGallon;
    
    // Oil analysis is a fixed cost (lab fee) - no markup
    const oilAnalysisCost = 16.55;
    
    // Apply markup to parts and oil
    const markedUpFilter = filterCost * (this.settings.partsMarkup || 1);
    const markedUpOil = oilCost * (this.settings.oilMarkup || 1.5);
    
    // Calculate freight on marked up parts only (not on analysis lab fee)
    const totalPartsBeforeFreight = markedUpFilter + markedUpOil;
    const freight = totalPartsBeforeFreight * (this.settings.freightPercent || 0);
    
    const totalParts = markedUpFilter;
    const totalConsumables = markedUpOil + oilAnalysisCost; // Include analysis in consumables
    
    const perVisit = labor + mobilization + totalParts + totalConsumables + freight;
    const annual = perVisit * this.frequency;
    
    return {
      serviceCode: this.serviceCode,
      serviceName: this.serviceName,
      kwRange: rangeKey,
      frequency: this.frequency,
      laborHours: config.laborHours,
      mobilizationHours: config.mobilizationHours,
      labor,
      mobilization,
      filterCost,
      oilCost,
      oilGallons: config.oilGallons,
      oilAnalysisCost,
      markedUpFilter,
      markedUpOil,
      freight,
      totalParts,
      totalConsumables,
      perVisit,
      annual,
      breakdown: {
        labor: `${config.laborHours} hrs × $${laborRate}`,
        mobilization: `${config.mobilizationHours} hrs × $${laborRate}`,
        filter: `$${filterCost.toFixed(2)} × ${this.settings.partsMarkup}`,
        oil: `${config.oilGallons} gal × $${this.oilCostPerGallon} × ${this.settings.oilMarkup}`,
        oilAnalysis: `Fixed lab fee (no markup)`,
        freight: `${(this.settings.freightPercent * 100).toFixed(0)}% of parts`
      }
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return this.calculateService();
  }

  updateKW(newKW) {
    this.kWRange = newKW;
    return this.calculateService();
  }

  render() {
    const calc = this.calculateService();
    
    return `
      <div class="service-card" data-service="${this.serviceCode}">
        <div class="service-header">
          <div class="service-title">
            <input type="checkbox" id="service-${this.serviceCode}" checked class="service-toggle">
            <label for="service-${this.serviceCode}">
              <span class="service-code">Service ${this.serviceCode}</span>
              <span class="service-name">${this.serviceName}</span>
            </label>
          </div>
          <div class="service-frequency">
            ${this.frequency}x per year
          </div>
        </div>
        
        <div class="service-details">
          <div class="detail-row">
            <span class="detail-label">kW Range:</span>
            <span class="detail-value">${calc.kwRange}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Labor:</span>
            <span class="detail-value">$${calc.labor.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.labor}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Mobilization:</span>
            <span class="detail-value">$${calc.mobilization.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.mobilization}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Filter:</span>
            <span class="detail-value">$${calc.markedUpFilter.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.filter}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Oil:</span>
            <span class="detail-value">$${calc.markedUpOil.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.oil}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Per Visit:</span>
            <span class="detail-value highlight">$${calc.perVisit.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="service-total">
          <span class="total-label">Annual Total:</span>
          <span class="total-value">$${calc.annual.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  toJSON() {
    return this.calculateService();
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ServiceBCard };
}