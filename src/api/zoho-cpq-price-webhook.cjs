/**
 * Zoho CPQ Dynamic Pricing Webhook
 *
 * Called by Zoho CPQ Price Rules when line items are added to quotes.
 * Returns calculated pricing from v5.0 engine for dynamic quote generation.
 *
 * Workflow:
 * 1. Zoho CPQ Price Rule triggers on "Add Product to Quote"
 * 2. Webhook called with generator specs + service code
 * 3. v5.0 calculator runs pricing engine
 * 4. Returns per-visit price to Zoho
 * 5. Zoho sets line item price dynamically
 */

const EnergenCalculationEngine = require('./complete-calculation-engine.cjs');
const { getInstance: getSessionManager } = require('./session-hash-manager.cjs');

/**
 * Calculate per-visit pricing for a single service
 *
 * @param {Object} req.body - Zoho CPQ webhook payload
 * @param {string} req.body.serviceCode - Service code (A-J)
 * @param {number} req.body.kwRating - Generator kW rating
 * @param {number} [req.body.cylinders] - Engine cylinders (required for F, G)
 * @param {string} [req.body.fuelType] - Fuel type (Diesel, Natural Gas, etc.)
 * @param {string} [req.body.injectorType] - Injector type (Pop Nozzle, Unit Injectors)
 * @param {number} [req.body.frequency] - Visits per year (default: service default)
 * @param {boolean} [req.body.prevailingWage] - Apply prevailing wage rates
 * @param {string} [req.body.city] - Customer city for tax/wage lookup
 * @param {string} [req.body.state] - Customer state
 * @param {string} [req.body.zip] - Customer ZIP code
 *
 * @returns {Object} Pricing response
 * @returns {boolean} success - Operation success status
 * @returns {number} unitPrice - Price per visit
 * @returns {number} quantity - Frequency (visits per year)
 * @returns {number} lineTotal - Annual total (unitPrice × quantity)
 * @returns {Object} breakdown - Cost breakdown (labor, parts, mobilization)
 * @returns {Object} metadata - Calculator metadata (version, timestamp)
 */
