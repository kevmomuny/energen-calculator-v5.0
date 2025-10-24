/**
 * Error Boundary Service - Comprehensive error handling with Zoho integration
 * Catches all errors, provides recovery, and reports to Zoho Catalyst
 */

export class ErrorBoundaryService {
  constructor(eventBus = null, config = {}) {
    this.eventBus = eventBus;
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableReporting: true,
      enableAutoRecovery: true,
      zohoEndpoint: '/api/zoho/errors',
      ...config
    };
    
    // Error tracking
    this.errorHistory = [];
    this.retryQueue = new Map();
    this.recoveryStrategies = new Map();
    
    // Setup global error handlers
    this.setupGlobalHandlers();
    
    // Register default recovery strategies
    this.registerDefaultStrategies();
    
    // Setup event listeners
    if (this.eventBus) {
      this.setupEventListeners();
    }
  }
  
  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      event.preventDefault();
      this.handleError({
        type: 'javascript-error',
        error: event.error,
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      });
    });
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      this.handleError({
        type: 'promise-rejection',
        error: event.reason,
        message: event.reason?.message || 'Unhandled promise rejection',
        promise: event.promise
      });
    });
    
    // Catch network errors
    this.interceptFetch();
    this.interceptXHR();
  }
  
  /**
   * Setup event-driven error handling
   */
  setupEventListeners() {
    // Module errors
    this.eventBus.on('error:module', (data) => {
      this.handleError({
        type: 'module-error',
        module: data.module,
        error: data.error,
        context: data.context
      });
    });
    
    // API errors
    this.eventBus.on('error:api', (data) => {
      this.handleError({
        type: 'api-error',
        endpoint: data.endpoint,
        status: data.status,
        error: data.error,
        canRetry: true
      });
    });
    
    // Validation errors
    this.eventBus.on('error:validation', (data) => {
      this.handleError({
        type: 'validation-error',
        fields: data.fields,
        errors: data.errors,
        severity: 'low'
      });
    });
  }
  
  /**
   * Central error handler
   */
  async handleError(errorInfo) {
    // Enhance error info
    const enhancedError = this.enhanceErrorInfo(errorInfo);
    
    // Log to history
    this.errorHistory.push(enhancedError);
    
    // Emit for other modules
    if (this.eventBus) {
      this.eventBus.emit('error:captured', enhancedError);
    }
    
    // Determine severity
    const severity = this.determineSeverity(enhancedError);
    enhancedError.severity = severity;
    
    // Show user feedback based on severity
    this.showUserFeedback(enhancedError);
    
    // Attempt recovery if enabled
    if (this.config.enableAutoRecovery) {
      await this.attemptRecovery(enhancedError);
    }
    
    // Report to Zoho if critical
    if (this.config.enableReporting && severity !== 'low') {
      this.reportToZoho(enhancedError);
    }
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', enhancedError);
    }
  }
  
  /**
   * Enhance error information with context
   */
  enhanceErrorInfo(errorInfo) {
    return {
      ...errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      browserInfo: this.getBrowserInfo(),
      memoryUsage: this.getMemoryUsage(),
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }
  
  /**
   * Determine error severity
   */
  determineSeverity(error) {
    // Critical errors
    if (error.type === 'javascript-error' && error.message?.includes('Cannot read')) {
      return 'critical';
    }
    if (error.type === 'api-error' && error.status >= 500) {
      return 'high';
    }
    
    // High severity
    if (error.type === 'promise-rejection') {
      return 'high';
    }
    if (error.status === 404) {
      return 'medium';
    }
    
    // Medium severity
    if (error.type === 'network-error' && error.canRetry) {
      return 'medium';
    }
    
    // Low severity
    if (error.type === 'validation-error') {
      return 'low';
    }
    
    return error.severity || 'medium';
  }
  
  /**
   * Show user-friendly feedback
   */
  showUserFeedback(error) {
    const messages = {
      'network-error': {
        title: 'Connection Issue',
        message: 'Please check your internet connection and try again.',
        icon: 'wifi_off'
      },
      'api-error': {
        title: 'Service Unavailable',
        message: 'The service is temporarily unavailable. Please try again later.',
        icon: 'cloud_off'
      },
      'validation-error': {
        title: 'Invalid Input',
        message: 'Please check your input and try again.',
        icon: 'error_outline'
      },
      'javascript-error': {
        title: 'Something went wrong',
        message: 'An unexpected error occurred. The page may need to be refreshed.',
        icon: 'report_problem'
      },
      'promise-rejection': {
        title: 'Operation Failed',
        message: 'The operation could not be completed. Please try again.',
        icon: 'cancel'
      }
    };
    
    const feedback = messages[error.type] || messages['javascript-error'];
    
    // Use UI feedback service if available
    if (this.eventBus) {
      this.eventBus.emit('feedback:toast', {
        message: `${feedback.title}: ${feedback.message}`,
        type: error.severity === 'critical' ? 'error' : 'warning',
        options: {
          duration: 5000,
          actions: error.canRetry ? [{
            id: 'retry',
            label: 'Retry',
            handler: () => this.retry(error)
          }] : []
        }
      });
    } else {
      // Fallback to alert
      alert(`${feedback.title}\n\n${feedback.message}`);
    }
  }
  
  /**
   * Attempt automatic recovery
   */
  async attemptRecovery(error) {
    // Check for registered recovery strategy
    const strategy = this.recoveryStrategies.get(error.type);
    
    if (strategy) {
      try {
        await strategy(error);
        
        // Emit recovery success
        if (this.eventBus) {
          this.eventBus.emit('error:recovered', {
            errorId: error.id,
            type: error.type
          });
        }
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    }
    
    // Generic recovery actions
    this.performGenericRecovery(error);
  }
  
  /**
   * Generic recovery actions
   */
  performGenericRecovery(error) {
    // Re-enable disabled elements
    document.querySelectorAll('button:disabled, input:disabled').forEach(el => {
      if (!el.dataset.intentionallyDisabled) {
        el.disabled = false;
      }
    });
    
    // Clear loading states
    document.querySelectorAll('.loading').forEach(el => {
      el.classList.remove('loading');
    });
    
    // Remove loading overlays
    document.querySelectorAll('.loading-overlay').forEach(el => {
      el.remove();
    });
    
    // Reset form validation states if validation error
    if (error.type === 'validation-error') {
      document.querySelectorAll('.invalid').forEach(el => {
        el.classList.remove('invalid');
      });
    }
  }
  
  /**
   * Register recovery strategy
   */
  registerRecoveryStrategy(errorType, strategy) {
    this.recoveryStrategies.set(errorType, strategy);
  }
  
  /**
   * Register default recovery strategies
   */
  registerDefaultStrategies() {
    // Network error recovery
    this.registerRecoveryStrategy('network-error', async (error) => {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check connectivity
      if (navigator.onLine) {
        // Retry the failed operation if possible
        if (error.retry) {
          return error.retry();
        }
      }
    });
    
    // API error recovery
    this.registerRecoveryStrategy('api-error', async (error) => {
      if (error.status === 401) {
        // Unauthorized - might need to refresh token
        if (this.eventBus) {
          this.eventBus.emit('auth:refreshRequired');
        }
      } else if (error.status >= 500) {
        // Server error - retry with backoff
        return this.retryWithBackoff(error);
      }
    });
    
    // Validation error recovery
    this.registerRecoveryStrategy('validation-error', async (error) => {
      // Focus on first invalid field
      if (error.fields && error.fields.length > 0) {
        const firstField = document.querySelector(`[name="${error.fields[0]}"]`);
        if (firstField) {
          firstField.focus();
          firstField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }
  
  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(error) {
    const retryKey = `${error.type}-${error.endpoint || error.url}`;
    let retryCount = this.retryQueue.get(retryKey) || 0;
    
    if (retryCount >= this.config.maxRetries) {
      this.retryQueue.delete(retryKey);
      throw new Error('Max retries exceeded');
    }
    
    const delay = this.config.retryDelay * Math.pow(2, retryCount);
    
    // Update retry count
    this.retryQueue.set(retryKey, retryCount + 1);
    
    // Wait with exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the operation
    if (error.retry) {
      try {
        const result = await error.retry();
        this.retryQueue.delete(retryKey);
        return result;
      } catch (retryError) {
        // Retry failed, will try again
        return this.retryWithBackoff({
          ...error,
          originalError: retryError
        });
      }
    }
  }
  
  /**
   * Manual retry
   */
  async retry(error) {
    if (error.retry) {
      try {
        await error.retry();
        
        // Show success feedback
        if (this.eventBus) {
          this.eventBus.emit('feedback:toast', {
            message: 'Operation completed successfully',
            type: 'success'
          });
        }
      } catch (retryError) {
        this.handleError({
          ...error,
          retriedAt: new Date().toISOString(),
          retryError
        });
      }
    }
  }
  
  /**
   * Intercept fetch for error handling
   */
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          // API error
          const error = {
            type: 'api-error',
            url,
            method: options.method || 'GET',
            status: response.status,
            statusText: response.statusText,
            canRetry: response.status >= 500 || response.status === 0,
            retry: () => originalFetch(...args)
          };
          
          // Try to get error body
          try {
            const body = await response.clone().json();
            error.response = body;
            error.message = body.message || body.error || response.statusText;
          } catch (e) {
            // Body not JSON
          }
          
          this.handleError(error);
        }
        
        return response;
      } catch (error) {
        // Network error
        this.handleError({
          type: 'network-error',
          url,
          method: options.method || 'GET',
          error,
          message: error.message,
          canRetry: true,
          retry: () => originalFetch(...args)
        });
        
        throw error;
      }
    };
  }
  
  /**
   * Intercept XHR for error handling
   */
  interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._errorBoundary = { method, url };
      return originalOpen.call(this, method, url, ...rest);
    };
    
    XMLHttpRequest.prototype.send = function(data) {
      const xhr = this;
      
      // Error handler
      xhr.addEventListener('error', () => {
        this.handleError({
          type: 'network-error',
          method: xhr._errorBoundary.method,
          url: xhr._errorBoundary.url,
          canRetry: true
        });
      });
      
      // Load handler for status checks
      xhr.addEventListener('load', () => {
        if (xhr.status >= 400) {
          this.handleError({
            type: 'api-error',
            method: xhr._errorBoundary.method,
            url: xhr._errorBoundary.url,
            status: xhr.status,
            statusText: xhr.statusText,
            response: xhr.responseText,
            canRetry: xhr.status >= 500
          });
        }
      });
      
      return originalSend.call(this, data);
    };
  }
  
  /**
   * Report error to Zoho Catalyst
   */
  async reportToZoho(error) {
    if (!this.config.enableReporting) return;
    
    try {
      const report = {
        error_id: error.id,
        type: error.type,
        severity: error.severity,
        message: error.message,
        stack: error.stack,
        url: error.url,
        timestamp: error.timestamp,
        session_id: error.sessionId,
        user_id: error.userId,
        browser: error.browserInfo,
        memory: error.memoryUsage,
        context: {
          endpoint: error.endpoint,
          status: error.status,
          module: error.module
        }
      };
      
      // Send to Zoho via event bus (handled by Zoho module)
      if (this.eventBus) {
        this.eventBus.emit('zoho:logError', report);
      } else {
        // Direct API call as fallback
        await fetch(this.config.zohoEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });
      }
    } catch (reportError) {
      console.error('Failed to report error to Zoho:', reportError);
    }
  }
  
  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let version = 'Unknown';
    
    if (ua.indexOf('Chrome') > -1) {
      browser = 'Chrome';
      version = ua.match(/Chrome\/(\d+)/)?.[1];
    } else if (ua.indexOf('Safari') > -1) {
      browser = 'Safari';
      version = ua.match(/Version\/(\d+)/)?.[1];
    } else if (ua.indexOf('Firefox') > -1) {
      browser = 'Firefox';
      version = ua.match(/Firefox\/(\d+)/)?.[1];
    }
    
    return {
      browser,
      version,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth
      }
    };
  }
  
  /**
   * Get memory usage if available
   */
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  }
  
  /**
   * Get session ID
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
   * Get user ID if available
   */
  getUserId() {
    // Check various sources for user ID
    return localStorage.getItem('userId') || 
           sessionStorage.getItem('userId') || 
           window.energenUserId || 
           'anonymous';
  }
  
  /**
   * Get error history
   */
  getErrorHistory(limit = 50) {
    return this.errorHistory.slice(-limit);
  }
  
  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }
  
  /**
   * Export errors for debugging
   */
  exportErrors() {
    const data = {
      errors: this.errorHistory,
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energen-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export singleton
export default new ErrorBoundaryService();