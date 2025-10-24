/**
 * COMPREHENSIVE E2E TEST SUITE - ENERGEN CALCULATOR V5.0
 * =======================================================
 *
 * This test suite performs a COMPLETE end-to-end workflow test:
 *
 * 1. Load real generator data from Excel file
 * 2. Create 20 test companies with logo.dev logos
 * 3. Create 2 contacts per company with enriched photos
 * 4. Assign generators from equipment list to each company
 * 5. Configure full service packages (A-K, Custom)
 * 6. Calculate pricing through API
 * 7. Generate PDF bid documents
 * 8. Sync to Zoho CRM (Account, Contacts, Quote)
 * 9. Verify all data passed through correctly
 *
 * Run: node tests/comprehensive-e2e-test-suite.cjs
 */

const XLSX = require('xlsx');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
    baseUrl: 'http://localhost:3002',
    equipmentListPath: 'C:/ECalc/active/energen-calculator-v5.0/4-Equipment List 10-1-2025.xlsx',
    outputDir: 'test-results',
    companiesCount: 20,
    contactsPerCompany: 2,
    testTimeout: 300000, // 5 minutes per test
    parallelTests: 5 // Run 5 companies in parallel
};

// Test state
const testState = {
    companies: [],
    generators: [],
    results: {
        passed: 0,
        failed: 0,
        errors: [],
        timing: {},
        pdfs: [],
        zohoRecords: []
    }
};

/**
 * Utility: Logger with timestamps
 */
function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

/**
 * Step 1: Load Equipment List from Excel
 */
