/**
 * PDFNotesComponent - Notes/Comments Component
 * Renders bulleted notes or additional comments
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFNotesComponent extends PDFComponent {
  constructor(config = {}) {
    super();
    this.config = {
      title: 'ADDITIONAL NOTES',
      titleFontSize: 12,
      noteFontSize: 9,
      bulletStyle: '•', // Can be '•', '◦', '▪', '→', or custom
      indentSize: 20,
      noteSpacing: 8,
      colors: {
        title: '#000000',
        bullet: '#008AFC',
        text: '#333333'
      },
      showBorder: true,
      borderColor: '#E0E0E0',
      backgroundColor: '#F9F9F9',
      padding: 10,
      ...config
    };
  }

  _defineSpecs() {
    return {
      minHeight: 50,
      maxHeight: 400,
      canScale: true,
      canBreakPage: false,
      priority: 60
    };
  }

  calculateSpace(doc, data) {
    if (!data.notes || !Array.isArray(data.notes) || data.notes.length === 0) {
      return { required: 0, minimum: 0 };
    }

    // Title height
    let height = this.config.title ? 25 : 0;

    // Padding
    if (this.config.showBorder || this.config.backgroundColor !== 'transparent') {
      height += this.config.padding * 2;
    }

    // Calculate height for each note
    data.notes.forEach(note => {
      const lines = Math.ceil((note || '').length / 70);
      height += lines * 12 + this.config.noteSpacing;
    });

    return {
      required: height,
      minimum: 50
    };
  }

  render(doc, bounds, data) {
    if (!data.notes || !Array.isArray(data.notes) || data.notes.length === 0) {
      return {
        success: false,
        error: 'No notes provided'
      };
    }

    const startY = bounds.y;
    let currentY = startY;
    let contentX = bounds.x;
    let contentWidth = bounds.width;

    // Draw background if configured
    if (this.config.backgroundColor && this.config.backgroundColor !== 'transparent') {
      const bgHeight = this.calculateSpace(doc, data).required;
      doc.rect(bounds.x, currentY, bounds.width, Math.min(bgHeight, bounds.height))
        .fillColor(this.config.backgroundColor)
        .fill();
    }

    // Apply padding if border or background
    if (this.config.showBorder || this.config.backgroundColor !== 'transparent') {
      contentX += this.config.padding;
      contentWidth -= this.config.padding * 2;
      currentY += this.config.padding;
    }

    // Render title if provided
    if (this.config.title) {
      doc.font('Helvetica-Bold')
        .fontSize(this.config.titleFontSize)
        .fillColor(this.config.colors.title)
        .text(this.config.title, contentX, currentY, {
          width: contentWidth
        });
      currentY += 25;
    }

    // Render notes
    data.notes.forEach((note, index) => {
      // Check if we have enough space
      const noteHeight = doc.heightOfString(note, {
        width: contentWidth - this.config.indentSize
      });

      if (currentY + noteHeight > bounds.y + bounds.height - this.config.padding) {
        // Not enough space, stop here
        return;
      }

      // Draw bullet
      doc.font('Helvetica')
        .fontSize(this.config.noteFontSize)
        .fillColor(this.config.colors.bullet)
        .text(this.config.bulletStyle, contentX, currentY);

      // Draw note text
      doc.font('Helvetica')
        .fontSize(this.config.noteFontSize)
        .fillColor(this.config.colors.text)
        .text(note, contentX + this.config.indentSize, currentY, {
          width: contentWidth - this.config.indentSize,
          lineGap: 2
        });

      currentY += noteHeight + this.config.noteSpacing;
    });

    // Add padding at bottom if configured
    if (this.config.showBorder || this.config.backgroundColor !== 'transparent') {
      currentY += this.config.padding;
    }

    // Draw border if configured
    if (this.config.showBorder) {
      const boxHeight = currentY - startY;
      doc.rect(bounds.x, startY, bounds.width, boxHeight)
        .lineWidth(1)
        .strokeColor(this.config.borderColor)
        .stroke();
    }

    return {
      success: true,
      actualHeight: currentY - startY,
      endY: currentY
    };
  }
}

module.exports = PDFNotesComponent;
