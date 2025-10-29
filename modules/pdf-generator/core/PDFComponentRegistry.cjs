/**
 * PDFComponentRegistry - Central registry for all PDF components
 * Implements Registry pattern for component discovery and management
 *
 * FEATURES:
 * 1. Component registration and discovery
 * 2. Factory method for component creation
 * 3. Component versioning and compatibility
 * 4. Dependency injection support
 */

class PDFComponentRegistry {
  constructor() {
    this.components = new Map();
    this.templates = new Map();
    this.dataAdapters = new Map();
    this.initialized = false;
  }

  /**
     * Register a component
     */
  registerComponent(name, ComponentClass, metadata = {}) {
    if (this.components.has(name)) {
      console.warn(`Component ${name} already registered, overwriting`);
    }

    this.components.set(name, {
      class: ComponentClass,
      metadata: {
        version: '1.0.0',
        author: 'System',
        description: '',
        dependencies: [],
        ...metadata
      },
      instances: new WeakMap() // Cache instances per configuration
    });

    return this;
  }

  /**
     * Register a data adapter for bridging data sources
     */
  registerDataAdapter(name, adapter) {
    this.dataAdapters.set(name, adapter);
    return this;
  }

  /**
     * Register a document template
     */
  registerTemplate(name, template) {
    this.templates.set(name, template);
    return this;
  }

  /**
     * Get component by name
     */
  getComponent(name, config = {}) {
    const registration = this.components.get(name);
    if (!registration) {
      throw new Error(`Component ${name} not found in registry`);
    }

    // Check cache for existing instance with same config
    const configKey = JSON.stringify(config);
    let instance = registration.instances.get(config);

    if (!instance) {
      instance = new registration.class(config);
      registration.instances.set(config, instance);
    }

    return instance;
  }

  /**
     * Create component with automatic configuration
     */
  createComponent(name, data = {}, config = {}) {
    const component = this.getComponent(name, config);

    // Apply data adapter if available
    const adapter = this.dataAdapters.get(name);
    if (adapter) {
      data = adapter.transform(data);
    }

    return { component, data };
  }

  /**
     * Get all registered components
     */
  listComponents() {
    return Array.from(this.components.entries()).map(([name, reg]) => ({
      name,
      ...reg.metadata
    }));
  }

  /**
     * Build document from template
     */
  buildFromTemplate(templateName, data) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template.build(this, data);
  }

  /**
     * Initialize with default Energen components
     */
  initializeEnergenComponents() {
    if (this.initialized) return this;

    // Register all Energen components
    const PDFHeaderComponent = require('../components/PDFHeaderComponent.cjs');
    const PDFFooterComponent = require('../components/PDFFooterComponent.cjs');
    const PDFTableComponent = require('../components/PDFTableComponent.cjs');
    const PDFDisclosureComponent = require('../components/PDFDisclosureComponent.cjs');
    const PDFSignatureComponent = require('../components/PDFSignatureComponent.cjs');
    const PDFCustomerInfoComponent = require('../components/PDFCustomerInfoComponent.cjs');

    this.registerComponent('header', PDFHeaderComponent, {
      description: 'Standard header with logo and title',
      version: '2.0.0'
    });

    this.registerComponent('footer', PDFFooterComponent, {
      description: 'Footer with contact info and decorative graphics',
      version: '2.0.0'
    });

    this.registerComponent('table', PDFTableComponent, {
      description: 'Service table with quarterly breakdown',
      version: '2.0.0'
    });

    this.registerComponent('disclosure', PDFDisclosureComponent, {
      description: 'Legal disclosure with auto-scaling',
      version: '2.0.0'
    });

    this.registerComponent('signature', PDFSignatureComponent, {
      description: 'Signature blocks with smart layout',
      version: '2.0.0'
    });

    this.registerComponent('customerInfo', PDFCustomerInfoComponent, {
      description: 'Customer information block',
      version: '2.0.0'
    });

    // Register data adapters
    const ZohoDataAdapter = require('../adapters/ZohoDataAdapter.cjs');
    const CalculatorDataAdapter = require('../adapters/CalculatorDataAdapter.cjs');

    this.registerDataAdapter('zoho', new ZohoDataAdapter());
    this.registerDataAdapter('calculator', new CalculatorDataAdapter());

    // Register templates
    const EnergenQuoteTemplate = require('../templates/EnergenQuoteTemplate.cjs');
    const EnergenContractTemplate = require('../templates/EnergenContractTemplate.cjs');

    this.registerTemplate('energen-quote', new EnergenQuoteTemplate());
    this.registerTemplate('energen-contract', new EnergenContractTemplate());

    this.initialized = true;
    return this;
  }

  /**
     * Singleton instance
     */
  static getInstance() {
    if (!PDFComponentRegistry.instance) {
      PDFComponentRegistry.instance = new PDFComponentRegistry();
    }
    return PDFComponentRegistry.instance;
  }
}

module.exports = PDFComponentRegistry;
