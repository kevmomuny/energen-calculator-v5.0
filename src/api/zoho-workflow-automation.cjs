/**
 * Zoho Workflow Automation Service
 * Orchestrates complete quote-to-work-order lifecycle
 *
 * Workflows:
 * 1. Quote Acceptance → Service Agreement → Generator Assets
 * 2. Service Agreement Activation → Auto-Schedule Work Orders
 * 3. Work Order Completion → Update Asset & Schedule Next Service
 */

const ZohoGeneratorAssetAPI = require('./zoho-generator-asset-api.cjs');
const ZohoServiceAgreementAPI = require('./zoho-service-agreement-api.cjs');
const ZohoWorkOrderAPI = require('./zoho-work-order-api.cjs');

class ZohoWorkflowAutomation {
    constructor(logger = null) {
        this.logger = logger || console;
        this.assetAPI = new ZohoGeneratorAssetAPI(logger);
        this.agreementAPI = new ZohoServiceAgreementAPI(logger);
        this.workOrderAPI = new ZohoWorkOrderAPI(logger);
    }

    /**
     * WORKFLOW 1: Convert Calculator Quote to Service Agreement
     *
     * Steps:
     * 1. Create generator assets for each unit in the quote
     * 2. Create service agreement linking assets to customer
     * 3. Return agreement ID for further processing
     */
    async convertQuoteToAgreement(quoteData) {
        this.logger.info('🔄 Starting Quote → Agreement conversion workflow...');

        const {
            quoteId,
            customer,
            units,
            services,
            totals,
            startDate,
            endDate
        } = quoteData;

        try {
            // Step 1: Create generator assets for each unit
            this.logger.info(`📝 Creating ${units.length} generator assets...`);
            const assetIds = [];

            for (const unit of units) {
                const assetData = {
                    // Basic Info
                    model: unit.model || 'Generator',
                    kwRating: unit.kw,
                    serialNumber: unit.serialNumber || '',
                    fuelType: unit.fuelType || 'Diesel',

                    // Customer Link
                    customerId: customer.zohoAccountId,
                    customerName: customer.companyName,
                    installationAddress: customer.address || unit.location,

                    // Technical Details (from unit configuration)
                    engineMake: unit.engineMake || '',
                    engineModel: unit.engineModel || '',
                    cylinders: unit.cylinders,
                    oilType: unit.oilType,
                    oilCapacity: unit.oilCapacity,
                    coolantType: unit.coolantType,
                    coolantCapacity: unit.coolantCapacity,

                    // Service Info
                    installDate: unit.installDate || startDate,

                    // Status
                    status: 'Active',
                    warrantyStatus: unit.warrantyStatus || 'Active',
                    warrantyExpiry: unit.warrantyExpiry || null
                };

                const assetResult = await this.assetAPI.createGeneratorAsset(assetData);

                if (assetResult.success) {
                    assetIds.push(assetResult.assetId);
                    this.logger.info(`✅ Created asset ${assetResult.assetId} for unit ${unit.id}`);
                } else {
                    this.logger.error(`❌ Failed to create asset for unit ${unit.id}`);
                    // Continue with other assets even if one fails
                }
            }

            // Step 2: Create service agreement
            this.logger.info('📝 Creating service agreement...');

            const agreementData = {
                quoteId: quoteId,
                customerId: customer.zohoAccountId,
                customerName: customer.companyName,
                generatorAssetIds: assetIds,

                // Agreement Details
                agreementNumber: `SA-${Date.now()}`,  // Generate unique number
                startDate: startDate,
                endDate: endDate,
                autoRenew: false,

                // Services from calculator
                servicesIncluded: services.map(s => s.code),

                // Financial
                annualValue: totals.annual,
                quarterlyValue: totals.quarterly,
                paymentTerms: 'Net 30',
                billingFrequency: 'Quarterly',

                // Contacts
                primaryContactId: customer.primaryContactId || null,
                billingContactId: customer.billingContactId || null,

                // Status
                status: 'Active'  // Immediately activate
            };

            const agreementResult = await this.agreementAPI.createServiceAgreement(agreementData);

            if (agreementResult.success) {
                this.logger.info(`✅ Service agreement created: ${agreementResult.agreementId}`);

                // Step 3: Link assets to agreement
                for (const assetId of assetIds) {
                    await this.assetAPI.linkServiceAgreement(assetId, agreementResult.agreementId);
                }

                return {
                    success: true,
                    agreementId: agreementResult.agreementId,
                    assetIds: assetIds,
                    message: `Created service agreement with ${assetIds.length} generator assets`
                };
            } else {
                throw new Error('Failed to create service agreement');
            }

        } catch (error) {
            this.logger.error('❌ Quote → Agreement workflow failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * WORKFLOW 2: Auto-Schedule Work Orders from Service Agreement
     *
     * Based on service frequencies from calculator:
     * - Service A (Annual): 1x per year
     * - Service B (Semi-Annual): 2x per year
     * - Service C (Quarterly): 4x per year
     * etc.
     */
    async autoScheduleWorkOrders(agreementId, scheduleData) {
        this.logger.info(`🔄 Starting auto-schedule workflow for agreement ${agreementId}...`);

        const {
            startDate,
            services,  // Array of { code, name, frequency, cost }
            generatorAssets,  // Array of asset records
            customer
        } = scheduleData;

        try {
            const workOrders = [];
            const start = new Date(startDate);

            // For each service, create work orders based on frequency
            for (const service of services) {
                const frequency = service.frequency || 1;
                const monthsBetween = 12 / frequency;  // 12 months / frequency

                // Create work orders for the first year
                for (let i = 0; i < frequency; i++) {
                    const scheduledDate = new Date(start);
                    scheduledDate.setMonth(scheduledDate.getMonth() + (i * monthsBetween));

                    // Create work order for each generator asset
                    for (const asset of generatorAssets) {
                        const workOrderData = {
                            serviceAgreementId: agreementId,
                            generatorAssetId: asset.id,
                            customerId: customer.zohoAccountId,
                            customerName: customer.companyName,

                            workOrderNumber: `WO-${Date.now()}-${i}`,
                            serviceType: service.code,
                            scheduledDate: scheduledDate.toISOString().split('T')[0],
                            scheduledTime: '09:00',  // Default time

                            serviceAddress: asset.Installation_Address || customer.address,
                            siteContact: customer.primaryContact || '',
                            sitePhone: customer.phone || '',

                            serviceName: service.name,
                            estimatedDuration: this._getEstimatedDuration(service.code),
                            partsRequired: this._getRequiredParts(service.code),

                            status: 'Scheduled',
                            priority: 'Normal'
                        };

                        const woResult = await this.workOrderAPI.createWorkOrder(workOrderData);

                        if (woResult.success) {
                            workOrders.push(woResult.workOrderId);
                            this.logger.info(`✅ Created work order ${woResult.workOrderId} for ${service.name}`);
                        }
                    }
                }
            }

            return {
                success: true,
                workOrdersCreated: workOrders.length,
                workOrderIds: workOrders,
                message: `Scheduled ${workOrders.length} work orders for the first year`
            };

        } catch (error) {
            this.logger.error('❌ Auto-schedule workflow failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * WORKFLOW 3: Complete Work Order & Schedule Next Service
     *
     * When technician completes work order:
     * 1. Update work order status
     * 2. Update generator asset service dates
     * 3. Auto-create next work order based on frequency
     */
    async completeWorkOrderAndScheduleNext(workOrderId, completionData) {
        this.logger.info(`🔄 Starting work order completion workflow for ${workOrderId}...`);

        try {
            // Step 1: Complete the work order
            this.logger.info('📝 Marking work order as completed...');
            const completionResult = await this.workOrderAPI.completeWorkOrder(workOrderId, completionData);

            if (!completionResult.success) {
                throw new Error('Failed to complete work order');
            }

            // Step 2: Get work order details to find related records
            const woResult = await this.workOrderAPI.getWorkOrder(workOrderId);
            if (!woResult.success) {
                throw new Error('Failed to retrieve work order details');
            }

            const workOrder = woResult.workOrder;

            // Step 3: Calculate next service date based on service frequency
            const nextDate = this._calculateNextServiceDate(
                completionData.completionDate || new Date().toISOString().split('T')[0],
                workOrder.Service_Type
            );

            // Step 4: Create next work order
            if (nextDate && workOrder.Service_Agreement) {
                this.logger.info(`📝 Scheduling next service for ${nextDate}...`);

                const nextWorkOrderData = {
                    serviceAgreementId: workOrder.Service_Agreement.id,
                    generatorAssetId: workOrder.Generator_Asset.id,
                    customerId: workOrder.Customer_Account.id,
                    customerName: workOrder.Customer_Account.name,

                    workOrderNumber: `WO-${Date.now()}`,
                    serviceType: workOrder.Service_Type,
                    scheduledDate: nextDate,
                    scheduledTime: workOrder.Scheduled_Time || '09:00',

                    serviceAddress: workOrder.Service_Address,
                    siteContact: workOrder.Site_Contact,
                    sitePhone: workOrder.Site_Phone,

                    serviceName: workOrder.Service_Name,
                    estimatedDuration: workOrder.Estimated_Duration,
                    partsRequired: [],

                    status: 'Scheduled',
                    priority: 'Normal'
                };

                const nextWoResult = await this.workOrderAPI.createWorkOrder(nextWorkOrderData);

                if (nextWoResult.success) {
                    this.logger.info(`✅ Next service scheduled: ${nextWoResult.workOrderId}`);
                }
            }

            return {
                success: true,
                completedWorkOrderId: workOrderId,
                nextServiceDate: nextDate,
                message: 'Work order completed and next service scheduled'
            };

        } catch (error) {
            this.logger.error('❌ Work order completion workflow failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Helper: Get estimated duration for service type
     */
    _getEstimatedDuration(serviceCode) {
        const durations = {
            'A': 2,    // Annual: 2 hours
            'B': 3,    // Semi-Annual: 3 hours
            'C': 1.5,  // Quarterly: 1.5 hours
            'D': 1.5,  // Quarterly: 1.5 hours
            'E': 4,    // Load Bank: 4 hours
            'F': 1,    // Oil Sample: 1 hour
            'G': 1,    // Coolant Sample: 1 hour
            'H': 2,    // Coolant Change: 2 hours
            'I': 3,    // Oil Change: 3 hours
            'J': 0.5,  // Battery Service: 0.5 hours
            'K': 2,    // Custom: 2 hours
            'CUSTOM': 2  // Custom: 2 hours
        };

        return durations[serviceCode] || 2;
    }

    /**
     * Helper: Get required parts for service type
     */
    _getRequiredParts(serviceCode) {
        const parts = {
            'A': ['Oil Filter', 'Air Filter', 'Fuel Filter'],
            'B': ['Oil Filter', 'Air Filter', 'Fuel Filter', 'Coolant'],
            'C': ['Oil Filter'],
            'D': ['Air Filter', 'Fuel Filter'],
            'E': ['Load Bank Equipment'],
            'F': ['Oil Sample Kit'],
            'G': ['Coolant Sample Kit'],
            'H': ['Coolant', 'Coolant Filter'],
            'I': ['Oil', 'Oil Filter'],
            'J': ['Battery Terminals', 'Battery Cleaner'],
            'K': [],
            'CUSTOM': []
        };

        return parts[serviceCode] || [];
    }

    /**
     * Helper: Calculate next service date based on frequency
     */
    _calculateNextServiceDate(completionDate, serviceCode) {
        const frequencies = {
            'A': 12,   // Annual: 12 months
            'B': 6,    // Semi-Annual: 6 months
            'C': 3,    // Quarterly: 3 months
            'D': 3,    // Quarterly: 3 months
            'E': 12,   // Load Bank: Annual
            'F': 6,    // Oil Sample: Semi-Annual
            'G': 6,    // Coolant Sample: Semi-Annual
            'H': 24,   // Coolant Change: Every 2 years
            'I': 12,   // Oil Change: Annual
            'J': 6,    // Battery Service: Semi-Annual
            'K': 12,   // Custom: Annual (default)
            'CUSTOM': 12  // Custom: Annual (default)
        };

        const monthsToAdd = frequencies[serviceCode] || 12;
        const nextDate = new Date(completionDate);
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

        return nextDate.toISOString().split('T')[0];
    }

    /**
     * Batch Create Work Orders for Multiple Agreements
     * Useful for initial setup or bulk scheduling
     */
    async batchScheduleWorkOrders(agreements) {
        this.logger.info(`🔄 Batch scheduling work orders for ${agreements.length} agreements...`);

        const results = [];

        for (const agreement of agreements) {
            const result = await this.autoScheduleWorkOrders(agreement.id, {
                startDate: agreement.startDate,
                services: agreement.services,
                generatorAssets: agreement.generatorAssets,
                customer: agreement.customer
            });

            results.push({
                agreementId: agreement.id,
                ...result
            });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const totalWorkOrders = results.reduce((sum, r) => sum + (r.workOrdersCreated || 0), 0);

        return {
            success: true,
            agreementsProcessed: agreements.length,
            totalWorkOrdersCreated: totalWorkOrders,
            results: results
        };
    }
}

module.exports = ZohoWorkflowAutomation;
