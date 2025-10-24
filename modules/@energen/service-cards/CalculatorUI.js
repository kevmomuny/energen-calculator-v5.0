/**
 * Calculator UI Integration Module
 * Wires service cards together and manages bundle calculations
 * @module @energen/service-cards/CalculatorUI
 * @version 4.5.0
 */

import { ServiceACard } from './ServiceACard.js';
import { ServiceBCard } from './ServiceBCard.js';
import { ServiceECard } from './ServiceECard.js';

export class CalculatorUI {
  constructor(containerElement) {
    this.container = containerElement || document.getElementById('calculator-container');
    this.settings = this.loadSettings();
    this.kWInput = 80; // Default kW
    this.services = {};
    this.serviceStates = {
      A: true,
      B: true,
      C: false, // Not implemented yet
      D: false, // Not implemented yet
      E: true
    };
    
    this.calculationTimeout = null;
    this.isCalculating = false;
    
    this.init();
  }

  init() {
    // Initialize service cards
    this.services.A = new ServiceACard(this.settings, this.kWInput);
    this.services.B = new ServiceBCard(this.settings, this.kWInput);
    this.services.E = new ServiceECard(this.settings, this.kWInput);
    
    // Listen for settings updates
    this.attachEventListeners();
    
    // Initial render
    this.render();
    
    // Initial calculation
    this.recalculateAll();
  }

