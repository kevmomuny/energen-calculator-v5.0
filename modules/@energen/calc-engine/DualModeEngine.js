/**
 * @module DualModeEngine
 * @description Wrapper that allows switching between original and Monterey engines
 * This is the "bypass valve" for the heart transplant
 */

import { EnergenCalculationEngine } from './index.js';
import { MontereyCalculationEngine } from '../monterey-engine/index.js';

export class DualModeCalculationEngine {
  constructor(dependencies = {}) {
    // Initialize both engines
    this.originalEngine = new EnergenCalculationEngine(dependencies);
    this.montereyEngine = new MontereyCalculationEngine(dependencies);

    // Default to original engine
    this.useMontereyMode = dependencies.useMontereyMode || false;
    this.autoDetectMode = dependencies.autoDetectMode !== false;

    this.version = '5.0.0-dual';
  }

  /**
     * Main calculation entry point with automatic mode detection
     * @param {Object} payload - Calculation payload
     * @returns {Promise<Object>} Calculation result
     */
  async calculate(payload) {
    let result;

    // Check for explicit mode override
    if (payload.calculationMode === 'monterey' || payload.useExcelLogic === true) {
      console.log('Using Monterey Excel engine (explicit)');
      result = await this.montereyEngine.calculate(payload);
      // Flatten the Monterey result structure for frontend compatibility
      return this._flattenMontereyResult(result);
    }

    if (payload.calculationMode === 'original' || payload.useExcelLogic === false) {
      console.log('Using original calculation engine (explicit)');
      return this.originalEngine.calculate(payload);
    }

    // Auto-detect mode based on service types
    if (this.autoDetectMode) {
      const shouldUseMonterey = this._shouldUseMontereyEngine(payload);
      if (shouldUseMonterey) {
        console.log('Using Monterey Excel engine (auto-detected)');
        result = await this.montereyEngine.calculate(payload);
        return this._flattenMontereyResult(result);
      }
    }

    // Use default mode
    if (this.useMontereyMode) {
      console.log('Using Monterey Excel engine (default)');
      result = await this.montereyEngine.calculate(payload);
      return this._flattenMontereyResult(result);
    } else {
      console.log('Using original calculation engine (default)');
      return this.originalEngine.calculate(payload);
    }
  }

  /**
     * Flatten Monterey result structure for frontend compatibility
     * @private
     */
  _flattenMontereyResult(montereyResult) {
    // If the result has a nested calculation property, flatten it
    if (montereyResult && montereyResult.calculation) {
      // Keep the nested structure for compatibility but also expose at top level
      const flattened = {
        ...montereyResult.calculation,
        calculation: montereyResult.calculation, // Keep nested for PDF generator
        metadata: montereyResult.metadata,
        success: montereyResult.success
      };
      return flattened;
    }
    return montereyResult;
  }

  /**
     * Auto-detect if Monterey engine should be used
     * @private
     */
  _shouldUseMontereyEngine(payload) {
    const services = payload.services || [];

    // Use Monterey if only services A, B, C, E, or F are requested
    const montereyServices = ['A', 'B', 'C', 'E', 'F'];
    const hasOnlyMontereyServices = services.every(s => montereyServices.includes(s));

    // Use Monterey if Service F is included (cylinder-based)
    const hasServiceF = services.includes('F');

    // Use Monterey if generator has cylinder info (for Service F)
    const hasCylinderInfo = payload.generators?.some(g => g.cylinders && g.injectorType);

    return (hasOnlyMontereyServices && services.length > 0) || hasServiceF || hasCylinderInfo;
  }

  /**
     * Switch to Monterey mode
     */
  useMontereyEngine() {
    this.useMontereyMode = true;
  }

  /**
     * Switch to original mode
     */
  useOriginalEngine() {
    this.useMontereyMode = false;
  }

  /**
     * Toggle between engines
     */
  toggleEngine() {
    this.useMontereyMode = !this.useMontereyMode;
  }

  /**
     * Get current engine mode
     */
  getCurrentMode() {
    return this.useMontereyMode ? 'monterey' : 'original';
  }

  /**
     * Calculate with both engines for comparison
     * Useful for testing and validation
     */
  async calculateBothEngines(payload) {
    const [originalResult, montereyResult] = await Promise.all([
      this.originalEngine.calculate(payload),
      this.montereyEngine.calculate(payload)
    ]);

    return {
      original: originalResult,
      monterey: montereyResult,
      comparison: this._compareResults(originalResult, montereyResult)
    };
  }

  /**
     * Compare results from both engines
     * @private
     */
  _compareResults(original, monterey) {
    const comparison = {
      totalMatch: false,
      differences: []
    };

    // Compare totals
    const origTotal = parseFloat(original.calculation?.total || 0);
    const montTotal = parseFloat(monterey.calculation?.total || 0);
    const difference = Math.abs(origTotal - montTotal);
    const percentDiff = (difference / origTotal) * 100;

    comparison.totalMatch = difference < 0.01; // Within 1 cent
    comparison.totalDifference = difference;
    comparison.percentDifference = percentDiff;

    // Compare key fields
    const fieldsToCompare = ['laborTotal', 'partsTotal', 'travelTotal', 'subtotal', 'total'];

    fieldsToCompare.forEach(field => {
      const origVal = parseFloat(original.calculation?.[field] || 0);
      const montVal = parseFloat(monterey.calculation?.[field] || 0);
      const diff = Math.abs(origVal - montVal);

      if (diff > 0.01) {
        comparison.differences.push({
          field,
          original: origVal,
          monterey: montVal,
          difference: diff
        });
      }
    });

    return comparison;
  }

  /**
     * Get version info from both engines
     */
  getVersionInfo() {
    return {
      dualMode: {
        version: this.version,
        currentMode: this.getCurrentMode(),
        autoDetect: this.autoDetectMode
      },
      original: this.originalEngine.getVersionInfo(),
      monterey: this.montereyEngine.getVersionInfo()
    };
  }

  /**
     * Clear cache for both engines
     */
  clearCache() {
    this.originalEngine.clearCache();
    this.montereyEngine.clearCache();
  }

  /**
     * Get audit logs from active engine
     */
  getAuditLog() {
    if (this.useMontereyMode) {
      // Monterey engine doesn't have audit log yet
      return [];
    }
    return this.originalEngine.getAuditLog();
  }

  /**
     * Calculate individual service price (for UI display)
     * @param {string} serviceCode - Service code (A-F)
     * @param {number} kw - Generator KW rating
     * @param {number} frequency - Annual frequency
     * @returns {Object} Service pricing details
     */
  calculateServicePrice(serviceCode, kw, frequency = 1) {
    // Always use Monterey engine for service pricing (Excel parity)
    if (this.montereyEngine && this.montereyEngine.calculateServicePrice) {
      return this.montereyEngine.calculateServicePrice(serviceCode, kw, frequency);
    }

    // Fallback to simple calculation
    const basePrice = 1000;
    return {
      serviceCode,
      description: `Service ${serviceCode}`,
      annual: basePrice * frequency,
      monthly: Math.round((basePrice * frequency) / 12),
      perInstance: basePrice,
      frequency
    };
  }
}

// Factory function
export function createDualModeEngine(dependencies = {}) {
  return new DualModeCalculationEngine(dependencies);
}

export default DualModeCalculationEngine;
