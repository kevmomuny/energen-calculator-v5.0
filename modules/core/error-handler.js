/**
 * Comprehensive Error Handler for Energen Calculator v4.5
 * Centralizes all error handling logic
 */

export class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 100;
    this.listeners = new Map();
  }

  /**
     * Handle API errors
     */
  handleApiError(error, context = {}) {
    const errorObj = {
      id: `ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'API_ERROR',
      message: error.message || 'Unknown API error',
      context,
      stack: error.stack,
      status: error.response?.status || 500
    };

    this.logError(errorObj);

    // User-friendly messages
    const userMessage = this.getUserMessage(errorObj);

    // Emit error event
    this.emit('api-error', errorObj);

    return {
      success: false,
      error: userMessage,
      errorId: errorObj.id,
      retry: this.canRetry(errorObj)
    };
  }

  /**
     * Handle calculation errors
     */
  handleCalculationError(error, input = {}) {
    const errorObj = {
      id: `CALC-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'CALCULATION_ERROR',
      message: error.message || 'Calculation failed',
      input,
      stack: error.stack
    };

    this.logError(errorObj);

    // Check for specific calculation issues
    if (error.message.includes('Invalid kW')) {
      return {
        success: false,
        error: 'Generator kW must be between 2 and 2050',
        field: 'kw'
      };
    }

    if (error.message.includes('Invalid service')) {
      return {
        success: false,
        error: 'Please select at least one service',
        field: 'services'
      };
    }

    return {
      success: false,
      error: 'Calculation error. Please check your inputs.',
      errorId: errorObj.id
    };
  }

  /**
     * Handle validation errors
     */
  handleValidationError(errors) {
    const errorObj = {
      id: `VAL-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'VALIDATION_ERROR',
      errors: errors
    };

    this.logError(errorObj);

    // Format validation errors for UI
    const fieldErrors = {};
    errors.forEach(err => {
      fieldErrors[err.field] = err.message;
    });

    return {
      success: false,
      error: 'Please correct the following errors',
      fieldErrors,
      errorId: errorObj.id
    };
  }

  /**
     * Handle network errors
     */
  handleNetworkError(error) {
    const errorObj = {
      id: `NET-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'NETWORK_ERROR',
      message: error.message || 'Network error',
      offline: !navigator.onLine
    };

    this.logError(errorObj);

    if (!navigator.onLine) {
      return {
        success: false,
        error: 'You are offline. Please check your internet connection.',
        retry: true
      };
    }

    return {
      success: false,
      error: 'Connection error. Please try again.',
      retry: true,
      errorId: errorObj.id
    };
  }

  /**
     * Handle PDF generation errors
     */
  handlePdfError(error, context = {}) {
    const errorObj = {
      id: `PDF-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'PDF_ERROR',
      message: error.message || 'PDF generation failed',
      context,
      stack: error.stack
    };

    this.logError(errorObj);

    return {
      success: false,
      error: 'Unable to generate PDF. Please try again or contact support.',
      errorId: errorObj.id,
      fallback: 'download-excel'
    };
  }

  /**
     * Handle Zoho integration errors
     */
  handleZohoError(error, operation) {
    const errorObj = {
      id: `ZOHO-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ZOHO_ERROR',
      message: error.message || 'Zoho integration error',
      operation,
      status: error.response?.status
    };

    this.logError(errorObj);

    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Zoho authentication failed. Please check credentials.',
        action: 'reconfigure'
      };
    }

    if (error.response?.status === 429) {
      return {
        success: false,
        error: 'Zoho API rate limit exceeded. Please wait and try again.',
        retryAfter: error.response?.headers?.['retry-after'] || 60
      };
    }

    return {
      success: false,
      error: 'Zoho sync failed. Data saved locally.',
      errorId: errorObj.id,
      fallback: 'local-save'
    };
  }

  /**
     * Get user-friendly error message
     */
  getUserMessage(errorObj) {
    const messages = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication required. Please log in.',
      403: 'Access denied. Please check permissions.',
      404: 'Resource not found.',
      429: 'Too many requests. Please slow down.',
      500: 'Server error. Please try again later.',
      502: 'Service temporarily unavailable.',
      503: 'Service maintenance in progress.'
    };

    return messages[errorObj.status] || 'An error occurred. Please try again.';
  }

  /**
     * Check if error can be retried
     */
  canRetry(errorObj) {
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    const retryableTypes = ['NETWORK_ERROR', 'TIMEOUT_ERROR'];

    return retryableStatuses.includes(errorObj.status) ||
               retryableTypes.includes(errorObj.type);
  }

  /**
     * Log error
     */
  logError(errorObj) {
    // Add to error array
    this.errors.unshift(errorObj);

    // Limit error history
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Console logging in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error logged:', errorObj);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorObj);
    }
  }

  /**
     * Send error to monitoring service
     */
  async sendToMonitoring(errorObj) {
    try {
      // In production, send to error tracking service
      // Example: Sentry, LogRocket, etc.
      if (window.Sentry) {
        window.Sentry.captureException(new Error(errorObj.message), {
          extra: errorObj
        });
      }
    } catch (err) {
      console.error('Failed to send error to monitoring:', err);
    }
  }

  /**
     * Subscribe to error events
     */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
     * Emit error event
     */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error('Error in error handler callback:', err);
        }
      });
    }
  }

  /**
     * Get error history
     */
  getErrors(type = null) {
    if (type) {
      return this.errors.filter(e => e.type === type);
    }
    return this.errors;
  }

  /**
     * Clear error history
     */
  clearErrors() {
    this.errors = [];
  }

  /**
     * Create error boundary for React components
     */
  createErrorBoundary() {
    return {
      hasError: false,
      error: null,

      componentDidCatch(error, errorInfo) {
        this.handleComponentError(error, errorInfo);
        this.setState({ hasError: true, error });
      },

      render() {
        if (this.state.hasError) {
          return this.renderErrorFallback(this.state.error);
        }
        return this.props.children;
      }
    };
  }

  /**
     * Handle component errors
     */
  handleComponentError(error, errorInfo) {
    const errorObj = {
      id: `COMP-ERR-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'COMPONENT_ERROR',
      message: error.message,
      componentStack: errorInfo.componentStack,
      stack: error.stack
    };

    this.logError(errorObj);
  }

  /**
     * Global error handler setup
     */
  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      this.handleApiError(new Error(event.reason), {
        type: 'unhandledrejection',
        promise: event.promise
      });
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', event => {
      this.handleApiError(event.error || new Error(event.message), {
        type: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle network status changes
    window.addEventListener('online', () => {
      this.emit('network-status', { online: true });
    });

    window.addEventListener('offline', () => {
      this.emit('network-status', { online: false });
    });
  }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Auto-setup global handlers
if (typeof window !== 'undefined') {
  errorHandler.setupGlobalHandlers();
}

export default errorHandler;
