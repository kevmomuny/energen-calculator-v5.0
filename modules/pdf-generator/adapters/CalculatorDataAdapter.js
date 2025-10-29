/**
 * Calculator Data Adapter
 * Transforms calculation engine output to Unified Data Model for PDF generation
 * @module pdf-generator/adapters/CalculatorDataAdapter
 */

export class CalculatorDataAdapter {
  constructor(config = {}) {
    this.config = {
      laborRate: 191, // Default labor rate
      ...config
    };
  }

  /**
     * Transform calculator data to unified model
     * @param {Object} calculatorData - Raw data from calculation engine
     * @param {string} documentType - Type of document (quote, contract, invoice)
     * @returns {Object} Unified data model for PDF generation
     */
  transform(calculatorData, documentType = 'quote') {
    // Handle both single generator and multiple generators
    const generator = this._extractGeneratorInfo(calculatorData);
    const services = this._transformServices(calculatorData);
    const totals = this._calculateTotals(services);

    return {
      // Customer Information
      customer: {
        companyName: calculatorData.customer?.name || calculatorData.companyName || '',
        contactName: calculatorData.customer?.contactName || calculatorData.contactName || '',
        streetAddress: calculatorData.customer?.address || calculatorData.address || '',
        city: calculatorData.customer?.city || calculatorData.city || '',
        state: calculatorData.customer?.state || calculatorData.state || '',
        zip: calculatorData.customer?.zip || calculatorData.zip || '',
        phone: calculatorData.customer?.phone || calculatorData.phone || '',
        email: calculatorData.customer?.email || calculatorData.email || '',
        website: calculatorData.customer?.website || calculatorData.website || '',
        industry: calculatorData.customer?.industry || '',
        employeeCount: calculatorData.customer?.employeeCount || 0,
        // Computed fields
        displayName: this._getDisplayName(calculatorData),
        fullAddress: this._getFullAddress(calculatorData)
      },

      // Equipment Information
      generator: {
        size: generator.kwRating ? `${generator.kwRating}kW` : generator.size || '',
        type: generator.manufacturer || generator.type || '',
        model: generator.model || '',
        serial: generator.serialNumber || generator.serial || '',
        fuel: generator.fuelType || generator.fuel || 'Diesel',
        location: generator.location || '',
        warrantyStatus: generator.warrantyStatus || '',
        maintenanceLevel: generator.maintenanceLevel || 'Standard',
        quantity: generator.quantity || 1,
        // Additional details
        kwRating: generator.kwRating || 0,
        age: generator.age || 0,
        runtime: generator.runtime || 0
      },

      // Services Array
      services: services,

      // Calculated Totals
      totals: totals,

      // Document Metadata
      metadata: {
        date: calculatorData.date || new Date(),
        number: this._generateDocumentNumber(documentType, calculatorData),
        validUntil: this._calculateValidUntil(calculatorData.date),
        preparedBy: calculatorData.preparedBy || 'Energen Systems Inc.',
        documentType: documentType,
        status: calculatorData.status || 'draft',
        source: 'calculator',
        estimateNumber: calculatorData.estimateNumber || '',
        sitePrefix: calculatorData.sitePrefix || '',
        contractMonths: calculatorData.contractMonths || 12,
        discountPercent: calculatorData.discountPercent || 0,
        taxRate: calculatorData.taxRate || 0,
        notes: calculatorData.notes || ''
      },

      // Additional Information
      project: {
        name: calculatorData.projectName || 'Generator Maintenance',
        location: calculatorData.projectLocation || generator.location || '',
        startDate: calculatorData.startDate || new Date(),
        endDate: this._calculateEndDate(calculatorData)
      },

      // Pricing Details
      pricing: {
        laborRate: this.config.laborRate,
        subtotal: totals.annual,
        discount: calculatorData.discount || 0,
        tax: calculatorData.tax || 0,
        total: totals.annual + (calculatorData.tax || 0) - (calculatorData.discount || 0)
      }
    };
  }

  /**
     * Extract generator information
     * @private
     */
  _extractGeneratorInfo(data) {
    // Handle multiple formats
    if (data.generator) {
      return data.generator;
    }
    if (data.generators && data.generators.length > 0) {
      return data.generators[0]; // Use first generator for now
    }
    // Fallback to direct properties
    return {
      kwRating: data.kwRating || data.generatorSize || 0,
      manufacturer: data.manufacturer || data.generatorBrand || '',
      model: data.model || data.generatorModel || '',
      serialNumber: data.serialNumber || '',
      fuelType: data.fuelType || 'Diesel',
      location: data.location || '',
      quantity: data.generatorCount || 1
    };
  }

  /**
     * Transform services to unified format
     * @private
     */
  _transformServices(data) {
    const services = [];

    // Handle different service formats
    if (data.services && Array.isArray(data.services)) {
      // Already in array format
      return data.services.map(service => this._normalizeService(service));
    }

    // Handle individual service selections (A, B, C, etc.)
    const serviceTypes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

    for (const type of serviceTypes) {
      if (data[`service${type}`] || data[`serviceType${type}`]) {
        const service = this._createServiceFromType(type, data);
        if (service) {
          services.push(service);
        }
      }
    }

    // If no services found, check for selectedServices
    if (services.length === 0 && data.selectedServices) {
      for (const [key, value] of Object.entries(data.selectedServices)) {
        if (value) {
          const type = key.replace('service', '');
          const service = this._createServiceFromType(type, data);
          if (service) {
            services.push(service);
          }
        }
      }
    }

    return services;
  }

