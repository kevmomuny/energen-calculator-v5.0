/**
 * PDFConstructionBidComponent - Compact Construction Bid Template
 * Optimized for single-page or minimal multi-page output
 * @version 5.0.1 - Fixed pagination issues
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFConstructionBidComponent extends PDFComponent {
  constructor(config = {}) {
    super();
    this.config = config;

    // Energen brand colors
    this.colors = {
      primary: '#008AFC',
      primaryDark: '#0066CC',
      text: '#000000',
      textLight: '#666666',
      border: '#CCCCCC',
      background: '#F5F5F5',
      white: '#FFFFFF'
    };
  }

  _defineSpecs() {
    return {
      minHeight: 200,
      maxHeight: 999999,
      canScale: true,
      canBreakPage: true,
      priority: 50
    };
  }

  calculateSpace(doc, data) {
    // Calculate actual space needed - be conservative
    const serviceCount = data.services?.length || 0;
    const customSectionCount = data.customSections?.length || 0;

    // Base: 150px, Services: 20px each, Custom sections: 80px each (reduced from 60)
    const estimatedHeight = 150 + (serviceCount * 20) + (customSectionCount * 80);

    return {
      minHeight: Math.min(estimatedHeight, 600),
      preferredHeight: estimatedHeight,
      maxHeight: estimatedHeight
    };
  }

  render(doc, bounds, data) {
    doc.save();

    const y = bounds.y || 100;
    const x = bounds.x || 40;
    const width = bounds.width || 532;

    let yPos = y;
    const startY = y;

    // Project Overview - Compact
    yPos = this.renderProjectOverview(doc, x, yPos, width, data);
    yPos += 15; // Reduced from 20

    // Cost Breakdown Table
    yPos = this.renderCostBreakdownTable(doc, x, yPos, width, data);
    yPos += 15; // Reduced from 20

    // Total Summary - Compact
    yPos = this.renderTotalSummary(doc, x, yPos, width, data);
    yPos += 15; // Reduced from 20

    // Custom Sections - ONLY render first 3 most important ones compactly
    if (data.customSections && data.customSections.length > 0) {
      // Render only scope, costs, and schedule - skip verbose sections
      const importantSections = data.customSections.filter(s =>
        s.title.includes('SCOPE') ||
                s.title.includes('COST') ||
                s.title.includes('SCHEDULE') ||
                s.title.includes('PAYMENT')
      ).slice(0, 4); // Max 4 sections

      yPos = this.renderCustomSectionsCompact(doc, x, yPos, width, importantSections);
    }

    // Contact Info - Compact
    yPos = this.renderContactInfoCompact(doc, x, yPos, width, data);

    doc.restore();

    return {
      height: yPos - startY,
      overflow: false
    };
  }

  renderProjectOverview(doc, x, y, width, data) {
    // Compact header
    doc.rect(x, y, width, 20)
      .fillAndStroke(this.colors.primary, this.colors.primary);

    doc.font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(this.colors.white)
      .text('PROJECT OVERVIEW', x + 10, y + 5);

    y += 25;

    // Two column layout - very compact
    const col1 = x + 10;
    const col2 = x + (width / 2);
    const lineHeight = 12;

    doc.font('Helvetica-Bold').fontSize(8).fillColor(this.colors.text);

    doc.text('PROJECT:', col1, y);
    doc.font('Helvetica').fillColor(this.colors.textLight)
      .text(data.generator?.model || 'Construction Project', col1 + 55, y, {width: (width/2) - 75, continued: false});

    doc.font('Helvetica-Bold').fillColor(this.colors.text)
      .text('ESTIMATE #:', col2, y);
    doc.font('Helvetica').fillColor(this.colors.textLight)
      .text(data.metadata?.estimateNumber || 'TBD', col2 + 65, y);

    y += lineHeight;

    doc.font('Helvetica-Bold').fillColor(this.colors.text)
      .text('LOCATION:', col1, y);
    doc.font('Helvetica').fillColor(this.colors.textLight)
      .text((data.generator?.location || 'TBD').substring(0, 60), col1 + 55, y, {width: (width/2) - 75});

    const dateStr = data.metadata?.date ? new Date(data.metadata.date).toLocaleDateString() : 'TBD';
    doc.font('Helvetica-Bold').fillColor(this.colors.text)
      .text('DATE:', col2, y);
    doc.font('Helvetica').fillColor(this.colors.textLight)
      .text(dateStr, col2 + 65, y);

    return y + lineHeight + 5;
  }

  renderCostBreakdownTable(doc, x, y, width, data) {
    // Compact header
    doc.rect(x, y, width, 20)
      .fillAndStroke(this.colors.primary, this.colors.primary);

    doc.font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(this.colors.white)
      .text('COST BREAKDOWN', x + 10, y + 5);

    y += 22;

    // Table header - compact
    const colWidths = {
      description: width * 0.55,
      category: width * 0.20,
      amount: width * 0.25
    };

    let xPos = x;

    doc.rect(xPos, y, width, 16)
      .fillAndStroke(this.colors.background, this.colors.border);

    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(this.colors.text)
      .text('DESCRIPTION', xPos + 5, y + 4, {width: colWidths.description - 10});

    xPos += colWidths.description;
    doc.text('CATEGORY', xPos + 5, y + 4, {width: colWidths.category - 10});

    xPos += colWidths.category;
    doc.text('AMOUNT', xPos + 5, y + 4, {width: colWidths.amount - 10, align: 'right'});

    y += 16;

    // Table rows - compact
    if (data.services && data.services.length > 0) {
      data.services.forEach((service, index) => {
        const rowHeight = 16; // Reduced from 18
        const bgColor = index % 2 === 0 ? this.colors.white : this.colors.background;

        doc.rect(x, y, width, rowHeight)
          .fillAndStroke(bgColor, this.colors.border);

        xPos = x;

        doc.font('Helvetica')
          .fontSize(8)
          .fillColor(this.colors.text)
          .text(service.name || service.description, xPos + 5, y + 4, {
            width: colWidths.description - 10,
            ellipsis: true
          });

        xPos += colWidths.description;
        doc.fontSize(7)
          .fillColor(this.colors.textLight)
          .text(service.category || '', xPos + 5, y + 4, {
            width: colWidths.category - 10,
            ellipsis: true
          });

        xPos += colWidths.category;
        const amount = service.annual || service.q1 || 0;
        doc.fontSize(8)
          .fillColor(this.colors.text)
          .text(`$${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            xPos + 5, y + 4, {
              width: colWidths.amount - 10,
              align: 'right'
            });

        y += rowHeight;
      });
    }

    return y + 5;
  }

  renderTotalSummary(doc, x, y, width, data) {
    // Compact summary box
    doc.rect(x, y, width, 60) // Reduced from 80
      .fillAndStroke('#E8F4FE', this.colors.primary);

    y += 8;

    // Subtotal
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(this.colors.text)
      .text('Subtotal (Known Costs):', x + 10, y);

    const subtotal = data.totals?.annual || 0;
    doc.font('Helvetica-Bold')
      .fontSize(9)
      .text(`$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}`,
        x + width - 100, y, {width: 90, align: 'right'});

    y += 14;

    // Pending costs - compact
    doc.font('Helvetica')
      .fontSize(9)
      .fillColor(this.colors.textLight)
      .text('Pending: Prevailing Wage + Safety Training', x + 10, y);

    doc.font('Helvetica')
      .fontSize(9)
      .text('TBD', x + width - 100, y, {width: 90, align: 'right'});

    y += 18;

    // Grand total
    doc.moveTo(x + 10, y)
      .lineTo(x + width - 10, y)
      .stroke(this.colors.primary);

    y += 8;

    doc.font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(this.colors.primary)
      .text('ESTIMATED TOTAL:', x + 10, y);

    doc.fontSize(11)
      .text(`$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})} +`,
        x + width - 100, y, {width: 90, align: 'right'});

    return y + 18;
  }

  renderCustomSectionsCompact(doc, x, y, width, sections) {
    sections.forEach((section, index) => {
      // Compact section header
      doc.rect(x, y, width, 18)
        .fillAndStroke(this.colors.primaryDark, this.colors.primaryDark);

      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(this.colors.white)
        .text(section.title.toUpperCase(), x + 10, y + 5);

      y += 20;

      // Render content compactly - max 8 lines per section
      if (Array.isArray(section.content)) {
        const linesToShow = section.content.slice(0, 8); // Limit lines
        linesToShow.forEach(line => {
          if (line.trim()) { // Skip empty lines
            doc.font('Helvetica')
              .fontSize(8)
              .fillColor(this.colors.text)
              .text(line, x + 10, y, {
                width: width - 20,
                ellipsis: true,
                lineBreak: false
              });
            y += 10; // Reduced from 12
          }
        });
      } else {
        // String content - limit to 3 lines
        const text = section.content.substring(0, 200); // Max 200 chars
        doc.font('Helvetica')
          .fontSize(8)
          .fillColor(this.colors.text)
          .text(text, x + 10, y, {
            width: width - 20,
            lineGap: 2
          });
        y += 30; // Fixed height
      }

      y += 10; // Reduced from 15
    });

    return y;
  }

  renderContactInfoCompact(doc, x, y, width, data) {
    // Very compact contact section
    doc.rect(x, y, width, 16)
      .fillAndStroke(this.colors.background, this.colors.border);

    doc.font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(this.colors.text)
      .text('QUESTIONS OR APPROVAL', x + 10, y + 4);

    y += 18;

    const contact = data.metadata?.contact || {};
    const lineHeight = 11;

    doc.font('Helvetica').fontSize(8);

    const contactText = `Contact: ${contact.name || data.metadata?.preparedBy || 'Energen Sales Team'}  |  ` +
                           `Phone: ${contact.phone || '(925) 289-8969'}  |  ` +
                           `Email: ${contact.email || 'service@energensystems.com'}`;

    doc.fillColor(this.colors.text)
      .text(contactText, x + 10, y, {width: width - 20, lineGap: 2});

    return y + lineHeight + 5;
  }
}

module.exports = PDFConstructionBidComponent;
