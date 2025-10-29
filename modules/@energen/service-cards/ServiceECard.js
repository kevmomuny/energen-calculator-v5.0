/**
 * Service E Card Module - Load Bank Testing (Annual)
 * @module @energen/service-cards/ServiceECard
 * @version 4.5.0
 */

export class ServiceECard {
  constructor(settings = null, kWRange = 80) {
    this.settings = settings || this.loadSettingsFromStorage();
    this.kWRange = kWRange;
    this.frequency = 1; // Annual testing
    this.serviceCode = 'E';
    this.serviceName = 'Load Bank Testing';
    this.description = 'Full load testing to verify generator capacity';

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

    // Default settings from monterey_mess.xlsx
    return {
      labor: {
        straightTime: 191,
        overtime: 255.50,
        doubleTime: 382
      },
      calculationMode: 'standard',
      serviceE: {
        '2-14': { laborHours: 3, mobilizationHours: 2, equipmentRental: 350 },
        '15-30': { laborHours: 3, mobilizationHours: 2, equipmentRental: 350 },
        '35-150': { laborHours: 3, mobilizationHours: 2, equipmentRental: 350 },
        '155-250': { laborHours: 4, mobilizationHours: 2, equipmentRental: 700 },
        '255-400': { laborHours: 6, mobilizationHours: 2, equipmentRental: 700 },
        '405-500': { laborHours: 6, mobilizationHours: 2, equipmentRental: 1000 },
        '505-670': { laborHours: 8, mobilizationHours: 2, equipmentRental: 1500 },
        '675-1050': { laborHours: 8, mobilizationHours: 2, equipmentRental: 1500 },
        '1055-1500': { laborHours: 8, mobilizationHours: 2, equipmentRental: 2000 },
        '1500-2050': { laborHours: 12, mobilizationHours: 2, equipmentRental: 2500 }
      },
      partsMarkup: 1.2,
      freightPercent: 0.05
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
    const config = this.settings.serviceE[rangeKey];
    const laborRate = parseFloat(this.settings.labor.straightTime);

    // Calculate components
    const labor = config.laborHours * laborRate;
    const mobilization = config.mobilizationHours * laborRate;

    // Equipment rental (treated as parts for markup purposes)
    let equipment = config.equipmentRental;
    if (this.settings.calculationMode === 'job-specific' && rangeKey === '35-150') {
      // Keep standard equipment cost even in job-specific mode
      equipment = 350;
    }

    // Apply markup and freight to equipment
    const markedUpEquipment = equipment * (this.settings.partsMarkup || 1);
    const freight = markedUpEquipment * (this.settings.freightPercent || 0);
    const totalEquipment = markedUpEquipment + freight;

    const perVisit = labor + mobilization + totalEquipment;
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
      equipment,
      markedUpEquipment,
      freight,
      totalEquipment,
      perVisit,
      annual,
      breakdown: {
        labor: `${config.laborHours} hrs × $${laborRate}`,
        mobilization: `${config.mobilizationHours} hrs × $${laborRate}`,
        equipment: `$${equipment.toFixed(2)} × ${this.settings.partsMarkup}`,
        freight: `${(this.settings.freightPercent * 100).toFixed(0)}% of equipment`
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
            <span class="detail-label">Equipment:</span>
            <span class="detail-value">$${calc.totalEquipment.toFixed(2)}</span>
            <span class="detail-breakdown">${calc.breakdown.equipment}</span>
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
  module.exports = { ServiceECard };
}
