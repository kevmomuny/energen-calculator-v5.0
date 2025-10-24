/**
 * PDFFooterComponent - EXACT Energen footer component
 * IMMUTABLE positioning with icons and decorative graphics
 * This is the APPROVED design - DO NOT CHANGE
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFFooterComponent extends PDFComponent {
    constructor() {
        super();
        
        // IMMUTABLE SPECIFICATIONS - NEVER CHANGE THESE
        this.specs = {
            // Page dimensions - US Letter ONLY
            pageHeight: 792,
            pageWidth: 612,
            
            // ABSOLUTE POSITIONS - Fixed from bottom of page
            graphicHeight: 24.5,                     // Height of decorative graphics
            graphicStartY: 792 - 24.5,               // ALWAYS at Y:767.5
            contentBottomY: 792 - 24.5 - 20,         // Contact info starts at Y:747.5
            
            // Contact info layout
            iconSize: 10,
            fontSize: 9,
            lineHeight: 11,
            leftMargin: 40,
            
            // Decorative graphic bar - EXACT PROPORTIONS
            gapWidth: 11.0,          // pageWidth × 0.018
            angleOffset: 14.7,       // graphicHeight × 0.6
            breakPointX: 459.0,      // pageWidth × 0.75
            
            // Colors
            colors: {
                energenBlue: '#008AFC',
                footerBlue: '#007BFF',
                black: '#000000',
                linkBlue: '#007BFF'
            }
        };

        // Icon SVG paths - EXACT from approved design
        this.icons = {
            phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
            email: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
            web: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 9h10.5v3.5H4V9zm0 5.5h10.5V18H4v-3.5zM20 18h-3.5V9H20v9z',
            location: 'M12 0c.826 0 1.5.674 1.5 1.5v1.627c3.802.632 6.741 3.571 7.373 7.373H22.5c.826 0 1.5.674 1.5 1.5s-.674 1.5-1.5 1.5h-1.627c-.632 3.802-3.571 6.741-7.373 7.373V22.5c0 .826-.674 1.5-1.5 1.5s-1.5-.674-1.5-1.5v-1.627c-3.802-.632-6.741-3.571-7.373-7.373H1.5c-.826 0-1.5-.674-1.5-1.5s.674-1.5 1.5-1.5h1.627C3.759 6.698 6.698 3.759 10.5 3.127V1.5c0-.826.674-1.5 1.5-1.5zM6 12c0 3.313 2.687 6 6 6s6-2.687 6-6-2.687-6-6-6-6 2.687-6 6zm6-3.75c2.071 0 3.75 1.679 3.75 3.75S14.071 15.75 12 15.75 8.25 14.071 8.25 12 9.929 8.25 12 8.25z'
        };

        // Energen contact information - EXACT
        this.contactInfo = {
            phone: '(925) 289-8969',
            email: 'service@energensystems.com',
            website: 'www.energensystems.com',
            address: '150 Mason Circle, Suite K, Concord, CA 94520'
        };
    }

    _defineSpecs() {
        return {
            minHeight: 45,
            maxHeight: 45,
            canScale: false,
            canBreakPage: false,
            priority: 10  // Footers render last
        };
    }

    calculateSpace(doc, data) {
        return {
            minHeight: 45,
            preferredHeight: 45,
            maxHeight: 45
        };
    }

    /**
     * IMMUTABLE RENDER METHOD - Always renders at exact same position
     * Footer will ALWAYS render at the same position regardless of content
     */
    render(doc, bounds, data) {
        // Save current document state
        doc.save();
        
        // CRITICAL FIX: Save and remove margins to prevent automatic page breaks
        const originalMargins = {
            top: doc.page.margins.top,
            bottom: doc.page.margins.bottom,
            left: doc.page.margins.left,
            right: doc.page.margins.right
        };
        
        // Set margins to 0 to allow footer rendering at bottom
        doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
        
        // Get page numbers from data or defaults
        const pageNumber = data.currentPage || 1;
        const totalPages = data.totalPages || 1;
        
        // Render decorative graphics FIRST - locked to bottom
        this._renderDecorativeGraphics(doc);
        
        // Render contact information at fixed position
        this._renderContactInfo(doc, pageNumber, totalPages, data);
        
        // Restore original margins
        doc.page.margins = originalMargins;

        // Restore state
        doc.restore();
        
        return {
            endY: this.specs.contentBottomY,
            actualHeight: 45,
            overflow: false
        };
    }

    /**
     * Render contact information with ABSOLUTE positioning
     */
    _renderContactInfo(doc, pageNumber, totalPages, data = {}) {
        // ABSOLUTE POSITIONS - always same location
        const leftX = this.specs.leftMargin;
        const startY = this.specs.contentBottomY;  // Fixed at Y:747.5
        
        // Calculate positions for each line
        const line1Y = startY - (this.specs.lineHeight * 3); // Phone
        const line2Y = startY - (this.specs.lineHeight * 2); // Email
        const line3Y = startY - this.specs.lineHeight;       // Website
        const line4Y = startY;                               // Address at bottom

        // Phone (top line)
        this._drawIcon(doc, this.icons.phone, leftX, line1Y);
        doc.font('Helvetica')
           .fontSize(this.specs.fontSize)
           .fillColor('black')
           .text(this.contactInfo.phone, leftX + this.specs.iconSize + 5, line1Y + 1, {
               lineBreak: false
           });

        // Email (second line)
        this._drawIcon(doc, this.icons.email, leftX, line2Y);
        doc.fillColor(this.specs.colors.linkBlue)
           .text(this.contactInfo.email, leftX + this.specs.iconSize + 5, line2Y + 1, {
               lineBreak: false
           });

        // Website (third line)
        this._drawIcon(doc, this.icons.web, leftX, line3Y);
        doc.text(this.contactInfo.website, leftX + this.specs.iconSize + 5, line3Y + 1, {
               lineBreak: false
           });

        // Address (bottom line)
        this._drawIcon(doc, this.icons.location, leftX, line4Y);
        doc.fillColor('black')
           .text(this.contactInfo.address, leftX + this.specs.iconSize + 5, line4Y + 1, {
               lineBreak: false,
               width: 300  // Limit width to prevent wrapping
           });
        
        // Optional page number - on same line, right-aligned
        if (data.showPageNumbers !== false) {  // Default to showing page numbers
            const pageText = totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : 'Page 1 of 1';
            doc.text(pageText, 450, line4Y + 1, {
                width: 122,
                align: 'right',
                lineBreak: false
            });
        }
    }

    /**
     * Render decorative graphics - IMMUTABLE POSITION at page bottom
     * These graphics are ALWAYS at the exact bottom of page
     */
    _renderDecorativeGraphics(doc) {
        // ABSOLUTE POSITIONS - locked to page bottom
        const startY = this.specs.graphicStartY;  // ALWAYS Y:767.5
        const endY = this.specs.pageHeight;       // ALWAYS Y:792
        const { breakPointX, angleOffset, gapWidth } = this.specs;

        // Blue polygon (left side) - LOCKED TO BOTTOM
        doc.polygon(
            [0, startY],
            [breakPointX, startY],
            [breakPointX - angleOffset, endY],
            [0, endY]
        ).fillColor(this.specs.colors.footerBlue)
          .fill();

        // Black polygon (right side) - LOCKED TO BOTTOM
        doc.polygon(
            [breakPointX + gapWidth, startY],
            [this.specs.pageWidth, startY],
            [this.specs.pageWidth, endY],
            [breakPointX - angleOffset + gapWidth, endY]
        ).fillColor(this.specs.colors.black)
          .fill();
    }

    /**
     * Draw an icon from SVG path
     */
    _drawIcon(doc, svgPath, x, y) {
        doc.save();
        doc.translate(x, y);
        doc.scale(this.specs.iconSize / 24, this.specs.iconSize / 24);
        doc.path(svgPath)
           .fillColor(this.specs.colors.energenBlue)
           .fill();
        doc.restore();
    }

    /**
     * Get maximum Y position for page content - IMMUTABLE BOUNDARY
     * Content MUST NOT go below this line
     */
    static getContentMaxY() {
        return 747; // Fixed boundary - nothing can go below this
    }
}

module.exports = PDFFooterComponent;