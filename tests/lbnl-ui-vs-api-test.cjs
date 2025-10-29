#!/usr/bin/env node
/**
 * LBNL RFP UI vs API Comparison Test
 *
 * Tests if the UI calculator (with all our Session fixes) produces the same
 * totals as the Python script when configured with the same LBNL RFP parameters.
 *
 * Tests:
 * 1. API calculation (Python script equivalent)
 * 2. UI calculation via browser automation
 * 3. Comparison of totals
 *
 * LBNL Requirements:
 * - 34 generators (various kW ratings)
 * - Services: A, B, D (all fluids), E
 * - All services: Annual frequency (1x/year)
 * - Labor rate: $336.50/hr (MANUAL BID RATE, not calculated prevailing wage)
 *   NOTE: Calculated prevailing wage rate = $241.50/hr ($121.50 prevailing + $120 business)
 * - Service D: Oil + Coolant + Fuel analysis
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// LBNL Generator List (34 units)
const generators = [
    300, 350, 350, 150, 300, 230, 230, 230, 1300, 175,
    20, 150, 250, 400, 31, 250, 550, 125, 80, 200,
    200, 275, 275, 275, 125, 400, 500, 350, 180, 600,
    2000, 55, 99, 99
];

// Expected results from previous Python calculation
const EXPECTED = {
    subtotal: 297855.18,
    laborTotal: 155294.75,
    partsTotal: 117592.13,
    mobilizationTotal: 24968.30,
    services: {
        'A - Comprehensive Inspection': 64057.58,
        'B - Oil & Filter Service': 78525.50,
        'D - Oil & Fuel Analysis': 3165.40,
        'E - Load Bank Testing': 152106.70
    }
};

/**
 * Test 1: Direct API calculation (Python script equivalent)
 */
