/**
 * Fetch Books Customers via Direct API
 * Uses Zoho Books API directly with OAuth token from zoho-crm MCP
 */

const axios = require('axios');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class BooksCustomerFetcher {
    constructor() {
        this.clientId = process.env.ZOHO_CLIENT_ID;
        this.clientSecret = process.env.ZOHO_CLIENT_SECRET;
        this.refreshToken = process.env.ZOHO_REFRESH_TOKEN;
        this.apiDomain = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';
        this.accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';
        this.booksOrgId = process.env.ZOHO_BOOKS_ORGANIZATION_ID || '883966257';
        this.accessToken = null;
    }

    async getAccessToken() {
        try {
            const tokenUrl = `${this.accountsUrl}/oauth/v2/token`;
            const params = new URLSearchParams({
                refresh_token: this.refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token'
            });

            const response = await axios.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            log('✅ Access token refreshed', 'green');
            return this.accessToken;
        } catch (error) {
            log(`❌ Token refresh failed: ${error.message}`, 'red');
            throw error;
        }
    }

    async fetchAllContacts() {
        await this.getAccessToken();

        log('\n' + '='.repeat(80), 'cyan');
        log('ZOHO BOOKS CUSTOMER FETCH', 'cyan');
        log('='.repeat(80), 'cyan');
        log(`\nOrganization ID: ${this.booksOrgId}`, 'yellow');

        try {
            const url = `${this.apiDomain}/books/v3/contacts`;
            const params = {
                organization_id: this.booksOrgId,
                contact_type: 'customer',
                per_page: 200
            };

            log('\nFetching Books customers...', 'yellow');
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                params
            });

            if (!response.data || !response.data.contacts) {
                log('❌ No contacts in response', 'red');
                return null;
            }

            const customers = response.data.contacts;
            log(`\n✅ SUCCESS! Found ${customers.length} Books customers`, 'green');

            // Analyze data quality
            const missing = {
                address: 0,
                phone: 0,
                email: 0,
                payment_terms: 0
            };

            const duplicates = {};
            const customerDetails = [];

            customers.forEach((customer, index) => {
                // Track duplicates
                const name = customer.contact_name;
                if (!duplicates[name]) {
                    duplicates[name] = [];
                }
                duplicates[name].push({
                    id: customer.contact_id,
                    created: customer.created_time
                });

                // Count missing data
                const hasAddress = customer.billing_address && customer.billing_address.address;
                if (!hasAddress) missing.address++;
                if (!customer.phone) missing.phone++;
                if (!customer.email) missing.email++;
                if (!customer.payment_terms) missing.payment_terms++;

                customerDetails.push({
                    name: customer.contact_name,
                    id: customer.contact_id,
                    company: customer.company_name,
                    has_address: hasAddress,
                    has_phone: !!customer.phone,
                    has_email: !!customer.email,
                    has_terms: !!customer.payment_terms,
                    address: hasAddress ? `${customer.billing_address.address}, ${customer.billing_address.city}, ${customer.billing_address.state} ${customer.billing_address.zip}` : 'NONE',
                    phone: customer.phone || 'NONE',
                    email: customer.email || 'NONE',
                    terms: customer.payment_terms || 'NONE',
                    created: customer.created_time,
                    modified: customer.last_modified_time
                });

                // Show first 15 in detail
                if (index < 15) {
                    log(`\n${index + 1}. ${customer.contact_name}`, 'green');
                    log(`   ID: ${customer.contact_id}`, 'cyan');
                    log(`   Company: ${customer.company_name || 'NONE'}`, 'reset');

                    if (hasAddress) {
                        log(`   Address: ${customer.billing_address.address}`, 'reset');
                        log(`   City/State: ${customer.billing_address.city || 'NONE'}, ${customer.billing_address.state || 'NONE'} ${customer.billing_address.zip || ''}`, 'reset');
                    } else {
                        log(`   Address: MISSING`, 'red');
                    }

                    log(`   Phone: ${customer.phone || 'MISSING'}`, customer.phone ? 'reset' : 'red');
                    log(`   Email: ${customer.email || 'MISSING'}`, customer.email ? 'reset' : 'red');
                    log(`   Payment Terms: ${customer.payment_terms || 'MISSING'}`, customer.payment_terms ? 'reset' : 'red');
                    log(`   Created: ${customer.created_time}`, 'dim');
                    log(`   Modified: ${customer.last_modified_time}`, 'dim');
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
                    duplicates[name].forEach(dup => {
                        log(`    ID: ${dup.id} (Created: ${dup.created})`, 'dim');
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
                duplicateDetails: Object.fromEntries(
                    dupeNames.map(name => [name, duplicates[name]])
                ),
                missing,
                customers: customerDetails,
                rawData: customers
            };

        } catch (error) {
            if (error.response) {
                log(`\n❌ Books API Error: ${error.response.status}`, 'red');
                log(`   ${JSON.stringify(error.response.data, null, 2)}`, 'red');
            } else {
                log(`\n❌ Error: ${error.message}`, 'red');
            }
            console.error('\nFull error:', error.stack);
            return null;
        }
    }
}

// Run fetch
const fetcher = new BooksCustomerFetcher();
fetcher.fetchAllContacts().then(result => {
    if (result) {
        // Save summary to file for analysis
        const fs = require('fs');
        fs.writeFileSync(
            'books-customer-analysis.json',
            JSON.stringify(result, null, 2),
            'utf8'
        );
        log(`\n📄 Full analysis saved to: books-customer-analysis.json`, 'cyan');
    }
    process.exit(result ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
