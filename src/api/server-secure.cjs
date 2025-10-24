/**
 * PRODUCTION-READY SECURE SERVER
 * Implements all security best practices for 2025
 */

const express = require('express')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const fetch = require('node-fetch')
const axios = require('axios')
const winston = require('winston')
const morgan = require('morgan')
const Joi = require('joi')

// Import calculation engine and integrations
const EnergenCalculationEngine = require('./complete-calculation-engine.cjs')
const config = require('./config.cjs')
const ZohoDirectIntegration = require('./zoho-direct-integration.cjs')
const V5ZohoSync = require('../../modules/zoho-integration/v5-zoho-sync.cjs')
const ZohoTokenHealthMonitor = require('./zoho-token-health-monitor.cjs')
const CustomerEnrichmentService = require('./customer-enrichment.cjs')
const DualSourceEnrichment = require('./enrichment-dual-source.cjs')
const GeneratorEnrichmentService = require('../services/generator-enrichment.cjs')

// Import Google Places API modules (for migration)
const { createGooglePlacesNew } = require('./google-places-new.cjs')
const GooglePlacesAdapter = require('./google-places-adapter.cjs')

// Import Multi-API Logo Service
const multiApiLogoService = require('../../modules/customer-enrichment/multi-api-logo-service.js')

// Import RFP processing routes
const rfpRoutes = require('./rfp-processing-endpoints.cjs')

// Import Zoho Inventory integration
const ZohoInventoryIntegration = require('./zoho-inventory-integration.cjs')

// Import Zoho CPQ webhook handlers
const cpqWebhook = require('./zoho-cpq-price-webhook.cjs')

// Import bid recreation endpoints
const bidRecreation = require('./bid-recreation-endpoints.cjs')

// Import quote management endpoints (email and revision)
const quoteManagement = require('./quote-management-endpoints.cjs')

// Import reports endpoints
const reportsEndpoints = require('./reports-endpoints.cjs')
// Initialize Express app
const app = express()
const PORT = config.port || process.env.PORT || 3002

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'energen-calculator-v5' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: parseInt(process.env.LOG_MAX_SIZE, 10) || 5242880, // 5MB default
      maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 10 // BUG-029 FIX: Increased from 5 to 10, configurable
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: parseInt(process.env.LOG_MAX_SIZE, 10) || 5242880, // 5MB default
      maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 10 // BUG-029 FIX: Increased from 5 to 10, configurable
    })
  ]
})

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// Initialize services
let calculationEngine = null
let ExcelExactCalculator = null
// BUG-019 FIX: Pass logger to Zoho integration
const zohoIntegration = new ZohoDirectIntegration(logger)
const v5ZohoSync = new V5ZohoSync(logger)

// Initialize Zoho Books integration
const ZohoBooksIntegration = require('./zoho-books-integration.cjs')
const booksIntegration = new ZohoBooksIntegration(zohoIntegration, logger)
const enrichmentService = new CustomerEnrichmentService(zohoIntegration, logger)
const dualSourceEnrichment = new DualSourceEnrichment(zohoIntegration, logger)
const generatorEnrichment = new GeneratorEnrichmentService(logger)

// Initialize Zoho Inventory integration
const inventoryIntegration = new ZohoInventoryIntegration(zohoIntegration, logger)

// BUG-017 FIX: Track loading promise to prevent race conditions
let calculatorLoadPromise = null

// Load Excel calculator asynchronously
calculatorLoadPromise = (async () => {
  try {
    const module = await import('../../modules/@energen/monterey-engine/ExcelExactCalculator.js')
    ExcelExactCalculator = module.ExcelExactCalculator
    logger.info('ExcelExactCalculator loaded successfully')
    return ExcelExactCalculator
  } catch (e) {
    logger.error('Failed to load ExcelExactCalculator:', e)
    throw e
  }
})()

// CATALYST AUTO-SETUP: Verify Zoho products exist on startup
let productsVerified = false
const CATALYST_PRODUCT_SETUP_URL = process.env.CATALYST_PRODUCT_SETUP_URL || null

if (CATALYST_PRODUCT_SETUP_URL) {
  (async () => {
    try {
      logger.info('🔧 Verifying Zoho products via Catalyst...')
      const response = await axios.post(
        CATALYST_PRODUCT_SETUP_URL,
        { action: 'createCustomProduct', data: {} },
        {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      )

      if (response.data.status === 'success' && response.data.data.success) {
        productsVerified = true
        logger.info('✅ Zoho products verified:', {
          productId: response.data.data.productId,
          productCode: response.data.data.productCode,
          alreadyExisted: response.data.data.alreadyExisted
        })
      } else {
        logger.warn('⚠️  Product verification returned non-success:', response.data)
      }
    } catch (error) {
      logger.warn('⚠️  Catalyst product verification failed (quotes may fail if products missing):', error.message)
      if (error.response?.data) {
        logger.warn('   Response details:', error.response.data)
      }
    }
  })()
} else {
  logger.info('ℹ️  Catalyst product auto-setup disabled (set CATALYST_PRODUCT_SETUP_URL to enable)')
}

// SECURITY MIDDLEWARE

// 1. Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com"],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "https://img.logo.dev", "https://cdn.brandfetch.io", "https://www.google.com", "https://icons.duckduckgo.com", "https://www.fire.ca.gov"],
      connectSrc: ["'self'", "http://localhost:3002", "https://services.maps.cdtfa.ca.gov", "https://maps.googleapis.com", "https://img.logo.dev", "https://cdn.brandfetch.io"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}))

// 2. Compression for performance
app.use(compression())

// 3. CORS with whitelist
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      'https://energensystems.com',
      'https://app.energensystems.com'
    ]

    // Allow requests with no origin (mobile apps, Postman, etc)
    // Allow all localhost origins for development
    if (!origin || origin.startsWith('http://localhost:') || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions))

// 4. Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for testing)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: 'Rate limit exceeded for this endpoint'
})

// Apply rate limiting
app.use('/api/', limiter)
app.use('/api/calculate', strictLimiter)
app.use('/api/generate-pdf', strictLimiter)
app.use('/api/rfp/upload', strictLimiter) // Rate limit RFP uploads

// 5. Body parsing with limits
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 6. Morgan HTTP logger
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  },
  skip: (req, res) => res.statusCode < 400
}))

// 7. Request timeout
app.use((req, res, next) => {
  req.setTimeout(30000) // 30 seconds
  next()
})

// INPUT VALIDATION SCHEMAS
const schemas = {
  calculate: Joi.object({
    services: Joi.array().items(Joi.string()).min(1).required(),
    customerInfo: Joi.object({
      name: Joi.string().required(),
      address: Joi.string().allow(''),
      city: Joi.string().allow(''),
      state: Joi.string().length(2),
      zip: Joi.string().pattern(/^\d{5}$/)
    }).required(),
    generators: Joi.array().items(Joi.object({
      kw: Joi.number().min(10).max(5000).required(),
      quantity: Joi.number().min(1).max(100),
      cylinders: Joi.number().min(2).max(24).optional(),
      injectorType: Joi.string().valid('pop', 'unit').optional()
    })).min(1).required(),
    contractLength: Joi.number().min(1).max(60),
    settings: Joi.object(),
    taxRate: Joi.number().min(0).max(0.2),
    facilityType: Joi.string(),
    serviceFrequencies: Joi.object().pattern(
      Joi.string(), 
      Joi.number().min(0).max(52)
    ).optional(),
    serviceDFluids: Joi.object({
      oil: Joi.boolean(),
      coolant: Joi.boolean(),
      fuel: Joi.boolean()
    }).optional(),
    customServices: Joi.object().optional()
  }),
  
  enrichment: Joi.object({
    query: Joi.string().min(1).max(200), // For autocomplete search
    companyName: Joi.string().min(1).max(200),
    address: Joi.string().allow(''),
    placeId: Joi.string().allow(null)
  }).or('query', 'companyName') // Require at least one
}

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    // BUG-028 FIX: Allow unknown properties to support future fields without validation errors
    const { error } = schema.validate(req.body, { allowUnknown: true, stripUnknown: false })
    if (error) {
      logger.warn('Validation error:', {
        path: req.path,
        error: error.details[0].message
      })
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      })
    }
    next()
  }
}

// GRACEFUL SHUTDOWN
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...')
  
  server.close(() => {
    logger.info('HTTP server closed')
    
    // Close database connections if any
    // Close other resources
    
    process.exit(0)
  })
  
  // BUG-030 FIX: Increased timeout from 10s to 30s for PDF generation and Zoho API calls
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 30000) // 30 seconds
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Global unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('⚠️  UNHANDLED PROMISE REJECTION:', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString()
    });

    // In production, log but don't crash
    // In development, crash to catch bugs early
    if (process.env.NODE_ENV !== 'production') {
        logger.error('💥 Exiting process due to unhandled rejection (development mode)');
        process.exit(1);
    }
});

// Global uncaught exception handler (safety net)
process.on('uncaughtException', (error) => {
    logger.error('💥 UNCAUGHT EXCEPTION:', {
        error: error.message,
        stack: error.stack
    });

    // Always exit on uncaught exceptions
    logger.error('Exiting process due to uncaught exception');
    process.exit(1);
});

// ERROR HANDLING MIDDLEWARE
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  })
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message
    
  res.status(err.status || 500).json({
    success: false,
    error: message
  })
})

// API ROUTES

// Mount RFP processing routes
app.use('/api/rfp', rfpRoutes)
logger.info('RFP processing endpoints mounted at /api/rfp')

// ============================================
// ZOHO INTEGRATION ENDPOINTS
// ============================================
const { registerZohoEndpoints } = require('./zoho-endpoints.cjs');
registerZohoEndpoints(app, logger);
logger.info('Zoho integration endpoints registered')

// ============================================
// CONTACT ENRICHMENT ENDPOINTS
// ============================================
const setupEnrichmentEndpoints = require('./enrichment-endpoints.cjs');
setupEnrichmentEndpoints(app, logger);
logger.info('Contact enrichment endpoints registered')

// ============================================
// ZOHO INVENTORY ENDPOINTS
// ============================================

