/**
 * DocumentSplitter Configuration
 * @module rfp-processor/splitter-config
 * @version 1.0.0
 */

const path = require('path');

module.exports = {
  // File paths
  tempDir: path.join(__dirname, '../../temp/rfp-processing'),
  outputDir: path.join(__dirname, '../../output/rfp-splits'),
  
  // Processing limits
  maxFileSize: 50 * 1024 * 1024, // 50MB max
  maxPages: 500,
  processingTimeout: 120000, // 2 minutes
  
  // Document classification keywords
  documentTypes: {
    RFP: ['request for proposal', 'rfp', 'proposal submission', 'solicitation'],
    RFQ: ['request for quote', 'rfq', 'quotation', 'price quote'],
    IFB: ['invitation for bid', 'ifb', 'sealed bid', 'competitive bid'],
    RFI: ['request for information', 'rfi'],
    SOW: ['statement of work', 'scope of work', 'work statement'],
  },
  
  // Section identification patterns
  sectionKeywords: {
    coverPage: ['cover', 'title page', 'front page'],
    tableOfContents: ['table of contents', 'contents', 'toc'],
    instructions: ['instructions', 'bidder instructions', 'submission requirements'],
    specifications: ['specifications', 'technical specs', 'requirements', 'scope'],
    bidForm: ['bid form', 'price sheet', 'cost proposal', 'pricing schedule'],
    terms: ['terms and conditions', 'general conditions', 'contract terms'],
    insurance: ['insurance', 'insurance requirements', 'bonding'],
    certification: ['certification', 'certifications', 'compliance'],
    attachments: ['attachments', 'exhibits', 'appendix', 'addenda'],
  },
  
  // Logging
  logLevel: 'info',
  logToFile: true,
  logFile: path.join(__dirname, '../../logs/rfp-processor.log'),
};
