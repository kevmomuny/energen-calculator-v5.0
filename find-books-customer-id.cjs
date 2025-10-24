/**
 * Find Books Customer ID from CRM Account Name
 * Uses direct Zoho Books API to search for customers
 */

const ZohoDirectIntegration = require('./src/api/zoho-direct-integration.cjs');
const fetch = require('node-fetch');

async function findBooksCustomer(accountName) {
    const zoho = new ZohoDirectIntegration(console);
    const booksOrg = '883966257';
    const apiDomain = 'https://www.zohoapis.com';

    try {
        const token = await zoho.getAccessToken();

        console.log(`\n🔍 Searching Books for customer: "${accountName}"\n`);

        // Search Books contacts by company name
        const searchUrl = `${apiDomain}/books/v3/contacts?organization_id=${booksOrg}&company_name=${encodeURIComponent(accountName)}`;

        const response = await fetch(searchUrl, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`❌ Search failed: ${response.status}`);
            console.error(error);
            return null;
        }

        const data = await response.json();

        if (data.contacts && data.contacts.length > 0) {
            const customer = data.contacts[0];
            console.log('✅ Found Books Customer!');
            console.log(`   Customer ID: ${customer.contact_id}`);
            console.log(`   Name: ${customer.contact_name}`);
            console.log(`   Company: ${customer.company_name}`);
            console.log(`   Type: ${customer.contact_type}`);
            return customer.contact_id;
        } else {
            console.log('❌ Customer not found in Books');
            console.log('   This means CRM-to-Books auto-sync may not be enabled,');
            console.log('   or the customer name doesn\'t match exactly.');
            return null;
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    }
}

// Test with Element Santa Clara
async function main() {
    console.log('='.repeat(80));
    console.log('FINDING BOOKS CUSTOMER ID');
    console.log('='.repeat(80));

    const customerId = await findBooksCustomer('Element Santa Clara');

    if (customerId) {
        console.log(`\n✅ SUCCESS! Books Customer ID: ${customerId}`);
        console.log('\nYou can now use this ID to create invoices!');
    } else {
        console.log('\n⚠️  Customer not found in Books.');
        console.log('\nNext steps:');
        console.log('1. Check if CRM-Books sync is enabled');
        console.log('2. Manually create Books customer');
        console.log('3. Or try searching with exact company name from Books');
    }

    console.log('\n' + '='.repeat(80));
}

main();
