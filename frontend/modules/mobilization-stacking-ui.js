/**
 * Mobilization Stacking UI Module
 *
 * Provides UI controls for mobilization stacking configuration
 * Integrates with settings service and state management
 */

import { mobilizationSettings } from '../services/mobilization-settings.js';
import { api } from '../services/api.js';

export class MobilizationStackingUI {
    constructor() {
        this.container = null;
        this.sliderInput = null;
        this.percentageDisplay = null;
        this.savingsDisplay = null;
        this.enableToggle = null;
        this.presetButtons = {};

        // Initialize from settings
        this.settings = mobilizationSettings.getSettings();

        // Subscribe to settings changes
        this.unsubscribe = mobilizationSettings.onChange((newSettings) => {
            this.settings = newSettings;
            this.updateUI();
        });
    }

    /**
     * Create the UI component
     */
    create() {
        const container = document.createElement('div');
        container.className = 'mobilization-stacking-container';
        container.innerHTML = `
            <div class="mobilization-header">
                <h3>
                    <span class="icon">🚚</span>
                    Mobilization Stacking
                    <span class="info-badge" title="Reduce mobilization costs when bundling services">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1"/>
                            <text x="8" y="11" text-anchor="middle" font-size="10">?</text>
                        </svg>
                    </span>
                </h3>
                <label class="toggle-switch">
                    <input type="checkbox" id="mobilization-enable" ${this.settings.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="mobilization-content ${!this.settings.enabled ? 'disabled' : ''}">
                <div class="preset-buttons">
                    <button class="preset-btn" data-preset="aggressive" data-value="0">
                        <span class="preset-label">Aggressive</span>
                        <span class="preset-value">0%</span>
                    </button>
                    <button class="preset-btn active" data-preset="competitive" data-value="35">
                        <span class="preset-label">Competitive</span>
                        <span class="preset-value">35%</span>
                    </button>
                    <button class="preset-btn" data-preset="standard" data-value="70">
                        <span class="preset-label">Standard</span>
                        <span class="preset-value">70%</span>
                    </button>
                    <button class="preset-btn" data-preset="full" data-value="100">
                        <span class="preset-label">Full Price</span>
                        <span class="preset-value">100%</span>
                    </button>
                </div>

                <div class="slider-container">
                    <label for="stacking-discount">Stacking Discount</label>
                    <div class="slider-wrapper">
                        <input
                            type="range"
                            id="stacking-discount"
                            min="0"
                            max="100"
                            step="5"
                            value="${this.settings.stackingDiscount}"
                            ${!this.settings.enabled ? 'disabled' : ''}
                        >
                        <div class="slider-labels">
                            <span>Max Savings</span>
                            <span class="current-value">${this.settings.stackingDiscount}%</span>
                            <span>Full Price</span>
                        </div>
                    </div>
                </div>

                <div class="example-calculation">
                    <h4>Example Savings</h4>
                    <div class="example-details">
                        <div class="example-row">
                            <span>Services A, B, C on 30kW generator</span>
                        </div>
                        <div class="example-row highlight">
                            <span>Standard Mobilization:</span>
                            <span class="standard-total">$900</span>
                        </div>
                        <div class="example-row highlight">
                            <span>With Stacking:</span>
                            <span class="stacked-total">$690</span>
                        </div>
                        <div class="example-row savings">
                            <span>You Save:</span>
                            <span class="savings-amount">$210 (23%)</span>
                        </div>
                    </div>
                    <div class="explanation">
                        <p>When services occur during the same visit, only the largest mobilization
                        is charged at full price. Additional mobilizations are discounted by your
                        selected percentage.</p>
                    </div>
                </div>
            </div>

            <style>
                .mobilization-stacking-container {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }

                .mobilization-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .mobilization-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0;
                    font-size: 18px;
                    color: #333;
                }

                .info-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    cursor: help;
                    color: #666;
                }

                .toggle-switch {
                    position: relative;
                    width: 50px;
                    height: 24px;
                }

                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: .3s;
                    border-radius: 24px;
                }

                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                }

                input:checked + .toggle-slider {
                    background-color: #28a745;
                }

                input:checked + .toggle-slider:before {
                    transform: translateX(26px);
                }

                .mobilization-content.disabled {
                    opacity: 0.6;
                    pointer-events: none;
                }

                .preset-buttons {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin-bottom: 25px;
                }

                .preset-btn {
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background: white;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }

                .preset-btn:hover {
                    background: #f8f9fa;
                    border-color: #007bff;
                }

                .preset-btn.active {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }

                .preset-label {
                    display: block;
                    font-weight: 600;
                    font-size: 13px;
                }

                .preset-value {
                    display: block;
                    font-size: 12px;
                    margin-top: 2px;
                    opacity: 0.8;
                }

                .slider-container {
                    margin-bottom: 25px;
                }

                .slider-container label {
                    display: block;
                    margin-bottom: 10px;
                    font-weight: 600;
                    color: #555;
                }

                .slider-wrapper {
                    position: relative;
                }

                input[type="range"] {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                    background: linear-gradient(to right, #28a745 0%, #ffc107 50%, #dc3545 100%);
                    outline: none;
                    -webkit-appearance: none;
                }

                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #007bff;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                input[type="range"]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #007bff;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                .slider-labels {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 5px;
                    font-size: 12px;
                    color: #666;
                }

                .current-value {
                    font-weight: 600;
                    color: #007bff;
                }

                .example-calculation {
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 15px;
                }

                .example-calculation h4 {
                    margin: 0 0 15px 0;
                    color: #333;
                    font-size: 14px;
                }

                .example-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 5px 0;
                    font-size: 13px;
                }

                .example-row.highlight {
                    font-weight: 600;
                }

                .example-row.savings {
                    border-top: 1px solid #dee2e6;
                    margin-top: 5px;
                    padding-top: 10px;
                    color: #28a745;
                    font-weight: 600;
                }

                .explanation {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid #dee2e6;
                }

                .explanation p {
                    margin: 0;
                    font-size: 12px;
                    color: #666;
                    line-height: 1.5;
                }
            </style>
        `;

        this.container = container;
        this.attachEventListeners();
        this.updateExample();

        return container;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Enable/disable toggle
        this.enableToggle = this.container.querySelector('#mobilization-enable');
        this.enableToggle.addEventListener('change', (e) => {
            mobilizationSettings.setEnabled(e.target.checked);
            this.container.querySelector('.mobilization-content')
                .classList.toggle('disabled', !e.target.checked);
        });

        // Slider input
        this.sliderInput = this.container.querySelector('#stacking-discount');
        this.sliderInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            mobilizationSettings.setStackingDiscount(value);
            this.updateExample();
            this.updateSliderLabel(value);
        });

        // Preset buttons
        this.container.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = btn.dataset.preset;
                const value = parseInt(btn.dataset.value);

                mobilizationSettings.applyPreset(preset);
                this.sliderInput.value = value;
                this.updateSliderLabel(value);
                this.updateExample();

                // Update active button
                this.container.querySelectorAll('.preset-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
    }

    /**
     * Update slider label
     */
    updateSliderLabel(value) {
        const label = this.container.querySelector('.current-value');
        if (label) {
            label.textContent = `${value}%`;
        }
    }

    /**
     * Update example calculation
     */
    updateExample() {
        const example = mobilizationSettings.calculateExample(
            ['A', 'B', 'C'],
            30
        );

        const standardTotal = this.container.querySelector('.standard-total');
        const stackedTotal = this.container.querySelector('.stacked-total');
        const savingsAmount = this.container.querySelector('.savings-amount');

        if (standardTotal) standardTotal.textContent = `$${example.standardTotal}`;
        if (stackedTotal) stackedTotal.textContent = `$${example.stackedTotal}`;
        if (savingsAmount) {
            savingsAmount.textContent = `$${example.savings} (${example.percentSaved}%)`;
        }
    }

    /**
     * Update UI from settings
     */
    updateUI() {
        if (this.enableToggle) {
            this.enableToggle.checked = this.settings.enabled;
        }

        if (this.sliderInput) {
            this.sliderInput.value = this.settings.stackingDiscount;
            this.updateSliderLabel(this.settings.stackingDiscount);
        }

        this.updateExample();

        // Update active preset button
        this.container.querySelectorAll('.preset-btn').forEach(btn => {
            const value = parseInt(btn.dataset.value);
            btn.classList.toggle('active', value === this.settings.stackingDiscount);
        });
    }

    /**
     * Mount to DOM
     */
    mount(selector) {
        const target = document.querySelector(selector);
        if (target) {
            const element = this.create();
            target.appendChild(element);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Export singleton instance
export const mobilizationStackingUI = new MobilizationStackingUI();