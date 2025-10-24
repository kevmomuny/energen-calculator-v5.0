/**
 * PDF Integration Module
 * Connects calculation engine output to PDF generation service
 * @module pdf-integration
 * @version 1.0.0
 */

const path = require('path');

class PDFIntegration {
  /**
   * Constructor accepting logger parameter
   * @param {Object} logger - Winston logger instance
   */
  constructor(logger = null) {
    // BUG-028 FIX: Accept logger parameter for structured logging
    this.logger = logger || console;
  }

  /**
   * Transform calculation engine output to PDF service format
   * @param {Object} calculationResult - Output from EnergenCalculationEngine.calculate()
   * @param {Object} originalRequest - Original request with customer info
   * @returns {Object} Data formatted for ProfessionalPDFService
   */
  static transformForPDF(calculationResult, originalRequest) {
    if (!calculationResult.success) {
      throw new Error('Cannot generate PDF from failed calculation');
    }

    const calc = calculationResult.calculation;
    const customerInfo = originalRequest.customerInfo || {};
    const generators = originalRequest.generators || [];
    const services = originalRequest.services || [];

    // Build generator information
    const generatorList = generators.map(gen => ({
      brand: gen.brand || 'Generic',
      model: gen.model || '',
      kw: gen.kw,
      quantity: gen.quantity || 1,
      location: gen.location || 'Main Facility'
    }));

    // Build service details from breakdown
    const serviceDetails = [];
    if (calc.serviceBreakdown) {
      for (const [serviceName, details] of Object.entries(calc.serviceBreakdown)) {
        serviceDetails.push({
          name: serviceName,
          laborCost: details.laborCost || 0,
          partsCost: details.partsCost || 0,
          totalCost: details.totalCost || 0,
          laborHours: details.laborHours || 0,
          frequency: this.getServiceFrequency(serviceName.charAt(0))
        });
      }
    }

    // Build the PDF data structure
    const pdfData = {
      // Customer information
      customer: {
        company: customerInfo.companyName || customerInfo.name || customerInfo.company || 'Customer',
        address: customerInfo.address || '',
        city: customerInfo.city || '',
        state: customerInfo.state || '',
        zip: customerInfo.zip || '',
        contact: customerInfo.contact || '',
        email: customerInfo.email || '',
        phone: customerInfo.phone || ''
      },

      // Generator information
      generators: generatorList,

      // Services requested
      services: services,

      // Detailed service breakdown
      serviceDetails: serviceDetails,

      // Calculation results
      calculation: {
        laborTotal: parseFloat(calc.laborTotal) || 0,
        partsTotal: parseFloat(calc.partsTotal) || 0,
        subtotal: parseFloat(calc.subtotal) || 0,
        tax: parseFloat(calc.tax) || 0,
        taxRate: calc.taxRate || '10.25%',
        total: parseFloat(calc.total) || 0,
        yearlyTotals: calc.yearlyTotals || [],

        // Service breakdown for quarterly distribution
        serviceBreakdown: calc.serviceBreakdown || {},

        // CRITICAL FIX: PDF service expects breakdownByService (not serviceBreakdown)
        // Transform service breakdown to the format expected by professional-pdf-service.js line 167
        breakdownByService: PDFIntegration.transformServiceBreakdown(calc.serviceBreakdown || {}),

        // Contract details
        contractMonths: originalRequest.contractLength || 12,

        // Additional pricing info
        prevailingWageApplied: calc.prevailingWageData ? true : false,
        effectiveLaborRate: calc.effectiveLaborRate || 191,
        cpiRate: calc.cpiRate || 3
      },

      // Metadata for PDF
      metadata: {
        quoteNumber: `Q-${Date.now()}`,
        date: new Date(),
        preparedBy: 'Energen Sales Team',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        terms: 'Net 30',
        notes: originalRequest.notes || ''
      }
    };

    return pdfData;
  }

  /**
   * Transform serviceBreakdown to breakdownByService format
   * PDF service expects breakdownByService with service codes as keys
   */
  static transformServiceBreakdown(serviceBreakdown) {
    const breakdownByService = {};

    for (const [serviceName, details] of Object.entries(serviceBreakdown)) {
      // Extract service code from name like "A - Comprehensive Inspection" -> "A"
      const serviceCode = serviceName.charAt(0);
      
      console.log(`📋 Mapping service: "${serviceName}" -> Code: "${serviceCode}", Total: $${details.totalCost}`);

      breakdownByService[serviceCode] = {
        grandTotal: details.totalCost || 0,
        total: details.totalCost || 0,
        laborCost: details.laborCost || 0,
        partsCost: details.partsCost || 0,
        laborHours: details.laborHours || 0,
        mobilizationHours: details.mobilizationHours || 0,
        frequency: this.getServiceFrequency(serviceCode)
      };
    }

    console.log('📄 Final breakdownByService:', JSON.stringify(breakdownByService, null, 2));
    return breakdownByService;
  }

  /**
   * Get service frequency for quarterly distribution
   */
  static getServiceFrequency(serviceCode) {
    const frequencies = {
      'A': 4,  // Quarterly
      'B': 1,  // Annual
      'C': 1,  // Annual/Biannual
      'D': 1,  // Annual (BUG FIX: was incorrectly hardcoded as 2 semi-annual)
      'E': 1,  // Annual
      'F': 1,  // Annual
      'G': 1,  // Annual
      'H': 0.2, // Every 5 years
      'I': 1,  // Annual
      'J': 2   // Semi-annual
    };
    return frequencies[serviceCode] || 1;
  }

  /**
   * Integrate calculation with PDF generation
   * @param {Object} calculationResult - Output from calculation engine
   * @param {Object} request - Original request data
   * @returns {Promise<Object>} PDF generation result
   */
  async generatePDFFromCalculation(calculationResult, request) {
    try {
      // Transform data for PDF service
      const pdfData = this.transformForPDF(calculationResult, request);

      // Make request to PDF generation endpoint
      const axios = require('axios');
      const serverPort = process.env.PORT || 3002;
      const serverUrl = `http://localhost:${serverPort}`;

      const response = await axios.post(`${serverUrl}/api/generate-pdf`, pdfData, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.success) {
        return {
          success: true,
          filename: response.data.filename,
          filepath: response.data.filepath,
          url: response.data.url,
          message: 'PDF generated successfully'
        };
      } else {
        throw new Error(response.data.error || 'PDF generation failed');
      }

    } catch (error) {
      // BUG-028 FIX: Use Winston logger instead of console
      this.logger.error('PDF Integration Error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate PDF'
      };
    }
  }
}

module.exports = PDFIntegration;