/**
 * Enhanced Calculator UI with Cost Type Indicators
 * Shows clear distinction between fixed and variable costs
 * @module @energen/service-cards/EnhancedCalculatorUI
 * @version 4.5.0
 */

import {
  createAllServiceCards,
  calculateBundleTotal,
  updateAllSettings,
  updateAllKW
} from './index.js';

export class EnhancedCalculatorUI {
  constructor(containerId = 'calculator-container', settings = null) {
    this.container = document.getElementById(containerId);
    this.settings = settings || this.loadSettings();
    this.kWRange = 80;
    this.services = createAllServiceCards(this.settings, this.kWRange);
    this.enabledStates = { A: true, B: true, C: true, D: true, E: true };

    this.init();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem('energenSettings');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not load settings:', e);
    }

    return {
      labor: { straightTime: 191 },
      calculationMode: 'standard',
      partsMarkup: 1.2,
      freightPercent: 0.05,
      oilMarkup: 1.5,
      coolantMarkup: 1.5
    };
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.listenForSettingsChanges();
  }

  render() {
    const bundle = calculateBundleTotal(this.services, this.enabledStates);
    const costBreakdown = this.calculateCostBreakdown();

    this.container.innerHTML = `
      <div class="enhanced-calculator">
        <div class="calculator-header">
          <h2>Service Calculator - ${this.kWRange} kW Generator</h2>
          <div class="kw-selector">
            <label>Generator Size:</label>
            <select id="kw-selector">
              <option value="25" ${this.kWRange === 25 ? 'selected' : ''}>25 kW</option>
              <option value="80" ${this.kWRange === 80 ? 'selected' : ''}>80 kW</option>
              <option value="150" ${this.kWRange === 150 ? 'selected' : ''}>150 kW</option>
              <option value="250" ${this.kWRange === 250 ? 'selected' : ''}>250 kW</option>
              <option value="500" ${this.kWRange === 500 ? 'selected' : ''}>500 kW</option>
              <option value="1000" ${this.kWRange === 1000 ? 'selected' : ''}>1000 kW</option>
            </select>
          </div>
        </div>

        <div class="cost-type-indicators">
          <div class="indicator fixed-cost">
            <span class="indicator-icon">🔒</span>
            <span class="indicator-label">Fixed Costs (Lab Fees)</span>
            <span class="indicator-value">$${costBreakdown.fixedCosts.toFixed(2)}</span>
            <span class="indicator-note">Always $93.10 regardless of kW</span>
          </div>
          <div class="indicator variable-cost">
            <span class="indicator-icon">📊</span>
            <span class="indicator-label">Variable Costs</span>
            <span class="indicator-value">$${costBreakdown.variableCosts.toFixed(2)}</span>
            <span class="indicator-note">Scales with generator size & labor rates</span>
          </div>
        </div>

        <div class="services-grid">
          ${this.renderServices()}
        </div>

        <div class="bundle-summary">
          <div class="summary-header">
            <h3>Annual Service Bundle</h3>
            <div class="summary-stats">
              <span>${bundle.enabledCount} of ${bundle.totalServices} services selected</span>
            </div>
          </div>
          
          <div class="cost-breakdown">
            <div class="breakdown-row">
              <span class="breakdown-label">Labor & Mobilization:</span>
              <span class="breakdown-value">$${costBreakdown.labor.toFixed(2)}</span>
              <span class="cost-type variable">Variable</span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">Parts (with ${(this.settings.partsMarkup - 1) * 100}% markup):</span>
              <span class="breakdown-value">$${costBreakdown.parts.toFixed(2)}</span>
              <span class="cost-type variable">Variable</span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">Consumables (oil/coolant):</span>
              <span class="breakdown-value">$${costBreakdown.consumables.toFixed(2)}</span>
              <span class="cost-type variable">Variable</span>
            </div>
            <div class="breakdown-row">
              <span class="breakdown-label">Freight (${this.settings.freightPercent * 100}%):</span>
              <span class="breakdown-value">$${costBreakdown.freight.toFixed(2)}</span>
              <span class="cost-type variable">Variable</span>
            </div>
            <div class="breakdown-row highlight">
              <span class="breakdown-label">Fluid Analysis (Lab Fees):</span>
              <span class="breakdown-value">$${costBreakdown.fixedCosts.toFixed(2)}</span>
              <span class="cost-type fixed">Fixed</span>
            </div>
          </div>
          
          <div class="total-row">
            <span class="total-label">Total Annual Cost:</span>
            <span class="total-value">$${bundle.total.toFixed(2)}</span>
          </div>
          
          <div class="fluid-analysis-detail">
            <h4>Fluid Analysis Breakdown (Fixed Costs):</h4>
            <ul>
              <li>Oil Analysis (Service B): $16.55</li>
              <li>Coolant Analysis (Service C): $16.55</li>
              <li>Fuel Analysis (Service D): $60.00</li>
              <li class="total">Total Fluid Analysis: $93.10</li>
            </ul>
          </div>
        </div>
      </div>

      <style>
        .enhanced-calculator {
          font-family: 'Segoe UI', system-ui, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .calculator-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e0e0e0;
        }

        .cost-type-indicators {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 15px;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .indicator.fixed-cost {
          background: #e8f5e9;
          border: 1px solid #4caf50;
        }

        .indicator.variable-cost {
          background: #fff3e0;
          border: 1px solid #ff9800;
        }

        .indicator-icon {
          font-size: 24px;
        }

        .indicator-label {
          font-weight: 600;
          flex: 1;
        }

        .indicator-value {
          font-size: 20px;
          font-weight: bold;
        }

        .indicator-note {
          font-size: 12px;
          color: #666;
          display: block;
          width: 100%;
          margin-top: 5px;
        }

        .services-grid {
          display: grid;
          gap: 20px;
          margin-bottom: 30px;
        }

        .service-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .service-card.has-fixed-cost {
          background: linear-gradient(90deg, #e8f5e9 5px, white 5px);
        }

        .fluid-indicator {
          display: inline-block;
          background: #4caf50;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          margin-left: 10px;
        }

        .bundle-summary {
          background: #f5f5f5;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .cost-breakdown {
          margin: 20px 0;
          padding: 15px;
          background: white;
          border-radius: 8px;
        }

        .breakdown-row {
          display: flex;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .breakdown-row.highlight {
          background: #e8f5e9;
          margin: 10px -15px;
          padding: 10px 15px;
          border-radius: 4px;
          border: 1px solid #4caf50;
        }

        .breakdown-label {
          flex: 1;
          font-weight: 500;
        }

        .breakdown-value {
          font-weight: 600;
          margin-right: 15px;
        }

        .cost-type {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .cost-type.fixed {
          background: #4caf50;
          color: white;
        }

        .cost-type.variable {
          background: #ff9800;
          color: white;
        }

        .fluid-analysis-detail {
          margin-top: 20px;
          padding: 15px;
          background: #e8f5e9;
          border-radius: 8px;
          border: 1px solid #4caf50;
        }

        .fluid-analysis-detail h4 {
          margin: 0 0 10px 0;
          color: #2e7d32;
        }

        .fluid-analysis-detail ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .fluid-analysis-detail li {
          padding: 5px 0;
          color: #1b5e20;
        }

        .fluid-analysis-detail li.total {
          font-weight: bold;
          border-top: 1px solid #4caf50;
          margin-top: 5px;
          padding-top: 10px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #333;
          font-size: 24px;
          font-weight: bold;
        }
      </style>
    `;
  }

  renderServices() {
    return Object.entries(this.services)
      .map(([code, service]) => {
        const calc = service.calculateService();
        const hasFluidAnalysis =
          (code === 'B' && calc.oilAnalysisCost) ||
          (code === 'C' && calc.sampleCost) ||
          (code === 'D');

        return `
          <div class="service-card ${hasFluidAnalysis ? 'has-fixed-cost' : ''}" data-service="${code}">
            <div class="service-header">
              <input type="checkbox" 
                     id="service-${code}" 
                     ${this.enabledStates[code] ? 'checked' : ''}
                     class="service-toggle">
              <label for="service-${code}">
                <span class="service-code">Service ${code}</span>
                <span class="service-name">${calc.serviceName}</span>
                ${hasFluidAnalysis ? '<span class="fluid-indicator">Includes Lab Analysis</span>' : ''}
              </label>
              <span class="service-annual">$${calc.annual.toFixed(2)}/year</span>
            </div>
            <div class="service-details">
              <span class="frequency">${calc.frequency}x per year</span>
              <span class="per-visit">$${calc.perVisit.toFixed(2)} per visit</span>
              ${this.renderFluidAnalysisInfo(code, calc)}
            </div>
          </div>
        `;
      })
      .join('');
  }

  renderFluidAnalysisInfo(code, calc) {
    if (code === 'B' && calc.oilAnalysisCost) {
      return '<div class="fluid-note">↳ Includes $16.55 oil analysis (fixed cost)</div>';
    }
    if (code === 'C' && calc.sampleCost) {
      return '<div class="fluid-note">↳ Includes $16.55 coolant analysis (fixed cost)</div>';
    }
    if (code === 'D') {
      return '<div class="fluid-note">↳ $60.00 fuel analysis only (no labor/mobilization)</div>';
    }
    return '';
  }

  calculateCostBreakdown() {
    let labor = 0;
    let parts = 0;
    let consumables = 0;
    let freight = 0;
    let fixedCosts = 0;

    Object.entries(this.services).forEach(([code, service]) => {
      if (!this.enabledStates[code]) return;

      const calc = service.calculateService();
      labor += (calc.labor || 0) + (calc.mobilization || 0);
      parts += (calc.markedUpParts || calc.markedUpFilter || calc.markedUpEquipment || 0);
      consumables += (calc.markedUpOil || calc.markedUpCoolant || 0);
      freight += (calc.freight || 0);
      fixedCosts += (calc.oilAnalysisCost || 0) + (calc.sampleCost || 0) + (calc.fuelSample || 0);
    });

    return {
      labor,
      parts,
      consumables,
      freight,
      fixedCosts,
      variableCosts: labor + parts + consumables + freight,
      total: labor + parts + consumables + freight + fixedCosts
    };
  }

  attachEventListeners() {
    // Service toggles
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('service-toggle')) {
        const service = e.target.id.replace('service-', '');
        this.enabledStates[service] = e.target.checked;
        this.render();
      }
    });

    // kW selector
    const kwSelector = this.container.querySelector('#kw-selector');
    if (kwSelector) {
      kwSelector.addEventListener('change', (e) => {
        this.kWRange = parseInt(e.target.value);
        updateAllKW(this.services, this.kWRange);
        this.render();
      });
    }
  }

  listenForSettingsChanges() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'energenSettings') {
        this.settings = JSON.parse(e.newValue);
        updateAllSettings(this.services, this.settings);
        this.render();
      }
    });

    window.addEventListener('message', (e) => {
      if (e.data.type === 'settingsUpdate') {
        this.settings = e.data.settings;
        updateAllSettings(this.services, this.settings);
        this.render();
      }
    });
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.EnhancedCalculatorUI = EnhancedCalculatorUI;
}

// Export for module use
export default EnhancedCalculatorUI;
