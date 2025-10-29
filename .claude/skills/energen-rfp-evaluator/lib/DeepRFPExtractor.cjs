/**
 * Deep RFP Extractor
 * Complete extraction of RFP data including company/contact information
 * in calculator-native format
 *
 * @module DeepRFPExtractor
 * @version 1.0.0
 */

const path = require('path');

/**
 * Extracts comprehensive RFP data including customer information
 * in format compatible with Energen Calculator state structure
 */
class DeepRFPExtractor {
  constructor(aiExtractionEngine) {
    this.aiEngine = aiExtractionEngine;
  }

  /**
   * Extract complete RFP data including customer information
   *
   * @param {string} rfpText - Full RFP document text
   * @param {Object} options - Extraction options
   * @param {string} options.fileName - Source file name
   * @param {number} options.pageCount - Number of pages
   * @param {string} options.rfpNumber - RFP identifier
   * @returns {Promise<Object>} Complete extraction in calculator-native format
   */
  async extractComplete(rfpText, options = {}) {
    console.log('\n🔍 Deep RFP Extraction Starting...');
    console.log(`   Source: ${options.fileName || 'Unknown'}`);
    console.log(`   Pages: ${options.pageCount || 'Unknown'}`);

    // Use existing AI extraction engine
    const basicExtraction = await this.aiEngine.extractFromText(rfpText, options);

    console.log('   ✅ Basic extraction complete');

    // Enhance with calculator-native format
    const enhanced = this._enhanceForCalculator(basicExtraction, options);

    console.log('   ✅ Enhanced for calculator compatibility');

    return enhanced;
  }

  /**
   * Transform extraction to calculator-native format
   * @private
   */
  _enhanceForCalculator(extraction, options) {
    const rfpNumber = options.rfpNumber || extraction.rfpNumber || 'Unknown';

    // Build customer object in calculator format
    const customer = this._buildCustomerObject(extraction);

    // Build generators array
    const generators = this._buildGeneratorsArray(extraction);

    // Build service requirements
    const serviceRequirements = this._buildServiceRequirements(extraction);

    // Build compliance requirements
    const complianceRequirements = this._buildComplianceRequirements(extraction);

    // Build pricing structure
    const pricingStructure = this._buildPricingStructure(extraction);

    // Build complete extraction
    return {
      rfpMetadata: {
        rfpNumber,
        title: extraction.projectTitle || extraction.title || 'Unknown',
        issueDate: extraction.issueDate || null,
        dueDate: extraction.bidDueDate || extraction.dueDate || null,
        contractLength: this._parseContractLength(extraction),
        optionYears: this._parseOptionYears(extraction),
        estimatedValue: extraction.estimatedValue || 'TBD',
        extractionDate: new Date().toISOString(),
        extractionConfidence: extraction.overallConfidence || 0.85
      },
      customer,
      generators,
      serviceRequirements,
      complianceRequirements,
      pricingStructure,
      rawExtraction: extraction // Preserve original for reference
    };
  }

  /**
   * Build customer object in calculator format
   * @private
   */
  _buildCustomerObject(extraction) {
    const contact = extraction.contactInformation || {};
    const address = this._parseAddress(contact);

    return {
      name: contact.organizationName || contact.customerName || 'Unknown',
      legalName: contact.legalName || contact.organizationName || null,
      address: address.street || contact.address || '',
      city: address.city || contact.city || '',
      state: address.state || contact.state || '',
      zip: address.zip || contact.zipCode || contact.zip || '',
      county: address.county || contact.county || '',
      phone: contact.phone || contact.phoneNumber || '',
      email: contact.email || '',
      contactPerson: contact.primaryContact || contact.contactName || '',
      contactTitle: contact.contactTitle || '',
      contactPhone: contact.contactPhone || contact.phone || '',
      contactEmail: contact.contactEmail || contact.email || '',
      facilityType: this._determineFacilityType(extraction),
      taxExempt: this._determineTaxExempt(extraction),
      website: contact.website || null,
      enrichmentData: {
        logo: null,
        industry: this._determineIndustry(extraction),
        source: 'rfp-extraction'
      }
    };
  }

