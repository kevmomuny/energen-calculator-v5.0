/**
 * PDFSignatureComponent - Smart signature block component
 * Dynamically adjusts layout based on available space
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFSignatureComponent extends PDFComponent {
  /**
     * Define immutable specifications
     */
  _defineSpecs() {
    return {
      minHeight: 40,  // Minimum for just signature lines
      maxHeight: 150,
      canScale: true,
      canBreakPage: false,  // Signatures stay together
      priority: -20  // Renders after disclosure
    };
  }

  /**
     * Get default configuration
     */
  _getDefaultConfig() {
    return {
      // EXACT Energen signature blocks - DO NOT MODIFY
      blocks: [
        {
          title: 'Authorized Customer',
          fields: [
            { label: 'Name:', type: 'line', required: true },
            { label: 'Title:', type: 'line', required: true },
            { label: 'Signature:', type: 'line', required: true },
            { label: 'Date:', type: 'line', required: true }
          ]
        },
        {
          title: 'Energen Systems Inc. Representative',
          fields: [
            { label: 'Name:', type: 'line', required: true },
            { label: 'Title:', type: 'line', required: true },
            { label: 'Signature:', type: 'line', required: true },
            { label: 'Date:', type: 'line', required: true }
          ]
        }
      ],

      // Layout configuration
      layout: {
        columns: 2,  // Side by side
        columnGap: 40,  // Increased gap for longer titles
        lineLength: 160,  // Slightly shorter lines to accommodate longer titles
        lineSpacing: 18,  // Reduced slightly to ensure all fields fit
        labelWidth: 60   // Reduced to give more space for lines
      },

      // Text configuration
      text: {
        titleFontSize: 11,
        labelFontSize: 9,
        color: '#000000',
        lineColor: '#666666'
      },

      // Scaling behavior
      scaling: {
        aggressive: true,  // Allow aggressive scaling
        minFontSize: 7,
        removeOptionalFields: true  // Remove non-required fields when space is tight
      }
    };
  }

  /**
     * Calculate space requirements
     */
  calculateSpace(doc, data) {
    const blocks = data.blocks || this.config.blocks;
    const maxFields = Math.max(...blocks.map(b => b.fields.length));
    const preferredHeight = (maxFields * this.config.layout.lineSpacing) + 20;

    return {
      minHeight: this.specs.minHeight,
      preferredHeight: preferredHeight,
      maxHeight: this.specs.maxHeight
    };
  }

  /**
     * Render signature blocks with smart layout
     */
  render(doc, bounds, data) {
    const startY = bounds.y;
    const blocks = data.blocks || this.config.blocks;
    const availableHeight = bounds.height;

    // Determine layout based on available space
    const layout = this._determineLayout(availableHeight, blocks);

    // Render based on layout decision
    let endY;
    switch (layout.mode) {
      case 'full':
        endY = this._renderFullLayout(doc, bounds, blocks, layout);
        break;
      case 'compact':
        endY = this._renderCompactLayout(doc, bounds, blocks, layout);
        break;
      case 'minimal':
        endY = this._renderMinimalLayout(doc, bounds, blocks, layout);
        break;
      case 'emergency':
        endY = this._renderEmergencyLayout(doc, bounds, blocks);
        break;
      default:
        endY = startY;
    }

    // Ensure we don't exceed allocated bounds
    const maxEndY = bounds.y + bounds.height;
    const constrainedEndY = Math.min(endY, maxEndY);

    // Store render bounds
    this.lastRenderBounds = {
      x: bounds.x,
      y: startY,
      width: bounds.width,
      height: constrainedEndY - startY
    };

    return {
      endY: constrainedEndY,
      actualHeight: constrainedEndY - startY,
      overflow: endY > maxEndY
    };
  }

  /**
     * Determine optimal layout based on available space
     */
  _determineLayout(availableHeight, blocks) {
    const maxFields = Math.max(...blocks.map(b => b.fields.length));

    if (availableHeight >= 100) {
      // Full layout with all fields
      return {
        mode: 'full',
        fontSize: this.config.text.labelFontSize,
        lineSpacing: this.config.layout.lineSpacing,
        includeFields: 'all'
      };
    } else if (availableHeight >= 70) {
      // Compact layout with reduced spacing
      return {
        mode: 'compact',
        fontSize: 8,
        lineSpacing: 15,
        includeFields: 'required-plus'  // Required + name/title
      };
    } else if (availableHeight >= 50) {
      // Minimal layout with only essential fields
      return {
        mode: 'minimal',
        fontSize: 7,
        lineSpacing: 12,
        includeFields: 'required'  // Only required fields
      };
    } else {
      // Emergency layout - just signature lines
      return {
        mode: 'emergency',
        fontSize: 7,
        lineSpacing: 0
      };
    }
  }

  /**
     * Render full layout with all fields
     */
  _renderFullLayout(doc, bounds, blocks, layout) {
    const columnWidth = (bounds.width - this.config.layout.columnGap) / blocks.length;
    let maxY = bounds.y;

    blocks.forEach((block, index) => {
      const columnX = bounds.x + (index * (columnWidth + this.config.layout.columnGap));
      let currentY = bounds.y;

      // Block title
      doc.font('Helvetica-Bold')
        .fontSize(this.config.text.titleFontSize)
        .fillColor(this.config.text.color)
        .text(block.title, columnX, currentY);

      // Add proper padding after title (increased from 5 to 15)
      currentY += this.config.text.titleFontSize + 15;

      // Fields - ensure all 4 fields are rendered with proper spacing
      block.fields.forEach((field, fieldIndex) => {
        // Add extra spacing before signature line for visual clarity
        if (field.label === 'Signature:' && fieldIndex > 0) {
          currentY += 5;
        }

        this._renderField(doc, field, columnX, currentY, columnWidth, layout);
        currentY += layout.lineSpacing;
      });

      maxY = Math.max(maxY, currentY);
    });

    return maxY;
  }

  /**
     * Render compact layout with reduced fields
     */
  _renderCompactLayout(doc, bounds, blocks, layout) {
    const columnWidth = (bounds.width - this.config.layout.columnGap) / blocks.length;
    let maxY = bounds.y;

    blocks.forEach((block, index) => {
      const columnX = bounds.x + (index * (columnWidth + this.config.layout.columnGap));
      let currentY = bounds.y;

      // Smaller title
      doc.font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(this.config.text.color)
        .text(block.title, columnX, currentY);

      // Add padding after title (even in compact mode)
      currentY += 12 + 8;

      // In compact mode, show all 4 fields: Name, Title, Signature, and Date
      block.fields.forEach((field, fieldIndex) => {
        // Add small spacing before signature line
        if (field.label === 'Signature:' && fieldIndex > 0) {
          currentY += 3;
        }

        this._renderField(doc, field, columnX, currentY, columnWidth, layout);
        currentY += layout.lineSpacing;
      });

      maxY = Math.max(maxY, currentY);
    });

    return maxY;
  }

  /**
     * Render minimal layout with only required fields
     */
  _renderMinimalLayout(doc, bounds, blocks, layout) {
    const columnWidth = (bounds.width - this.config.layout.columnGap) / blocks.length;
    let maxY = bounds.y;

    blocks.forEach((block, index) => {
      const columnX = bounds.x + (index * (columnWidth + this.config.layout.columnGap));
      let currentY = bounds.y;

      // In minimal mode, show title and just signature line
      doc.font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(this.config.text.color)
        .text(block.title, columnX, currentY);

      currentY += 10;

      // Only signature field
      const signatureField = block.fields.find(f => f.label.includes('Signature'));
      if (signatureField) {
        doc.font('Helvetica')
          .fontSize(layout.fontSize)
          .fillColor(this.config.text.color)
          .text(signatureField.label, columnX, currentY);

        this._drawLine(doc, columnX + 45, currentY, Math.min(150, columnWidth - 50));
        currentY += 15;
      }

      maxY = Math.max(maxY, currentY);
    });

    return maxY;
  }

  /**
     * Emergency layout - absolute minimum
     */
  _renderEmergencyLayout(doc, bounds, blocks) {
    const columnWidth = (bounds.width - 20) / blocks.length;
    const currentY = bounds.y;

    // Just two signature lines side by side
    blocks.forEach((block, index) => {
      const columnX = bounds.x + (index * (columnWidth + 20));

      doc.font('Helvetica')
        .fontSize(7)
        .fillColor(this.config.text.color)
        .text(block.title + ':', columnX, currentY);

      this._drawLine(doc, columnX + 40, currentY, Math.min(150, columnWidth - 50));
    });

    return currentY + 10;
  }

  /**
     * Render individual field
     */
  _renderField(doc, field, x, y, width, layout) {
    doc.font('Helvetica')
      .fontSize(layout.fontSize)
      .fillColor(this.config.text.color)
      .text(field.label, x, y);

    if (field.type === 'line') {
      const lineX = x + this.config.layout.labelWidth;
      const lineWidth = Math.min(
        this.config.layout.lineLength,
        width - this.config.layout.labelWidth - 10
      );
      this._drawLine(doc, lineX, y + 2, lineWidth);
    }
  }

  /**
     * Draw signature line
     */
  _drawLine(doc, x, y, width) {
    doc.save()
      .strokeColor(this.config.text.lineColor)
      .lineWidth(0.5)
      .moveTo(x, y)
      .lineTo(x + width, y)
      .stroke()
      .restore();
  }
}

module.exports = PDFSignatureComponent;
