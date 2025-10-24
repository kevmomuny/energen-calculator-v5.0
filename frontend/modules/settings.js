/**
 * Settings Frontend Module
 * Handles settings UI and modal integration
 * @module frontend/modules/settings
 * @version 4.5.0
 */

export class SettingsUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.modal = null;
    this.settings = {};
    this.isOpen = false;
  }

  init() {
    // Create modal structure in DOM
    this.createModal();
    
    // Register event listeners
    this.registerEvents();
    
    // Load current settings
    this.loadSettings();
  }

  createModal() {
    // Check if modal already exists
    if (document.getElementById('settings-modal')) {
      this.modal = document.getElementById('settings-modal');
      return;
    }

    // Create modal HTML
    const modalHTML = `
      <div id="settings-modal" class="settings-modal-overlay" style="display: none;">
        <div class="settings-modal-container">
          <div class="settings-modal-header">
            <h2 class="settings-modal-title">⚙️ Settings</h2>
            <button class="settings-modal-close" onclick="settingsUI.close()">×</button>
          </div>
          
          <div class="settings-modal-body">
            <div class="settings-tabs">
              <button class="settings-tab active" data-tab="general">General</button>
              <button class="settings-tab" data-tab="pricing">Pricing</button>
              <button class="settings-tab" data-tab="api">API Configuration</button>
              <button class="settings-tab" data-tab="appearance">Appearance</button>
            </div>
            
            <div class="settings-content">
              <!-- General Tab -->
              <div class="settings-panel active" data-panel="general">
                <div class="settings-group">
                  <h3>Company Information</h3>
                  <div class="setting-item">
                    <label>Shop Location</label>
                    <input type="text" id="shop-address" placeholder="150 Mason Circle, Concord, CA">
                  </div>
                  <div class="setting-item">
                    <label>Default Distance Unit</label>
                    <select id="distance-unit">
                      <option value="miles">Miles</option>
                      <option value="km">Kilometers</option>
                    </select>
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Sync Settings</h3>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="auto-save"> 
                      Enable Auto-Save
                    </label>
                  </div>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="zoho-sync"> 
                      Enable Zoho CRM Sync
                    </label>
                  </div>
                </div>
              </div>
              
              <!-- Pricing Tab -->
              <div class="settings-panel" data-panel="pricing">
                <div class="settings-group">
                  <h3>Labor Rates</h3>
                  <div class="setting-item">
                    <label>Standard Labor Rate ($/hr)</label>
                    <input type="number" id="labor-rate" value="191" min="0" step="1">
                  </div>
                  <div class="setting-item">
                    <label>Travel Rate ($/hr)</label>
                    <input type="number" id="travel-rate" value="191" min="0" step="1">
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Markups & Taxes</h3>
                  <div class="setting-item">
                    <label>Material Markup (%)</label>
                    <input type="number" id="markup-rate" value="20" min="0" max="100" step="1">
                  </div>
                  <div class="setting-item">
                    <label>Default Tax Rate (%)</label>
                    <input type="number" id="tax-rate" value="8.75" min="0" max="50" step="0.25">
                  </div>
                  <div class="setting-item">
                    <label>Annual Price Increase (%)</label>
                    <input type="number" id="annual-increase" value="3" min="0" max="20" step="0.5">
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Material Costs</h3>
                  <div class="setting-item">
                    <label>Oil Cost ($/gallon)</label>
                    <input type="number" id="oil-cost" value="88" min="0" step="1">
                  </div>
                  <div class="setting-item">
                    <label>Coolant Cost ($/gallon)</label>
                    <input type="number" id="coolant-cost" value="32" min="0" step="1">
                  </div>
                </div>
              </div>
              
              <!-- API Tab -->
              <div class="settings-panel" data-panel="api">
                <div class="settings-group">
                  <h3>Google Services</h3>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="google-maps-enabled" checked> 
                      Enable Google Maps Integration
                    </label>
                  </div>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="google-places-enabled" checked> 
                      Enable Google Places Enrichment
                    </label>
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Integration Services</h3>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="pdf-enabled" checked> 
                      Enable PDF Generation
                    </label>
                  </div>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="tax-lookup-enabled" checked> 
                      Enable Tax Rate Lookup
                    </label>
                  </div>
                </div>
              </div>
              
              <!-- Appearance Tab -->
              <div class="settings-panel" data-panel="appearance">
                <div class="settings-group">
                  <h3>Theme</h3>
                  <div class="setting-item">
                    <label>Color Theme</label>
                    <select id="theme">
                      <option value="dark">Dark Mode (Command Center)</option>
                      <option value="light">Light Mode</option>
                      <option value="auto">System Default</option>
                    </select>
                  </div>
                </div>
                
                <div class="settings-group">
                  <h3>Display Options</h3>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="show-metrics" checked> 
                      Show Metrics Dashboard
                    </label>
                  </div>
                  <div class="setting-item">
                    <label>
                      <input type="checkbox" id="show-animations" checked> 
                      Enable UI Animations
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-modal-footer">
            <button class="settings-btn settings-btn-secondary" onclick="settingsUI.reset()">
              Reset to Defaults
            </button>
            <div>
              <button class="settings-btn settings-btn-secondary" onclick="settingsUI.close()">
                Cancel
              </button>
              <button class="settings-btn settings-btn-primary" onclick="settingsUI.save()">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('settings-modal');
    
    // Add styles
    this.addStyles();
    
    // Setup tab switching
    this.setupTabs();
  }

  addStyles() {
    if (document.getElementById('settings-modal-styles')) return;
    
    const styles = `
      <style id="settings-modal-styles">
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(5px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }
        
        .settings-modal-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          width: 90%;
          max-width: 900px;
          height: 85vh;
          max-height: 700px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }
        
        .settings-modal-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-tertiary);
        }
        
        .settings-modal-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }
        
        .settings-modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
        }
        
        .settings-modal-close:hover {
          color: var(--text-primary);
        }
        
        .settings-modal-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
        
        .settings-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
        }
        
        .settings-tab {
          background: none;
          border: none;
          color: var(--text-secondary);
          padding: 10px 15px;
          cursor: pointer;
          font-size: 12px;
          border-bottom: 2px solid transparent;
        }
        
        .settings-tab:hover {
          color: var(--text-primary);
        }
        
        .settings-tab.active {
          color: var(--accent-blue);
          border-bottom-color: var(--accent-blue);
        }
        
        .settings-panel {
          display: none;
        }
        
        .settings-panel.active {
          display: block;
        }
        
        .settings-group {
          margin-bottom: 30px;
        }
        
        .settings-group h3 {
          color: var(--text-primary);
          font-size: 14px;
          margin-bottom: 15px;
        }
        
        .setting-item {
          margin-bottom: 15px;
        }
        
        .setting-item label {
          display: block;
          color: var(--text-secondary);
          font-size: 11px;
          margin-bottom: 5px;
        }
        
        .setting-item input[type="text"],
        .setting-item input[type="number"],
        .setting-item select {
          width: 100%;
          padding: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-primary);
          font-size: 11px;
        }
        
        .setting-item input[type="checkbox"] {
          margin-right: 8px;
        }
        
        .settings-modal-footer {
          padding: 20px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .settings-btn {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .settings-btn-primary {
          background: var(--accent-blue);
          color: white;
        }
        
        .settings-btn-primary:hover {
          background: var(--accent-electric);
        }
        
        .settings-btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }
        
        .settings-btn-secondary:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }

  setupTabs() {
    const tabs = this.modal.querySelectorAll('.settings-tab');
    const panels = this.modal.querySelectorAll('.settings-panel');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active from all
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
        
        // Add active to clicked
        tab.classList.add('active');
        const panel = this.modal.querySelector(`[data-panel="${tab.dataset.tab}"]`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  registerEvents() {
    // Listen for settings events from eventBus
    if (this.eventBus) {
      this.eventBus.on('settings:open', () => this.open());
      this.eventBus.on('settings:close', () => this.close());
      this.eventBus.on('settings:changed', (settings) => {
        this.settings = settings;
        this.updateUI();
      });
    }
  }

  loadSettings() {
    // Request current settings via eventBus
    if (this.eventBus) {
      this.eventBus.emit('settings:get', (settings) => {
        this.settings = settings;
        this.updateUI();
      });
    } else {
      // Load from localStorage as fallback
      const saved = localStorage.getItem('energen_settings');
      if (saved) {
        this.settings = JSON.parse(saved);
        this.updateUI();
      }
    }
  }

  updateUI() {
    // Update form fields with current settings
    const fields = {
      'shop-address': this.settings.shopLocation?.address,
      'labor-rate': this.settings.laborRate,
      'travel-rate': this.settings.travelRate || this.settings.laborRate,
      'markup-rate': (this.settings.markupRate * 100) || 20,
      'tax-rate': (this.settings.taxRate * 100) || 8.75,
      'annual-increase': (this.settings.annualIncrease * 100) || 3,
      'oil-cost': this.settings.oilCost || 88,
      'coolant-cost': this.settings.coolantCost || 32,
      'theme': this.settings.theme || 'dark',
      'distance-unit': this.settings.distanceUnit || 'miles'
    };
    
    for (const [id, value] of Object.entries(fields)) {
      const element = document.getElementById(id);
      if (element) element.value = value;
    }
    
    // Update checkboxes
    const checkboxes = {
      'auto-save': this.settings.autoSave !== false,
      'zoho-sync': this.settings.api?.zohoSyncEnabled !== false,
      'google-maps-enabled': this.settings.api?.googleMapsEnabled !== false,
      'google-places-enabled': this.settings.api?.googlePlacesEnabled !== false,
      'pdf-enabled': this.settings.api?.pdfGenerationEnabled !== false,
      'tax-lookup-enabled': this.settings.api?.taxLookupEnabled !== false,
      'show-metrics': this.settings.display?.showMetrics !== false,
      'show-animations': this.settings.display?.showAnimations !== false
    };
    
    for (const [id, checked] of Object.entries(checkboxes)) {
      const element = document.getElementById(id);
      if (element) element.checked = checked;
    }
  }

  open() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.isOpen = true;
      this.loadSettings();
    }
  }

  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
      this.isOpen = false;
    }
  }

  save() {
    // Collect values from form
    const newSettings = {
      laborRate: parseFloat(document.getElementById('labor-rate')?.value) || 191,
      travelRate: parseFloat(document.getElementById('travel-rate')?.value) || 191,
      markupRate: (parseFloat(document.getElementById('markup-rate')?.value) || 20) / 100,
      taxRate: (parseFloat(document.getElementById('tax-rate')?.value) || 8.75) / 100,
      annualIncrease: (parseFloat(document.getElementById('annual-increase')?.value) || 3) / 100,
      oilCost: parseFloat(document.getElementById('oil-cost')?.value) || 88,
      coolantCost: parseFloat(document.getElementById('coolant-cost')?.value) || 32,
      theme: document.getElementById('theme')?.value || 'dark',
      distanceUnit: document.getElementById('distance-unit')?.value || 'miles',
      autoSave: document.getElementById('auto-save')?.checked,
      shopLocation: {
        ...this.settings.shopLocation,
        address: document.getElementById('shop-address')?.value
      },
      api: {
        googleMapsEnabled: document.getElementById('google-maps-enabled')?.checked,
        googlePlacesEnabled: document.getElementById('google-places-enabled')?.checked,
        zohoSyncEnabled: document.getElementById('zoho-sync')?.checked,
        pdfGenerationEnabled: document.getElementById('pdf-enabled')?.checked,
        taxLookupEnabled: document.getElementById('tax-lookup-enabled')?.checked
      },
      display: {
        showMetrics: document.getElementById('show-metrics')?.checked,
        showAnimations: document.getElementById('show-animations')?.checked
      }
    };
    
    // Save via eventBus
    if (this.eventBus) {
      this.eventBus.emit('settings:update', {
        settings: newSettings,
        callback: (result) => {
          if (result.success) {
            this.close();
            this.showNotification('Settings saved successfully');
          }
        }
      });
    } else {
      // Save to localStorage as fallback
      localStorage.setItem('energen_settings', JSON.stringify(newSettings));
      this.settings = newSettings;
      this.close();
      this.showNotification('Settings saved successfully');
    }
  }

  reset() {
    if (confirm('Reset all settings to defaults?')) {
      if (this.eventBus) {
        this.eventBus.emit('settings:reset', (result) => {
          if (result.success) {
            this.settings = result.settings;
            this.updateUI();
            this.showNotification('Settings reset to defaults');
          }
        });
      }
    }
  }

  showNotification(message) {
    // Show status message in UI
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.style.color = 'var(--accent-success)';
      setTimeout(() => {
        statusElement.textContent = 'Ready';
        statusElement.style.color = 'var(--text-tertiary)';
      }, 3000);
    }
  }
}

// Create global instance for easy access
window.settingsUI = null;

// Export for module usage
export default SettingsUI;