  /**
   * Build generators array from equipment data
   * @private
   */
  _buildGeneratorsArray(extraction) {
    // Generators might be in different locations in extraction
    const equipment = extraction.equipment ||
                     extraction.generators ||
                     extraction.generatorAssets ||
                     [];

    if (!Array.isArray(equipment)) {
      return [];
    }

    return equipment.map((gen, index) => ({
      unitNumber: gen.unitNumber || gen.assetId || gen.number || `Unit-${index + 1}`,
      kwRating: gen.kwRating || gen.kw || gen.rating || null,
      fuelType: gen.fuelType || this._inferFuelType(gen) || 'Diesel',
      cylinders: gen.cylinders || this._inferCylinders(gen) || 6,
      building: gen.building || gen.location || gen.site || '',
      manufacturer: gen.manufacturer || gen.make || '',
      model: gen.model || '',
      serialNumber: gen.serialNumber || gen.serial || '',
      notes: gen.notes || gen.description || ''
    }));
  }

  /**
   * Build service requirements from extraction
   * @private
   */
  _buildServiceRequirements(extraction) {
    const services = extraction.services || extraction.scopeOfWork || [];

    // Map to Energen service codes
    const mapped = this._mapToEnergenServices(services);

    return {
      mapped: mapped.codes,
      frequencies: mapped.frequencies,
      rawRequirements: services.map(s => s.description || s.name || s),
      exclusions: extraction.exclusions || [],
      specialRequirements: extraction.specialRequirements || []
    };
  }

  /**
   * Build compliance requirements
   * @private
   */
  _buildComplianceRequirements(extraction) {
    const stipulations = extraction.stipulations || [];

    // Find prevailing wage requirement
    const pwStip = stipulations.find(s =>
      s.type === 'prevailing_wage' ||
      (s.description && s.description.toLowerCase().includes('prevailing wage'))
    );

    return {
      prevailingWage: {
        required: !!pwStip,
        classification: pwStip?.classification || 'Electrician - Journeyman',
        dirRegistration: !!pwStip,
        certifiedPayroll: !!pwStip,
        county: extraction.contactInformation?.county || '',
        notes: pwStip?.description || ''
      },
      insurance: this._parseInsuranceRequirements(stipulations),
      bonds: this._parseBondRequirements(stipulations),
      licenses: this._parseLicenseRequirements(stipulations)
    };
  }

  /**
   * Build pricing structure
   * @private
   */
  _buildPricingStructure(extraction) {
    const payment = extraction.paymentTerms || {};

    return {
      type: 'fixed-price-annual',
      billingFrequency: payment.billingFrequency || 'monthly',
      paymentTerms: payment.terms || 'Net 30',
      escalation: {
        allowed: true,
        maxAnnual: 3.0,
        optionYears: true
      },
      emergencyRates: {
        regular: 'Time and materials',
        afterHours: '1.5x standard rate',
        weekend: '2.0x standard rate'
      }
    };
  }

  /**
   * Map RFP services to Energen service codes
   * @private
   */
  _mapToEnergenServices(services) {
    const codes = [];
    const frequencies = {};

    // Simple keyword matching (can be enhanced with ServiceMappingEngine)
    const serviceKeywords = {
      'A': ['inspection', 'comprehensive', 'preventive', 'quarterly check'],
      'B': ['oil', 'filter', 'lubrication', 'oil change'],
      'C': ['coolant', 'radiator', 'antifreeze'],
      'D': ['analysis', 'testing', 'lab', 'sample'],
      'E': ['load bank', 'load test', 'performance test'],
      'F': ['diesel tune', 'injector', 'diesel service'],
      'G': ['gas tune', 'spark plug', 'natural gas'],
      'H': ['electrical test', 'insulation', 'megohm'],
      'I': ['transfer switch', 'ats', 'automatic transfer'],
      'J': ['thermal imaging', 'infrared', 'ir scan']
    };

    for (const service of services) {
      const desc = (service.description || service.name || service || '').toLowerCase();

      for (const [code, keywords] of Object.entries(serviceKeywords)) {
        if (keywords.some(kw => desc.includes(kw))) {
          if (!codes.includes(code)) {
            codes.push(code);

            // Determine frequency
            if (desc.includes('quarterly')) frequencies[code] = 4;
            else if (desc.includes('annual') || desc.includes('yearly')) frequencies[code] = 1;
            else if (desc.includes('biannual') || desc.includes('semi-annual')) frequencies[code] = 2;
            else frequencies[code] = 1; // Default
          }
        }
      }
    }

    // Default to A+B+D if no services matched
    if (codes.length === 0) {
      codes.push('A', 'B', 'D');
      frequencies['A'] = 4;
      frequencies['B'] = 4;
      frequencies['D'] = 4;
    }

    return { codes, frequencies };
  }

