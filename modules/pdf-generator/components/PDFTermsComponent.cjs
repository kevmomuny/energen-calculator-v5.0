/**
 * PDFTermsComponent - Terms and Conditions Component
 * Renders terms and conditions with sections and proper formatting
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFTermsComponent extends PDFComponent {
  constructor(config = {}) {
    super();
    this.config = {
      title: 'TERMS AND CONDITIONS',
      titleFontSize: 14,
      sectionTitleFontSize: 11,
      contentFontSize: 9,
      lineSpacing: 1.2,
      sectionSpacing: 15,
      colors: {
        title: '#000000',
        sectionTitle: '#333333',
        content: '#666666'
      },
      ...config
    };
  }

  _defineSpecs() {
    return {
      minHeight: 100,
      maxHeight: 600,
      canScale: true,
      canBreakPage: true,
      priority: 70
    };
  }

  calculateSpace(doc, data) {
    if (!data.terms) {
      return { required: 0, minimum: 0 };
    }

    // Calculate space for title
    let height = 30; // Title and spacing

    // Calculate space for each section
    const sections = data.terms.sections || [];
    sections.forEach(section => {
      height += 20; // Section title

      // Estimate content height (rough calculation)
      const lines = Math.ceil((section.content || '').length / 80);
      height += lines * 12 * this.config.lineSpacing;
      height += this.config.sectionSpacing;
    });

    return {
      required: height,
      minimum: 100
    };
  }

  render(doc, bounds, data) {
    if (!data.terms) {
      return {
        success: false,
        error: 'No terms data provided'
      };
    }

    const startY = bounds.y;
    let currentY = startY;

    // Render title
    doc.font('Helvetica-Bold')
      .fontSize(this.config.titleFontSize)
      .fillColor(this.config.colors.title)
      .text(data.terms.title || this.config.title, bounds.x, currentY, {
        width: bounds.width,
        align: 'center'
      });

    currentY += 30;

    // Render sections
    const sections = data.terms.sections || [];
    sections.forEach((section, index) => {
      // Check if we need a new page
      if (currentY + 50 > bounds.y + bounds.height) {
        doc.addPage();
        currentY = 40; // Reset to top margin
      }

      // Section title
      doc.font('Helvetica-Bold')
        .fontSize(this.config.sectionTitleFontSize)
        .fillColor(this.config.colors.sectionTitle)
        .text(`${index + 1}. ${section.title}`, bounds.x, currentY, {
          width: bounds.width
        });

      currentY += 20;

      // Section content
      doc.font('Helvetica')
        .fontSize(this.config.contentFontSize)
        .fillColor(this.config.colors.content);

      const contentHeight = doc.heightOfString(section.content, {
        width: bounds.width,
        lineGap: 2
      });

      // Check if content fits on current page
      if (currentY + contentHeight > bounds.y + bounds.height) {
        doc.addPage();
        currentY = 40;
      }

      doc.text(section.content, bounds.x, currentY, {
        width: bounds.width,
        lineGap: 2,
        align: 'justify'
      });

      currentY += contentHeight + this.config.sectionSpacing;
    });

    // Add a subtle separator line at the end
    if (currentY < bounds.y + bounds.height - 10) {
      doc.moveTo(bounds.x, currentY)
        .lineTo(bounds.x + bounds.width, currentY)
        .lineWidth(0.5)
        .strokeColor('#CCCCCC')
        .stroke();
      currentY += 10;
    }

    return {
      success: true,
      actualHeight: currentY - startY,
      endY: currentY
    };
  }
}

module.exports = PDFTermsComponent;
