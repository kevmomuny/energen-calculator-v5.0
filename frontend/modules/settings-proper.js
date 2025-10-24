/**
 * Proper Settings Module - Opens settings-modal-excel-actual.html
 * This is the correct implementation for v4.5 with Excel parity
 * @module frontend/modules/settings-proper
 * @version 4.5.0
 */

export class SettingsUI {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.modalWindow = null;
    this.modalFrame = null;
    this.isOpen = false;
    this.settings = {};
    // Load settings asynchronously
    this.loadSettings().then(settings => {
      this.settings = settings;
    });
  }

  init() {
    // Listen for settings update events if eventBus is available
    if (this.eventBus) {
      this.eventBus.on('settings:updated', (data) => {
        this.settings = { ...this.settings, ...data };
        this.saveSettings();
      });
    }
  }

  open() {
    if (this.isOpen) {
      return;
    }
    // Method 1: Open in iframe overlay (preferred for integrated experience)
    this.openInIframe();
    
    // Alternative Method 2: Open in popup window (uncomment if preferred)
    // this.openInPopup();
  }

  openInIframe() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'settings-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    // Create iframe container
    const container = document.createElement('div');
    container.style.cssText = `
      width: 95%;
      max-width: 1400px;
      height: 90vh;
      max-height: 900px;
      background: #12141a;
      border: 1px solid #1f2937;
      border-radius: 12px;
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
      position: relative;
      animation: slideUp 0.3s ease;
    `;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      background: transparent;
      border: 1px solid #1f2937;
      border-radius: 6px;
      color: #9ca3af;
      font-size: 20px;
      cursor: pointer;
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = '#22252f';
      closeBtn.style.color = '#e4e6eb';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'transparent';
      closeBtn.style.color = '#9ca3af';
    };
    closeBtn.onclick = () => this.close();

    // Create iframe - use the ACTUAL EXCEL DATA settings modal
    const iframe = document.createElement('iframe');
    iframe.src = './settings-modal-excel-actual.html';
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    `;

    // Add animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Assemble and add to DOM
    container.appendChild(closeBtn);
    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Store references
    this.modalFrame = iframe;
    this.modalOverlay = overlay;
    this.isOpen = true;

    // Handle escape key
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Handle click outside
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.close();
      }
    };

    // Pass settings to iframe when loaded
    iframe.onload = () => {
      try {
        if (iframe.contentWindow && iframe.contentWindow.postMessage) {
          // Get prevailing wage data from parent window state
          const prevailingWageData = window.state?.prevailingWageData || null;
          
          iframe.contentWindow.postMessage({
            type: 'LOAD_SETTINGS',
            settings: this.settings,
            prevailingWageData: prevailingWageData
          }, '*');
        }
      } catch (error) {
        console.error('Error sending settings to iframe:', error);
      }
    };

    // Listen for settings updates from iframe
    window.addEventListener('message', this.handleMessage.bind(this));

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('settings:opened', {});
    }
  }

  openInPopup() {
    // Alternative: Open in popup window
    const width = 1000;
    const height = 700;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    this.modalWindow = window.open(
      './settings-modal-excel-actual.html',
      'EnergenSettings',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (this.modalWindow) {
      this.isOpen = true;
      
      // Check if window is closed
      const checkClosed = setInterval(() => {
        if (this.modalWindow.closed) {
          clearInterval(checkClosed);
          this.isOpen = false;
          if (this.eventBus) {
            this.eventBus.emit('settings:closed', {});
          }
        }
      }, 500);

      // Pass settings when loaded
      this.modalWindow.onload = () => {
        this.modalWindow.postMessage({
          type: 'LOAD_SETTINGS',
          settings: this.settings
        }, '*');
      };
    } else {
      alert('Unable to open settings. Please check your popup blocker settings.');
    }
  }

  close() {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    
    if (this.modalFrame) {
      this.modalFrame = null;
    }
    
    if (this.modalWindow) {
      this.modalWindow.close();
      this.modalWindow = null;
    }
    
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    
    window.removeEventListener('message', this.handleMessage);
    
    this.isOpen = false;
    
    if (this.eventBus) {
      this.eventBus.emit('settings:closed', {});
    }
  }

  handleMessage(event) {
    // Handle messages from settings modal
    if (!event.data || !event.data.type) return;

    switch (event.data.type) {
      case 'SAVE_SETTINGS':
        this.settings = { ...this.settings, ...event.data.settings };
        this.saveSettings();
        if (this.eventBus) {
          this.eventBus.emit('settings:updated', this.settings);
        }
        // Also post a window message for UI components that listen directly
        window.postMessage({
          type: 'SETTINGS_UPDATED',
          settings: this.settings
        }, '*');
        break;
        
      case 'CLOSE_SETTINGS':
        this.close();
        break;
        
      case 'GET_SETTINGS':
        // Respond with current settings
        const source = this.modalFrame ? this.modalFrame.contentWindow : this.modalWindow;
        if (source) {
          source.postMessage({
            type: 'LOAD_SETTINGS',
            settings: this.settings
          }, '*');
        }
        break;
    }
  }

  async loadSettings() {
    try {
      const stored = localStorage.getItem('energenSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate and merge with defaults to ensure all fields exist
        const module = await import('../config/default-settings-constants.js');
        return module.validateSettings(parsed);
      } else {
        // First time - use hard-coded defaults
        return await this.getDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      return await this.getDefaultSettings();
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('energenSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async getDefaultSettings() {
    // Import hard-coded defaults from the constants module
    try {
      const module = await import('../config/default-settings-constants.js');
      return module.getDefaultSettings();
    } catch (error) {
      console.error('Error loading default settings module:', error);
      // Fallback to inline defaults if module fails to load
      return {
        laborRate: 181.00,
        mobilizationRate: 181.00,
        mileageRate: 2.50,
        travelRate: 100.00,
        defaultTaxRate: 8.4,
        shopAddress: '150 Mason Circle, Suite K, Concord, CA 94520',
        distanceFromShop: 0
      };
    }
  }
}

export default SettingsUI;