/**
 * PDFCustomerInfoComponent - Customer and equipment information display
 * Modular component for showing customer details and generator info
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFCustomerInfoComponent extends PDFComponent {
    /**
     * Define immutable specifications
     */
    _defineSpecs() {
        return {
            minHeight: 60,
            maxHeight: 150,
            canScale: true,
            canBreakPage: false,
            priority: 80  // Renders after header but before table
        };
    }

    /**
     * Get default configuration
     */
    _getDefaultConfig() {
        return {
            // Layout
            layout: {
                columns: 2,
                columnGap: 20,
                sectionSpacing: 8,  // Reduced from 15
                labelWidth: 80
            },
            
            // Text styling
            text: {
                titleSize: 11,
                labelSize: 10,
                valueSize: 10,
                titleColor: '#000000',
                labelColor: '#666666',
                valueColor: '#000000'
            },
            
            // Sections to display
            sections: {
                customer: true,
                contact: true,
                equipment: true,
                location: true
            },
            
            // Field visibility
            fields: {
                showPhone: true,
                showEmail: true,
                showWebsite: false,
                showIndustry: false,
                showEmployeeCount: false,
                showSerial: true,
                showModel: true,
                showFuel: true,
                showLocation: true
            }
        };
    }

    /**
     * Calculate space requirements
     */
    calculateSpace(doc, data) {
        let sections = 0;
        if (this.config.sections.customer) sections++;
        if (this.config.sections.contact) sections++;
        if (this.config.sections.equipment) sections++;
        if (this.config.sections.location) sections++;
        
        const baseHeight = sections * 30;
        const padding = 20;
        
        return {
            minHeight: this.specs.minHeight,
            preferredHeight: baseHeight + padding,
            maxHeight: this.specs.maxHeight
        };
    }

    /**
     * Render customer information
     */
    render(doc, bounds, data) {
        const startY = bounds.y;
        let leftColumnY = startY;
        let rightColumnY = startY;
        
        const columnWidth = (bounds.width - this.config.layout.columnGap) / 2;
        const col1X = bounds.x;
        const col2X = bounds.x + columnWidth + this.config.layout.columnGap;
        
        // Customer section (left column)
        if (this.config.sections.customer) {
            leftColumnY = this._renderCustomerSection(doc, col1X, leftColumnY, columnWidth, data.customer);
        }
        
        // Contact section (right column)
        if (this.config.sections.contact) {
            rightColumnY = this._renderContactSection(doc, col2X, rightColumnY, columnWidth, data.customer, data.metadata);
        }
        
        // Use the maximum height from both columns
        let currentY = Math.max(leftColumnY, rightColumnY);
        
        // Equipment section (spans both columns)
        if (this.config.sections.equipment) {
            currentY += this.config.layout.sectionSpacing;
            currentY = this._renderEquipmentSection(doc, bounds.x, currentY, bounds.width, data.generator);
        }

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
     * Render customer section
     */
    _renderCustomerSection(doc, x, y, width, customer) {
        let currentY = y;
        
        // Title
        doc.font('Helvetica-Bold')
           .fontSize(this.config.text.titleSize)
           .fillColor(this.config.text.titleColor)
           .text('CUSTOMER INFORMATION', x, currentY);
        
        currentY += this.config.text.titleSize + 5;  // Reduced from 8
        
        // Company name
        if (customer?.companyName) {
            doc.font('Helvetica-Bold')
               .fontSize(this.config.text.valueSize)
               .fillColor(this.config.text.valueColor)
               .text(customer.companyName, x, currentY);
            currentY += this.config.text.valueSize + 2;  // Reduced from 5
        }
        
        // Address
        if (customer?.streetAddress) {
            doc.font('Helvetica')
               .fontSize(this.config.text.valueSize)
               .text(customer.streetAddress, x, currentY);
            currentY += this.config.text.valueSize + 2;  // Reduced from 3
        }
        
        // City, State, Zip
        if (customer?.city || customer?.state || customer?.zip) {
            const cityStateZip = [
                customer.city,
                customer.state,
                customer.zip
            ].filter(Boolean).join(', ');
            
            doc.text(cityStateZip, x, currentY);
            currentY += this.config.text.valueSize + 2;  // Reduced from 3
        }
        
        // Industry (if enabled)
        if (this.config.fields.showIndustry && customer?.industry) {
            currentY += 5;
            this._renderField(doc, 'Industry:', customer.industry, x, currentY);
            currentY += this.config.text.valueSize + 3;
        }
        
        // Employee count (if enabled)
        if (this.config.fields.showEmployeeCount && customer?.employeeCount) {
            this._renderField(doc, 'Size:', customer.employeeCount + ' employees', x, currentY);
            currentY += this.config.text.valueSize + 3;
        }
        
        return currentY;
    }

    /**
     * Render contact section
     */
    _renderContactSection(doc, x, y, width, customer, metadata) {
        let currentY = y;

        // Title
        doc.font('Helvetica-Bold')
           .fontSize(this.config.text.titleSize)
           .fillColor(this.config.text.titleColor)
           .text('CONTACT DETAILS', x, currentY);

        currentY += this.config.text.titleSize + 5;

        // Check if acquisition analyst contact provided (for government contracts)
        if (metadata?.contact) {
            const contact = metadata.contact;

            // Line 1: Name-Title (combined with hyphen) - MUST BE 1 LINE
            if (contact.name && contact.title) {
                doc.font('Helvetica-Bold')
                   .fontSize(this.config.text.valueSize)
                   .fillColor(this.config.text.valueColor)
                   .text(`${contact.name}-${contact.title}`, x, currentY);
                currentY += this.config.text.valueSize + 2;
            } else if (contact.name) {
                doc.font('Helvetica-Bold')
                   .fontSize(this.config.text.valueSize)
                   .fillColor(this.config.text.valueColor)
                   .text(contact.name, x, currentY);
                currentY += this.config.text.valueSize + 2;
            }

            // Line 2: Department (abbreviated) - MUST BE 1 LINE
            if (contact.department) {
                doc.font('Helvetica')
                   .fontSize(this.config.text.valueSize - 1)
                   .fillColor(this.config.text.labelColor)
                   .text(contact.department, x, currentY);
                currentY += this.config.text.valueSize + 3;
            }

            // Phone (no label)
            if (contact.phone) {
                doc.font('Helvetica')
                   .fontSize(this.config.text.valueSize)
                   .fillColor(this.config.text.valueColor)
                   .text(contact.phone, x, currentY);
                currentY += this.config.text.valueSize + 2;
            }

            // Email (no label)
            if (contact.email) {
                doc.fillColor('#007BFF')
                   .text(contact.email, x, currentY);
                currentY += this.config.text.valueSize + 2;
            }
        } else {
            // Fallback to customer contact info
            if (customer?.contactName) {
                this._renderField(doc, 'Contact:', customer.contactName, x, currentY);
                currentY += this.config.text.valueSize + 3;
            }

            if (this.config.fields.showPhone && customer?.phone) {
                this._renderField(doc, 'Phone:', customer.phone, x, currentY);
                currentY += this.config.text.valueSize + 3;
            }

            if (this.config.fields.showEmail && customer?.email) {
                this._renderField(doc, 'Email:', customer.email, x, currentY);
                currentY += this.config.text.valueSize + 3;
            }
        }

        // Website
        if (this.config.fields.showWebsite && customer?.website) {
            this._renderField(doc, 'Website:', customer.website, x, currentY);
            currentY += this.config.text.valueSize + 3;  // Match other contact field spacing
        }
        
        return currentY;
    }

    /**
     * Render equipment section
     */
    _renderEquipmentSection(doc, x, y, width, generator) {
        let currentY = y;
        
        // Title
        doc.font('Helvetica-Bold')
           .fontSize(this.config.text.titleSize)
           .fillColor(this.config.text.titleColor)
           .text('EQUIPMENT DETAILS', x, currentY);
        
        currentY += this.config.text.titleSize + 5;  // Reduced from 8
        
        const columnWidth = (width - this.config.layout.columnGap) / 2;
        const col1X = x;
        const col2X = x + columnWidth + this.config.layout.columnGap;
        
        // Left column - Generator info
        let leftY = currentY;
        
        // Generator size and type
        if (generator?.size || generator?.type) {
            const genInfo = `${generator.size || ''} ${generator.type || 'Generator'}`.trim();
            this._renderField(doc, 'Generator:', genInfo, col1X, leftY);
            leftY += this.config.text.valueSize + 3;  // Reduced from 5
        }
        
        // Model
        if (this.config.fields.showModel && generator?.model) {
            this._renderField(doc, 'Model:', generator.model, col1X, leftY);
            leftY += this.config.text.valueSize + 3;  // Reduced from 5
        }
        
        // Fuel type
        if (this.config.fields.showFuel && generator?.fuel) {
            this._renderField(doc, 'Fuel Type:', generator.fuel, col1X, leftY);
            leftY += this.config.text.valueSize + 3;  // Reduced from 5
        }
        
        // Right column - Additional info
        let rightY = currentY;
        
        // Serial number
        if (this.config.fields.showSerial && generator?.serial) {
            this._renderField(doc, 'Serial:', generator.serial, col2X, rightY);
            rightY += this.config.text.valueSize + 3;  // Match contact field spacing
        }
        
        // Location
        if (this.config.fields.showLocation && generator?.location) {
            this._renderField(doc, 'Location:', generator.location, col2X, rightY);
            rightY += this.config.text.valueSize + 3;  // Match contact field spacing
        }
        
        // Warranty status
        if (generator?.warrantyStatus) {
            this._renderField(doc, 'Warranty:', generator.warrantyStatus, col2X, rightY);
            rightY += this.config.text.valueSize + 3;  // Match other equipment field spacing
        }
        
        return Math.max(leftY, rightY);
    }

    /**
     * Render a field with label and value
     */
    _renderField(doc, label, value, x, y) {
        // Label
        doc.font('Helvetica')
           .fontSize(this.config.text.labelSize)
           .fillColor(this.config.text.labelColor);

        const labelWidth = doc.widthOfString(label);
        doc.text(label, x, y);

        // Value - positioned after label with fixed spacing
        const valueX = x + 50; // Fixed label column width
        doc.font('Helvetica')
           .fontSize(this.config.text.valueSize)
           .fillColor(this.config.text.valueColor)
           .text(value || 'N/A', valueX, y);
    }
}

module.exports = PDFCustomerInfoComponent;