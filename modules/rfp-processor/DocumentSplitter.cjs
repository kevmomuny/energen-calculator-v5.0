/**
 * DocumentSplitter - Phase 1 Core PDF Processing Service
 * @module rfp-processor/DocumentSplitter
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const config = require('./splitter-config.cjs');

class DocumentSplitter {
  constructor(customConfig = {}) {
    this.config = { ...config, ...customConfig };
    this.logger = this.createLogger();
    this.ensureDirectories();
  }

  createLogger() {
    return {
      debug: (...args) => this.config.logLevel === 'debug' && console.log('[DEBUG]', ...args),
      info: (...args) => ['debug', 'info'].includes(this.config.logLevel) && console.log('[INFO]', ...args),
      warn: (...args) => ['debug', 'info', 'warn'].includes(this.config.logLevel) && console.warn('[WARN]', ...args),
      error: (...args) => console.error('[ERROR]', ...args),
    };
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.config.tempDir, { recursive: true });
      await fs.mkdir(this.config.outputDir, { recursive: true });
      if (this.config.logToFile) {
        await fs.mkdir(path.dirname(this.config.logFile), { recursive: true });
      }
    } catch (error) {
      this.logger.warn('Error creating directories:', error.message);
    }
  }

  async loadPDF(pdfPath) {
    const startTime = Date.now();
    this.logger.info(`Loading PDF: ${pdfPath}`);
    try {
      await fs.access(pdfPath);
      const stats = await fs.stat(pdfPath);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum`);
      }
      const pdfBuffer = await fs.readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      const pageCount = pdfDoc.getPageCount();
      if (pageCount > this.config.maxPages) {
        throw new Error(`Page count exceeds maximum`);
      }
      this.logger.info(`PDF loaded: ${pageCount} pages in ${Date.now() - startTime}ms`);
      return pdfDoc;
    } catch (error) {
      this.logger.error(`Failed to load PDF: ${error.message}`);
      throw new Error(`PDF load failed: ${error.message}`);
    }
  }

  async extractMetadata(pdfDoc) {
    try {
      const pageCount = pdfDoc.getPageCount();
      const metadata = {
        title: pdfDoc.getTitle() || 'Untitled',
        author: pdfDoc.getAuthor() || 'Unknown',
        subject: pdfDoc.getSubject() || '',
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || '',
        pages: pageCount,
        creationDate: pdfDoc.getCreationDate()?.toISOString() || null,
        modificationDate: pdfDoc.getModificationDate()?.toISOString() || null,
      };
      this.logger.debug('Metadata extracted:', metadata);
      return metadata;
    } catch (error) {
      this.logger.warn(`Metadata extraction error: ${error.message}`);
      return {
        title: 'Unknown',
        author: 'Unknown',
        pages: pdfDoc.getPageCount(),
        subject: '',
        creator: '',
        producer: '',
        creationDate: null,
        modificationDate: null,
      };
    }
  }

  async extractText(pdfPath) {
    const startTime = Date.now();
    this.logger.info('Extracting text from PDF...');
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer, { max: this.config.maxPages });
      this.logger.info(`Text extracted: ${data.text.length} chars in ${Date.now() - startTime}ms`);
      return {
        text: data.text,
        numPages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version,
      };
    } catch (error) {
      this.logger.error(`Text extraction failed: ${error.message}`);
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  classifyDocument(text, metadata) {
    this.logger.info('Classifying document...');
    const normalizedText = text.toLowerCase().substring(0, 5000);
    const normalizedTitle = (metadata.title || '').toLowerCase();
    let bestMatch = null;
    let maxScore = 0;

    for (const [docType, keywords] of Object.entries(this.config.documentTypes)) {
      let score = 0;
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        if (normalizedTitle.includes(keywordLower)) score += 10;
        const textMatches = (normalizedText.match(new RegExp(keywordLower, 'g')) || []).length;
        score += textMatches * 2;
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = docType;
      }
    }

    const confidence = Math.min(100, Math.floor((maxScore / 5) * 10));
    const classification = { type: bestMatch || 'Unknown', confidence, score: maxScore };
    this.logger.info(`Document classified: ${classification.type} (${classification.confidence}%)`);
    return classification;
  }

  async identifySections(text, pageCount) {
    this.logger.info('Identifying document sections...');
    const sections = [];
    const lines = text.split('\n');
    let currentPage = 1;
    let charCount = 0;
    const avgCharsPerPage = text.length / pageCount;
    const sectionCandidates = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      charCount += lines[i].length + 1;
      currentPage = Math.ceil(charCount / avgCharsPerPage);
      if (line.length === 0) continue;

      for (const [sectionType, keywords] of Object.entries(this.config.sectionKeywords)) {
        const lineLower = line.toLowerCase();
        for (const keyword of keywords) {
          if (lineLower.includes(keyword.toLowerCase())) {
            sectionCandidates.push({
              title: line.substring(0, 100),
              type: sectionType,
              startPage: currentPage,
              confidence: this.calculateSectionConfidence(line, keyword),
            });
            break;
          }
        }
      }
    }

    sectionCandidates.sort((a, b) => a.startPage - b.startPage);
    const uniqueSections = [];
    let lastType = null;

    for (let i = 0; i < sectionCandidates.length; i++) {
      const candidate = sectionCandidates[i];
      if (candidate.type === lastType) continue;
      const endPage = i < sectionCandidates.length - 1 
        ? sectionCandidates[i + 1].startPage - 1
        : pageCount;

      uniqueSections.push({
        title: candidate.title,
        type: candidate.type,
        startPage: candidate.startPage,
        endPage: endPage,
        pageCount: endPage - candidate.startPage + 1,
        outputPath: null,
      });
      lastType = candidate.type;
    }

    if (uniqueSections.length === 0) {
      uniqueSections.push({
        title: 'Complete Document',
        type: 'complete',
        startPage: 1,
        endPage: pageCount,
        pageCount: pageCount,
        outputPath: null,
      });
    }

    this.logger.info(`Identified ${uniqueSections.length} sections`);
    return uniqueSections;
  }

  calculateSectionConfidence(line, keyword) {
    const lineLower = line.toLowerCase();
    const keywordLower = keyword.toLowerCase();
    if (lineLower.startsWith(keywordLower)) return 0.9;
    if (line.length < 50) return 0.7;
    return 0.5;
  }

  async splitBySections(pdfPath, sections) {
    this.logger.info(`Splitting PDF into ${sections.length} sections...`);
    const results = [];

    for (const section of sections) {
      try {
        const filename = this.generateSectionFilename(pdfPath, section);
        const outputPath = path.join(this.config.outputDir, filename);
        await this.extractPages(pdfPath, section.startPage, section.endPage, outputPath);
        section.outputPath = outputPath;
        results.push(section);
        this.logger.info(`Section extracted: ${section.title} -> ${filename}`);
      } catch (error) {
        this.logger.error(`Failed to extract section ${section.title}: ${error.message}`);
        section.outputPath = null;
        section.error = error.message;
        results.push(section);
      }
    }
    return results;
  }

  async extractPages(pdfPath, startPage, endPage, outputPath) {
    this.logger.debug(`Extracting pages ${startPage}-${endPage}`);
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      const sourcePdf = await PDFDocument.load(pdfBuffer);
      const newPdf = await PDFDocument.create();
      const pageIndices = [];
      for (let i = startPage - 1; i < endPage; i++) {
        pageIndices.push(i);
      }
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      const pdfBytes = await newPdf.save();
      await fs.writeFile(outputPath, pdfBytes);
      this.logger.debug(`Pages extracted to ${outputPath}`);
    } catch (error) {
      this.logger.error(`Page extraction failed: ${error.message}`);
      throw new Error(`Page extraction failed: ${error.message}`);
    }
  }

  generateSectionFilename(sourcePath, section) {
    const basename = path.basename(sourcePath, '.pdf');
    const sectionName = section.type.replace(/\s+/g, '-');
    const timestamp = Date.now();
    return `${basename}_${sectionName}_p${section.startPage}-${section.endPage}_${timestamp}.pdf`;
  }

  async analyzePDF(pdfPath) {
    const startTime = Date.now();
    this.logger.info(`Starting analysis: ${pdfPath}`);
    try {
      const pdfDoc = await this.loadPDF(pdfPath);
      const metadata = await this.extractMetadata(pdfDoc);
      const textData = await this.extractText(pdfPath);
      const classification = this.classifyDocument(textData.text, metadata);
      const sections = await this.identifySections(textData.text, metadata.pages);
      const processingTime = Date.now() - startTime;

      const result = {
        metadata: { ...metadata, size: (await fs.stat(pdfPath)).size },
        classification,
        sections,
        textExtracted: true,
        textLength: textData.text.length,
        processingTime,
        success: true,
      };
      this.logger.info(`Analysis complete in ${processingTime}ms`);
      return result;
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`);
      return {
        metadata: null,
        classification: { type: 'Unknown', confidence: 0 },
        sections: [],
        textExtracted: false,
        processingTime: Date.now() - startTime,
        success: false,
        error: error.message,
      };
    }
  }

  async processAndSplit(pdfPath) {
    this.logger.info('Starting complete workflow...');
    const analysis = await this.analyzePDF(pdfPath);
    if (!analysis.success) return analysis;
    const splitSections = await this.splitBySections(pdfPath, analysis.sections);
    return { ...analysis, sections: splitSections, splitComplete: true };
  }
}

module.exports = { DocumentSplitter };