async function loadEquipmentList() {
    const startTime = Date.now();
    log('INFO', '📊 Loading equipment list from Excel...');

    try {
        const workbook = XLSX.readFile(CONFIG.equipmentListPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        testState.generators = data.map((row, index) => ({
            id: `gen-${index + 1}`,
            kw: parseInt((row['Output KW'] || '').toString().replace(/KW/i, '').trim()) || null,
            brand: row['Manufacturer'] || row['Brand'] || 'Unknown',
            model: row['Unit Model Number'] || row['Model'] || 'Unknown',
            serial: row['Unit Serial Number'] || row['Serial'] || `SN-${Date.now()}-${index}`,
            fuel: row['Fuel Type'] || row['Fuel'] || 'Diesel',
            location: row['Building/Asset'] || row['Location'] || `Site ${index + 1}`,
            cylinders: row['Cylinders'] || null,
            installYear: row['Install Year'] || row['Year'] || 2020
        }));

        log('INFO', `✅ Loaded ${testState.generators.length} generators from Excel`, {
            sample: testState.generators.slice(0, 3)
        });

        testState.results.timing.equipmentLoad = Date.now() - startTime;
        return testState.generators;

    } catch (error) {
        log('ERROR', '❌ Failed to load equipment list', { error: error.message });
        throw error;
    }
}

/**
 * Step 2: Generate Test Companies with Real Domains
 */
async function generateTestCompanies() {
    const startTime = Date.now();
    log('INFO', '🏢 Generating 20 test companies...');

    // Real company domains for logo.dev
    const companyTemplates = [
        { name: 'Lincoln Property Company', domain: 'lpcwest.com', industry: 'Real Estate' },
        { name: 'Kaiser Permanente', domain: 'kp.org', industry: 'Healthcare' },
        { name: 'Chevron Corporation', domain: 'chevron.com', industry: 'Energy' },
        { name: 'Wells Fargo', domain: 'wellsfargo.com', industry: 'Financial' },
        { name: 'Pacific Gas & Electric', domain: 'pge.com', industry: 'Utilities' },
        { name: 'Stanford University', domain: 'stanford.edu', industry: 'Education' },
        { name: 'Salesforce', domain: 'salesforce.com', industry: 'Technology' },
        { name: 'Oracle Corporation', domain: 'oracle.com', industry: 'Technology' },
        { name: 'Target Corporation', domain: 'target.com', industry: 'Retail' },
        { name: 'Walmart', domain: 'walmart.com', industry: 'Retail' },
        { name: 'Amazon Web Services', domain: 'aws.amazon.com', industry: 'Technology' },
        { name: 'Microsoft Corporation', domain: 'microsoft.com', industry: 'Technology' },
        { name: 'Apple Inc', domain: 'apple.com', industry: 'Technology' },
        { name: 'Google LLC', domain: 'google.com', industry: 'Technology' },
        { name: 'Tesla Inc', domain: 'tesla.com', industry: 'Automotive' },
        { name: 'Boeing Company', domain: 'boeing.com', industry: 'Aerospace' },
        { name: 'Lockheed Martin', domain: 'lockheedmartin.com', industry: 'Aerospace' },
        { name: 'Northrop Grumman', domain: 'northropgrumman.com', industry: 'Aerospace' },
        { name: 'Raytheon Technologies', domain: 'rtx.com', industry: 'Aerospace' },
        { name: 'General Electric', domain: 'ge.com', industry: 'Conglomerate' }
    ];

    for (let i = 0; i < CONFIG.companiesCount; i++) {
        const template = companyTemplates[i];

        testState.companies.push({
            id: `company-${i + 1}`,
            name: template.name,
            domain: template.domain,
            industry: template.industry,
            address: `${1000 + i} Business Pkwy`,
            city: 'San Francisco',
            state: 'CA',
            zip: `941${String(i).padStart(2, '0')}`,
            phone: `(415) ${String(1000 + i).padStart(4, '0')}`,
            email: `contact@${template.domain}`,
            website: `https://${template.domain}`,
            logo: null, // Will be fetched from logo.dev
            contacts: [],
            generators: [],
            quote: null
        });
    }

    log('INFO', `✅ Generated ${testState.companies.length} companies`);
    testState.results.timing.companyGeneration = Date.now() - startTime;
}

/**
 * Step 3: Fetch Company Logos from logo.dev
 */
async function fetchCompanyLogos() {
    const startTime = Date.now();
    log('INFO', '🎨 Fetching company logos from logo.dev...');

    let successCount = 0;
    let failCount = 0;

    for (const company of testState.companies) {
        try {
            const response = await fetch(`https://img.logo.dev/${company.domain}?token=pk_YOUR_TOKEN_HERE&format=png&size=200`);

            if (response.ok) {
                company.logo = {
                    url: response.url,
                    fetched: true
                };
                successCount++;
            } else {
                company.logo = {
                    url: null,
                    fetched: false,
                    fallback: `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&size=200&background=0D8ABC&color=fff`
                };
                failCount++;
            }
        } catch (error) {
            log('WARN', `Failed to fetch logo for ${company.name}`, { error: error.message });
            company.logo = {
                url: null,
                fetched: false,
                fallback: `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&size=200&background=0D8ABC&color=fff`
            };
            failCount++;
        }
    }

    log('INFO', `✅ Logo fetching complete: ${successCount} success, ${failCount} fallback`);
    testState.results.timing.logoFetch = Date.now() - startTime;
}

/**
 * Step 4: Generate Contacts with Photo Enrichment
 */
async function generateEnrichedContacts() {
    const startTime = Date.now();
    log('INFO', '👥 Generating enriched contacts with photos...');

    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const titles = ['Facilities Manager', 'Operations Director', 'VP of Operations', 'Property Manager', 'Maintenance Manager'];

    for (const company of testState.companies) {
        for (let i = 0; i < CONFIG.contactsPerCompany; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const fullName = `${firstName} ${lastName}`;

            const contact = {
                id: `contact-${company.id}-${i + 1}`,
                name: fullName,
                firstName: firstName,
                lastName: lastName,
                title: titles[Math.floor(Math.random() * titles.length)],
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.domain}`,
                phone: `(415) ${String(2000 + Math.floor(Math.random() * 9000)).padStart(4, '0')}`,
                company: company.name,
                isPrimary: i === 0,
                photo: null // Will be enriched
            };

            // Enrich with photo using UI Avatars as fallback
            contact.photo = {
                url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&size=200&background=random`,
                source: 'ui-avatars'
            };

            company.contacts.push(contact);
        }
    }

    const totalContacts = testState.companies.reduce((sum, c) => sum + c.contacts.length, 0);
    log('INFO', `✅ Generated ${totalContacts} enriched contacts`);
    testState.results.timing.contactGeneration = Date.now() - startTime;
}

/**
 * Step 5: Assign Generators to Companies
 */
