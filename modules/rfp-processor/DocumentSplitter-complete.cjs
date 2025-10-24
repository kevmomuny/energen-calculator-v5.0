/**
 * DocumentSplitter - Phase 1 Core PDF Processing Service
 * Handles PDF loading, analysis, classification, and section splitting
 * 
 * @module rfp-processor/DocumentSplitter
 * @version 1.0.0
 * @author Energen Systems Inc.
 */

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const config = require('./config.cjs');

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