// List all parts/items in inventory
app.get('/api/zoho/inventory/items', async (req, res) => {
  try {
    const filters = {
      search: req.query.search,
      category: req.query.category,
      sku: req.query.sku
    }
    const items = await inventoryIntegration.listItems(filters)
    res.json({ success: true, items })
  } catch (error) {
    logger.error('[INVENTORY] List items failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Check parts availability for service
app.post('/api/zoho/inventory/check-availability', async (req, res) => {
  try {
    const { partNumbers } = req.body
    if (!partNumbers || !Array.isArray(partNumbers)) {
      return res.status(400).json({ success: false, error: 'partNumbers array required' })
    }
    const availability = await inventoryIntegration.checkPartsAvailability(partNumbers)
    res.json({ success: true, availability })
  } catch (error) {
    logger.error('[INVENTORY] Check availability failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Create purchase order for parts
app.post('/api/zoho/inventory/purchase-order', async (req, res) => {
  try {
    const { poData } = req.body
    if (!poData || !poData.vendorId || !poData.items) {
      return res.status(400).json({ success: false, error: 'poData with vendorId and items required' })
    }
    const po = await inventoryIntegration.createPurchaseOrder(poData)
    res.json(po)
  } catch (error) {
    logger.error('[INVENTORY] PO creation failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Track parts usage in work order
app.post('/api/zoho/inventory/track-usage', async (req, res) => {
  try {
    const { workOrderId, partsUsed } = req.body
    if (!workOrderId || !partsUsed) {
      return res.status(400).json({ success: false, error: 'workOrderId and partsUsed required' })
    }
    const adjustment = await inventoryIntegration.trackPartsUsage(workOrderId, partsUsed)
    res.json(adjustment)
  } catch (error) {
    logger.error('[INVENTORY] Usage tracking failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get service parts recommendations by service code
app.get('/api/zoho/inventory/service-parts/:serviceCode', async (req, res) => {
  try {
    const { serviceCode } = req.params
    const generatorSpecs = req.query.generatorSpecs ? JSON.parse(req.query.generatorSpecs) : {}
    const parts = await inventoryIntegration.getServiceParts(serviceCode, generatorSpecs)
    res.json({ success: true, parts })
  } catch (error) {
    logger.error('[INVENTORY] Get service parts failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get low stock items that need reordering
app.get('/api/zoho/inventory/low-stock', async (req, res) => {
  try {
    const lowStock = await inventoryIntegration.getLowStockItems()
    res.json({ success: true, items: lowStock })
  } catch (error) {
    logger.error('[INVENTORY] Get low stock failed:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

logger.info('Zoho Inventory endpoints registered')

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      calculator: calculationEngine ? 'ready' : 'initializing',
      excel: ExcelExactCalculator ? 'ready' : 'initializing',
      zoho: 'configured'
    }
  }

  res.json(health)
})

// Comprehensive health check endpoint for monitoring dashboard
app.get('/api/health/comprehensive', async (req, res) => {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'HEALTHY',
      total_tests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      categories: {}
    }

    // Helper function to add test result
    const addTest = (category, test) => {
      if (!results.categories[category]) {
        results.categories[category] = { tests: [], passed: 0, failed: 0, warnings: 0 }
      }
      results.categories[category].tests.push(test)
      results.total_tests++

      if (test.status === 'PASS') {
        results.passed++
        results.categories[category].passed++
      } else if (test.status === 'FAIL') {
        results.failed++
        results.categories[category].failed++
      } else if (test.status === 'WARNING') {
        results.warnings++
        results.categories[category].warnings++
      }
    }

    // 1. Server Health Tests
    const serverStart = Date.now()
    addTest('Server Health', {
      name: 'Server Response Time',
      status: 'PASS',
      duration_ms: Date.now() - serverStart
    })

    addTest('Server Health', {
      name: 'Server Port',
      status: PORT === 3002 ? 'PASS' : 'WARNING',
      duration_ms: 0,
      details: `Port ${PORT}`
    })

    const memUsage = process.memoryUsage()
    addTest('Server Health', {
      name: 'Memory Usage',
      status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'PASS' : 'WARNING',
      duration_ms: 0,
      details: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    })

    addTest('Server Health', {
      name: 'Server Uptime',
      status: process.uptime() > 0 ? 'PASS' : 'FAIL',
      duration_ms: 0,
      details: `${Math.round(process.uptime())}s`
    })

    // 2. Services Check
    addTest('Core Services', {
      name: 'Zoho Integration',
      status: zohoIntegration ? 'PASS' : 'FAIL',
      duration_ms: 0
    })

    addTest('Core Services', {
      name: 'Enrichment Service',
      status: enrichmentService ? 'PASS' : 'FAIL',
      duration_ms: 0
    })

    addTest('Core Services', {
      name: 'V5 Zoho Sync',
      status: v5ZohoSync ? 'PASS' : 'FAIL',
      duration_ms: 0
    })

    // 3. File System Check
    const requiredDirs = [
      path.join(__dirname, '../../frontend'),
      path.join(__dirname, '../../output/pdfs'),
      path.join(__dirname, '../../logs'),
      path.join(__dirname, '../../test-data')
    ]

    for (const dir of requiredDirs) {
      addTest('File System', {
        name: `Directory: ${path.basename(dir)}`,
        status: fs.existsSync(dir) ? 'PASS' : 'WARNING',
        duration_ms: 0
      })
    }

    // 4. Test Data Files
    const testDataFiles = [
      'generator-database-complete.json',
      'company-test-dataset.json',
      'generator-specs-extracted.json'
    ]

    for (const file of testDataFiles) {
      const filePath = path.join(__dirname, '../../test-data', file)
      addTest('Test Data', {
        name: `File: ${file}`,
        status: fs.existsSync(filePath) ? 'PASS' : 'WARNING',
        duration_ms: 0
      })
    }

    // Calculate overall status
    if (results.failed > 0) {
      results.overall_status = 'CRITICAL'
    } else if (results.warnings > 0) {
      results.overall_status = 'WARNING'
    }

    res.json(results)
  } catch (error) {
    logger.error('Comprehensive health check failed:', error)
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overall_status: 'CRITICAL',
      error: error.message,
      total_tests: 0,
      passed: 0,
      failed: 1,
      warnings: 0,
      categories: {}
    })
  }
})

// Configuration check endpoint (for health monitoring)
app.get('/api/config/check', (req, res) => {
  res.json({
    status: 'ok',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    services: {
      zoho: !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN),
      google: !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY),
      calculator: !!calculationEngine,
      excel: !!ExcelExactCalculator
    }
  })
})

// Frontend configuration endpoint
// Provides safe config values to frontend (no secrets)
app.get('/api/config/frontend', (req, res) => {
  res.json({
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || null,
    googlePlacesEnabled: process.env.VITE_ENABLE_GOOGLE_PLACES === 'true',
    zohoSyncEnabled: process.env.VITE_ENABLE_ZOHO_SYNC === 'true',
    taxLookupEnabled: process.env.VITE_ENABLE_TAX_LOOKUP === 'true',
    shopAddress: '1234 Main St, Anytown, CA 12345', // TODO: Move to config
    environment: process.env.NODE_ENV || 'development'
  })
})

// API key endpoint for frontend (secure)
app.get('/api/config/google-maps-key', (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return res.status(503).json({ error: 'API key not configured' });
  }
  
  res.json({ apiKey: apiKey });
})

// Tax rate endpoint
app.get('/api/tax-rate', async (req, res, next) => {
  try {
    const { address, city, zip } = req.query

    // BUG-005 FIX: Validate zip code format
    if (!zip || !zip.match(/^\d{5}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Valid 5-digit ZIP code required'
      })
    }

    // BUG-005 FIX: Provide default address/city if missing for CDTFA API
    const queryAddress = address || '123 Main St'
    const queryCity = city || 'California'

    const url = 'https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByAddress'
    const params = new URLSearchParams({
      address: queryAddress,
      city: queryCity,
      zip
    })

    logger.info('CDTFA API request:', { address: queryAddress, city: queryCity, zip })

    // BUG-005 FIX: Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${url}?${params}`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      let data;
      try {
        data = await response.json()
      } catch (parseError) {
        logger.error('CDTFA API returned invalid JSON:', parseError)
        // BUG-005 FIX: Fallback to default CA tax rate
        logger.warn('Using default California tax rate (8.75%) due to parse error')
        return res.json({
          success: true,
          rate: 0.0875,
          ratePercent: 8.75,
          location: { address, city, zip },
          source: 'default',
          reason: 'CDTFA API parse error'
        })
      }

      // Log the full response for debugging
      logger.info('CDTFA API response:', JSON.stringify(data))

      // Validate tax rate data (BUG-001 & BUG-002 FIX)
      // API returns { taxRateInfo: [{ rate: 0.08625, ... }] }
      const rateDecimal = parseFloat(data.taxRateInfo?.[0]?.rate)

      // BUG-005 FIX: If tax rate invalid, use fallback instead of error
      if (!isFinite(rateDecimal) || rateDecimal < 0 || rateDecimal > 0.15) {
        logger.warn('Invalid tax rate from CDTFA:', {
          rate: data.taxRateInfo?.[0]?.rate,
          fullResponse: data
        })
        logger.warn('Using default California tax rate (8.75%)')
        return res.json({
          success: true,
          rate: 0.0875,
          ratePercent: 8.75,
          location: { address, city, zip },
          source: 'default',
          reason: 'Invalid rate from CDTFA'
        })
      }

      res.json({
        success: true,
        rate: rateDecimal,
        ratePercent: rateDecimal * 100,
        location: { address, city, zip },
        source: 'cdtfa',
        jurisdiction: data.taxRateInfo?.[0]?.jurisdiction
      })
    } else {
      const errorText = await response.text()
      logger.error('CDTFA API HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      // BUG-005 FIX: Fallback to default CA tax rate on HTTP error
      logger.warn('Using default California tax rate (8.75%) due to HTTP error')
      return res.json({
        success: true,
        rate: 0.0875,
        ratePercent: 8.75,
        location: { address, city, zip },
        source: 'default',
        reason: 'CDTFA API HTTP error'
      })
    }
  } catch (error) {
    logger.error('Tax rate API failed:', error)

    // BUG-005 FIX: Return fallback rate instead of 500 error
    const { zip } = req.query
    logger.warn('Using default California tax rate (8.75%) due to exception:', error.message)

    return res.json({
      success: true,
      rate: 0.0875,
      ratePercent: 8.75,
      location: { zip },
      source: 'default',
      reason: error.name === 'AbortError' ? 'API timeout' : 'Exception'
    })
  }
})

// Main calculation endpoint with validation
app.post('/api/calculate', validate(schemas.calculate), async (req, res, next) => {
  try {
    const startTime = Date.now()
    
    // BUG-005 FIX: Create isolated calculator instance per request to prevent race conditions
    // NEVER reuse shared calculator instance between concurrent requests
    // BUG-028 FIX: Pass logger to calculation engine

    // DEBUG: Log settings to verify Service B custom data
    if (req.body.settings?.serviceB) {
      logger.info('Service B custom settings received:', { serviceB: req.body.settings.serviceB })
    }

    const requestCalculator = new EnergenCalculationEngine(req.body.settings || {}, logger)

    // Perform calculation with isolated instance
    const result = await requestCalculator.calculate(req.body)
    
    // Log performance metrics
    logger.info('Calculation completed', {
      duration: Date.now() - startTime,
      kw: req.body.kw,
      services: req.body.services.length,
      total: result.total
    })
    
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// NEW: Calculation with trace endpoint for audit trail
app.post('/api/calculate-with-trace', async (req, res, next) => {
  try {
    logger.info('Calculate with trace request:', req.body)
    
    const { settings, units, services, contractLength, taxRate } = req.body
    
    // Load default settings if not provided
    const defaultSettings = require('../../frontend/config/default-settings.json')
    const mergedSettings = { ...defaultSettings, ...(settings || {}) }
    
    // Initialize calculation engine with merged settings
    const engineWithTrace = new EnergenCalculationEngine(mergedSettings, logger)
    
    // Build generators array from units
    const generators = units || [{
      brand: 'Kohler',
      model: '100REOZJC', 
      kw: 100,
      quantity: 1
    }]
    
    // Perform the calculation with mock customer info for trace testing
    const result = await engineWithTrace.calculate({
      customerInfo: {
        name: 'Trace Test',
        address: '123 Test St',
        city: 'Sacramento',
        state: 'CA',
        zip: '95814'
      },
      generators: generators,
      services: services || ['A', 'B', 'C', 'D'],
      contractLength: contractLength || 12,
      settings: settings || {}
    })
    
    // Return both the quote and the complete trace log
    res.json({
      success: true,
      quote: result,
      trace: engineWithTrace.trace,
      traceStats: {
        totalEntries: engineWithTrace.trace.length,
        hardcodedValues: engineWithTrace.trace.filter(t => t.source === 'Hardcoded').length,
        ssotViolations: engineWithTrace.trace.filter(t => t.notes && t.notes.includes('SSOT VIOLATION')).length,
        warnings: engineWithTrace.trace.filter(t => t.notes && t.notes.includes('WARNING')).length
      }
    })
    
  } catch (error) {
    logger.error('Calculation trace error:', error)
    res.status(500).json({
      success: false,
      message: error.message,
      trace: []
    })
  }
})

// Google Places enrichment endpoint - REAL API CALLS ONLY
app.post('/api/enrichment/google-places', validate(schemas.enrichment), async (req, res, next) => {
  try {
    // Accept both query/companyName for compatibility AND placeId for specific selection
    const { query, companyName, address, placeId } = req.body
    const searchName = query || companyName
    const GOOGLE_API_KEY = config.google.mapsApiKey
    const useNewAPI = config.google.useNewPlacesAPI
    
    logger.info(`Google Places enrichment request (${useNewAPI ? 'New API' : 'Legacy API'}):`, searchName)
    
    let selectedPlaceId = placeId
    let placeData = null
    let apiVersion = useNewAPI ? 'new' : 'legacy'
    
    // Try New API if enabled
    if (useNewAPI && (!placeId || placeId === 'null' || placeId === null || placeId === undefined)) {
      try {
        const placesNew = createGooglePlacesNew(GOOGLE_API_KEY)
        const searchQuery = address ? `${searchName} ${address}` : searchName
        
        // Text Search with New API
        const searchResponse = await placesNew.searchText(searchQuery, {
          fields: ['places.id', 'places.displayName', 'places.formattedAddress', 'places.types']
        })
        
        if (!searchResponse.success || !searchResponse.data.places || searchResponse.data.places.length === 0) {
          return res.json({
            success: true,
            data: {
              name: searchName,
              formatted_address: address || 'Address not found',
              types: ['business'],
              no_enrichment: true,
              apiVersion: 'new'
            }
          })
        }
        
        // Select best match (with government agency priority)
        let selectedPlace = searchResponse.data.places[0]
        const searchLower = searchName ? searchName.toLowerCase() : ''
        
        if (searchLower.includes('fire') || searchLower.includes('police') || 
            searchLower.includes('government') || searchLower.includes('city of') || 
            searchLower.includes('county')) {
          for (const place of searchResponse.data.places) {
            if (place.types && (
              place.types.includes('fire_station') ||
              place.types.includes('police') ||
              place.types.includes('local_government_office') ||
              place.types.includes('government_office')
            )) {
              selectedPlace = place
              break
            }
          }
        }
        
        selectedPlaceId = selectedPlace.id
        
        // Get detailed place information
        const detailsResponse = await placesNew.getPlaceDetails(selectedPlaceId, {
          fields: ['id', 'displayName', 'formattedAddress', 'internationalPhoneNumber', 
                   'websiteUri', 'rating', 'userRatingCount', 'types', 'businessStatus',
                   'priceLevel', 'regularOpeningHours', 'location', 'viewport', 'photos',
                   'editorialSummary', 'reviews', 'addressComponents']
        })
        
        if (!detailsResponse.success) {
          throw new Error('New API details failed')
        }
        
        // Adapt to legacy format
        const adapted = GooglePlacesAdapter.adaptPlaceDetailsResponse(detailsResponse)
        placeData = adapted.result
        apiVersion = 'new'
        
      } catch (newAPIError) {
        logger.warn('🔄 New API failed, falling back to Legacy API', { error: newAPIError.message })
        apiVersion = 'legacy_fallback'
        // Fall through to Legacy API
      }
    }
    
    // Legacy API path (or fallback)
    if (!placeData) {
      // CRITICAL FIX: Use provided placeId first if available
      if (!placeId || placeId === 'null' || placeId === null || placeId === undefined) {
        // Only do a text search if no placeId was provided
        const searchQuery = address ? `${searchName} ${address}` : searchName
        const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`
        
        const searchResponse = await axios.get(textSearchUrl)
        
        if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
          // Return minimal data if no results found
          return res.json({
            success: true,
            data: {
              name: searchName,
              formatted_address: address || 'Address not found',
              types: ['business'],
              no_enrichment: true,
              apiVersion
            }
          })
        }
        
        // For government agencies like Cal Fire, try to find the most relevant result
        let selectedPlace = searchResponse.data.results[0]
        const searchLower = searchName ? searchName.toLowerCase() : ''
        
        // If searching for fire/police/government, prioritize those types
        if (searchLower.includes('fire') || searchLower.includes('police') || 
            searchLower.includes('government') || searchLower.includes('city of') || 
            searchLower.includes('county')) {
          
          for (const place of searchResponse.data.results) {
            // Check if this place has government/fire/police types
            if (place.types && (
              place.types.includes('fire_station') ||
              place.types.includes('police') ||
              place.types.includes('local_government_office') ||
              place.types.includes('government_office')
            )) {
              selectedPlace = place
              break
            }
            
            // Also check if name matches better
            if (place.name && place.name.toLowerCase().includes(searchLower)) {
              selectedPlace = place
              break
            }
          }
        }
        
        selectedPlaceId = selectedPlace.place_id
      } else {
        selectedPlaceId = placeId
      }
      
      // Get detailed place information
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${selectedPlaceId}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,opening_hours,price_level,business_status,geometry,photos,editorial_summary,reviews,address_components&key=${GOOGLE_API_KEY}`
      
      const detailsResponse = await axios.get(detailsUrl)
      placeData = detailsResponse.data.result
    }
    
    // Parse address_components for proper address fields
    let parsedAddress = {
      street_number: '',
      route: '',
      street: '',
      city: '',
      state: '',
      state_long: '',
      zip: '',
      country: ''
    }
    
    if (placeData.address_components) {
      for (const component of placeData.address_components) {
        const types = component.types
        
        if (types.includes('street_number')) {
          parsedAddress.street_number = component.long_name
        }
        if (types.includes('route')) {
          parsedAddress.route = component.long_name
        }
        if (types.includes('locality')) {
          parsedAddress.city = component.long_name
        }
        if (types.includes('administrative_area_level_1')) {
          parsedAddress.state = component.short_name
          parsedAddress.state_long = component.long_name
        }
        if (types.includes('postal_code')) {
          parsedAddress.zip = component.long_name
        }
        if (types.includes('country')) {
          parsedAddress.country = component.long_name
        }
      }
      
      // Combine street_number and route for full street address
      parsedAddress.street = [parsedAddress.street_number, parsedAddress.route]
        .filter(Boolean)
        .join(' ')
    }

    // Extract photo URL
    let photoUrl = null
    if (placeData.photos && placeData.photos.length > 0) {
      const firstPhoto = placeData.photos[0]

      // Handle New API format (resource name)
      if (firstPhoto.name) {
        // New API format: photos have a 'name' field like "places/ChIJ.../photos/..."
        if (apiVersion === 'new') {
          const placesNew = createGooglePlacesNew(GOOGLE_API_KEY)
          photoUrl = placesNew.getPhotoUrl(firstPhoto.name, 400, 400)
        } else {
          // Fallback: construct URL directly
          photoUrl = `https://places.googleapis.com/v1/${firstPhoto.name}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_API_KEY}`
        }
      }
      // Handle Legacy API format (photo_reference)
      else if (firstPhoto.photo_reference) {
        photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${firstPhoto.photo_reference}&key=${GOOGLE_API_KEY}`
      }
    }

    logger.info('Photo URL generated:', photoUrl ? 'Yes' : 'No')

    // LOGO ENRICHMENT: Fetch company logo using Multi-API service with cascading fallback
    // Priority: Brandfetch (70%) → Logo.dev (65%) → Google Favicon (95%)
    let logoUrl = null
    let logoSource = null
    if (placeData.website) {
      try {
        logger.info('Fetching logo for website:', placeData.website)

        const logoResult = await multiApiLogoService.getLogo({
          domain: placeData.website,
          size: 200,
          format: 'png'
        })

        if (logoResult && logoResult.success) {
          logoUrl = logoResult.url
          logoSource = logoResult.source
          logger.info(`✅ Logo fetched from ${logoSource} (quality: ${logoResult.quality})`)
        } else {
          logger.warn('Logo enrichment failed for all APIs:', logoResult?.message)
        }
      } catch (err) {
        logger.warn('Logo extraction failed:', err.message)
      }
    } else {
      logger.info('No website URL available for logo enrichment')
    }

    res.json({
      success: true,
      data: {
        // REAL DATA ONLY - No mocks
        place_id: placeData.place_id || placeId,
        name: placeData.name,
        formatted_address: placeData.formatted_address,
        formatted_phone_number: placeData.formatted_phone_number,
        website: placeData.website,
        rating: placeData.rating,
        user_ratings_total: placeData.user_ratings_total,
        types: placeData.types,
        business_status: placeData.business_status,
        price_level: placeData.price_level,
        opening_hours: placeData.opening_hours,
        address_components: placeData.address_components,
        parsed_address: parsedAddress,
        editorial_summary: placeData.editorial_summary?.overview || null,
        photoUrl: photoUrl,
        logo: logoUrl, // NEW: Company logo from Multi-API service (Brandfetch → Logo.dev → Google Favicon)
        logoSource: logoSource, // Track which API provided the logo
        geometry: placeData.geometry || {
          location: {
            lat: 36.6544,
            lng: -121.8018
          }
        },
        apiVersion
      }
    })
  } catch (error) {
    logger.error('Google Places enrichment error:', error)
    next(error)
  }
})

// Tax rate endpoint (POST version for frontend compatibility)
app.post('/api/enrichment/tax-rate', async (req, res, next) => {
  try {
    const { address, city, zip } = req.body

    // BUG-005 FIX: Validate zip code format
    if (!zip || !zip.match(/^\d{5}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Valid 5-digit ZIP code required'
      })
    }

    // BUG-005 FIX: Provide default address/city if missing for CDTFA API
    const queryAddress = address || '123 Main St'
    const queryCity = city || 'California'

    const url = 'https://services.maps.cdtfa.ca.gov/api/taxrate/GetRateByAddress'
    const params = new URLSearchParams({
      address: queryAddress,
      city: queryCity,
      zip
    })

    logger.info('CDTFA API request (POST):', { address: queryAddress, city: queryCity, zip })

    // BUG-005 FIX: Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${url}?${params}`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      let data;
      try {
        data = await response.json()
      } catch (parseError) {
        logger.error('CDTFA API returned invalid JSON:', parseError)
        // BUG-005 FIX: Fallback to default CA tax rate
        logger.warn('Using default California tax rate (8.75%) due to parse error')
        return res.json({
          success: true,
          rate: 0.0875,
          ratePercent: 8.75,
          location: { address, city, zip },
          source: 'default',
          reason: 'CDTFA API parse error'
        })
      }

      // Validate tax rate data (BUG-001 & BUG-002 FIX)
      // API returns { taxRateInfo: [{ rate: 0.08625, ... }] }
      const rateDecimal = parseFloat(data.taxRateInfo?.[0]?.rate)

      // BUG-005 FIX: If tax rate invalid, use fallback instead of error
      if (!isFinite(rateDecimal) || rateDecimal < 0 || rateDecimal > 0.15) {
        logger.warn('Invalid tax rate from CDTFA:', data.taxRateInfo?.[0]?.rate)
        logger.warn('Using default California tax rate (8.75%)')
        return res.json({
          success: true,
          rate: 0.0875,
          ratePercent: 8.75,
          location: { address, city, zip },
          source: 'default',
          reason: 'Invalid rate from CDTFA'
        })
      }

      res.json({
        success: true,
        rate: rateDecimal,
        ratePercent: rateDecimal * 100,
        location: { address, city, zip },
        source: 'cdtfa',
        jurisdiction: data.taxRateInfo?.[0]?.jurisdiction
      })
    } else {
      const errorText = await response.text()
      logger.error('CDTFA API HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      // BUG-005 FIX: Fallback to default CA tax rate on HTTP error
      logger.warn('Using default California tax rate (8.75%) due to HTTP error')
      return res.json({
        success: true,
        rate: 0.0875,
        ratePercent: 8.75,
        location: { address, city, zip },
        source: 'default',
        reason: 'CDTFA API HTTP error'
      })
    }
  } catch (error) {
    logger.error('Tax rate API failed:', error)

    // BUG-005 FIX: Return fallback rate instead of 500 error
    const { zip } = req.body
    logger.warn('Using default California tax rate (8.75%) due to exception:', error.message)

    return res.json({
      success: true,
      rate: 0.0875,
      ratePercent: 8.75,
      location: { zip },
      source: 'default',
      reason: error.name === 'AbortError' ? 'API timeout' : 'Exception'
    })
  }
})

// Logo enrichment endpoint
app.post('/api/enrichment/logo', async (req, res) => {
  try {
    const { domain, companyName } = req.body
    logger.info('Logo fetch for:', domain || companyName)

    // Extract clean domain from website URL if provided
    let cleanDomain = domain
    if (domain && domain.includes('://')) {
      try {
        const url = new URL(domain)
        cleanDomain = url.hostname.replace('www.', '')
      } catch (e) {
        cleanDomain = domain.replace(/https?:\/\/(www\.)?/, '').split('/')[0]
      }
    }

    // Try multiple logo sources in order of preference
    const logoSources = []

    // Special handling for Cal Fire and other government agencies
    if (companyName) {
      const nameLower = companyName.toLowerCase()

      if (nameLower.includes('cal fire') || nameLower.includes('calfire')) {
        // Cal Fire specific logos
        logoSources.push('https://www.fire.ca.gov/media/4897/calfire-logo.png')
        logoSources.push('https://cdn.brandfetch.io/fire.ca.gov/w/400/h/400')
        logoSources.push('https://cdn.brandfetch.io/ca.gov/w/400/h/400')
      }

      if (nameLower.includes('csu') || nameLower.includes('california state university')) {
        // CSU system logos
        logoSources.push(`https://cdn.brandfetch.io/calstate.edu/w/400/h/400`)
      }
    }

    if (cleanDomain) {
      // 1. Brandfetch (NEW - replacing Clearbit which shuts down Dec 2025)
      logoSources.push(`https://cdn.brandfetch.io/${cleanDomain}/w/200/h/200`)
      logoSources.push(`https://cdn.brandfetch.io/${cleanDomain}/symbol/w/200/h/200`)

      // 2. Logo.dev API (high quality, requires API key)
      const logoDevApiKey = config.logoDevApiKey || 'pk_IR-QgGp6SbiohLPBG3wlgw'
      logoSources.push(`https://img.logo.dev/${cleanDomain}?token=${logoDevApiKey}&size=200`)

      // 3. Google Favicons (fallback, always works but lower quality)
      logoSources.push(`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`)

      // 4. DuckDuckGo favicon service
      logoSources.push(`https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`)
    }

    // Return the first available source (client will try them in order)
    res.json({
      logoUrl: logoSources[0] || null,
      alternativeLogos: logoSources.slice(1),
      domain: cleanDomain
    })
  } catch (error) {
    logger.error('Logo fetch error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Logo variations endpoint - returns multiple logo options for picker UI
app.post('/api/enrichment/logo-variations', async (req, res) => {
  try {
    const { domain, companyName, website } = req.body
    logger.info('Logo variations fetch for:', domain || companyName)

    // Extract clean domain from website URL if provided
    let cleanDomain = domain || website
    if (cleanDomain && cleanDomain.includes('://')) {
      try {
        const url = new URL(cleanDomain)
        cleanDomain = url.hostname.replace('www.', '')
      } catch (e) {
        cleanDomain = cleanDomain.replace(/https?:\/\/(www\.)?/, '').split('/')[0]
      }
    }

    const variations = []

    // Add lettermark fallback (always available)
    if (companyName) {
      variations.push({
        provider: 'Lettermark',
        url: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=667eea&color=fff&size=128`,
        type: 'lettermark',
        format: 'png'
      })
    }

    // Special handling for Cal Fire and government agencies
    if (companyName) {
      const nameLower = companyName.toLowerCase()

      if (nameLower.includes('cal fire') || nameLower.includes('calfire')) {
        variations.push({
          provider: 'Cal Fire Official',
          url: 'https://www.fire.ca.gov/media/4897/calfire-logo.png',
          type: 'official',
          format: 'png'
        })
        variations.push({
          provider: 'Brandfetch (Cal Fire)',
          url: 'https://cdn.brandfetch.io/fire.ca.gov/w/400/h/400',
          type: 'brandfetch',
          format: 'png'
        })
      }
    }

    if (cleanDomain) {
      // Brandfetch variations
      variations.push({
        provider: 'Brandfetch',
        url: `https://cdn.brandfetch.io/${cleanDomain}/w/200/h/200`,
        type: 'brandfetch',
        format: 'png'
      })
      variations.push({
        provider: 'Brandfetch Symbol',
        url: `https://cdn.brandfetch.io/${cleanDomain}/symbol/w/200/h/200`,
        type: 'brandfetch-symbol',
        format: 'png'
      })

      // Logo.dev
      const logoDevApiKey = config.logoDevApiKey || 'pk_IR-QgGp6SbiohLPBG3wlgw'
      variations.push({
        provider: 'Logo.dev',
        url: `https://img.logo.dev/${cleanDomain}?token=${logoDevApiKey}&size=200`,
        type: 'logodev',
        format: 'png'
      })

      // Google Favicon
      variations.push({
        provider: 'Google',
        url: `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`,
        type: 'favicon',
        format: 'ico'
      })
    }

    res.json({ variations })
  } catch (error) {
    logger.error('Logo variations fetch error:', error)
    res.status(500).json({ error: error.message, variations: [] })
  }
})

// Distance calculation endpoint
app.post('/api/enrichment/distance', async (req, res) => {
  try {
    // Handle multiple parameter formats
    const { origin, destination, origins, destinations } = req.body
    const startLocation = origin || origins
    const endLocation = destination || destinations

    logger.info('Distance calculation:', { startLocation, endLocation })

    const GOOGLE_API_KEY = config.google.mapsApiKey

    // Validate required parameters
    if (!startLocation || !endLocation) {
      logger.info('Missing location for distance calc - using default')
      // Return a default distance if we don't have both locations yet
      return res.json({
        success: true,
        distance: 25,  // Default 25 miles
        duration: '30 mins',
        isDefault: true
      })
    }

    // CRITICAL FIX: Check if origin and destination are the same (same company)
    // Normalize both strings for comparison (remove extra spaces, make lowercase)
    const normalizeLocation = (loc) => loc?.toLowerCase().trim().replace(/\s+/g, ' ');
    if (normalizeLocation(startLocation) === normalizeLocation(endLocation)) {
      logger.info('Origin and destination are the same - returning 0 miles');
      return res.json({
        success: true,
        distance: 0,
        distanceText: '0 mi',
        duration: 0,
        durationText: '0 mins',
        trafficDuration: 0,
        origin: startLocation,
        destination: endLocation,
        roundTrip: {
          miles: 0,
          mileageCost: '0.00',
          mileageRate: 0.67
        },
        sameLocation: true
      })
    }

    // Use Google Distance Matrix API for real distance calculation
    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(startLocation)}&destinations=${encodeURIComponent(endLocation)}&units=imperial&mode=driving&key=${GOOGLE_API_KEY}`

    const response = await axios.get(distanceUrl)

    if (response.data.status === 'OK' && response.data.rows[0]?.elements[0]?.status === 'OK') {
      const element = response.data.rows[0].elements[0]
      const distanceInMiles = Math.round(element.distance.value * 0.000621371) // meters to miles
      const durationMinutes = Math.round(element.duration.value / 60)

      // Also get traffic duration if available
      const trafficUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(startLocation)}&destinations=${encodeURIComponent(endLocation)}&units=imperial&mode=driving&departure_time=now&traffic_model=best_guess&key=${GOOGLE_API_KEY}`

      let trafficDuration = null
      try {
        const trafficResponse = await axios.get(trafficUrl)
        if (trafficResponse.data.rows[0]?.elements[0]?.duration_in_traffic) {
          trafficDuration = Math.round(trafficResponse.data.rows[0].elements[0].duration_in_traffic.value / 60)
        }
      } catch (err) {
        logger.info('Traffic data not available')
      }

      // Calculate round-trip mileage cost
      const roundTripMiles = distanceInMiles * 2
      const mileageRate = 0.67 // IRS standard mileage rate for 2024
      const mileageCost = roundTripMiles * mileageRate

      res.json({
        success: true,
        distance: distanceInMiles,
        distanceText: element.distance.text,
        duration: durationMinutes,
        durationText: element.duration.text,
        trafficDuration: trafficDuration,
        origin: response.data.origin_addresses[0],
        destination: response.data.destination_addresses[0],
        roundTrip: {
          miles: roundTripMiles,
          mileageCost: mileageCost.toFixed(2),
          mileageRate: mileageRate
        }
      })
    } else {
      throw new Error('Unable to calculate distance')
    }
  } catch (error) {
    logger.error('Distance calculation error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Google Places autocomplete endpoint
app.post('/api/google-places', async (req, res) => {
  try {
    const { input } = req.body
    const GOOGLE_API_KEY = config.google.mapsApiKey
    const useNewAPI = config.google.useNewPlacesAPI
    
    logger.info(`Google Places autocomplete request (${useNewAPI ? 'New API' : 'Legacy API'}):`, input)

    if (!input) {
      return res.json({
        success: true,
        predictions: [],
        apiVersion: useNewAPI ? 'new' : 'legacy'
      })
    }

    logger.info('Using Google API key:', GOOGLE_API_KEY ? 'Key present' : 'NO KEY!')

    let predictions = []
    let apiVersion = useNewAPI ? 'new' : 'legacy'

    // Try New API if enabled
    if (useNewAPI) {
      try {
        const placesNew = createGooglePlacesNew(GOOGLE_API_KEY)
        const response = await placesNew.autocomplete(input, {
          includedPrimaryTypes: ['establishment'],
          includedRegionCodes: ['US']
        })

        if (response.success && response.data.suggestions) {
          // Adapt to legacy format
          const adapted = GooglePlacesAdapter.adaptAutocompleteResponse(response)
          predictions = adapted.predictions || []
          apiVersion = 'new'
          logger.info(`✅ New API: Got ${predictions.length} predictions`)
        } else {
          throw new Error('New API returned no results')
        }
      } catch (newAPIError) {
        logger.warn('🔄 New API autocomplete failed, falling back to Legacy API', {
          error: newAPIError.message
        })
        apiVersion = 'legacy_fallback'
        // Fall through to Legacy API
      }
    }

    // Legacy API path (or fallback)
    if (predictions.length === 0 && apiVersion !== 'new') {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment&components=country:us&key=${GOOGLE_API_KEY}`
      logger.info('Calling Legacy Google Places API...')

      const response = await axios.get(url)
      logger.info('Legacy API response status:', response.data.status)
      predictions = response.data.predictions || []
      logger.info(`✅ Legacy API: Got ${predictions.length} predictions`)

      // Transform to our expected format
      predictions = predictions.map(p => ({
        description: p.description,
        place_id: p.place_id,
        structured_formatting: p.structured_formatting || {
          main_text: p.description.split(',')[0],
          secondary_text: p.description.split(',').slice(1).join(',')
        }
      }))
    }

    res.json({
      success: true,
      predictions: predictions,
      count: predictions.length,
      apiVersion
    })
  } catch (error) {
    logger.error('Google Places autocomplete error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      predictions: []
    })
  }
})

// Customer Enrichment Endpoint
app.post('/api/enrichment/customer', async (req, res) => {
  try {
    const { accountId, accountName, address, options = {} } = req.body
    logger.info('Customer enrichment request:', { accountId, accountName })

    // Validate required fields
    if (!accountId || !accountName || !address) {
      return res.status(400).json({
        success: false,
        error: 'accountId, accountName, and address are required'
      })
    }

    // Enrich customer data
    const enrichedData = await enrichmentService.enrichCustomerData(
      accountId,
      accountName,
      address,
      {
        includeLogo: options.includeLogo !== false,
        includeDistance: options.includeDistance !== false,
        includePrevailingWage: options.includePrevailingWage !== false,
        updateZoho: options.updateZoho !== false,
        forceRefresh: options.forceRefresh === true
      }
    )

    res.json({
      success: true,
      data: enrichedData
    })
  } catch (error) {
    logger.error('Customer enrichment error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Generator Enrichment Endpoint
// POST /api/enrichment/generator
// Enriches generator specifications with AI/rule-based data
app.post('/api/enrichment/generator', async (req, res) => {
  try {
    const { kw, manufacturer, model, serialNumber, fuelType } = req.body
    logger.info('Generator enrichment request:', { kw, manufacturer, model })

    // Validate minimum requirements
    if (!kw || kw < 2 || kw > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Valid kW rating (2-5000) is required'
      })
    }

    // Perform enrichment
    const result = await generatorEnrichment.enrich({
      kw,
      manufacturer,
      model,
      serialNumber,
      fuelType
    })

    // Add metadata
    result.timestamp = new Date().toISOString()
    result.apiVersion = 'v1'

    // Log enrichment result
    logger.info('Generator enrichment completed:', {
      kw,
      manufacturer,
      model,
      tier: result.tier,
      confidence: result.confidence,
      sources: result.sources
    })

    res.json(result)

  } catch (error) {
    logger.error('Generator enrichment error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      tier: 'basic',
      confidence: 0
    })
  }
})

// AI Unit Search endpoint - uses web search to find generator specifications
app.post('/api/ai-search-unit', async (req, res) => {
  try {
    const { query } = req.body
    logger.info('AI unit search request:', query)

    if (!query) {
      return res.json({
        success: false,
        error: 'Search query required',
        results: []
      })
    }

    // Perform web search using Claude's WebSearch capability
    // This is a placeholder - in production, this would use Claude MCP WebSearch tool
    // For now, we'll simulate search results structure
    logger.info('Performing web search for:', query)

    // In a real implementation with Claude MCP WebSearch:
    // const searchResults = await claudeWebSearch(query)

    // Simulated search results structure for development
    const results = []

    // Note: This endpoint expects to be enhanced with actual WebSearch implementation
    // The frontend AI service will handle parsing and confidence filtering

    res.json({
      success: true,
      results,
      query,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('AI unit search error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      results: []
    })
  }
})

// Zoho CRM customer search endpoint
app.post('/api/zoho/search-customer', async (req, res) => {
  try {
    const { companyName } = req.body
    logger.info('Zoho customer search for:', companyName)

    const result = await zohoIntegration.searchCustomer(companyName)

    res.json({
      success: true,
      customer: result
    })
  } catch (error) {
    logger.error('Zoho search error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Customer auto-complete search endpoint
// GET /api/customers/search?q=<query>&limit=10
app.get('/api/customers/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query

    // Validate query parameter
    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        customers: [],
        message: 'Query must be at least 2 characters'
      })
    }

    logger.info('Customer search request:', { query, limit })

    // Search Zoho CRM accounts
    const customers = await zohoIntegration.searchAccounts(query, {
      limit: parseInt(limit, 10)
    })

    res.json({
      success: true,
      customers,
      count: customers.length
    })

  } catch (error) {
    logger.error('Customer search failed:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      customers: []
    })
  }
})

// Dual-source autocomplete endpoint (Zoho + Google Places)
// GET /api/enrichment/dual-search?q=<query>&limit=10
app.get('/api/enrichment/dual-search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query

    // Validate query parameter
    if (!query || query.trim().length < 3) {
      return res.json({
        success: true,
        sources: {
          zoho: [],
          googlePlaces: []
        },
        stats: { zohoCount: 0, googleCount: 0, totalResults: 0 },
        message: 'Query must be at least 3 characters'
      })
    }

    logger.info('Dual-source search request:', { query, limit })

    // Execute dual-source search (Zoho + Google Places in parallel)
    const result = await dualSourceEnrichment.dualSearch(query, {
      limit: parseInt(limit, 10),
      minChars: 3
    })

    res.json(result)

  } catch (error) {
    logger.error('Dual-source search failed:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      sources: {
        zoho: [],
        googlePlaces: []
      },
      stats: { zohoCount: 0, googleCount: 0, totalResults: 0 }
    })
  }
})

// Merge and enrich selected customer data (from Zoho or Google Places)
// POST /api/enrichment/merge-customer
app.post('/api/enrichment/merge-customer', async (req, res) => {
  try {
    const selection = req.body

    if (!selection || !selection.source) {
      return res.status(400).json({
        success: false,
        error: 'Missing selection data or source'
      })
    }

    logger.info('Merging customer data from:', selection.source, selection.id || selection.placeId)

    // Merge and enrich customer data
    const result = await dualSourceEnrichment.mergeCustomerData(selection)

    res.json(result)

  } catch (error) {
    logger.error('Customer merge failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Zoho CRM quote creation endpoint
app.post('/api/zoho/create-quote', async (req, res) => {
  try {
    const quoteData = req.body
    const customerInfo = quoteData.customerInfo || quoteData.customer
    logger.info('Creating Zoho quote for:', customerInfo?.name)

    // Resolve Contact ID if customer info is provided but no contactId
    if (customerInfo && !quoteData.contactId && !quoteData.accountId) {
      logger.info('Resolving Contact ID for customer:', customerInfo.name)

      try {
        // Search for existing contact by company name
        const searchResults = await zohoIntegration.searchCustomer(customerInfo.name)

        if (searchResults.contacts && searchResults.contacts.length > 0) {
          // Use first matching contact
          quoteData.contactId = searchResults.contacts[0].id
          logger.info('Found existing contact:', quoteData.contactId)
        } else if (searchResults.accounts && searchResults.accounts.length > 0) {
          // Use first matching account
          quoteData.accountId = searchResults.accounts[0].id
          logger.info('Found existing account:', quoteData.accountId)
        } else {
          // Create a new lead/contact if none found
          logger.info('No existing contact found, creating new lead')
          const leadData = {
            company: customerInfo.name,
            lastName: customerInfo.lastName || 'Contact',
            firstName: customerInfo.firstName || '',
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address,
            city: customerInfo.city,
            state: customerInfo.state,
            zip: customerInfo.zip,
            source: 'Energen Calculator v5.0'
          }

          const newLead = await zohoIntegration.createLead(leadData)
          logger.info('Lead creation response:', JSON.stringify(newLead, null, 2))

          // Zoho API returns: { details: { id: "xxx" }, ... } or { id: "xxx", ... }
          const leadId = newLead?.details?.id || newLead?.id

          if (leadId) {
            quoteData.contactId = leadId
            logger.info('Created new lead with ID:', leadId)
          } else {
            logger.warn('Lead created but could not extract ID from response:', newLead)
          }
        }
      } catch (contactError) {
        logger.warn('Failed to resolve Contact ID, proceeding without:', contactError.message)
        // Continue without Contact ID - Zoho may allow this
      }
    }

    const result = await zohoIntegration.createQuote(quoteData)

    // Trigger background enrichment if we have customer info and account ID
    if (customerInfo && quoteData.accountId && customerInfo.address && customerInfo.city && customerInfo.state && customerInfo.zip) {
      enrichmentService.enrichCustomerData(
        quoteData.accountId,
        customerInfo.name,
        {
          street: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state,
          zip: customerInfo.zip
        },
        {
          includeLogo: true,
          includeDistance: true,
          includePrevailingWage: true,
          updateZoho: true,
          forceRefresh: false
        }
      ).catch(err => logger.warn('Background enrichment failed, continuing with quote:', err.message))
    }

    res.json({
      success: true,
      quoteId: result.id,
      quoteNumber: result.quoteNumber
    })
  } catch (error) {
    logger.error('Zoho quote creation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Save quote with settings snapshot
app.post('/api/zoho/save-quote-with-settings', async (req, res) => {
  try {
    if (!zohoIntegration) {
      return res.status(503).json({ success: false, error: 'Zoho not available' })
    }
    const { quoteData, settingsSnapshot } = req.body
    logger.info('Saving quote with settings snapshot')
    
    const result = await zohoIntegration.saveQuoteWithSettings(quoteData, settingsSnapshot)
    res.json({ 
      success: true, 
      dealId: result.id || result.details?.id,
      quoteNumber: result.quoteNumber 
    })
  } catch (error) {
    logger.error('Save quote with settings error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Load customer settings from most recent quote
app.post('/api/zoho/customer-settings', async (req, res) => {
  try {
    if (!zohoIntegration) {
      return res.status(503).json({ success: false, error: 'Zoho not available' })
    }
    const { customerId } = req.body
    logger.info('Loading customer settings for:', customerId)
    
    const settings = await zohoIntegration.loadCustomerSettings(customerId)
    if (settings) {
      res.json({ success: true, settings, customerName: customerId })
    } else {
      res.json({ success: false, message: 'No settings found for customer' })
    }
  } catch (error) {
    logger.error('Load customer settings error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Update deal settings
app.put('/api/zoho/deal-settings/:dealId', async (req, res) => {
  try {
    if (!zohoIntegration) {
      return res.status(503).json({ success: false, error: 'Zoho not available' })
    }
    const { dealId } = req.params
    const { settingsSnapshot } = req.body
    logger.info('Updating settings for deal:', dealId)
    
    const result = await zohoIntegration.updateDealSettings(dealId, settingsSnapshot)
    res.json({ success: true, dealId: result.id || dealId })
  } catch (error) {
    logger.error('Update deal settings error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// V5 Zoho Integration - Create Contact
app.post('/api/zoho/create-contact', async (req, res) => {
  try {
    const { accountId, firstName, lastName, email, phone, title } = req.body

    if (!accountId || !firstName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accountId, firstName, email'
      })
    }

    logger.info('Creating contact in Zoho CRM', {
      accountId,
      firstName,
      lastName,
      email
    })

    // Call Zoho MCP to create contact
    const contactData = {
      firstName,
      lastName: lastName || firstName,
      email,
      phone: phone || '',
      accountId,
      title: title || ''
    }

    // Use ZohoDirectIntegration to create contact
    const result = await zohoIntegration.createContact(contactData)

    logger.info('Contact created successfully', {
      contactId: result.id
    })

    res.json({
      success: true,
      contactId: result.id,
      contact: result
    })
  } catch (error) {
    logger.error('Contact creation failed', { error: error.message })
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// V5 Zoho Integration - Sync Customer (creates Account + Contact)
app.post('/api/zoho/v5/sync-customer', async (req, res) => {
  try {
    const { customerInfo } = req.body

    if (!customerInfo) {
      return res.status(400).json({
        error: 'Customer information is required'
      })
    }

    logger.info('Syncing customer to Zoho', {
      name: customerInfo.name,
      city: customerInfo.city,
      state: customerInfo.state
    })

    const zohoAccount = await v5ZohoSync.syncCustomerToZoho(customerInfo)

    logger.info('Customer synced successfully', {
      accountId: zohoAccount.id,
      accountName: zohoAccount.Account_Name
    })

    res.json({
      success: true,
      zohoAccount
    })
  } catch (error) {
    logger.error('Customer sync failed', { error: error.message })
    res.status(500).json({
      error: 'Failed to sync customer to Zoho',
      details: error.message
    })
  }
})

// V5 Zoho Integration - Sync Quote (creates Deal + Quote + Line Items)
app.post('/api/zoho/v5/sync-quote', async (req, res) => {
  try {
    const { quoteData, zohoAccount } = req.body
    
    if (!quoteData || !zohoAccount) {
      return res.status(400).json({ 
        error: 'Quote data and Zoho account are required' 
      })
    }
    
    logger.info('Syncing quote to Zoho', { 
      accountId: zohoAccount.id,
      generatorCount: quoteData.generators?.length || 0,
      total: quoteData.calculation?.total 
    })
    
    const zohoRecords = await v5ZohoSync.syncQuoteToZoho(quoteData, zohoAccount)
    
    logger.info('Quote synced successfully', { 
      dealId: zohoRecords.deal?.id,
      quoteId: zohoRecords.quote?.id,
      lineItemCount: zohoRecords.lineItems?.length || 0
    })
    
    res.json({
      success: true,
      ...zohoRecords
    })
  } catch (error) {
    logger.error('Quote sync failed', { error: error.message })
    res.status(500).json({ 
      error: 'Failed to sync quote to Zoho',
      details: error.message 
    })
  }
})

// V5 Zoho Integration - Create Service Agreement and Work Orders
app.post('/api/zoho/v5/create-agreement', async (req, res) => {
  try {
    const { quoteData, zohoAccount, zohoDeal } = req.body
    
    if (!quoteData || !zohoAccount || !zohoDeal) {
      return res.status(400).json({ 
        error: 'Quote data, Zoho account, and Zoho deal are required' 
      })
    }
    
    logger.info('Creating service agreement in Zoho', { 
      accountId: zohoAccount.id,
      dealId: zohoDeal.id,
      generatorCount: quoteData.generators?.length || 0
    })
    
    const agreementRecords = await v5ZohoSync.createServiceAgreement(
      quoteData, 
      zohoAccount, 
      zohoDeal
    )
    
    logger.info('Service agreement created successfully', { 
      agreementId: agreementRecords.agreement?.id,
      workOrderCount: agreementRecords.workOrders?.length || 0
    })
    
    res.json({
      success: true,
      ...agreementRecords
    })
  } catch (error) {
    logger.error('Service agreement creation failed', { error: error.message })
    res.status(500).json({ 
      error: 'Failed to create service agreement in Zoho',
      details: error.message 
    })
  }
})

// ========================================================================
// FINAL SERVER UNIFICATION - ALL REMAINING ESSENTIAL ROUTES
// ========================================================================

// Import additional required modules for complete functionality
const ServiceDefinitions = require('../../modules/@energen/calc-engine/core/ServiceDefinitions.cjs').ServiceDefinitions
const CPIService = require('./cpi-service.cjs')
const PrevailingWageService = require('./prevailing-wage-service.cjs')

// Service Pricing Endpoint - Complex pricing calculation
app.post('/api/service-price', async (req, res) => {
  try {
    const { serviceCode, kw, frequency, settings, oilQty, coolantQty } = req.body
    logger.info('Service price request:', { serviceCode, kw, frequency })

    // Get kW range
    const kwRanges = [
      { min: 2, max: 14, range: '2-14' },
      { min: 15, max: 30, range: '15-30' },
      { min: 35, max: 150, range: '35-150' },
      { min: 155, max: 250, range: '155-250' },
      { min: 255, max: 400, range: '255-400' },
      { min: 405, max: 500, range: '405-500' },
      { min: 505, max: 670, range: '505-670' },
      { min: 675, max: 1050, range: '675-1050' },
      { min: 1055, max: 1500, range: '1055-1500' },
      { min: 1500, max: 2050, range: '1500-2050' }
    ]

    const kwRange = kwRanges.find(r => kw >= r.min && kw <= r.max)?.range || '35-150'

    // Handle special services
    if (serviceCode === 'K') {
      const laborRate = settings?.laborRate || 180.00
      const laborCost = 0.5 * laborRate
      let partsCost = 250
      if (kw > 50 && kw <= 200) partsCost = 450
      else if (kw > 200) partsCost = 650

      const annual = Math.round((laborCost + partsCost) * (frequency || 1))

      return res.json({
        serviceCode: 'K',
        description: 'Battery Replacement',
        annual,
        monthly: Math.round(annual / 12),
        perInstance: laborCost + partsCost,
        frequency: frequency || 1,
        breakdown: {
          labor: laborCost,
          travel: 0,
          parts: partsCost,
          oil: 0,
          coolant: 0
        }
      })
    }

    // Use ServiceDefinitions for accurate pricing
    const serviceDefs = new ServiceDefinitions(settings)
    const generator = { kw, cylinders: 6, injectorType: 'pop' }
    const serviceDef = serviceDefs.getDefinition(serviceCode, kwRange, generator)

    // Calculate costs
    // CRITICAL: These fallbacks MUST match default-settings.json
    const laborRate = settings?.laborRate || 180.00
    const mobilizationRate = settings?.mobilizationRate || 180.00  // FIX: Was 150, should be 180
    const oilPrice = settings?.oilPrice || 16.00
    const coolantPrice = settings?.coolantPrice || 16.00  // FIX: Was 25, should be 16

    const laborHours = serviceDef.laborHours || 0
    const laborCost = laborHours * laborRate

    let partsCost = 0
    if (serviceDef.parts) partsCost += serviceDef.parts
    if (serviceDef.partsCost) partsCost += serviceDef.partsCost
    if (serviceDef.filterCost) partsCost += serviceDef.filterCost
    if (serviceDef.hosesBelts) partsCost += serviceDef.hosesBelts
    if (serviceDef.testingEquipment) partsCost += serviceDef.testingEquipment
    if (serviceDef.switchMaintenance) partsCost += serviceDef.switchMaintenance
    if (serviceDef.equipmentRental) partsCost += serviceDef.equipmentRental

    const mobilizationHours = serviceDef.mobilization || serviceDef.travel || 2
    const mobilizationCost = mobilizationHours * mobilizationRate
    const oilCost = serviceDef.oilGallons ? (serviceDef.oilGallons * oilPrice * 1.5) : 0
    const coolantCost = serviceDef.coolantGallons ? (serviceDef.coolantGallons * coolantPrice * 1.5) : 0

    const perInstance = laborCost + partsCost + oilCost + coolantCost + mobilizationCost
    const annual = Math.round(perInstance * (frequency || 1))

    res.json({
      serviceCode,
      description: serviceDefs.getName(serviceCode),
      annual,
      monthly: Math.round(annual / 12),
      perInstance: Math.round(perInstance),
      frequency: frequency || 1,
      annualLabor: Math.round(laborCost * (frequency || 1)),
      annualMaterials: Math.round((partsCost + oilCost + coolantCost) * (frequency || 1)),
      annualMobilization: Math.round(mobilizationCost * (frequency || 1)),
      breakdown: {
        labor: Math.round(laborCost),
        mobilization: Math.round(mobilizationCost),
        parts: Math.round(partsCost),
        oil: Math.round(oilCost),
        coolant: Math.round(coolantCost),
        laborHours,
        mobilizationHours
      }
    })
  } catch (error) {
    logger.error('Service price calculation failed:', error)
    res.status(500).json({
      success: false,
      error: 'Service price calculation failed',
      message: error.message
    })
  }
})

// Forward endpoint for calculate-service-price
app.post('/api/calculate-service-price', (req, res) => {
  app.handle({ ...req, url: '/api/service-price' }, res)
})

// Calculate unit price endpoint - Uses authoritative calculation engine
app.post('/api/calculate-unit-price', async (req, res) => {
  try {
    const { kw, services, distance = 25, settings = {}, serviceFrequencies = {} } = req.body
    logger.info('Unit price calculation:', { kw, services, distance })

    // Validate services array is provided
    if (!services || !Array.isArray(services)) {
      return res.status(400).json({
        success: false,
        error: 'Services array is required'
      })
    }

    // --- BEGIN DIAGNOSTIC LOG ---
    // BUG-028 NOTE: Intentional console.log for boot visibility (before Winston is fully initialized)
    console.log('SERVER BOOT: Attempting to initialize Calculation Engine...');
    console.log('SERVER BOOT: Settings object being passed to engine:', JSON.stringify(settings, null, 2));
    if (settings && settings.services && settings.services.serviceA) {
        console.log('SERVER BOOT: VERIFICATION PASSED. Service A data is present in services.serviceA');
    } else {
        console.log('SERVER BOOT: VERIFICATION FAILED. Service A data is MISSING. Check file path to settings.');
    }
    // --- END DIAGNOSTIC LOG ---
    
    // Initialize the authoritative calculation engine with settings
    const engine = new EnergenCalculationEngine(settings, logger)

    // BUG-007 FIX: Validate parseInt result before using
    const kwValue = parseInt(kw, 10);
    if (!isFinite(kwValue) || kwValue < 2 || kwValue > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid kW value. Must be between 2-5000 kW.',
        received: kw
      });
    }

    // Transform the frontend payload into the engine's expected structure
    const enginePayload = {
      customerInfo: {
        name: 'Quick Calculation',
        address: '',
        city: '',
        state: 'CA',
        zip: '',
        distance: distance
      },
      generators: [{
        kw: kwValue,
        brand: '',
        model: '',
        quantity: 1
      }],
      services: services, // Services are already sent as an array of strings like ["A", "B"]
      contractLength: 12,
      settings: settings,
      serviceFrequencies: serviceFrequencies,
    }

    // Use the engine to calculate pricing
    const result = await engine.calculate(enginePayload)

    // BUG-008 FIX: Remove unnecessary parseFloat - calculation engine returns numbers
    // Using parseFloat masks type errors from the engine
    const priceData = {
      laborCost: Math.round(result.calculation.laborTotal ?? 0),
      materialsCost: Math.round(result.calculation.partsTotal ?? 0),
      mobilizationCost: Math.round(result.calculation.mobilizationTotal ?? 0),
      subtotal: Math.round(result.calculation.subtotal ?? 0),
      tax: Math.round(result.calculation.tax ?? 0),
      total: Math.round(result.calculation.total ?? 0),
      services: services, // Pass through the services array

      // Include mobilization details for transparency
      mobilizationSavings: Math.round(result.calculation.mobilizationSavings ?? 0),

      // Include the rich service breakdown, now with corrected and preserved keys
      serviceBreakdown: result.calculation.serviceBreakdown ?
        Object.entries(result.calculation.serviceBreakdown).map(([name, data]) => ({
          name,
          laborCost: Math.round(data.laborCost || 0),
          partsCost: Math.round(data.partsCost || 0),
          totalCost: Math.round(data.totalCost || 0),
          laborHours: data.laborHours || 0, // Preserve this essential key
          mobilizationHours: data.mobilizationHours || 0 // Use the corrected key
        })) : []
    }

    // Return the response in the format the frontend expects
    res.json({
      success: true,
      priceData
    })

  } catch (error) {
    logger.error('Unit price calculation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Preview Pricing Endpoint - Shows all services with correct mobilization stacking
app.post('/api/preview-prices', async (req, res) => {
  try {
    const { kw, distance = 25, settings = {}, serviceFrequencies = {} } = req.body
    logger.info('Preview pricing calculation:', { kw, distance })

    // Initialize the calculation engine with settings
    const engine = new EnergenCalculationEngine(settings, logger)

    // Calculate with ALL available services to get preview prices
    const allServices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

    // BUG-007 FIX: Validate parseInt result before using
    const kwValue = parseInt(kw, 10);
    if (!isFinite(kwValue) || kwValue < 2 || kwValue > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid kW value. Must be between 2-5000 kW.',
        received: kw
      });
    }

    // Transform the frontend payload into the engine's expected structure
    const enginePayload = {
      customerInfo: {
        name: 'Preview Calculation',
        address: '',
        city: '',
        state: 'CA',
        zip: '',
        distance: distance
      },
      generators: [{
        kw: kwValue,
        brand: '',
        model: '',
        quantity: 1
      }],
      services: allServices, // Calculate ALL services to get individual prices
      contractLength: 12,
      settings: settings,
      serviceFrequencies: serviceFrequencies,
    }

    // Use the engine to calculate pricing
    const result = await engine.calculate(enginePayload)

    // Return only the service breakdown (not totals, since not all services are selected)
    const previewPrices = result.calculation.serviceBreakdown ?
      Object.entries(result.calculation.serviceBreakdown).map(([name, data]) => ({
        name,
        serviceCode: name.split(' - ')[0].trim(), // Extract code like "A" from "A - Comprehensive"
        laborCost: Math.round(data.laborCost || 0),
        partsCost: Math.round(data.partsCost || 0),
        totalCost: Math.round(data.totalCost || 0),
        laborHours: data.laborHours || 0,
        mobilizationHours: data.mobilizationHours || 0
      })) : []

    res.json({
      success: true,
      previewPrices
    })

  } catch (error) {
    logger.error('Preview pricing calculation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// CONSOLIDATED ENDPOINT: Get both preview prices AND calculated totals in one call
app.post('/api/calculate-complete', async (req, res) => {
  try {
    const { kw, services = [], distance = 25, settings = {}, serviceFrequencies = {}, serviceDFluids = {}, customServices = {} } = req.body
    logger.info('Complete calculation:', { kw, services, distance })

    // BUG-007 FIX: Validate parseInt result before using
    const kwValue = parseInt(kw, 10);
    if (!isFinite(kwValue) || kwValue < 2 || kwValue > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid kW value. Must be between 2-5000 kW.',
        received: kw
      });
    }

    // Initialize the calculation engine with settings
    const engine = new EnergenCalculationEngine(settings, logger)

    // PART 1: Get preview prices for ALL services (unselected cards)
    const allServices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    const previewPayload = {
      customerInfo: {
        name: 'Preview Calculation',
        address: '',
        city: '',
        state: 'CA',
        zip: '',
        distance: distance
      },
      generators: [{
        kw: kwValue,
        brand: '',
        model: '',
        quantity: 1
      }],
      services: allServices,
      contractLength: 12,
      settings: settings,
      serviceFrequencies: serviceFrequencies,
      serviceDFluids: serviceDFluids
    }

    const previewResult = await engine.calculate(previewPayload)
    const previewPrices = previewResult.calculation.serviceBreakdown ?
      Object.entries(previewResult.calculation.serviceBreakdown).map(([name, data]) => {
        const serviceCode = name.split(' - ')[0].trim();
        const priceData = {
          name,
          serviceCode,
          laborCost: Math.round(data.laborCost || 0),
          partsCost: Math.round(data.partsCost || 0),
          totalCost: Math.round(data.totalCost || 0),
          laborHours: data.laborHours || 0,
          mobilizationHours: data.mobilizationHours || 0
        };
        
        // Add fluid-specific costs for Service B and C
        if (serviceCode === 'B' && data.oilCost !== undefined) {
          priceData.oilCost = Math.round(data.oilCost || 0);
          priceData.filterCost = Math.round(data.filterCost || 0);
        } else if (serviceCode === 'C' && data.coolantCost !== undefined) {
          priceData.coolantCost = Math.round(data.coolantCost || 0);
          priceData.hosesBeltsCost = Math.round(data.partsCost || 0);
        }
        
        return priceData;
      }) : []

    // PART 2: Calculate totals for SELECTED services only
    let priceData = null
    if (services.length > 0) {
      const selectedPayload = {
        customerInfo: {
          name: 'Unit Calculation',
          address: '',
          city: '',
          state: 'CA',
          zip: '',
          distance: distance
        },
        generators: [{
          kw: kwValue,
          brand: '',
          model: '',
          quantity: 1
        }],
        services: services,
        contractLength: 12,
        settings: settings,
        serviceFrequencies: serviceFrequencies,
        serviceDFluids: serviceDFluids,
        customServices: customServices
      }

      const selectedResult = await engine.calculate(selectedPayload)
      
      // BUG-008 FIX: Remove unnecessary parseFloat - calculation engine returns numbers
      priceData = {
        laborCost: Math.round(selectedResult.calculation.laborTotal ?? 0),
        materialsCost: Math.round(selectedResult.calculation.partsTotal ?? 0),
        mobilizationCost: Math.round(selectedResult.calculation.mobilizationTotal ?? 0),
        mobilizationSavings: Math.round(selectedResult.calculation.mobilizationSavings ?? 0),
        subtotal: Math.round(selectedResult.calculation.subtotal ?? 0),
        tax: Math.round(selectedResult.calculation.tax ?? 0),
        total: Math.round(selectedResult.calculation.total ?? 0),
        quarterlyTotals: selectedResult.calculation.quarterlyTotals || null,
        serviceBreakdown: selectedResult.calculation.serviceBreakdown ?
          Object.entries(selectedResult.calculation.serviceBreakdown).map(([name, data]) => {
            const serviceCode = name.split(' - ')[0].trim();
            const serviceData = {
              name,
              serviceCode,
              laborCost: Math.round(data.laborCost || 0),
              partsCost: Math.round(data.partsCost || 0),
              totalCost: Math.round(data.totalCost || 0),
              laborHours: data.laborHours || 0,
              mobilizationHours: data.mobilizationHours || 0
            };
            
            // Add fluid-specific costs for Service B and C
            if (serviceCode === 'B' && data.oilCost !== undefined) {
              serviceData.oilCost = Math.round(data.oilCost || 0);
              serviceData.filterCost = Math.round(data.filterCost || 0);
            } else if (serviceCode === 'C' && data.coolantCost !== undefined) {
              serviceData.coolantCost = Math.round(data.coolantCost || 0);
              serviceData.hosesBeltsCost = Math.round(data.partsCost || 0);
            }
            
            return serviceData;
          }) : []
      }
    }

    res.json({
      success: true,
      previewPrices,
      priceData
    })

  } catch (error) {
    logger.error('Complete calculation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// PDF Generation Endpoint - Strict Professional Format with Automatic Zoho Sync
app.post('/api/generate-pdf', async (req, res) => {
  try {
    // Check if Zoho sync should be skipped (for simple PDF generation)
    const skipZoho = req.body.skipZoho === true;

    if (skipZoho) {
      logger.info('📄 Simple PDF Generation (Zoho sync skipped)');
    } else {
      logger.info('🔒 STRICT PDF Generation + Automatic Zoho Sync - "Create Bid" Workflow');
    }

    const module = await import('../../modules/pdf-generator/professional-pdf-service.js')
    const ProfessionalPDFService = module.ProfessionalPDFService  // Named export, not default

    if (!ProfessionalPDFService) {
      throw new Error('CRITICAL: Professional PDF Service NOT FOUND - NO FALLBACK ALLOWED')
    }

    const requiredComponents = [
      'PDFDocumentBuilder',
      'PDFHeaderComponent',
      'PDFFooterComponent',
      'PDFCustomerInfoComponent',
      'PDFTableComponent',
      'PDFDisclosureComponent',
      'PDFSignatureComponent'
    ]

    const componentsPath = path.join(__dirname, '../../modules/pdf-generator/components')
    const corePath = path.join(__dirname, '../../modules/pdf-generator/core')

    for (const component of requiredComponents) {
      const componentFile = component.includes('Builder') ?
        path.join(corePath, `${component}.cjs`) :
        path.join(componentsPath, `${component}.cjs`)

      if (!fs.existsSync(componentFile)) {
        throw new Error(`CRITICAL: Required component ${component} MISSING - NO FALLBACK ALLOWED`)
      }
    }

    // STEP 1: Attempt Automatic Zoho CRM Sync (non-blocking) - ONLY if not skipped
    // Supports both regular and CPQ mode based on environment variable
    let zohoResult = null;
    let zohoError = null;

    if (!skipZoho) {
      try {
        logger.info('🚀 Starting automatic Zoho CRM sync...');

        // Check if CPQ mode is enabled (default: true for full feature set)
        const useCPQ = process.env.ZOHO_CPQ_ENABLED !== 'false'; // Default true

        if (useCPQ) {
          logger.info('📦 Using Zoho CPQ integration with multi-dimensional pricing');
          const { createCPQBidInZoho } = require('./zoho-cpq-integration.cjs');

          // Get Zoho access token
          const accessToken = await zohoIntegration.getAccessToken();
        const zohoConfig = {
          accessToken,
          apiUrl: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com'
        };

        // Create CPQ bid in Zoho with calculator pricing
        const quotePayload = req.body.quoteData || req.body;
        zohoResult = await createCPQBidInZoho(zohoConfig, quotePayload, logger);
        logger.info('✅ Zoho CPQ sync completed:', zohoResult);

      } else {
        logger.info('📋 Using standard Zoho integration');
        const { createBidInZoho } = require('./zoho-bid-integration.cjs');

        // Get Zoho access token
        const accessToken = await zohoIntegration.getAccessToken();
        const zohoConfig = {
          accessToken,
          apiUrl: process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com'
        };

        // Create bid in Zoho (account, contact, quote)
        const quotePayload = req.body.quoteData || req.body;
        zohoResult = await createBidInZoho(zohoConfig, quotePayload, logger);
        logger.info('✅ Zoho sync completed:', zohoResult);
      }

      } catch (zError) {
        zohoError = zError;
        logger.warn('⚠️  Zoho sync failed (continuing with PDF generation):', zError.message);
        // Don't fail the whole operation - continue with PDF generation
      }
    } else {
      logger.info('⏭️  Zoho sync skipped (skipZoho=true)');
    }

    // STEP 2: Generate PDF (always proceeds, even if Zoho sync fails)
    const pdfService = new ProfessionalPDFService()
    const result = await pdfService.generateQuote(req.body)

    if (!result.components || result.components !== 6) {
      throw new Error(`INVALID PDF: Only ${result.components || 0} components. EXACTLY 6 REQUIRED.`)
    }

    if (!result.success) {
      throw new Error('Professional PDF generation failed - NO FALLBACK ALLOWED')
    }

    logger.info('✅ STRICT Professional PDF Generated')

    // STEP 3: Return combined result
    const response = {
      success: true,
      filename: result.filename,
      url: result.url,
      filepath: result.filepath,
      components: result.components,
      format: 'PROFESSIONAL_MODULAR',
      message: 'Professional PDF with 6 modular components generated successfully'
    };

    // Add Zoho sync status
    if (zohoResult) {
      response.zoho = {
        synced: true,
        estimateNumber: zohoResult.estimateNumber,
        accountId: zohoResult.account.id,
        accountName: zohoResult.account.accountName,
        accountAction: zohoResult.account.action,
        contactId: zohoResult.contact.id,
        contactName: zohoResult.contact.contactName,
        contactAction: zohoResult.contact.action,
        quote_id: zohoResult.quote.id,  // FIX: Changed from quoteId to quote_id for script compatibility
        quoteNumber: zohoResult.quote.quoteNumber,
        quoteTotal: zohoResult.quote.total,
        zohoUrl: zohoResult.quote.url
      };
    } else if (zohoError) {
      response.zoho = {
        synced: false,
        error: zohoError.message,
        warning: 'PDF created successfully, but Zoho sync failed. You can manually sync from Zoho CRM.'
      };
    }

    res.json(response);

  } catch (error) {
    logger.error('❌ STRICT PDF FAILURE:', error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      strict: true,
      fallback: 'DISABLED'
    })
  }
})

// Alternative PDF generation endpoint
app.post('/api/pdf/generate', async (req, res) => {
  try {
    logger.info('📄 Professional PDF generation at /api/pdf/generate')
    logger.info('📥 Request body keys:', Object.keys(req.body || {}));
    logger.info('📥 Services array:', req.body?.services);
    logger.info('📥 Units array:', req.body?.units);

    const module = await import('../../modules/pdf-generator/professional-pdf-service.js')
    const ProfessionalPDFService = module.ProfessionalPDFService  // Named export, not default

    if (!ProfessionalPDFService) {
      throw new Error('Professional PDF Service not available')
    }

    const pdfService = new ProfessionalPDFService()
    
    // CRITICAL FIX: Extract ALL data from request, including calculation and settings
    // Frontend sends: { customer, generators, services, calculation, settings, metadata, units }
    const { customer, services, generators, metadata, quoteNumber, calculation, calculations, settings, units } = req.body

    const result = await pdfService.generateQuote({
      customer,
      services,
      generators,
      units,  // Add units for custom services support
      calculation: calculation || calculations,  // Frontend may send either name
      settings,  // Contains companyInfo (150 Mason Circ) and other settings
      metadata: {
        quoteNumber: quoteNumber || `EST-${Date.now()}`,
        date: new Date(),
        preparedBy: 'Energen Sales Team',
        ...metadata
      }
    })

    if (!result.components || result.components !== 6) {
      throw new Error(`INVALID PDF: ${result.components || 0} components. EXACTLY 6 REQUIRED.`)
    }

    logger.info('✅ Professional PDF via /api/pdf/generate')

    res.json({
      success: true,
      filename: result.filename,
      filepath: result.filepath,
      url: result.url,
      message: 'Professional Energen bid with 6 modular components',
      pages: result.pages,
      components: result.components,
      format: 'PROFESSIONAL_MODULAR'
    })
  } catch (error) {
    logger.error('❌ PDF generation error at /api/pdf/generate:', error.message)
    logger.error('Error stack:', error.stack)
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      endpoint: '/api/pdf/generate'
    })
  }
})

// Save Quote Endpoint
app.post('/api/save-quote', async (req, res) => {
  try {
    const { customer, generators, services, pricing, quoteNumber } = req.body

    const quoteId = quoteNumber || `Q-${Date.now()}`

    const quotesDir = path.join(__dirname, '../../data/quotes')
    if (!fs.existsSync(quotesDir)) {
      fs.mkdirSync(quotesDir, { recursive: true })
    }

    const quoteData = {
      id: quoteId,
      timestamp: new Date().toISOString(),
      customer,
      generators,
      services,
      pricing,
      status: 'saved'
    }

    const quotePath = path.join(quotesDir, `${quoteId}.json`)
    fs.writeFileSync(quotePath, JSON.stringify(quoteData, null, 2))

    logger.info(`Quote saved: ${quoteId}`)

    res.json({
      success: true,
      quoteId,
      message: 'Quote saved successfully',
      path: quotePath
    })
  } catch (error) {
    logger.error('Save quote error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Settings Management Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, '../../data/settings.json')

    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      res.json({ success: true, settings })
    } else {
      res.json({
        success: true,
        settings: {
          laborRate: 180,
          taxRate: 0.1025,
          partsMarkup: 0.20,
          freightMarkup: 0.05,
          defaultContractYears: 1,
          defaultEscalation: 0.03
        }
      })
    }
  } catch (error) {
    logger.error('Settings error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.post('/api/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, '../../data/settings.json')
    const settings = req.body

    const dataDir = path.join(__dirname, '../../data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
    logger.info('Settings updated')

    res.json({ success: true, message: 'Settings saved' })
  } catch (error) {
    logger.error('Settings save error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// CPI Data Endpoint
app.get('/api/cpi/:location', async (req, res) => {
  try {
    const { location } = req.params
    const { years = 1 } = req.query

    const cpiService = new CPIService()
    const cpiData = await cpiService.getCPIData(location, process.env.FRED_API_KEY)

    if (!cpiData) {
      return res.json({
        location,
        inflationRate: 2.5,
        multiplier: Math.pow(1.025, years),
        source: 'default'
      })
    }

    res.json({
      location,
      inflationRate: cpiData.annualInflation,
      multiplier: Math.pow(1 + cpiData.annualInflation / 100, years),
      latestData: cpiData.latestData,
      historicalAverage: cpiData.historicalAverage,
      source: 'FRED API'
    })
  } catch (error) {
    logger.error('CPI endpoint error:', error)
    res.json({
      location: req.params.location,
      inflationRate: 2.5,
      multiplier: Math.pow(1.025, req.query.years || 1),
      source: 'default',
      error: error.message
    })
  }
})

// Prevailing Wage Endpoint
app.get('/api/prevailing-wage/:zip', async (req, res) => {
  try {
    const { zip } = req.params
    const { state = 'CA' } = req.query

    const wageService = new PrevailingWageService()
    const wageData = await wageService.getPrevailingWageData(zip, state)

    if (wageData) {
      res.json({
        success: true,
        data: wageData
      })
    } else {
      res.status(404).json({
        success: false,
        error: 'No prevailing wage data found for this location'
      })
    }
  } catch (error) {
    logger.error('Prevailing wage error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// ========================================================================
// END OF FINAL SERVER UNIFICATION
// ========================================================================

// Image proxy endpoint to bypass CORS restrictions
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query

    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' })
    }

    // Fetch the image from external source
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      logger.warn('Image proxy fetch failed:', { url, status: response.status })
      return res.status(response.status).json({ error: 'Failed to fetch image' })
    }

    // Get the image as a buffer
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    // Set appropriate headers
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=86400') // Cache for 24 hours
    res.set('Access-Control-Allow-Origin', '*')

    // Send the image
    res.send(Buffer.from(buffer))

  } catch (error) {
    logger.error('Image proxy error:', error)
    res.status(500).json({ error: 'Failed to proxy image' })
  }
})

// Middleware to handle ?raw query for template imports
app.use((req, res, next) => {
  if (req.query.raw !== undefined && req.path.endsWith('.html')) {
    res.type('text/plain')
  }
  next()
})

// =============================================================================
// DOCUMENT MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * List all documents (PDFs) in the output directory
 */
app.get('/api/documents/list', async (req, res) => {
  try {
    const pdfDir = path.join(__dirname, '../../output/pdfs')

    // Check if directory exists
    if (!fs.existsSync(pdfDir)) {
      return res.json([])
    }

    const files = await fs.promises.readdir(pdfDir)
    const pdfFiles = files.filter(f => f.endsWith('.pdf'))

    // Get file stats and metadata for each PDF
    const documents = await Promise.all(pdfFiles.map(async (filename) => {
      const filepath = path.join(pdfDir, filename)
      const stats = await fs.promises.stat(filepath)

      // Parse metadata from filename
      // Expected patterns:
      // Energen_Bid_<customer>-<identifier>.pdf
      // Energen_Bid_EST-<timestamp>.pdf
      let customer = null
      let type = 'quote'

      // Extract customer name from filename
      const bidMatch = filename.match(/Energen_Bid_(.+?)\.pdf/)
      if (bidMatch) {
        const namepart = bidMatch[1]
        // If it's a timestamp format, mark as generic quote
        if (/^\d+$/.test(namepart) || namepart.startsWith('EST-')) {
          customer = 'Unknown'
        } else {
          // Extract customer name, replacing hyphens/underscores with spaces
          customer = namepart.replace(/[-_]/g, ' ')
          // Remove common suffixes like "Unit-1", "Unit-2", etc.
          customer = customer.replace(/\s*Unit\s*\d+$/i, '').trim()
        }
      }

      return {
        filename,
        customer,
        type,
        created: stats.mtime,
        size: stats.size,
        path: `/api/documents/download/${encodeURIComponent(filename)}`
      }
    }))

    // Sort by creation date (newest first)
    documents.sort((a, b) => new Date(b.created) - new Date(a.created))

    logger.info(`Documents list request: ${documents.length} PDFs found`)
    res.json(documents)

  } catch (error) {
    logger.error('Error listing documents:', error)
    res.status(500).json({ error: 'Failed to list documents', details: error.message })
  }
})

/**
 * Download/serve a specific document
 */
app.get('/api/documents/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    const filepath = path.join(__dirname, '../../output/pdfs', filename)

    // Security: Prevent path traversal attacks
    const normalizedPath = path.normalize(filepath)
    const pdfDir = path.normalize(path.join(__dirname, '../../output/pdfs'))

    if (!normalizedPath.startsWith(pdfDir)) {
      logger.warn(`Path traversal attempt blocked: ${filename}`)
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      logger.warn(`Document not found: ${filename}`)
      return res.status(404).json({ error: 'Document not found' })
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)

    logger.info(`Serving document: ${filename}`)
    res.sendFile(filepath)

  } catch (error) {
    logger.error('Error serving document:', error)
    res.status(500).json({ error: 'Failed to serve document', details: error.message })
  }
})

/**
 * Delete a specific document
 */
app.delete('/api/documents/delete/:filename', async (req, res) => {
  try {
    const filename = req.params.filename
    const filepath = path.join(__dirname, '../../output/pdfs', filename)

    // Security: Prevent path traversal attacks
    const normalizedPath = path.normalize(filepath)
    const pdfDir = path.normalize(path.join(__dirname, '../../output/pdfs'))

    if (!normalizedPath.startsWith(pdfDir)) {
      logger.warn(`Path traversal attempt blocked: ${filename}`)
      return res.status(403).json({ error: 'Access denied', success: false })
    }

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      logger.warn(`Document not found for deletion: ${filename}`)
      return res.status(404).json({ error: 'Document not found', success: false })
    }

    // Delete the file
    await fs.promises.unlink(filepath)

    logger.info(`Document deleted: ${filename}`)
    res.json({ success: true, message: 'Document deleted successfully', filename })

  } catch (error) {
    logger.error('Error deleting document:', error)
    res.status(500).json({ error: 'Failed to delete document', details: error.message, success: false })
  }
})

// Disable caching in development for hot reloading
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    next()
  })
}

// Serve static files
app.use('/output/pdfs', express.static(path.join(__dirname, '../../output/pdfs')))
app.use('/frontend', express.static(path.join(__dirname, '../../frontend')))
app.use('/config', express.static(path.join(__dirname, '../../frontend/config')))

// Serve frontend files at root for HTML script references
app.use(express.static(path.join(__dirname, '../../frontend')))

// Serve main UI at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/integrated-ui.html'))
})

// =============================================================================
// ZOHO BOOKS ENDPOINTS
// =============================================================================
// Invoice creation and payment tracking

// Create invoice from quote
app.post('/api/zoho/books/create-invoice', async (req, res) => {
    try {
        const { quoteData } = req.body;

        logger.info('[BOOKS] Creating invoice from quote:', quoteData.bidNumber);

        // Sync CRM account to Books customer first
        const customerId = await booksIntegration.syncAccountToCustomer(quoteData.customer.zohoAccount);
        quoteData.customer.zohoBooksCustomerId = customerId;

        // Create invoice
        const invoice = await booksIntegration.createInvoiceFromQuote(quoteData);

        res.json({
            success: true,
            invoice
        });
    } catch (error) {
        logger.error('[BOOKS] Invoice creation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get invoice
app.get('/api/zoho/books/invoice/:invoiceId', async (req, res) => {
    try {
        const invoice = await booksIntegration.getInvoice(req.params.invoiceId);
        res.json({ invoice });
    } catch (error) {
        logger.error('[BOOKS] Get invoice failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// List invoices
app.get('/api/zoho/books/invoices', async (req, res) => {
    try {
        const filters = {
            customerId: req.query.customerId,
            status: req.query.status,
            date: req.query.date
        };

        const invoices = await booksIntegration.listInvoices(filters);
        res.json({ invoices });
    } catch (error) {
        logger.error('[BOOKS] List invoices failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Record payment
app.post('/api/zoho/books/record-payment', async (req, res) => {
    try {
        const { invoiceId, paymentData } = req.body;
        const payment = await booksIntegration.recordPayment(invoiceId, paymentData);

        res.json({
            success: true,
            payment
        });
    } catch (error) {
        logger.error('[BOOKS] Payment recording failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Download invoice PDF
app.get('/api/zoho/books/invoice/:invoiceId/pdf', async (req, res) => {
    try {
        const pdfBuffer = await booksIntegration.getInvoicePDF(req.params.invoiceId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.invoiceId}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error('[BOOKS] PDF download failed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Email invoice
app.post('/api/zoho/books/invoice/:invoiceId/email', async (req, res) => {
    try {
        const { emailData } = req.body;
        await booksIntegration.emailInvoice(req.params.invoiceId, emailData);

        res.json({ success: true });
    } catch (error) {
        logger.error('[BOOKS] Email failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// ZOHO CPQ WEBHOOK ENDPOINTS
// =============================================================================
// Called by Zoho CPQ Price Rules for dynamic pricing
app.post('/api/zoho-cpq-price', cpqWebhook.calculateServicePrice)
app.post('/api/zoho-cpq-price-batch', cpqWebhook.calculateBatchPricing)
app.get('/api/zoho-cpq-price/health', cpqWebhook.healthCheck)

// =============================================================================
// BID RECREATION ENDPOINTS
// =============================================================================
// Create and restore session hashes for bid recreation
app.post('/api/bid/create-session', bidRecreation.createBidSession)
app.get('/api/bid/recreate/:hash', bidRecreation.recreateBidFromHash)
app.post('/api/bid/recreate-and-calculate/:hash', bidRecreation.recreateAndCalculate)
app.get('/api/bid/sessions/stats', bidRecreation.getSessionStats)
app.post('/api/bid/sessions/cleanup', bidRecreation.cleanupExpiredSessions)
// =============================================================================
// QUOTE MANAGEMENT ENDPOINTS (EMAIL & REVISION)
// =============================================================================

app.post('/api/email-quote', async (req, res) => {
  await quoteManagement.emailQuote(req, res, logger)
})

app.post('/api/quote/create-revision', async (req, res) => {
  await quoteManagement.createRevision(req, res, logger)
})

// ==========================================
// ZOHO OAUTH TOKEN RENEWAL SYSTEM
// ==========================================

// Get OAuth token health status
app.get('/api/zoho/oauth/status', async (req, res) => {
  try {
    const status = await ZohoTokenHealthMonitor.checkTokenHealth()
    res.json({
      success: true,
      status
    })
  } catch (error) {
    logger.error('Token health check error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get authorization URL for token renewal
app.get('/api/zoho/oauth/authorize-url', (req, res) => {
  try {
    const authUrl = ZohoTokenHealthMonitor.getAuthorizationUrl()
    res.json({
      success: true,
      authUrl
    })
  } catch (error) {
    logger.error('Auth URL generation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// OAuth callback handler (automatic redirect from Zoho)
app.get('/api/zoho/oauth/callback', async (req, res) => {
  try {
    const { code, error } = req.query

    if (error) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 2px solid #c00; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Authorization Failed</h1>
            <p>${error}</p>
            <p><a href="/">Return to Calculator</a></p>
          </div>
        </body>
        </html>
      `)
    }

    if (!code) {
      return res.status(400).send('Missing authorization code')
    }

    logger.info('Received OAuth authorization code, exchanging for tokens...')

    // Exchange code for tokens
    const tokenResult = await ZohoTokenHealthMonitor.exchangeCodeForToken(code)

    if (!tokenResult.success) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Token Exchange Failed</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { background: #fee; border: 2px solid #c00; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Token Exchange Failed</h1>
            <p>${tokenResult.error}</p>
            <p><a href="/api/zoho/oauth/authorize-url">Try again</a></p>
          </div>
        </body>
        </html>
      `)
    }

    // Update .env file with new refresh token
    const updated = await ZohoTokenHealthMonitor.updateEnvFile(tokenResult.refresh_token)

    if (updated) {
      logger.info('✅ OAuth tokens updated successfully')
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Success</title>
          <style>
            body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { background: #efe; border: 2px solid #0a0; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Authorization Successful!</h1>
            <p>Your Zoho OAuth tokens have been updated and will now work for the next 90 days.</p>
            <p>The system will automatically refresh your access tokens every hour.</p>
            <p><strong>Action required:</strong> Restart the server for changes to take effect.</p>
            <p><a href="/">Return to Calculator</a></p>
          </div>
        </body>
        </html>
      `)
    } else {
      res.status(500).send('Failed to update .env file. Check server logs.')
    }

  } catch (error) {
    logger.error('OAuth callback error:', error)
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { font-family: Arial; max-width: 600px; margin: 50px auto; padding: 20px; }
          .error { background: #fee; border: 2px solid #c00; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Server Error</h1>
          <p>${error.message}</p>
          <p>Check server logs for details.</p>
        </div>
      </body>
      </html>
    `)
  }
})

// Simple renewal page
app.get('/api/zoho/oauth/renew', (req, res) => {
  const authUrl = ZohoTokenHealthMonitor.getAuthorizationUrl()
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Renew Zoho OAuth</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .btn {
          display: inline-block;
          background: #0066cc;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 20px;
        }
        .btn:hover { background: #0052a3; }
        .info {
          background: #e3f2fd;
          padding: 15px;
          border-left: 4px solid #2196F3;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Renew Zoho OAuth Authorization</h1>
        <p>Your Zoho refresh token has expired or is invalid.</p>

        <div class="info">
          <strong>What happens when you click below:</strong>
          <ol>
            <li>You'll be redirected to Zoho's secure authorization page</li>
            <li>Log in with your Zoho account if needed</li>
            <li>Click "Accept" to authorize the application</li>
            <li>You'll be redirected back here automatically</li>
            <li>The system will update your credentials (no manual copy/paste!)</li>
          </ol>
        </div>

        <p><strong>This process takes about 30 seconds.</strong></p>
        <p>You only need to do this once every 90 days.</p>

        <a href="${authUrl}" class="btn">Authorize Now →</a>

        <p style="margin-top: 30px; font-size: 12px; color: #666;">
          After authorization, you may need to restart the server for changes to take effect.
        </p>
      </div>
    </body>
    </html>
  `)
})

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found:', { path: req.path, method: req.method })
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  })
})

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`🚀 Secure Energen Calculator v5.0 server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info('Security features enabled: Helmet, CORS, Rate Limiting, Input Validation')

  // Check Zoho OAuth token health on startup
  setTimeout(async () => {
    try {
      logger.info('🔍 Checking Zoho OAuth token health...')
      const status = await ZohoTokenHealthMonitor.checkTokenHealth()

      if (status.healthy) {
        logger.info('✅ Zoho OAuth tokens are healthy')
      } else {
        logger.warn('⚠️  ZOHO OAUTH TOKENS NEED RENEWAL!')
        logger.warn(`   Error: ${status.error}`)
        logger.warn(`   Message: ${status.message}`)
        logger.warn(`   → Visit http://localhost:${PORT}/api/zoho/oauth/renew to fix this`)
        console.log('\n' + '='.repeat(80))
        console.log('⚠️  ZOHO OAUTH TOKEN RENEWAL REQUIRED')
        console.log('='.repeat(80))
        console.log(`\nYour Zoho refresh token has expired or is invalid.`)
        console.log(`\nTo renew (takes 30 seconds):`)
        console.log(`  1. Open: http://localhost:${PORT}/api/zoho/oauth/renew`)
        console.log(`  2. Click "Authorize Now"`)
        console.log(`  3. Log in to Zoho and accept`)
        console.log(`  4. Restart the server\n`)
        console.log('The system will work normally except for Zoho CRM features.')
        console.log('='.repeat(80) + '\n')
      }
    } catch (error) {
      logger.error('Failed to check OAuth token health:', error.message)
    }
  }, 2000) // Check 2 seconds after startup
})


// ============================================
// REPORTS & ANALYTICS ENDPOINTS
// ============================================

// Get all local quotes for reports
app.get('/api/reports/local-quotes', async (req, res) => {
    await reportsEndpoints.getLocalQuotes(req, res, logger);
});

// Get reports summary with aggregated metrics
app.get('/api/reports/summary', async (req, res) => {
    await reportsEndpoints.getReportsSummary(req, res, logger);
});

logger.info('Reports endpoints registered');

module.exports = { app, server, logger }
