/**
 * CRM vs Books Discrepancy Analysis
 *
 * Analyzes all CRM Accounts and compares with Books Customers
 * Identifies duplicates, missing data, and sync issues
 */

const ZohoDirectIntegration = require('./src/api/zoho-direct-integration.cjs');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class CRMBooksAnalyzer {
    constructor() {
        this.zoho = new ZohoDirectIntegration(console);
        this.issues = {
            crmDuplicates: [],
            emptyAccounts: [],
            missingAddresses: [],
            missingPhones: [],
            missingEmails: [],
            inactiveAccounts: [],
            noExternalID: []
        };
    }

    async analyzeCRM() {
        log('\n' + '='.repeat(80), 'cyan');
        log('CRM ACCOUNTS ANALYSIS', 'cyan');
        log('='.repeat(80), 'cyan');

        try {
            // Get all accounts using COQL
            const coql = `SELECT id, Account_Name, External_ID, Phone, Email, Website,
                          Billing_Street, Billing_City, Billing_State, Billing_Code, Billing_Country,
                          Physical_Address_Line_1, Physical_Address_City, Physical_Address_State, Physical_Address_Zip,
                          Customer_Is_Active, Description, Modified_Time, Last_Activity_Time, Lead_Source,
                          Billing_Contact, Credit_Terms, Portal_is_on
                          FROM Accounts
                          ORDER BY Account_Name
                          LIMIT 200`;

            const result = await this.zoho.makeApiRequest('/coql', 'POST', { select_query: coql });

            if (!result.data || result.data.length === 0) {
                log('\n❌ No accounts found', 'red');
                return;
            }

            const accounts = result.data;
            log(`\n✅ Found ${accounts.length} total accounts in CRM\n`, 'green');

            // Track account names for duplicate detection
            const nameCount = {};

            // Analyze each account
            accounts.forEach((account, index) => {
                const name = account.Account_Name;

                // Count duplicates
                nameCount[name] = (nameCount[name] || 0) + 1;

                // Check for issues
                const hasExternalID = account.External_ID && account.External_ID.trim() !== '';
                const hasAddress = account.Billing_Street || account.Physical_Address_Line_1;
                const hasPhone = account.Phone && account.Phone.trim() !== '';
                const hasEmail = account.Email && account.Email.trim() !== '';
                const isActive = account.Customer_Is_Active === true || account.Customer_Is_Active === 'true';
                const isEmpty = !hasExternalID && !hasAddress && !hasPhone && !hasEmail;

                // Categorize issues
                if (isEmpty) {
                    this.issues.emptyAccounts.push({
                        name,
                        id: account.id,
                        modified: account.Modified_Time,
                        source: account.Lead_Source
                    });
                }

                if (!hasExternalID) {
                    this.issues.noExternalID.push({
                        name,
                        id: account.id,
                        isEmpty
                    });
                }

                if (!hasAddress) {
                    this.issues.missingAddresses.push({ name, id: account.id });
                }

                if (!hasPhone) {
                    this.issues.missingPhones.push({ name, id: account.id });
                }

                if (!hasEmail) {
                    this.issues.missingEmails.push({ name, id: account.id });
                }

                if (!isActive) {
                    this.issues.inactiveAccounts.push({ name, id: account.id });
                }
            });

            // Find duplicates
            Object.keys(nameCount).forEach(name => {
                if (nameCount[name] > 1) {
                    const dupes = accounts.filter(a => a.Account_Name === name);
                    this.issues.crmDuplicates.push({
                        name,
                        count: nameCount[name],
                        accounts: dupes.map(d => ({
                            id: d.id,
                            hasData: !!(d.External_ID || d.Billing_Street || d.Phone),
                            externalID: d.External_ID,
                            source: d.Lead_Source,
                            modified: d.Modified_Time
                        }))
                    });
                }
            });

            // Generate report
            this.generateReport();

        } catch (error) {
            log(`\n❌ Analysis failed: ${error.message}`, 'red');
            console.error(error);
        }
    }

    generateReport() {
        log('\n' + '='.repeat(80), 'yellow');
        log('ISSUE SUMMARY', 'yellow');
        log('='.repeat(80), 'yellow');

        // Duplicates
        if (this.issues.crmDuplicates.length > 0) {
            log(`\n🔴 CRITICAL: ${this.issues.crmDuplicates.length} DUPLICATE ACCOUNT NAMES`, 'red');
            this.issues.crmDuplicates.forEach(dup => {
                log(`\n  "${dup.name}" - ${dup.count} records:`, 'yellow');
                dup.accounts.forEach(acc => {
                    const status = acc.hasData ? '✅ HAS DATA' : '❌ EMPTY';
                    log(`    - ID: ${acc.id} ${status}`, acc.hasData ? 'green' : 'red');
                    log(`      External ID: ${acc.externalID || 'NONE'}`, 'dim');
                    log(`      Source: ${acc.source || 'NONE'}`, 'dim');
                    log(`      Modified: ${acc.modified}`, 'dim');
                });
            });
            log(`\n  ⚠️  These duplicates will cause duplicate customers in Books!`, 'yellow');
        }

        // Empty accounts
        if (this.issues.emptyAccounts.length > 0) {
            log(`\n⚠️  ${this.issues.emptyAccounts.length} COMPLETELY EMPTY ACCOUNTS`, 'yellow');
            this.issues.emptyAccounts.slice(0, 5).forEach(acc => {
                log(`  - ${acc.name} (${acc.id})`, 'dim');
            });
            if (this.issues.emptyAccounts.length > 5) {
                log(`  ... and ${this.issues.emptyAccounts.length - 5} more`, 'dim');
            }
        }

        // Missing data
        if (this.issues.noExternalID.length > 0) {
            log(`\n⚠️  ${this.issues.noExternalID.length} accounts missing External_ID (Fullbay ID)`, 'yellow');
        }

        if (this.issues.missingAddresses.length > 0) {
            log(`⚠️  ${this.issues.missingAddresses.length} accounts missing addresses`, 'yellow');
        }

        if (this.issues.missingPhones.length > 0) {
            log(`⚠️  ${this.issues.missingPhones.length} accounts missing phone numbers`, 'yellow');
        }

        if (this.issues.missingEmails.length > 0) {
            log(`⚠️  ${this.issues.missingEmails.length} accounts missing emails`, 'yellow');
        }

        if (this.issues.inactiveAccounts.length > 0) {
            log(`⚠️  ${this.issues.inactiveAccounts.length} inactive accounts`, 'yellow');
        }

        // Recommendations
        log('\n' + '='.repeat(80), 'cyan');
        log('RECOMMENDATIONS', 'cyan');
        log('='.repeat(80), 'cyan');

        if (this.issues.crmDuplicates.length > 0) {
            log('\n1. 🔴 REMOVE DUPLICATE ACCOUNTS IN CRM (URGENT)', 'red');
            log('   Action: Delete the empty duplicate accounts to prevent Books sync issues', 'yellow');
            this.issues.crmDuplicates.forEach(dup => {
                const emptyAcc = dup.accounts.find(a => !a.hasData);
                if (emptyAcc) {
                    log(`   DELETE: ${dup.name} - ID: ${emptyAcc.id} (empty duplicate)`, 'red');
                }
            });
        }

        if (this.issues.emptyAccounts.length > 0) {
            log('\n2. ⚠️  CLEAN UP EMPTY ACCOUNTS', 'yellow');
            log(`   Found ${this.issues.emptyAccounts.length} accounts with no data`, 'dim');
            log('   Action: Review and delete if not needed', 'dim');
        }

        if (this.issues.missingAddresses.length > 0) {
            log('\n3. 📍 UPDATE MISSING ADDRESSES', 'yellow');
            log('   Books customers need billing addresses for invoices', 'dim');
            log(`   ${this.issues.missingAddresses.length} accounts need address data`, 'dim');
        }

        log('\n' + '='.repeat(80), 'cyan');
        log('\n✅ ANALYSIS COMPLETE', 'green');
        log('\nNext step: Clean up CRM duplicates before Books sync', 'yellow');
        log('='.repeat(80), 'cyan');
    }
}

// Run analysis
async function main() {
    const analyzer = new CRMBooksAnalyzer();
    await analyzer.analyzeCRM();
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
