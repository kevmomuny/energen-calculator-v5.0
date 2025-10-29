/**
 * Simple test: Create one Zoho Books customer from one CRM Account
 * Uses direct fetch to Books API with org ID 883966257
 */

require('dotenv').config();
const fetch = require('node-fetch');
const ZohoDirectIntegration = require('./src/api/zoho-direct-integration.cjs');

async function test() {
    console.log('Testing Zoho Books customer creation...\n');

    const zoho = new ZohoDirectIntegration(console);
    const booksOrg = '883966257';
    const apiDomain = 'https://www.zohoapis.com';

    // Test with a known account from earlier: Element Santa Clara (ID: 6712770000003813014)
    const testAccount = {
        id: '6712770000003813014',
        Account_Name: 'Element Santa Clara',
        Phone: '555-1234',
        Website: 'http://elementsantaclara.com',
        Billing_Street: '123 Main St',
        Billing_City: 'Santa Clara',
        Billing_State: 'CA',
        Billing_Code: '95050'
    };

    try {
        const token = await zoho.getAccessToken();
        console.log('✅ Got Zoho token\n');

        // Search for existing Books contact
        console.log(`Searching for: ${testAccount.Account_Name}...`);
        const searchUrl = `${apiDomain}/books/v3/contacts?organization_id=${booksOrg}&company_name=${encodeURIComponent(testAccount.Account_Name)}`;
        const searchResponse = await fetch(searchUrl, {
            headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (!searchResponse.ok) {
            const error = await searchResponse.text();
            console.error(`❌ Search failed: ${searchResponse.status} - ${error}`);
            return;
        }

        const searchData = await searchResponse.json();
        console.log(`Search result:`, JSON.stringify(searchData, null, 2));

        if (searchData.contacts && searchData.contacts.length > 0) {
            console.log(`\n✅ Found existing Books Contact: ${searchData.contacts[0].contact_id}`);
            console.log(`   Name: ${searchData.contacts[0].contact_name}`);
            return;
        }

        // Create new Books contact
        console.log(`\n➕ Creating new Books Contact...`);
        const contactData = {
            contact_name: testAccount.Account_Name,
            company_name: testAccount.Account_Name,
            contact_type: 'customer',
            billing_address: {
                address: testAccount.Billing_Street || '',
                city: testAccount.Billing_City || '',
                state: testAccount.Billing_State || '',
                zip: testAccount.Billing_Code || '',
                country: 'USA'
            },
            phone: testAccount.Phone || '',
            website: testAccount.Website || ''
        };

        console.log('Contact data:', JSON.stringify(contactData, null, 2));

        const createUrl = `${apiDomain}/books/v3/contacts?organization_id=${booksOrg}`;
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
        });

        const createText = await createResponse.text();
        console.log(`\nResponse status: ${createResponse.status}`);
        console.log(`Response:`, createText);

        if (!createResponse.ok) {
            console.error(`❌ Create failed: ${createResponse.status}`);
            return;
        }

        const createData = JSON.parse(createText);
        console.log(`\n✅ Created Books Contact: ${createData.contact.contact_id}`);
        console.log(`   Name: ${createData.contact.contact_name}`);
        console.log(`   Company: ${createData.contact.company_name}`);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

test();
