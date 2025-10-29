/**
 * Calculator API Client for RFP Evaluator
 * Calls actual Energen Calculator v5.0 API for accurate pricing
 *
 * @module CalculatorAPIClient
 * @version 1.0.0
 */

const fetch = require('node-fetch');

/**
 * Client for interacting with Energen Calculator v5.0 API
 * Provides methods for calculating accurate pricing with prevailing wage support
 */
class CalculatorAPIClient {
  /**
   * Initialize calculator API client
   * @param {string} calculatorUrl - Base URL of calculator API (default: http://localhost:3002)
   */
  constructor(calculatorUrl = 'http://localhost:3002') {
    this.baseUrl = calculatorUrl;
  }

  /**
   * Check if calculator API is available
   * @returns {Promise<boolean>} True if API is responding
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error(`   ❌ Calculator API health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate pricing for a single generator
   * @param {Object} generator - Generator configuration
   * @param {number} generator.kwRating - Generator kW rating
   * @param {string} generator.fuelType - Fuel type (Diesel, Natural Gas, Propane)
   * @param {number} generator.cylinders - Number of cylinders
   * @param {string} generator.unitNumber - Unit identifier (optional)
   * @param {Array<string>} services - Service codes (e.g., ['A', 'B', 'D', 'E'])
   * @param {Object} settings - Pricing settings
   * @param {string} settings.customerType - Customer type (government, commercial, etc.)
   * @param {boolean} settings.taxExempt - Tax exemption status
   * @param {number} settings.laborRate - Base labor rate
   * @param {boolean} settings.prevailingWageRequired - Prevailing wage flag
   * @param {string} settings.customerZip - Customer ZIP code for DIR API
   * @returns {Promise<Object>} Calculation result
   */
  async calculateGenerator(generator, services, settings = {}) {
    // Build service frequencies
    const serviceFrequencies = this._buildFrequencies(services, generator.frequencies);

    // Build payload matching calculator API schema (server-secure.cjs:245-274)
    const payload = {
      services: services,  // AT ROOT LEVEL (not in generators)
      customerInfo: {  // "customerInfo" not "customer"
        name: settings.customerName || 'RFP Customer',
        address: settings.customerAddress || '',
        city: settings.customerCity || '',
        state: settings.customerState || 'CA',
        zip: settings.customerZip || ''
      },
      generators: [{
        kw: generator.kwRating || generator.kw,  // "kw" not "kwRating"
        quantity: generator.quantity || 1,
        cylinders: generator.cylinders || 6
      }],
      settings: {
        laborRate: settings.laborRate || 180.00,
        prevailingWageRequired: settings.prevailingWageRequired || false,
        customerZip: settings.customerZip || null,
        includeTravel: settings.includeTravel !== false,
        distance: settings.distance || 0
      },
      serviceFrequencies: serviceFrequencies  // AT ROOT LEVEL
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Calculator API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      // API returns { calculation: { generators: [...], ... } }
      if (!result.calculation || !result.calculation.generators || result.calculation.generators.length === 0) {
        throw new Error('Calculator API returned no generator results');
      }

      // Extract the first generator and the calculation totals
      const generator = result.calculation.generators[0];

      return {
        success: true,
        generator: {
          ...generator,
          // Include the per-generator annual totals from calculation
          totalAnnualPrice: parseFloat(result.calculation.total),
          laborTotal: parseFloat(result.calculation.laborTotal),
          partsTotal: parseFloat(result.calculation.partsTotal),
          mobilizationTotal: parseFloat(result.calculation.mobilizationTotal),
          taxTotal: parseFloat(result.calculation.tax),
          subtotal: parseFloat(result.calculation.subtotal)
        },
        calculation: result.calculation,
        metadata: {
          calculatedAt: new Date().toISOString(),
          apiVersion: result.version || 'unknown'
        }
      };
    } catch (error) {
      console.error(`   ❌ Calculation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        generator: null
      };
    }
  }

  /**
   * Calculate pricing for all generators in RFP (batch processing)
   * @param {Array<Object>} generators - List of generator configurations
   * @param {Array<string>} services - Service codes applicable to all generators
   * @param {Object} settings - Pricing settings
   * @returns {Promise<Array<Object>>} Array of calculation results
   */
  async calculateBatch(generators, services, settings = {}) {
    console.log(`\n📊 Batch calculating ${generators.length} generators...`);
    console.log(`   Services: ${services.join(', ')}`);
    console.log(`   Prevailing wage: ${settings.prevailingWageRequired ? 'YES' : 'NO'}`);
    if (settings.customerZip) {
      console.log(`   Customer ZIP: ${settings.customerZip}`);
    }
    console.log('');

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < generators.length; i++) {
      const gen = generators[i];
      const unitId = gen.unitNumber || gen.number || `Unit ${i + 1}`;
      const kwRating = gen.kwRating || gen.kw || 'unknown';

      process.stdout.write(`   [${i + 1}/${generators.length}] ${unitId} (${kwRating}kW)... `);

      try {
        const result = await this.calculateGenerator(gen, services, settings);

        if (result.success) {
          results.push({
            generator: gen,
            calculation: result.generator,
            calculationSettings: result.calculation,
            metadata: result.metadata,
            success: true
          });
          successCount++;
          console.log('✅');
        } else {
          results.push({
            generator: gen,
            error: result.error,
            success: false
          });
          failCount++;
          console.log(`❌ ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${error.message}`);
        results.push({
          generator: gen,
          error: error.message,
          success: false
        });
        failCount++;
      }

      // Delay to avoid rate limiting (1 second between requests)
      if (i < generators.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n   Summary: ✅ ${successCount} succeeded, ❌ ${failCount} failed\n`);

    return results;
  }

  /**
   * Build service frequency map from service codes
   * @private
   * @param {Array<string>} services - Service codes
   * @param {Object} customFreqs - Custom frequency overrides
   * @returns {Object} Service frequency map
   */
  _buildFrequencies(services, customFreqs = {}) {
    // Default frequencies based on service definitions
    const defaults = {
      'A': 4,  // Quarterly comprehensive inspection
      'B': 4,  // Quarterly oil & filter (when combined with A)
      'C': 1,  // Annual coolant service
      'D': 4,  // Quarterly fluid analysis
      'E': 1,  // Annual load bank testing
      'F': 1,  // Annual diesel tune-up
      'G': 1,  // Annual gas tune-up
      'H': 0.2, // Every 5 years (1/5 = 0.2)
      'I': 1,  // Annual transfer switch
      'J': 1,  // Annual thermal imaging
      'K': 1   // Custom service (as-needed)
    };

    const freqs = {};
    services.forEach(svc => {
      freqs[svc] = customFreqs[svc] || defaults[svc] || 1;
    });

    return freqs;
  }

  /**
   * Aggregate totals from batch calculation results
   * @param {Array<Object>} results - Batch calculation results
   * @returns {Object} Aggregated totals
   */
  aggregateTotals(results) {
    const successful = results.filter(r => r.success);

    if (successful.length === 0) {
      return {
        totalGenerators: results.length,
        successfulCalculations: 0,
        failedCalculations: results.length,
        totalAnnualValue: 0,
        averagePerGenerator: 0,
        laborTotal: 0,
        partsTotal: 0,
        mobilizationTotal: 0,
        taxTotal: 0
      };
    }

    const totals = successful.reduce((acc, r) => {
      const calc = r.calculation;
      return {
        totalAnnualValue: acc.totalAnnualValue + (calc.totalAnnualPrice || 0),
        laborTotal: acc.laborTotal + (calc.laborTotal || 0),
        partsTotal: acc.partsTotal + (calc.partsTotal || 0),
        mobilizationTotal: acc.mobilizationTotal + (calc.mobilizationTotal || 0),
        taxTotal: acc.taxTotal + (calc.taxTotal || 0)
      };
    }, {
      totalAnnualValue: 0,
      laborTotal: 0,
      partsTotal: 0,
      mobilizationTotal: 0,
      taxTotal: 0
    });

    return {
      totalGenerators: results.length,
      successfulCalculations: successful.length,
      failedCalculations: results.length - successful.length,
      ...totals,
      averagePerGenerator: totals.totalAnnualValue / successful.length
    };
  }

  /**
   * Format calculation result for display
   * @param {Object} result - Single calculation result
   * @returns {string} Formatted result
   */
  formatResult(result) {
    if (!result.success) {
      return `ERROR: ${result.error}`;
    }

    const calc = result.calculation;
    const lines = [];

    lines.push(`Generator: ${result.generator.unitNumber || 'Unknown'}`);
    lines.push(`kW Rating: ${result.generator.kwRating || result.generator.kw}`);
    lines.push(`Annual Total: $${calc.totalAnnualPrice?.toLocaleString() || '0.00'}`);
    lines.push(`  Labor: $${calc.laborTotal?.toLocaleString() || '0.00'}`);
    lines.push(`  Parts: $${calc.partsTotal?.toLocaleString() || '0.00'}`);
    lines.push(`  Mobilization: $${calc.mobilizationTotal?.toLocaleString() || '0.00'}`);

    if (calc.taxTotal) {
      lines.push(`  Tax: $${calc.taxTotal.toLocaleString()}`);
    }

    return lines.join('\n');
  }
}

module.exports = { CalculatorAPIClient };
