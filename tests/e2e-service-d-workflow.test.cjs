/**
 * E2E Test: Service D (Fluid Analysis) Complete Workflow
 * =======================================================
 *
 * This test validates the ENTIRE Service D workflow from UI to calculation to quote creation.
 * It catches regressions like:
 * - Missing module imports
 * - Function naming conflicts
 * - Missing UI fields (contact name, etc.)
 * - API endpoint mismatches
 * - Checkbox state synchronization issues
 * - Pricing calculation errors
 *
 * Run with: node tests/e2e-service-d-workflow.test.cjs
 */

const assert = require('assert');
const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3002';
const TIMEOUT = 30000;

// Test state
let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

/**
 * Test utilities
 */
async function testCase(name, fn) {
    try {
        console.log(`\n🧪 TEST: ${name}`);
        await fn();
        testResults.passed++;
        console.log(`✅ PASS: ${name}`);
    } catch (error) {
        testResults.failed++;
        testResults.errors.push({ name, error: error.message, stack: error.stack });
        console.error(`❌ FAIL: ${name}`);
        console.error(`   Error: ${error.message}`);
    }
}

function assertEquals(actual, expected, message) {
    assert.strictEqual(actual, expected, message || `Expected ${expected}, got ${actual}`);
}

function assertTrue(condition, message) {
    assert.ok(condition, message || 'Condition is not true');
}

function assertNotNull(value, message) {
    assert.ok(value !== null && value !== undefined, message || 'Value is null or undefined');
}

/**
 * Test 1: Page loads successfully
 */
async function testPageLoads() {
    const response = await fetch(`${BASE_URL}/frontend/integrated-ui.html`);
    assertEquals(response.status, 200, 'Page should load with 200 status');

    const html = await response.text();
    assertTrue(html.includes('Energen Calculator'), 'Page should contain "Energen Calculator"');
}

/**
 * Test 2: Required UI fields exist
 */
async function testRequiredUIFieldsExist() {
    const response = await fetch(`${BASE_URL}/frontend/integrated-ui.html`);
    const html = await response.text();

    // Critical fields that must exist
    const requiredFields = [
        'id="companyName"',
        'id="primaryContactName"',  // THIS WAS MISSING - regression test!
        'id="primaryEmail"',
        'id="primaryPhone"',
        'id="phone"',
        'id="email"',
        'id="address"',
        'id="city"',
        'id="state"',
        'id="zip"'
    ];

    for (const field of requiredFields) {
        assertTrue(
            html.includes(field),
            `Required field ${field} must exist in HTML`
        );
    }
}

/**
 * Test 3: Service D module is imported
 */
async function testServiceDModuleImported() {
    const response = await fetch(`${BASE_URL}/frontend/integrated-ui.html`);
    const html = await response.text();

    assertTrue(
        html.includes('./modules/service-d-fluids.js'),
        'Service D module must be imported in HTML'
    );

    assertTrue(
        html.includes('window.updateServiceDFluids'),
        'Service D function must be exposed to window'
    );
}

/**
 * Test 4: Service D API endpoint exists
 */