  /**
   * Helper methods
   * @private
   */

  _parseAddress(contact) {
    const fullAddress = contact.address || '';
    // Simple address parsing (can be enhanced)
    return {
      street: fullAddress.split(',')[0]?.trim() || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zipCode || contact.zip || '',
      county: contact.county || ''
    };
  }

  _determineFacilityType(extraction) {
    const org = (extraction.contactInformation?.organizationName || '').toLowerCase();
    if (org.includes('city') || org.includes('county') || org.includes('state') ||
        org.includes('government') || org.includes('federal')) {
      return 'government';
    }
    if (org.includes('hospital') || org.includes('medical') || org.includes('health')) {
      return 'healthcare';
    }
    if (org.includes('school') || org.includes('university') || org.includes('college')) {
      return 'education';
    }
    return 'commercial';
  }

  _determineTaxExempt(extraction) {
    const facilityType = this._determineFacilityType(extraction);
    return facilityType === 'government' || facilityType === 'education';
  }

  _determineIndustry(extraction) {
    const facilityType = this._determineFacilityType(extraction);
    const industryMap = {
      'government': 'Government',
      'healthcare': 'Healthcare',
      'education': 'Education',
      'commercial': 'Commercial'
    };
    return industryMap[facilityType] || 'Other';
  }

  _inferFuelType(gen) {
    const model = (gen.model || '').toUpperCase();
    if (model.includes('NG') || model.includes('GAS')) return 'Natural Gas';
    if (model.includes('LPG') || model.includes('PROPANE')) return 'Propane';
    return 'Diesel';
  }

  _inferCylinders(gen) {
    const kw = gen.kwRating || gen.kw || 0;
    if (kw < 50) return 3;
    if (kw < 150) return 4;
    if (kw < 300) return 6;
    if (kw < 600) return 8;
    return 12;
  }

  _parseContractLength(extraction) {
    const schedule = extraction.schedule || {};
    const duration = schedule.contractDuration || schedule.duration || '';

    const yearMatch = duration.match(/(\d+)\s*year/i);
    if (yearMatch) return parseInt(yearMatch[1]) * 12;

    const monthMatch = duration.match(/(\d+)\s*month/i);
    if (monthMatch) return parseInt(monthMatch[1]);

    return 24; // Default 2 years
  }

  _parseOptionYears(extraction) {
    const schedule = extraction.schedule || {};
    const options = schedule.optionYears || schedule.options || '';

    if (typeof options === 'string') {
      const matches = options.match(/\d+/g);
      return matches ? matches.map(n => parseInt(n)) : [];
    }

    return [];
  }

  _parseInsuranceRequirements(stipulations) {
    const insuranceStip = stipulations.find(s =>
      s.type === 'insurance' ||
      (s.description && s.description.toLowerCase().includes('insurance'))
    );

    if (!insuranceStip) {
      return {
        generalLiability: '$1,000,000 per occurrence',
        auto: '$1,000,000 combined single limit',
        workersComp: 'Statutory limits',
        professionalLiability: 'N/A',
        additionalInsured: ''
      };
    }

    return {
      generalLiability: insuranceStip.generalLiability || '$1,000,000',
      auto: insuranceStip.auto || '$1,000,000',
      workersComp: insuranceStip.workersComp || 'Statutory',
      professionalLiability: insuranceStip.professionalLiability || 'N/A',
      additionalInsured: insuranceStip.additionalInsured || ''
    };
  }

  _parseBondRequirements(stipulations) {
    const bondStips = stipulations.filter(s =>
      s.type === 'bond' || (s.description && s.description.toLowerCase().includes('bond'))
    );

    return {
      performance: bondStips.some(s => s.description?.includes('performance')),
      payment: bondStips.some(s => s.description?.includes('payment')),
      bid: bondStips.some(s => s.description?.includes('bid'))
    };
  }

  _parseLicenseRequirements(stipulations) {
    const licenseStips = stipulations.filter(s =>
      s.type === 'license' || (s.description && s.description.toLowerCase().includes('license'))
    );

    const requirements = {};

    for (const stip of licenseStips) {
      const desc = stip.description || '';
      if (desc.includes('C-10')) requirements.contractorsLicense = 'C-10 required';
      if (desc.includes('business license')) requirements.businessLicense = 'Required';
    }

    return requirements;
  }
}

module.exports = { DeepRFPExtractor };
