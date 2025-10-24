/**
 * config.cjs
 * 
 * Configuration for RFP Processor Module
 * 
 * @module config
 * @author Energen Systems Inc.
 */

const path = require('path');
require('dotenv').config();

/**
 * RFP Processor Configuration
 */
const config = {
  // API Configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-7-sonnet-20250219',
    maxTokens: 16000,
    temperature: 0.0,
    enableCaching: true,
    maxRetries: 3
  },

  // File paths
  paths: {
    inputDir: path.resolve(__dirname, '../../input/rfp-documents'),
    outputDir: path.resolve(__dirname, '../../output/extractions'),
    tempDir: path.resolve(__dirname, '../../temp/rfp-processing'),
    schemasDir: path.resolve(__dirname, './schemas')
  },

  // Processing options
  processing: {
    enableOCR: false, // Phase 2
    enableImageExtraction: false, // Phase 2
    saveIntermediateResults: true,
    validateOutput: true,
    generateQualityReport: true
  },

  // Confidence thresholds
  quality: {
    minimumConfidence: 0.6,
    highConfidence: 0.85,
    flagLowConfidence: true,
    requireReviewBelow: 0.5
  },

  // Cost tracking
  costs: {
    trackTokenUsage: true,
    trackCosts: true,
    logCostPerDocument: true,
    budgetAlert: 50.00 // Alert if total cost exceeds this
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: true,
    enableFile: true,
    logFile: path.resolve(__dirname, '../../logs/rfp-processor.log')
  },

  // Upload configuration
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/pdf']
  },

  // Status tracking
  status: {
    cleanupInterval: 3600000 // 1 hour in milliseconds
  }
};

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];

  if (!config.anthropic.apiKey) {
    errors.push('ANTHROPIC_API_KEY is not set in environment variables');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    return false;
  }

  return true;
}

module.exports = {
  config,
  validateConfig
};
