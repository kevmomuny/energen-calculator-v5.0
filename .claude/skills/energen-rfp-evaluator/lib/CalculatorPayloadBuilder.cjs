/**
 * Calculator Payload Builder
 * Transforms RFP extraction data into calculator-native JSON format
 * Matches Energen Calculator v5.0 state structure exactly
 *
 * @module CalculatorPayloadBuilder
 * @version 1.0.0
 */

/**
 * Builds calculator-compatible JSON payloads from RFP extraction data
 * Output format matches calculator state/API structure for direct import
 */
class CalculatorPayloadBuilder {
  constructor() {
    this.defaultSettings = {
      laborRate: 180.00,
      mobilizationRate: 180.00,
      mileageRate: 0.67,
      oilPrice: 16.00,
      oilMarkup: 1.5,
      coolantPrice: 16.00,
      coolantMarkup: 1.5,
      partsMarkup: 1.25,
      freightMarkup: 1.05,
      annualEscalation: 2.5,
      defaultTaxRate: 10.25,
      includeTax: false,
      includeTravel: true
    };

    this.companyInfo = {
      name: 'Energen Systems Inc.',
      license: '1143462',
      address: '150 Mason Circle, Suite K',
      city: 'Concord',
      state: 'CA',
      zip: '94520',
      phone: '(925) 289-8969',
      email: 'service@energensystems.com',
      website: 'https://energensystems.com'
    };
  }

  /**
   * Build complete calculator payload from RFP extraction
   *
   * @param {Object} extraction - RFP extraction data (from DeepRFPExtractor)
   * @returns {Object} Calculator-compatible payload
   */
  buildPayload(extraction) {
    console.log('\n🏗️  Building calculator payload...');

    const payload = {
      customer: this._buildCustomerObject(extraction),
      units: this._buildUnitsArray(extraction),
      settings: this._buildSettingsObject(extraction),
      calculations: {},
      distance: this._extractDistance(extraction),
      metadata: this._buildMetadata(extraction)
    };

    console.log(`   ✅ Built payload with ${payload.units.length} generators`);

    return payload;
  }

  /**
   * Build customer object in calculator format
   * @private
   */
  _buildCustomerObject(extraction) {
    const customer = extraction.customer || {};

    return {
      name: customer.name || '',
      legalName: customer.legalName || customer.name || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      phone: customer.phone || '',
      email: customer.email || '',
      contactPerson: customer.contactPerson || '',
      contactTitle: customer.contactTitle || '',
      facilityType: customer.facilityType || 'commercial',
      taxExempt: customer.taxExempt !== false,
      enrichmentData: {
        logo: null,
        website: customer.website || null,
        industry: customer.enrichmentData?.industry || 'Other',
        source: 'rfp-extraction'
      }
    };
  }

  /**
   * Build units array in calculator format
   * @private
   */
  _buildUnitsArray(extraction) {
    const generators = extraction.generators || [];
    const serviceRequirements = extraction.serviceRequirements || {};

    return generators.map((gen, index) => {
      const unit = {
        id: `unit-${index + 1}`,
        kw: gen.kwRating || 0,
        fuelType: gen.fuelType || 'Diesel',
        cylinders: gen.cylinders || 6,
        unitNumber: gen.unitNumber || `Unit ${index + 1}`,
        building: gen.building || '',
        manufacturer: gen.manufacturer || '',
        model: gen.model || '',
        services: this._buildServicesObject(serviceRequirements),
        location: {
          building: gen.building || '',
          floor: null,
          room: null
        },
        notes: gen.notes || ''
      };

      return unit;
    });
  }

  /**
   * Build services object for a unit
   * @private
   */
  _buildServicesObject(serviceRequirements) {
    const mapped = serviceRequirements.mapped || [];
    const frequencies = serviceRequirements.frequencies || {};

    const services = {};

    // All possible services (A-K)
    const allServices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

    allServices.forEach(svc => {
      services[svc] = {
        selected: mapped.includes(svc),
        frequency: frequencies[svc] || this._getDefaultFrequency(svc)
      };
    });

    return services;
  }

  /**
   * Build settings object in calculator format
   * @private
   */
  _buildSettingsObject(extraction) {
    const compliance = extraction.complianceRequirements || {};
    const customer = extraction.customer || {};

    const settings = {
      ...this.defaultSettings,
      prevailingWageRequired: compliance.prevailingWage?.required || false,
      prevailingWage: {
        businessOverhead: 120.00,
        defaultClassification: 'electricianJourneyman',
        defaultZone: 1,
        lastApiRate: null,
        lastUpdated: null,
        lastZip: customer.zip || null
      },
      taxRate: customer.taxExempt ? 0 : 0.1025,
      includeTax: !customer.taxExempt,
      distance: this._extractDistance(extraction),
      company: this.companyInfo
    };

    return settings;
  }

