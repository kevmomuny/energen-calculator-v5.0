/**
 * Service C Card Module - Coolant Service (Annual/Biannual)
 * @module @energen/service-cards/ServiceCCard
 * @version 4.5.0
 */

export class ServiceCCard {
  constructor(settings = null, kWRange = 80) {
    this.settings = settings || this.loadSettingsFromStorage();
    this.kWRange = kWRange;
    this.frequency = 1; // Annual by default (can be 0.5 for biannual)
    this.serviceCode = 'C';
    this.serviceName = 'Coolant Service';
    this.description = 'Coolant flush, replacement, and hose/belt inspection';
    
    // Constants from Excel
    this.coolantCostPerGallon = 22.50; // From Excel (not the $15 shown in some places)
    this.coolantSampleCost = 16.55;
    
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
    
    // Default settings from monterey_mess.xlsx Ser Menu 2022 Rates
    return {
      labor: {
        straightTime: 191,
        overtime: 255.50,
        doubleTime: 382
      },
      calculationMode: 'standard',
      serviceC: {
        '2-14': { laborHours: 2, mobilizationHours: 2, coolantGallons: 2.25, hosesBelts: 150 },
        '15-30': { laborHours: 2, mobilizationHours: 2, coolantGallons: 4.5, hosesBelts: 200 },
        '35-150': { laborHours: 2, mobilizationHours: 2, coolantGallons: 7.5, hosesBelts: 250 },
        '155-250': { laborHours: 3, mobilizationHours: 2, coolantGallons: 12, hosesBelts: 300 },
        '255-400': { laborHours: 3, mobilizationHours: 2, coolantGallons: 18, hosesBelts: 450 },
        '405-500': { laborHours: 4, mobilizationHours: 2, coolantGallons: 27, hosesBelts: 500 },
        '505-670': { laborHours: 4, mobilizationHours: 2, coolantGallons: 45, hosesBelts: 600 },
        '675-1050': { laborHours: 6, mobilizationHours: 2, coolantGallons: 75, hosesBelts: 650 },
        '1055-1500': { laborHours: 6, mobilizationHours: 2, coolantGallons: 150, hosesBelts: 850 },
        '1500-2050': { laborHours: 8, mobilizationHours: 2, coolantGallons: 225, hosesBelts: 1000 }
      },
      partsMarkup: 1.2,
      freightPercent: 0.05,
      coolantMarkup: 1.5 // Coolant gets different markup like oil
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

  setFrequency(frequency) {
    this.frequency = frequency;
    return this.calculateService();
  }

  calculateService() {
    const rangeKey = this.getKwRangeKey();
    const config = this.settings.serviceC[rangeKey];
    const laborRate = parseFloat(this.settings.labor.straightTime);
    
    // Calculate components
    const labor = config.laborHours * laborRate;
    const mobilization = config.mobilizationHours * laborRate;
    
    // Parts (hoses and belts)
    const hosesBeltsCost = config.hosesBelts;
    
    // Coolant cost (consumable)
    const coolantCost = config.coolantGallons * this.coolantCostPerGallon;
    
    // Apply markups
    const markedUpParts = hosesBeltsCost * (this.settings.partsMarkup || 1);
    const markedUpCoolant = coolantCost * (this.settings.coolantMarkup || 1.5);
    
    // Add coolant sample test
    const sampleCost = this.coolantSampleCost;
    
    // Total consumables includes coolant and sample
    const totalConsumables = markedUpCoolant + sampleCost;
    
    // Calculate freight on marked up parts only (not consumables)
    const freight = markedUpParts * (this.settings.freightPercent || 0);
    
    const perVisit = labor + mobilization + markedUpParts + totalConsumables + freight;
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
      hosesBeltsCost,
      coolantGallons: config.coolantGallons,
      coolantCost,
      sampleCost,
      markedUpParts,
      markedUpCoolant,
      totalConsumables,
      freight,
      perVisit,
      annual,
      breakdown: {
        labor: `${config.laborHours} hrs × $${laborRate}`,
        mobilization: `${config.mobilizationHours} hrs × $${laborRate}`,
        hosesBelts: `$${hosesBeltsCost.toFixed(2)} × ${this.settings.partsMarkup}`,
        coolant: `${config.coolantGallons} gal × $${this.coolantCostPerGallon} × ${this.settings.coolantMarkup}`,
        sample: `Coolant analysis sample`,
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
    const frequencyText = this.frequency === 1 ? 'Annual' : 
                         this.frequency === 0.5 ? 'Biannual' :
                         `${this.frequency}x per year`;
    
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
            <select class="frequency-selector" data-service="${this.serviceCode}">
              <option value="1" ${this.frequency === 1 ? 'selected' : ''}>Annual</option>
              <option value="0.5" ${this.frequency === 0.5 ? 'selected' : ''}>Biannual</option>
            </select>
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
            <span class="detail-label">Hoses/Belts:</span>
            <span class="detail-value">$${calc.markedUpParts.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.hosesBelts}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Coolant:</span>
            <span class="detail-value">$${calc.markedUpCoolant.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.coolant}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Sample Test:</span>
            <span class="detail-value">$${calc.sampleCost.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.sample}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Freight:</span>
            <span class="detail-value">$${calc.freight.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.freight}</span>
          </div>
          <div class="detail-row total-row">
            <span class="detail-label">Per Visit:</span>
            <span class="detail-value highlight">$${calc.perVisit.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="service-total">
          <span class="total-label">${frequencyText} Total:</span>
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
  module.exports = { ServiceCCard };
}