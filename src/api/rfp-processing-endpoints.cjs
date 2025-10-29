/**
 * RFP Processing API Endpoints
 * Phase 1: Upload, status tracking, and data retrieval
 *
 * Endpoints:
 * - POST /upload - Upload PDF file
 * - GET /status/:processingId - Check processing status
 * - GET /extraction/:extractionId - Get extraction data
 * - POST /verify/:extractionId - Submit user corrections
 * - GET /download/:processingId - Download processed documents
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const { DocumentSplitter } = require('../../modules/rfp-processor/DocumentSplitter.cjs');
const { AIExtractionEngine } = require('../../modules/rfp-processor/AIExtractionEngine.cjs');
const { ServiceMappingEngine } = require('../../modules/rfp-processor/ServiceMappingEngine.cjs');
const { config } = require('../../modules/rfp-processor/config.cjs');

const router = express.Router();

// In-memory storage for processing status (Phase 1)
// Phase 2: Will move to database
const processingStatus = new Map();
const extractionData = new Map();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../temp/rfp-uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = Date.now();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `rfp_${uniqueId}_${sanitizedName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Update processing status
function updateStatus(processingId, stage, progress, error = null) {
  const status = processingStatus.get(processingId) || {};

  processingStatus.set(processingId, {
    ...status,
    status: error ? 'failed' : (progress === 100 ? 'completed' : 'processing'),
    stage,
    progress,
    error: error || null,
    updatedAt: new Date().toISOString()
  });
}

// Async processing function
async function processRFP(filePath, processingId, originalName) {
  try {
    console.log(`[RFP] Starting processing for ${processingId}`);
    updateStatus(processingId, 'loading', 10);

    // Step 1: Load and analyze PDF
    console.log('[RFP] Step 1: Analyzing PDF...');
    const splitter = new DocumentSplitter(config);
    const analysis = await splitter.analyzePDF(filePath);

    if (!analysis.success || !analysis.textExtracted) {
      throw new Error('PDF text extraction failed');
    }

    // Extract text from PDF again since analyzePDF doesn't return it
    const textData = await splitter.extractText(filePath);
    console.log(`[RFP] PDF analyzed: ${textData.text.length} characters extracted`);
    updateStatus(processingId, 'extracting', 30);

    // Step 2: Extract structured data with AI
    console.log('[RFP] Step 2: Extracting with AI...');
    const extractor = new AIExtractionEngine(config);
    const extraction = await extractor.extractFromText(
      textData.text,
      { sourceFile: originalName }
    );
    console.log('[RFP] Extraction complete. Data keys:', Object.keys(extraction.data || {}));
    updateStatus(processingId, 'mapping', 60);

    // Step 3: Map services
    console.log('[RFP] Step 3: Mapping services...');
    const services = extraction.data?.services || extraction.services || [];
    console.log(`[RFP] Found ${services.length} services to map`);
    const mapper = new ServiceMappingEngine(config);
    const mappedServices = await mapper.mapServices(services);
    console.log(`[RFP] Service mapping complete: ${mappedServices.length} services mapped`);
    updateStatus(processingId, 'finalizing', 80);

    // Step 4: Save extraction results
    const result = {
      ...extraction,
      serviceMappings: mappedServices,
      pdfAnalysis: analysis,
      processingId,
      originalFileName: originalName
    };

    // Store extraction data
    const extractionId = extraction.extractionId;
    extractionData.set(extractionId, result);

    // Save to file system
    const extractionDir = path.join(__dirname, '../../data/rfp-extractions');
    await fs.mkdir(extractionDir, { recursive: true });
    await fs.writeFile(
      path.join(extractionDir, `${extractionId}.json`),
      JSON.stringify(result, null, 2)
    );

    // Update status to completed
    updateStatus(processingId, 'completed', 100);
    processingStatus.get(processingId).extractionId = extractionId;
    processingStatus.get(processingId).result = {
      services: (extraction.data?.services || []).length,
      confidence: extraction.confidence || 0
    };

    return result;
  } catch (error) {
    updateStatus(processingId, 'failed', 0, error.message);
    throw error;
  }
}

/**
 * POST /api/rfp/upload
 * Upload RFP PDF file and start async processing
 */
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const processingId = `proc_${Date.now()}`;
    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // Initialize processing status
    processingStatus.set(processingId, {
      processingId,
      status: 'processing',
      stage: 'uploaded',
      progress: 0,
      fileName: originalName,
      fileSize: req.file.size,
      startTime: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 30000).toISOString() // 30 seconds estimate
    });

    // Start async processing (don't await)
    processRFP(filePath, processingId, originalName).catch(error => {
      console.error('RFP processing error:', error);
    });

    // Return immediately with processingId
    res.json({
      success: true,
      processingId,
      message: 'File uploaded successfully. Processing started.',
      fileName: originalName,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: 'UPLOAD_FAILED'
    });
  }
});

/**
 * GET /api/rfp/status/:processingId
 * Check processing status and get progress updates
 */
router.get('/status/:processingId', (req, res) => {
  try {
    const { processingId } = req.params;
    const status = processingStatus.get(processingId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Processing ID not found',
        errorCode: 'NOT_FOUND'
      });
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: 'STATUS_CHECK_FAILED'
    });
  }
});

