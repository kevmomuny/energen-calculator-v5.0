/**
 * Fullbay to Zoho Books Invoice Migration
 *
 * Migrates Fullbay invoices to Zoho Books with:
 * - Customer linking (3-tier deduplication)
 * - Line item extraction and mapping
 * - Invoice creation with all financial data
 * - Custom field tracking (Fullbay_Invoice_ID)
 *
 * Usage: node fullbay-books-sync.cjs
 *
 * @version 1.0.0
 */

const FullbayAPI = require('./src/api/fullbay-api.cjs');
const ZohoDirectIntegration = require('./src/api/zoho-direct-integration.cjs');

// Color output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function box(title, color = 'cyan') {
    const line = '═'.repeat(70);
    log(`\n╔${line}╗`, color);
    log(`║  ${title.padEnd(68)}║`, color);
    log(`╚${line}╝\n`, color);
}

class FullbayBooksSync {
    constructor(logger = console) {
        this.logger = logger;
        this.fullbay = new FullbayAPI();
        this.zoho = new ZohoDirectIntegration(logger);
        this.customerCache = new Map(); // Cache CRM Account ID → Books Contact ID
        this.stats = {
            invoicesProcessed: 0,
            invoicesCreated: 0,
            invoicesFailed: 0,
            customersLinked: 0,
            errors: []
        };
    }

