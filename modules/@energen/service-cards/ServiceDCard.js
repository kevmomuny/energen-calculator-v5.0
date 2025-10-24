/**
 * Service D Card Module - Fuel Analysis Only (Annual)
 * @module @energen/service-cards/ServiceDCard
 * @version 4.5.0
 * 
 * IMPORTANT: Service D is FUEL ANALYSIS ONLY
 * - Oil analysis is included in Service B (Oil & Filter Service)
 * - Coolant analysis is included in Service C (Coolant Service)
 * - Fuel analysis is a standalone annual test at fixed $60 cost
 * - NO LABOR OR MOBILIZATION - this is just the lab fee
 */

export class ServiceDCard {
  constructor(settings = null, kWRange = 80) {
    this.settings = settings || this.loadSettingsFromStorage();
    this.kWRange = kWRange;
    this.frequency = 1; // Annual analysis
    this.serviceCode = 'D';
    this.serviceName = 'Fuel Analysis';
    this.description = 'Annual fuel quality analysis';
    
    // FIXED COST - Fuel analysis only (no oil/coolant in Service D)
    this.fuelAnalysisCost = 60.00;
    
    // NO LABOR - Sample collection happens during other services
    // Labor is already accounted for in the service that triggers the sample
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
    
    // Default settings
    return {
      labor: {
        straightTime: 191,
        overtime: 255.50,
        doubleTime: 382
      },
      calculationMode: 'standard',
      serviceD: {
        laborHours: 0.5,
        mobilizationHours: 1, // Minimal mobilization for sample collection
        oilSample: 16.55,
        fuelSample: 60.00,
        coolantSample: 16.55
      },
      partsMarkup: 1.2,
      freightPercent: 0.05
    };
  }

  calculateService() {
    // Service D is FUEL ANALYSIS ONLY - Fixed cost, no labor or mobilization
    // Oil analysis is in Service B, Coolant analysis is in Service C
    
    const fuelSample = this.fuelAnalysisCost; // Fixed $60.00
    
    // NO LABOR, NO MOBILIZATION, NO PARTS
    // This is a pass-through lab fee only
    const labor = 0;
    const mobilization = 0;
    const parts = 0;
    const freight = 0;
    
    // Fixed cost service
    const perVisit = fuelSample;
    const annual = perVisit * this.frequency;
    
    return {
      serviceCode: this.serviceCode,
      serviceName: this.serviceName,
      kwRange: 'All',  // Service D is the same for all kW ranges
      frequency: this.frequency,
      laborHours: 0,
      mobilizationHours: 0,
      labor,
      mobilization,
      fuelSample,
      parts,
      freight,
      perVisit,
      annual,
      breakdown: {
        fuelAnalysis: `Annual fuel quality lab test (fixed cost)`
      }
    };
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    return this.calculateService();
  }

  updateKW(newKW) {
    // Service D doesn't vary by kW, but we store it for consistency
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
            <span class="detail-label">Applies to:</span>
            <span class="detail-value">All kW ranges</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service Type:</span>
            <span class="detail-value">Fixed Cost Lab Analysis</span>
          </div>
          <div class="detail-row section-header">
            <span class="detail-label">Fuel Analysis Lab Fee:</span>
            <span class="detail-value highlight">$${calc.fuelSample.toFixed(2)}</span>
          </div>
          <div class="detail-row info-text">
            <span class="detail-note" style="font-size: 12px; color: #666;">
              • No labor or mobilization charges<br>
              • Oil analysis included in Service B ($16.55)<br>
              • Coolant analysis included in Service C ($16.55)<br>
              • Total fluid analysis costs: $93.10/year
            </span>
          </div>
          <div class="detail-row total-row">
            <span class="detail-label">Annual Cost:</span>
            <span class="detail-value highlight">$${calc.annual.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="service-total">
          <span class="total-label">Annual Total:</span>
          <span class="total-value">$${calc.annual.toFixed(2)}</span>
        </div>
        
        <style>
          .sub-item {
            padding-left: 20px;
          }
          .sub-item .detail-label {
            font-size: 13px;
          }
          .section-header {
            margin-top: 10px;
            font-weight: 600;
          }
        </style>
      </div>
    `;
  }

  toJSON() {
    return this.calculateService();
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ServiceDCard };
}