  /**
     * Normalize service data
     * @private
     */
  _normalizeService(service) {
    // Calculate quarterly prices if not provided
    const annualCost = service.annualCost || service.annual || 0;
    const frequency = this._getServiceFrequency(service);

    // Distribute cost across quarters based on frequency
    const quarterlyDistribution = this._distributeQuarterly(annualCost, frequency);

    return {
      type: service.type || service.serviceType || '',
      description: service.description || service.name || '',
      frequency: frequency,
      annualCost: annualCost,
      q1Price: service.q1Price || quarterlyDistribution[0],
      q2Price: service.q2Price || quarterlyDistribution[1],
      q3Price: service.q3Price || quarterlyDistribution[2],
      q4Price: service.q4Price || quarterlyDistribution[3],
      laborHours: service.laborHours || 0,
      materialsCost: service.materialsCost || 0,
      shopTimePercent: service.shopTimePercent || 0
    };
  }

  /**
     * Create service from type letter
     * @private
     */
  _createServiceFromType(type, data) {
    const serviceDefinitions = {
      'A': { name: 'Comprehensive Inspection', frequency: 'quarterly' },
      'B': { name: 'Oil & Filter Service', frequency: 'annual' },
      'C': { name: 'Coolant Service', frequency: 'biannual' },
      'D': { name: 'Oil & Fuel Analysis', frequency: 'annual' },
      'E': { name: 'Load Bank Testing', frequency: 'annual' },
      'F': { name: 'Engine Tune-Up (Diesel)', frequency: 'biannual' },
      'G': { name: 'Gas Engine Tune-Up', frequency: 'annual' },
      'H': { name: 'Generator Electrical Testing', frequency: '5-year' },
      'I': { name: 'Transfer Switch Service', frequency: 'annual' },
      'J': { name: 'Thermal Imaging Scan', frequency: 'annual' }
    };

    const definition = serviceDefinitions[type];
    if (!definition) return null;

    // Get cost from data
    const cost = data[`service${type}Cost`] || data[`service${type}Total`] || 0;

    return this._normalizeService({
      type: type,
      description: `Service ${type} - ${definition.name}`,
      frequency: definition.frequency,
      annualCost: cost
    });
  }

  /**
     * Get service frequency
     * @private
     */
  _getServiceFrequency(service) {
    if (service.frequency) return service.frequency;

    // Determine from type
    const frequencies = {
      'A': 'quarterly',
      'B': 'annual',
      'C': 'biannual',
      'D': 'annual',
      'E': 'annual',
      'F': 'biannual',
      'G': 'annual',
      'H': '5-year',
      'I': 'annual',
      'J': 'annual'
    };

    return frequencies[service.type] || 'annual';
  }

  /**
     * Distribute annual cost across quarters
     * @private
     */
  _distributeQuarterly(annualCost, frequency) {
    switch (frequency) {
      case 'quarterly':
        const quarterlyAmount = annualCost / 4;
        return [quarterlyAmount, quarterlyAmount, quarterlyAmount, quarterlyAmount];

      case 'biannual':
        const biannualAmount = annualCost / 2;
        return [0, biannualAmount, 0, biannualAmount];

      case 'annual':
        return [annualCost, 0, 0, 0];

      case '5-year':
        return [annualCost, 0, 0, 0]; // Show in Q1

      default:
        return [annualCost, 0, 0, 0];
    }
  }

  /**
     * Calculate totals
     * @private
     */
  _calculateTotals(services) {
    const quarterly = [0, 0, 0, 0];
    let annual = 0;
    let laborHours = 0;
    let visits = 0;

    for (const service of services) {
      quarterly[0] += service.q1Price || 0;
      quarterly[1] += service.q2Price || 0;
      quarterly[2] += service.q3Price || 0;
      quarterly[3] += service.q4Price || 0;
      annual += service.annualCost || 0;
      laborHours += service.laborHours || 0;

      // Calculate visits based on frequency
      switch (service.frequency) {
        case 'quarterly':
          visits += 4;
          break;
        case 'biannual':
          visits += 2;
          break;
        case 'annual':
          visits += 1;
          break;
        default:
          visits += 1;
      }
    }

    return {
      q1: quarterly[0],
      q2: quarterly[1],
      q3: quarterly[2],
      q4: quarterly[3],
      quarterly: quarterly,
      annual: annual,
      laborHours: laborHours,
      visits: visits
    };
  }

  /**
     * Get display name for customer
     * @private
     */
  _getDisplayName(data) {
    const customer = data.customer || data;
    return customer.companyName || customer.name || 'Customer';
  }

  /**
     * Get full address
     * @private
     */
  _getFullAddress(data) {
    const customer = data.customer || data;
    const parts = [
      customer.address || customer.streetAddress,
      customer.city,
      customer.state,
      customer.zip
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
     * Generate document number
     * @private
     */
  _generateDocumentNumber(type, data) {
    if (data.documentNumber) return data.documentNumber;

    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');

    return `${month}${year}-${random}`;
  }

  /**
     * Calculate valid until date
     * @private
     */
  _calculateValidUntil(date) {
    const validDate = new Date(date || new Date());
    validDate.setDate(validDate.getDate() + 30); // 30 days validity
    return validDate;
  }

  /**
     * Calculate end date
     * @private
     */
  _calculateEndDate(data) {
    const startDate = new Date(data.startDate || new Date());
    const months = data.contractMonths || 12;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    return endDate;
  }
}

export default CalculatorDataAdapter;
