/**
 * PDFComponent Base Class
 * Establishes the contract for all PDF components
 * IMMUTABLE RULES:
 * 1. Components are self-contained - no external dependencies
 * 2. Components communicate through defined interfaces only
 * 3. Components manage their own space and boundaries
 * 4. Components are composable and reusable
 */

class PDFComponent {
  constructor(config = {}) {
    // Every component has immutable specifications
    this.specs = this._defineSpecs();

    // Configuration can override defaults but not specs
    this.config = { ...this._getDefaultConfig(), ...config };

    // Component state
    this.rendered = false;
    this.lastRenderBounds = null;
  }

  /**
     * Define immutable specifications
     * MUST be overridden by subclasses
     * @returns {Object} Component specifications
     */
  _defineSpecs() {
    return {
      minHeight: 0,
      maxHeight: Infinity,
      canScale: false,
      canBreakPage: false,
      priority: 0  // Higher priority components get space first
    };
  }

  /**
     * Get default configuration
     * Can be overridden by subclasses
     * @returns {Object} Default configuration
     */
  _getDefaultConfig() {
    return {};
  }

  /**
     * Calculate space requirements
     * @param {PDFDocument} doc - PDFKit document
     * @param {Object} data - Component data
     * @returns {Object} { minHeight, preferredHeight, maxHeight }
     */
  calculateSpace(doc, data) {
    throw new Error('calculateSpace must be implemented by subclass');
  }

  /**
     * Render component within allocated space
     * @param {PDFDocument} doc - PDFKit document
     * @param {Object} bounds - { x, y, width, height }
     * @param {Object} data - Component data
     * @returns {Object} { endY, actualHeight, overflow }
     */
  render(doc, bounds, data) {
    throw new Error('render must be implemented by subclass');
  }

  /**
     * Validate component can render with given constraints
     * @param {Object} bounds - Available space
     * @param {Object} data - Component data
     * @returns {Boolean} Can render
     */
  canRender(bounds, data) {
    const space = this.calculateSpace(null, data);
    return bounds.height >= space.minHeight;
  }

  /**
     * Get component metadata
     * @returns {Object} Component metadata
     */
  getMetadata() {
    return {
      type: this.constructor.name,
      specs: this.specs,
      config: this.config,
      rendered: this.rendered,
      bounds: this.lastRenderBounds
    };
  }

  /**
     * Clone component with new configuration
     * @param {Object} newConfig - New configuration
     * @returns {PDFComponent} Cloned component
     */
  clone(newConfig = {}) {
    const ClonedClass = this.constructor;
    return new ClonedClass({ ...this.config, ...newConfig });
  }

  /**
     * Reset component state
     */
  reset() {
    this.rendered = false;
    this.lastRenderBounds = null;
  }
}

module.exports = PDFComponent;