    /**
     * Link Fullbay customer to Zoho Books Contact (Customer)
     *
     * Strategy:
     * 1. Find CRM Account by External_ID (Fullbay Customer ID)
     * 2. Search Books Contacts by company name
     * 3. Create Books Contact if not exists
     */
    async linkCustomerToBooks(fullbayCustomerId, customerName) {
        try {
            // Check cache first
            const cacheKey = `${fullbayCustomerId}`;
            if (this.customerCache.has(cacheKey)) {
                return this.customerCache.get(cacheKey);
            }

            log(`   🔗 Linking customer: ${customerName}`, 'dim');

            // Step 1: Find CRM Account by External_ID
            const searchCriteria = `((External_ID:equals:${fullbayCustomerId}))`;
            const crmSearchUrl = `/Accounts/search?criteria=${encodeURIComponent(searchCriteria)}`;
            const crmResult = await this.zoho.makeApiRequest(crmSearchUrl, 'GET');

            if (!crmResult.data || crmResult.data.length === 0) {
                throw new Error(`CRM Account not found for Fullbay Customer ID: ${fullbayCustomerId}`);
            }

            const crmAccount = crmResult.data[0];
            log(`   ✓ Found CRM Account: ${crmAccount.Account_Name} (${crmAccount.id})`, 'dim');

            // Step 2: Search Zoho Books for customer
            // Note: Zoho Books API uses different authentication, so we'll use direct fetch
            const booksOrg = process.env.ZOHO_BOOKS_ORGANIZATION_ID;
            if (!booksOrg) {
                throw new Error('ZOHO_BOOKS_ORGANIZATION_ID not configured');
            }

            const token = await this.zoho.getAccessToken();
            const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

            // Search for existing Books contact
            const searchUrl = `${apiDomain}/books/v3/contacts?organization_id=${booksOrg}&company_name=${encodeURIComponent(customerName)}`;
            const searchResponse = await fetch(searchUrl, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });

            if (!searchResponse.ok) {
                throw new Error(`Books search failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();

            if (searchData.contacts && searchData.contacts.length > 0) {
                // Found existing contact
                const booksContactId = searchData.contacts[0].contact_id;
                log(`   ✓ Found Books Contact: ${booksContactId}`, 'dim');
                this.customerCache.set(cacheKey, booksContactId);
                this.stats.customersLinked++;
                return booksContactId;
            }

            // Step 3: Create new Books contact
            log(`   ➕ Creating new Books Contact...`, 'dim');
            const contactData = {
                contact_name: customerName,
                company_name: customerName,
                contact_type: 'customer',
                custom_fields: [
                    {
                        label: 'Fullbay Customer ID',
                        value: fullbayCustomerId.toString()
                    },
                    {
                        label: 'Zoho CRM Account ID',
                        value: crmAccount.id
                    }
                ],
                billing_address: {
                    address: crmAccount.Billing_Street || '',
                    city: crmAccount.Billing_City || '',
                    state: crmAccount.Billing_State || '',
                    zip: crmAccount.Billing_Code || '',
                    country: 'USA'
                },
                phone: crmAccount.Phone || '',
                website: crmAccount.Website || ''
            };

            const createUrl = `${apiDomain}/books/v3/contacts?organization_id=${booksOrg}`;
            const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });

            if (!createResponse.ok) {
                const error = await createResponse.text();
                throw new Error(`Books contact creation failed: ${createResponse.status} - ${error}`);
            }

            const createData = await createResponse.json();
            const booksContactId = createData.contact.contact_id;

            log(`   ✓ Created Books Contact: ${booksContactId}`, 'green');
            this.customerCache.set(cacheKey, booksContactId);
            this.stats.customersLinked++;

            return booksContactId;

        } catch (error) {
            this.logger.error(`   ❌ Customer linking failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Extract line items from Fullbay invoice
     */
    extractLineItems(fullbayInvoice) {
        const lineItems = [];

        // Extract from invoice line items
        if (fullbayInvoice.LineItems && Array.isArray(fullbayInvoice.LineItems)) {
            fullbayInvoice.LineItems.forEach((item, index) => {
                lineItems.push({
                    name: item.description || `Line Item ${index + 1}`,
                    description: item.memo || '',
                    rate: parseFloat(item.total || 0),
                    quantity: 1,
                    item_order: lineItems.length + 1
                });
            });
        }

        // Add labor if present
        if (fullbayInvoice.totalLabor && parseFloat(fullbayInvoice.totalLabor) > 0) {
            lineItems.push({
                name: 'Labor',
                description: 'Service labor charges',
                rate: parseFloat(fullbayInvoice.totalLabor),
                quantity: 1,
                item_order: lineItems.length + 1
            });
        }

        // Add parts if present
        if (fullbayInvoice.totalParts && parseFloat(fullbayInvoice.totalParts) > 0) {
            lineItems.push({
                name: 'Parts',
                description: 'Parts and materials',
                rate: parseFloat(fullbayInvoice.totalParts),
                quantity: 1,
                item_order: lineItems.length + 1
            });
        }

        return lineItems;
    }

    /**
     * Sync single Fullbay invoice to Zoho Books
     */
    async syncInvoiceToBooks(fullbayInvoice) {
        try {
            this.stats.invoicesProcessed++;

            log(`\n📄 Processing Invoice #${fullbayInvoice.invoiceNumber}`, 'blue');
            log(`   Customer: ${fullbayInvoice.customerTitle}`, 'dim');
            log(`   Total: $${fullbayInvoice.total}`, 'dim');
            log(`   Date: ${fullbayInvoice.invoiceDate}`, 'dim');

            // Step 1: Link customer to Books
            const booksContactId = await this.linkCustomerToBooks(
                fullbayInvoice.customerId,
                fullbayInvoice.customerTitle
            );

            // Step 2: Extract line items
            const lineItems = this.extractLineItems(fullbayInvoice);
            log(`   ✓ Extracted ${lineItems.length} line items`, 'dim');

            // Step 3: Create invoice in Books
            const booksOrg = process.env.ZOHO_BOOKS_ORGANIZATION_ID;
            const token = await this.zoho.getAccessToken();
            const apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

            const invoiceData = {
                customer_id: booksContactId,
                invoice_number: fullbayInvoice.invoiceNumber,
                date: fullbayInvoice.invoiceDate,
                due_date: fullbayInvoice.dueDate || fullbayInvoice.invoiceDate,
                line_items: lineItems,
                notes: `Migrated from Fullbay - Original Invoice ID: ${fullbayInvoice.primaryKey}`,
                custom_fields: [
                    {
                        label: 'Fullbay Invoice ID',
                        value: fullbayInvoice.primaryKey.toString()
                    }
                ],
                discount: parseFloat(fullbayInvoice.discount || 0),
                is_discount_before_tax: true,
                tax_id: fullbayInvoice.taxId || null
            };

            const createUrl = `${apiDomain}/books/v3/invoices?organization_id=${booksOrg}`;
            const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Zoho-oauthtoken ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoiceData)
            });

            if (!createResponse.ok) {
                const error = await createResponse.text();
                throw new Error(`Invoice creation failed: ${createResponse.status} - ${error}`);
            }

            const createData = await createResponse.json();
            const booksInvoiceId = createData.invoice.invoice_id;

            this.stats.invoicesCreated++;
            log(`   ✅ Created Books Invoice: ${booksInvoiceId}`, 'green');

            return {
                success: true,
                booksInvoiceId,
                invoiceNumber: fullbayInvoice.invoiceNumber,
                booksContactId,
                lineItemCount: lineItems.length
            };

        } catch (error) {
            this.stats.invoicesFailed++;
            this.stats.errors.push({
                invoice: fullbayInvoice.invoiceNumber,
                error: error.message
            });
            log(`   ❌ Failed: ${error.message}`, 'red');
            return {
                success: false,
                error: error.message,
                invoiceNumber: fullbayInvoice.invoiceNumber
            };
        }
    }

    /**
     * Get sync statistics
     */
    getStats() {
        return this.stats;
    }
}

module.exports = FullbayBooksSync;
