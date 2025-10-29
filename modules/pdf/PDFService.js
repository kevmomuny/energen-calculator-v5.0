/**
 * Professional PDF Generation Service - Energen Bid Documents
 * Uses EXACT components from 4.0 for pixel-perfect output
 * @module pdf-generator/pdf-service-professional
 * @version 4.5.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create require function for CommonJS modules
const require = createRequire(import.meta.url);

// Import the professional components from 4.0
const PDFDocumentBuilder = require('./core/PDFDocumentBuilder.cjs');
const PDFHeaderComponent = require('./components/PDFHeaderComponent.cjs');
const PDFFooterComponent = require('./components/PDFFooterComponent.cjs');
const PDFCustomerInfoComponent = require('./components/PDFCustomerInfoComponent.cjs');
const PDFTableComponent = require('./components/PDFTableComponent.cjs');
const PDFDisclosureComponent = require('./components/PDFDisclosureComponent.cjs');
const PDFSignatureComponent = require('./components/PDFSignatureComponent.cjs');

export class ProfessionalPDFService {
  constructor(config = {}) {
    this.outputPath = config.outputPath || path.join(__dirname, '../../output/pdfs');
    this.assetsPath = path.join(__dirname, 'assets');

    // Energen company information
    this.companyInfo = {
      name: 'Energen Systems Inc.',
      address: '2175 Sutter Ave',
      city: 'Concord',
      state: 'CA',
      zip: '94520',
      phone: '(925) 240-5556',
      email: 'sales@energensystems.com',
      website: 'www.energensystems.com'
    };
  }

  /**
     * Transform calculator data to PDF component format
     * This is the CRITICAL data mapping that creates the professional bid
     */
  transformCalculatorData(calcData) {
    // Handle both 'calculation' and 'calculations' property names
    const { customer, generators, services, metadata } = calcData;
    const calculation = calcData.calculation || calcData.calculations || {};

    // Build service rows for the table
    const serviceRows = this.buildServiceRows(services, calculation);

    // Calculate quarterly totals
    const quarterlyTotals = this.calculateQuarterlyTotals(serviceRows);

    // Calculate annual total
    const annualTotal = quarterlyTotals.reduce((sum, q) => sum + q, 0);

    return {
      // Header data
      title: 'GENERATOR SERVICE AGREEMENT',

      // Customer information (matches exact format)
      customer: {
        companyName: customer.company || customer.name || 'Customer',
        streetAddress: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || '',
        email: customer.email || '',
        phone: customer.phone || '',
        contactName: customer.contact || '',
        website: customer.website || '',
        industry: customer.industry || '',
        employeeCount: customer.employeeCount || ''
      },

      // Generator specifications
      generator: {
        size: generators && generators.length > 0 ? `${generators[0].kw}kW` : '',
        type: 'Diesel Generator',
        model: generators && generators.length > 0 ? generators[0].model || 'Industrial' : '',
        fuel: 'Diesel',
        serial: generators && generators.length > 0 ? generators[0].serial || 'TBD' : '',
        location: generators && generators.length > 0 ? generators[0].location || 'Main Facility' : '',
        warrantyStatus: 'Active',
        kw: generators && generators.length > 0 ? generators[0].kw : 0,
        quantity: generators ? generators.length : 0,
        fuelType: 'Diesel'
      },

      // Services with quarterly breakdown
      services: serviceRows,

      // Totals
      totals: {
        quarterly: quarterlyTotals,
        annual: annualTotal
      },

      // Pricing breakdown (for alternate formats)
      pricing: {
        quarterly: quarterlyTotals.map((total, index) => ({
          quarter: `Q${index + 1} ${new Date().getFullYear()}`,
          rental: 0,  // Can be added if rental is part of the model
          service: total,
          total: total
        })),
        annual: {
          rental: 0,
          service: annualTotal,
          total: annualTotal
        }
      },

      // Metadata
      metadata: {
        estimateNumber: metadata?.quoteNumber || `EST-${Date.now()}`,
        date: metadata?.date || new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        preparedBy: metadata?.preparedBy || 'Energen Sales Team',
        terms: metadata?.terms || 'Net 30'
      },

      // Company information (for footer)
      company: this.companyInfo,

      // Service count for disclosure scaling
      serviceCount: serviceRows.length,

      // Control flags
      showPageNumbers: true,
      currentPage: 1,
      totalPages: 1
    };
  }

  /**
     * Build service rows from calculation data
     * Maps each service type to its quarterly pricing
     */
  buildServiceRows(services = [], calculation = {}) {
    const serviceDescriptions = {
      'A': 'Service A - Comprehensive Inspection',
      'B': 'Service B - Oil & Filter Service',
      'C': 'Service C - Coolant Service',
      'D': 'Service D - Oil & Fuel Analysis',
      'E': 'Service E - Load Bank Testing',
      'F': 'Service F - Engine Tune-Up (Diesel)',
      'G': 'Service G - Gas Engine Tune-Up',
      'H': 'Service H - Generator Electrical Testing',
      'I': 'Service I - Transfer Switch Service',
      'J': 'Service J - Thermal Imaging Scan'
    };

    const rows = [];

    // Add each selected service
    services.forEach(serviceType => {
      const serviceData = calculation.breakdownByService?.[serviceType] || calculation.services?.[serviceType];

      // Calculate annual cost from service data or use a default
      let annualCost = 0;
      if (serviceData) {
        annualCost = serviceData.grandTotal || serviceData.total || 0;
      } else {
        // If no service data, use a placeholder or calculate from totals
        // This ensures services show up even if calculation data is missing
        annualCost = (calculation.total || 0) / (services.length || 1);
      }

      const frequency = this.getServiceFrequency(serviceType);
      const quarterlyPrices = this.distributeAnnualCost(annualCost, frequency);

      rows.push({
        name: serviceDescriptions[serviceType] || `Service ${serviceType}`,
        description: serviceDescriptions[serviceType] || `Service ${serviceType}`,
        quarters: quarterlyPrices,
        annual: annualCost
      });
    });

    // Add travel/mileage if present
    if (calculation && calculation.mileageCost && calculation.mileageCost > 0) {
      const mileageQuarterly = calculation.mileageCost / 4;
      rows.push({
        name: 'Travel & Mileage',
        description: 'Travel & Mileage',
        quarters: [mileageQuarterly, mileageQuarterly, mileageQuarterly, mileageQuarterly],
        annual: calculation.mileageCost
      });
    }

    // Add remote monitoring (if applicable)
    if (calculation.remoteMonitoring) {
      const monitoringQuarterly = calculation.remoteMonitoring / 4;
      rows.push({
        name: 'Remote Monitoring',
        description: 'Remote Monitoring',
        quarters: [monitoringQuarterly, monitoringQuarterly, monitoringQuarterly, monitoringQuarterly],
        annual: calculation.remoteMonitoring
      });
    }

    return rows;
  }

  /**
     * Get service frequency for quarterly distribution
     */
  getServiceFrequency(serviceType) {
    const frequencies = {
      'A': 4,  // Quarterly
      'B': 1,  // Annual
      'C': 1,  // Annual/Biannual
      'D': 2,  // Semi-annual
      'E': 1,  // Annual
      'F': 1,  // Annual
      'G': 1,  // Annual
      'H': 0.2,  // Every 5 years
      'I': 1,  // Annual
      'J': 2   // Semi-annual
    };
    return frequencies[serviceType] || 1;
  }

  /**
     * Distribute annual cost across quarters based on frequency
     */
  distributeAnnualCost(annualCost, frequency) {
    if (frequency >= 4) {
      // Quarterly or more frequent
      const quarterlyAmount = annualCost / 4;
      return [quarterlyAmount, quarterlyAmount, quarterlyAmount, quarterlyAmount];
    } else if (frequency === 2) {
      // Semi-annual (Q1 and Q3)
      const semiAnnualAmount = annualCost / 2;
      return [semiAnnualAmount, 0, semiAnnualAmount, 0];
    } else if (frequency === 1) {
      // Annual (Q1 only)
      return [annualCost, 0, 0, 0];
    } else {
      // Less than annual (spread evenly)
      const quarterlyAmount = annualCost / 4;
      return [quarterlyAmount, quarterlyAmount, quarterlyAmount, quarterlyAmount];
    }
  }

  /**
     * Calculate quarterly totals from service rows
     */
  calculateQuarterlyTotals(serviceRows) {
    const totals = [0, 0, 0, 0];
    serviceRows.forEach(row => {
      row.quarters.forEach((amount, index) => {
        totals[index] += amount;
      });
    });
    return totals;
  }

  /**
     * Generate professional Energen bid PDF
     */
  async generateQuote(requestData) {
    // Handle both direct data and wrapped quoteData
    const calcData = requestData.quoteData || requestData;
    const transformedData = this.transformCalculatorData(calcData);
    const filename = `Energen_Bid_${transformedData.metadata.estimateNumber}.pdf`;
    const filepath = path.join(this.outputPath, filename);

    // Ensure output directory exists
    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      try {
        // Create output stream
        const outputStream = fs.createWriteStream(filepath);

        // Create builder with single-page layout for quotes
        const builder = new PDFDocumentBuilder();
        builder.setLayoutStrategy('single-page');

        // Add all components in proper order (matching 4.0 exactly)

        // 1. Header with logo (priority 100)
        const header = new PDFHeaderComponent();
        builder.addComponent(header, transformedData, { priority: 100 });

        // 2. Customer Info (priority 90)
        const customerInfo = new PDFCustomerInfoComponent();
        builder.addComponent(customerInfo, transformedData, { priority: 90 });

        // 3. Pricing Table (priority 80)
        const table = new PDFTableComponent();
        builder.addComponent(table, transformedData, { priority: 80 });

        // 4. Disclosure (priority 50)
        const disclosure = new PDFDisclosureComponent();
        builder.addComponent(disclosure, transformedData, { priority: 50 });

        // 5. Signature Blocks (priority 40)
        const signature = new PDFSignatureComponent();
        builder.addComponent(signature, transformedData, { priority: 40 });

        // 6. Footer (priority 10)
        const footer = new PDFFooterComponent();
        builder.addComponent(footer, transformedData, { priority: 10 });

        // Build the document
        const result = builder.build(outputStream);

        // Wait for completion
        outputStream.on('finish', () => {
          resolve({
            success: true,
            filename,
            filepath,
            url: `/output/pdfs/${filename}`,
            pages: result.totalPages,
            components: result.componentsRendered
          });
        });

        outputStream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
     * Generate test PDF with sample data
     */
  async generateTestPDF() {
    const testData = {
      customer: {
        company: 'ABC Manufacturing Corp',
        address: '1234 Industrial Way',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        email: 'facilities@abcmfg.com',
        phone: '(415) 555-1234',
        contact: 'John Smith',
        website: 'www.abcmfg.com',
        industry: 'Manufacturing'
      },
      generators: [
        {
          kw: 500,
          location: 'Building A - Mechanical Room',
          model: 'CAT C18',
          serial: 'SN-2024-C18-12345'
        }
      ],
      services: ['A', 'B', 'C', 'E'],
      calculation: {
        breakdownByService: {
          'A': { grandTotal: 12000 },
          'B': { grandTotal: 4000 },
          'C': { grandTotal: 3000 },
          'E': { grandTotal: 8000 }
        },
        mileageCost: 2400,
        grandTotal: 29400
      },
      metadata: {
        quoteNumber: 'TEST-2025-001',
        date: new Date(),
        preparedBy: 'Energen Sales Team'
      }
    };

    return this.generateQuote(testData);
  }
}

export default ProfessionalPDFService;
