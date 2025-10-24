/**
 * PDFDocumentBuilder - Builder Pattern Implementation ES6
 * Constructs PDF documents by composing modular components
 * Handles both single and multi-page documents
 * 
 * DESIGN PRINCIPLES:
 * 1. Builder pattern for step-by-step document construction
 * 2. Strategy pattern for layout algorithms
 * 3. Chain of responsibility for component rendering
 * 4. Template method for document structure
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import { EventEmitter } from 'events';

export class PDFDocumentBuilder extends EventEmitter {
    constructor() {
        super();
        this.reset();
    }

    /**
     * Reset builder to initial state
     */
    reset() {
        this.doc = null;
        this.components = [];
        this.metadata = {};
        this.layoutStrategy = 'single-page';
        this.pageSpecs = {
            size: 'letter',
            margin: 40,
            width: 612,
            height: 792
        };
        this.currentPage = 1;
        this.renderLog = [];
        return this;
    }

    /**
     * Set document metadata
     */
    setMetadata(metadata) {
        this.metadata = {
            title: metadata.title || 'Document',
            author: metadata.author || 'Energen Systems Inc.',
            subject: metadata.subject || '',
            keywords: metadata.keywords || [],
            creationDate: metadata.date || new Date()
        };
        return this;
    }

    /**
     * Set page specifications
     */
    setPageSpecs(specs) {
        this.pageSpecs = { ...this.pageSpecs, ...specs };
        return this;
    }

    /**
     * Set layout strategy
     * @param {string} strategy - 'single-page', 'multi-page', 'auto'
     */
    setLayoutStrategy(strategy) {
        this.layoutStrategy = strategy;
        return this;
    }

    /**
     * Add component to document
     * @param {PDFComponent} component - Component instance
     * @param {Object} data - Component data
     * @param {Object} options - Render options
     */
    addComponent(component, data = {}, options = {}) {
        this.components.push({
            component,
            data,
            options: {
                forceNewPage: false,
                allowBreak: false,
                priority: 0,
                ...options
            }
        });
        return this;
    }

    /**
     * Build the PDF document
     * @param {Stream} outputStream - Optional output stream to pipe to
     * @returns {Object} Result object with document and stats
     */
    build(outputStream = null) {
        // Emit build start event
        this.emit('build:start', { components: this.components.length });

        // Create PDF document
        this.doc = new PDFDocument({
            size: this.pageSpecs.size,
            margin: this.pageSpecs.margin,
            info: this.metadata
        });

        // Pipe to stream if provided
        if (outputStream) {
            this.doc.pipe(outputStream);
        }

        // Sort components by priority
        const sortedComponents = [...this.components].sort(
            (a, b) => (b.options.priority || 0) - (a.options.priority || 0)
        );

        // Apply layout strategy
        const result = this._applyLayoutStrategy(sortedComponents);

        // Emit build complete event
        this.emit('build:complete', result);

        // End document
        this.doc.end();

        return {
            document: this.doc,
            stats: result,
            renderLog: this.renderLog
        };
    }

    /**
     * Apply layout strategy to components
     * @private
     */
    _applyLayoutStrategy(components) {
        switch (this.layoutStrategy) {
            case 'single-page':
                return this._singlePageLayout(components);
            case 'multi-page':
                return this._multiPageLayout(components);
            case 'auto':
                return this._autoLayout(components);
            default:
                return this._singlePageLayout(components);
        }
    }

    /**
     * Single page layout - all components on one page
     * @private
     */
    _singlePageLayout(components) {
        const pageHeight = this.pageSpecs.height - (this.pageSpecs.margin * 2);
        const pageWidth = this.pageSpecs.width - (this.pageSpecs.margin * 2);
        
        let currentY = this.pageSpecs.margin;
        let rendered = 0;
        let skipped = 0;

        // Calculate total space needed
        const totalSpace = components.reduce((sum, item) => {
            const space = item.component.calculateSpace(this.doc, item.data);
            return sum + space.preferredHeight;
        }, 0);

        // Calculate scale factor if needed
        const scaleFactor = totalSpace > pageHeight ? pageHeight / totalSpace : 1;

        // Render components
        for (const item of components) {
            const { component, data, options } = item;
            
            // Calculate space
            const space = component.calculateSpace(this.doc, data);
            const allocatedHeight = space.preferredHeight * scaleFactor;
            
            // Check if component fits
            if (currentY + allocatedHeight > this.pageSpecs.height - this.pageSpecs.margin) {
                if (component.specs.canScale) {
                    // Scale down to fit
                    allocatedHeight = (this.pageSpecs.height - this.pageSpecs.margin) - currentY;
                } else {
                    skipped++;
                    this._logRender(component, 'skipped', 'insufficient space');
                    continue;
                }
            }

            // Render component
            const bounds = {
                x: this.pageSpecs.margin,
                y: currentY,
                width: pageWidth,
                height: allocatedHeight
            };

            try {
                const result = component.render(this.doc, bounds, data);
                currentY = result.endY || (currentY + result.actualHeight);
                rendered++;
                this._logRender(component, 'success', result);
                
                // Emit component rendered event
                this.emit('component:rendered', {
                    component: component.constructor.name,
                    bounds,
                    result
                });
            } catch (error) {
                skipped++;
                this._logRender(component, 'error', error.message);
                this.emit('component:error', {
                    component: component.constructor.name,
                    error
                });
            }
        }

        return {
            pages: 1,
            componentsRendered: rendered,
            componentsSkipped: skipped,
            scaleFactor
        };
    }

    /**
     * Multi-page layout - components can span pages
     * @private
     */
    _multiPageLayout(components) {
        const pageHeight = this.pageSpecs.height - (this.pageSpecs.margin * 2);
        const pageWidth = this.pageSpecs.width - (this.pageSpecs.margin * 2);
        
        let currentY = this.pageSpecs.margin;
        let currentPage = 1;
        let rendered = 0;
        let skipped = 0;

        for (const item of components) {
            const { component, data, options } = item;
            
            // Check for forced new page
            if (options.forceNewPage && currentY > this.pageSpecs.margin) {
                this.doc.addPage();
                currentPage++;
                currentY = this.pageSpecs.margin;
            }

            // Calculate space
            const space = component.calculateSpace(this.doc, data);
            
            // Check if we need a new page
            if (currentY + space.minHeight > this.pageSpecs.height - this.pageSpecs.margin) {
                if (!component.specs.canBreakPage) {
                    this.doc.addPage();
                    currentPage++;
                    currentY = this.pageSpecs.margin;
                }
            }

            // Render component
            const bounds = {
                x: this.pageSpecs.margin,
                y: currentY,
                width: pageWidth,
                height: Math.min(
                    space.preferredHeight,
                    (this.pageSpecs.height - this.pageSpecs.margin) - currentY
                )
            };

            try {
                const result = component.render(this.doc, bounds, data);
                currentY = result.endY || (currentY + result.actualHeight);
                
                // Handle page overflow
                if (result.overflow && component.specs.canBreakPage) {
                    // Component can continue on next page
                    this.doc.addPage();
                    currentPage++;
                    currentY = this.pageSpecs.margin;
                    // TODO: Implement continuation logic
                }
                
                rendered++;
                this._logRender(component, 'success', result);
            } catch (error) {
                skipped++;
                this._logRender(component, 'error', error.message);
            }
        }

        return {
            pages: currentPage,
            componentsRendered: rendered,
            componentsSkipped: skipped
        };
    }

    /**
     * Auto layout - intelligently choose layout based on content
     * @private
     */
    _autoLayout(components) {
        // Calculate total preferred height
        const totalHeight = components.reduce((sum, item) => {
            const space = item.component.calculateSpace(this.doc, item.data);
            return sum + space.preferredHeight;
        }, 0);

        const pageHeight = this.pageSpecs.height - (this.pageSpecs.margin * 2);
        
        // Choose strategy based on content
        if (totalHeight <= pageHeight * 1.2) {
            // Content fits or nearly fits on one page
            return this._singlePageLayout(components);
        } else {
            // Content needs multiple pages
            return this._multiPageLayout(components);
        }
    }

    /**
     * Log render attempt
     * @private
     */
    _logRender(component, status, details) {
        this.renderLog.push({
            timestamp: new Date(),
            component: component.constructor.name,
            status,
            details
        });
    }

    /**
     * Create and return a buffer of the PDF
     * @returns {Promise<Buffer>}
     */
    async toBuffer() {
        return new Promise((resolve, reject) => {
            const chunks = [];
            const stream = this.build();
            
            stream.document.on('data', chunk => chunks.push(chunk));
            stream.document.on('end', () => resolve(Buffer.concat(chunks)));
            stream.document.on('error', reject);
        });
    }

    /**
     * Save PDF to file
     * @param {string} filepath - Path to save PDF
     * @returns {Promise<void>}
     */
    async saveToFile(filepath) {
        const stream = fs.createWriteStream(filepath);
        const result = this.build(stream);
        
        return new Promise((resolve, reject) => {
            stream.on('finish', () => resolve(result));
            stream.on('error', reject);
        });
    }
}

export default PDFDocumentBuilder;