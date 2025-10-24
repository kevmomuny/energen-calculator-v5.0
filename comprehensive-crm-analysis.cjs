/**
 * Comprehensive CRM Account Analysis
 * Fetches ALL accounts and identifies duplicates, missing data, and issues
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

async function analyzeAllAccounts() {
    const zoho = new ZohoDirectIntegration(console);

    log('\n' + '='.repeat(80), 'cyan');
    log('COMPREHENSIVE CRM ACCOUNT ANALYSIS', 'cyan');
    log('='.repeat(80), 'cyan');

    try {
        // Fetch all accounts with pagination
        let allAccounts = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= 10) {
            log(`\nFetching page ${page}...`, 'yellow');
            const response = await zoho.makeApiRequest(
                '/crm/v6/Accounts',
                'GET',
                null,
                { page, per_page: 200 }
            );

            if (response && response.data && response.data.length > 0) {
                allAccounts.push(...response.data);
                log(`  Retrieved ${response.data.length} accounts`, 'green');
                hasMore = response.info && response.info.more_records;
                page++;

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            } else {
                hasMore = false;
            }
        }

        log(`\n✅ Total accounts fetched: ${allAccounts.length}`, 'green');

        // Analyze for duplicates by name
        const nameCount = {};
        allAccounts.forEach(acc => {
            const name = acc.Account_Name;
            if (!nameCount[name]) {
                nameCount[name] = [];
            }
            nameCount[name].push({
                id: acc.id,
                external_id: acc.External_ID,
                has_billing: !!(acc.Billing_Street),
                has_physical: !!(acc.Physical_Address_Line_1),
                has_phone: !!(acc.Phone),
                has_email: !!(acc.Email),
                has_credit_terms: !!(acc.Credit_Terms),
                is_active: acc.Customer_Is_Active === true || acc.Customer_Is_Active === 'true',
                modified: acc.Modified_Time,
                lead_source: acc.Lead_Source
            });
        });

        // Find duplicates
        const duplicates = Object.entries(nameCount)
            .filter(([name, accounts]) => accounts.length > 1)
            .map(([name, accounts]) => ({ name, count: accounts.length, accounts }));

        log('\n' + '='.repeat(80), 'red');
        log(`🔴 DUPLICATE ACCOUNTS: ${duplicates.length}`, 'red');
        log('='.repeat(80), 'red');

        if (duplicates.length > 0) {
            duplicates.forEach(dup => {
                log(`\n  "${dup.name}" - ${dup.count} records:`, 'yellow');
                dup.accounts.forEach(acc => {
                    const hasData = acc.external_id || acc.has_billing || acc.has_phone;
                    const status = hasData ? '✅ HAS DATA' : '❌ EMPTY';
                    const active = acc.is_active ? 'ACTIVE' : 'INACTIVE';
                    log(`    - ID: ${acc.id}`, 'cyan');
                    log(`      Status: ${status} | ${active}`, hasData ? 'green' : 'red');
                    log(`      External_ID: ${acc.external_id || 'NONE'}`, 'reset');
                    log(`      Address: ${acc.has_billing ? 'YES' : 'NO'} | Phone: ${acc.has_phone ? 'YES' : 'NO'}`, 'reset');
                    log(`      Source: ${acc.lead_source || 'NONE'}`, 'reset');
                    log(`      Modified: ${acc.modified}`, 'reset');
                });
            });
        } else {
            log('\n  No duplicates found!', 'green');
        }

        // Missing data analysis
        const missing = {
            external_id: allAccounts.filter(a => !a.External_ID || a.External_ID.trim() === ''),
            billing_address: allAccounts.filter(a => !a.Billing_Street),
            physical_address: allAccounts.filter(a => !a.Physical_Address_Line_1),
            any_address: allAccounts.filter(a => !a.Billing_Street && !a.Physical_Address_Line_1),
            phone: allAccounts.filter(a => !a.Phone),
            email: allAccounts.filter(a => !a.Email),
            credit_terms: allAccounts.filter(a => !a.Credit_Terms),
            inactive: allAccounts.filter(a => a.Customer_Is_Active !== true && a.Customer_Is_Active !== 'true')
        };

        log('\n' + '='.repeat(80), 'yellow');
        log('⚠️  MISSING DATA SUMMARY', 'yellow');
        log('='.repeat(80), 'yellow');
        log(`\n  Missing External_ID (Fullbay ID): ${missing.external_id.length}`, 'yellow');
        log(`  Missing Billing Address: ${missing.billing_address.length}`, 'yellow');
        log(`  Missing Physical Address: ${missing.physical_address.length}`, 'yellow');
        log(`  Missing ANY Address: ${missing.any_address.length}`, 'red');
        log(`  Missing Phone: ${missing.phone.length}`, 'yellow');
        log(`  Missing Email: ${missing.email.length}`, 'yellow');
        log(`  Missing Credit Terms: ${missing.credit_terms.length}`, 'yellow');
        log(`  Inactive Customers: ${missing.inactive.length}`, 'cyan');

        // Recommendations
        log('\n' + '='.repeat(80), 'cyan');
        log('📋 CLEANUP RECOMMENDATIONS', 'cyan');
        log('='.repeat(80), 'cyan');

        if (duplicates.length > 0) {
            log('\n1. 🔴 REMOVE DUPLICATE ACCOUNTS (URGENT)', 'red');
            const emptyDuplicates = duplicates.filter(d =>
                d.accounts.some(a => !a.external_id && !a.has_billing && !a.has_phone)
            );
            log(`   Found ${emptyDuplicates.length} duplicate sets with empty records`, 'yellow');
            log('   Recommended action: Delete empty duplicates, keep records with External_ID', 'yellow');
        }

        if (missing.any_address.length > 0) {
            log('\n2. ⚠️  FIX MISSING ADDRESSES', 'yellow');
            log(`   ${missing.any_address.length} accounts have NO address data`, 'yellow');
            log('   Required for Books invoicing!', 'red');
        }

        if (missing.external_id.length > 0) {
            log('\n3. 📝 UPDATE EXTERNAL_ID FIELD', 'yellow');
            log(`   ${missing.external_id.length} accounts missing Fullbay Customer ID`, 'yellow');
            log('   Prevents proper deduplication', 'yellow');
        }

        log('\n' + '='.repeat(80), 'green');
        log('✅ ANALYSIS COMPLETE', 'green');
        log('='.repeat(80), 'green');

        // Return summary for programmatic use
        return {
            total: allAccounts.length,
            duplicates: duplicates.length,
            duplicateDetails: duplicates,
            missing,
            accounts: allAccounts
        };

    } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        console.error(error.stack);
        throw error;
    }
}

// Run analysis
analyzeAllAccounts().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