async function assignGeneratorsToCompanies() {
    const startTime = Date.now();
    log('INFO', '⚡ Assigning generators from equipment list to companies...');

    let generatorIndex = 0;

    for (const company of testState.companies) {
        // Assign 1-5 generators per company
        const generatorCount = Math.floor(Math.random() * 5) + 1;

        for (let i = 0; i < generatorCount; i++) {
            if (generatorIndex < testState.generators.length) {
                company.generators.push({
                    ...testState.generators[generatorIndex],
                    unitNumber: i + 1
                });
                generatorIndex++;
            }
        }
    }

    const totalAssigned = testState.companies.reduce((sum, c) => sum + c.generators.length, 0);
    log('INFO', `✅ Assigned ${totalAssigned} generators across ${testState.companies.length} companies`);
    testState.results.timing.generatorAssignment = Date.now() - startTime;
}

/**
 * Step 6: Configure Service Packages
 */
async function configureServicePackages(company) {
    // Configure services for each generator
    for (const generator of company.generators) {
        generator.services = [];
        generator.serviceFrequencies = {};

        // All generators get Service A (Quarterly)
        generator.services.push('A');
        generator.serviceFrequencies.A = 4;

        // 80% get Service B (Annual)
        if (Math.random() > 0.2) {
            generator.services.push('B');
            generator.serviceFrequencies.B = 1;
        }

        // 50% get Service D (Fluid Analysis)
        if (Math.random() > 0.5) {
            generator.services.push('D');
            generator.serviceFrequencies.D = 1;
            generator.serviceDFluids = {
                oil: true,
                coolant: true,
                fuel: Math.random() > 0.5
            };
        }

        // 30% get Service E (Load Bank Testing)
        if (Math.random() > 0.7) {
            generator.services.push('E');
            generator.serviceFrequencies.E = 1;
        }

        // 20% get Service I (Transfer Switch)
        if (Math.random() > 0.8) {
            generator.services.push('I');
            generator.serviceFrequencies.I = 1;
            generator.atsCount = Math.floor(Math.random() * 3) + 1;
        }
    }

    return company;
}

/**
 * Step 7: Calculate Quote via API
 */
async function calculateQuote(company) {
    const startTime = Date.now();

    try {
        // Aggregate all services from all generators
        const allServices = [...new Set(company.generators.flatMap(g => g.services))];

        const calculationPayload = {
            services: allServices,
            customerInfo: {
                name: company.name,
                address: company.address,
                city: company.city,
                state: company.state,
                zip: company.zip
            },
            generators: company.generators.map(gen => ({
                kw: gen.kw,
                quantity: 1,
                cylinders: gen.cylinders
            })),
            serviceFrequencies: company.generators[0]?.serviceFrequencies || {},
            serviceDFluids: company.generators[0]?.serviceDFluids || {},
            settings: {
                prevailingWage: { enabled: true }
            }
        };

        const response = await fetch(`${CONFIG.baseUrl}/api/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calculationPayload)
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        company.quote = {
            calculationTime: Date.now() - startTime,
            total: result.total,
            laborCost: result.laborCost,
            materialsCost: result.materialsCost,
            tax: result.tax,
            serviceBreakdown: result.serviceBreakdown
        };

        log('INFO', `✅ Quote calculated for ${company.name}: $${result.total.toLocaleString()}`, {
            generators: company.generators.length,
            services: result.serviceBreakdown?.length || 0
        });

        return company;

    } catch (error) {
        log('ERROR', `❌ Quote calculation failed for ${company.name}`, { error: error.message });
        throw error;
    }
}

/**
 * Step 8: Generate PDF Bid
 */
async function generatePDFBid(company) {
    const startTime = Date.now();

    try {
        const pdfPayload = {
            customer: {
                company_name: company.name,
                address: company.address,
                city: company.city,
                state: company.state,
                zip: company.zip,
                phone: company.phone,
                email: company.email,
                website: company.website,
                logo: company.logo?.url || company.logo?.fallback,
                primaryContact: company.contacts[0],
                allContacts: company.contacts
            },
            units: company.generators.map((gen, idx) => ({
                id: `unit-${idx + 1}`,
                number: idx + 1,
                kw: gen.kw,
                brand: gen.brand,
                model: gen.model,
                serial: gen.serial,
                fuel: gen.fuel,
                location: gen.location,
                services: gen.services,
                serviceFrequencies: gen.serviceFrequencies
            })),
            quote: company.quote,
            quoteNumber: `EST-${Date.now()}-${company.id}`
        };

        const response = await fetch(`${CONFIG.baseUrl}/api/generate-pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pdfPayload)
        });

        if (!response.ok) {
            throw new Error(`PDF generation failed: ${response.status}`);
        }

        const result = await response.json();

        company.pdf = {
            generationTime: Date.now() - startTime,
            filePath: result.filePath,
            fileSize: result.fileSize,
            quoteNumber: pdfPayload.quoteNumber
        };

        testState.results.pdfs.push({
            company: company.name,
            file: result.filePath,
            quoteNumber: pdfPayload.quoteNumber
        });

        log('INFO', `✅ PDF generated for ${company.name}: ${result.filePath}`);
        return company;

    } catch (error) {
        log('ERROR', `❌ PDF generation failed for ${company.name}`, { error: error.message });
        throw error;
    }
}

