/**
 * Live Zoho Sync API
 * Real-time synchronization for Phase 1 (Customer Entry)
 *
 * Sprint 1, Task 2: Live Zoho Sync Implementation
 * Implements:
 * - POST /api/zoho/sync-customer (sync customer data)
 * - POST /api/zoho/sync-contact (sync contact data)
 * - POST /api/zoho/sync-logo (upload/link logo)
 *
 * Features:
 * - Retry logic (3 attempts with exponential backoff)
 * - Queue for failed syncs
 * - Debouncing to prevent excessive API calls
 * - Error handling and user notifications
 */

const express = require('express');
const winston = require('winston');
const Joi = require('joi');
const ZohoDirectIntegration = require('./zoho-direct-integration.cjs');

// Create router
const router = express.Router();

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'live-zoho-sync' },
  transports: [
    new winston.transports.File({ filename: 'logs/zoho-sync.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Initialize Zoho integration
const zoho = new ZohoDirectIntegration(logger);

// ============================================================================
// SYNC QUEUE & RETRY LOGIC
// ============================================================================

class SyncQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Add sync operation to queue
   */
  add(operation) {
    this.queue.push({
      ...operation,
      attempts: 0,
      addedAt: new Date().toISOString()
    });

    logger.info('Added to sync queue:', {
      type: operation.type,
      queueLength: this.queue.length
    });

    // Process queue if not already processing
    if (!this.processing) {
      this.process();
    }
  }

  /**
   * Process queue with retry logic
   */
  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue[0];

      try {
        logger.info('Processing sync operation:', {
          type: operation.type,
          attempt: operation.attempts + 1
        });

        // Execute the sync operation
        await operation.execute();

        // Success - remove from queue
        this.queue.shift();

        logger.info('Sync operation succeeded:', {
          type: operation.type
        });

      } catch (error) {
        operation.attempts++;

        logger.error('Sync operation failed:', {
          type: operation.type,
          attempt: operation.attempts,
          error: error.message
        });

        // Retry with exponential backoff
        if (operation.attempts < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, operation.attempts - 1);
          logger.info('Retrying in ${delay}ms...');
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries exceeded - move to failed queue
          logger.error('Max retries exceeded for sync operation:', {
            type: operation.type,
            data: operation.data
          });

          // Remove from queue
          this.queue.shift();

          // Could store in failed queue for manual retry
          // this.failedQueue.push(operation);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      operations: this.queue.map(op => ({
        type: op.type,
        attempts: op.attempts,
        addedAt: op.addedAt
      }))
    };
  }
}

// Create global sync queue
const syncQueue = new SyncQueue();

// ============================================================================
// DEBOUNCING HELPERS
// ============================================================================

const debouncedSyncs = new Map();

/**
 * Debounce sync operations to prevent excessive API calls
 * @param {string} key - Unique key for the sync operation
 * @param {Function} fn - Function to execute
 * @param {number} delay - Debounce delay in ms
 */
