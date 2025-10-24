/**
 * PDFCustomTableComponent - Custom services table with Details column
 * Replaces quarterly breakdown columns with single custom info line
 * Perfect for construction bids, custom projects, and non-recurring services
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFCustomTableComponent extends PDFComponent {
    /**
     * Define immutable specifications
     */
    _defineSpecs() {
        return {
            minHeight: 100,  // Minimum for header + 1 row + totals
            maxHeight: 400,   // Maximum reasonable table height
            canScale: true,
            canBreakPage: true,
            priority: 50  // Tables render in main content area
        };
    }

    /**
     * Get default configuration
     */
    _getDefaultConfig() {
        return {
            // Column specifications (2 columns instead of 5)
            columns: {
                descriptionWidth: 300,  // Description column (wider)
                detailsWidth: 180,      // Details/Info column
                costWidth: 52,          // Cost column (same as quarterly width)
            },

            // Row heights (preserved from original)
            heights: {
                header: 20,
                row: 22,
                titleSpace: 20
            },

            // Border widths (preserved from original)
            borders: {
                header: 1.25,
                service: 0.5,
                totals: 1.25
            },

            // Colors (preserved from Energen design)
            colors: {
                headerBg: '#EFEFEF',
                alternateBg: '#F9F9F9',
                totalsBg: '#EFEFEF',
                annualBg: '#2C3E50',
                border: '#000000',
                text: '#000000',
                annualText: '#FFFFFF'
            },

            // Text configuration
            text: {
                titleSize: 11,
                headerSize: 10,
                rowSize: 10,
                annualSize: 11
            },

            // Features
            features: {
                showTitle: true,
                showTotal: true,
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

        // Title
        if (this.config.features.showTitle) {
            totalHeight += this.config.heights.titleSpace + 20;
        }

        // Header
        totalHeight += this.config.heights.header;

        // Service rows
        totalHeight += rowCount * this.config.heights.row;

        // Total row
        if (this.config.features.showTotal) {
            totalHeight += 5 + this.config.heights.row;
        }

        // Bottom padding
        const bottomPadding = rowCount >= 6 ? 8 : 15;
        totalHeight += bottomPadding;

        return {
            minHeight: this.specs.minHeight,
            preferredHeight: totalHeight,
            maxHeight: Math.min(totalHeight, this.specs.maxHeight)
        };
    }

    /**
     * Render the custom table
     */
    render(doc, bounds, data) {
        const startY = bounds.y;
        let currentY = startY;

        // Table title
        if (this.config.features.showTitle) {
            currentY = this._renderTitle(doc, bounds.x, currentY, data.title);
        }

        // Draw header
        currentY = this._drawTableHeader(doc, bounds.x, currentY, bounds.width);

        // Draw service rows
        data.services.forEach((service, index) => {
            const isAlternate = index % 2 === 1;
            currentY = this._drawServiceRow(doc, bounds.x, currentY, bounds.width, service, isAlternate);
        });

        // Draw total row
        if (this.config.features.showTotal && data.totals) {
            currentY += 5;
            currentY = this._drawTotalRow(doc, bounds.x, currentY, bounds.width, data.totals);
        }

        // Bottom padding
        const serviceCount = data.services?.length || 0;
        const bottomPadding = serviceCount >= 6 ? 8 : 15;
        currentY += bottomPadding;

        // Store render bounds
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
           .text(title || 'CUSTOM SERVICES & PRICING', x, y);

        return y + this.config.heights.titleSpace + 5;
    }

    /**
     * Draw table header
     */
    _drawTableHeader(doc, x, y, width) {
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

        // Description header
        doc.text('DESCRIPTION', x + 5, y + 6, {
            width: this.config.columns.descriptionWidth - 10,
            align: 'left'
        });

        // Details header
        const detailsX = x + this.config.columns.descriptionWidth;
        doc.text('DETAILS / INFO', detailsX + 5, y + 6, {
            width: this.config.columns.detailsWidth - 10,
            align: 'left'
        });

        // Cost header
        const costX = x + this.config.columns.descriptionWidth + this.config.columns.detailsWidth;
        doc.text('COST', costX + 5, y + 6, {
            width: this.config.columns.costWidth - 10,
            align: 'right'
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
        const descText = service.description || service.name || '';
        doc.fillColor('black')
           .font('Helvetica')
           .fontSize(this.config.text.rowSize);

        doc.save();
        doc.rect(x, y, this.config.columns.descriptionWidth, rowHeight).clip();
        doc.text(descText, x + 5, y + 8, {
            width: this.config.columns.descriptionWidth - 10,
            height: this.config.text.rowSize,
            align: 'left',
            lineBreak: false
        });
        doc.restore();

        // Details/Info column
        const detailsX = x + this.config.columns.descriptionWidth;
        const detailsText = service.details || service.category || '';

        doc.save();
        doc.rect(detailsX, y, this.config.columns.detailsWidth, rowHeight).clip();
        doc.text(detailsText, detailsX + 5, y + 8, {
            width: this.config.columns.detailsWidth - 10,
            height: this.config.text.rowSize,
            align: 'left',
            lineBreak: false
        });
        doc.restore();

        // Cost column (right-aligned)
        const costX = x + this.config.columns.descriptionWidth + this.config.columns.detailsWidth;
        const costText = service.annual ? `$${service.annual.toFixed(2)}` : '$0.00';

        doc.text(costText, costX + 5, y + 8, {
            width: this.config.columns.costWidth - 10,
            align: 'right',
            lineBreak: false
        });

        return y + rowHeight;
    }

    /**
     * Draw total row
     */
    _drawTotalRow(doc, x, y, width, totals) {
        const rowHeight = this.config.heights.row;
        const tableWidth = width;

        // Background - dark blue for total
        doc.rect(x, y, tableWidth, rowHeight)
           .fillColor(this.config.colors.annualBg)
           .fill();

        // Borders
        doc.lineWidth(this.config.borders.totals)
           .strokeColor(this.config.colors.border)
           .rect(x, y, tableWidth, rowHeight)
           .stroke();

        // Total label (white text on dark background)
        doc.fillColor(this.config.colors.annualText)
           .font('Helvetica-Bold')
           .fontSize(this.config.text.annualSize);

        doc.text('TOTAL', x + 5, y + 7, {
            width: this.config.columns.descriptionWidth - 10,
            align: 'left'
        });

        // Total amount (right-aligned, white text)
        const costX = x + this.config.columns.descriptionWidth + this.config.columns.detailsWidth;
        const totalText = totals.annual ? `$${totals.annual.toFixed(2)}` : '$0.00';

        doc.text(totalText, costX + 5, y + 7, {
            width: this.config.columns.costWidth - 10,
            align: 'right',
            lineBreak: false
        });

        return y + rowHeight;
    }
}

module.exports = PDFCustomTableComponent;
