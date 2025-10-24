/**
 * Zoho Integration Endpoints
 * Add these endpoints to server-secure.cjs
 *
 * Provides REST API for:
 * - Quote to Service Agreement conversion
 * - Work order auto-scheduling
 * - Work order completion tracking
 * - Generator asset management
 * - Service agreement management
 */

const ZohoWorkflowAutomation = require('./zoho-workflow-automation.cjs');
const ZohoGeneratorAssetAPI = require('./zoho-generator-asset-api.cjs');
const ZohoServiceAgreementAPI = require('./zoho-service-agreement-api.cjs');
const ZohoWorkOrderAPI = require('./zoho-work-order-api.cjs');

/**
 * Register all Zoho endpoints on Express app
 * @param {Express} app - Express application instance
 * @param {Object} logger - Logger instance
 */
function registerZohoEndpoints(app, logger) {
    // Initialize Zoho APIs
    const zohoWorkflow = new ZohoWorkflowAutomation(logger);
    const zohoAssetAPI = new ZohoGeneratorAssetAPI(logger);
    const zohoAgreementAPI = new ZohoServiceAgreementAPI(logger);
    const zohoWorkOrderAPI = new ZohoWorkOrderAPI(logger);

    /**
     * Convert Calculator Quote to Zoho Service Agreement
     * POST /api/zoho/convert-quote
     *
     * Request Body:
     * {
     *   quoteData: {
     *     quoteId: string,
     *     customer: { zohoAccountId, companyName, address, ... },
     *     units: [{ id, kw, model, services, ... }],
     *     services: [{ code, name, frequency, cost }],
     *     totals: { annual, quarterly },
     *     startDate: string,
     *     endDate: string
     *   }
     * }
     *
     * Response:
     * {
     *   success: boolean,
     *   agreementId: string,
     *   assetIds: string[],
     *   message: string
     * }
     */
    app.post('/api/zoho/convert-quote', async (req, res) => {
        try {
            logger.info('📝 Converting calculator quote to Zoho service agreement...');

            const { quoteData } = req.body;

            if (!quoteData || !quoteData.customer || !quoteData.units) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required quote data (customer, units)'
                });
            }

            const result = await zohoWorkflow.convertQuoteToAgreement(quoteData);

            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to convert quote:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Auto-Schedule Work Orders from Service Agreement
     * POST /api/zoho/schedule-work-orders
     *
     * Request Body:
     * {
     *   agreementId: string,
     *   scheduleData: {
     *     startDate: string,
     *     services: [{ code, name, frequency, cost }],
     *     generatorAssets: [{ id, Installation_Address, ... }],
     *     customer: { zohoAccountId, companyName, address, phone }
     *   }
     * }
     *
     * Response:
     * {
     *   success: boolean,
     *   workOrdersCreated: number,
     *   workOrderIds: string[],
     *   message: string
     * }
     */
    app.post('/api/zoho/schedule-work-orders', async (req, res) => {
        try {
            logger.info('📅 Auto-scheduling work orders...');

            const { agreementId, scheduleData } = req.body;

            if (!agreementId || !scheduleData) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing agreementId or scheduleData'
                });
            }

            const result = await zohoWorkflow.autoScheduleWorkOrders(agreementId, scheduleData);

            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to schedule work orders:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Complete Work Order and Schedule Next Service
     * POST /api/zoho/complete-work-order
     *
     * Request Body:
     * {
     *   workOrderId: string,
     *   completionData: {
     *     completionNotes: string,
     *     hoursRun: number,
     *     partsUsed: string[],
     *     nextServiceDue: string,
     *     technicianSignature: string,
     *     customerSignature: string
     *   }
     * }
     *
     * Response:
     * {
     *   success: boolean,
     *   completedWorkOrderId: string,
     *   nextServiceDate: string,
     *   message: string
     * }
     */
    app.post('/api/zoho/complete-work-order', async (req, res) => {
        try {
            logger.info('✅ Completing work order...');

            const { workOrderId, completionData } = req.body;

            if (!workOrderId || !completionData) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing workOrderId or completionData'
                });
            }

            const result = await zohoWorkflow.completeWorkOrderAndScheduleNext(workOrderId, completionData);

            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to complete work order:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Create Generator Asset
     * POST /api/zoho/generator-asset
     */
    app.post('/api/zoho/generator-asset', async (req, res) => {
        try {
            logger.info('📝 Creating generator asset...');
            const result = await zohoAssetAPI.createGeneratorAsset(req.body);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to create generator asset:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Get Generator Assets by Customer
     * GET /api/zoho/generator-assets/:customerId
     */
    app.get('/api/zoho/generator-assets/:customerId', async (req, res) => {
        try {
            const { customerId } = req.params;
            const result = await zohoAssetAPI.searchGeneratorAssetsByCustomer(customerId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch generator assets:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get Generator Asset by ID
     * GET /api/zoho/generator-asset/:assetId
     */
    app.get('/api/zoho/generator-asset/:assetId', async (req, res) => {
        try {
            const { assetId } = req.params;
            const result = await zohoAssetAPI.getGeneratorAsset(assetId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch generator asset:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Update Generator Asset
     * PUT /api/zoho/generator-asset/:assetId
     */
    app.put('/api/zoho/generator-asset/:assetId', async (req, res) => {
        try {
            const { assetId } = req.params;
            const result = await zohoAssetAPI.updateGeneratorAsset(assetId, req.body);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to update generator asset:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Create Service Agreement
     * POST /api/zoho/service-agreement
     */
    app.post('/api/zoho/service-agreement', async (req, res) => {
        try {
            logger.info('📝 Creating service agreement...');
            const result = await zohoAgreementAPI.createServiceAgreement(req.body);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to create service agreement:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Get Service Agreements by Customer
     * GET /api/zoho/service-agreements/:customerId
     */
    app.get('/api/zoho/service-agreements/:customerId', async (req, res) => {
        try {
            const { customerId } = req.params;
            const result = await zohoAgreementAPI.searchServiceAgreementsByCustomer(customerId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch service agreements:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get Service Agreement by ID
     * GET /api/zoho/service-agreement/:agreementId
     */
    app.get('/api/zoho/service-agreement/:agreementId', async (req, res) => {
        try {
            const { agreementId } = req.params;
            const result = await zohoAgreementAPI.getServiceAgreement(agreementId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch service agreement:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Activate Service Agreement
     * POST /api/zoho/service-agreement/:agreementId/activate
     */
    app.post('/api/zoho/service-agreement/:agreementId/activate', async (req, res) => {
        try {
            const { agreementId } = req.params;
            const result = await zohoAgreementAPI.activateAgreement(agreementId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to activate service agreement:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Create Work Order
     * POST /api/zoho/work-order
     */
    app.post('/api/zoho/work-order', async (req, res) => {
        try {
            logger.info('📝 Creating work order...');
            const result = await zohoWorkOrderAPI.createWorkOrder(req.body);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to create work order:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Get Work Orders by Service Agreement
     * GET /api/zoho/work-orders/agreement/:agreementId
     */
    app.get('/api/zoho/work-orders/agreement/:agreementId', async (req, res) => {
        try {
            const { agreementId } = req.params;
            const result = await zohoWorkOrderAPI.getWorkOrdersByAgreement(agreementId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch work orders:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get Upcoming Work Orders
     * GET /api/zoho/work-orders/upcoming?days=30
     */
    app.get('/api/zoho/work-orders/upcoming', async (req, res) => {
        try {
            const daysAhead = parseInt(req.query.days) || 30;
            const result = await zohoWorkOrderAPI.getUpcomingWorkOrders(daysAhead);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch upcoming work orders:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get Work Orders by Technician
     * GET /api/zoho/work-orders/technician/:technicianId?status=Scheduled
     */
    app.get('/api/zoho/work-orders/technician/:technicianId', async (req, res) => {
        try {
            const { technicianId } = req.params;
            const { status } = req.query;
            const result = await zohoWorkOrderAPI.getWorkOrdersByTechnician(technicianId, status || null);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch technician work orders:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * Get Work Order by ID
     * GET /api/zoho/work-order/:workOrderId
     */
    app.get('/api/zoho/work-order/:workOrderId', async (req, res) => {
        try {
            const { workOrderId } = req.params;
            const result = await zohoWorkOrderAPI.getWorkOrder(workOrderId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to fetch work order:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Assign Technician to Work Order
     * POST /api/zoho/work-order/:workOrderId/assign
     */
    app.post('/api/zoho/work-order/:workOrderId/assign', async (req, res) => {
        try {
            const { workOrderId } = req.params;
            const { technicianId, technicianName } = req.body;

            if (!technicianId || !technicianName) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing technicianId or technicianName'
                });
            }

            const result = await zohoWorkOrderAPI.assignTechnician(workOrderId, technicianId, technicianName);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to assign technician:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Start Work Order
     * POST /api/zoho/work-order/:workOrderId/start
     */
    app.post('/api/zoho/work-order/:workOrderId/start', async (req, res) => {
        try {
            const { workOrderId } = req.params;
            const result = await zohoWorkOrderAPI.startWorkOrder(workOrderId);
            res.json(result);
        } catch (error) {
            logger.error('❌ Failed to start work order:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    /**
     * Get Contacts for Zoho Account
     * GET /api/zoho/contacts/:accountId
     */
    app.get('/api/zoho/contacts/:accountId', async (req, res) => {
        try {
            const { accountId } = req.params;
            logger.info(`📇 Fetching contacts for account: ${accountId}`);

            // Use ZohoDirectIntegration to get contacts
            const ZohoDirectIntegration = require('./zoho-direct-integration.cjs');
            const zohoIntegration = new ZohoDirectIntegration(logger);

            const contacts = await zohoIntegration.getContactsByAccount(accountId);

            res.json({
                success: true,
                contacts: contacts,
                count: contacts.length
            });
        } catch (error) {
            logger.error('❌ Failed to fetch contacts:', error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                contacts: []
            });
        }
    });

    logger.info('✅ Zoho integration endpoints registered');
}

module.exports = { registerZohoEndpoints };
