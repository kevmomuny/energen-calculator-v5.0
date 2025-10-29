/**
 * Quick Books Customer Finder
 * Since CRM-Books are linked, search for Books customers by company name
 * Uses the MCP organization ID we know works: 883966257
 */

const fetch = require('node-fetch');

// Test accounts from our CRM migration
const testAccounts = [
    'Element Santa Clara',
    // Add more from the 17 accounts if needed
];

async function findBooksCustomers() {
    console.log('\n🔍 BOOKS CUSTOMER FINDER');
    console.log('='.repeat(80));
    console.log('\n⚠️  NOTE: This requires the Zoho MCP to be connected');
    console.log('Organization ID: 883966257\n');

    console.log('Test Accounts:');
    testAccounts.forEach((name, i) => {
        console.log(`  ${i + 1}. ${name}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 TO FIND BOOKS CUSTOMER IDS:');
    console.log('\nOption 1: Use Zoho MCP (RECOMMENDED)');
    console.log('  1. Ensure Zoho MCP is connected in Claude Code');
    console.log('  2. Ask: "List all Zoho Books customers"');
    console.log('  3. Find "Element Santa Clara" in the list');
    console.log('  4. Get the contact_id');

    console.log('\nOption 2: Use Zoho Books Web Interface');
    console.log('  1. Go to: https://books.zoho.com/app/883966257');
    console.log('  2. Click: Contacts → Customers');
    console.log('  3. Search: "Element Santa Clara"');
    console.log('  4. Click on the customer');
    console.log('  5. Copy ID from URL: /contacts/{ID}');

    console.log('\nOption 3: Check if Auto-Sync Created Customers');
    console.log('  Since CRM-Books integration is enabled,');
    console.log('  CRM Accounts may have auto-synced to Books as Customers.');
    console.log('  Check Books to see if all 17 customers are already there.');

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ ONCE YOU HAVE A CUSTOMER ID:');
    console.log('\nPaste it here and I will:');
    console.log('  1. Test invoice creation');
    console.log('  2. Fetch all Books customer IDs');
    console.log('  3. Migrate all 36 Fullbay invoices');

    console.log('\n' + '='.repeat(80));
}

findBooksCustomers();