/**
 * GET /api/rfp/extraction/:extractionId
 * Retrieve full extraction data with confidence scores
 */
router.get('/extraction/:extractionId', async (req, res) => {
  try {
    const { extractionId } = req.params;

    // Try memory first
    let extraction = extractionData.get(extractionId);

    // If not in memory, try loading from file
    if (!extraction) {
      const extractionPath = path.join(
        __dirname,
        '../../data/rfp-extractions',
        `${extractionId}.json`
      );

      try {
        const fileContent = await fs.readFile(extractionPath, 'utf8');
        extraction = JSON.parse(fileContent);
        // Cache in memory
        extractionData.set(extractionId, extraction);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'Extraction not found',
          errorCode: 'EXTRACTION_NOT_FOUND'
        });
      }
    }

    res.json({
      success: true,
      extraction
    });

  } catch (error) {
    console.error('Extraction retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: 'EXTRACTION_RETRIEVAL_FAILED'
    });
  }
});

/**
 * POST /api/rfp/verify/:extractionId
 * Submit user corrections and mark extraction as verified
 */
router.post('/verify/:extractionId', async (req, res) => {
  try {
    const { extractionId } = req.params;
    const corrections = req.body;

    // Get existing extraction
    let extraction = extractionData.get(extractionId);

    if (!extraction) {
      const extractionPath = path.join(
        __dirname,
        '../../data/rfp-extractions',
        `${extractionId}.json`
      );

      try {
        const fileContent = await fs.readFile(extractionPath, 'utf8');
        extraction = JSON.parse(fileContent);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'Extraction not found',
          errorCode: 'EXTRACTION_NOT_FOUND'
        });
      }
    }

    // Apply corrections
    const correctedData = {
      ...extraction,
      data: {
        ...extraction.data,
        ...corrections
      },
      verified: true,
      verifiedAt: new Date().toISOString(),
      corrections: Object.keys(corrections)
    };

    // Save corrected data
    extractionData.set(extractionId, correctedData);
    const extractionPath = path.join(
      __dirname,
      '../../data/rfp-extractions',
      `${extractionId}.json`
    );
    await fs.writeFile(extractionPath, JSON.stringify(correctedData, null, 2));

    res.json({
      success: true,
      extractionId,
      message: 'Corrections applied and extraction verified',
      correctionsApplied: Object.keys(corrections).length
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      errorCode: 'VERIFICATION_FAILED'
    });
  }
});

/**
 * GET /api/rfp/download/:processingId
 * Download processed documents as ZIP file
 */
router.get('/download/:processingId', async (req, res) => {
  try {
    const { processingId } = req.params;
    const status = processingStatus.get(processingId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Processing ID not found',
        errorCode: 'NOT_FOUND'
      });
    }

    if (status.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Processing not completed yet',
        errorCode: 'NOT_READY',
        currentStatus: status.status,
        progress: status.progress
      });
    }

    const extractionId = status.extractionId;
    const extractionPath = path.join(
      __dirname,
      '../../data/rfp-extractions',
      `${extractionId}.json`
    );

    // Create ZIP archive
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=rfp_${processingId}.zip`);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    // Add extraction data JSON
    archive.file(extractionPath, { name: 'extraction_data.json' });

    // TODO Phase 3: Add fillable PDF forms here
    // archive.file(fillablePdfPath, { name: 'bid_form.pdf' });

    await archive.finalize();

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
        errorCode: 'DOWNLOAD_FAILED'
      });
    }
  }
});

/**
 * DELETE /api/rfp/cleanup/:processingId
 * Clean up processing data and files (admin endpoint)
 */
router.delete('/cleanup/:processingId', async (req, res) => {
  try {
    const { processingId } = req.params;
    const status = processingStatus.get(processingId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Processing ID not found'
      });
    }

    // Delete processing status
    processingStatus.delete(processingId);

    // Delete extraction data if exists
    if (status.extractionId) {
      extractionData.delete(status.extractionId);

      const extractionPath = path.join(
        __dirname,
        '../../data/rfp-extractions',
        `${status.extractionId}.json`
      );

      try {
        await fs.unlink(extractionPath);
      } catch (error) {
        // File may not exist, ignore
      }
    }

    res.json({
      success: true,
      message: 'Processing data cleaned up successfully'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/rfp/list
 * List all processing jobs (admin endpoint)
 */
router.get('/list', (req, res) => {
  try {
    const jobs = Array.from(processingStatus.values()).map(status => ({
      processingId: status.processingId,
      fileName: status.fileName,
      status: status.status,
      progress: status.progress,
      startTime: status.startTime,
      updatedAt: status.updatedAt
    }));

    res.json({
      success: true,
      jobs,
      total: jobs.length
    });

  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Periodic cleanup of old processing jobs
setInterval(() => {
  const now = Date.now();
  const maxAge = config.status.maxAge;

  for (const [processingId, status] of processingStatus.entries()) {
    const age = now - new Date(status.startTime).getTime();

    if (age > maxAge) {
      processingStatus.delete(processingId);
      console.log(`Cleaned up old processing job: ${processingId}`);
    }
  }
}, config.status.cleanupInterval);

module.exports = router;