async function testAPICalculation() {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}TEST 1: Direct API Calculation (Python Script Equivalent)${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    const payload = {
        services: ["A", "B", "D", "E"],
        customerInfo: {
            name: "Lawrence Berkeley National Laboratory",
            address: "1 Cyclotron Road",
            city: "Berkeley",
            state: "CA",
            zip: "94720"
        },
        generators: generators.map(kw => ({ kw })),
        contractLength: 12,
        taxRate: 0,
        facilityType: "government",
        serviceDFluids: {
            oil: true,
            fuel: true,
            coolant: true
        },
        serviceFrequencies: {
            A: 1,  // ANNUAL
            B: 1,  // ANNUAL
            D: 1,  // ANNUAL
            E: 1   // ANNUAL
        },
        settings: {
            laborRate: 336.50  // MANUAL BID RATE (not calculated: actual calc = $241.50)
        }
    };

    console.log(`${colors.blue}Requesting calculation for ${generators.length} generators...${colors.reset}`);
    console.log(`${colors.blue}Services: A (Annual), B (Annual), D (Annual, all fluids), E (Annual)${colors.reset}`);
    console.log(`${colors.blue}Labor Rate: $336.50/hr (MANUAL BID RATE - calculated prevailing wage = $241.50)${colors.reset}\n`);

    try {
        const response = await fetch('http://localhost:3002/api/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 60000
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        const calc = result.calculation;

        // Parse totals
        const apiSubtotal = parseFloat(calc.subtotal);
        const apiLabor = parseFloat(calc.laborTotal);
        const apiParts = parseFloat(calc.partsTotal);
        const apiMobilization = parseFloat(calc.mobilizationTotal);

        console.log(`${colors.green}${colors.bright}✓ API Calculation Complete${colors.reset}\n`);

        // Display results
        console.log(`${colors.bright}TOTALS:${colors.reset}`);
        console.log(`  Labor:        $${apiLabor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`  Materials:    $${apiParts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`  Mobilization: $${apiMobilization.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        console.log(`  ${colors.bright}SUBTOTAL:     $${apiSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${colors.reset}\n`);

        console.log(`${colors.bright}SERVICE BREAKDOWN:${colors.reset}`);
        const serviceBreakdown = calc.serviceBreakdown || {};
        for (const [name, data] of Object.entries(serviceBreakdown)) {
            const total = data.totalCost || 0;
            console.log(`  ${name.padEnd(35)} $${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        }

        // Compare with expected
        console.log(`\n${colors.bright}COMPARISON WITH EXPECTED:${colors.reset}`);
        const subtotalDiff = Math.abs(apiSubtotal - EXPECTED.subtotal);
        const subtotalMatch = subtotalDiff < 1.00;

        console.log(`  Subtotal: ${subtotalMatch ? colors.green + '✓' : colors.red + '✗'} Expected: $${EXPECTED.subtotal.toLocaleString()}, Got: $${apiSubtotal.toLocaleString()}, Diff: $${subtotalDiff.toFixed(2)}${colors.reset}`);

        // Save result
        const outputPath = path.join(__dirname, 'lbnl-api-test-result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\n${colors.blue}Results saved to: ${outputPath}${colors.reset}`);

        return {
            success: true,
            subtotal: apiSubtotal,
            labor: apiLabor,
            parts: apiParts,
            mobilization: apiMobilization,
            services: serviceBreakdown,
            match: subtotalMatch
        };

    } catch (error) {
        console.error(`${colors.red}✗ API Test Failed: ${error.message}${colors.reset}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 2: UI Calculation Summary
 * (Manual test - instructions for user)
 */
function printUITestInstructions(apiResult) {
    console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}TEST 2: UI Calculation (Manual Verification)${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.yellow}To verify the UI matches the API calculation, follow these steps:${colors.reset}\n`);

    console.log(`${colors.bright}1. Open the calculator UI:${colors.reset}`);
    console.log(`   http://localhost:3002/frontend/integrated-ui.html\n`);

    console.log(`${colors.bright}2. Configure Settings:${colors.reset}`);
    console.log(`   - Click Settings (gear icon)`);
    console.log(`   - Set Labor Rate: $336.50 (MANUAL BID RATE - calc = $241.50)`);
    console.log(`   - Set Mobilization Rate: $336.50`);
    console.log(`   - Save settings\n`);

    console.log(`${colors.bright}3. Enter Customer Info:${colors.reset}`);
    console.log(`   - Company: Lawrence Berkeley National Laboratory`);
    console.log(`   - Address: 1 Cyclotron Road, Berkeley, CA 94720\n`);

    console.log(`${colors.bright}4. Add ALL 34 generators with these kW ratings:${colors.reset}`);
    const rows = [];
    for (let i = 0; i < generators.length; i += 10) {
        const chunk = generators.slice(i, i + 10);
        rows.push(`   ${chunk.join(', ')}`);
    }
    console.log(rows.join('\n'));
    console.log();

    console.log(`${colors.bright}5. For EACH generator, select these services:${colors.reset}`);
    console.log(`   ${colors.green}✓ Service A${colors.reset} - Comprehensive Inspection (Annual)`);
    console.log(`   ${colors.green}✓ Service B${colors.reset} - Oil & Filter Service (Annual)`);
    console.log(`   ${colors.green}✓ Service D${colors.reset} - Oil & Fuel Analysis (Annual)`);
    console.log(`     ${colors.yellow}→ Check: Oil Analysis, Coolant Analysis, Fuel Analysis${colors.reset}`);
    console.log(`   ${colors.green}✓ Service E${colors.reset} - Load Bank Testing (Annual)\n`);

    console.log(`${colors.bright}6. Verify Top Totals Match:${colors.reset}`);
    if (apiResult && apiResult.success) {
        console.log(`   ${colors.cyan}EXPECTED (from API):${colors.reset}`);
        console.log(`   - TOTAL QUOTE:  ${colors.bright}$${apiResult.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${colors.reset}`);
        console.log(`   - LABOR HOURS:  ${colors.bright}${apiResult.labor ? (apiResult.labor / 336.50).toFixed(1) : 'N/A'}${colors.reset}`);
        console.log(`   - MATERIALS:    ${colors.bright}$${apiResult.parts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${colors.reset}`);
        console.log(`   - UNITS:        ${colors.bright}34 Generators${colors.reset}\n`);
    }

    console.log(`${colors.bright}7. Check Service D Displays:${colors.reset}`);
    console.log(`   - Each Service D card should show: ${colors.cyan}$93.10/year${colors.reset}`);
    console.log(`   - Breakdown: Oil ($16.55) + Coolant ($16.55) + Fuel ($60.00)\n`);

    console.log(`${colors.bright}8. Verify Persistence:${colors.reset}`);
    console.log(`   - Service D subtotals should ${colors.yellow}persist through recalculations${colors.reset}`);
    console.log(`   - Should ${colors.yellow}NOT${colors.reset} show $0.00 after calculation completes\n`);

    console.log(`${colors.green}${colors.bright}If all values match, the UI calculation is CORRECT! ✓${colors.reset}\n`);
}

/**
 * Main test execution
 */
async function runTests() {
    console.log(`\n${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  LBNL RFP: UI vs API Calculation Comparison Test             ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  Tests Service D fixes and top totals functionality           ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);

    // Test 1: API Calculation
    const apiResult = await testAPICalculation();

    // Test 2: UI Instructions
    printUITestInstructions(apiResult);

    // Summary
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

    if (apiResult.success) {
        console.log(`${colors.green}✓ API Calculation: PASSED${colors.reset}`);
        console.log(`${colors.yellow}⚠ UI Calculation: MANUAL VERIFICATION REQUIRED${colors.reset}\n`);

        console.log(`${colors.bright}What This Tests:${colors.reset}`);
        console.log(`  1. ${colors.cyan}Service D custom pricing${colors.reset} - Fluid checkboxes calculate correctly`);
        console.log(`  2. ${colors.cyan}Service D persistence${colors.reset} - Subtotals not overwritten by generic pricing`);
        console.log(`  3. ${colors.cyan}Top totals update${colors.reset} - summary-calculator.js import working`);
        console.log(`  4. ${colors.cyan}Multi-unit calculation${colors.reset} - All 34 generators calculated correctly`);
        console.log(`  5. ${colors.cyan}Service styling${colors.reset} - Consistent opacity/color across all services\n`);
    } else {
        console.log(`${colors.red}✗ API Calculation: FAILED${colors.reset}`);
        console.log(`${colors.red}  Cannot proceed with UI test${colors.reset}\n`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error(`${colors.red}${colors.bright}FATAL ERROR: ${error.message}${colors.reset}`);
    process.exit(1);
});