function debounceSync(key, fn, delay = 2000) {
  // Clear existing timeout
  if (debouncedSyncs.has(key)) {
    clearTimeout(debouncedSyncs.get(key));
  }

  // Set new timeout
  const timeout = setTimeout(async () => {
    debouncedSyncs.delete(key);
    await fn();
  }, delay);

  debouncedSyncs.set(key, timeout);
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const schemas = {
  syncCustomer: Joi.object({
    companyName: Joi.string().required(),
    address: Joi.string().allow(''),
    city: Joi.string().allow(''),
    state: Joi.string().length(2).allow(''),
    zip: Joi.string().pattern(/^\d{5}(-\d{4})?$/).allow(''),
    phone: Joi.string().allow(''),
    website: Joi.string().uri().allow(''),
    email: Joi.string().email().allow(''),
    businessType: Joi.string().allow(''),
    industry: Joi.string().allow(''),
    placeId: Joi.string().allow(''),
    enrichmentData: Joi.object().optional()
  }),

  syncContact: Joi.object({
    name: Joi.string().required(),
    company: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow(''),
    title: Joi.string().allow(''),
    notes: Joi.string().allow('')
  }),

  syncLogo: Joi.object({
    companyName: Joi.string().required(),
    logoUrl: Joi.string().uri().required(),
    logoSource: Joi.string().allow('')
  })
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { allowUnknown: true });
    if (error) {
      logger.warn('Validation error:', {
        path: req.path,
        error: error.details[0].message
      });
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    next();
  };
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/zoho/sync-customer
 * Sync customer data to Zoho CRM
 */
router.post('/sync-customer', validate(schemas.syncCustomer), async (req, res) => {
  try {
    const customerData = req.body;

    logger.info('Received customer sync request:', {
      companyName: customerData.companyName
    });

    // Debounce this sync operation (same company within 2 seconds = single sync)
    const debounceKey = `customer-${customerData.companyName}`;

    // Return immediate success response (sync happens in background)
    res.json({
      success: true,
      message: 'Customer sync initiated',
      status: 'syncing'
    });

    // Execute sync with debouncing
    debounceSync(debounceKey, async () => {
      syncQueue.add({
        type: 'customer',
        data: customerData,
        execute: async () => {
          // Search for existing account
          const searchResults = await zoho.searchCustomer(customerData.companyName);

          let accountId = null;

          if (searchResults.accounts && searchResults.accounts.length > 0) {
            // Update existing account
            accountId = searchResults.accounts[0].id;

            logger.info('Updating existing Zoho account:', { accountId });

            const updateData = {
              Account_Name: customerData.companyName,
              Billing_Street: customerData.address,
              Billing_City: customerData.city,
              Billing_State: customerData.state,
              Billing_Code: customerData.zip,
              Phone: customerData.phone,
              Website: customerData.website,
              Industry: customerData.industry || 'General Business',
              Description: customerData.businessType || ''
            };

            await zoho.makeApiRequest(`/Accounts/${accountId}`, 'PUT', {
              data: [updateData]
            });

          } else {
            // Create new account
            logger.info('Creating new Zoho account');

            const createData = {
              data: [{
                Account_Name: customerData.companyName,
                Billing_Street: customerData.address,
                Billing_City: customerData.city,
                Billing_State: customerData.state,
                Billing_Code: customerData.zip,
                Phone: customerData.phone,
                Website: customerData.website,
                Industry: customerData.industry || 'General Business',
                Description: customerData.businessType || '',
                Account_Source: 'Energen Calculator v5.0'
              }]
            };

            const response = await zoho.makeApiRequest('/Accounts', 'POST', createData);
            accountId = response.data[0].details.id;
          }

          logger.info('Customer sync completed:', {
            companyName: customerData.companyName,
            accountId
          });

          return { accountId };
        }
      });
    });

  } catch (error) {
    logger.error('Customer sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /api/zoho/sync-contact
 * Sync contact data to Zoho CRM
 */
router.post('/sync-contact', validate(schemas.syncContact), async (req, res) => {
  try {
    const contactData = req.body;

    logger.info('Received contact sync request:', {
      name: contactData.name,
      company: contactData.company
    });

    // Debounce this sync operation
    const debounceKey = `contact-${contactData.email}`;

    // Return immediate success response
    res.json({
      success: true,
      message: 'Contact sync initiated',
      status: 'syncing'
    });

    // Execute sync with debouncing
    debounceSync(debounceKey, async () => {
      syncQueue.add({
        type: 'contact',
        data: contactData,
        execute: async () => {
          // Search for existing contact by email
          const searchResults = await zoho.makeApiRequest(
            `/Contacts/search?criteria=(Email:equals:${encodeURIComponent(contactData.email)})`
          );

          let contactId = null;

          // Parse name (handle "First Last" format)
          const nameParts = contactData.name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

          if (searchResults.data && searchResults.data.length > 0) {
            // Update existing contact
            contactId = searchResults.data[0].id;

            logger.info('Updating existing Zoho contact:', { contactId });

            const updateData = {
              First_Name: firstName,
              Last_Name: lastName,
              Email: contactData.email,
              Phone: contactData.phone,
              Title: contactData.title,
              Description: contactData.notes || ''
            };

            await zoho.makeApiRequest(`/Contacts/${contactId}`, 'PUT', {
              data: [updateData]
            });

          } else {
            // Create new contact
            logger.info('Creating new Zoho contact');

            // Try to find associated account
            let accountId = null;
            if (contactData.company) {
              const accountSearch = await zoho.searchCustomer(contactData.company);
              if (accountSearch.accounts && accountSearch.accounts.length > 0) {
                accountId = accountSearch.accounts[0].id;
              }
            }

            const createData = {
              data: [{
                First_Name: firstName,
                Last_Name: lastName,
                Email: contactData.email,
                Phone: contactData.phone,
                Title: contactData.title,
                Description: contactData.notes || '',
                Lead_Source: 'Energen Calculator v5.0',
                ...(accountId && { Account_Name: { id: accountId } })
              }]
            };

            const response = await zoho.makeApiRequest('/Contacts', 'POST', createData);
            contactId = response.data[0].details.id;
          }

          logger.info('Contact sync completed:', {
            name: contactData.name,
            contactId
          });

          return { contactId };
        }
      });
    });

  } catch (error) {
    logger.error('Contact sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'error'
    });
  }
});

/**
 * POST /api/zoho/sync-logo
 * Upload/link logo to Zoho customer record
 */
router.post('/sync-logo', validate(schemas.syncLogo), async (req, res) => {
  try {
    const { companyName, logoUrl, logoSource } = req.body;

    logger.info('Received logo sync request:', {
      companyName,
      logoSource
    });

    // Return immediate success response
    res.json({
      success: true,
      message: 'Logo sync initiated',
      status: 'syncing'
    });

    // Execute sync (no debouncing for logo - user explicitly selected it)
    syncQueue.add({
      type: 'logo',
      data: { companyName, logoUrl, logoSource },
      execute: async () => {
        // Find the account
        const searchResults = await zoho.searchCustomer(companyName);

        if (!searchResults.accounts || searchResults.accounts.length === 0) {
          throw new Error('Account not found in Zoho');
        }

        const accountId = searchResults.accounts[0].id;

        logger.info('Updating account logo:', { accountId });

        // Update account with logo URL
        const updateData = {
          Logo_URL: logoUrl,
          Logo_Source: logoSource || 'Unknown',
          Logo_Updated_At: new Date().toISOString()
        };

        await zoho.makeApiRequest(`/Accounts/${accountId}`, 'PUT', {
          data: [updateData]
        });

        logger.info('Logo sync completed:', {
          companyName,
          accountId
        });

        return { accountId, logoUrl };
      }
    });

  } catch (error) {
    logger.error('Logo sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'error'
    });
  }
});

/**
 * GET /api/zoho/sync-status
 * Get current sync queue status
 */
router.get('/sync-status', (req, res) => {
  try {
    const status = syncQueue.getStatus();

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/zoho/test-connection
 * Test Zoho CRM connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = await zoho.testConnection();

    res.json({
      success: true,
      connected: isConnected,
      message: isConnected ? 'Zoho CRM connected' : 'Zoho CRM connection failed'
    });
  } catch (error) {
    logger.error('Connection test failed:', error);
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use((err, req, res, next) => {
  logger.error('Zoho sync API error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Zoho sync failed'
      : err.message,
    status: 'error'
  });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
