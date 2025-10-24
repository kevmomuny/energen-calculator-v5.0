/**
 * Conditional Logging Utility - Frontend
 * Replaces console.log with environment-aware logging
 *
 * USAGE:
 * ------
 * import { createLogger } from '../js/logger.js';
 * const logger = createLogger('ModuleName');
 *
 * // Development-only logging (automatically disabled in production)
 * logger.debug('Updating state:', newState);     // Only shows on localhost
 * logger.trace('Event fired:', event);           // Only shows if DEBUG=true in localStorage
 *
 * // Always-shown logging
 * logger.info('Quote calculated successfully');  // Always shows (blue)
 * logger.warn('Using fallback pricing');         // Always shows (yellow)
 * logger.error('API call failed', error);        // Always shows (red)
 *
 * ENABLING DEBUG MODE:
 * --------------------
 * In browser console:
 *   localStorage.setItem('DEBUG', 'true')        // Enable debug logging
 *   localStorage.removeItem('DEBUG')             // Disable debug logging
 *
 * BENEFITS:
 * ---------
 * - No manual if checks needed
 * - Clean production logs (no debugging clutter)
 * - Color-coded messages in browser console
 * - Easy toggle via localStorage
 * - Module identification in all logs
 * - Consistent formatting across frontend
 *
 * MIGRATION GUIDE:
 * ----------------
 * OLD:
 *   console.log('Calculating for unit:', unitId);
 *   console.log('%c[TRACE] Entry', 'color: blue', data);
 *
 * NEW:
 *   import { createLogger } from '../js/logger.js';
 *   const logger = createLogger('UnitManagement');
 *   logger.debug('Calculating for unit:', unitId);
 *   logger.trace('Entry', data);
 */

const isDevelopment = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
const isDebugMode = isDevelopment || localStorage.getItem('DEBUG') === 'true';

export class Logger {
    constructor(module) {
        this.module = module;
    }

    /**
     * Debug logging (development only)
     * Use for: Developer troubleshooting, state changes, UI updates
     */
    debug(...args) {
        if (isDebugMode) {
            console.log(`%c[DEBUG][${this.module}]`, 'color: #888', ...args);
        }
    }

    /**
     * Info logging (always shown)
     * Use for: User-visible events, successful operations, status updates
     */
    info(...args) {
        console.log(`%c[INFO][${this.module}]`, 'color: #0066cc', ...args);
    }

    /**
     * Warning logging (always shown)
     * Use for: Validation warnings, fallback behavior, deprecation notices
     */
    warn(...args) {
        console.warn(`[WARN][${this.module}]`, ...args);
    }

    /**
     * Error logging (always shown)
     * Use for: API failures, validation errors, unexpected states
     */
    error(...args) {
        console.error(`[ERROR][${this.module}]`, ...args);
    }

    /**
     * Trace logging (verbose debug, development only)
     * Use for: Function entry/exit, event handlers, detailed flow
     */
    trace(...args) {
        if (isDebugMode) {
            console.log(`%c[TRACE][${this.module}]`, 'color: #666; font-size: 11px', ...args);
        }
    }

    /**
     * Performance logging (development only)
     * Use for: Timing measurements, optimization insights
     */
    perf(label, startTime) {
        if (isDebugMode) {
            const duration = performance.now() - startTime;
            console.log(`%c[PERF][${this.module}] ${label}: ${duration.toFixed(2)}ms`, 'color: #ff9800');
        }
    }

    /**
     * Grand trace logging (colorful, development only)
     * Replaces the custom %c styled console.logs
     */
    grandTrace(message, data) {
        if (isDebugMode) {
            console.log(`%c=== ${message} ===`, 'background: #2f4f4f; color: #87ceeb', data);
        }
    }
}

/**
 * Create logger instance for a module
 * @param {string} moduleName - Name of the module (e.g., 'SummaryCalculator', 'UnitManagement')
 * @returns {Logger} Logger instance
 *
 * @example
 * const logger = createLogger('ServicePricing');
 * logger.debug('Updating prices for unit:', unitId);
 * logger.info('Prices calculated successfully');
 */
export function createLogger(moduleName) {
    return new Logger(moduleName);
}