async function testServiceDCalculationAPI() {
    // Test that the calculation API accepts Service D
    const testPayload = {
        kw: 125,
        services: ['D'],
        serviceDFluids: {
            oil: true,
            coolant: true,
            fuel: true
        },
        settings: {
            oilAnalysisCost: 16.55,
            coolantAnalysisCost: 16.55,
            fuelAnalysisCost: 60
        }
    };

    const response = await fetch(`${BASE_URL}/api/pricing/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
    });

    assertEquals(response.status, 200, 'Pricing API should respond with 200');

    const result = await response.json();
    assertNotNull(result.prices, 'Response should include prices array');

    // Find Service D in response
    const serviceD = result.prices.find(s => s.serviceCode === 'D');
    assertNotNull(serviceD, 'Service D should be in pricing response');

    // Verify pricing calculation
    const expectedTotal = 16.55 + 16.55 + 60; // 93.10
    assertTrue(
        Math.abs(serviceD.partsCost - expectedTotal) < 0.5,
        `Service D should calculate $93.10, got $${serviceD.partsCost}`
    );
}

/**
 * Test 5: Quote save endpoint exists (not /api/quotes which returns 404!)
 */
async function testQuoteSaveEndpointExists() {
    // This test ensures we don't regress to using /api/quotes (which doesn't exist)
    const testQuoteData = {
        customer: {
            company_name: 'Test Company',
            email: 'test@example.com',
            phone: '555-1234'
        },
        generators: [
            {
                kw: 125,
                services: ['D']
            }
        ],
        pricing: {
            total: 93
        }
    };

    // CORRECT endpoint is /api/save-quote (NOT /api/quotes)
    const response = await fetch(`${BASE_URL}/api/save-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testQuoteData)
    });

    // Should NOT be 404
    assertTrue(
        response.status !== 404,
        '/api/save-quote endpoint must exist (not 404)'
    );
}

/**
 * Test 6: Zoho sync endpoint exists
 */
async function testZohoSyncEndpointExists() {
    // Test that Zoho sync endpoint is available
    const response = await fetch(`${BASE_URL}/api/zoho/v5/sync-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteData: { test: true },
            zohoAccount: { id: 'test' }
        })
    });

    // Should NOT be 404 (endpoint exists)
    assertTrue(
        response.status !== 404,
        'Zoho sync endpoint must exist (not 404)'
    );
}

/**
 * Test 7: Service D checkbox structure in HTML
 */
async function testServiceDCheckboxStructure() {
    const response = await fetch(`${BASE_URL}/frontend/integrated-ui.html`);
    const html = await response.text();

    // Verify checkboxes have required attributes
    assertTrue(
        html.includes('id="${unitId}-service-D-oil"'),
        'Service D oil checkbox must have correct ID pattern'
    );

    assertTrue(
        html.includes('onchange="updateServiceDFluids'),
        'Service D checkboxes must have onchange handler'
    );

    assertTrue(
        html.includes('onclick="event.stopPropagation()"'),
        'Service D checkboxes must stop event propagation'
    );

    assertTrue(
        html.includes('checked'),
        'Service D checkboxes should default to checked'
    );
}

/**
 * Test 8: No conflicting updateServiceDFluids functions
 */
async function testNoConflictingServiceDFunctions() {
    const response = await fetch(`${BASE_URL}/frontend/modules/global-handlers.js`);
    const code = await response.text();

    // Should NOT have the old conflicting function
    const conflictingPattern = /window\.updateServiceDFluids\s*=\s*function/;
    assertTrue(
        !conflictingPattern.test(code),
        'global-handlers.js should NOT define updateServiceDFluids (uses service-d-fluids.js version)'
    );

    // Should have comment explaining why
    assertTrue(
        code.includes('service-d-fluids.js'),
        'Should have comment referencing service-d-fluids.js module'
    );
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('E2E TEST SUITE: Service D Complete Workflow');
    console.log('='.repeat(70));

    const startTime = Date.now();

    // Run all tests
    await testCase('Page loads successfully', testPageLoads);
    await testCase('Required UI fields exist', testRequiredUIFieldsExist);
    await testCase('Service D module is imported', testServiceDModuleImported);
    await testCase('Service D calculation API works', testServiceDCalculationAPI);
    await testCase('Quote save endpoint exists', testQuoteSaveEndpointExists);
    await testCase('Zoho sync endpoint exists', testZohoSyncEndpointExists);
    await testCase('Service D checkbox structure correct', testServiceDCheckboxStructure);
    await testCase('No conflicting Service D functions', testNoConflictingServiceDFunctions);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏱️  Duration: ${duration}s`);

    if (testResults.failed > 0) {
        console.log('\n' + '='.repeat(70));
        console.log('FAILURES:');
        console.log('='.repeat(70));
        testResults.errors.forEach(({ name, error }) => {
            console.log(`\n❌ ${name}`);
            console.log(`   ${error}`);
        });
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
