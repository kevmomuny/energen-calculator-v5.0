/**
 * Utility Functions Module
 * Helper functions used throughout the application
 * Dependencies: state.js
 */

import { state } from './state.js';

// BUG-024 FIX: Track timeout to prevent race condition with overlapping status messages
let statusTimeout;

/**
 * Update status message in UI
 * @param {string} message - Status message to display
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 */
export function updateStatus(message, type = 'info') {
    const statusElement = document.getElementById('status-message');
    if (!statusElement) return;

    // BUG-024 FIX: Clear any pending timeout before setting new message
    clearTimeout(statusTimeout);

    statusElement.textContent = message;

    if (type === 'error') {
        statusElement.style.color = 'var(--accent-danger)';
    } else if (type === 'success') {
        statusElement.style.color = 'var(--accent-success)';
    } else if (type === 'warning') {
        statusElement.style.color = 'var(--accent-warning)';
    } else {
        statusElement.style.color = 'var(--text-tertiary)';
    }

    // Clear after 3 seconds for non-errors, 5 seconds for errors
    const clearDelay = type === 'error' ? 5000 : 3000;
    statusTimeout = setTimeout(() => {
        if (statusElement) {
            statusElement.textContent = 'Ready';
            statusElement.style.color = 'var(--text-tertiary)';
        }
    }, clearDelay);
}

/**
 * Show critical error overlay
 * @param {string} message - Error message to display
 */
export function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#dc3545;color:white;padding:20px;border-radius:8px;z-index:9999;font-size:18px;';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
}

/**
 * Show notification (stub for compatibility)
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 * @param {number} duration - Duration in ms
 */
export function showNotification(message, type = 'info', duration = 4000) {
    updateStatus(message, type);
}

/**
 * Show loading indicator with message
 * @param {string} elementId - ID of button/element to show loading on
 * @param {string} message - Loading message to display
 */
export function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Store original state
    if (!element.dataset.originalText) {
        element.dataset.originalText = element.innerHTML;
        element.dataset.originalDisabled = element.disabled;
    }

    // Set loading state
    element.disabled = true;
    element.innerHTML = `
        <span class="loading-spinner" style="display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 8px;"></span>
        ${message}
    `;

    // Add spinner animation if not already present
    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    updateStatus(message, 'info');
}

/**
 * Hide loading indicator and restore original state
 * @param {string} elementId - ID of button/element to restore
 * @param {string} successMessage - Optional success message
 */
export function hideLoading(elementId, successMessage = null) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Restore original state
    if (element.dataset.originalText) {
        element.innerHTML = element.dataset.originalText;
        element.disabled = element.dataset.originalDisabled === 'true';
        delete element.dataset.originalText;
        delete element.dataset.originalDisabled;
    }

    if (successMessage) {
        updateStatus(successMessage, 'success');
    }
}

/**
 * Show inline error message on form field
 * @param {string} fieldId - ID of the form field
 * @param {string} errorMessage - Error message to display
 */
export function showFieldError(fieldId, errorMessage) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Remove existing error
    const existingError = field.parentElement.querySelector('.field-error-message');
    if (existingError) {
        existingError.remove();
    }

    // Add error styling to field
    field.style.borderColor = 'var(--accent-danger, #dc3545)';
    field.style.boxShadow = '0 0 0 2px rgba(220, 53, 69, 0.1)';

    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.style.cssText = 'color: var(--accent-danger, #dc3545); font-size: 12px; margin-top: 4px; display: flex; align-items: center; gap: 4px;';
    errorDiv.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 14px;">error</span>
        <span>${errorMessage}</span>
    `;
    field.parentElement.appendChild(errorDiv);

    // Auto-remove error when user starts typing
    const removeError = () => {
        field.style.borderColor = '';
        field.style.boxShadow = '';
        errorDiv.remove();
        field.removeEventListener('input', removeError);
        field.removeEventListener('change', removeError);
    };
    field.addEventListener('input', removeError);
    field.addEventListener('change', removeError);
}

/**
 * Clear inline error from form field
 * @param {string} fieldId - ID of the form field
 */
export function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.style.borderColor = '';
    field.style.boxShadow = '';

    const existingError = field.parentElement.querySelector('.field-error-message');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Show toast notification (non-blocking, auto-dismiss)
 * @param {string} message - Notification message
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 8px;';
        document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';

    const colors = {
        success: { bg: '#10b981', icon: 'check_circle' },
        error: { bg: '#ef4444', icon: 'error' },
        warning: { bg: '#f59e0b', icon: 'warning' },
        info: { bg: '#3b82f6', icon: 'info' }
    };

    const config = colors[type] || colors.info;

    toast.style.cssText = `
        background: ${config.bg};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 280px;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
        font-size: 14px;
    `;

    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 20px;">${config.icon}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px; padding: 0; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">&times;</button>
    `;

    // Add animation style if not present
    if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Format money with 2 decimal places and comma separators
 * @param {number|string} amount - Amount to format
 * @returns {string} Formatted money string
 */
export function formatMoney(amount) {
    // Ensure we have a number
    const num = parseFloat(amount) || 0;
    // Format to 2 decimal places with comma separators
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Debounce function to prevent excessive function calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Get kW range string for a given kW value
 * @param {number} kw - Kilowatt value
 * @returns {string} kW range string (e.g., "2-14", "15-30")
 */
export function getKwRange(kw) {
    if (kw <= 14) return '2-14';
    if (kw <= 30) return '15-30';
    if (kw <= 150) return '35-150';
    if (kw <= 250) return '155-250';
    if (kw <= 400) return '255-400';
    if (kw <= 500) return '405-500';
    if (kw <= 670) return '505-670';
    if (kw <= 1050) return '675-1050';
    if (kw <= 1500) return '1055-1500';
    return '1500-2050';
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * BUG FIX 5: Get labor rate for specific kW from settings tiers
 * @param {number} kw - Generator kW rating
 * @returns {number} Labor rate for this kW tier
 */
export function getLaborRateForKW(kw) {
    if (!window.state?.activeSettings || !window.state.activeSettings.laborRateTiers) {
        return window.state?.activeSettings?.laborRate || 250;
    }

    const tiers = window.state.activeSettings.laborRateTiers;

    // Find matching tier (tiers should be sorted by minKW)
    for (const tier of tiers) {
        if (kw >= tier.minKW && kw <= tier.maxKW) {
            console.log(`[LABOR TIER] ${kw}kW matches tier ${tier.minKW}-${tier.maxKW}kW = $${tier.rate}/hr`);
            return tier.rate;
        }
    }

    // Default to base labor rate if no tier matches
    return window.state.activeSettings.laborRate;
}

// Expose utilities to window for backward compatibility
if (typeof window !== 'undefined') {
    window.updateStatus = updateStatus;
    window.showCriticalError = showCriticalError;
    window.showNotification = showNotification;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showFieldError = showFieldError;
    window.clearFieldError = clearFieldError;
    window.showToast = showToast;
    window.formatMoney = formatMoney;
    window.debounce = debounce;
    window.getKwRange = getKwRange;
    window.calculateHaversineDistance = calculateHaversineDistance;
    window.getLaborRateForKW = getLaborRateForKW;
}