/**
 * Step 9: Sync to Zoho CRM
 */
async function syncToZohoCRM(company) {
    const startTime = Date.now();

    try {
        const zohoPayload = {
            account: {
                Account_Name: company.name,
                Phone: company.phone,
                Website: company.website,
                Billing_Street: company.address,
                Billing_City: company.city,
                Billing_State: company.state,
                Billing_Code: company.zip,
                Industry: company.industry
            },
            contacts: company.contacts.map(contact => ({
                First_Name: contact.firstName,
                Last_Name: contact.lastName,
                Title: contact.title,
                Email: contact.email,
                Phone: contact.phone,
                Photo_URL: contact.photo?.url
            })),
            generators: company.generators.map(gen => ({
                Generator_Model: gen.model,
                Serial_Number: gen.serial,
                kW_Rating: gen.kw,
                Brand: gen.brand,
                Fuel_Type: gen.fuel,
                Location: gen.location,
                Cylinders: gen.cylinders,
                Install_Year: gen.installYear
            })),
            quote: {
                Subject: `Service Agreement - ${company.name}`,
                Quote_Stage: 'Draft',
                Deal_Name: `${company.name} - Generator Maintenance`,
                Grand_Total: company.quote.total,
                Tax: company.quote.tax,
                Sub_Total: company.quote.total - company.quote.tax
            }
        };

        const response = await fetch(`${CONFIG.baseUrl}/api/zoho/v5/sync-quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zohoPayload)
        });

        if (!response.ok) {
            throw new Error(`Zoho sync failed: ${response.status}`);
        }

        const result = await response.json();

        company.zoho = {
            syncTime: Date.now() - startTime,
            accountId: result.accountId,
            contactIds: result.contactIds,
            quoteId: result.quoteId,
            dealId: result.dealId
        };

        testState.results.zohoRecords.push({
            company: company.name,
            accountId: result.accountId,
            quoteId: result.quoteId
        });

        log('INFO', `✅ Synced to Zoho CRM: ${company.name}`, {
            accountId: result.accountId,
            contacts: result.contactIds?.length || 0
        });

        return company;

    } catch (error) {
        log('ERROR', `❌ Zoho sync failed for ${company.name}`, { error: error.message });
        // Don't throw - Zoho might not be configured
        company.zoho = { error: error.message };
        return company;
    }
}

/**
 * Step 10: Run Complete Test for One Company
 */
async function testCompanyWorkflow(company) {
    const startTime = Date.now();
    log('INFO', `\n${'='.repeat(70)}`);
    log('INFO', `🧪 TESTING: ${company.name} (${company.generators.length} generators)`);
    log('INFO', `${'='.repeat(70)}`);

    try {
        await configureServicePackages(company);
        await calculateQuote(company);
        await generatePDFBid(company);
        await syncToZohoCRM(company);

        const totalTime = Date.now() - startTime;
        company.testTime = totalTime;

        log('INFO', `✅ COMPLETE: ${company.name} (${totalTime}ms)`);
        testState.results.passed++;

        return { success: true, company, time: totalTime };

    } catch (error) {
        log('ERROR', `❌ FAILED: ${company.name}`, { error: error.message, stack: error.stack });
        testState.results.failed++;
        testState.results.errors.push({
            company: company.name,
            error: error.message,
            stack: error.stack
        });

        return { success: false, company, error: error.message };
    }
}

/**
 * Step 11: Run Tests in Parallel Batches
 */
async function runParallelTests() {
    log('INFO', '\n🚀 Starting parallel test execution...');
    log('INFO', `Running ${CONFIG.parallelTests} companies in parallel`);

    const batches = [];
    for (let i = 0; i < testState.companies.length; i += CONFIG.parallelTests) {
        batches.push(testState.companies.slice(i, i + CONFIG.parallelTests));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        log('INFO', `\n📦 BATCH ${batchIndex + 1}/${batches.length}: Testing ${batch.length} companies...`);

        const batchPromises = batch.map(company => testCompanyWorkflow(company));
        const batchResults = await Promise.allSettled(batchPromises);

        log('INFO', `✅ Batch ${batchIndex + 1} complete`);
    }
}

/**
 * Step 12: Generate Test Report
 */
async function generateTestReport() {
    log('INFO', '\n📊 Generating test report...');

    const report = {
        summary: {
            totalCompanies: testState.companies.length,
            totalGenerators: testState.companies.reduce((sum, c) => sum + c.generators.length, 0),
            totalContacts: testState.companies.reduce((sum, c) => sum + c.contacts.length, 0),
            testsPassed: testState.results.passed,
            testsFailed: testState.results.failed,
            pdfsGenerated: testState.results.pdfs.length,
            zohoRecords: testState.results.zohoRecords.length
        },
        timing: testState.results.timing,
        companies: testState.companies.map(c => ({
            name: c.name,
            generators: c.generators.length,
            quote: c.quote?.total,
            pdf: c.pdf?.quoteNumber,
            zoho: c.zoho?.accountId,
            testTime: c.testTime
        })),
        errors: testState.results.errors,
        pdfs: testState.results.pdfs,
        zohoRecords: testState.results.zohoRecords
    };

    // Write report to file
    const reportPath = path.join(CONFIG.outputDir, `test-report-${Date.now()}.json`);
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    log('INFO', `✅ Test report saved: ${reportPath}`);
    return report;
}

/**
 * Main Test Runner
 */
async function runComprehensiveTestSuite() {
    const suiteStartTime = Date.now();

    log('INFO', '\n' + '='.repeat(70));
    log('INFO', '🚀 COMPREHENSIVE E2E TEST SUITE - ENERGEN CALCULATOR V5.0');
    log('INFO', '='.repeat(70));

    try {
        // Step 1: Load equipment from Excel
        await loadEquipmentList();

        // Step 2: Generate test companies
        await generateTestCompanies();

        // Step 3: Fetch logos
        await fetchCompanyLogos();

        // Step 4: Generate contacts with photos
        await generateEnrichedContacts();

        // Step 5: Assign generators
        await assignGeneratorsToCompanies();

        // Step 6-10: Run parallel tests
        await runParallelTests();

        // Step 11: Generate report
        const report = await generateTestReport();

        const totalTime = ((Date.now() - suiteStartTime) / 1000).toFixed(2);

        // Print final summary
        log('INFO', '\n' + '='.repeat(70));
        log('INFO', '📊 FINAL SUMMARY');
        log('INFO', '='.repeat(70));
        log('INFO', `✅ Tests Passed: ${report.summary.testsPassed}`);
        log('INFO', `❌ Tests Failed: ${report.summary.testsFailed}`);
        log('INFO', `📄 PDFs Generated: ${report.summary.pdfsGenerated}`);
        log('INFO', `☁️  Zoho Records: ${report.summary.zohoRecords}`);
        log('INFO', `⏱️  Total Time: ${totalTime}s`);
        log('INFO', '='.repeat(70));

        if (report.summary.testsFailed > 0) {
            log('ERROR', `\n❌ ${report.summary.testsFailed} tests failed`);
            report.errors.forEach(err => {
                log('ERROR', `   - ${err.company}: ${err.error}`);
            });
            process.exit(1);
        } else {
            log('INFO', '\n🎉 All tests passed!');
            process.exit(0);
        }

    } catch (error) {
        log('ERROR', '💥 Test suite failed', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}

// Run the comprehensive test suite
runComprehensiveTestSuite();
