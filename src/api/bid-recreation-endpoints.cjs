/**
 * Bid Recreation API Endpoints
 *
 * Provides endpoints to:
 * 1. Create session hash from current bid state
 * 2. Retrieve and restore bid state from hash
 * 3. Integrate with Zoho quotes for complete bid recreation
 */

const { getInstance: getSessionManager } = require('./session-hash-manager.cjs');
const EnergenCalculationEngine = require('./complete-calculation-engine.cjs');

/**
 * POST /api/bid/create-session
 *
 * Create a session hash from current bid state.
 * Returns hash to be embedded in Zoho quote metadata.
 *
 * Request body:
 * {
 *   settings: {...},       // User's custom settings
 *   generators: [...],     // Generator specs
 *   services: [...],       // Selected services
 *   customerInfo: {...},   // Customer data
 *   metadata: {...}        // Optional: user, timestamp, etc.
 * }
 */
async function createBidSession(req, res) {
  try {
    const { settings, generators, services, customerInfo, metadata } = req.body;

    // Validate required fields
    if (!generators || !Array.isArray(generators) || generators.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid generators array',
        received: generators
      });
    }

    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid services array',
        received: services
      });
    }

    // Create session hash
    const sessionManager = getSessionManager();
    const hash = await sessionManager.createSessionHash({
      settings: settings || {},
      generators,
      services,
      customerInfo: customerInfo || {},
      metadata: metadata || {
        createdBy: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString()
      }
    });

    // Return hash and compact version
    const compactHash = sessionManager.createCompactHash({
      settings,
      generators,
      services,
      customerInfo
    });

    res.json({
      success: true,
      sessionHash: hash,
      compactHash,
      embedInQuote: {
        field: 'Session_Hash__c',
        value: hash
      },
      recreationUrl: `/api/bid/recreate/${hash}`
    });

  } catch (error) {
    console.error('Error creating bid session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/bid/recreate/:hash
 *
 * Retrieve complete bid state from session hash.
 * Returns all settings, generators, services for UI restoration.
 */
async function recreateBidFromHash(req, res) {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'Missing session hash parameter'
      });
    }

    // Retrieve session
    const sessionManager = getSessionManager();
    const session = await sessionManager.getSessionByHash(hash);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        hash
      });
    }

    res.json({
      success: true,
      session: {
        version: session.version,
        timestamp: session.timestamp,
        settings: session.settings,
        generators: session.generators,
        services: session.services,
        customerInfo: session.customerInfo,
        metadata: session.metadata
      }
    });

  } catch (error) {
    console.error('Error recreating bid from hash:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/bid/recreate-and-calculate/:hash
 *
 * Retrieve bid state AND recalculate pricing in one call.
 * Useful for verifying quote accuracy.
 */
async function recreateAndCalculate(req, res) {
  try {
    const { hash } = req.params;

    // Retrieve session
    const sessionManager = getSessionManager();
    const session = await sessionManager.getSessionByHash(hash);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        hash
      });
    }

    // Initialize calculator with stored settings
    const logger = req.app.get('logger') || console;
    const engine = new EnergenCalculationEngine(session.settings, logger);

    // Build calculation payload
    const calcPayload = {
      customerInfo: session.customerInfo,
      generators: session.generators,
      services: session.services.map(s => s.code || s),
      serviceFrequencies: session.services.reduce((acc, s) => {
        const code = s.code || s;
        acc[code] = s.frequency || 1;
        return acc;
      }, {}),
      contractLength: 12,
      settings: session.settings
    };

    // Calculate pricing
    const result = await engine.calculate(calcPayload);

    res.json({
      success: true,
      session: {
        version: session.version,
        timestamp: session.timestamp,
        settings: session.settings,
        generators: session.generators,
        services: session.services,
        customerInfo: session.customerInfo
      },
      calculation: result.calculation,
      recreatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error recreating and calculating bid:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/bid/sessions/stats
 *
 * Get session storage statistics
 */
function getSessionStats(req, res) {
  try {
    const sessionManager = getSessionManager();
    const stats = sessionManager.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting session stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/bid/sessions/cleanup
 *
 * Clean up expired sessions (admin endpoint)
 */
async function cleanupExpiredSessions(req, res) {
  try {
    const sessionManager = getSessionManager();
    const deletedCount = await sessionManager.cleanupExpiredSessions();

    res.json({
      success: true,
      deletedSessions: deletedCount
    });

  } catch (error) {
    console.error('Error cleaning up sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  createBidSession,
  recreateBidFromHash,
  recreateAndCalculate,
  getSessionStats,
  cleanupExpiredSessions
};
