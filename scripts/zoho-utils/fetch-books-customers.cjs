/**
 * Fetch Books Customers
 * Get all customers from Zoho Books to compare with CRM Accounts
 */

const ZohoDirectIntegration = require('./src/api/zoho-direct-integration.cjs');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function fetchBooksCustomers() {
    const zoho = new ZohoDirectIntegration(console);
    const booksOrgId = '883966257';

    log('\n' + '='.repeat(80), 'cyan');
    log('ZOHO BOOKS CUSTOMER FETCH', 'cyan');
    log('='.repeat(80), 'cyan');
    log(`\nOrganization ID: ${booksOrgId}`, 'yellow');

    try {
        log('\nAttempting to fetch Books customers via API...', 'yellow');

        const result = await zoho.makeApiRequest(
            '/books/v3/contacts',
            'GET',
            null,
            {
                organization_id: booksOrgId,
                contact_type: 'customer',
                per_page: 200
            }
        );

        if (result && result.contacts) {
            const customers = result.contacts;
            log(`\n✅ SUCCESS! Found ${customers.length} Books customers`, 'green');

            // Analyze data quality
            const missing = {
                address: 0,
                phone: 0,
                email: 0,
                payment_terms: 0
            };

            const duplicates = {};

            log('\n' + '='.repeat(80), 'cyan');
            log('BOOKS CUSTOMER DETAILS', 'cyan');
            log('='.repeat(80), 'cyan');

            customers.forEach((customer, index) => {
                // Track duplicates
                const name = customer.contact_name;
                if (!duplicates[name]) {
                    duplicates[name] = [];
                }
                duplicates[name].push(customer.contact_id);

                // Count missing data
                if (!customer.billing_address || !customer.billing_address.address) missing.address++;
                if (!customer.phone) missing.phone++;
                if (!customer.email) missing.email++;
                if (!customer.payment_terms) missing.payment_terms++;

                // Show first 10 in detail
                if (index < 10) {
                    log(`\n${index + 1}. ${customer.contact_name}`, 'green');
                    log(`   ID: ${customer.contact_id}`, 'cyan');
                    log(`   Company: ${customer.company_name || 'NONE'}`, 'reset');

                    if (customer.billing_address && customer.billing_address.address) {
                        log(`   Address: ${customer.billing_address.address}`, 'reset');
                        log(`   City/State: ${customer.billing_address.city || 'NONE'}, ${customer.billing_address.state || 'NONE'} ${customer.billing_address.zip || ''}`, 'reset');
                    } else {
                        log(`   Address: MISSING`, 'red');
                    }

                    log(`   Phone: ${customer.phone || 'MISSING'}`, customer.phone ? 'reset' : 'red');
                    log(`   Email: ${customer.email || 'MISSING'}`, customer.email ? 'reset' : 'red');
                    log(`   Payment Terms: ${customer.payment_terms || 'MISSING'}`, customer.payment_terms ? 'reset' : 'red');
                    log(`   Created: ${customer.created_time}`, 'dim');
                }
            });

            // Find duplicates
            const dupeNames = Object.keys(duplicates).filter(name => duplicates[name].length > 1);

            log('\n' + '='.repeat(80), 'yellow');
            log('DATA QUALITY SUMMARY', 'yellow');
            log('='.repeat(80), 'yellow');

            log(`\nTotal Customers: ${customers.length}`, 'green');
            log(`Duplicate Names: ${dupeNames.length}`, dupeNames.length > 0 ? 'red' : 'green');

            if (dupeNames.length > 0) {
                log('\n🔴 DUPLICATE CUSTOMER NAMES:', 'red');
                dupeNames.forEach(name => {
                    log(`  - "${name}" - ${duplicates[name].length} records`, 'yellow');
                    duplicates[name].forEach(id => {
                        log(`    ID: ${id}`, 'dim');
                    });
                });
            }

            log(`\n⚠️  MISSING DATA:`, 'yellow');
            log(`  - Missing Address: ${missing.address} customers (${Math.round(missing.address / customers.length * 100)}%)`, 'yellow');
            log(`  - Missing Phone: ${missing.phone} customers (${Math.round(missing.phone / customers.length * 100)}%)`, 'yellow');
            log(`  - Missing Email: ${missing.email} customers (${Math.round(missing.email / customers.length * 100)}%)`, 'yellow');
            log(`  - Missing Payment Terms: ${missing.payment_terms} customers (${Math.round(missing.payment_terms / customers.length * 100)}%)`, 'yellow');

            log('\n' + '='.repeat(80), 'green');
            log('✅ BOOKS CUSTOMER FETCH COMPLETE', 'green');
            log('='.repeat(80), 'green');

            return {
                total: customers.length,
                duplicates: dupeNames.length,
                duplicateNames: dupeNames,
                missing,
                customers
            };

        } else {
            log('\n❌ No contacts returned from Books API', 'red');
            return null;
        }

    } catch (error) {
        log(`\n❌ Error fetching Books customers: ${error.message}`, 'red');

        if (error.message.includes('not authorized')) {
            log('\n⚠️  This likely means the CRM token lacks Books API access', 'yellow');
            log('   Options:', 'yellow');
            log('   1. Use official Zoho MCP with Books access', 'yellow');
            log('   2. Get Books customer list from web interface', 'yellow');
            log('   3. Request Books API scope for current token', 'yellow');
        }

        console.error('\nFull error:', error.stack);
        return null;
    }
}

// Run fetch
fetchBooksCustomers().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
