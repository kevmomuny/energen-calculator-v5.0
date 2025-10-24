/**
 * Construction Bid PDF Generation Service
 * Custom service for generating construction/installation project bids
 * Uses professional bid format with Energen branding
 * @module pdf-generator/construction-bid-pdf-service
 * @version 5.0.0
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

// Import components
const PDFDocumentBuilder = require('./core/PDFDocumentBuilder.cjs');
const PDFHeaderComponent = require('./components/PDFHeaderComponent.cjs');
const PDFCustomerInfoComponent = require('./components/PDFCustomerInfoComponent.cjs');
const PDFFooterComponent = require('./components/PDFFooterComponent.cjs');
const PDFConstructionBidComponent = require('./components/PDFConstructionBidComponent.cjs');
const PDFSignatureComponent = require('./components/PDFSignatureComponent.cjs');

export class ConstructionBidPDFService {
    constructor(config = {}) {
        this.outputPath = config.outputPath || path.join(__dirname, '../../output/pdfs');
        this.assetsPath = path.join(__dirname, 'assets');

        // Energen company information
        this.companyInfo = config.companyInfo || {
            name: 'Energen Systems Inc.',
            address: '150 Mason Circle, Suite K',
            city: 'Concord',
            state: 'CA',
            zip: '94520',
            phone: '(925) 289-8969',
            email: 'service@energensystems.com',
            website: 'www.energensystems.com'
        };
    }

    /**
     * Generate a construction bid proposal PDF
     * @param {Object} bidData - Bid data with customer, project details, costs, etc.
     * @returns {Promise<Object>} Result with filename, filepath, etc.
     */
    async generateBid(bidData) {
        // Use provided company info or defaults
        const companyInfo = bidData.company || this.companyInfo;

        // Build filename
        const estimateNumber = bidData.metadata?.estimateNumber || `BID-${Date.now()}`;
        const filename = `Energen_Bid_${estimateNumber}.pdf`;
        const filepath = path.join(this.outputPath, filename);

        // Ensure output directory exists
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            try {
                // Create output stream
                const outputStream = fs.createWriteStream(filepath);

                console.log('Creating PDF builder...');

                // Create builder
                const builder = new PDFDocumentBuilder();
                builder.setLayoutStrategy('multi-page'); // Allow multiple pages for long bids

                console.log('Adding header component...');
                // 1. Header with Energen logo and bid title
                const header = new PDFHeaderComponent();
                builder.addComponent(header, bidData, { priority: 100 });

                console.log('Adding customer info component...');
                // 2. Customer Information
                const customerInfo = new PDFCustomerInfoComponent();
                builder.addComponent(customerInfo, bidData, { priority: 90 });

                console.log('Adding bid content component...');
                // 3. Main Construction Bid Content (Cost breakdown, scope, schedule, etc.)
                const bidContent = new PDFConstructionBidComponent();
                builder.addComponent(bidContent, bidData, { priority: 80 });

                // NOTE: Signature component disabled - causes coordinate errors with construction bid format
                // Can be added back after fixing coordinate handling
                // console.log('Adding signature component...');
                // const signature = new PDFSignatureComponent();
                // builder.addComponent(signature, bidData, { priority: 70 });

                // NOTE: Footer will be added AFTER we know total page count
                console.log('Footer will be added after determining page count...');

                console.log('Building PDF document...');
                // Build the document (but don't finalize yet)
                let doc, totalPages;
                try {
                    // Create the document structure first
                    const builder_internal = builder;

                    // Use a custom build approach to add page numbers before finalization
                    const PDFDocument = require('pdfkit');
                    doc = builder_internal.doc = new PDFDocument({
                        size: 'letter',
                        margin: 40,
                        info: {
                            title: bidData.title || 'Construction Bid',
                            author: companyInfo.name
                        }
                    });

                    // Pipe to output stream
                    doc.pipe(outputStream);

                    // Sort components by priority and render
                    const sortedComponents = [...builder_internal.components].sort(
                        (a, b) => b.options.priority - a.options.priority
                    );

                    // Multi-page layout
                    const pageHeight = 792 - 80; // Letter size minus margins
                    const pageWidth = 612 - 80;
                    let currentY = 40;
                    let currentPageNum = 1;

                    sortedComponents.forEach(({ component, data, options }) => {
                        const space = component.calculateSpace(doc, data);

                        // Check if we need a new page
                        if (currentY + space.preferredHeight > pageHeight + 40 && currentPageNum > 0) {
                            doc.addPage();
                            currentPageNum++;
                            currentY = 40;
                        }

                        const bounds = {
                            x: 40,
                            y: currentY,
                            width: pageWidth,
                            height: space.preferredHeight
                        };

                        component.render(doc, bounds, data);
                        currentY += space.preferredHeight;
                    });

                    totalPages = currentPageNum;
                    console.log(`PDF rendering completed - ${totalPages} pages generated`);

                    // NOW render footer on each page with correct page numbers
                    console.log(`Adding footers with page numbers to ${totalPages} pages...`);
                    const footer = new PDFFooterComponent();

                    // Manually render footer on each page
                    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
                        // Calculate where footer should go (bottom of page)
                        const footerBounds = {
                            x: 40,
                            y: 747,  // Fixed footer position
                            width: 532,
                            height: 45
                        };

                        // Switch to the page
                        if (pageNum > 0) {
                            doc.switchToPage(pageNum);
                        }

                        // Render footer with current page number
                        footer.render(doc, footerBounds, {
                            ...bidData,
                            company: companyInfo,
                            currentPage: pageNum + 1,
                            totalPages: totalPages
                        });
                    }

                    console.log(`Footers added successfully to all pages`);

                    // NOW finalize
                    doc.end();

                    const result = {
                        document: doc,
                        totalPages: totalPages
                    };

                } catch (buildError) {
                    console.error('Error during PDF build:', buildError);
                    console.error('Build error stack:', buildError.stack);
                    throw buildError;
                }

                // Wait for completion
                outputStream.on('finish', () => {
                    const stats = fs.statSync(filepath);
                    resolve({
                        success: true,
                        filename,
                        filepath,
                        url: `/output/pdfs/${filename}`,
                        pages: totalPages,
                        size: stats.size
                    });
                });

                outputStream.on('error', (error) => {
                    reject(new Error(`PDF generation failed: ${error.message}`));
                });

            } catch (error) {
                reject(new Error(`Failed to create PDF: ${error.message}`));
            }
        });
    }

    /**
     * Test generation with sample data
     */
    async testGeneration() {
        const testData = {
            title: 'CONSTRUCTION BID PROPOSAL',
            customer: {
                companyName: 'Test Customer Inc.',
                streetAddress: '123 Main Street',
                city: 'Berkeley',
                state: 'CA',
                zip: '94705',
                contactName: 'John Smith',
                phone: '(510) 555-1234',
                email: 'john@testcustomer.com'
            },
            generator: {
                model: 'Building Renovation Project',
                location: 'Building 84, Main Campus',
                kw: 0
            },
            services: [
                {
                    name: 'Subcontractor Services',
                    description: 'Complete installation and materials',
                    category: 'Installation',
                    annual: 33841.00
                },
                {
                    name: 'General Contractor Markup (35%)',
                    description: 'Project management and oversight',
                    category: 'GC Services',
                    annual: 11844.35
                }
            ],
            totals: {
                quarterly: [45685.35, 0, 0, 0],
                annual: 45685.35
            },
            metadata: {
                estimateNumber: 'TEST-001',
                date: new Date(),
                validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                preparedBy: 'Test User',
                terms: '30% deposit, 50% on delivery, 20% on completion',
                contact: {
                    name: 'Test User',
                    phone: '(925) 289-8969',
                    email: 'test@energensystems.com'
                }
            },
            customSections: [
                {
                    title: 'Project Scope',
                    content: [
                        'Complete removal and replacement of existing system',
                        'Custom fabrication and installation',
                        'Testing and commissioning'
                    ]
                }
            ]
        };

        return this.generateBid(testData);
    }
}

export default ConstructionBidPDFService;
