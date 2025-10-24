/**
 * Auto-Save Service - Prevents data loss with intelligent saving and Zoho sync
 * Tracks changes, auto-saves periodically, and syncs with Zoho Catalyst
 */

export class AutoSaveService {
  constructor(stateManager, eventBus = null, config = {}) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    this.config = {
      autoSaveInterval: 30000, // 30 seconds
      debounceDelay: 2000, // 2 seconds after last change
      maxHistorySize: 20,
      enableZohoSync: true,
      syncInterval: 60000, // 1 minute
      conflictResolution: 'client', // 'client', 'server', or 'merge'
      ...config
    };
    
    // State tracking
    this.isDirty = false;
    this.lastSave = Date.now();
    this.lastSync = Date.now();
    this.saveHistory = [];
    this.pendingChanges = new Map();
    this.saveInProgress = false;
    this.syncInProgress = false;
    
    // Timers
    this.autoSaveTimer = null;
    this.debounceTimer = null;
    this.syncTimer = null;
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize auto-save functionality
   */
  init() {
    // Setup change listeners
    this.setupChangeListeners();
    
    // Setup event listeners
    if (this.eventBus) {
      this.setupEventListeners();
    }
    
    // Start auto-save timer
    this.startAutoSave();
    
    // Start sync timer if enabled
    if (this.config.enableZohoSync) {
      this.startSync();
    }
    
    // Setup page unload handler
    this.setupUnloadHandler();
    
    // Restore from last session if available
    this.restoreFromLastSession();
  }
  
  /**
   * Setup change listeners for tracking
   */
  setupChangeListeners() {
    // Track all input changes
    document.addEventListener('input', (e) => {
      if (e.target.matches('input, textarea, select')) {
        this.trackChange(e.target);
      }
    });
    
    // Track programmatic changes via state manager
    if (this.stateManager) {
      const originalSet = this.stateManager.set.bind(this.stateManager);
      this.stateManager.set = (path, value) => {
        const result = originalSet(path, value);
        this.trackChange({ path, value });
        return result;
      };
    }
  }
  
  /**
   * Setup event-driven auto-save
   */
  setupEventListeners() {
    // Save triggers
    this.eventBus.on('autoSave:trigger', () => {
      this.save();
    });
    
    // Track specific events
    this.eventBus.on('unit:added', (data) => {
      this.trackChange({ type: 'unit-add', data });
    });
    
    this.eventBus.on('unit:removed', (data) => {
      this.trackChange({ type: 'unit-remove', data });
    });
    
    this.eventBus.on('calculation:complete', (data) => {
      this.trackChange({ type: 'calculation', data });
    });
    
    // Sync events
    this.eventBus.on('zoho:connected', () => {
      this.sync();
    });
    
    this.eventBus.on('zoho:conflict', (data) => {
      this.handleConflict(data);
    });
  }
  
  /**
   * Track a change
   */
  trackChange(change) {
    // Mark as dirty
    this.isDirty = true;
    
    // Store change
    const changeId = this.getChangeId(change);
    this.pendingChanges.set(changeId, {
      ...change,
      timestamp: Date.now()
    });
    
    // Update UI indicator
    this.updateSaveIndicator('unsaved');
    
    // Debounce save
    this.debounceSave();
    
    // Emit change event
    if (this.eventBus) {
      this.eventBus.emit('autoSave:change', {
        changeId,
        isDirty: this.isDirty,
        pendingCount: this.pendingChanges.size
      });
    }
  }
  
  /**
   * Get unique ID for a change
   */
  getChangeId(change) {
    if (change.id) return change.id;
    if (change.path) return `path:${change.path}`;
    if (change.name) return `field:${change.name}`;
    if (change.type) return `${change.type}:${Date.now()}`;
    return `change:${Date.now()}:${Math.random()}`;
  }
  
  /**
   * Debounce save operation
   */
  debounceSave() {
    clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(() => {
      if (this.isDirty && !this.saveInProgress) {
        this.save();
      }
    }, this.config.debounceDelay);
  }
  
