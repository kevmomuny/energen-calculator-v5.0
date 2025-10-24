/**
 * Zoho Inventory Integration - Parts Tracking & Purchase Orders
 * Direct API integration for inventory management in generator service operations
 *
 * Features:
 * - Parts availability checking
 * - Purchase order creation
 * - Parts usage tracking (stock adjustments)
 * - Service-specific parts recommendations
 */

const fetch = require('node-fetch');
require('dotenv').config();

class ZohoInventoryIntegration {
    constructor(zohoAuth, logger = console) {
        this.zohoAuth = zohoAuth;
        this.logger = logger;
        this.apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
        this.inventoryBaseUrl = `${this.apiDomain}/inventory/v1`;
        this.organizationId = process.env.ZOHO_INVENTORY_ORGANIZATION_ID;

        if (!this.organizationId) {
            this.logger.warn('[INVENTORY] ⚠️ ZOHO_INVENTORY_ORGANIZATION_ID not set in .env');
        }
    }

    /**
     * Make authenticated API request to Zoho Inventory
     * @param {string} endpoint - API endpoint (e.g., '/items', '/purchaseorders')
     * @param {string} method - HTTP method
     * @param {object} body - Request body (for POST/PUT)
     * @returns {Promise<object>} API response
     */
    async makeApiRequest(endpoint, method = 'GET', body = null) {
        try {
            const token = await this.zohoAuth.getAccessToken();

            if (!this.organizationId) {
                throw new Error('ZOHO_INVENTORY_ORGANIZATION_ID not configured');
            }

            const separator = endpoint.includes('?') ? '&' : '?';
            const url = `${this.inventoryBaseUrl}${endpoint}${separator}organization_id=${this.organizationId}`;

            const options = {
                method,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }

            this.logger.debug(`[INVENTORY] ${method} ${endpoint}`);

            const response = await fetch(url, options);

            if (!response.ok) {
                const error = await response.text();
                this.logger.error(`[INVENTORY] API error ${response.status}:`, error);
                throw new Error(`Zoho Inventory API error: ${response.status} - ${error}`);
            }

            return await response.json();
        } catch (error) {
            this.logger.error('[INVENTORY] API request failed:', error.message);
            throw error;
        }
    }

    /**
     * Get all items (parts/filters/fluids)
     * @param {object} filters - Search filters
     * @returns {Promise<Array>} List of items
     */
    async listItems(filters = {}) {
        try {
            let endpoint = '/items';
            const params = new URLSearchParams();

            if (filters.search) params.append('search_text', filters.search);
            if (filters.category) params.append('category_id', filters.category);
            if (filters.sku) params.append('sku', filters.sku);

            if (params.toString()) endpoint += '?' + params.toString();

            this.logger.info('[INVENTORY] Listing items with filters:', filters);

            const response = await this.makeApiRequest(endpoint, 'GET');
            return response.items || [];
        } catch (error) {
            this.logger.error('[INVENTORY] List items failed:', error.message);
            throw error;
        }
    }

    /**
     * Check parts availability for service
     * @param {Array<string>} partNumbers - Part SKUs or names to check
     * @returns {Promise<object>} Availability status for each part
     */
    async checkPartsAvailability(partNumbers) {
        try {
            this.logger.info('[INVENTORY] Checking availability for parts:', partNumbers);

            const items = await this.listItems();
            const availability = {};

            partNumbers.forEach(partNum => {
                const item = items.find(i =>
                    i.sku === partNum ||
                    i.name.toLowerCase().includes(partNum.toLowerCase())
                );

                if (item) {
                    availability[partNum] = {
                        available: item.stock_on_hand > 0,
                        quantity: item.stock_on_hand || 0,
                        itemId: item.item_id,
                        itemName: item.name,
                        rate: item.rate || 0,
                        unit: item.unit || 'qty',
                        reorderLevel: item.reorder_level || 0,
                        needsReorder: item.stock_on_hand <= (item.reorder_level || 0)
                    };
                } else {
                    availability[partNum] = {
                        available: false,
                        quantity: 0,
                        itemId: null,
                        itemName: 'Not found in inventory',
                        rate: 0
                    };
                }
            });

            this.logger.info('[INVENTORY] ✅ Availability check complete');
            return availability;
        } catch (error) {
            this.logger.error('[INVENTORY] Check availability failed:', error.message);
            throw error;
        }
    }

