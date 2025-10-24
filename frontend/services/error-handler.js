/**
 * Global Error Handler Service
 * Provides comprehensive error handling and user feedback
 * ES6 Module - exports ErrorHandler class and utility functions
 * Dependencies: utilities.js (updateStatus)
 */

import { updateStatus } from '../js/utilities.js';

class ErrorHandler {
  constructor() {
    this.errors = []
    this.maxErrors = 50
    this.setupGlobalHandlers()
  }

  setupGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Promise Rejection', event.reason)
      event.preventDefault()
    })

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.handleError('Global Error', event.error || event.message)
      event.preventDefault()
    })
  }

  handleError(source, error, context = {}) {
    // Log to console for debugging
    console.error(`[${source}]`, error, context)

    // Store error for analysis
    this.errors.push({
      source,
      error: error?.message || String(error),
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString()
    })

    // Trim old errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Show user-friendly message
    this.showUserMessage(source, error)
  }

  showUserMessage(source, error) {
    const message = this.getUserMessage(source, error)

    // Use updateStatus from utilities module
    if (typeof updateStatus === 'function') {
      updateStatus(message, 'error')
    } else {
      // Fallback to console
      console.warn('User notification:', message)
    }
  }

  getUserMessage(source, error) {
    const errorStr = error?.message || String(error)

    // API-specific errors
    if (errorStr.includes('API failed') || errorStr.includes('fetch')) {
      if (errorStr.includes('distance')) {
        return 'Unable to calculate distance. Please enter manually.'
      }
      if (errorStr.includes('tax')) {
        return 'Unable to fetch tax rate. Using default 10.25%.'
      }
      if (errorStr.includes('enrichment')) {
        return 'Unable to enrich customer data. Please enter manually.'
      }
      if (errorStr.includes('price')) {
        return 'Unable to calculate service price. Please refresh and try again.'
      }
      return 'Connection error. Please check your internet and try again.'
    }

    // Module initialization errors
    if (errorStr.includes('module') || errorStr.includes('initialize')) {
      return 'System initialization error. Please refresh the page.'
    }

    // Calculation errors
    if (errorStr.includes('calculate') || errorStr.includes('calc')) {
      return 'Calculation error. Please verify your inputs.'
    }

    // Network errors
    if (errorStr.includes('network') || errorStr.includes('Network')) {
      return 'Network error. Please check your connection.'
    }

    // Default message
    return 'An error occurred. Please try again or refresh the page.'
  }

  // Wrap async functions with error handling
  wrapAsync(fn, source = 'Unknown') {
    return async (...args) => {
      try {
        return await fn(...args)
      } catch (error) {
        this.handleError(source, error, { args })
        throw error // Re-throw to maintain promise chain
      }
    }
  }

  // Wrap API calls with retry logic
  async retryableAPICall(fn, maxRetries = 3, delay = 1000) {
    let lastError = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          throw error
        }

        // Wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
        }
      }
    }

    throw lastError
  }

  // Get error report for debugging
  getErrorReport() {
    return {
      errors: this.errors,
      summary: {
        total: this.errors.length,
        bySource: this.errors.reduce((acc, err) => {
          acc[err.source] = (acc[err.source] || 0) + 1
          return acc
        }, {}),
        recent: this.errors.slice(-10)
      }
    }
  }

  // Clear error history
  clearErrors() {
    this.errors = []
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler()

// Named exports for ES6 modules
export { ErrorHandler }
export const safeAPICall = (fn, source) => errorHandler.wrapAsync(fn, source)
export const retryAPICall = (fn, maxRetries, delay) => errorHandler.retryableAPICall(fn, maxRetries, delay)
export const getErrorReport = () => errorHandler.getErrorReport()
export const clearErrors = () => errorHandler.clearErrors()
export { errorHandler }
export default errorHandler

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.errorHandler = errorHandler
  window.safeAPICall = safeAPICall
  window.retryAPICall = retryAPICall
  window.getErrorReport = getErrorReport
  window.clearErrors = clearErrors
}
