/**
 * Zoho Sync Client Service
 * Handles real-time Zoho synchronization from frontend
 *
 * Features:
 * - Auto-sync on customer data entry
 * - Visual sync status indicators
 * - Error handling and retry
 * - Event-based notifications
 */

export class ZohoSyncClient {
  constructor() {
    this.apiBase = this.getApiBase();
    this.syncStatus = {
      customer: 'idle',
      contact: 'idle',
      logo: 'idle'
    };
    this.syncCallbacks = new Map();
  }

  /**
   * Get API base URL
   */
  getApiBase() {
    return window.location.hostname === 'localhost'
      ? 'http://localhost:3002'
      : window.location.origin;
  }

  /**
   * Sync customer data to Zoho
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Sync result
   */
  async syncCustomer(customerData) {
    try {
      this.updateSyncStatus('customer', 'syncing');
      this.showSyncIndicator('customer', 'syncing');

      const response = await fetch(`${this.apiBase}/api/zoho/sync-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      this.updateSyncStatus('customer', 'synced');
      this.showSyncIndicator('customer', 'synced');
      
      // BUG-003 FIX: Store last sync time in localStorage
      localStorage.setItem('zoho_last_sync_customer', new Date().toISOString());

      // Emit success event
      this.emitEvent('customerSynced', result);

      return result;

    } catch (error) {
      console.error('Customer sync failed:', error);
      this.updateSyncStatus('customer', 'error');
      this.showSyncIndicator('customer', 'error');

      // Emit error event
      this.emitEvent('syncError', { type: 'customer', error: error.message });

      throw error;
    }
  }

  /**
   * Sync contact data to Zoho
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Sync result
   */
  async syncContact(contactData) {
    try {
      this.updateSyncStatus('contact', 'syncing');
      this.showSyncIndicator('contact', 'syncing');

      const response = await fetch(`${this.apiBase}/api/zoho/sync-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      });

      if (!response.ok) {
        throw new Error(`Contact sync failed: ${response.status}`);
      }

      const result = await response.json();

      this.updateSyncStatus('contact', 'synced');
      this.showSyncIndicator('contact', 'synced');
      
      // BUG-003 FIX: Store last sync time in localStorage
      localStorage.setItem('zoho_last_sync_contact', new Date().toISOString());

      // Emit success event
      this.emitEvent('contactSynced', result);

      return result;

    } catch (error) {
      console.error('Contact sync failed:', error);
      this.updateSyncStatus('contact', 'error');
      this.showSyncIndicator('contact', 'error');

      // Emit error event
      this.emitEvent('syncError', { type: 'contact', error: error.message });

      throw error;
    }
  }

  /**
   * Sync logo to Zoho
   * @param {string} companyName - Company name
   * @param {string} logoUrl - Logo URL
   * @param {string} logoSource - Logo source (Brandfetch, etc.)
   * @returns {Promise<Object>} Sync result
   */
  async syncLogo(companyName, logoUrl, logoSource = '') {
    try {
      this.updateSyncStatus('logo', 'syncing');
      this.showSyncIndicator('logo', 'syncing');

      const response = await fetch(`${this.apiBase}/api/zoho/sync-logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, logoUrl, logoSource })
      });

      if (!response.ok) {
        throw new Error(`Logo sync failed: ${response.status}`);
      }

      const result = await response.json();

      this.updateSyncStatus('logo', 'synced');
      this.showSyncIndicator('logo', 'synced');
      
      // BUG-003 FIX: Store last sync time in localStorage
      localStorage.setItem('zoho_last_sync_logo', new Date().toISOString());

      // Emit success event
      this.emitEvent('logoSynced', result);

      return result;

    } catch (error) {
      console.error('Logo sync failed:', error);
      this.updateSyncStatus('logo', 'error');
      this.showSyncIndicator('logo', 'error');

      // Emit error event
      this.emitEvent('syncError', { type: 'logo', error: error.message });

      throw error;
    }
  }

  /**
   * Get sync queue status
   * @returns {Promise<Object>} Queue status
   */
  async getSyncStatus() {
    try {
      const response = await fetch(`${this.apiBase}/api/zoho/sync-status`);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Status check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test Zoho connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.apiBase}/api/zoho/test-connection`);

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.connected;

    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update internal sync status
   */
  updateSyncStatus(type, status) {
    this.syncStatus[type] = status;
  }

  /**
   * Get current sync status
   */
  getSyncStatusByType(type) {
    return this.syncStatus[type] || 'idle';
  }

  /**
   * BUG-003 FIX: Get last sync time from localStorage
   * @param {string} type - Sync type (customer, contact, logo)
   * @returns {string} Formatted last sync time or 'Never'
   */
  getLastSyncTime(type) {
    const lastSync = localStorage.getItem(`zoho_last_sync_${type}`);
    if (!lastSync) return 'Never';
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMs = now - syncDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  /**
   * Show visual sync indicator
   * @param {string} type - Sync type (customer, contact, logo)
   * @param {string} status - Status (syncing, synced, error)
   */
  showSyncIndicator(type, status) {
    // Get or create sync indicator element
    let indicator = document.getElementById(`zoho-sync-${type}`);

    if (!indicator) {
      // Create indicator if it doesn't exist
      indicator = this.createSyncIndicator(type);
    }

    // Update indicator state
    indicator.className = `zoho-sync-indicator zoho-sync-${status}`;

    // Update icon and text
    const icon = indicator.querySelector('.sync-icon');
    const text = indicator.querySelector('.sync-text');

    if (icon && text) {
      switch (status) {
        case 'syncing':
          icon.innerHTML = this.getSpinnerSVG();
          text.textContent = 'Syncing...';
          break;

        case 'synced':
          icon.innerHTML = this.getCheckmarkSVG();
          text.textContent = 'Synced with Zoho';
          // Auto-hide after 3 seconds
          setTimeout(() => {
            indicator.classList.add('fade-out');
          }, 3000);
          break;

        case 'error':
          icon.innerHTML = this.getErrorSVG();
          text.textContent = 'Sync failed';
          // Show retry button
          const retryBtn = indicator.querySelector('.retry-btn');
          if (retryBtn) {
            retryBtn.style.display = 'inline-block';
          }
          break;

        default:
          indicator.style.display = 'none';
      }
    }

    // Show indicator
    indicator.style.display = 'flex';
  }

  /**
   * Create sync indicator element
   */
  createSyncIndicator(type) {
    const indicator = document.createElement('div');
    indicator.id = `zoho-sync-${type}`;
    indicator.className = 'zoho-sync-indicator';
    indicator.innerHTML = `
      <span class="sync-icon"></span>
      <span class="sync-text"></span>
      <button class="retry-btn" style="display: none;" onclick="window.retryZohoSync('${type}')">
        Retry
      </button>
    `;

    // Add to appropriate container
    let container;
    switch (type) {
      case 'customer':
        container = document.querySelector('.customer-info-section') ||
                   document.querySelector('.left-sidebar');
        break;
      case 'contact':
        container = document.querySelector('.contact-section') ||
                   document.querySelector('.left-sidebar');
        break;
      case 'logo':
        container = document.querySelector('.logo-section') ||
                   document.querySelector('.left-sidebar');
        break;
      default:
        container = document.body;
    }

    if (container) {
      container.appendChild(indicator);
    }

    return indicator;
  }

  /**
   * SVG icons
   */
  getSpinnerSVG() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spinning">
        <circle cx="12" cy="12" r="10" opacity="0.25"/>
        <path d="M12 2 A 10 10 0 0 1 22 12" opacity="0.75"/>
      </svg>
    `;
  }

  getCheckmarkSVG() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;
  }

  getErrorSVG() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    `;
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.syncCallbacks.has(event)) {
      this.syncCallbacks.set(event, []);
    }
    this.syncCallbacks.get(event).push(callback);
  }

  emitEvent(event, data) {
    if (this.syncCallbacks.has(event)) {
      this.syncCallbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Retry failed sync
   */
  async retrySync(type, data) {
    switch (type) {
      case 'customer':
        return await this.syncCustomer(data);
      case 'contact':
        return await this.syncContact(data);
      case 'logo':
        return await this.syncLogo(data.companyName, data.logoUrl, data.logoSource);
      default:
        throw new Error(`Unknown sync type: ${type}`);
    }
  }
}

// Create singleton instance
export const zohoSyncClient = new ZohoSyncClient();

// Global retry handler
window.retryZohoSync = async function(type) {
  console.log(`Retrying ${type} sync...`);
  // Implementation depends on how we store the failed sync data
  // For now, just hide the error indicator
  const indicator = document.getElementById(`zoho-sync-${type}`);
  if (indicator) {
    indicator.style.display = 'none';
  }
};
