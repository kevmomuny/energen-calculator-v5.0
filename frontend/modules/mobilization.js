/**
 * @fileoverview Mobilization Stacking Module - Phase 3
 * Handles mobilization stacking settings and calculations
 * Manages the discount system for multiple services on same visit
 *
 * @module frontend/modules/mobilization
 * @author Energen Team
 * @version 5.0.0
 */

/**
 * Default mobilization settings
 * @typedef {Object} MobilizationSettings
 * @property {boolean} enabled - Whether stacking is enabled
 * @property {number} stackingCharge - Percentage charge on secondary mobilizations (0-100)
 */
let mobilizationSettings = {
    enabled: true,
    stackingCharge: 65 // Default 65% charge on secondary mobilizations
};

/**
 * Toggle mobilization stacking on/off
 * Updates UI state and saves to localStorage
 */
export function toggleMobilizationStacking() {
    const toggle = document.getElementById('mobilizationToggle');
    const content = document.querySelector('.mobilization-content');

    mobilizationSettings.enabled = !mobilizationSettings.enabled;

    if (mobilizationSettings.enabled) {
        toggle.classList.add('active');
        content.classList.remove('disabled');
    } else {
        toggle.classList.remove('active');
        content.classList.add('disabled');
    }

    // Update example calculation
    updateMobilizationExample();

    // Save to localStorage
    localStorage.setItem('mobilizationSettings', JSON.stringify(mobilizationSettings));
}

/**
 * Update mobilization charge percentage
 * @param {number|string} value - Charge percentage (0-100)
 */
export function updateMobilizationCharge(value) {
    mobilizationSettings.stackingCharge = parseInt(value);

    // Update display
    document.getElementById('chargeValue').textContent = value + '%';

    // Update preset button states
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-charge') === value) {
            btn.classList.add('active');
        }
    });

    // Update example calculation
    updateMobilizationExample();

    // Save to localStorage
    localStorage.setItem('mobilizationSettings', JSON.stringify(mobilizationSettings));
}

/**
 * Set mobilization charge to specific value and update UI
 * @param {number|string} value - Charge percentage preset
 */
export function setMobilizationCharge(value) {
    document.getElementById('mobilizationSlider').value = value;
    updateMobilizationCharge(value);
}

/**
 * Update mobilization example calculation display
 * Shows comparison between standard and stacked pricing
 */
export function updateMobilizationExample() {
    // Example: 3 services on same visit, 2 hours each @ $150/hr
    const baseHours = 2;
    const hourlyRate = 150;
    const serviceCount = 3;

    const standardTotal = serviceCount * baseHours * hourlyRate;
    const largestMobilization = baseHours * hourlyRate;
    const otherMobilizations = (serviceCount - 1) * baseHours * hourlyRate;
    const chargedOthers = otherMobilizations * (mobilizationSettings.stackingCharge / 100);
    const stackedTotal = largestMobilization + chargedOthers;
    const savings = standardTotal - stackedTotal;

    // Update example display
    const exampleHtml = `
        <div class="example-row">
            <span class="example-label">Standard (no stacking):</span>
            <span class="example-value">$${standardTotal.toFixed(0)}</span>
        </div>
        <div class="example-row">
            <span class="example-label">With stacking (${mobilizationSettings.stackingCharge}% charge):</span>
            <span class="example-value">$${stackedTotal.toFixed(0)}</span>
        </div>
        <div class="example-row">
            <span class="example-label">Customer saves:</span>
            <span class="example-value savings-amount">$${savings.toFixed(0)}</span>
        </div>
    `;

    const exampleDetails = document.querySelector('.example-details');
    if (exampleDetails) {
        exampleDetails.innerHTML = exampleHtml;
    }
}

/**
 * Load mobilization settings from localStorage on startup
 * Restores saved settings and updates UI accordingly
 */
export function loadMobilizationSettings() {
    try {
        const saved = localStorage.getItem('mobilizationSettings');
        if (saved) {
            mobilizationSettings = JSON.parse(saved);

            // Apply saved settings to UI
            const toggle = document.getElementById('mobilizationToggle');
            const content = document.querySelector('.mobilization-content');
            const slider = document.getElementById('mobilizationSlider');

            if (toggle && content && slider) {
                if (mobilizationSettings.enabled) {
                    toggle.classList.add('active');
                    content.classList.remove('disabled');
                } else {
                    toggle.classList.remove('active');
                    content.classList.add('disabled');
                }

                slider.value = mobilizationSettings.stackingCharge;
                updateMobilizationCharge(mobilizationSettings.stackingCharge);
            }
        }
    } catch (error) {
        console.error('Error loading mobilization settings:', error);
    }
}

/**
 * Get current mobilization settings
 * @returns {MobilizationSettings} Current settings
 */
export function getMobilizationSettings() {
    return { ...mobilizationSettings };
}

// Expose to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.mobilization = {
        toggleMobilizationStacking,
        updateMobilizationCharge,
        setMobilizationCharge,
        updateMobilizationExample,
        loadMobilizationSettings,
        getMobilizationSettings
    };
}
