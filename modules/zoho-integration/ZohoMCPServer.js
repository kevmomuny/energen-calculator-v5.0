/**
 * Comprehensive Zoho MCP Server
 * Provides full Model Context Protocol integration for all Zoho services
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
    ListToolsRequestSchema,
    CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { createRequire } from 'module';

// Import CommonJS module
const require = createRequire(import.meta.url);
const ZohoDirectIntegration = require('../../src/api/zoho-direct-integration.cjs');

export class ZohoMCPServer {
    constructor(config = {}) {
        this.server = new Server(
            {
                name: 'zoho-integration',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {}
                }
            }
        );
        
        // Initialize ZohoDirectIntegration for product management
        this.zohoIntegration = new ZohoDirectIntegration({
            error: console.error,
            info: console.log,
            warn: console.warn
        });
        
        this.config = {
            clientId: config.clientId || process.env.ZOHO_CLIENT_ID,
            clientSecret: config.clientSecret || process.env.ZOHO_CLIENT_SECRET,
            refreshToken: config.refreshToken || process.env.ZOHO_REFRESH_TOKEN,
            accountsUrl: config.accountsUrl || process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com',
            apiUrl: config.apiUrl || process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com',
            ...config
        };
        
        // Debug: Log configuration status (without exposing full credentials)
        console.error('Zoho MCP Server Configuration:');
        console.error(`  Client ID: ${this.config.clientId ? 'SET (' + this.config.clientId.substring(0, 20) + '...)' : 'MISSING'}`);
        console.error(`  Client Secret: ${this.config.clientSecret ? 'SET (' + this.config.clientSecret.substring(0, 10) + '...)' : 'MISSING'}`);
        console.error(`  Refresh Token: ${this.config.refreshToken ? 'SET (' + this.config.refreshToken.substring(0, 20) + '...)' : 'MISSING'}`);
        console.error(`  Accounts URL: ${this.config.accountsUrl}`);
        console.error(`  API URL: ${this.config.apiUrl}`);
        
        this.accessToken = null;
        this.tokenExpiry = null;
        this.cachedOrgId = null;

        this.setupTools();
    }

    /**
     * Get Zoho Inventory Organization ID
     * Caches the org ID after first retrieval
     */
    async getInventoryOrgId() {
        // Return cached value if available
        if (this.cachedOrgId) {
            return this.cachedOrgId;
        }

        // Check environment variable first
        if (process.env.ZOHO_INVENTORY_ORGANIZATION_ID) {
            this.cachedOrgId = process.env.ZOHO_INVENTORY_ORGANIZATION_ID;
            return this.cachedOrgId;
        }

        // Fetch from API if not cached or in env
        try {
            const response = await axios.get(
                `${this.config.apiUrl}/inventory/v1/organizations`,
                {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                    }
                }
            );

            if (response.data.organizations && response.data.organizations.length > 0) {
                this.cachedOrgId = response.data.organizations[0].organization_id;
                return this.cachedOrgId;
            }

            throw new Error('No Zoho Inventory organization found');
        } catch (error) {
            console.error('Error fetching Zoho Inventory Organization ID:', error.message);
            throw error;
        }
    }

    /**
     * Setup all MCP tools
     */
    setupTools() {
        // Define available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                // CRM Tools
                {
                    name: 'crm_search_accounts',
                    description: 'Search for accounts/customers in Zoho CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            searchTerm: { type: 'string', description: 'Search term for account name' },
                            criteria: { type: 'object', description: 'Advanced search criteria' },
                            limit: { type: 'number', default: 10 },
                            page: { type: 'number', default: 1 }
                        },
                        required: ['searchTerm']
                    }
                },
                {
                    name: 'crm_create_account',
                    description: 'Create a new account/customer in Zoho CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            accountName: { type: 'string' },
                            email: { type: 'string' },
                            phone: { type: 'string' },
                            secondaryPhone: { type: 'string' },
                            fax: { type: 'string' },
                            website: { type: 'string' },
                            industry: { type: 'string' },
                            billingAddress: { type: 'object', description: 'Billing address (street, city, state, zip, country)' },
                            physicalAddress: { type: 'object', description: 'Physical/installation address (street, city, state, zip, country)' },
                            creditTerms: { type: 'string', description: 'Payment terms (e.g. "Net 30", "Net 45")' },
                            taxExempt: { type: 'boolean', description: 'Tax exempt status' },
                            portalActive: { type: 'boolean', description: 'Customer portal access' },
                            customerActive: { type: 'boolean', description: 'Customer active status' },
                            fullbayCustomerId: { type: 'string', description: 'Fullbay Customer ID for tracking' },
                            customFields: { type: 'object' }
                        },
                        required: ['accountName']
                    }
                },
                {
                    name: 'crm_update_account',
                    description: 'Update an existing account in Zoho CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            accountId: { type: 'string' },
                            updates: { type: 'object' }
                        },
                        required: ['accountId', 'updates']
                    }
                },
                {
                    name: 'crm_get_account',
                    description: 'Get detailed information about an account',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            accountId: { type: 'string' }
                        },
                        required: ['accountId']
                    }
                },
                {
                    name: 'crm_create_contact',
                    description: 'Create a new contact in Zoho CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            firstName: { type: 'string' },
                            lastName: { type: 'string' },
                            email: { type: 'string' },
                            phone: { type: 'string' },
                            accountId: { type: 'string' },
                            title: { type: 'string' }
                        },
                        required: ['firstName', 'lastName']
                    }
                },
                {
                    name: 'crm_create_quote',
                    description: 'Create a new quote in Zoho CRM with automatic product creation. Line items can include service codes (A-K, CUSTOM) and products will be automatically created if they don\'t exist.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            subject: { type: 'string', description: 'Quote subject/title' },
                            accountId: { type: 'string', description: 'Zoho Account ID' },
                            contactId: { type: 'string', description: 'Zoho Contact ID (optional)' },
                            validTill: { type: 'string', description: 'Valid until date (YYYY-MM-DD)' },
                            lineItems: { 
                                type: 'array',
                                description: 'Line items with service codes OR product IDs. Format: [{serviceCode: "A", name: "Service A", price: 100, quantity: 1}] or [{product: {id: "123"}, quantity: 1, list_price: 100}]'
                            },
                            discount: { type: 'number', description: 'Discount percentage' },
                            tax: { type: 'number', description: 'Tax amount' }
                        },
                        required: ['subject', 'accountId']
                    }
                },
                {
                    name: 'crm_create_deal',
                    description: 'Create a new deal/opportunity in Zoho CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            dealName: { type: 'string' },
                            accountId: { type: 'string' },
                            stage: { type: 'string' },
                            amount: { type: 'number' },
                            closingDate: { type: 'string' },
                            probability: { type: 'number' }
                        },
                        required: ['dealName', 'accountId', 'stage']
                    }
                },
                
                // FSM (Field Service Management) Tools
                {
                    name: 'fsm_create_service_agreement',
                    description: 'Create a service agreement in Zoho FSM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            agreementName: { type: 'string' },
                            accountId: { type: 'string' },
                            startDate: { type: 'string' },
                            endDate: { type: 'string' },
                            serviceType: { type: 'string' },
                            frequency: { type: 'string' },
                            contractValue: { type: 'number' },
                            generators: { type: 'array' }
                        },
                        required: ['agreementName', 'accountId', 'startDate', 'endDate']
                    }
                },
                {
                    name: 'fsm_create_work_order',
                    description: 'Create a work order in Zoho FSM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            accountId: { type: 'string' },
                            serviceAgreementId: { type: 'string' },
                            scheduledDate: { type: 'string' },
                            priority: { type: 'string' },
                            description: { type: 'string' },
                            technicianId: { type: 'string' }
                        },
                        required: ['title', 'accountId', 'scheduledDate']
                    }
                },
                {
                    name: 'fsm_schedule_maintenance',
                    description: 'Schedule recurring maintenance based on service agreement',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            serviceAgreementId: { type: 'string' },
                            startDate: { type: 'string' },
                            endDate: { type: 'string' },
                            frequency: { type: 'string' }
                        },
                        required: ['serviceAgreementId', 'startDate']
                    }
                },
                {
                    name: 'fsm_get_technician_schedule',
                    description: 'Get technician availability and schedule',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            technicianId: { type: 'string' },
                            startDate: { type: 'string' },
                            endDate: { type: 'string' }
                        },
                        required: ['technicianId', 'startDate', 'endDate']
                    }
                },
                
                // Zoho Books Tools
                {
                    name: 'books_create_invoice',
                    description: 'Create an invoice in Zoho Books',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            customerId: { type: 'string' },
                            invoiceNumber: { type: 'string' },
                            invoiceDate: { type: 'string' },
                            dueDate: { type: 'string' },
                            lineItems: { type: 'array' },
                            notes: { type: 'string' }
                        },
                        required: ['customerId', 'lineItems']
                    }
                },
                {
                    name: 'books_create_estimate',
                    description: 'Create an estimate in Zoho Books',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            customerId: { type: 'string' },
                            estimateDate: { type: 'string' },
                            expiryDate: { type: 'string' },
                            lineItems: { type: 'array' },
                            discount: { type: 'number' }
                        },
                        required: ['customerId', 'lineItems']
                    }
                },
                {
                    name: 'books_convert_estimate_to_invoice',
                    description: 'Convert an estimate to an invoice',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            estimateId: { type: 'string' }
                        },
                        required: ['estimateId']
                    }
                },
                {
                    name: 'books_record_payment',
                    description: 'Record a payment for an invoice',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            invoiceId: { type: 'string' },
                            amount: { type: 'number' },
                            paymentMode: { type: 'string' },
                            paymentDate: { type: 'string' }
                        },
                        required: ['invoiceId', 'amount']
                    }
                },
                
                // Inventory Tools
                {
                    name: 'inventory_check_parts',
                    description: 'Check parts availability in Zoho Inventory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            partNumbers: { type: 'array' },
                            warehouseId: { type: 'string' }
                        },
                        required: ['partNumbers']
                    }
                },
                {
                    name: 'inventory_create_purchase_order',
                    description: 'Create a purchase order for parts',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            vendorId: { type: 'string' },
                            items: { type: 'array' },
                            expectedDelivery: { type: 'string' }
                        },
                        required: ['vendorId', 'items']
                    }
                },
                {
                    name: 'inventory_track_parts_usage',
                    description: 'Track parts used in a service job',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            workOrderId: { type: 'string' },
                            partsUsed: { type: 'array' }
                        },
                        required: ['workOrderId', 'partsUsed']
                    }
                },
                {
                    name: 'inventory_create_item',
                    description: 'Create a new item in Zoho Inventory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Item name' },
                            sku: { type: 'string', description: 'Stock keeping unit' },
                            product_type: { type: 'string', description: 'goods, service, or non_inventory_sales' },
                            status: { type: 'string', description: 'active or inactive' },
                            unit: { type: 'string', description: 'Unit of measure (e.g., qty, ea, gal)' },
                            rate: { type: 'number', description: 'Selling price' },
                            purchase_rate: { type: 'number', description: 'Purchase/cost price' },
                            initial_stock: { type: 'number', description: 'Initial stock quantity' },
                            initial_stock_rate: { type: 'number', description: 'Initial stock cost' },
                            reorder_level: { type: 'number', description: 'Reorder level' },
                            item_type: { type: 'string', description: 'sales, purchases, or sales_and_purchases' },
                            group_name: { type: 'string', description: 'Item group/category name' },
                            description: { type: 'string', description: 'Item description' },
                            is_taxable: { type: 'boolean', description: 'Is item taxable' },
                            track_inventory_for_this_item: { type: 'boolean', description: 'Track inventory' },
                            custom_fields: { type: 'object', description: 'Custom field values' }
                        },
                        required: ['name', 'sku']
                    }
                },
                {
                    name: 'inventory_list_items',
                    description: 'List all items in Zoho Inventory',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            page: { type: 'number', description: 'Page number' },
                            per_page: { type: 'number', description: 'Items per page (max 200)' },
                            search_text: { type: 'string', description: 'Search by name or SKU' }
                        }
                    }
                },
                {
                    name: 'inventory_get_item',
                    description: 'Get details for a specific item',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            item_id: { type: 'string', description: 'Item ID' }
                        },
                        required: ['item_id']
                    }
                },
                {
                    name: 'inventory_update_item',
                    description: 'Update an existing item',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            item_id: { type: 'string', description: 'Item ID' },
                            updates: { type: 'object', description: 'Fields to update' }
                        },
                        required: ['item_id', 'updates']
                    }
                },
                {
                    name: 'inventory_mark_item_active',
                    description: 'Mark an item as active',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            item_id: { type: 'string', description: 'Item ID' }
                        },
                        required: ['item_id']
                    }
                },
                {
                    name: 'inventory_mark_item_inactive',
                    description: 'Mark an item as inactive',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            item_id: { type: 'string', description: 'Item ID' }
                        },
                        required: ['item_id']
                    }
                },
                {
                    name: 'inventory_create_location',
                    description: 'Create a warehouse location',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            location_name: { type: 'string', description: 'Location/warehouse name' },
                            address: { type: 'object', description: 'Location address' }
                        },
                        required: ['location_name']
                    }
                },
                {
                    name: 'inventory_list_locations',
                    description: 'List all warehouse locations',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'inventory_mark_location_primary',
                    description: 'Mark a location as primary warehouse',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            location_id: { type: 'string', description: 'Location ID' }
                        },
                        required: ['location_id']
                    }
                },
                {
                    name: 'inventory_create_item_group',
                    description: 'Create an item group/category',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            group_name: { type: 'string', description: 'Group name' }
                        },
                        required: ['group_name']
                    }
                },
                {
                    name: 'inventory_list_item_groups',
                    description: 'List all item groups',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'inventory_get_organization',
                    description: 'Get Zoho Inventory organization details',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'inventory_update_custom_field',
                    description: 'Update custom field value for an item',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            item_id: { type: 'string', description: 'Item ID' },
                            custom_fields: { type: 'object', description: 'Custom field values' }
                        },
                        required: ['item_id', 'custom_fields']
                    }
                },
                {
                    name: 'inventory_create_adjustment',
                    description: 'Create an inventory adjustment to modify stock levels',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            date: { type: 'string', description: 'Adjustment date (YYYY-MM-DD)' },
                            reason: { type: 'string', description: 'Reason for adjustment' },
                            adjustment_type: { type: 'string', description: 'Type: quantity or value' },
                            line_items: {
                                type: 'array',
                                description: 'Array of items to adjust',
                                items: {
                                    type: 'object',
                                    properties: {
                                        item_id: { type: 'string' },
                                        quantity_adjusted: { type: 'number' },
                                        warehouse_id: { type: 'string' }
                                    }
                                }
                            },
                            description: { type: 'string', description: 'Additional description' }
                        },
                        required: ['date', 'reason', 'adjustment_type', 'line_items']
                    }
                },
                {
                    name: 'inventory_list_adjustments',
                    description: 'List all inventory adjustments',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            page: { type: 'number', description: 'Page number' },
                            per_page: { type: 'number', description: 'Items per page (max 200)' }
                        }
                    }
                },
                {
                    name: 'inventory_get_adjustment',
                    description: 'Get details of a specific inventory adjustment',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            adjustment_id: { type: 'string', description: 'Adjustment ID' }
                        },
                        required: ['adjustment_id']
                    }
                },

                // Analytics and Reporting Tools
                {
                    name: 'analytics_service_performance',
                    description: 'Get service performance analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            startDate: { type: 'string' },
                            endDate: { type: 'string' },
                            metrics: { type: 'array' }
                        },
                        required: ['startDate', 'endDate']
                    }
                },
                {
                    name: 'analytics_revenue_forecast',
                    description: 'Generate revenue forecast based on service agreements',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            forecastPeriod: { type: 'number' },
                            includeRenewals: { type: 'boolean' }
                        },
                        required: ['forecastPeriod']
                    }
                },
                
                // Batch Operations
                {
                    name: 'batch_import_customers',
                    description: 'Batch import customers from CSV or JSON',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            data: { type: 'array' },
                            mapping: { type: 'object' },
                            skipDuplicates: { type: 'boolean' }
                        },
                        required: ['data']
                    }
                },
                {
                    name: 'batch_create_quotes',
                    description: 'Create multiple quotes in batch',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            quotes: { type: 'array' },
                            templateId: { type: 'string' }
                        },
                        required: ['quotes']
                    }
                },

                // Custom Module Tools - Generator Assets
                {
                    name: 'create_generator_asset',
                    description: 'Create a new generator asset record in Zoho CRM',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Generator name/identifier' },
                            generatorMake: { type: 'string', description: 'Generator manufacturer/make' },
                            generatorModel: { type: 'string', description: 'Generator model' },
                            kwRating: { type: 'number', description: 'kW rating' },
                            serialNumber: { type: 'string', description: 'Serial number' },
                            customerAccountId: { type: 'string', description: 'Customer account ID (lookup)' },
                            fullbayUnitId: { type: 'string', description: 'Fullbay Unit ID for tracking' },
                            fuelType: { type: 'string', description: 'Fuel type (Diesel, Natural Gas, Propane, Bi-Fuel)' },
                            installationAddress: { type: 'string', description: 'Installation address' },
                            engineMake: { type: 'string', description: 'Engine make' },
                            cylinders: { type: 'number', description: 'Number of cylinders' },
                            oilType: { type: 'string', description: 'Oil type' },
                            oilCapacity: { type: 'number', description: 'Oil capacity in gallons' },
                            coolantType: { type: 'string', description: 'Coolant type' },
                            coolantCapacity: { type: 'number', description: 'Coolant capacity in gallons' },
                            lastServiceDate: { type: 'string', description: 'Last service date (YYYY-MM-DD)' },
                            nextServiceDue: { type: 'string', description: 'Next service due date (YYYY-MM-DD)' },
                            hoursRun: { type: 'number', description: 'Hours run' },
                            status: { type: 'string', description: 'Status (Active, Inactive, Under Service, Decommissioned)' },
                            gpsLatitude: { type: 'number', description: 'GPS Latitude' },
                            gpsLongitude: { type: 'number', description: 'GPS Longitude' },
                            gpsAccuracy: { type: 'number', description: 'GPS Accuracy in meters' },
                            gpsSource: { type: 'string', description: 'GPS Source (e.g., Manual Entry, Google Maps, GPS Device)' },
                            siteLocation: { type: 'string', description: 'Site location name or description' },
                            siteIdentifier: { type: 'string', description: 'Site identifier or code' }
                        },
                        required: ['name', 'generatorModel', 'customerAccountId']
                    }
                },
                {
                    name: 'update_generator_asset',
                    description: 'Update an existing generator asset record',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            assetId: { type: 'string', description: 'Generator asset ID' },
                            updates: { type: 'object', description: 'Fields to update' }
                        },
                        required: ['assetId', 'updates']
                    }
                },
                {
                    name: 'get_generator_asset',
                    description: 'Get generator asset details by ID',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            assetId: { type: 'string', description: 'Generator asset ID' }
                        },
                        required: ['assetId']
                    }
                },
                {
                    name: 'search_generator_assets',
                    description: 'Search generator assets by customer, model, or serial number',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            searchTerm: { type: 'string', description: 'Search term' },
                            criteria: { type: 'object', description: 'Advanced search criteria' },
                            limit: { type: 'number', default: 10 },
                            page: { type: 'number', default: 1 }
                        },
                        required: ['searchTerm']
                    }
                },

                // Custom Module Tools - Service Agreements
                {
                    name: 'create_service_agreement',
                    description: 'Create a new service agreement (maintenance contract)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Agreement name' },
                            customerAccountId: { type: 'string', description: 'Customer account ID (lookup)' },
                            generatorAssetId: { type: 'string', description: 'Generator asset ID (lookup)' },
                            servicesIncluded: { type: 'array', description: 'Services included (A-J, K, CUSTOM)' },
                            annualValue: { type: 'number', description: 'Annual contract value' },
                            quarterlyValue: { type: 'number', description: 'Quarterly value' },
                            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
                            autoRenew: { type: 'boolean', description: 'Auto-renew enabled' },
                            status: { type: 'string', description: 'Status (Draft, Active, Expired, Cancelled, Renewed)' },
                            paymentTerms: { type: 'string', description: 'Payment terms' },
                            billingFrequency: { type: 'string', description: 'Billing frequency' }
                        },
                        required: ['name', 'customerAccountId', 'startDate', 'endDate']
                    }
                },
                {
                    name: 'update_service_agreement',
                    description: 'Update an existing service agreement',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            agreementId: { type: 'string', description: 'Service agreement ID' },
                            updates: { type: 'object', description: 'Fields to update' }
                        },
                        required: ['agreementId', 'updates']
                    }
                },
                {
                    name: 'get_service_agreement',
                    description: 'Get service agreement details by ID',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            agreementId: { type: 'string', description: 'Service agreement ID' }
                        },
                        required: ['agreementId']
                    }
                },
                {
                    name: 'search_service_agreements',
                    description: 'Search service agreements by customer or status',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            searchTerm: { type: 'string', description: 'Search term' },
                            criteria: { type: 'object', description: 'Advanced search criteria' },
                            limit: { type: 'number', default: 10 },
                            page: { type: 'number', default: 1 }
                        },
                        required: ['searchTerm']
                    }
                },

                // Custom Module Tools - Work Orders
                {
                    name: 'create_work_order',
                    description: 'Create a new work order to schedule a service visit',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Work order name/title' },
                            customerAccountId: { type: 'string', description: 'Customer account ID (lookup)' },
                            generatorAssetId: { type: 'string', description: 'Generator asset ID (lookup)' },
                            serviceAgreementId: { type: 'string', description: 'Service agreement ID (lookup)' },
                            workOrderType: { type: 'string', description: 'Type (Scheduled Service, Emergency, Repair, Installation)' },
                            servicesList: { type: 'array', description: 'Services to perform (Service A-J, K, Custom)' },
                            scheduledDate: { type: 'string', description: 'Scheduled date/time (ISO format)' },
                            estimatedHours: { type: 'number', description: 'Estimated hours' },
                            status: { type: 'string', description: 'Status (Scheduled, In Progress, Completed, Cancelled, On Hold)' },
                            priority: { type: 'string', description: 'Priority (Low, Medium, High, Emergency)' }
                        },
                        required: ['name', 'customerAccountId', 'scheduledDate']
                    }
                },
                {
                    name: 'update_work_order',
                    description: 'Update work order status or completion details',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            workOrderId: { type: 'string', description: 'Work order ID' },
                            updates: { type: 'object', description: 'Fields to update (status, actualStart, actualEnd, actualHours, partsUsed, laborCost, partsCost, totalCost, completionNotes)' }
                        },
                        required: ['workOrderId', 'updates']
                    }
                },
                {
                    name: 'get_work_order',
                    description: 'Get work order details by ID',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            workOrderId: { type: 'string', description: 'Work order ID' }
                        },
                        required: ['workOrderId']
                    }
                },
                {
                    name: 'search_work_orders',
                    description: 'Search work orders by date, status, or customer',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            searchTerm: { type: 'string', description: 'Search term' },
                            criteria: { type: 'object', description: 'Advanced search criteria' },
                            limit: { type: 'number', default: 10 },
                            page: { type: 'number', default: 1 }
                        },
                        required: ['searchTerm']
                    }
                },

                // Schema Management Tools
                {
                    name: 'crm_add_custom_fields',
                    description: 'Add custom fields to a Zoho CRM module (e.g., Accounts, Contacts). Use this to create fields that don\'t exist in the module schema.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            moduleName: { type: 'string', description: 'Module API name (e.g., "Accounts", "Contacts", "Leads")' },
                            fields: {
                                type: 'array',
                                description: 'Array of field definitions to create',
                                items: {
                                    type: 'object',
                                    properties: {
                                        api_name: { type: 'string', description: 'Field API name (e.g., "External_ID")' },
                                        field_label: { type: 'string', description: 'Display label for the field' },
                                        data_type: { type: 'string', description: 'Field data type (text, number, boolean, date, picklist, lookup, etc.)' },
                                        length: { type: 'number', description: 'Maximum length for text fields' },
                                        default_value: { type: 'string', description: 'Default value for the field' },
                                        tooltip: { type: 'object', description: 'Tooltip object with "name" property for help text' },
                                        pick_list_values: { type: 'array', description: 'Array of picklist options (for picklist fields)' }
                                    },
                                    required: ['api_name', 'field_label', 'data_type']
                                }
                            }
                        },
                        required: ['moduleName', 'fields']
                    }
                }
            ]
        }));
        
        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                // Ensure we have a valid access token
                await this.ensureAccessToken();
                
                // Route to appropriate handler
                const handler = this.getToolHandler(name);
                if (!handler) {
                    throw new Error(`Unknown tool: ${name}`);
                }
                
                const result = await handler.call(this, args);
                
                // Convert result to MCP format
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            } catch (error) {
                // Enhanced error logging for tool calls
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error(`TOOL CALL ERROR - ${name}`);
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.error(`Error Message: ${error.message}`);
                console.error(`Error Code: ${error.code || 'N/A'}`);
                console.error(`Arguments: ${JSON.stringify(args, null, 2)}`);
                
                if (error.response) {
                    console.error('\n[HTTP Response Error]');
                    console.error(`Status: ${error.response.status}`);
                    console.error(`Status Text: ${error.response.statusText}`);
                    console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
                } else if (error.request) {
                    console.error('\n[Network Error - No Response]');
                    console.error(`Error Code: ${error.code}`);
                    console.error(`Error Syscall: ${error.syscall || 'N/A'}`);
                } else {
                    console.error('\n[Other Error]');
                }
                
                console.error(`\nStack Trace:`);
                console.error(error.stack);
                console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
                
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            error: error.message,
                            code: error.code || 'unknown',
                            stack: error.stack,
                            isNetworkError: !!error.request && !error.response,
                            isHTTPError: !!error.response
                        }, null, 2)
                    }],
                    isError: true
                };
            }
        });
    }
    
    /**
     * Get tool handler function
     */
    getToolHandler(toolName) {
        const handlers = {
            // CRM handlers
            crm_search_accounts: this.handleCRMSearchAccounts,
            crm_create_account: this.handleCRMCreateAccount,
            crm_update_account: this.handleCRMUpdateAccount,
            crm_get_account: this.handleCRMGetAccount,
            crm_create_contact: this.handleCRMCreateContact,
            crm_create_quote: this.handleCRMCreateQuote,
            crm_create_deal: this.handleCRMCreateDeal,
            
            // FSM handlers
            fsm_create_service_agreement: this.handleFSMCreateServiceAgreement,
            fsm_create_work_order: this.handleFSMCreateWorkOrder,
            fsm_schedule_maintenance: this.handleFSMScheduleMaintenance,
            fsm_get_technician_schedule: this.handleFSMGetTechnicianSchedule,
            
            // Books handlers
            books_create_invoice: this.handleBooksCreateInvoice,
            books_create_estimate: this.handleBooksCreateEstimate,
            books_convert_estimate_to_invoice: this.handleBooksConvertEstimateToInvoice,
            books_record_payment: this.handleBooksRecordPayment,
            
            // Inventory handlers
            inventory_check_parts: this.handleInventoryCheckParts,
            inventory_create_purchase_order: this.handleInventoryCreatePurchaseOrder,
            inventory_track_parts_usage: this.handleInventoryTrackPartsUsage,
            inventory_create_item: this.handleInventoryCreateItem,
            inventory_list_items: this.handleInventoryListItems,
            inventory_get_item: this.handleInventoryGetItem,
            inventory_update_item: this.handleInventoryUpdateItem,
            inventory_mark_item_active: this.handleInventoryMarkItemActive,
            inventory_mark_item_inactive: this.handleInventoryMarkItemInactive,
            inventory_create_location: this.handleInventoryCreateLocation,
            inventory_list_locations: this.handleInventoryListLocations,
            inventory_mark_location_primary: this.handleInventoryMarkLocationPrimary,
            inventory_create_item_group: this.handleInventoryCreateItemGroup,
            inventory_list_item_groups: this.handleInventoryListItemGroups,
            inventory_get_organization: this.handleInventoryGetOrganization,
            inventory_update_custom_field: this.handleInventoryUpdateCustomField,
            inventory_create_adjustment: this.handleInventoryCreateAdjustment,
            inventory_list_adjustments: this.handleInventoryListAdjustments,
            inventory_get_adjustment: this.handleInventoryGetAdjustment,

            // Analytics handlers
            analytics_service_performance: this.handleAnalyticsServicePerformance,
            analytics_revenue_forecast: this.handleAnalyticsRevenueForecast,
            
            // Batch handlers
            batch_import_customers: this.handleBatchImportCustomers,
            batch_create_quotes: this.handleBatchCreateQuotes,

            // Custom module handlers - Generator Assets
            create_generator_asset: this.handleCreateGeneratorAsset,
            update_generator_asset: this.handleUpdateGeneratorAsset,
            get_generator_asset: this.handleGetGeneratorAsset,
            search_generator_assets: this.handleSearchGeneratorAssets,

            // Custom module handlers - Service Agreements
            create_service_agreement: this.handleCreateServiceAgreement,
            update_service_agreement: this.handleUpdateServiceAgreement,
            get_service_agreement: this.handleGetServiceAgreement,
            search_service_agreements: this.handleSearchServiceAgreements,

            // Custom module handlers - Work Orders
            create_work_order: this.handleCreateWorkOrder,
            update_work_order: this.handleUpdateWorkOrder,
            get_work_order: this.handleGetWorkOrder,
            search_work_orders: this.handleSearchWorkOrders,

            // Schema management handlers
            crm_add_custom_fields: this.handleCRMAddCustomFields
        };

        return handlers[toolName];
    }
    
    /**
     * Ensure we have a valid access token
     * Uses local OAuth credentials to refresh access token when needed
     */
    async ensureAccessToken() {
        // Check if we have a valid cached token
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return;
        }

        // Verify we have OAuth credentials
        if (!this.config.refreshToken || !this.config.clientId || !this.config.clientSecret) {
            throw new Error('OAuth credentials not configured. Check ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN in MCP config.');
        }

        try {
            // Refresh access token using refresh token
            const response = await axios.post(
                `${this.config.accountsUrl}/oauth/v2/token`,
                new URLSearchParams({
                    refresh_token: this.config.refreshToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    grant_type: 'refresh_token'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            if (!response.data || !response.data.access_token) {
                throw new Error('Invalid response from Zoho OAuth');
            }

            this.accessToken = response.data.access_token;

            // Set expiry 5 minutes early to avoid race conditions
            const expiresIn = response.data.expires_in || 3600;
            this.tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000); // 5 min buffer

        } catch (error) {
            // Enhanced error logging for diagnostics
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('TOKEN REFRESH ERROR - Detailed Diagnostics:');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error(`Error Message: ${error.message}`);
            console.error(`Error Code: ${error.code || 'N/A'}`);
            
            if (error.response) {
                console.error('\n[HTTP Response Error]');
                console.error(`Status: ${error.response.status}`);
                console.error(`Status Text: ${error.response.statusText}`);
                console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
                console.error(`Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
            } else if (error.request) {
                console.error('\n[Network Error - No Response]');
                console.error(`Request was made but no response received`);
                console.error(`Error Code: ${error.code}`);
                console.error(`Error Syscall: ${error.syscall || 'N/A'}`);
                console.error(`Error Errno: ${error.errno || 'N/A'}`);
            } else {
                console.error('\n[Request Setup Error]');
                console.error(`Error occurred setting up the request`);
            }
            
            console.error(`\nFull Stack Trace:`);
            console.error(error.stack);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
            if (error.response?.status === 400 || error.response?.status === 401) {
                throw new Error('OAuth credentials invalid or expired. Check your ZOHO credentials in MCP config.');
            }
            throw new Error(`Failed to refresh access token: ${error.message} (code: ${error.code || 'unknown'})`);
        }
    }

    /**
     * Make Zoho API call with retry logic for transient failures
     * @param {Function} apiCall - Async function that makes the API call
     * @param {number} maxRetries - Maximum retry attempts (default: 3)
     * @param {number} baseDelay - Base delay between retries in ms (default: 1000)
     * @returns {Promise} - Result of API call
     */
    async makeZohoApiCallWithRetry(apiCall, maxRetries = 3, baseDelay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await apiCall();
            } catch (error) {
                lastError = error;

                // Don't retry on client errors (4xx except 429 rate limit)
                if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
                    throw error;
                }

                // Don't retry on authentication errors
                if (error.response?.status === 401) {
                    throw error;
                }

                // Log retry attempt
                console.error(`Zoho API call failed (attempt ${attempt}/${maxRetries}):`, {
                    error: error.message,
                    status: error.response?.status,
                    willRetry: attempt < maxRetries
                });

                // Don't wait after last attempt
                if (attempt === maxRetries) {
                    break;
                }

                // Exponential backoff: 1s, 2s, 4s
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // All retries exhausted
        throw new Error(`Zoho API call failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * CRM: Search Accounts
     */
    async handleCRMSearchAccounts(args) {
        const { searchTerm, criteria, limit = 10, page = 1 } = args;

        // Build params object
        const params = {
            per_page: limit,
            page: page
        };

        if (criteria) {
            // Use criteria for advanced search
            params.criteria = this.buildSearchCriteria(criteria);
        } else {
            // Use 'word' parameter for simple text search (more reliable than criteria)
            params.word = searchTerm;
        }

        const response = await this.makeZohoApiCallWithRetry(() =>
            axios.get(
                `${this.config.apiUrl}/crm/v2/Accounts/search`,
                {
                    params,
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                    }
                }
            )
        );

        return {
            success: true,
            data: {
                accounts: response.data.data || [],
                info: response.data.info || {}
            }
        };
    }
    
    /**
     * CRM: Create Account
     */
    async handleCRMCreateAccount(args) {
        const accountData = {
            Account_Name: args.accountName,
            Email: args.email,
            Phone: args.phone,
            Secondary_Phone: args.secondaryPhone,
            Fax: args.fax,
            Website: args.website,
            Industry: args.industry,
            ...args.customFields
        };

        // Add business fields
        if (args.creditTerms) {
            accountData.Credit_Terms = args.creditTerms;
        }
        if (args.taxExempt !== undefined) {
            accountData.Tax_Exempt = args.taxExempt;
        }
        if (args.portalActive !== undefined) {
            accountData.Portal_is_on = args.portalActive;
        }
        if (args.fullbayCustomerId) {
            accountData.External_ID = args.fullbayCustomerId;
        }

        // Handle billing address (flat fields, not nested object)
        if (args.billingAddress) {
            Object.assign(accountData, {
                Billing_Address_Line_1: args.billingAddress.street,
                Billing_Address_City: args.billingAddress.city,
                Billing_Address_State: args.billingAddress.state,
                Billing_Address_Zip: args.billingAddress.zip || args.billingAddress.zipCode,
                Billing_Address_Country: args.billingAddress.country || 'US'
            });
        }

        // Handle physical address (using Physical fields, not shipping)
        if (args.physicalAddress) {
            Object.assign(accountData, {
                Physical_Address_Line_1: args.physicalAddress.street,
                Physical_Address_City: args.physicalAddress.city,
                Physical_Address_State: args.physicalAddress.state,
                Physical_Address_Zip: args.physicalAddress.zip || args.physicalAddress.zipCode,
                Physical_Address_Country: args.physicalAddress.country || 'US'
            });
        }

        // DEBUG: Log what we're sending to Zoho
        console.error('='.repeat(80));
        console.error('ACCOUNT CREATE - DATA BEING SENT TO ZOHO:');
        console.error(JSON.stringify(accountData, null, 2));
        console.error('='.repeat(80));

        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Accounts`,
            { data: [accountData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * CRM: Update Account
     */
    async handleCRMUpdateAccount(args) {
        const { accountId, updates } = args;
        
        const response = await axios.put(
            `${this.config.apiUrl}/crm/v2/Accounts/${accountId}`,
            { data: [updates] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * CRM: Get Account Details
     */
    async handleCRMGetAccount(args) {
        const { accountId } = args;
        
        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Accounts/${accountId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );
        
        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * CRM: Create Contact
     */
    async handleCRMCreateContact(args) {
        const contactData = {
            First_Name: args.firstName,
            Last_Name: args.lastName,
            Email: args.email,
            Phone: args.phone,
            Account_Name: args.accountId,
            Title: args.title
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Contacts`,
            { data: [contactData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * CRM: Create Quote
     * Now supports automatic product creation from service names
     */
    async handleCRMCreateQuote(args) {
        try {
            // Process line items to handle both product IDs and service names
            let quotedItems = [];
            
            if (args.lineItems && Array.isArray(args.lineItems)) {
                // Check if line items contain service codes/names that need product lookup
                for (const item of args.lineItems) {
                    if (item.serviceCode || item.code) {
                        // This is a service that needs product creation
                        const service = {
                            code: item.serviceCode || item.code,
                            name: item.name || item.serviceName || `Service ${item.serviceCode || item.code}`,
                            price: item.price || item.list_price || 0,
                            description: item.description || '',
                            quantity: item.quantity || 1,
                            discount: item.discount || 0
                        };
                        
                        // Use ZohoDirectIntegration to find or create product
                        const productId = await this.zohoIntegration.findOrCreateProduct(service);
                        
                        quotedItems.push({
                            product: { id: productId },
                            quantity: service.quantity,
                            list_price: service.price,
                            Discount: service.discount,
                            Description: service.description
                        });
                    } else if (item.product || item.Product_Name) {
                        // Already has product ID, use as-is
                        quotedItems.push(item);
                    } else {
                        // Generic line item without product
                        quotedItems.push(item);
                    }
                }
            }
            
            const quoteData = {
                Subject: args.subject,
                Account_Name: { id: args.accountId },
                Valid_Till: args.validTill,
                Product_Details: quotedItems.length > 0 ? quotedItems : args.lineItems,
                Discount: args.discount || 0,
                Tax: args.tax || 0
            };
            
            // Add contact if provided
            if (args.contactId) {
                quoteData.Contact_Name = { id: args.contactId };
            }
            
            const response = await this.makeZohoApiCallWithRetry(() =>
                axios.post(
                    `${this.config.apiUrl}/crm/v2/Quotes`,
                    { data: [quoteData] },
                    {
                        headers: {
                            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                )
            );

            return {
                success: true,
                data: response.data.data[0],
                productsCreated: quotedItems.length
            };
        } catch (error) {
            console.error('Create quote error:', error.response?.data || error.message);
            throw error;
        }
    }
    
    /**
     * CRM: Create Deal
     */
    async handleCRMCreateDeal(args) {
        const dealData = {
            Deal_Name: args.dealName,
            Account_Name: args.accountId,
            Stage: args.stage,
            Amount: args.amount,
            Closing_Date: args.closingDate,
            Probability: args.probability || 50
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Deals`,
            { data: [dealData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * FSM: Create Service Agreement
     */
    async handleFSMCreateServiceAgreement(args) {
        // Note: This would integrate with Zoho FSM API
        // For now, we'll create a custom module record in CRM
        const agreementData = {
            Name: args.agreementName,
            Account: args.accountId,
            Start_Date: args.startDate,
            End_Date: args.endDate,
            Service_Type: args.serviceType,
            Frequency: args.frequency,
            Contract_Value: args.contractValue,
            Generators: JSON.stringify(args.generators || []),
            Status: 'Active'
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Service_Agreements`,
            { data: [agreementData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * FSM: Create Work Order
     */
    async handleFSMCreateWorkOrder(args) {
        const workOrderData = {
            Name: args.title,
            Account: args.accountId,
            Service_Agreement: args.serviceAgreementId,
            Scheduled_Date: args.scheduledDate,
            Priority: args.priority || 'Medium',
            Description: args.description,
            Assigned_To: args.technicianId,
            Status: 'Scheduled'
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Work_Orders`,
            { data: [workOrderData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.data[0]
        };
    }
    
    /**
     * FSM: Schedule Maintenance
     */
    async handleFSMScheduleMaintenance(args) {
        // Get service agreement details
        const agreementResponse = await axios.get(
            `${this.config.apiUrl}/crm/v2/Service_Agreements/${args.serviceAgreementId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );
        
        const agreement = agreementResponse.data.data[0];
        const workOrders = [];
        
        // Generate work orders based on frequency
        const startDate = new Date(args.startDate);
        const endDate = new Date(args.endDate || agreement.End_Date);
        const frequency = args.frequency || agreement.Frequency;
        
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const workOrder = {
                Name: `${agreement.Service_Type} - ${currentDate.toLocaleDateString()}`,
                Account: agreement.Account.id,
                Service_Agreement: args.serviceAgreementId,
                Scheduled_Date: currentDate.toISOString(),
                Priority: 'Medium',
                Status: 'Scheduled'
            };
            
            workOrders.push(workOrder);
            
            // Increment date based on frequency
            switch (frequency.toLowerCase()) {
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
                case 'quarterly':
                    currentDate.setMonth(currentDate.getMonth() + 3);
                    break;
                case 'semi-annual':
                    currentDate.setMonth(currentDate.getMonth() + 6);
                    break;
                case 'annual':
                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                    break;
                default:
                    currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }
        
        // Create work orders in batch
        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Work_Orders`,
            { data: workOrders },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: {
                workOrdersCreated: response.data.data.length,
                workOrders: response.data.data
            }
        };
    }
    
    /**
     * FSM: Get Technician Schedule
     */
    async handleFSMGetTechnicianSchedule(args) {
        const { technicianId, startDate, endDate } = args;
        
        const criteria = `((Assigned_To:equals:${technicianId})and(Scheduled_Date:between:${startDate},${endDate}))`;
        
        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Work_Orders/search`,
            {
                params: {
                    criteria: criteria,
                    sort_by: 'Scheduled_Date',
                    sort_order: 'asc'
                },
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );
        
        return {
            success: true,
            data: {
                schedule: response.data.data || [],
                technicianId: technicianId
            }
        };
    }
    
    /**
     * Books: Create Invoice
     */
    async handleBooksCreateInvoice(args) {
        const invoiceData = {
            customer_id: args.customerId,
            invoice_number: args.invoiceNumber,
            date: args.invoiceDate || new Date().toISOString().split('T')[0],
            due_date: args.dueDate,
            line_items: args.lineItems.map(item => ({
                item_id: item.itemId,
                name: item.name,
                description: item.description,
                rate: item.rate,
                quantity: item.quantity,
                tax_id: item.taxId
            })),
            notes: args.notes
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/books/v3/invoices`,
            invoiceData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.invoice
        };
    }
    
    /**
     * Books: Create Estimate
     */
    async handleBooksCreateEstimate(args) {
        const estimateData = {
            customer_id: args.customerId,
            estimate_date: args.estimateDate || new Date().toISOString().split('T')[0],
            expiry_date: args.expiryDate,
            line_items: args.lineItems.map(item => ({
                item_id: item.itemId,
                name: item.name,
                description: item.description,
                rate: item.rate,
                quantity: item.quantity
            })),
            discount: args.discount || 0
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/books/v3/estimates`,
            estimateData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.estimate
        };
    }
    
    /**
     * Books: Convert Estimate to Invoice
     */
    async handleBooksConvertEstimateToInvoice(args) {
        const { estimateId } = args;
        
        const response = await axios.post(
            `${this.config.apiUrl}/books/v3/estimates/${estimateId}/status/accepted`,
            {},
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Create invoice from estimate
        const invoiceResponse = await axios.post(
            `${this.config.apiUrl}/books/v3/invoices/fromentimate/${estimateId}`,
            {},
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: {
                estimate: response.data.estimate,
                invoice: invoiceResponse.data.invoice
            }
        };
    }
    
    /**
     * Books: Record Payment
     */
    async handleBooksRecordPayment(args) {
        const paymentData = {
            customer_id: args.customerId,
            payment_mode: args.paymentMode || 'cash',
            amount: args.amount,
            date: args.paymentDate || new Date().toISOString().split('T')[0],
            invoices: [{
                invoice_id: args.invoiceId,
                amount_applied: args.amount
            }]
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/books/v3/customerpayments`,
            paymentData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.payment
        };
    }
    
    /**
     * Inventory: Check Parts
     */
    async handleInventoryCheckParts(args) {
        const { partNumbers, warehouseId } = args;
        
        const availability = [];
        
        for (const partNumber of partNumbers) {
            const response = await axios.get(
                `${this.config.apiUrl}/inventory/v1/items`,
                {
                    params: {
                        sku: partNumber,
                        warehouse_id: warehouseId
                    },
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                    }
                }
            );
            
            if (response.data.items && response.data.items.length > 0) {
                const item = response.data.items[0];
                availability.push({
                    partNumber: partNumber,
                    itemId: item.item_id,
                    name: item.name,
                    availableQuantity: item.stock_on_hand,
                    warehouseStock: item.warehouses || []
                });
            } else {
                availability.push({
                    partNumber: partNumber,
                    availableQuantity: 0,
                    error: 'Part not found'
                });
            }
        }
        
        return {
            success: true,
            data: {
                availability: availability
            }
        };
    }
    
    /**
     * Inventory: Create Purchase Order
     */
    async handleInventoryCreatePurchaseOrder(args) {
        const purchaseOrderData = {
            vendor_id: args.vendorId,
            purchaseorder_date: new Date().toISOString().split('T')[0],
            expected_delivery_date: args.expectedDelivery,
            line_items: args.items.map(item => ({
                item_id: item.itemId,
                quantity: item.quantity,
                rate: item.rate
            }))
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/purchaseorders`,
            purchaseOrderData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: response.data.purchaseorder
        };
    }
    
    /**
     * Inventory: Track Parts Usage
     */
    async handleInventoryTrackPartsUsage(args) {
        const { workOrderId, partsUsed } = args;
        
        // Create inventory adjustment for parts used
        const adjustmentData = {
            date: new Date().toISOString().split('T')[0],
            reason: `Parts used for Work Order: ${workOrderId}`,
            description: `Parts consumed during service work order ${workOrderId}`,
            line_items: partsUsed.map(part => ({
                item_id: part.itemId,
                quantity_adjusted: -part.quantity,
                warehouse_id: part.warehouseId
            }))
        };
        
        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/inventoryadjustments`,
            adjustmentData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Update work order with parts used
        const workOrderUpdate = {
            Parts_Used: JSON.stringify(partsUsed),
            Parts_Cost: partsUsed.reduce((total, part) => total + (part.quantity * part.unitCost), 0)
        };
        
        await axios.put(
            `${this.config.apiUrl}/crm/v2/Work_Orders/${workOrderId}`,
            { data: [workOrderUpdate] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        return {
            success: true,
            data: {
                adjustment: response.data.inventory_adjustment,
                workOrderUpdated: true
            }
        };
    }

    /**
     * Inventory: Create Item
     */
    async handleInventoryCreateItem(args) {
        const orgId = await this.getInventoryOrgId();

        // Build item data according to Zoho Inventory API spec
        // Start with only required field
        const itemData = {
            name: args.name
        };

        // Add optional fields only if provided
        if (args.sku) itemData.sku = args.sku;
        if (args.product_type) itemData.product_type = args.product_type;
        if (args.status) itemData.status = args.status;
        if (args.unit) itemData.unit = args.unit;
        if (args.rate !== undefined) itemData.rate = args.rate;
        if (args.purchase_rate !== undefined) itemData.purchase_rate = args.purchase_rate;
        if (args.is_taxable !== undefined) itemData.is_taxable = args.is_taxable;
        if (args.item_type) itemData.item_type = args.item_type;
        if (args.track_inventory_for_this_item !== undefined) {
            itemData.track_inventory_for_this_item = args.track_inventory_for_this_item;
        }
        if (args.reorder_level !== undefined) itemData.reorder_level = args.reorder_level;
        if (args.description) itemData.description = args.description;
        if (args.group_id) itemData.group_id = args.group_id;

        // Add custom fields if provided (array format with customfield_id)
        if (args.custom_fields && Array.isArray(args.custom_fields) && args.custom_fields.length > 0) {
            itemData.custom_fields = args.custom_fields;
        }

        try {
            // Add initial stock via locations array if provided
            if (args.initial_stock && args.initial_stock > 0) {
                // Try to get primary warehouse/location
                try {
                    const locationsResponse = await axios.get(
                        `${this.config.apiUrl}/inventory/v1/warehouses?organization_id=${orgId}`,
                        {
                            headers: {
                                'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                            }
                        }
                    );

                    if (locationsResponse.data.warehouses && locationsResponse.data.warehouses.length > 0) {
                        const primaryWarehouse = locationsResponse.data.warehouses.find(w => w.is_primary)
                            || locationsResponse.data.warehouses[0];

                        itemData.initial_stock = args.initial_stock;
                        itemData.initial_stock_rate = args.initial_stock_rate || args.purchase_rate || 0;
                        itemData.warehouse_id = primaryWarehouse.warehouse_id;
                    }
                } catch (warehouseError) {
                    // If warehouse fetch fails, skip initial stock (can be added via adjustment later)
                    console.warn('Could not fetch warehouses for initial stock, skipping:', warehouseError.message);
                }
            }

            const response = await axios.post(
                `${this.config.apiUrl}/inventory/v1/items?organization_id=${orgId}`,
                itemData,
                {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data.item
            };
        } catch (error) {
            // Log detailed error information
            const errorDetails = {
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                sentData: itemData,
                url: `${this.config.apiUrl}/inventory/v1/items?organization_id=${orgId}`
            };
            console.error('Zoho Inventory Create Item Error:', JSON.stringify(errorDetails, null, 2));

            // Return detailed error instead of throwing
            return {
                success: false,
                error: error.response?.data || error.message,
                details: errorDetails
            };
        }
    }

    /**
     * Inventory: List Items
     */
    async handleInventoryListItems(args) {
        const orgId = await this.getInventoryOrgId();

        const params = {
            organization_id: orgId,
            page: args.page || 1,
            per_page: args.per_page || 50
        };

        if (args.filter_by) params.filter_by = args.filter_by;
        if (args.search_text) params.search_text = args.search_text;
        if (args.sort_column) params.sort_column = args.sort_column;

        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/items`,
            {
                params,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                items: response.data.items,
                page_context: response.data.page_context
            }
        };
    }

    /**
     * Inventory: Get Item
     */
    async handleInventoryGetItem(args) {
        const orgId = await this.getInventoryOrgId();
        const { item_id } = args;

        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/items/${item_id}?organization_id=${orgId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: response.data.item
        };
    }

    /**
     * Inventory: Update Item
     */
    async handleInventoryUpdateItem(args) {
        const orgId = await this.getInventoryOrgId();
        const { item_id, ...updateData } = args;

        const response = await axios.put(
            `${this.config.apiUrl}/inventory/v1/items/${item_id}?organization_id=${orgId}`,
            updateData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.item
        };
    }

    /**
     * Inventory: Mark Item Active
     */
    async handleInventoryMarkItemActive(args) {
        const orgId = await this.getInventoryOrgId();
        const { item_id } = args;

        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/items/${item_id}/active?organization_id=${orgId}`,
            {},
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: 'Item marked as active',
            data: response.data.item
        };
    }

    /**
     * Inventory: Mark Item Inactive
     */
    async handleInventoryMarkItemInactive(args) {
        const orgId = await this.getInventoryOrgId();
        const { item_id } = args;

        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/items/${item_id}/inactive?organization_id=${orgId}`,
            {},
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: 'Item marked as inactive',
            data: response.data.item
        };
    }

    /**
     * Inventory: Create Location (Warehouse)
     */
    async handleInventoryCreateLocation(args) {
        const orgId = await this.getInventoryOrgId();

        const locationData = {
            warehouse_name: args.warehouse_name,
            attention: args.attention || '',
            address: {
                address: args.address || '',
                city: args.city || '',
                state: args.state || '',
                zip: args.zip || '',
                country: args.country || 'US'
            },
            phone: args.phone || '',
            email: args.email || ''
        };

        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/warehouses?organization_id=${orgId}`,
            locationData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.warehouse
        };
    }

    /**
     * Inventory: List Locations (Warehouses)
     */
    async handleInventoryListLocations(args) {
        const orgId = await this.getInventoryOrgId();

        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/warehouses?organization_id=${orgId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                warehouses: response.data.warehouses
            }
        };
    }

    /**
     * Inventory: Mark Location Primary
     */
    async handleInventoryMarkLocationPrimary(args) {
        const orgId = await this.getInventoryOrgId();
        const { warehouse_id } = args;

        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/warehouses/${warehouse_id}/markasprimary?organization_id=${orgId}`,
            {},
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: 'Warehouse marked as primary',
            data: response.data.warehouse
        };
    }

    /**
     * Inventory: Create Item Group
     */
    async handleInventoryCreateItemGroup(args) {
        const orgId = await this.getInventoryOrgId();

        const groupData = {
            group_name: args.group_name,
            description: args.description || ''
        };

        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/itemgroups?organization_id=${orgId}`,
            groupData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.item_group
        };
    }

    /**
     * Inventory: List Item Groups
     */
    async handleInventoryListItemGroups(args) {
        const orgId = await this.getInventoryOrgId();

        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/itemgroups?organization_id=${orgId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                item_groups: response.data.item_groups
            }
        };
    }

    /**
     * Inventory: Get Organization
     */
    async handleInventoryGetOrganization(args) {
        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/organizations`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                organizations: response.data.organizations
            }
        };
    }

    /**
     * Inventory: Update Custom Field
     */
    async handleInventoryUpdateCustomField(args) {
        const orgId = await this.getInventoryOrgId();
        const { item_id, field_name, field_value } = args;

        const updateData = {
            custom_fields: [
                {
                    api_name: field_name,
                    value: field_value
                }
            ]
        };

        const response = await axios.put(
            `${this.config.apiUrl}/inventory/v1/items/${item_id}?organization_id=${orgId}`,
            updateData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.item
        };
    }

    /**
     * Inventory: Create Adjustment
     */
    async handleInventoryCreateAdjustment(args) {
        const orgId = await this.getInventoryOrgId();

        const adjustmentData = {
            date: args.date,
            reason: args.reason,
            adjustment_type: args.adjustment_type,
            line_items: args.line_items,
            description: args.description || ''
        };

        const response = await axios.post(
            `${this.config.apiUrl}/inventory/v1/inventoryadjustments?organization_id=${orgId}`,
            adjustmentData,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.inventory_adjustment
        };
    }

    /**
     * Inventory: List Adjustments
     */
    async handleInventoryListAdjustments(args) {
        const orgId = await this.getInventoryOrgId();

        const params = {
            organization_id: orgId,
            page: args.page || 1,
            per_page: args.per_page || 200
        };

        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/inventoryadjustments`,
            {
                params,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                adjustments: response.data.inventory_adjustments,
                page_context: response.data.page_context
            }
        };
    }

    /**
     * Inventory: Get Adjustment
     */
    async handleInventoryGetAdjustment(args) {
        const orgId = await this.getInventoryOrgId();
        const { adjustment_id } = args;

        const response = await axios.get(
            `${this.config.apiUrl}/inventory/v1/inventoryadjustments/${adjustment_id}?organization_id=${orgId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: response.data.inventory_adjustment
        };
    }

    /**
     * Analytics: Service Performance
     */
    async handleAnalyticsServicePerformance(args) {
        const { startDate, endDate, metrics = ['revenue', 'workOrders', 'efficiency'] } = args;
        
        const performanceData = {};
        
        // Get work orders in date range
        if (metrics.includes('workOrders')) {
            const woResponse = await axios.get(
                `${this.config.apiUrl}/crm/v2/Work_Orders/search`,
                {
                    params: {
                        criteria: `(Scheduled_Date:between:${startDate},${endDate})`,
                        per_page: 200
                    },
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                    }
                }
            );
            
            const workOrders = woResponse.data.data || [];
            performanceData.workOrders = {
                total: workOrders.length,
                completed: workOrders.filter(wo => wo.Status === 'Completed').length,
                pending: workOrders.filter(wo => wo.Status === 'Scheduled').length,
                inProgress: workOrders.filter(wo => wo.Status === 'In Progress').length
            };
        }
        
        // Get revenue data
        if (metrics.includes('revenue')) {
            const invoiceResponse = await axios.get(
                `${this.config.apiUrl}/books/v3/invoices`,
                {
                    params: {
                        date_start: startDate,
                        date_end: endDate,
                        status: 'paid'
                    },
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                    }
                }
            );
            
            const invoices = invoiceResponse.data.invoices || [];
            performanceData.revenue = {
                total: invoices.reduce((sum, inv) => sum + inv.total, 0),
                invoiceCount: invoices.length,
                averageInvoice: invoices.length > 0 ? 
                    invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 0
            };
        }
        
        // Calculate efficiency metrics
        if (metrics.includes('efficiency')) {
            performanceData.efficiency = {
                completionRate: performanceData.workOrders ? 
                    (performanceData.workOrders.completed / performanceData.workOrders.total) * 100 : 0,
                averageRevenue: performanceData.revenue && performanceData.workOrders ? 
                    performanceData.revenue.total / performanceData.workOrders.completed : 0
            };
        }
        
        return {
            success: true,
            data: performanceData
        };
    }
    
    /**
     * Analytics: Revenue Forecast
     */
    async handleAnalyticsRevenueForecast(args) {
        const { forecastPeriod, includeRenewals = true } = args;
        
        // Get active service agreements
        const agreementResponse = await axios.get(
            `${this.config.apiUrl}/crm/v2/Service_Agreements/search`,
            {
                params: {
                    criteria: '(Status:equals:Active)',
                    per_page: 200
                },
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );
        
        const agreements = agreementResponse.data.data || [];
        const forecast = {
            monthlyRecurring: 0,
            quarterlyRecurring: 0,
            annualRecurring: 0,
            totalForecast: 0,
            agreementCount: agreements.length,
            breakdown: []
        };
        
        agreements.forEach(agreement => {
            const monthlyValue = agreement.Contract_Value / 12;
            
            switch (agreement.Frequency?.toLowerCase()) {
                case 'monthly':
                    forecast.monthlyRecurring += agreement.Contract_Value;
                    break;
                case 'quarterly':
                    forecast.quarterlyRecurring += agreement.Contract_Value * 4;
                    break;
                case 'annual':
                    forecast.annualRecurring += agreement.Contract_Value;
                    break;
            }
            
            forecast.breakdown.push({
                agreementId: agreement.id,
                accountName: agreement.Account?.name,
                frequency: agreement.Frequency,
                monthlyValue: monthlyValue,
                annualValue: agreement.Contract_Value
            });
        });
        
        // Calculate total forecast
        forecast.totalForecast = (forecast.monthlyRecurring * 12) + 
                                forecast.quarterlyRecurring + 
                                forecast.annualRecurring;
        
        // Project forward
        forecast.projections = [];
        for (let i = 1; i <= forecastPeriod; i++) {
            forecast.projections.push({
                month: i,
                revenue: forecast.totalForecast / 12,
                cumulative: (forecast.totalForecast / 12) * i
            });
        }
        
        return {
            success: true,
            data: forecast
        };
    }
    
    /**
     * Batch: Import Customers
     */
    async handleBatchImportCustomers(args) {
        const { data, mapping = {}, skipDuplicates = true } = args;

        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            idMappings: {} // Fullbay_Customer_ID -> Zoho Account ID
        };

        // Process in batches of 100
        const batchSize = 100;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const accountsData = batch.map(record => {
                let account = {};

                // If mapping is provided, use it
                if (Object.keys(mapping).length > 0) {
                    Object.keys(mapping).forEach(sourceField => {
                        const targetField = mapping[sourceField];
                        if (record[sourceField] !== undefined) {
                            account[targetField] = record[sourceField];
                        }
                    });
                } else {
                    // No mapping provided - copy all fields directly
                    account = { ...record };
                }

                // Ensure required fields
                if (!account.Account_Name) {
                    account.Account_Name = record.name || record.companyName || record.Account_Name || 'Unknown';
                }

                return account;
            });

            try {
                const response = await axios.post(
                    `${this.config.apiUrl}/crm/v2/Accounts/upsert`,
                    {
                        data: accountsData,
                        duplicate_check_fields: skipDuplicates ? ['Account_Name', 'Email'] : []
                    },
                    {
                        headers: {
                            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                response.data.data.forEach((result, idx) => {
                    const originalRecord = batch[idx];
                    const fullbayId = originalRecord.Fullbay_Customer_ID;

                    if (result.status === 'success') {
                        results.success++;
                        // Store ID mapping
                        if (fullbayId && result.details?.id) {
                            results.idMappings[fullbayId] = result.details.id;
                        }
                    } else if (result.code === 'DUPLICATE_DATA') {
                        results.skipped++;
                        // For duplicates, still try to capture the ID if available
                        if (fullbayId && result.details?.id) {
                            results.idMappings[fullbayId] = result.details.id;
                        }
                    } else {
                        results.failed++;
                        results.errors.push({
                            record: originalRecord.Account_Name || 'Unknown',
                            fullbayId: fullbayId,
                            error: result.message
                        });
                    }
                });
            } catch (error) {
                results.failed += batch.length;
                results.errors.push({
                    batch: `Records ${i} to ${i + batch.length}`,
                    error: error.message
                });
            }
        }

        return {
            success: true,
            data: results
        };
    }
    
    /**
     * Batch: Create Quotes
     */
    async handleBatchCreateQuotes(args) {
        const { quotes, templateId } = args;
        
        const results = {
            created: [],
            failed: []
        };
        
        // Get template if specified
        let template = {};
        if (templateId) {
            const templateResponse = await axios.get(
                `${this.config.apiUrl}/crm/v2/Quotes/${templateId}`,
                {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                    }
                }
            );
            template = templateResponse.data.data[0];
        }
        
        // Process quotes
        for (const quote of quotes) {
            try {
                const quoteData = {
                    ...template,
                    ...quote,
                    Subject: quote.subject || `Quote - ${new Date().toLocaleDateString()}`
                };
                
                const response = await axios.post(
                    `${this.config.apiUrl}/crm/v2/Quotes`,
                    { data: [quoteData] },
                    {
                        headers: {
                            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                results.created.push(response.data.data[0]);
            } catch (error) {
                results.failed.push({
                    quote: quote,
                    error: error.message
                });
            }
        }
        
        return {
            success: true,
            data: results
        };
    }
    
    /**
     * Generator Assets: Create
     */
    async handleCreateGeneratorAsset(args) {
        const assetData = {
            Name: args.name,
            Generator_Manufacturer: args.generatorMake,  // NEW: Generator make/manufacturer field
            Generator_Model: args.generatorModel,
            Generator_kW_Rating: args.kwRating,  // FIXED: Was Generator_kW, now Generator_kW_Rating
            Serial_Number: args.serialNumber,
            External_ID: args.fullbayUnitId,  // NEW: Fullbay source system tracking ID (using External_ID field)
            Fuel_Type: args.fuelType,
            Installation_Address: args.installationAddress,
            Engine_Make: args.engineMake,
            Engine_Cylinders: args.cylinders,  // FIXED: Was Cylinders, now Engine_Cylinders
            Oil_Type: args.oilType,
            Oil_Capacity: args.oilCapacity,  // Already correct: Oil_Capacity
            Coolant_Type: args.coolantType,
            Coolant_Capacity: args.coolantCapacity,  // Already correct: Coolant_Capacity
            Last_Service_Date: args.lastServiceDate,
            Next_Service_Due: args.nextServiceDue,
            Hours_Run: args.hoursRun,
            Status: args.status || 'Active',
            GPS_Latitude: args.gpsLatitude,
            GPS_Longitude: args.gpsLongitude,
            GPS_Accuracy: args.gpsAccuracy,
            GPS_Source: args.gpsSource || 'Manual Entry',
            // GPS_Last_Updated: Removed - ISO timestamp format causes Zoho to silently reject ALL GPS fields
            Site_Location: args.siteLocation,
            Site_Identifier: args.siteIdentifier
        };

        // Add customer account lookup (FIXED: Zoho lookups accept just the ID string)
        if (args.customerAccountId) {
            assetData.Customer_Account = args.customerAccountId;
        }

        const response = await this.makeZohoApiCallWithRetry(() =>
            axios.post(
                `${this.config.apiUrl}/crm/v2/Generator_Equipment`,
                { data: [assetData] },
                {
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            )
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Generator Assets: Update
     */
    async handleUpdateGeneratorAsset(args) {
        const { assetId, updates } = args;

        const response = await axios.put(
            `${this.config.apiUrl}/crm/v2/Generator_Equipment/${assetId}`,
            { data: [updates] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Generator Assets: Get by ID
     */
    async handleGetGeneratorAsset(args) {
        const { assetId } = args;

        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Generator_Equipment/${assetId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Generator Assets: Search
     */
    async handleSearchGeneratorAssets(args) {
        const { searchTerm, criteria, limit = 10, page = 1 } = args;

        const params = {
            per_page: limit,
            page: page
        };

        if (criteria) {
            params.criteria = this.buildSearchCriteria(criteria);
        } else {
            params.word = searchTerm;
        }

        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Generator_Equipment/search`,
            {
                params,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                assets: response.data.data || [],
                info: response.data.info || {}
            }
        };
    }

    /**
     * Service Agreements: Create
     */
    async handleCreateServiceAgreement(args) {
        const agreementData = {
            Name: args.name,
            Start_Date: args.startDate,
            End_Date: args.endDate,
            Annual_Value: args.annualValue,
            Quarterly_Value: args.quarterlyValue,
            Auto_Renew: args.autoRenew,
            Status: args.status || 'Draft',
            Payment_Terms: args.paymentTerms,
            Billing_Frequency: args.billingFrequency
        };

        // Add lookups (FIXED: Zoho lookups accept just the ID string, not { id: ... })
        if (args.customerAccountId) {
            agreementData.Customer_Account = args.customerAccountId;
        }
        if (args.generatorAssetId) {
            agreementData.Generator_Asset = args.generatorAssetId;
        }

        // Serialize array fields
        if (args.servicesIncluded && Array.isArray(args.servicesIncluded)) {
            agreementData.Services_Included = JSON.stringify(args.servicesIncluded);
        }

        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Service_Agreements`,
            { data: [agreementData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Service Agreements: Update
     */
    async handleUpdateServiceAgreement(args) {
        const { agreementId, updates } = args;

        const response = await axios.put(
            `${this.config.apiUrl}/crm/v2/Service_Agreements/${agreementId}`,
            { data: [updates] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Service Agreements: Get by ID
     */
    async handleGetServiceAgreement(args) {
        const { agreementId } = args;

        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Service_Agreements/${agreementId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Service Agreements: Search
     */
    async handleSearchServiceAgreements(args) {
        const { searchTerm, criteria, limit = 10, page = 1 } = args;

        const params = {
            per_page: limit,
            page: page
        };

        if (criteria) {
            params.criteria = this.buildSearchCriteria(criteria);
        } else {
            params.word = searchTerm;
        }

        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Service_Agreements/search`,
            {
                params,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                agreements: response.data.data || [],
                info: response.data.info || {}
            }
        };
    }

    /**
     * Work Orders: Create
     */
    async handleCreateWorkOrder(args) {
        const workOrderData = {
            Name: args.name,
            Work_Order_Type: args.workOrderType,
            Scheduled_Date: args.scheduledDate,
            Estimated_Hours: args.estimatedHours,
            Status: args.status || 'Scheduled',
            Priority: args.priority || 'Medium'
        };

        // Add lookups (FIXED: Zoho lookups accept just the ID string, not { id: ... })
        if (args.customerAccountId) {
            workOrderData.Customer_Account = args.customerAccountId;
        }
        if (args.generatorAssetId) {
            workOrderData.Generator_Asset = args.generatorAssetId;
        }
        if (args.serviceAgreementId) {
            workOrderData.Service_Agreement = args.serviceAgreementId;
        }

        // Serialize array fields
        if (args.servicesList && Array.isArray(args.servicesList)) {
            workOrderData.Services_List = JSON.stringify(args.servicesList);
        }

        const response = await axios.post(
            `${this.config.apiUrl}/crm/v2/Work_Orders`,
            { data: [workOrderData] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Work Orders: Update
     */
    async handleUpdateWorkOrder(args) {
        const { workOrderId, updates } = args;

        const response = await axios.put(
            `${this.config.apiUrl}/crm/v2/Work_Orders/${workOrderId}`,
            { data: [updates] },
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Work Orders: Get by ID
     */
    async handleGetWorkOrder(args) {
        const { workOrderId } = args;

        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Work_Orders/${workOrderId}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: response.data.data[0]
        };
    }

    /**
     * Work Orders: Search
     */
    async handleSearchWorkOrders(args) {
        const { searchTerm, criteria, limit = 10, page = 1 } = args;

        const params = {
            per_page: limit,
            page: page
        };

        if (criteria) {
            params.criteria = this.buildSearchCriteria(criteria);
        } else {
            params.word = searchTerm;
        }

        const response = await axios.get(
            `${this.config.apiUrl}/crm/v2/Work_Orders/search`,
            {
                params,
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        return {
            success: true,
            data: {
                workOrders: response.data.data || [],
                info: response.data.info || {}
            }
        };
    }

    /**
     * CRM: Add Custom Fields to Module
     * Creates custom fields in a Zoho CRM module (e.g., Accounts, Contacts)
     */
    async handleCRMAddCustomFields(args) {
        const { moduleName, fields } = args;

        const results = {
            created: [],
            failed: [],
            alreadyExist: []
        };

        console.error(`\n${'='.repeat(80)}`);
        console.error(`ADDING CUSTOM FIELDS TO ${moduleName} MODULE`);
        console.error(`${'='.repeat(80)}\n`);

        // First, check which fields already exist
        const existingFieldsResponse = await axios.get(
            `${this.config.apiUrl}/crm/v2/settings/fields?module=${moduleName}`,
            {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`
                }
            }
        );

        const existingApiNames = (existingFieldsResponse.data.fields || []).map(f => f.api_name);

        console.error(`Found ${existingApiNames.length} existing fields in ${moduleName}\n`);

        // Filter out fields that already exist
        const fieldsToCreate = fields.filter(f => {
            if (existingApiNames.includes(f.api_name)) {
                results.alreadyExist.push(f.api_name);
                console.error(`  ✓ ${f.api_name} (already exists)`);
                return false;
            }
            return true;
        });

        if (fieldsToCreate.length === 0) {
            console.error(`\n✓ ALL FIELDS ALREADY EXIST! No fields need to be created.\n`);
            return {
                success: true,
                data: results
            };
        }

        console.error(`\nCreating ${fieldsToCreate.length} new fields:\n`);

        // Add fields one at a time (Zoho API requirement)
        for (const field of fieldsToCreate) {
            console.error(`Creating field: ${field.api_name}...`);

            try {
                const response = await axios.post(
                    `${this.config.apiUrl}/crm/v2/settings/fields?module=${moduleName}`,
                    { fields: [field] },
                    {
                        headers: {
                            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.fields && response.data.fields[0].status === 'success') {
                    results.created.push(field.api_name);
                    console.error(`  ✓ Created successfully\n`);
                } else {
                    results.failed.push({
                        field: field.api_name,
                        error: response.data.fields?.[0]?.message || 'Unknown error',
                        response: response.data
                    });
                    console.error(`  ✗ Failed: ${JSON.stringify(response.data)}\n`);
                }
            } catch (error) {
                results.failed.push({
                    field: field.api_name,
                    error: error.message,
                    details: error.response?.data
                });
                console.error(`  ✗ Error: ${error.message}`);
                if (error.response?.data) {
                    console.error(`    ${JSON.stringify(error.response.data)}\n`);
                }
            }

            // Rate limiting: wait 1 second between field creations
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.error(`\n${'='.repeat(80)}`);
        console.error('FIELD CREATION SUMMARY');
        console.error(`${'='.repeat(80)}`);
        console.error(`Created: ${results.created.length}`);
        console.error(`Already Exist: ${results.alreadyExist.length}`);
        console.error(`Failed: ${results.failed.length}\n`);

        return {
            success: true,
            data: results
        };
    }

    /**
     * Build search criteria from object
     */
    buildSearchCriteria(criteria) {
        const conditions = [];

        Object.keys(criteria).forEach(field => {
            const value = criteria[field];
            if (typeof value === 'object' && value.operator) {
                conditions.push(`(${field}:${value.operator}:${value.value})`);
            } else {
                conditions.push(`(${field}:equals:${value})`);
            }
        });

        return conditions.join('and');
    }
    
    /**
     * Start the MCP server
     */
    async start() {
        console.error('Starting Zoho MCP Server...');
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Zoho MCP Server connected and ready');

    }
}

// Export for use in various environments
export default ZohoMCPServer;

// Main execution block - run as standalone MCP server
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new ZohoMCPServer();
    server.start().catch(console.error);
}