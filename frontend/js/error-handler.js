/**
 * Global Error Handler
 * Prevents console from auto-opening and handles errors gracefully
 * @module error-handler
 */

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Error tracking
const errorLog = [];
const MAX_ERROR_LOG = 50;

/**
 * Log error internally without triggering console
 */
function logError(type, message, error) {
  errorLog.push({
    type,
    message,
    error: error?.stack || error?.message || error,
    timestamp: new Date().toISOString()
  });
  
  // Keep log size manageable
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }
}

/**
 * Override console.error to prevent auto-opening
 * Only use original console.error in development mode
 */
console.error = function(...args) {
  logError('error', args[0], args[1]);
  
  // Only output to console in development mode
  if (window.location.hostname === 'localhost') {
    // Use setTimeout to prevent console auto-open
    setTimeout(() => {
      originalConsoleError.apply(console, args);
    }, 0);
  }
};

/**
 * Override console.warn similarly
 */
console.warn = function(...args) {
  logError('warning', args[0], args[1]);
  
  if (window.location.hostname === 'localhost') {
    setTimeout(() => {
      originalConsoleWarn.apply(console, args);
    }, 0);
  }
};

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
  // Prevent the browser default behavior (console opening)
  event.preventDefault();
  
  logError('unhandled_rejection', 'Unhandled Promise Rejection', event.reason);
  
  // Log to console in dev mode only
  if (window.location.hostname === 'localhost') {
    setTimeout(() => {
      originalConsoleError('Unhandled Promise Rejection:', event.reason);
    }, 0);
  }
  
  // Return false to prevent default behavior
  return false;
});

/**
 * Handle global errors
 */
window.addEventListener('error', function(event) {
  // Prevent default behavior for known non-critical errors
  const ignoredErrors = [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed',
    'Non-Error promise rejection captured'
  ];
  
  const errorMessage = event.message || event.error?.message || '';
  
  if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
    event.preventDefault();
    return false;
  }
  
  logError('global_error', errorMessage, event.error);
  
  // For critical errors, still log to console in dev
  if (window.location.hostname === 'localhost' && event.error) {
    setTimeout(() => {
      originalConsoleError('Global Error Details:', {
        message: event.error?.message,
        stack: event.error?.stack,
        name: event.error?.name,
        fileName: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        fullError: event.error
      });
    }, 0);
  }
  
  // Prevent default behavior
  event.preventDefault();
  return false;
});

/**
 * Get error log for debugging
 */
window.getErrorLog = function() {
  return errorLog;
};

/**
 * Clear error log
 */
window.clearErrorLog = function() {
  errorLog.length = 0;
};

/**
 * Global error logging function (non-triggering)
 */
window.logError = function(type, message, error) {
  errorLog.push({
    type,
    message,
    error: error?.stack || error?.message || error,
    timestamp: new Date().toISOString()
  });
  
  // Keep log size manageable
  if (errorLog.length > MAX_ERROR_LOG) {
    errorLog.shift();
  }
  
  // Only output to console in dev mode, deferred to prevent auto-open
  if (window.location.hostname === 'localhost') {
    setTimeout(() => {
      originalConsoleWarn(`[${type}]`, message, error || '');
    }, 0);
  }
};

/**
 * Display user-friendly error message
 */
window.showUserError = function(message, duration = 3000) {
  // Check if there's a status element to show errors
  const statusElement = document.getElementById('status') || 
                       document.querySelector('.status-message');
  
  if (statusElement) {
    const originalContent = statusElement.innerHTML;
    const originalClass = statusElement.className;
    
    statusElement.className = 'status-message error';
    statusElement.textContent = message;
    
    setTimeout(() => {
      statusElement.innerHTML = originalContent;
      statusElement.className = originalClass;
    }, duration);
  }
}

/**
 * Wrap async functions with error handling
 */
window.safeAsync = function(fn) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      logError('async_error', `Error in ${fn.name || 'anonymous'}`, error);
      
      // Re-throw in development
      if (window.location.hostname === 'localhost') {
        throw error;
      }
      
      // In production, return null or handle gracefully
      return null;
    }
  };
}

/**
 * Wrap promise chains with error handling
 */
window.safePromise = function(promise) {
  return promise.catch(error => {
    logError('promise_error', 'Promise rejected', error);
    
    // Re-throw in development
    if (window.location.hostname === 'localhost') {
      throw error;
    }
    
    return null;
  });
}

// Initialize immediately