/**
 * PDFTableComponent - Sprint 6 Enhanced
 * Uses pre-calculated service schedule from Sprint 3
 * Removes internal quarter calculation logic
 * Renders quarter labels and service costs from serviceSchedule data
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFTableComponentSprint6 extends PDFComponent {
  /**
     * Define immutable specifications
     */
  _defineSpecs() {
    return {
      minHeight: 100,
      maxHeight: 400,
      canScale: true,
      canBreakPage: true,
      priority: 50
    };
  }

  /**
     * Get default configuration
     */
  _getDefaultConfig() {
    return {
      columns: {
        serviceWidth: 160,
        quarterWidth: 91
      },

      heights: {
        header: 20,
        row: 22,
        titleSpace: 20
      },

      borders: {
        header: 1.25,
        service: 0.5,
        totals: 1.25
      },

      colors: {
        headerBg: '#EFEFEF',
        alternateBg: '#F9F9F9',
        totalsBg: '#EFEFEF',
        annualBg: '#2C3E50',
        border: '#000000',
        text: '#000000',
        annualText: '#FFFFFF'
      },

      text: {
        titleSize: 11,
        headerSize: 10,
        rowSize: 10,
        annualSize: 11
      },

      features: {
        showTitle: true,
        showQuarterlyTotals: true,
        showAnnualTotal: true,
        alternateRowColors: true
      }
    };
  }

  /**
     * Calculate space requirements
     */
  calculateSpace(doc, data) {
    const services = data.services || [];
    const rowCount = services.length;

    let totalHeight = 0;

    if (this.config.features.showTitle) {
      totalHeight += this.config.heights.titleSpace + 20;
    }

    totalHeight += this.config.heights.header;
    totalHeight += rowCount * this.config.heights.row;

    if (this.config.features.showQuarterlyTotals) {
      totalHeight += 5 + this.config.heights.row;
    }

    if (this.config.features.showAnnualTotal) {
      totalHeight += 8 + this.config.heights.row;
    }

    totalHeight += 15;

    return {
      minHeight: this.specs.minHeight,
      preferredHeight: totalHeight,
      maxHeight: Math.min(totalHeight, this.specs.maxHeight)
    };
  }

  /**
     * Render the table
     * Sprint 6: Uses pre-calculated quarter labels from data
     */
  render(doc, bounds, data) {
    const startY = bounds.y;
    let currentY = startY;

    // Table title
    if (this.config.features.showTitle) {
      currentY = this._renderTitle(doc, bounds.x, currentY, data.title);
    }

    // Get quarter labels - SPRINT 6: From pre-calculated schedule
    const quarters = this._getQuarterLabelsFromData(data);

    // Draw header
    currentY = this._drawTableHeader(doc, bounds.x, currentY, bounds.width, quarters);

    // Draw service rows
    data.services.forEach((service, index) => {
      const isAlternate = index % 2 === 1;
      currentY = this._drawServiceRow(doc, bounds.x, currentY, bounds.width, service, isAlternate);
    });

    // Draw quarterly totals
    if (this.config.features.showQuarterlyTotals && data.totals) {
      currentY += 5;
      currentY = this._drawTotalsRow(doc, bounds.x, currentY, bounds.width,
        data.totals, 'QUARTERLY TOTALS');
    }

    // Draw annual total
    if (this.config.features.showAnnualTotal && data.totals?.annual) {
      currentY += 8;
      currentY = this._drawAnnualTotal(doc, bounds.x, currentY, bounds.width,
        data.totals.annual);
    }

    currentY += 15;

    this.lastRenderBounds = {
      x: bounds.x,
      y: startY,
      width: bounds.width,
      height: currentY - startY
    };

    return {
      endY: currentY,
      actualHeight: currentY - startY,
      overflow: false
    };
  }

  /**
     * Render table title
     */
  _renderTitle(doc, x, y, title) {
    doc.font('Helvetica-Bold')
      .fontSize(this.config.text.titleSize)
      .fillColor('black')
      .text(title || 'SERVICE SCHEDULE & PRICING', x, y);

    return y + this.config.heights.titleSpace + 5;
  }

  /**
     * SPRINT 6: Get quarter labels from pre-calculated data
     * Removes internal quarter calculation logic (was at line 387)
     *
     * Priority order:
     * 1. data.quarterLabels (pre-calculated from Sprint 3)
     * 2. Fallback to date-based calculation (for backwards compatibility)
     */
  _getQuarterLabelsFromData(data) {
    // PRIORITY 1: Use pre-calculated quarter labels from Sprint 3
    if (data.quarterLabels && Array.isArray(data.quarterLabels) && data.quarterLabels.length === 4) {
      return data.quarterLabels;
    }

    // FALLBACK: Generate labels from date (backwards compatibility)
    console.warn('[PDFTable] No pre-calculated quarter labels found, generating from date');
    return this._generateQuarterLabelsFromDate(data.metadata?.date || new Date());
  }

  /**
     * Fallback: Generate quarter labels from date
     * (Only used if Sprint 3 schedule not provided)
     */
  _generateQuarterLabelsFromDate(date) {
    const monthAbbrev = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    const startDate = new Date(date);
    const labels = [];

    for (let q = 0; q < 4; q++) {
      const qDate = new Date(startDate);
      qDate.setMonth(startDate.getMonth() + (q * 3));
      const startMonth = qDate.getMonth();
      const endMonth = (startMonth + 2) % 12;
      labels.push(`${monthAbbrev[startMonth]}-${monthAbbrev[endMonth]}`);
    }

    return labels;
  }

  /**
     * Draw table header
     * Sprint 6: Uses pre-calculated quarter labels
     */
  _drawTableHeader(doc, x, y, width, quarters) {
    const headerHeight = this.config.heights.header;
    const tableWidth = width;

    // Background
    doc.rect(x, y, tableWidth, headerHeight)
      .fillColor(this.config.colors.headerBg)
      .fill();

    // Borders
    doc.lineWidth(this.config.borders.header)
      .strokeColor(this.config.colors.border)
      .rect(x, y, tableWidth, headerHeight)
      .stroke();

    // Headers text
    doc.fillColor('black')
      .font('Helvetica-Bold')
      .fontSize(this.config.text.headerSize);

    // Service description header
    doc.text('SERVICE DESCRIPTION', x + 5, y + 6, {
      width: this.config.columns.serviceWidth - 10,
      align: 'left'
    });

    // Quarter headers - pre-calculated labels from Sprint 3
    quarters.forEach((quarter, i) => {
      const qX = x + this.config.columns.serviceWidth + (i * this.config.columns.quarterWidth);
      doc.text(quarter, qX + 5, y + 6, {
        width: this.config.columns.quarterWidth - 10,
        align: 'center'
      });
    });

    return y + headerHeight;
  }

  /**
     * Draw service row
     */
  _drawServiceRow(doc, x, y, width, service, isAlternate) {
    const rowHeight = this.config.heights.row;
    const tableWidth = width;

    // Background for alternate rows
    if (isAlternate && this.config.features.alternateRowColors) {
      doc.rect(x, y, tableWidth, rowHeight)
        .fillColor(this.config.colors.alternateBg)
        .fill();
    }

    // Borders
    doc.lineWidth(this.config.borders.service)
      .strokeColor(this.config.colors.border)
      .rect(x, y, tableWidth, rowHeight)
      .stroke();

    // Service description
    const serviceText = service.description || service.name || '';
    doc.fillColor('black')
      .font('Helvetica')
      .fontSize(this.config.text.rowSize);

    const originalY = doc.y;
    const originalX = doc.x;

    // Truncate text if needed
    const maxWidth = this.config.columns.serviceWidth - 10;
    const textWidth = doc.widthOfString(serviceText);

    let displayText = serviceText;
    if (textWidth > maxWidth) {
      const ellipsis = '...';
      let truncated = serviceText;

      while (doc.widthOfString(truncated + ellipsis) > maxWidth && truncated.length > 0) {
        truncated = truncated.substring(0, truncated.length - 1);
      }
      displayText = truncated + ellipsis;
    }

    // Clip service description to prevent overflow
    doc.save();
    doc.rect(x, y, this.config.columns.serviceWidth, rowHeight).clip();

    doc.text(displayText, x + 5, y + 8, {
      width: maxWidth,
      height: this.config.text.rowSize,
      align: 'left',
      lineBreak: false,
      ellipsis: false
    });

    doc.restore();
    doc.y = originalY;
    doc.x = originalX;

    // Quarterly prices - from pre-calculated schedule
    const prices = service.quarters || [service.q1Price, service.q2Price, service.q3Price, service.q4Price];
    prices.forEach((price, i) => {
      const qX = x + this.config.columns.serviceWidth + (i * this.config.columns.quarterWidth);
      const priceValue = typeof price === 'number' ? price : 0;
      const priceText = priceValue > 0 ? `$${priceValue.toFixed(2)}` : '-';

      doc.text(priceText, qX + 5, y + 8, {
        width: this.config.columns.quarterWidth - 10,
        align: 'right',
        lineBreak: false
      });

      doc.y = originalY;
    });

    return y + rowHeight;
  }

  /**
     * Draw totals row
     */
  _drawTotalsRow(doc, x, y, width, totals, label) {
    const rowHeight = this.config.heights.row;
    const tableWidth = width;

    // Background
    doc.rect(x, y, tableWidth, rowHeight)
      .fillColor(this.config.colors.totalsBg)
      .fill();

    // Borders
    doc.lineWidth(this.config.borders.totals)
      .strokeColor(this.config.colors.border)
      .rect(x, y, tableWidth, rowHeight)
      .stroke();

    // Label
    doc.fillColor('black')
      .font('Helvetica-Bold')
      .fontSize(this.config.text.rowSize)
      .text(label, x + 5, y + 8, {
        width: this.config.columns.serviceWidth - 10,
        align: 'left'
      });

    // Quarterly totals
    const quarterTotals = totals.quarterly || [totals.q1, totals.q2, totals.q3, totals.q4];
    quarterTotals.forEach((total, i) => {
      const qX = x + this.config.columns.serviceWidth + (i * this.config.columns.quarterWidth);
      const totalValue = typeof total === 'number' ? total : 0;
      doc.text(`$${totalValue.toFixed(2)}`, qX + 5, y + 8, {
        width: this.config.columns.quarterWidth - 10,
        align: 'right'
      });
    });

    return y + rowHeight;
  }

  /**
     * Draw annual total row
     */
  _drawAnnualTotal(doc, x, y, width, annualTotal) {
    const rowHeight = this.config.heights.row;
    const tableWidth = width;

    // Background
    doc.rect(x, y, tableWidth, rowHeight)
      .fillColor(this.config.colors.annualBg)
      .fill();

    // Text
    doc.fillColor(this.config.colors.annualText)
      .font('Helvetica-Bold')
      .fontSize(this.config.text.annualSize)
      .text('ANNUAL SERVICE AGREEMENT TOTAL', x + 5, y + 6, {
        width: this.config.columns.serviceWidth + 100,
        align: 'left'
      });

    // Annual total amount
    doc.text(`$${annualTotal.toFixed(2)}`, x + tableWidth - 100, y + 6, {
      width: 95,
      align: 'right'
    });

    return y + rowHeight;
  }
}

module.exports = PDFTableComponentSprint6;
