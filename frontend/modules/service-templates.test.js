/**
 * Service Templates Test Suite
 * Validates the unified template system
 */

import { renderServiceCard } from './service-templates.js';

// Mock SERVICES definition for testing
const SERVICES = {
    'A': { name: 'A-Comprehensive Inspection', description: 'Complete system inspection', defaultFreq: 4 },
    'B': { name: 'B-Oil & Filter Service', description: 'Oil change and filters', defaultFreq: 1 },
    'D': { name: 'D-Oil & Fuel Analysis', description: 'Laboratory testing', defaultFreq: 1 },
    'F': { name: 'F-Diesel Engine Tune-Up', description: 'Diesel engine optimization', defaultFreq: 0, fuelType: 'Diesel' },
    'G': { name: 'G-Gas Engine Tune-Up', description: 'Gas engine optimization', defaultFreq: 0, fuelType: 'Natural Gas' },
    'H': { name: 'H-Electrical Testing', description: 'Generator electrical testing (5 year)', defaultFreq: 0 },
    'K': { name: 'K-Battery Replacement', description: 'Battery maintenance and replacement', defaultFreq: 0 },
    'CUSTOM': { name: 'Custom Service/Parts', description: 'Additional services or parts', defaultFreq: 1, isCustom: true }
};

// Mock unit objects
const mockUnitWithKw = {
    id: 'unit-1',
    kw: 100,
    brand: 'Generac',
    fuel: 'Natural Gas'
};

const mockUnitWithoutKw = {
    id: 'unit-2',
    kw: 0,
    brand: '',
    fuel: ''
};

// Test counter
let testsPassed = 0;
let testsFailed = 0;

/**
 * Test helper
 */
function test(name, testFn) {
    try {
        testFn();
        console.log(`✓ PASS: ${name}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ FAIL: ${name}`);
        console.error(`  Error: ${error.message}`);
        testsFailed++;
    }
}