    /**
     * Create purchase order for parts
     * @param {object} poData - Purchase order details
     * @returns {Promise<object>} Created PO details
     */
    async createPurchaseOrder(poData) {
        try {
            this.logger.info('[INVENTORY] Creating purchase order');

            const purchaseOrder = {
                vendor_id: poData.vendorId,
                purchaseorder_number: poData.poNumber || null, // Auto-generate if null
                date: poData.date || new Date().toISOString().split('T')[0],
                delivery_date: poData.expectedDelivery,
                line_items: poData.items.map(item => ({
                    item_id: item.itemId,
                    quantity: item.quantity,
                    rate: item.rate || 0,
                    description: item.description || ''
                })),
                notes: poData.notes || 'Parts order for generator service',
                terms: poData.terms || '',
                delivery_address: poData.deliveryAddress || null
            };

            const response = await this.makeApiRequest('/purchaseorders', 'POST', purchaseOrder);

            this.logger.info('[INVENTORY] ✅ PO created:', response.purchaseorder.purchaseorder_id);

            return {
                success: true,
                poId: response.purchaseorder.purchaseorder_id,
                poNumber: response.purchaseorder.purchaseorder_number,
                total: response.purchaseorder.total,
                status: response.purchaseorder.status
            };
        } catch (error) {
            this.logger.error('[INVENTORY] PO creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Track parts used in work order
     * Creates inventory adjustment to decrease stock
     * @param {string} workOrderId - Work order identifier
     * @param {Array} partsUsed - Parts consumed
     * @returns {Promise<object>} Adjustment details
     */
    async trackPartsUsage(workOrderId, partsUsed) {
        try {
            this.logger.info('[INVENTORY] Tracking parts usage for WO:', workOrderId);

            // Create inventory adjustment (decrease stock)
            const adjustment = {
                date: new Date().toISOString().split('T')[0],
                adjustment_type: 'quantity',
                reason: `Used in Work Order ${workOrderId}`,
                description: `Parts consumed during generator service - WO ${workOrderId}`,
                line_items: partsUsed.map(part => ({
                    item_id: part.itemId,
                    quantity_adjusted: -Math.abs(part.quantityUsed), // Negative for decrease
                    warehouse_id: part.warehouseId || null
                }))
            };

            const response = await this.makeApiRequest('/inventoryadjustments', 'POST', adjustment);

            this.logger.info('[INVENTORY] ✅ Parts usage tracked:', response.inventoryadjustment.adjustment_id);

            return {
                success: true,
                adjustmentId: response.inventoryadjustment.adjustment_id,
                totalValue: response.inventoryadjustment.adjustment_value,
                itemsAdjusted: partsUsed.length
            };
        } catch (error) {
            this.logger.error('[INVENTORY] Parts tracking failed:', error.message);
            throw error;
        }
    }

    /**
     * Get item by SKU or name
     * @param {string} identifier - SKU or partial name
     * @returns {Promise<object|null>} Item details or null
     */
    async getItem(identifier) {
        try {
            const items = await this.listItems({ search: identifier });
            return items[0] || null;
        } catch (error) {
            this.logger.error('[INVENTORY] Get item failed:', error.message);
            throw error;
        }
    }

    /**
     * Create new item (part) in inventory
     * @param {object} itemData - Item details
     * @returns {Promise<object>} Created item
     */
    async createItem(itemData) {
        try {
            this.logger.info('[INVENTORY] Creating new item:', itemData.name);

            const item = {
                name: itemData.name,
                sku: itemData.sku || itemData.partNumber,
                unit: itemData.unit || 'qty',
                item_type: itemData.itemType || 'sales_and_purchases',
                product_type: 'goods',
                description: itemData.description || '',
                rate: itemData.rate || 0,
                purchase_rate: itemData.purchaseRate || itemData.rate || 0,
                initial_stock: itemData.initialStock || 0,
                initial_stock_rate: itemData.purchaseRate || 0,
                reorder_level: itemData.reorderLevel || 5,
                vendor_id: itemData.vendorId || null,
                category_id: itemData.categoryId || null
            };

            const response = await this.makeApiRequest('/items', 'POST', item);

            this.logger.info('[INVENTORY] ✅ Item created:', response.item.item_id);
            return response.item;
        } catch (error) {
            this.logger.error('[INVENTORY] Item creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Get common generator service parts based on service code
     * Maps service codes to typical parts requirements
     * @param {string} serviceCode - Service code (A-J, K, CUSTOM)
     * @param {object} generatorSpecs - Generator specifications
     * @returns {Promise<object>} Parts requirements and availability
     */
    async getServiceParts(serviceCode, generatorSpecs = {}) {
        try {
            this.logger.info('[INVENTORY] Getting parts for service:', serviceCode);

            // Map service codes to typical parts (SKU patterns)
            const partsMap = {
                'A': ['oil-filter', 'air-filter', 'fuel-filter'],
                'B': ['oil-filter', 'air-filter', 'fuel-filter', 'spark-plugs'],
                'C': ['oil-filter', 'air-filter', 'fuel-filter', 'coolant', 'belts'],
                'D': ['battery'],
                'E': ['coolant-flush', 'coolant'],
                'F': ['fuel-filter', 'fuel-system-cleaner'],
                'G': ['air-filter'],
                'H': ['oil-pan-heater-element'],
                'I': ['injector-nozzles'],
                'J': ['dpf-regen-fluid', 'def-fluid'],
                'K': ['load-bank'], // Load bank testing equipment
                'CUSTOM': [] // Custom services have no predefined parts
            };

            const partNumbers = partsMap[serviceCode] || [];

            if (partNumbers.length === 0) {
                this.logger.info(`[INVENTORY] No predefined parts for service ${serviceCode}`);
                return {
                    serviceCode,
                    partsRequired: [],
                    availability: {},
                    message: 'No predefined parts for this service'
                };
            }

            const availability = await this.checkPartsAvailability(partNumbers);

            return {
                serviceCode,
                partsRequired: partNumbers,
                availability,
                generatorSpecs
            };
        } catch (error) {
            this.logger.error('[INVENTORY] Get service parts failed:', error.message);
            throw error;
        }
    }

    /**
     * Get low stock items that need reordering
     * @returns {Promise<Array>} Items below reorder level
     */
    async getLowStockItems() {
        try {
            this.logger.info('[INVENTORY] Checking low stock items');

            const items = await this.listItems();
            const lowStock = items.filter(item =>
                item.stock_on_hand <= (item.reorder_level || 0)
            );

            this.logger.info(`[INVENTORY] Found ${lowStock.length} low stock items`);
            return lowStock;
        } catch (error) {
            this.logger.error('[INVENTORY] Get low stock failed:', error.message);
            throw error;
        }
    }

    /**
     * Get purchase order by ID
     * @param {string} poId - Purchase order ID
     * @returns {Promise<object>} Purchase order details
     */
    async getPurchaseOrder(poId) {
        try {
            const response = await this.makeApiRequest(`/purchaseorders/${poId}`, 'GET');
            return response.purchaseorder;
        } catch (error) {
            this.logger.error('[INVENTORY] Get PO failed:', error.message);
            throw error;
        }
    }
}

module.exports = ZohoInventoryIntegration;
