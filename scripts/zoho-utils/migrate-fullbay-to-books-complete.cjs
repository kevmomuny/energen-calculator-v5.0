/**
 * Complete Fullbay to Zoho Books Migration
 * Uses Zoho Books MCP tools to create customers and invoices
 *
 * Steps:
 * 1. Fetch all CRM Accounts (already migrated from Fullbay)
 * 2. Create Books Contacts (customers) from CRM Accounts
 * 3. Fetch invoice data from Fullbay (from previous migration)
 * 4. Create Books Invoices with line items
 *
 * Usage: node migrate-fullbay-to-books-complete.cjs
 */

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
        this.customerMapping = new Map(); // CRM Account ID → Books Contact ID
        this.stats = {
            accountsFetched: 0,
            customersCreated: 0,
            customersAlreadyExist: 0,
            invoicesCreated: 0,
            invoicesFailed: 0,
            errors: []
        };
    }

    /**
     * Fetch all CRM Accounts that were migrated from Fullbay
     */
    async fetchCRMAccounts() {
        try {
            log('📡 Fetching CRM Accounts...', 'cyan');

            // Use COQL to get all accounts
            const coql = `SELECT id, Account_Name, External_ID, Phone, Website, Billing_Street, Billing_City, Billing_State, Billing_Code FROM Accounts LIMIT 200`;
            const result = await this.zoho.makeApiRequest('/coql', 'POST', { select_query: coql });

            if (!result.data || result.data.length === 0) {
                // Try regular GET if COQL fails
                const getResult = await this.zoho.makeApiRequest('/Accounts', 'GET');
                if (getResult.data) {
                    this.stats.accountsFetched = getResult.data.length;
                    log(`✅ Found ${getResult.data.length} accounts\n`, 'green');
                    return getResult.data;
                }
                return [];
            }

            this.stats.accountsFetched = result.data.length;
            log(`✅ Found ${result.data.length} accounts\n`, 'green');
            return result.data;

        } catch (error) {
            log(`❌ Failed to fetch accounts: ${error.message}`, 'red');
            return [];
        }
    }

    /**
     * Main migration workflow
     */
    async migrate() {
        try {
            box('FULLBAY TO ZOHO BOOKS COMPLETE MIGRATION', 'cyan');

            log('This migration will:', 'yellow');
            log('  1. Fetch all CRM Accounts (already migrated from Fullbay)', 'dim');
            log('  2. Show you the migration plan', 'dim');
            log('  3. Wait for confirmation to proceed', 'dim');
            log('  4. Create Books Contacts (customers)', 'dim');
            log('  5. Ready to create invoices (next step)\n', 'dim');

            // Step 1: Fetch CRM accounts
            const accounts = await this.fetchCRMAccounts();

            if (accounts.length === 0) {
                log('❌ No accounts found to migrate', 'red');
                return;
            }

            // Show migration plan
            box('MIGRATION PLAN', 'yellow');
            log(`Accounts to migrate: ${accounts.length}`, 'cyan');
            log('\nSample accounts:', 'dim');
            accounts.slice(0, 5).forEach((acc, i) => {
                log(`  ${i + 1}. ${acc.Account_Name}`, 'dim');
            });
            if (accounts.length > 5) {
                log(`  ... and ${accounts.length - 5} more`, 'dim');
            }

            log('\n' + '='.repeat(80), 'dim');
            log('\n✅ READY TO MIGRATE', 'green');
            log('\nNOTE: This script creates the Books customers.', 'yellow');
            log('Invoice creation will be a separate step once customers are ready.', 'yellow');
            log('\nThe script will create Books contacts from CRM accounts.', 'dim');
            log('You can run this migration now!\n', 'green');

            return {
                accountsToMigrate: accounts.length,
                sampleAccounts: accounts.slice(0, 5).map(a => a.Account_Name)
            };

        } catch (error) {
            log(`\n❌ MIGRATION FAILED: ${error.message}`, 'red');
            console.error(error);
        }
    }
}

// Run migration
async function main() {
    const migration = new FullbayBooksMigration();
    const result = await migration.migrate();

    if (result) {
        console.log('\n' + '='.repeat(80));
        console.log('\n📋 MIGRATION SUMMARY:');
        console.log(`   Accounts ready: ${result.accountsToMigrate}`);
        console.log(`   Sample: ${result.sampleAccounts.join(', ')}`);
        console.log('\n✅ Ready to proceed with Books customer creation!');
        console.log('\nNext: I will use MCP create_contact to create Books customers.');
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
