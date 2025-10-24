/**
 * PDFTableComponent - Preserves the beautiful existing Energen table design
 * Wrapped as a modular, reusable component
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFTableComponent extends PDFComponent {
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
     * Get default configuration - preserves existing beautiful design
     */
    _getDefaultConfig() {
        return {
            // Column specifications (preserved from original)
            columns: {
                serviceWidth: 160,
                quarterWidth: 91,  // (572 - 40*2 - 160) / 4
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
            
            // Colors (preserved from original beautiful design)
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
        
        // Title
        if (this.config.features.showTitle) {
            totalHeight += this.config.heights.titleSpace + 20;
        }
        
        // Header
        totalHeight += this.config.heights.header;
        
        // Service rows
        totalHeight += rowCount * this.config.heights.row;
        
        // Quarterly totals
        if (this.config.features.showQuarterlyTotals) {
            totalHeight += 5 + this.config.heights.row;
        }
        
        // Annual total
        if (this.config.features.showAnnualTotal) {
            totalHeight += 8 + this.config.heights.row;
        }

        // Dynamic bottom padding based on service count (reduce for larger tables)
        const bottomPadding = rowCount >= 6 ? 8 : 15;  // Reduce from 15px to 8px for 6+ services
        totalHeight += bottomPadding;

        return {
            minHeight: this.specs.minHeight,
            preferredHeight: totalHeight,
            maxHeight: Math.min(totalHeight, this.specs.maxHeight)
        };
    }

    /**
     * Render the beautiful table
     */
    render(doc, bounds, data) {
        const startY = bounds.y;
        let currentY = startY;
        
        // Table title
        if (this.config.features.showTitle) {
            currentY = this._renderTitle(doc, bounds.x, currentY, data.title);
        }
        
        // Get quarter labels
        const quarters = this._getQuarterLabels(data.metadata?.date || new Date());
        
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

        // Dynamic bottom padding based on service count (reduce for larger tables)
        const serviceCount = data.services?.length || 0;
        const bottomPadding = serviceCount >= 6 ? 8 : 15;  // Reduce from 15px to 8px for 6+ services
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
           .text(title || 'SERVICE SCHEDULE & PRICING', x, y);
        
        return y + this.config.heights.titleSpace + 5;  // Reduced from 20 to 5
    }

    /**
     * Draw table header (preserved exact design)
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
        
        // Quarter headers
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
     * Draw service row (preserved exact design)
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
        
        // Service description - ensure single line rendering
        const serviceText = service.description || service.name || '';
        doc.fillColor('black')
           .font('Helvetica')
           .fontSize(this.config.text.rowSize);
        
        // Store current Y position to reset after each text operation
        const originalY = doc.y;
        const originalX = doc.x;
        
        // Calculate text metrics for truncation
        const maxWidth = this.config.columns.serviceWidth - 10;
        const textWidth = doc.widthOfString(serviceText);
        
        // Truncate text with ellipsis if it's too long
        let displayText = serviceText;
        if (textWidth > maxWidth) {
            const ellipsis = '...';
            const ellipsisWidth = doc.widthOfString(ellipsis);
            let truncated = serviceText;
            
            // Binary search for the right truncation point
            while (doc.widthOfString(truncated + ellipsis) > maxWidth && truncated.length > 0) {
                truncated = truncated.substring(0, truncated.length - 1);
            }
            displayText = truncated + ellipsis;
        }
        
        // Create clipping rectangle to ensure no overflow
        doc.save();
        doc.rect(x, y, this.config.columns.serviceWidth, rowHeight).clip();
        
        // Render service description at fixed position with no wrapping
        doc.text(displayText, x + 5, y + 8, {
            width: maxWidth,
            height: this.config.text.rowSize,
            align: 'left',
            lineBreak: false,
            ellipsis: false  // Disable PDFKit's ellipsis since we handle it
        });
        
        // Restore to remove clipping
        doc.restore();
        
        // Reset position after text operation
        doc.y = originalY;
        doc.x = originalX;
        
        // Quarterly prices - render each at absolute position
        const prices = service.quarters || [service.q1Price, service.q2Price, service.q3Price, service.q4Price];
        prices.forEach((price, i) => {
            const qX = x + this.config.columns.serviceWidth + (i * this.config.columns.quarterWidth);
            const priceValue = typeof price === 'number' ? price : 0;
            const priceText = priceValue > 0 ? `$${priceValue.toFixed(2)}` : '-';
            
            // Position absolutely for each price cell
            doc.text(priceText, qX + 5, y + 8, {
                width: this.config.columns.quarterWidth - 10,
                align: 'right',
                lineBreak: false
            });
            
            // Reset Y position after each price
            doc.y = originalY;
        });
        
        return y + rowHeight;
    }

    /**
     * Draw totals row (preserved exact design)
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
        
        // Quarterly totals - support both formats
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
     * Draw annual total row (preserved exact beautiful design)
     */
    _drawAnnualTotal(doc, x, y, width, annualTotal) {
        const rowHeight = this.config.heights.row;
        const tableWidth = width;
        
        // Background - that beautiful dark blue
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

    /**
     * Get quarter labels based on date
     */
    _getQuarterLabels(date) {
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
}

module.exports = PDFTableComponent;