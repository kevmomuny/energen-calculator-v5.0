/**
 * PDF Generator Module
 * Refactored to use new modular architecture
 * @module pdf-generator/module
 * @version 4.1.0
 */

import { EnergenModule } from '../core/interfaces.js';
import { ProfessionalPDFService } from './pdf-service-professional.js';
import EnergenPDFComplete from './energen-pdf-complete.js';
import fs from 'fs';
import path from 'path';

/**
 * PDF Generator Module implementation
 */
export class PDFGeneratorModule extends EnergenModule {
  constructor(config) {
    super({
      name: 'pdf-generator',
      version: '4.1.0',
      ...config
    });
    
    this.templates = new Map();
    this.generatedPDFs = new Map();
    this.outputPath = config.outputPath || './output/pdfs';
    this.templatePath = config.templatePath || './templates';
    
    // Initialize both PDF services
    this.pdfService = new ProfessionalPDFService({
      outputPath: this.outputPath,
      logoPath: config.logoPath
    });
    
    // Initialize the complete PDF generator with all assets
    this.pdfComplete = new EnergenPDFComplete({
      outputPath: this.outputPath,
      logoPath: config.logoPath || path.join(__dirname, 'assets', 'energen-logo.svg')
    });
  }

  /**
   * Module-specific initialization
   */
  async onInit(config) {
    // Ensure output directory exists
    await this.ensureDirectory(this.outputPath);
    
    // Load templates
    await this.loadTemplates();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Get calculation engine dependency if available
    this.calculationEngine = this.dependencies.get('calculation');
    
    this.logger.info('PDF generator module initialized', {
      outputPath: this.outputPath,
      templates: Array.from(this.templates.keys())
    });
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.debug(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Load PDF templates
   */
  async loadTemplates() {
    // For now, register default templates
    // In production, these would be loaded from files
    
    this.templates.set('quote', {
      name: 'Standard Quote',
      type: 'quote',
      version: '1.0',
      layout: 'portrait',
      sections: ['header', 'customer', 'services', 'pricing', 'terms', 'footer']
    });
    
    this.templates.set('invoice', {
      name: 'Standard Invoice',
      type: 'invoice',
      version: '1.0',
      layout: 'portrait',
      sections: ['header', 'customer', 'services', 'pricing', 'payment', 'footer']
    });
    
    this.templates.set('report', {
      name: 'Service Report',
      type: 'report',
      version: '1.0',
      layout: 'portrait',
      sections: ['header', 'summary', 'details', 'recommendations', 'footer']
    });
    
    this.logger.debug(`Loaded ${this.templates.size} PDF templates`);
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const eventBus = this.getDependency('eventBus');
    
    // Listen for PDF generation requests
    eventBus.on('pdf:generate', async (data) => {
      try {
        const result = await this.generatePDF(data);
        eventBus.emit('pdf:generated', {
          requestId: data.requestId,
          result
        });
      } catch (error) {
        eventBus.emit('pdf:error', {
          requestId: data.requestId,
          error: error.message
        });
      }
    });
    
    // Listen for PDF retrieval requests
    eventBus.on('pdf:get', async (data) => {
      try {
        const pdf = await this.getPDF(data.id);
        eventBus.emit('pdf:retrieved', {
          requestId: data.requestId,
          pdf
        });
      } catch (error) {
        eventBus.emit('pdf:error', {
          requestId: data.requestId,
          error: error.message
        });
      }
    });
  }

  /**
   * Generate a PDF document
   */
  async generatePDF(data) {
    this.metrics.requestCount++;
    const startTime = Date.now();
    
    try {
      const { template = 'quote', content, options = {} } = data;
      
      // Validate template
      if (!this.templates.has(template)) {
        throw new Error(`Template '${template}' not found`);
      }
      
      // Generate unique ID
      const pdfId = this.generatePDFId();
      
      // Use the complete PDF service to generate the document
      let pdfResult;
      if (template === 'quote') {
        // Generate quote number in proper format: mnth-2025-xxxx
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const sequence = content.quoteSequence || String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const quoteNumber = `${month}-${year}-${sequence}`;
        
        // Use the complete PDF generator with all assets
        const pdfBuffer = await this.pdfComplete.generateBuffer({
          customer: content.customer,
          generators: content.generators || [content.generator],
          services: content.services,
          metadata: {
            quoteNumber: quoteNumber,
            date: new Date(),
            sitePrefix: content.sitePrefix
          }
        });
        
        // Save PDF to file
        const filename = `Quote_${quoteNumber.replace(/-/g, '_')}.pdf`;
        const filepath = path.join(this.outputPath, filename);
        fs.writeFileSync(filepath, pdfBuffer);
        
        pdfResult = { filepath, filename, buffer: pdfBuffer };
      } else {
        // For other templates, use the professional service
        const documentData = await this.prepareDocumentData(content, template);
        const pdfPath = await this.createPDF(pdfId, documentData, template, options);
        pdfResult = { filepath: pdfPath, filename: `${pdfId}.pdf` };
      }
      
      // Store PDF metadata
      this.generatedPDFs.set(pdfId, {
        id: pdfId,
        template,
        path: pdfResult.filepath,
        filename: pdfResult.filename,
        createdAt: new Date(),
        size: 0, // Would get actual file size
        metadata: {
          customer: content.customer?.company || content.customer?.name,
          type: template,
          total: content.calculation?.grandTotal
        }
      });
      
      // Track metrics
      const duration = Date.now() - startTime;
      this.trackMetric('generationTime', duration);
      
      // Emit success event
      this.emit('pdf:complete', {
        id: pdfId,
        path: pdfResult.filepath,
        duration
      });
      
      return {
        id: pdfId,
        url: `/output/pdfs/${pdfResult.filename}`,
        path: pdfResult.filepath,
        filename: pdfResult.filename,
        createdAt: new Date()
      };
    } catch (error) {
      this.handleError(error, 'generatePDF');
      throw error;
    }
  }

  /**
   * Prepare document data
   */
  async prepareDocumentData(content, template) {
    const data = { ...content };
    
    // Add calculation data if available
    if (this.calculationEngine && content.calculation) {
      const calcResult = await this.calculationEngine.calculate(content.calculation);
      data.pricing = calcResult;
    }
    
    // Add template-specific data
    data.template = this.templates.get(template);
    data.generatedAt = new Date();
    data.logo = this.getEnergenLogo();
    
    return data;
  }

  /**
   * Create PDF file (mock implementation)
   */
  async createPDF(id, data, template, options) {
    // In production, this would use a real PDF library like PDFKit or Puppeteer
    const fileName = `${id}_${template}_${Date.now()}.pdf`;
    const filePath = path.join(this.outputPath, fileName);
    
    // Mock PDF content
    const mockPDF = {
      id,
      template,
      data,
      options,
      createdAt: new Date().toISOString()
    };
    
    // Write mock file
    fs.writeFileSync(filePath, JSON.stringify(mockPDF, null, 2));
    
    this.logger.info(`Generated PDF: ${fileName}`);
    
    return filePath;
  }

  /**
   * Get Energen logo SVG
   */
  getEnergenLogo() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 434.6 128.31">
      <defs><style>.cls-1{fill:#000;stroke-width:0px;}.cls-2{fill:#008afc;stroke-width:0px;}</style></defs>
      <!-- Logo paths as defined in CLAUDE.md -->
    </svg>`;
  }

  /**
   * Generate unique PDF ID
   */
  generatePDFId() {
    return `PDF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get a generated PDF
   */
  async getPDF(id) {
    const pdfMeta = this.generatedPDFs.get(id);
    
    if (!pdfMeta) {
      throw new Error(`PDF ${id} not found`);
    }
    
    // Check if file still exists
    if (!fs.existsSync(pdfMeta.path)) {
      this.generatedPDFs.delete(id);
      throw new Error(`PDF file ${id} no longer exists`);
    }
    
    // Read PDF file
    const pdfContent = fs.readFileSync(pdfMeta.path);
    
    return {
      ...pdfMeta,
      content: pdfContent
    };
  }

  /**
   * List generated PDFs
   */
  listPDFs(options = {}) {
    const { limit = 10, offset = 0, template } = options;
    
    let pdfs = Array.from(this.generatedPDFs.values());
    
    // Filter by template if specified
    if (template) {
      pdfs = pdfs.filter(pdf => pdf.template === template);
    }
    
    // Sort by creation date (newest first)
    pdfs.sort((a, b) => b.createdAt - a.createdAt);
    
    // Apply pagination
    const paginated = pdfs.slice(offset, offset + limit);
    
    return {
      total: pdfs.length,
      limit,
      offset,
      pdfs: paginated
    };
  }

  /**
   * Delete a PDF
   */
  async deletePDF(id) {
    const pdfMeta = this.generatedPDFs.get(id);
    
    if (!pdfMeta) {
      throw new Error(`PDF ${id} not found`);
    }
    
    // Delete file if exists
    if (fs.existsSync(pdfMeta.path)) {
      fs.unlinkSync(pdfMeta.path);
      this.logger.debug(`Deleted PDF file: ${pdfMeta.path}`);
    }
    
    // Remove from registry
    this.generatedPDFs.delete(id);
    
    return { deleted: true, id };
  }

  /**
   * Clean up old PDFs
   */
  async cleanupOldPDFs(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    const now = Date.now();
    const deleted = [];
    
    for (const [id, pdfMeta] of this.generatedPDFs) {
      const age = now - pdfMeta.createdAt.getTime();
      
      if (age > maxAge) {
        try {
          await this.deletePDF(id);
          deleted.push(id);
        } catch (error) {
          this.logger.error(`Failed to delete old PDF ${id}:`, error);
        }
      }
    }
    
    if (deleted.length > 0) {
      this.logger.info(`Cleaned up ${deleted.length} old PDFs`);
    }
    
    return deleted;
  }

  /**
   * Get PDF statistics
   */
  getStatistics() {
    const stats = {
      totalGenerated: this.metrics.requestCount,
      currentlyStored: this.generatedPDFs.size,
      averageGenerationTime: this.metrics.generationTime 
        ? this.metrics.generationTime / this.metrics.requestCount
        : 0,
      templates: {}
    };
    
    // Count PDFs by template
    for (const pdfMeta of this.generatedPDFs.values()) {
      if (!stats.templates[pdfMeta.template]) {
        stats.templates[pdfMeta.template] = 0;
      }
      stats.templates[pdfMeta.template]++;
    }
    
    return stats;
  }

  /**
   * Update configuration dynamically
   */
  async onConfigChange(newConfig) {
    if (newConfig.outputPath && newConfig.outputPath !== this.outputPath) {
      this.outputPath = newConfig.outputPath;
      await this.ensureDirectory(this.outputPath);
    }
    
    if (newConfig.templatePath && newConfig.templatePath !== this.templatePath) {
      this.templatePath = newConfig.templatePath;
      await this.loadTemplates();
    }
    
    this.logger.info('PDF generator configuration updated');
  }

  /**
   * Module-specific health checks
   */
  runHealthChecks() {
    const checks = super.runHealthChecks();
    
    // Check output directory
    checks.push({
      name: 'outputDirectory',
      passed: fs.existsSync(this.outputPath),
      message: fs.existsSync(this.outputPath)
        ? `Output directory available: ${this.outputPath}`
        : `Output directory missing: ${this.outputPath}`
    });
    
    // Check templates
    checks.push({
      name: 'templates',
      passed: this.templates.size > 0,
      message: `${this.templates.size} templates loaded`
    });
    
    // Check disk space (simplified)
    checks.push({
      name: 'storage',
      passed: true, // Would check actual disk space
      message: `${this.generatedPDFs.size} PDFs stored`
    });
    
    return checks;
  }

  /**
   * Module cleanup
   */
  async onShutdown() {
    // Optionally clean up old PDFs
    await this.cleanupOldPDFs();
    
    this.templates.clear();
    this.generatedPDFs.clear();
    
    this.logger.info('PDF generator module shut down');
  }
}

export default PDFGeneratorModule;