  loadSettings() {
    try {
      const stored = localStorage.getItem('energenSettings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
    
    // Default settings
    return {
      labor: { straightTime: 191 },
      calculationMode: 'standard',
      partsMarkup: 1.2,
      freightPercent: 0.05
    };
  }

  attachEventListeners() {
    // Listen for settings updates from Settings Modal
    window.addEventListener('message', (event) => {
      if (event.data.type === 'SETTINGS_UPDATED' || event.data.type === 'settingsUpdate') {
        this.handleSettingsUpdate(event.data.settings || event.data.data);
      }
    });
    
    // Listen for localStorage changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'energenSettings') {
        this.settings = JSON.parse(event.newValue);
        this.recalculateAll();
      }
    });
  }

  handleSettingsUpdate(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('energenSettings', JSON.stringify(this.settings));
    
    // Update all service cards with new settings
    Object.values(this.services).forEach(service => {
      if (service && service.updateSettings) {
        service.updateSettings(this.settings);
      }
    });
    
    this.recalculateAll();
  }

  handleKwChange(value) {
    this.kWInput = parseFloat(value) || 80;
    this.isCalculating = true;
    
    // Show calculating state
    this.showCalculatingState();
    
    // Debounce calculation for performance
    clearTimeout(this.calculationTimeout);
    this.calculationTimeout = setTimeout(() => {
      this.recalculateAll();
      this.isCalculating = false;
    }, 300);
  }

  handleServiceToggle(serviceCode, enabled) {
    this.serviceStates[serviceCode] = enabled;
    this.updateBundleTotal();
  }

  recalculateAll() {
    // Update kW for all services
    Object.values(this.services).forEach(service => {
      if (service && service.updateKW) {
        service.updateKW(this.kWInput);
      }
    });
    
    // Update display
    this.updateServiceCards();
    this.updateBundleTotal();
  }

  updateServiceCards() {
    // Update each service card display
    Object.entries(this.services).forEach(([code, service]) => {
      if (service) {
        const cardElement = document.querySelector(`[data-service="${code}"]`);
        if (cardElement) {
          const calc = service.calculateService();
          
          // Update annual total
          const totalElement = cardElement.querySelector('.total-value');
          if (totalElement) {
            totalElement.textContent = `$${calc.annual.toFixed(2)}`;
          }
          
          // Update per visit
          const perVisitElement = cardElement.querySelector('.detail-value.highlight');
          if (perVisitElement) {
            perVisitElement.textContent = `$${calc.perVisit.toFixed(2)}`;
          }
        }
      }
    });
  }

  updateBundleTotal() {
    let total = 0;
    
    Object.entries(this.services).forEach(([code, service]) => {
      if (service && this.serviceStates[code]) {
        const calc = service.calculateService();
        total += calc.annual;
      }
    });
    
    // Update bundle total display
    const bundleTotalElement = document.getElementById('bundle-total');
    if (bundleTotalElement) {
      bundleTotalElement.textContent = `$${total.toFixed(2)}`;
      
      // Add animation effect
      bundleTotalElement.classList.add('updating');
      setTimeout(() => {
        bundleTotalElement.classList.remove('updating');
      }, 300);
    }
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('bundleTotalUpdated', {
      detail: { total, services: this.getServiceBreakdown() }
    }));
    
    return total;
  }

  getServiceBreakdown() {
    const breakdown = {};
    
    Object.entries(this.services).forEach(([code, service]) => {
      if (service) {
        breakdown[code] = {
          enabled: this.serviceStates[code],
          calculation: service.calculateService()
        };
      }
    });
    
    return breakdown;
  }

  showCalculatingState() {
    const statusElement = document.getElementById('calculation-status');
    if (statusElement) {
      statusElement.textContent = 'Calculating...';
      statusElement.classList.add('visible');
    }
  }

  hideCalculatingState() {
    const statusElement = document.getElementById('calculation-status');
    if (statusElement) {
      statusElement.classList.remove('visible');
    }
  }

  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="calculator-ui">
        <div class="calculator-header">
          <h2>Service Bundle Calculator</h2>
          <div class="calculation-mode">
            Mode: <span id="calc-mode">${this.settings.calculationMode}</span>
          </div>
        </div>
        
        <div class="kw-input-section">
          <label for="kw-input">Generator kW Rating:</label>
          <input 
            type="number" 
            id="kw-input" 
            value="${this.kWInput}" 
            min="2" 
            max="2050"
            step="1"
            class="kw-input"
          >
          <span id="calculation-status" class="status-indicator"></span>
        </div>
        
        <div class="service-cards-container">
          ${this.services.A ? this.services.A.render() : ''}
          ${this.services.B ? this.services.B.render() : ''}
          ${this.services.E ? this.services.E.render() : ''}
        </div>
        
        <div class="bundle-total-section">
          <div class="bundle-total">
            <span class="total-label">Bundle Total:</span>
            <span id="bundle-total" class="total-amount">$0.00</span>
          </div>
          <div class="bundle-actions">
            <button class="btn btn-primary" onclick="window.generateQuote()">
              Generate Quote
            </button>
            <button class="btn" onclick="window.openSettings()">
              Settings
            </button>
          </div>
        </div>
      </div>
      
      <style>
        .calculator-ui {
          padding: 20px;
          background: #12141a;
          color: #e4e6eb;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .kw-input-section {
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .kw-input {
          padding: 8px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          color: white;
          font-size: 16px;
          width: 120px;
        }
        
        .service-cards-container {
          display: grid;
          gap: 20px;
          margin: 30px 0;
        }
        
        .service-card {
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 12px;
          padding: 20px;
        }
        
        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .service-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .service-code {
          font-weight: bold;
          color: #60a5fa;
        }
        
        .service-details {
          display: grid;
          gap: 10px;
          margin: 15px 0;
        }
        
        .detail-row {
          display: grid;
          grid-template-columns: 120px 100px 1fr;
          gap: 10px;
          align-items: center;
          font-size: 14px;
        }
        
        .detail-label {
          color: #9ca3af;
        }
        
        .detail-value {
          font-weight: 600;
          color: #e4e6eb;
        }
        
        .detail-value.highlight {
          color: #60a5fa;
        }
        
        .detail-breakdown {
          color: #6b7280;
          font-size: 12px;
        }
        
        .service-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #374151;
        }
        
        .total-value {
          font-size: 20px;
          font-weight: bold;
          color: #60a5fa;
        }
        
        .bundle-total-section {
          margin-top: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #1f2937, #111827);
          border-radius: 12px;
          border: 2px solid #3b82f6;
        }
        
        .bundle-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        #bundle-total {
          font-size: 32px;
          font-weight: bold;
          color: #60a5fa;
        }
        
        #bundle-total.updating {
          animation: pulse 0.3s ease;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .bundle-actions {
          display: flex;
          gap: 10px;
        }
        
        .btn {
          padding: 10px 20px;
          background: #374151;
          border: 1px solid #4b5563;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn:hover {
          background: #4b5563;
        }
        
        .btn-primary {
          background: #3b82f6;
          border-color: #2563eb;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .status-indicator {
          opacity: 0;
          transition: opacity 0.2s;
          color: #60a5fa;
          font-size: 12px;
        }
        
        .status-indicator.visible {
          opacity: 1;
        }
      </style>
    `;
    
    // Attach event handlers after rendering
    this.attachDOMEventHandlers();
  }

  attachDOMEventHandlers() {
    // kW input handler
    const kwInput = document.getElementById('kw-input');
    if (kwInput) {
      kwInput.addEventListener('input', (e) => {
        this.handleKwChange(e.target.value);
      });
    }
    
    // Service toggle handlers
    document.querySelectorAll('.service-toggle').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const serviceCode = e.target.id.replace('service-', '');
        this.handleServiceToggle(serviceCode, e.target.checked);
      });
    });
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.CalculatorUI = CalculatorUI;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalculatorUI };
}