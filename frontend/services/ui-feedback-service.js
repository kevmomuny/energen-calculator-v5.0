/**
 * UI Feedback Service - Modular feedback system with event-driven architecture
 * Integrates with Zoho Catalyst for error reporting and analytics
 */

export class UIFeedbackService {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.activeOperations = new Map();
    this.toastQueue = [];
    this.isProcessingQueue = false;
    
    // Configuration for Zoho integration
    this.config = {
      maxToasts: 3,
      toastDuration: 3000,
      progressUpdateInterval: 100,
      enableTelemetry: true
    };
    
    // Setup event listeners if event bus is provided
    if (this.eventBus) {
      this.setupEventListeners();
    }
    
    // Initialize styles if not already present
    this.injectStyles();
  }
  
  /**
   * Setup event-driven feedback listeners
   */
  setupEventListeners() {
    // Loading states
    this.eventBus.on('operation:start', (data) => {
      this.showLoading(data.id, data.message, data.options);
    });
    
    this.eventBus.on('operation:progress', (data) => {
      this.updateProgress(data.id, data.current, data.total, data.message);
    });
    
    this.eventBus.on('operation:complete', (data) => {
      this.hideLoading(data.id);
      if (data.message) {
        this.showToast(data.message, 'success');
      }
    });
    
    this.eventBus.on('operation:error', (data) => {
      this.hideLoading(data.id);
      this.showToast(data.message || 'Operation failed', 'error');
      
      // Send to Zoho Catalyst for monitoring
      if (this.config.enableTelemetry) {
        this.reportError(data);
      }
    });
    
    // Toast notifications
    this.eventBus.on('feedback:toast', (data) => {
      this.showToast(data.message, data.type, data.options);
    });
    
    // Confirmations
    this.eventBus.on('feedback:confirm', async (data) => {
      const result = await this.showConfirmation(data.message, data.options);
      this.eventBus.emit('feedback:confirmResult', {
        id: data.id,
        confirmed: result
      });
    });
  }
  
  /**
   * Show loading state for an operation
   */
  showLoading(operationId, message = 'Loading...', options = {}) {
    // Store operation info
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      message,
      element: options.element
    });
    
    if (options.element) {
      // Element-specific loading
      const element = typeof options.element === 'string' 
        ? document.getElementById(options.element)
        : options.element;
        
      if (element) {
        // Store original state
        const original = {
          innerHTML: element.innerHTML,
          disabled: element.disabled,
          className: element.className
        };
        
        this.activeOperations.get(operationId).originalState = original;
        
        // Apply loading state
        element.disabled = true;
        element.classList.add('loading');
        
        if (element.tagName === 'BUTTON') {
          element.innerHTML = `
            <span class="spinner"></span>
            <span class="loading-text">${message}</span>
          `;
        }
      }
    } else if (options.global !== false) {
      // Global loading indicator
      this.showGlobalLoading(operationId, message);
    }
    
    // Emit event for other modules
    if (this.eventBus) {
      this.eventBus.emit('ui:loadingStarted', {
        operationId,
        message
      });
    }
    
    return operationId;
  }
  
  /**
   * Hide loading state
   */
  hideLoading(operationId) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    // Calculate duration for analytics
    const duration = Date.now() - operation.startTime;
    
    // Restore element state
    if (operation.element) {
      const element = typeof operation.element === 'string'
        ? document.getElementById(operation.element)
        : operation.element;
        
      if (element && operation.originalState) {
        element.innerHTML = operation.originalState.innerHTML;
        element.disabled = operation.originalState.disabled;
        element.className = operation.originalState.className;
      }
    } else {
      // Remove global loading
      this.hideGlobalLoading(operationId);
    }
    
    // Clean up
    this.activeOperations.delete(operationId);
    
    // Emit completion event with metrics
    if (this.eventBus) {
      this.eventBus.emit('ui:loadingCompleted', {
        operationId,
        duration
      });
    }
  }
  
  /**
   * Show global loading overlay
   */
  showGlobalLoading(operationId, message) {
    let overlay = document.getElementById('global-loading-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-loading-overlay';
      overlay.className = 'loading-overlay';
      document.body.appendChild(overlay);
    }
    
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
        <div class="loading-progress" id="loading-progress-${operationId}"></div>
      </div>
    `;
    
    overlay.classList.add('visible');
  }
  
  /**
   * Hide global loading overlay
   */
  hideGlobalLoading(operationId) {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
      setTimeout(() => {
        if (!overlay.classList.contains('visible')) {
          overlay.remove();
        }
      }, 300);
    }
  }
  
  /**
   * Update progress for long operations
   */
  updateProgress(operationId, current, total, message = '') {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;
    
    const percent = Math.round((current / total) * 100);
    
    // Update progress bar
    let progressBar = document.getElementById(`progress-${operationId}`);
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = `progress-${operationId}`;
      progressBar.className = 'progress-bar';
      progressBar.innerHTML = `
        <div class="progress-fill" style="width: 0%"></div>
        <div class="progress-text"></div>
      `;
      
      // Insert after loading message
      const loadingProgress = document.getElementById(`loading-progress-${operationId}`);
      if (loadingProgress) {
        loadingProgress.appendChild(progressBar);
      } else {
        document.body.appendChild(progressBar);
      }
    }
    
    // Animate progress
    const fill = progressBar.querySelector('.progress-fill');
    const text = progressBar.querySelector('.progress-text');
    
    fill.style.width = `${percent}%`;
    text.textContent = message || `${percent}% complete`;
    
    // Remove when complete
    if (current >= total) {
      setTimeout(() => progressBar.remove(), 1000);
    }
    
    // Emit progress event
    if (this.eventBus) {
      this.eventBus.emit('ui:progressUpdate', {
        operationId,
        percent,
        current,
        total
      });
    }
  }
  
  /**
   * Show toast notification with queue management
   */
  showToast(message, type = 'info', options = {}) {
    const toast = {
      id: `toast-${Date.now()}-${Math.random()}`,
      message,
      type,
      duration: options.duration || this.config.toastDuration,
      actions: options.actions || [],
      persistent: options.persistent || false
    };
    
    // Add to queue
    this.toastQueue.push(toast);
    
    // Process queue
    this.processToastQueue();
    
    return toast.id;
  }
  
  /**
   * Process toast queue to maintain max visible toasts
   */
  async processToastQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    
    while (this.toastQueue.length > 0) {
      // Check current toast count
      const currentToasts = document.querySelectorAll('.toast:not(.hiding)').length;
      
      if (currentToasts >= this.config.maxToasts) {
        // Wait for a toast to disappear
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      const toast = this.toastQueue.shift();
      this.renderToast(toast);
      
      // Small delay between toasts
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isProcessingQueue = false;
  }
  
  /**
   * Render individual toast
   */
  renderToast(toast) {
    const toastElement = document.createElement('div');
    toastElement.id = toast.id;
    toastElement.className = `toast toast-${toast.type}`;
    
    // Icon based on type
    const icons = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    
    let actionsHtml = '';
    if (toast.actions.length > 0) {
      actionsHtml = `
        <div class="toast-actions">
          ${toast.actions.map(action => `
            <button class="toast-action" data-action="${action.id}">
              ${action.label}
            </button>
          `).join('')}
        </div>
      `;
    }
    
    toastElement.innerHTML = `
      <span class="material-symbols-outlined toast-icon">
        ${icons[toast.type] || icons.info}
      </span>
      <div class="toast-content">
        <div class="toast-message">${toast.message}</div>
        ${actionsHtml}
      </div>
      ${!toast.persistent ? '<button class="toast-close">&times;</button>' : ''}
    `;
    
    // Add to container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(toastElement);
    
    // Animate in
    requestAnimationFrame(() => {
      toastElement.classList.add('show');
    });
    
    // Handle actions
    toast.actions.forEach(action => {
      const button = toastElement.querySelector(`[data-action="${action.id}"]`);
      if (button) {
        button.addEventListener('click', () => {
          action.handler();
          this.removeToast(toast.id);
        });
      }
    });
    
    // Handle close button
    const closeBtn = toastElement.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.removeToast(toast.id));
    }
    
    // Auto-remove if not persistent
    if (!toast.persistent) {
      setTimeout(() => this.removeToast(toast.id), toast.duration);
    }
    
    // Track for analytics
    if (this.eventBus) {
      this.eventBus.emit('ui:toastShown', {
        type: toast.type,
        message: toast.message
      });
    }
  }
  
  /**
   * Remove toast with animation
   */
  removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    
    toast.classList.add('hiding');
    toast.classList.remove('show');
    
    setTimeout(() => {
      toast.remove();
      
      // Check if container is empty
      const container = document.getElementById('toast-container');
      if (container && container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }
  
  /**
   * Show confirmation dialog
   */
  showConfirmation(message, options = {}) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'confirmation-modal';
      modal.innerHTML = `
        <div class="confirmation-overlay"></div>
        <div class="confirmation-dialog">
          <div class="confirmation-icon">
            <span class="material-symbols-outlined">
              ${options.icon || 'help_outline'}
            </span>
          </div>
          <div class="confirmation-message">${message}</div>
          <div class="confirmation-actions">
            <button class="btn btn-secondary" data-action="cancel">
              ${options.cancelText || 'Cancel'}
            </button>
            <button class="btn btn-primary" data-action="confirm">
              ${options.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Animate in
      requestAnimationFrame(() => {
        modal.classList.add('show');
      });
      
      // Handle actions
      const handleAction = (confirmed) => {
        modal.classList.remove('show');
        setTimeout(() => {
          modal.remove();
          resolve(confirmed);
        }, 300);
      };
      
      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => handleAction(false));
      modal.querySelector('[data-action="confirm"]').addEventListener('click', () => handleAction(true));
      
      // Handle escape key
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          handleAction(false);
          document.removeEventListener('keydown', escapeHandler);
        }
      };
      document.addEventListener('keydown', escapeHandler);
    });
  }
  
  /**
   * Report error to Zoho Catalyst for monitoring
   */
  async reportError(errorData) {
    if (!this.config.enableTelemetry) return;
    
    try {
      // Prepare error report for Zoho
      const report = {
        timestamp: new Date().toISOString(),
        operation: errorData.operation || 'unknown',
        error: errorData.error?.message || errorData.message,
        stack: errorData.error?.stack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      };
      
      // Emit for Zoho sync module to handle
      if (this.eventBus) {
        this.eventBus.emit('telemetry:error', report);
      }
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }
  
  /**
   * Get or create session ID for tracking
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('energen-session-id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('energen-session-id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Inject required styles
   */
  injectStyles() {
    if (document.getElementById('ui-feedback-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ui-feedback-styles';
    style.textContent = `
      /* Loading states */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 11, 13, 0.8);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 9999;
      }
      
      .loading-overlay.visible {
        opacity: 1;
        visibility: visible;
      }
      
      .loading-content {
        background: var(--bg-elevated, #22252f);
        border: 1px solid var(--border-subtle, #1f2937);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        min-width: 200px;
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(59, 130, 246, 0.2);
        border-top-color: var(--accent-blue, #3b82f6);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 16px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .loading-message {
        color: var(--text-primary, #e4e6eb);
        font-size: 14px;
        margin-bottom: 12px;
      }
      
      button.loading {
        position: relative;
        color: transparent;
      }
      
      button.loading .spinner {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      
      /* Progress bars */
      .progress-bar {
        background: var(--bg-secondary, #12141a);
        border: 1px solid var(--border-subtle, #1f2937);
        border-radius: 4px;
        height: 24px;
        position: relative;
        overflow: hidden;
        margin-top: 8px;
      }
      
      .progress-fill {
        background: linear-gradient(90deg, var(--accent-blue, #3b82f6), var(--accent-electric, #60a5fa));
        height: 100%;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 11px;
        color: var(--text-primary, #e4e6eb);
        white-space: nowrap;
      }
      
      /* Toast container */
      #toast-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      }
      
      /* Toast styles */
      .toast {
        background: var(--bg-elevated, #22252f);
        border: 1px solid var(--border-subtle, #1f2937);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .toast.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .toast.hiding {
        opacity: 0;
        transform: translateX(100%);
      }
      
      .toast-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .toast-success {
        border-color: var(--accent-success, #10b981);
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), var(--bg-elevated, #22252f));
      }
      
      .toast-success .toast-icon {
        color: var(--accent-success, #10b981);
      }
      
      .toast-error {
        border-color: var(--accent-danger, #ef4444);
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), var(--bg-elevated, #22252f));
      }
      
      .toast-error .toast-icon {
        color: var(--accent-danger, #ef4444);
      }
      
      .toast-warning {
        border-color: var(--accent-warning, #f59e0b);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), var(--bg-elevated, #22252f));
      }
      
      .toast-warning .toast-icon {
        color: var(--accent-warning, #f59e0b);
      }
      
      .toast-content {
        flex: 1;
      }
      
      .toast-message {
        color: var(--text-primary, #e4e6eb);
        font-size: 13px;
        line-height: 1.5;
      }
      
      .toast-actions {
        margin-top: 8px;
        display: flex;
        gap: 8px;
      }
      
      .toast-action {
        background: transparent;
        border: 1px solid var(--accent-blue, #3b82f6);
        color: var(--accent-blue, #3b82f6);
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .toast-action:hover {
        background: var(--accent-blue, #3b82f6);
        color: white;
      }
      
      .toast-close {
        background: transparent;
        border: none;
        color: var(--text-tertiary, #6b7280);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        margin-left: 12px;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }
      
      .toast-close:hover {
        opacity: 1;
      }
      
      /* Confirmation modal */
      .confirmation-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }
      
      .confirmation-modal.show {
        opacity: 1;
        visibility: visible;
      }
      
      .confirmation-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(10, 11, 13, 0.8);
        backdrop-filter: blur(4px);
      }
      
      .confirmation-dialog {
        position: relative;
        background: var(--bg-elevated, #22252f);
        border: 1px solid var(--border-subtle, #1f2937);
        border-radius: 12px;
        padding: 24px;
        min-width: 320px;
        max-width: 480px;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      }
      
      .confirmation-modal.show .confirmation-dialog {
        transform: scale(1);
      }
      
      .confirmation-icon {
        text-align: center;
        margin-bottom: 16px;
      }
      
      .confirmation-icon .material-symbols-outlined {
        font-size: 48px;
        color: var(--accent-warning, #f59e0b);
      }
      
      .confirmation-message {
        color: var(--text-primary, #e4e6eb);
        font-size: 14px;
        text-align: center;
        margin-bottom: 24px;
        line-height: 1.5;
      }
      
      .confirmation-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .confirmation-actions button {
        min-width: 100px;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// Export singleton for consistency
export default new UIFeedbackService();