async function calculateServicePrice(req, res) {
  const startTime = Date.now();

  try {
    // Extract webhook payload
    const {
      serviceCode,
      kwRating,
      cylinders,
      fuelType,
      injectorType,
      frequency,
      prevailingWage = false,
      city = 'Berkeley',
      state = 'CA',
      zip,
      settings = {} // CRITICAL: Accept user's session settings
    } = req.body;

    // Validate required fields
    if (!serviceCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: serviceCode',
        required: ['serviceCode', 'kwRating']
      });
    }

    if (!kwRating || kwRating <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid kwRating: must be positive number',
        received: kwRating
      });
    }

    // Validate service code
    const validServices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    if (!validServices.includes(serviceCode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid service code: ${serviceCode}`,
        validCodes: validServices
      });
    }

    // Services F & G require cylinder count
    if ((serviceCode === 'F' || serviceCode === 'G') && !cylinders) {
      return res.status(400).json({
        success: false,
        error: `Service ${serviceCode} requires cylinders field`,
        received: { cylinders }
      });
    }

    // Service F requires injector type (diesel)
    if (serviceCode === 'F' && !injectorType) {
      return res.status(400).json({
        success: false,
        error: 'Service F (Diesel Tune-Up) requires injectorType',
        validTypes: ['Pop Nozzle', 'Unit Injectors']
      });
    }

    // Service G requires fuel type (gas)
    if (serviceCode === 'G' && !fuelType) {
      return res.status(400).json({
        success: false,
        error: 'Service G (Gas Tune-Up) requires fuelType',
        validTypes: ['Natural Gas', 'Propane', 'Bi-Fuel']
      });
    }

    // Initialize calculator with user's session settings
    const engine = new EnergenCalculationEngine(settings);

    // Build calculation payload
    const calcPayload = {
      customerInfo: {
        city: city,
        state: state,
        zip: zip || '94720'
      },
      generators: [{
        kw: kwRating,
        cylinders: cylinders || null,
        fuelType: fuelType || 'Diesel',
        injectorType: injectorType || null
      }],
      services: [serviceCode],
      serviceFrequencies: {},
      prevailingWageOverride: prevailingWage ? true : undefined
    };

    // Set frequency (use provided or service default)
    if (frequency) {
      calcPayload.serviceFrequencies[serviceCode] = frequency;
    } else {
      // Service defaults
      const defaultFrequencies = {
        'A': 4,    // Quarterly
        'B': 1,    // Annual
        'C': 1,    // Annual
        'D': 1,    // Annual
        'E': 1,    // Annual
        'F': 0.33, // Triennial
        'G': 0.33, // Triennial
        'H': 1,    // Annual
        'I': 0.2,  // Pentennial
        'J': 0.2   // Pentennial
      };
      calcPayload.serviceFrequencies[serviceCode] = defaultFrequencies[serviceCode];
    }

    // Run calculation
    const result = await engine.calculate(calcPayload);

    // Extract service breakdown
    const service = result.serviceBreakdown.find(s => s.code === serviceCode);

    if (!service) {
      return res.status(500).json({
        success: false,
        error: `Calculator did not return pricing for service ${serviceCode}`,
        calculatorResult: result
      });
    }

    // Build response
    const response = {
      success: true,
      unitPrice: service.perVisitPrice,
      quantity: calcPayload.serviceFrequencies[serviceCode],
      lineTotal: service.annualTotal,
      breakdown: {
        labor: service.laborCost,
        parts: service.partsCost,
        mobilization: service.mobilizationCost,
        laborHours: service.laborHours,
        mobilizationHours: service.mobilizationHours
      },
      metadata: {
        calculatorVersion: '5.0',
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        serviceCode: serviceCode,
        serviceName: service.name,
        kwRating: kwRating,
        kwRange: engine.getKwRange(kwRating),
        prevailingWageApplied: result.prevailingWageApplied || false,
        taxRate: result.actualTaxRate || 0
      }
    };

    // Log successful calculation
    console.log(`[CPQ Webhook] Service ${serviceCode} pricing calculated:`, {
      kwRating,
      unitPrice: response.unitPrice,
      lineTotal: response.lineTotal,
      processingTime: response.metadata.processingTimeMs + 'ms'
    });

    return res.json(response);

  } catch (error) {
    console.error('[CPQ Webhook] Error calculating pricing:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error during price calculation',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Calculate pricing for multiple services (batch mode)
 * Used when quote has multiple line items
 *
 * @param {Object} req.body
 * @param {Array} req.body.services - Array of service requests
 * @param {Object} req.body.generator - Generator specs (shared across all services)
 * @param {Object} req.body.customerInfo - Customer location info
 * @param {Object} [req.body.settings] - User's custom calculator settings (labor rates, margins, etc.)
 *
 * @returns {Object} Pricing response
 * @returns {boolean} success - Operation success status
 * @returns {Array} lineItems - Array of service pricing line items
 * @returns {number} quoteTotal - Total annual quote value
 * @returns {Object} breakdown - Quote breakdown (subtotal, tax, distance charge)
 * @returns {string} sessionHash - Session hash for bid recreation
 * @returns {Object} metadata - Calculator metadata (version, timestamp)
 */
async function calculateBatchPricing(req, res) {
  try {
    const { services, generator, customerInfo = {}, settings = {} } = req.body;

    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid services array',
        received: services
      });
    }

    if (!generator || !generator.kwRating) {
      return res.status(400).json({
        success: false,
        error: 'Missing generator specs',
        required: ['generator.kwRating']
      });
    }

    // Initialize calculator with user's session settings
    const engine = new EnergenCalculationEngine(settings);

    // Build calculation payload
    const serviceCodes = services.map(s => s.code);
    const serviceFrequencies = {};
    services.forEach(s => {
      serviceFrequencies[s.code] = s.frequency || 1;
    });

    const calcPayload = {
      customerInfo: {
        city: customerInfo.city || 'Berkeley',
        state: customerInfo.state || 'CA',
        zip: customerInfo.zip || '94720'
      },
      generators: [{
        kw: generator.kwRating,
        cylinders: generator.cylinders || null,
        fuelType: generator.fuelType || 'Diesel',
        injectorType: generator.injectorType || null
      }],
      services: serviceCodes,
      serviceFrequencies,
      prevailingWageOverride: customerInfo.prevailingWage ? true : undefined
    };

    // Run calculation
    const result = await engine.calculate(calcPayload);

    // Create session hash for bid recreation
    const sessionManager = getSessionManager();
    const sessionHash = await sessionManager.createSessionHash({
      settings,
      generators: calcPayload.generators,
      services: services,
      customerInfo: calcPayload.customerInfo,
      metadata: {
        quoteTotal: result.total,
        createdAt: new Date().toISOString(),
        calculatorVersion: '5.0'
      }
    });

    // Build response
    const lineItems = result.serviceBreakdown.map(service => ({
      serviceCode: service.code,
      serviceName: service.name,
      unitPrice: service.perVisitPrice,
      quantity: serviceFrequencies[service.code],
      lineTotal: service.annualTotal,
      breakdown: {
        labor: service.laborCost,
        parts: service.partsCost,
        mobilization: service.mobilizationCost
      }
    }));

    const response = {
      success: true,
      lineItems: lineItems,
      quoteTotal: result.total,
      breakdown: {
        subtotal: result.subtotal,
        tax: result.salesTax,
        distanceCharge: result.distanceCharge
      },
      // Session hash for bid recreation
      sessionHash: sessionHash,
      recreationUrl: `/api/bid/recreate/${sessionHash}`,
      // Zoho field mapping for quote metadata
      zohoFields: {
        Session_Hash__c: sessionHash,
        Calculator_Version__c: '5.0',
        Created_At__c: new Date().toISOString()
      },
      metadata: {
        calculatorVersion: '5.0',
        timestamp: new Date().toISOString(),
        servicesCount: lineItems.length,
        prevailingWageApplied: result.prevailingWageApplied || false
      }
    };

    return res.json(response);

  } catch (error) {
    console.error('[CPQ Webhook] Batch pricing error:', error);

    return res.status(500).json({
      success: false,
      error: 'Batch pricing calculation failed',
      message: error.message
    });
  }
}

/**
 * Health check endpoint
 */
function healthCheck(req, res) {
  res.json({
    success: true,
    service: 'zoho-cpq-price-webhook',
    version: '1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      single: 'POST /api/zoho-cpq-price',
      batch: 'POST /api/zoho-cpq-price-batch',
      health: 'GET /api/zoho-cpq-price/health'
    }
  });
}

module.exports = {
  calculateServicePrice,
  calculateBatchPricing,
  healthCheck
};
