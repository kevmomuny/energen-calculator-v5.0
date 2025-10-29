/**
 * PDFHeaderComponent - Energen-specific header component
 * PIXEL-PERFECT implementation matching original specifications
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

class PDFHeaderComponent extends PDFComponent {
  constructor(config = {}) {
    super();
    // EXACT specifications from original implementation
    this.specs = {
      logoWidth: 115,           // Exact logo width
      logoHeight: 35,           // Exact logo height
      logoX: 40,               // 40pt from left (page margin)
      logoY: 40,               // 40pt from top (page margin)
      titleX: 175,             // Title starts after logo
      titleY: 48,              // Vertically centered with logo
      titleFontSize: 14,
      subtitleY: 65,           // Below title
      subtitleFontSize: 11,
      estimateNumberX: 472,    // Right-aligned estimate number
      estimateNumberY: 48,     // Same line as title
      dateX: 472,              // Right-aligned date
      dateY: 65,               // Same line as subtitle
      ...config
    };
  }

  _defineSpecs() {
    return {
      minHeight: 53,  // Actual height from margin to line + 8px balanced padding
      maxHeight: 53,  // Actual height from margin to line + 8px balanced padding
      canScale: false,
      canBreakPage: false,
      priority: 100
    };
  }

  calculateSpace(doc, data) {
    return {
      minHeight: 53,  // Actual height from margin to line + 8px balanced padding
      preferredHeight: 53,  // Actual height from margin to line + 8px balanced padding
      maxHeight: 53
    };
  }

  render(doc, bounds, data) {
    // Save current state
    doc.save();

    // Render SVG logo - EXACT POSITIONING
    if (ENERGEN_LOGO_SVG) {
      try {
        SVGtoPDF(doc, ENERGEN_LOGO_SVG, this.specs.logoX, this.specs.logoY, {
          width: this.specs.logoWidth,
          height: this.specs.logoHeight,
          preserveAspectRatio: 'xMidYMid meet'
        });
      } catch (error) {
        console.error('Error rendering logo:', error);
        // Fallback text if logo fails
        doc.font('Helvetica-Bold')
          .fontSize(16)
          .fillColor('#008AFC')
          .text('ENERGEN', this.specs.logoX, this.specs.logoY);
      }
    } else {
      // Fallback text if no logo file
      doc.font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('#008AFC')
        .text('ENERGEN SYSTEMS', this.specs.logoX, this.specs.logoY);
    }

    // Document title - CENTERED on page
    const title = data.title || 'GENERATOR SERVICE AGREEMENT';
    doc.font('Helvetica-Bold')
      .fontSize(this.specs.titleFontSize)
      .fillColor('black')
      .text(title, 40, this.specs.titleY, {
        width: 532,  // Full width between margins (612 - 40 - 40)
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

    // Estimate number or DRAFT status (right-aligned)
    // Legal document requirement: must show official quote number OR clearly mark as DRAFT
    const estimateNumber = data.metadata?.estimateNumber;
    if (estimateNumber) {
      // Official quote number from Zoho
      let estimateNum = estimateNumber;
      if (estimateNum.length > 15) {
        estimateNum = estimateNum.substring(0, 12) + '...';
      }

      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('black')
        .text(`EST #${estimateNum}`, this.specs.estimateNumberX - 50, this.specs.estimateNumberY - 2, {
          width: 150,
          align: 'right'
        });
    } else {
      // No official quote number - mark as DRAFT
      doc.font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#CC0000') // Red color for DRAFT
        .text('DRAFT', this.specs.estimateNumberX - 50, this.specs.estimateNumberY - 2, {
          width: 150,
          align: 'right'
        });
    }

    // Optional date (right-aligned) - only show if provided
    if (data.metadata?.date) {
      const date = this._formatDate(data.metadata.date);
      doc.font('Helvetica')
        .fontSize(9)
        .fillColor('#666666')
        .text(date, this.specs.dateX, this.specs.dateY + 2, {
          width: 100,
          align: 'right'
        });
    }

    // Horizontal line below header
    const lineY = 85;  // Back to original position
    doc.moveTo(40, lineY)
      .lineTo(572, lineY)
      .lineWidth(0.5)
      .strokeColor('#CCCCCC')
      .stroke();

    // Restore state
    doc.restore();

    // Return RELATIVE height, not absolute position
    // The line is at Y:85, header starts at bounds.y (40)
    // Balanced padding of 8px after line for professional appearance
    return {
      endY: lineY + 8,  // Absolute end position (for reference)
      actualHeight: (lineY - bounds.y) + 8,  // RELATIVE height from start with balanced padding
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

module.exports = PDFHeaderComponent;
