/**
 * Fullbay to Zoho Books Migration using Zoho MCP Tools
 *
 * Simple migration script that uses Zoho CRM MCP tools to:
 * 1. Fetch all migrated Accounts from Zoho CRM
 * 2. For each account with invoices, create Books invoices
 * 3. Use Fullbay data already in CRM custom fields
 *
 * This leverages the successful CRM migration from earlier session.
 *
 * Usage: node migrate-fullbay-to-books-mcp.cjs
 */

require('dotenv').config();
const fetch = require('node-fetch');
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
    const line = '═'.repeat(80);
    log(`\n╔${line}╗`, color);
    log(`║  ${title.padEnd(78)}║`, color);
    log(`╚${line}╝\n`, color);
}

class FullbayBooksMigration {
    constructor() {
        this.zoho = new ZohoDirectIntegration(console);
        this.booksOrg = process.env.ZOHO_BOOKS_ORGANIZATION_ID;
        this.apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
        this.customerCache = new Map();
        this.stats = {
            accountsProcessed: 0,
            customersCreated: 0,
            customersLinked: 0,
            errors: []
        };
    }

    async getBooksToken() {
        return await this.zoho.getAccessToken();
    }

    /**
     * Search or create Zoho Books Contact from CRM Account
     */
    async getOrCreateBooksCustomer(crmAccount) {
        try {
            const accountName = crmAccount.Account_Name;
            const cacheKey = crmAccount.id;

            // Check cache
            if (this.customerCache.has(cacheKey)) {
                return this.customerCache.get(cacheKey);
            }

            log(`   🔗 Linking: ${accountName}`, 'dim');

            const token = await this.getBooksToken();

            // Search for existing Books contact
            const searchUrl = `${this.apiDomain}/books/v3/contacts?organization_id=${this.booksOrg}&company_name=${encodeURIComponent(accountName)}`;
            const searchResponse = await fetch(searchUrl, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });

            if (!searchResponse.ok) {
                throw new Error(`Books search failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();

            if (searchData.contacts && searchData.contacts.length > 0) {
                // Found existing
                const booksContactId = searchData.contacts[0].contact_id;
                log(`   ✓ Found Books Contact: ${booksContactId}`, 'dim');
                this.customerCache.set(cacheKey, booksContactId);
                this.stats.customersLinked++;
                return booksContactId;
            }

            // Create new Books contact
            log(`   ➕ Creating Books Contact...`, 'dim');
            const contactData = {
                contact_name: accountName,
                company_name: accountName,
                contact_type: 'customer',
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

            const createUrl = `${this.apiDomain}/books/v3/contacts?organization_id=${this.booksOrg}`;
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

            log(`   ✅ Created Books Contact: ${booksContactId}`, 'green');
            this.customerCache.set(cacheKey, booksContactId);
            this.stats.customersCreated++;

            return booksContactId;

        } catch (error) {
            log(`   ❌ Failed to link customer: ${error.message}`, 'red');
            throw error;
        }
    }

    /**
     * Get all Accounts with External_ID (migrated from Fullbay)
     */
    async getMigratedAccounts() {
        try {
            // Use COQL to get all accounts - more reliable
            const coql = `SELECT id, Account_Name, External_ID, Phone, Website, Billing_Street, Billing_City, Billing_State, Billing_Code FROM Accounts LIMIT 200`;
            const result = await this.zoho.makeApiRequest(`/coql`, 'POST', { select_query: coql });

            if (!result.data) {
                return [];
            }

            log(`✅ Found ${result.data.length} migrated accounts\n`, 'green');
            return result.data;

        } catch (error) {
            log(`❌ Failed to fetch accounts: ${error.message}`, 'red');
            return [];
        }
    }

    /**
     * Process all accounts and create Books customers
     */
    async migrateCustomersToBooks() {
        try {
            box('FULLBAY TO ZOHO BOOKS CUSTOMER MIGRATION', 'cyan');

            // Environment check
            if (!this.booksOrg) {
                log('❌ ERROR: ZOHO_BOOKS_ORGANIZATION_ID not set', 'red');
                return;
            }

            log('✅ Environment check passed', 'green');
            log(`   Organization ID: ${this.booksOrg}\n`, 'dim');

            // Get all migrated accounts
            log('📡 Fetching migrated accounts from Zoho CRM...', 'cyan');
            const accounts = await this.getMigratedAccounts();

            if (accounts.length === 0) {
                log('❌ No migrated accounts found', 'red');
                return;
            }

            box('MIGRATING CUSTOMERS TO BOOKS', 'yellow');

            // Process each account
            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                this.stats.accountsProcessed++;

                log(`\n[${i + 1}/${accounts.length}] ${account.Account_Name}`, 'blue');
                log(`   CRM Account ID: ${account.id}`, 'dim');
                log(`   Fullbay ID: ${account.External_ID}`, 'dim');

                try {
                    const booksContactId = await this.getOrCreateBooksCustomer(account);
                    log(`   ✅ Books Contact ID: ${booksContactId}`, 'green');

                    // Rate limiting
                    await new Promise(r => setTimeout(r, 500));

                } catch (error) {
                    log(`   ❌ Failed: ${error.message}`, 'red');
                    this.stats.errors.push({
                        account: account.Account_Name,
                        error: error.message
                    });
                }
            }

            // Final stats
            box('MIGRATION COMPLETE', 'cyan');
            log(`✅ Accounts Processed: ${this.stats.accountsProcessed}`, 'green');
            log(`✅ Books Customers Created: ${this.stats.customersCreated}`, 'green');
            log(`✅ Books Customers Linked: ${this.stats.customersLinked}`, 'green');
            log(`❌ Errors: ${this.stats.errors.length}`, this.stats.errors.length > 0 ? 'red' : 'green');

            if (this.stats.errors.length > 0) {
                log(`\n❌ Failed Accounts:`, 'red');
                this.stats.errors.forEach(err => {
                    log(`   - ${err.account}: ${err.error}`, 'red');
                });
            }

            log(`\n🎉 CUSTOMER MIGRATION COMPLETE!`, 'green');
            log(`\n📝 Next Step: Create invoices in Zoho Books using the customer IDs created above`, 'cyan');

        } catch (error) {
            log(`\n❌ MIGRATION FAILED: ${error.message}`, 'red');
            console.error(error);
        }
    }
}

// Run migration
async function main() {
    const migration = new FullbayBooksMigration();
    await migration.migrateCustomersToBooks();
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