  /**
   * Start auto-save timer
   */
  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.isDirty && !this.saveInProgress) {
        const timeSinceLastSave = Date.now() - this.lastSave;
        
        if (timeSinceLastSave >= this.config.autoSaveInterval) {
          this.save();
        }
      }
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Save current state
   */
  async save(options = {}) {
    if (this.saveInProgress) return;
    if (!this.isDirty && !options.force) return;
    
    this.saveInProgress = true;
    this.updateSaveIndicator('saving');
    
    try {
      // Get current state
      const state = this.stateManager.get();
      
      // Create save record
      const saveRecord = {
        id: `save-${Date.now()}`,
        timestamp: new Date().toISOString(),
        state: state,
        changes: Array.from(this.pendingChanges.values()),
        checksum: this.calculateChecksum(state)
      };
      
      // Save to local storage
      await this.saveToLocal(saveRecord);
      
      // Save to session storage for recovery
      await this.saveToSession(saveRecord);
      
      // Add to history
      this.addToHistory(saveRecord);
      
      // Clear pending changes
      this.pendingChanges.clear();
      
      // Update state
      this.isDirty = false;
      this.lastSave = Date.now();
      
      // Update UI
      this.updateSaveIndicator('saved');
      
      // Emit success event
      if (this.eventBus) {
        this.eventBus.emit('autoSave:saved', {
          saveId: saveRecord.id,
          timestamp: saveRecord.timestamp
        });
      }
      
      // Schedule sync if needed
      if (this.config.enableZohoSync && !options.skipSync) {
        this.scheduleSync();
      }
      
      return saveRecord;
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      // Update UI
      this.updateSaveIndicator('error');
      
      // Emit error event
      if (this.eventBus) {
        this.eventBus.emit('autoSave:error', {
          error: error.message,
          willRetry: true
        });
      }
      
      // Schedule retry
      setTimeout(() => this.save(options), 5000);
      
      throw error;
      
    } finally {
      this.saveInProgress = false;
    }
  }
  
  /**
   * Save to local storage
   */
  async saveToLocal(saveRecord) {
    const key = 'energen-calculator-autosave';
    
    try {
      // Compress if large
      const data = JSON.stringify(saveRecord);
      
      if (data.length > 1000000) {
        // Use compression if available
        const compressed = await this.compress(data);
        localStorage.setItem(key, compressed);
        localStorage.setItem(`${key}-compressed`, 'true');
      } else {
        localStorage.setItem(key, data);
        localStorage.removeItem(`${key}-compressed`);
      }
      
      // Store metadata
      localStorage.setItem(`${key}-meta`, JSON.stringify({
        saveId: saveRecord.id,
        timestamp: saveRecord.timestamp,
        size: data.length,
        checksum: saveRecord.checksum
      }));
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // Clear old data and retry
        this.clearOldSaves();
        localStorage.setItem(key, JSON.stringify(saveRecord));
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Save to session storage for recovery
   */
  async saveToSession(saveRecord) {
    const key = 'energen-calculator-session';
    
    try {
      // Keep only essential data in session
      const sessionData = {
        id: saveRecord.id,
        timestamp: saveRecord.timestamp,
        state: {
          units: saveRecord.state.units,
          customer: saveRecord.state.customer,
          calculations: saveRecord.state.calculations
        }
      };
      
      sessionStorage.setItem(key, JSON.stringify(sessionData));
      
    } catch (error) {
      console.warn('Session storage save failed:', error);
    }
  }
  
  /**
   * Start Zoho sync timer
   */
  startSync() {
    this.syncTimer = setInterval(() => {
      const timeSinceLastSync = Date.now() - this.lastSync;
      
      if (timeSinceLastSync >= this.config.syncInterval && !this.syncInProgress) {
        this.sync();
      }
    }, 10000); // Check every 10 seconds
  }
  
  /**
   * Sync with Zoho Catalyst
   */
  async sync() {
    if (this.syncInProgress) return;
    if (!this.config.enableZohoSync) return;
    
    this.syncInProgress = true;
    
    try {
      // Get latest save
      const latestSave = this.getLatestSave();
      if (!latestSave) return;
      
      // Prepare for Zoho
      const zohoData = this.prepareForZoho(latestSave);
      
      // Send to Zoho via event bus
      if (this.eventBus) {
        return new Promise((resolve, reject) => {
          // Listen for response
          const responseHandler = (data) => {
            if (data.success) {
              this.lastSync = Date.now();
              this.updateSyncIndicator('synced');
              resolve(data);
            } else {
              reject(new Error(data.error));
            }
            
            // Clean up listener
            this.eventBus.off('zoho:syncResponse', responseHandler);
          };
          
          this.eventBus.on('zoho:syncResponse', responseHandler);
          
          // Send sync request
          this.eventBus.emit('zoho:syncRequest', zohoData);
          
          // Timeout after 30 seconds
          setTimeout(() => {
            this.eventBus.off('zoho:syncResponse', responseHandler);
            reject(new Error('Sync timeout'));
          }, 30000);
        });
      }
      
    } catch (error) {
      console.error('Zoho sync failed:', error);
      
      // Update UI
      this.updateSyncIndicator('error');
      
      // Emit error event
      if (this.eventBus) {
        this.eventBus.emit('autoSave:syncError', {
          error: error.message
        });
      }
      
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Schedule sync after save
   */
  scheduleSync() {
    // Clear existing timer
    if (this.scheduledSync) {
      clearTimeout(this.scheduledSync);
    }
    
    // Schedule sync in 5 seconds
    this.scheduledSync = setTimeout(() => {
      this.sync();
    }, 5000);
  }
  
  /**
   * Prepare data for Zoho sync
   */
  prepareForZoho(saveRecord) {
    return {
      quote_id: saveRecord.state.quoteId || `QUOTE-${Date.now()}`,
      customer: saveRecord.state.customer,
      units: saveRecord.state.units,
      calculations: saveRecord.state.calculations,
      metadata: {
        saved_at: saveRecord.timestamp,
        checksum: saveRecord.checksum,
        version: '4.5',
        source: 'web-calculator'
      }
    };
  }
  
  /**
   * Handle sync conflicts
   */
  async handleConflict(conflict) {
    const resolution = this.config.conflictResolution;
    
    switch (resolution) {
      case 'client':
        // Keep client version
        await this.sync();
        break;
        
      case 'server':
        // Use server version
        await this.loadFromServer(conflict.serverData);
        break;
        
      case 'merge':
        // Attempt to merge
        const merged = await this.mergeConflict(conflict);
        await this.save({ force: true });
        break;
        
      default:
        // Ask user
        if (this.eventBus) {
          this.eventBus.emit('feedback:confirm', {
            id: 'sync-conflict',
            message: 'Your changes conflict with the server. Keep your changes?',
            options: {
              confirmText: 'Keep Mine',
              cancelText: 'Use Server\'s'
            }
          });
        }
    }
  }
  
  /**
   * Setup page unload handler
   */
  setupUnloadHandler() {
    window.addEventListener('beforeunload', (e) => {
      if (this.isDirty) {
        // Try to save immediately
        this.save({ skipSync: true });
        
        // Show warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
    
    // Save on visibility change (mobile background)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isDirty) {
        this.save({ skipSync: true });
      }
    });
  }
  
  /**
   * Restore from last session
   */
  async restoreFromLastSession() {
    try {
      // Check for crash recovery
      const sessionData = sessionStorage.getItem('energen-calculator-session');
      const localData = localStorage.getItem('energen-calculator-autosave');
      
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const lastSave = localData ? JSON.parse(localData) : null;
        
        // Check if session is newer than last save
        if (!lastSave || session.timestamp > lastSave.timestamp) {
          // Offer to restore
          if (this.eventBus) {
            this.eventBus.emit('feedback:confirm', {
              id: 'restore-session',
              message: 'Unsaved work found from your last session. Would you like to restore it?',
              options: {
                confirmText: 'Restore',
                cancelText: 'Start Fresh',
                icon: 'restore'
              }
            });
            
            // Listen for response
            this.eventBus.once('feedback:confirmResult', (data) => {
              if (data.id === 'restore-session' && data.confirmed) {
                this.restoreState(session.state);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }
  
  /**
   * Restore state
   */
  restoreState(state) {
    if (this.stateManager) {
      // Restore each part of state
      Object.entries(state).forEach(([key, value]) => {
        this.stateManager.set(key, value);
      });
      
      // Mark as clean
      this.isDirty = false;
      this.pendingChanges.clear();
      
      // Update UI
      this.updateSaveIndicator('restored');
      
      // Emit event
      if (this.eventBus) {
        this.eventBus.emit('autoSave:restored', {
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  /**
   * Update save indicator UI
   */
  updateSaveIndicator(status) {
    let indicator = document.getElementById('save-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'save-indicator';
      indicator.className = 'save-indicator';
      document.body.appendChild(indicator);
    }
    
    const messages = {
      unsaved: '<span class="dot yellow"></span> Unsaved changes',
      saving: '<span class="spinner-small"></span> Saving...',
      saved: '<span class="dot green"></span> All changes saved',
      error: '<span class="dot red"></span> Save failed - will retry',
      restored: '<span class="dot blue"></span> Restored from backup'
    };
    
    indicator.innerHTML = messages[status] || '';
    indicator.className = `save-indicator ${status}`;
    
    // Auto-hide success messages
    if (status === 'saved' || status === 'restored') {
      setTimeout(() => {
        indicator.classList.add('fade-out');
        setTimeout(() => {
          indicator.classList.remove('fade-out');
          indicator.innerHTML = '';
        }, 500);
      }, 2000);
    }
  }
  
  /**
   * Update sync indicator
   */
  updateSyncIndicator(status) {
    if (!this.config.enableZohoSync) return;
    
    let indicator = document.getElementById('sync-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'sync-indicator';
      indicator.className = 'sync-indicator';
      document.body.appendChild(indicator);
    }
    
    const messages = {
      syncing: '<span class="spinner-small"></span> Syncing with Zoho...',
      synced: '<span class="dot green"></span> Synced',
      error: '<span class="dot red"></span> Sync failed'
    };
    
    indicator.innerHTML = messages[status] || '';
    indicator.className = `sync-indicator ${status}`;
    
    if (status === 'synced') {
      setTimeout(() => {
        indicator.classList.add('fade-out');
      }, 2000);
    }
  }
  
  /**
   * Calculate checksum for data integrity
   */
  calculateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
  
  /**
   * Add save to history
   */
  addToHistory(saveRecord) {
    this.saveHistory.push({
      id: saveRecord.id,
      timestamp: saveRecord.timestamp,
      checksum: saveRecord.checksum,
      size: JSON.stringify(saveRecord).length
    });
    
    // Limit history size
    if (this.saveHistory.length > this.config.maxHistorySize) {
      this.saveHistory.shift();
    }
  }
  
  /**
   * Get latest save
   */
  getLatestSave() {
    const key = 'energen-calculator-autosave';
    const data = localStorage.getItem(key);
    
    if (data) {
      const isCompressed = localStorage.getItem(`${key}-compressed`) === 'true';
      
      if (isCompressed) {
        return JSON.parse(this.decompress(data));
      }
      
      return JSON.parse(data);
    }
    
    return null;
  }
  
  /**
   * Clear old saves
   */
  clearOldSaves() {
    const keysToCheck = [
      'energen-calculator-autosave',
      'energen-calculator-backup',
      'energen-calculator-history'
    ];
    
    keysToCheck.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}-meta`);
      localStorage.removeItem(`${key}-compressed`);
    });
  }
  
  /**
   * Simple compression (can be replaced with better algorithm)
   */
  compress(data) {
    // Simple RLE compression for demo
    // In production, use pako or similar
    return data;
  }
  
  /**
   * Simple decompression
   */
  decompress(data) {
    return data;
  }
  
  /**
   * Get save statistics
   */
  getStats() {
    return {
      isDirty: this.isDirty,
      lastSave: new Date(this.lastSave).toLocaleString(),
      lastSync: new Date(this.lastSync).toLocaleString(),
      pendingChanges: this.pendingChanges.size,
      historySize: this.saveHistory.length,
      autoSaveEnabled: !!this.autoSaveTimer,
      syncEnabled: this.config.enableZohoSync
    };
  }
  
  /**
   * Manual save trigger
   */
  triggerSave() {
    return this.save({ force: true });
  }
  
  /**
   * Manual sync trigger
   */
  triggerSync() {
    return this.sync();
  }
  
  /**
   * Cleanup
   */
  destroy() {
    clearInterval(this.autoSaveTimer);
    clearInterval(this.syncTimer);
    clearTimeout(this.debounceTimer);
    clearTimeout(this.scheduledSync);
    
    // Final save
    if (this.isDirty) {
      this.save({ skipSync: true });
    }
  }
}

// Export singleton with initialization helper
let instance = null;

export function initAutoSave(stateManager, eventBus, config) {
  if (!instance) {
    instance = new AutoSaveService(stateManager, eventBus, config);
  }
  return instance;
}

export default AutoSaveService;