  /**
   * Build metadata object
   * @private
   */
  _buildMetadata(extraction) {
    const rfpMetadata = extraction.rfpMetadata || {};

    return {
      rfpNumber: rfpMetadata.rfpNumber || 'Unknown',
      rfpTitle: rfpMetadata.title || 'Unknown',
      generatedDate: new Date().toISOString(),
      contractLength: rfpMetadata.contractLength || 24,
      optionYears: rfpMetadata.optionYears || [],
      extractionDate: rfpMetadata.extractionDate || new Date().toISOString(),
      extractionConfidence: rfpMetadata.extractionConfidence || 0.85
    };
  }

  /**
   * Extract distance from various possible locations
   * @private
   */
  _extractDistance(extraction) {
    // Try to find distance in various places
    if (extraction.distance) return extraction.distance;
    if (extraction.settings?.distance) return extraction.settings.distance;
    if (extraction.travel?.distance) return extraction.travel.distance;

    // Default to 0 (user should update)
    return 0;
  }

  /**
   * Get default frequency for a service
   * @private
   */
  _getDefaultFrequency(serviceCode) {
    const defaults = {
      'A': 4,  // Quarterly
      'B': 4,  // Quarterly (when with A)
      'C': 1,  // Annual
      'D': 4,  // Quarterly
      'E': 1,  // Annual
      'F': 1,  // Annual
      'G': 1,  // Annual
      'H': 0.2, // Every 5 years
      'I': 1,  // Annual
      'J': 1,  // Annual
      'K': 1   // As-needed
    };

    return defaults[serviceCode] || 1;
  }

  /**
   * Build simplified API payload for direct calculation
   * (Lightweight version for API calls)
   *
   * @param {Object} extraction - RFP extraction data
   * @returns {Object} Simplified API payload
   */
  buildAPIPayload(extraction) {
    const generators = extraction.generators || [];
    const serviceRequirements = extraction.serviceRequirements || {};
    const compliance = extraction.complianceRequirements || {};
    const customer = extraction.customer || {};

    return {
      customerType: customer.facilityType || 'government',
      taxExempt: customer.taxExempt !== false,
      settings: {
        laborRate: 180.00,
        prevailingWageRequired: compliance.prevailingWage?.required || false,
        customerZip: customer.zip || null,
        includeTravel: true,
        distance: this._extractDistance(extraction)
      },
      generators: generators.map(gen => ({
        kwRating: gen.kwRating || 0,
        fuelType: gen.fuelType || 'Diesel',
        cylinders: gen.cylinders || 6,
        services: serviceRequirements.mapped || [],
        serviceFrequencies: serviceRequirements.frequencies || {},
        unitNumber: gen.unitNumber || null
      }))
    };
  }

  /**
   * Validate payload structure
   *
   * @param {Object} payload - Payload to validate
   * @returns {Object} Validation result {valid: boolean, errors: string[]}
   */
  validatePayload(payload) {
    const errors = [];

    // Check required fields
    if (!payload.customer) {
      errors.push('Missing customer object');
    } else {
      if (!payload.customer.name) errors.push('Customer name is required');
      if (!payload.customer.zip) errors.push('Customer ZIP code is required');
    }

    if (!payload.units || !Array.isArray(payload.units)) {
      errors.push('Missing or invalid units array');
    } else {
      if (payload.units.length === 0) {
        errors.push('No generators in units array');
      }

      payload.units.forEach((unit, idx) => {
        if (!unit.kw || unit.kw <= 0) {
          errors.push(`Unit ${idx + 1}: Invalid kW rating`);
        }
        if (!unit.fuelType) {
          errors.push(`Unit ${idx + 1}: Missing fuel type`);
        }
      });
    }

    if (!payload.settings) {
      errors.push('Missing settings object');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export payload to JSON file
   *
   * @param {Object} payload - Payload to export
   * @param {string} filePath - Output file path
   * @returns {Promise<void>}
   */
  async exportToFile(payload, filePath) {
    const fs = require('fs').promises;
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`   ✅ Payload exported: ${filePath}`);
  }

  /**
   * Import payload from JSON file
   *
   * @param {string} filePath - Input file path
   * @returns {Promise<Object>} Imported payload
   */
  async importFromFile(filePath) {
    const fs = require('fs').promises;
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }
}

module.exports = { CalculatorPayloadBuilder };
