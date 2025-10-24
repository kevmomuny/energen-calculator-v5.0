/**
 * PDFHeaderComponent - Sprint 6 Enhanced
 * Adds version number display and bid number support
 */

const PDFComponent = require('../core/PDFComponent.cjs');
const fs = require('fs');
const path = require('path');
const SVGtoPDF = require('svg-to-pdfkit');

// Load the Energen SVG logo
const LOGO_PATH = path.join(__dirname, '../assets/energen-logo.svg');
const ENERGEN_LOGO_SVG = fs.existsSync(LOGO_PATH)
    ? fs.readFileSync(LOGO_PATH, 'utf8')
    : null;

class PDFHeaderComponentSprint6 extends PDFComponent {
    constructor(config = {}) {
        super();
        this.specs = {
            logoWidth: 115,
            logoHeight: 35,
            logoX: 40,
            logoY: 40,
            titleX: 175,
            titleY: 48,
            titleFontSize: 14,
            subtitleY: 65,
            subtitleFontSize: 11,
            estimateNumberX: 472,
            estimateNumberY: 48,
            dateX: 472,
            dateY: 65,
            versionX: 472,  // Sprint 6: Version display position
            versionY: 80,   // Sprint 6: Below date
            ...config
        };
    }

    _defineSpecs() {
        return {
            minHeight: 53,
            maxHeight: 53,
            canScale: false,
            canBreakPage: false,
            priority: 100
        };
    }

    calculateSpace(doc, data) {
        return {
            minHeight: 53,
            preferredHeight: 53,
            maxHeight: 53
        };
    }

    render(doc, bounds, data) {
        doc.save();

        // Render SVG logo
        if (ENERGEN_LOGO_SVG) {
            try {
                SVGtoPDF(doc, ENERGEN_LOGO_SVG, this.specs.logoX, this.specs.logoY, {
                    width: this.specs.logoWidth,
                    height: this.specs.logoHeight,
                    preserveAspectRatio: 'xMidYMid meet'
                });
            } catch (error) {
                console.error('Error rendering logo:', error);
                doc.font('Helvetica-Bold')
                   .fontSize(16)
                   .fillColor('#008AFC')
                   .text('ENERGEN', this.specs.logoX, this.specs.logoY);
            }
        } else {
            doc.font('Helvetica-Bold')
               .fontSize(16)
               .fillColor('#008AFC')
               .text('ENERGEN SYSTEMS', this.specs.logoX, this.specs.logoY);
        }

        // Document title - CENTERED
        const title = data.title || 'GENERATOR SERVICE AGREEMENT';
        doc.font('Helvetica-Bold')
           .fontSize(this.specs.titleFontSize)
           .fillColor('black')
           .text(title, 40, this.specs.titleY, {
               width: 532,
               align: 'center'
           });

        // Optional subtitle with customer name
        if (data.customer?.name) {
            doc.font('Helvetica')
               .fontSize(this.specs.subtitleFontSize)
               .fillColor('#666666')
               .text(`Prepared for: ${data.customer.name}`, 40, this.specs.subtitleY, {
                   width: 532,
                   align: 'center'
               });
        }

        // SPRINT 6: Bid number, estimate number, or DRAFT (right-aligned)
        // Legal document requirement: must show official number OR clearly mark as DRAFT
        const metadata = data.metadata || {};
        const bidNumber = metadata.bidNumber;
        const estimateNumber = metadata.estimateNumber;

        if (bidNumber) {
            // Official bid - show bid number
            let displayNumber = bidNumber;
            if (displayNumber.length > 15) {
                displayNumber = displayNumber.substring(0, 12) + '...';
            }

            doc.font('Helvetica-Bold')
               .fontSize(9)
               .fillColor('black')
               .text(`BID #${displayNumber}`, this.specs.estimateNumberX - 50, this.specs.estimateNumberY - 2, {
                   width: 150,
                   align: 'right'
               });
        } else if (estimateNumber) {
            // Official quote - show estimate number
            let displayNumber = estimateNumber;
            if (displayNumber.length > 15) {
                displayNumber = displayNumber.substring(0, 12) + '...';
            }

            doc.font('Helvetica-Bold')
               .fontSize(9)
               .fillColor('black')
               .text(`EST #${displayNumber}`, this.specs.estimateNumberX - 50, this.specs.estimateNumberY - 2, {
                   width: 150,
                   align: 'right'
               });
        } else {
            // No official number - mark as DRAFT
            doc.font('Helvetica-Bold')
               .fontSize(11)
               .fillColor('#CC0000') // Red color for DRAFT
               .text('DRAFT', this.specs.estimateNumberX - 50, this.specs.estimateNumberY - 2, {
                   width: 150,
                   align: 'right'
               });
        }

        // Date (right-aligned)
        if (metadata.date) {
            const date = this._formatDate(metadata.date);
            doc.font('Helvetica')
               .fontSize(9)
               .fillColor('#666666')
               .text(date, this.specs.dateX, this.specs.dateY + 2, {
                   width: 100,
                   align: 'right'
               });
        }

        // SPRINT 6: Version number (right-aligned, below date)
        if (metadata.version && metadata.version.string) {
            const versionString = metadata.version.string;
            const status = metadata.status || 'draft';

            let versionDisplay = versionString;
            if (status === 'draft') {
                versionDisplay = `${versionString} (Draft)`;
            }

            doc.font('Helvetica')
               .fontSize(8)
               .fillColor('#999999')
               .text(versionDisplay, this.specs.versionX, this.specs.versionY, {
                   width: 100,
                   align: 'right'
               });
        }

        // Horizontal line below header
        const lineY = 85;
        doc.moveTo(40, lineY)
           .lineTo(572, lineY)
           .lineWidth(0.5)
           .strokeColor('#CCCCCC')
           .stroke();

        doc.restore();

        return {
            endY: lineY + 8,
            actualHeight: (lineY - bounds.y) + 8,
            overflow: false
        };
    }

    /**
     * Format date as MM/DD/YYYY
     */
    _formatDate(date) {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
    }
}

module.exports = PDFHeaderComponentSprint6;
