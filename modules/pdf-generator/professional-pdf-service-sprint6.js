/**
 * Professional PDF Generation Service - Sprint 6 Enhanced
 * Adds watermarks, versioning, service schedule rendering, and multi-unit support
 * @module pdf-generator/pdf-service-professional-sprint6
 * @version 5.0.0 - Sprint 6
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

export class ProfessionalPDFServiceSprint6 {
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
     * Enhanced for Sprint 3: Service Schedule Integration
     */
    transformCalculatorData(calcData) {
        const { customer, generators, services, metadata } = calcData;
        const calculation = calcData.calculation || calcData.calculations || {};

        // Use pre-calculated service schedule from Sprint 3 if available
        const serviceSchedule = calcData.serviceSchedule;

        // Build service rows - either from schedule or calculate
        const serviceRows = serviceSchedule
            ? this.buildServiceRowsFromSchedule(serviceSchedule, calculation)
            : this.buildServiceRows(services, calculation);

        // Calculate quarterly totals
        const quarterlyTotals = this.calculateQuarterlyTotals(serviceRows);

        // Calculate annual total
        const annualTotal = quarterlyTotals.reduce((sum, q) => sum + q, 0);

        // Get quarter labels - from schedule or generate
        const quarterLabels = serviceSchedule
            ? serviceSchedule.quarters.map(q => q.label)
            : this.generateQuarterLabels(metadata?.date || new Date());

        return {
            // Header data
            title: 'GENERATOR SERVICE AGREEMENT',

            // Customer information
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

            // Quarter labels (pre-calculated from Sprint 3)
            quarterLabels: quarterLabels,

            // Totals
            totals: {
                quarterly: quarterlyTotals,
                annual: annualTotal
            },

            // Pricing breakdown
            pricing: {
                quarterly: quarterlyTotals.map((total, index) => ({
                    quarter: quarterLabels[index],
                    rental: 0,
                    service: total,
                    total: total
                })),
                annual: {
                    rental: 0,
                    service: annualTotal,
                    total: annualTotal
                }
            },

            // Metadata (Sprint 4: Versioning)
            metadata: {
                estimateNumber: metadata?.estimateNumber || metadata?.bidNumber || null, // Only use quote/bid number from Zoho, no fallback
                bidNumber: metadata?.bidNumber || null,
                version: metadata?.version || { major: 1, minor: 0, string: 'v1.0' },
                status: metadata?.status || 'draft',
                date: metadata?.date || new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                preparedBy: metadata?.preparedBy || 'Energen Sales Team',
                terms: metadata?.terms || 'Net 30',
                watermark: metadata?.watermark || null,
                suggestedFilename: metadata?.suggestedFilename || null,
                calcStateHash: metadata?.calcStateHash || null
            },

            // Company information
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
     * Build service rows from pre-calculated schedule (Sprint 3)
     * Receives quarter assignments and costs from service-schedule-calculator.js
     */
    buildServiceRowsFromSchedule(serviceSchedule, calculation) {
        const rows = [];

        // Track which services we've added
        const addedServices = new Set();

        // Process each quarter
        serviceSchedule.quarters.forEach((quarter, quarterIndex) => {
            quarter.services.forEach(service => {
                // Add service if not already added
                if (!addedServices.has(service.code)) {
                    addedServices.add(service.code);

                    // Create quarterly array with costs in correct quarters
                    const quarters = [0, 0, 0, 0];

                    // Find all quarters where this service appears
                    serviceSchedule.quarters.forEach((q, qIndex) => {
                        const serviceInQuarter = q.services.find(s => s.code === service.code);
                        if (serviceInQuarter) {
                            quarters[qIndex] = serviceInQuarter.cost;
                        }
                    });

                    // Calculate annual total for this service
                    const annual = quarters.reduce((sum, cost) => sum + cost, 0);

                    rows.push({
                        name: service.name,
                        description: service.name,
                        quarters: quarters,
                        annual: annual
                    });
                }
            });
        });

        return rows;
    }

    /**
     * Build service rows (fallback if no schedule provided)
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

        services.forEach(serviceType => {
            const serviceData = calculation.breakdownByService?.[serviceType] || calculation.services?.[serviceType];

            let annualCost = 0;
            if (serviceData) {
                annualCost = serviceData.grandTotal || serviceData.total || 0;
            } else {
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
            const quarterlyAmount = annualCost / 4;
            return [quarterlyAmount, quarterlyAmount, quarterlyAmount, quarterlyAmount];
        } else if (frequency === 2) {
            const semiAnnualAmount = annualCost / 2;
            return [semiAnnualAmount, 0, semiAnnualAmount, 0];
        } else if (frequency === 1) {
            return [annualCost, 0, 0, 0];
        } else {
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
     * Generate quarter labels based on date (fallback)
     */
    generateQuarterLabels(date) {
        const monthAbbrev = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                            'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

        const startDate = new Date(date);
        // Add 1 month to bid date (Sprint 3 rule)
        startDate.setMonth(startDate.getMonth() + 1);

        const labels = [];

        for (let q = 0; q < 4; q++) {
            const qDate = new Date(startDate);
            qDate.setMonth(startDate.getMonth() + (q * 3));
            const month = qDate.getMonth();
            labels.push(`${monthAbbrev[month]} Qtr ${q + 1}`);
        }

        return labels;
    }

    /**
     * Generate professional Energen bid PDF with Sprint 6 enhancements
     * - Watermarks (DRAFT, SUPERSEDED)
     * - Versioned filenames
     * - Service schedule rendering
     * - Multi-unit support
     */
    async generateQuote(requestData) {
        // Handle both direct data and wrapped quoteData
        const calcData = requestData.quoteData || requestData;

        // Check if multi-unit
        const isMultiUnit = calcData.generators && calcData.generators.length > 1;

        if (isMultiUnit) {
            return this.generateMultiUnitQuote(calcData);
        } else {
            return this.generateSingleUnitQuote(calcData);
        }
    }

    /**
     * Generate single-unit PDF
     */
    async generateSingleUnitQuote(calcData) {
        const transformedData = this.transformCalculatorData(calcData);

        // Get filename from metadata (Sprint 4: Versioning)
        const filename = this.getFilenameFromMetadata(transformedData);
        const filepath = path.join(this.outputPath, filename);

        // Ensure output directory exists
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            try {
                // Create output stream
                const outputStream = fs.createWriteStream(filepath);

                // Create builder
                const builder = new PDFDocumentBuilder();
                builder.setLayoutStrategy('single-page');

                // Add all components
                const header = new PDFHeaderComponent();
                builder.addComponent(header, transformedData, { priority: 100 });

                const customerInfo = new PDFCustomerInfoComponent();
                builder.addComponent(customerInfo, transformedData, { priority: 90 });

                const table = new PDFTableComponent();
                builder.addComponent(table, transformedData, { priority: 80 });

                const disclosure = new PDFDisclosureComponent();
                builder.addComponent(disclosure, transformedData, { priority: 50 });

                const signature = new PDFSignatureComponent();
                builder.addComponent(signature, transformedData, { priority: 40 });

                const footer = new PDFFooterComponent();
                builder.addComponent(footer, transformedData, { priority: 10 });

                // Build the document
                const result = builder.build(outputStream);

                // Apply watermark if needed (Sprint 6)
                if (transformedData.metadata?.watermark) {
                    this.applyWatermark(result.document, transformedData.metadata.watermark);
                }

                // Wait for completion
                outputStream.on('finish', () => {
                    resolve({
                        success: true,
                        filename,
                        filepath,
                        url: `/output/pdfs/${filename}`,
                        pages: result.totalPages,
                        components: result.componentsRendered,
                        version: transformedData.metadata?.version?.string || 'v1.0',
                        status: transformedData.metadata?.status || 'draft',
                        bidNumber: transformedData.metadata?.bidNumber || null
                    });
                });

                outputStream.on('error', reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate multi-unit PDF with consolidation summary page
     * Sprint 6: Multi-Unit Support
     */
    async generateMultiUnitQuote(calcData) {
        // TODO: Implement multi-unit PDF generation
        // For now, generate single-unit PDF with all units combined
        console.log('[PDF] Multi-unit PDF generation - using single-unit mode for now');
        console.log(`[PDF] Units to process: ${calcData.generators?.length || 0}`);

        return this.generateSingleUnitQuote(calcData);
    }

    /**
     * Get filename from metadata (Sprint 4/6: Versioning & Naming)
     */
    getFilenameFromMetadata(transformedData) {
        const metadata = transformedData.metadata || {};

        // Use suggested filename from versioning system if available
        if (metadata.suggestedFilename) {
            return metadata.suggestedFilename;
        }

        // Generate filename based on status and version
        const status = metadata.status || 'draft';
        const version = metadata.version?.string || 'v1.0';
        const bidNumber = metadata.bidNumber;

        if (status === 'draft') {
            return `Energen_Bid_DRAFT_${Date.now()}.pdf`;
        } else if (bidNumber) {
            const dateStr = this.formatDateForFilename(metadata.date || new Date());
            return `Energen_Bid_${bidNumber}_${version}_${dateStr}.pdf`;
        } else {
            return `Energen_Bid_${metadata.estimateNumber || Date.now()}.pdf`;
        }
    }

    /**
     * Format date for filename (YYYYMMDD)
     */
    formatDateForFilename(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * Apply watermark to PDF document
     * Sprint 6: Watermark System
     *
     * Watermark types:
     * - DRAFT: Orange diagonal "DRAFT" watermark
     * - SUPERSEDED: Gray diagonal "SUPERSEDED BY vX.X" watermark
     * - null: No watermark (official quotes)
     */
    applyWatermark(doc, watermarkConfig) {
        if (!watermarkConfig || !watermarkConfig.text) {
            return; // No watermark
        }

        const {
            text = 'DRAFT',
            color = '#FF6B35',
            opacity = 0.3,
            fontSize = 120,
            rotation = -45,
            position = 'center'
        } = watermarkConfig;

        // Save current state
        doc.save();

        // Calculate watermark position
        const pageWidth = 612;  // Letter size width
        const pageHeight = 792; // Letter size height
        const centerX = pageWidth / 2;
        const centerY = pageHeight / 2;

        // Apply watermark to all pages
        const totalPages = doc.bufferedPageRange().count;

        for (let i = 0; i < totalPages; i++) {
            // Switch to page
            doc.switchToPage(i);

            // Set opacity
            doc.opacity(opacity);

            // Move to center and rotate
            doc.translate(centerX, centerY);
            doc.rotate(rotation, { origin: [0, 0] });

            // Draw watermark text
            doc.font('Helvetica-Bold')
               .fontSize(fontSize)
               .fillColor(color)
               .text(text, -300, -60, {
                   width: 600,
                   align: 'center'
               });

            // Restore state for this page
            doc.restore();
            doc.save();
        }

        // Final restore
        doc.restore();
    }

    /**
     * Generate test PDF with Sprint 6 features
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
                contact: 'John Smith'
            },
            generators: [
                {
                    kw: 500,
                    location: 'Building A',
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
                bidNumber: null,
                version: { major: 1, minor: 0, string: 'v1.0' },
                status: 'draft',
                date: new Date(),
                preparedBy: 'Energen Sales Team',
                watermark: {
                    text: 'DRAFT',
                    color: '#FF6B35',
                    opacity: 0.3,
                    fontSize: 120,
                    rotation: -45
                }
            }
        };

        return this.generateQuote(testData);
    }
}

export default ProfessionalPDFServiceSprint6;
