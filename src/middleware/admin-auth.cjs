/**
 * Admin Authentication Middleware
 * Verifies user has admin role and provides audit logging
 *
 * @module src/middleware/admin-auth
 * @version 1.0.0
 */

const rateLimit = require('express-rate-limit');

/**
 * Admin authentication middleware
 * Verifies user has admin role (currently simplified)
 * In production, integrate with actual user management system
 */
function requireAdmin(req, res, next) {
  // Check for admin token/session
  const adminToken = req.headers['x-admin-token'] || req.cookies?.adminToken;

  // Simplified check - in production, validate against user database
  if (!adminToken) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required'
    });
  }

  // Validate admin token (simplified)
  const validAdminToken = process.env.ADMIN_TOKEN || 'energen-admin-2025';
  if (adminToken !== validAdminToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid admin credentials'
    });
  }

  // Add admin user info to request
  req.admin = {
    id: 'admin',
    role: 'admin',
    permissions: ['read', 'write', 'delete']
  };

  next();
}

/**
 * Rate limiter for admin endpoints
 * More permissive than public endpoints but still protected
 */
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Audit logging middleware
 * Logs all admin actions for compliance and debugging
 */
function auditLog(logger) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      const duration = Date.now() - startTime;

      // Log admin action
      logger.info('Admin action:', {
        timestamp: new Date().toISOString(),
        admin: req.admin?.id || 'unknown',
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        success: body?.success !== false
      });

      return originalJson(body);
    };

    next();
  };
}

/**
 * Sanitize request body for logging
 * Remove sensitive fields
 */
function sanitizeBody(body) {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Permission check middleware
 * Verifies admin has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }

    next();
  };
}

module.exports = {
  requireAdmin,
  adminRateLimiter,
  auditLog,
  requirePermission
};
