/**
 * RFP Processor Module - Main Entry Point
 * Phase 1 - Structure Setup Complete
 *
 * This module provides AI-powered RFP/RFQ document processing capabilities
 * for the Energen Calculator v5.0.
 *
 * @module rfp-processor
 */

const RFPProcessingService = require('./RFPProcessingService.cjs');
const AIExtractionEngine = require('./AIExtractionEngine.cjs');
const ServiceMappingEngine = require('./ServiceMappingEngine.cjs');
const DocumentSplitter = require('./DocumentSplitter.cjs');
const FormGenerator = require('./FormGenerator.cjs');
const ValidationService = require('./ValidationService.cjs');
const config = require('./config.cjs');

module.exports = {
  RFPProcessingService,
  AIExtractionEngine,
  ServiceMappingEngine,
  DocumentSplitter,
  FormGenerator,
  ValidationService,
  config
};