/**
 * Assert helper
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// ===== TEST SUITE =====

console.log('\n=== Service Templates Test Suite ===\n');

// Test 1: Service A renders with quarterly frequency
test('Service A renders with quarterly frequency (default)', () => {
    const html = renderServiceCard('A', SERVICES['A'], mockUnitWithKw);

    assert(!html.includes('${'), 'No template variables in output');
    assert(html.includes('service-card'), 'Has service-card class');
    assert(html.includes('A-Comprehensive Inspection'), 'Has service name');
    assert(html.includes('Complete system inspection'), 'Has description');
    assert(html.includes('Quarterly'), 'Has Quarterly button');
    assert(html.includes('Semi-Annual'), 'Has Semi-Annual button');
    assert(html.includes('Annual'), 'Has Annual button');
    assert(html.includes('class="frequency-btn active"'), 'Has active button');
});

// Test 2: Service D renders with fluid checkboxes
test('Service D renders with fluid analysis checkboxes', () => {
    const html = renderServiceCard('D', SERVICES['D'], mockUnitWithKw);

    assert(html.includes('service-D'), 'Has service-D ID');
    assert(html.includes('Oil Analysis'), 'Has oil checkbox');
    assert(html.includes('Coolant Analysis'), 'Has coolant checkbox');
    assert(html.includes('Fuel Analysis'), 'Has fuel checkbox');
    assert(html.includes('type="checkbox"'), 'Has checkbox inputs');
    assert(html.includes('$16.55'), 'Has fluid prices'); // Default price
});

// Test 3: Service H renders with 5-year checkbox
test('Service H renders with 5-year electrical testing checkbox', () => {
    const html = renderServiceCard('H', SERVICES['H'], mockUnitWithKw);

    assert(html.includes('service-H'), 'Has service-H ID');
    assert(html.includes('Include 5-Year Electrical Testing'), 'Has checkbox label');
    assert(html.includes('type="checkbox"'), 'Has checkbox input');
    assert(html.includes('Every 5 Years'), 'Has price text');
    assert(!html.includes('frequency-selector'), 'No frequency selector');
});

// Test 4: Service F/G renders with Not Included toggle
test('Service F renders with Not Included/Add Service toggle', () => {
    const html = renderServiceCard('F', SERVICES['F'], mockUnitWithKw);

    assert(html.includes('service-F'), 'Has service-F ID');
    assert(html.includes('Not Included'), 'Has Not Included button');
    assert(html.includes('Add Service'), 'Has Add Service button');
    assert(html.includes('data-fuel-type="Diesel"'), 'Has fuel type');
    assert(html.includes('By Recommendation'), 'Has recommendation text');
});

// Test 5: CUSTOM service renders with input fields
test('CUSTOM service renders with parts/labor inputs', () => {
    const html = renderServiceCard('CUSTOM', SERVICES['CUSTOM'], mockUnitWithKw);

    assert(html.includes('service-CUSTOM'), 'Has service-CUSTOM ID');
    assert(html.includes('custom-description'), 'Has description input');
    assert(html.includes('custom-parts'), 'Has parts input');
    assert(html.includes('custom-labor'), 'Has labor input');
    assert(html.includes('type="number"'), 'Has number inputs');
    assert(html.includes('Parts Cost'), 'Has parts label');
    assert(html.includes('Labor Hours'), 'Has labor label');
});

// Test 6: Service K renders without frequency selector
test('Service K renders without frequency selector', () => {
    const html = renderServiceCard('K', SERVICES['K'], mockUnitWithKw);

    assert(html.includes('service-K'), 'Has service-K ID');
    assert(html.includes('K-Battery Replacement'), 'Has service name');
    assert(!html.includes('frequency-selector'), 'No frequency selector');
    assert(html.includes('Select to add'), 'Has price text');
});

// Test 7: Services disabled when kW is 0
test('Services are disabled when unit has no kW', () => {
    const html = renderServiceCard('A', SERVICES['A'], mockUnitWithoutKw);

    assert(html.includes('Enter kW first'), 'Shows kW required message');
    assert(html.includes('opacity: 0.5'), 'Has disabled styling');
    assert(html.includes('pointer-events: none'), 'Has pointer events disabled');
});

// Test 8: No template literal syntax in output
test('No template literal syntax appears in rendered output', () => {
    const services = ['A', 'D', 'H', 'F', 'CUSTOM', 'K'];

    services.forEach(code => {
        const html = renderServiceCard(code, SERVICES[code], mockUnitWithKw);
        assert(!html.includes('${'), `Service ${code} has no template variables`);
        assert(!html.includes('undefined'), `Service ${code} has no undefined values`);
    });
});

// Test 9: All service cards have required elements
test('All service cards have required structural elements', () => {
    const html = renderServiceCard('B', SERVICES['B'], mockUnitWithKw);

    assert(html.includes('class="service-card"'), 'Has service-card class');
    assert(html.includes('class="service-name"'), 'Has service-name');
    assert(html.includes('class="service-price"'), 'Has service-price');
    assert(html.includes('id="unit-1-service-B-price"'), 'Has price ID');
    assert(html.includes('id="unit-1-service-B-breakdown"'), 'Has breakdown ID');
});

// Test 10: Frequency buttons have correct onclick handlers
test('Frequency buttons have correct onclick handlers', () => {
    const html = renderServiceCard('A', SERVICES['A'], mockUnitWithKw);

    assert(html.includes('onclick="setFrequency'), 'Has setFrequency function');
    assert(html.includes("'unit-1'"), 'Has unit ID parameter');
    assert(html.includes("'A'"), 'Has service code parameter');
    assert(html.includes('data-freq="4"'), 'Has quarterly freq');
    assert(html.includes('data-freq="2"'), 'Has semi-annual freq');
    assert(html.includes('data-freq="1"'), 'Has annual freq');
});

// ===== SUMMARY =====

console.log('\n=== Test Summary ===');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed === 0) {
    console.log('\n✓ All tests passed!');
} else {
    console.log('\n✗ Some tests failed. Please review above.');
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { test, assert, SERVICES };
}
