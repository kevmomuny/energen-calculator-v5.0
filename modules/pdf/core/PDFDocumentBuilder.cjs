/**
 * PDFDocumentBuilder - Builder Pattern Implementation
 * Constructs PDF documents by composing modular components
 * Handles both single and multi-page documents
 *
 * DESIGN PRINCIPLES:
 * 1. Builder pattern for step-by-step document construction
 * 2. Strategy pattern for layout algorithms
 * 3. Chain of responsibility for component rendering
 * 4. Template method for document structure
 */

const PDFDocument = require('pdfkit');

class PDFDocumentBuilder {
  constructor() {
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
      author: metadata.author || 'System',
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
    // Create PDF document
    this.doc = new PDFDocument({
      size: this.pageSpecs.size,
      margin: this.pageSpecs.margin,
      info: this.metadata
    });

    // Pipe to output stream if provided
    if (outputStream) {
      this.doc.pipe(outputStream);
    }

    // Sort components by priority
    const sortedComponents = [...this.components].sort(
      (a, b) => b.options.priority - a.options.priority
    );

    // Execute layout strategy
    switch (this.layoutStrategy) {
      case 'single-page':
        this._buildSinglePage(sortedComponents);
        break;
      case 'multi-page':
        this._buildMultiPage(sortedComponents);
        break;
      case 'auto':
        this._buildAuto(sortedComponents);
        break;
      default:
        throw new Error(`Unknown layout strategy: ${this.layoutStrategy}`);
    }

    // Finalize document
    this.doc.end();

    // Return results
    return {
      document: this.doc,
      totalPages: this.currentPage,
      componentsRendered: this.renderLog.length,
      renderLog: this.renderLog
    };
  }

  /**
     * Build single-page document with aggressive scaling
     */
  _buildSinglePage(components) {
    const pageHeight = this.pageSpecs.height - (this.pageSpecs.margin * 2);
    const pageWidth = this.pageSpecs.width - (this.pageSpecs.margin * 2);

    // Calculate total space requirements
    const spaceRequirements = components.map(({ component, data }) => ({
      component,
      space: component.calculateSpace(this.doc, data)
    }));

    // Calculate total preferred height
    const totalPreferred = spaceRequirements.reduce(
      (sum, req) => sum + req.space.preferredHeight, 0
    );

    // Calculate scaling factor if needed
    let scaleFactor = 1;
    if (totalPreferred > pageHeight) {
      const totalMin = spaceRequirements.reduce(
        (sum, req) => sum + req.space.minHeight, 0
      );

      if (totalMin > pageHeight) {
        console.warn('Content exceeds page even at minimum size');
        scaleFactor = pageHeight / totalMin;
      } else {
        // Scale proportionally between min and preferred
        scaleFactor = pageHeight / totalPreferred;
      }
    }

    // Render components with calculated bounds
    let currentY = this.pageSpecs.margin;

    components.forEach(({ component, data, options }) => {

      const space = component.calculateSpace(this.doc, data);
      const allocatedHeight = Math.min(
        space.preferredHeight * scaleFactor,
        space.maxHeight
      );

      const bounds = {
        x: this.pageSpecs.margin,
        y: currentY,
        width: pageWidth,
        height: allocatedHeight
      };

      const result = component.render(this.doc, bounds, data);

      this.renderLog.push({
        component: component.constructor.name,
        bounds,
        result,
        scaled: scaleFactor < 1
      });

      // Use the allocated bounds for next component's position, not the returned endY
      // This ensures components stay within their allocated space
      currentY = bounds.y + allocatedHeight;
    });
  }

  /**
     * Build multi-page document with natural flow
     */
  _buildMultiPage(components) {
    const pageHeight = this.pageSpecs.height - (this.pageSpecs.margin * 2);
    const pageWidth = this.pageSpecs.width - (this.pageSpecs.margin * 2);

    let currentY = this.pageSpecs.margin;
    let remainingHeight = pageHeight;

    components.forEach(({ component, data, options }) => {
      // Check if we need a new page
      if (options.forceNewPage && currentY > this.pageSpecs.margin) {
        this.doc.addPage();
        this.currentPage++;
        currentY = this.pageSpecs.margin;
        remainingHeight = pageHeight;
      }

      const space = component.calculateSpace(this.doc, data);

      // Check if component fits on current page
      if (space.minHeight > remainingHeight && !options.allowBreak) {
        // Start new page
        this.doc.addPage();
        this.currentPage++;
        currentY = this.pageSpecs.margin;
        remainingHeight = pageHeight;
      }

      const bounds = {
        x: this.pageSpecs.margin,
        y: currentY,
        width: pageWidth,
        height: Math.min(space.preferredHeight, remainingHeight)
      };

      const result = component.render(this.doc, bounds, data);

      this.renderLog.push({
        component: component.constructor.name,
        page: this.currentPage,
        bounds,
        result
      });

      // Handle overflow
      if (result.overflow && options.allowBreak) {
        // Component continues on next page
        this.doc.addPage();
        this.currentPage++;
        currentY = this.pageSpecs.margin;

        // Render overflow content
        const overflowBounds = {
          x: this.pageSpecs.margin,
          y: currentY,
          width: pageWidth,
          height: pageHeight
        };

        component.renderOverflow(this.doc, overflowBounds, result.overflow);
      }

      currentY = result.endY;
      remainingHeight = pageHeight - (currentY - this.pageSpecs.margin);
    });
  }

  /**
     * Auto layout - intelligently chooses between single and multi-page
     */
  _buildAuto(components) {
    // Calculate if content fits on single page
    const pageHeight = this.pageSpecs.height - (this.pageSpecs.margin * 2);

    const totalMin = components.reduce((sum, { component, data }) => {
      const space = component.calculateSpace(this.doc, data);
      return sum + space.minHeight;
    }, 0);

    if (totalMin <= pageHeight) {
      this._buildSinglePage(components);
    } else {
      this._buildMultiPage(components);
    }
  }

  /**
     * Get render log for debugging
     */
  getRenderLog() {
    return this.renderLog;
  }

  /**
     * Create from template
     */
  static fromTemplate(templateName) {
    const builder = new PDFDocumentBuilder();

    // Load template configuration
    const templates = {
      'energen-quote': {
        layout: 'single-page',
        pageSpecs: { size: 'letter', margin: 40 }
      },
      'energen-contract': {
        layout: 'multi-page',
        pageSpecs: { size: 'letter', margin: 50 }
      },
      'invoice': {
        layout: 'auto',
        pageSpecs: { size: 'letter', margin: 30 }
      }
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    return builder
      .setLayoutStrategy(template.layout)
      .setPageSpecs(template.pageSpecs);
  }
}

module.exports = PDFDocumentBuilder;
