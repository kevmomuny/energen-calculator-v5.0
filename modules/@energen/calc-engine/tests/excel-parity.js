/**
 * Excel Parity Test Suite
 * Verifies calculations match ServiceCalculator.xlsx exactly
 */

import { EnergenCalculationEngine } from '../index.js';
import { LegacyCalculationEngine } from '../adapters/legacy.js';

// Test cases from Excel
const testCases = [
    {
        name: 'Small Generator - Basic Services',
        input: {
            customerInfo: {
                address: '100 Campus Center',
                city: 'Seaside',
                state: 'CA',
                zip: '93955'
            },
            generators: [{
                kw: 30,
                quantity: 1
            }],
            services: ['A', 'B'],
            contractLength: 12,
            facilityType: 'commercial'
        },
        expected: {
            serviceA: {
                laborHours: 1,
                travelHours: 1.5
            },
            serviceB: {
                laborHours: 1,
                travelHours: 2,
                filterCost: 171.90,
                oilGallons: 3  // From Excel: 15-30kW = 3 gallons
            }
        }
    },
    {
        name: 'Medium Generator - All Fluids',
        input: {
            customerInfo: {
                address: '1520 Sheridan Ave',
                city: 'North Highlands',
                state: 'CA',
                zip: '95660'
            },
            generators: [{
                kw: 250,
                quantity: 1
            }],
            services: ['B', 'C'],
            contractLength: 12,
            facilityType: 'commercial'
        },
        expected: {
            serviceB: {
                laborHours: 2,
                travelHours: 2,
                filterCost: 229.20,
                oilGallons: 8  // From Excel: 155-250kW = 8 gallons
            },
            serviceC: {
                laborHours: 3,
                travelHours: 2,
                coolantGallons: 12,
                hosesBelts: 300
            }
        }
    },
    {
        name: 'Large Generator - Load Bank',
        input: {
            customerInfo: {
                address: '123 Industrial Way',
                city: 'Sacramento',
                state: 'CA',
                zip: '95814'
            },
            generators: [{
                kw: 750,
                quantity: 1
            }],
            services: ['E'],
            contractLength: 12,
            facilityType: 'commercial'
        },
        expected: {
            serviceE: {
                laborHours: 8,
                travelHours: 2,
                loadBankRental: 1500,
                transformerRental: 1500
            }
        }
    },
    {
        name: 'Diesel Tune-Up - 6 Cylinder',
        input: {
            customerInfo: {
                address: '456 Fleet St',
                city: 'Oakland',
                state: 'CA',
                zip: '94612'
            },
            generators: [{
                kw: 150,
                quantity: 1,
                cylinders: 6,
                injectorType: 'pop'
            }],
            services: ['F'],
            contractLength: 12,
            facilityType: 'commercial'
        },
        expected: {
            serviceF: {
                laborHours: 3,
                travelHours: 2,
                parts: 350
            }
        }
    },
    {
        name: 'Multiple Units - Quarterly Service',
        input: {
            customerInfo: {
                address: '789 Data Center Blvd',
                city: 'San Jose',
                state: 'CA',
                zip: '95110'
            },
            generators: [{
                kw: 500,
                quantity: 3
            }],
            services: ['A'],
            contractLength: 12,
            facilityType: 'commercial'
        },
        expected: {
            serviceA: {
                laborHours: 2.5,
                travelHours: 1.5,
                frequency: 4 // Quarterly
            }
        }
    }
];

/**
 * Run all parity tests
 */
async function runParityTests() {

    console.log(`Testing against ServiceCalculator.xlsx (Aug 13, 2024)\n`);
    
    const engine = new EnergenCalculationEngine({
        enableCache: false, // Disable cache for testing
        enableAudit: true
    });
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {

        console.log('─'.repeat(40));
        
        try {
            const result = await engine.calculate(testCase.input);
            
            // Verify service definitions match
            let testPassed = true;
            const errors = [];
            
            // Check each expected service
            for (const [serviceCode, expected] of Object.entries(testCase.expected)) {
                const serviceKey = serviceCode.replace('service', '').toUpperCase();
                const serviceResult = result.calculation.services.find(s => s.serviceCode === serviceKey);
                
                if (!serviceResult) {
                    errors.push(`Service ${serviceKey} not found in results`);
                    testPassed = false;
                    continue;
                }
                
                // Check labor hours
                if (expected.laborHours !== undefined) {
                    const actualLabor = serviceResult.details.laborHours;
                    if (Math.abs(actualLabor - expected.laborHours) > 0.01) {
                        errors.push(`Labor hours mismatch for ${serviceKey}: expected ${expected.laborHours}, got ${actualLabor}`);
                        testPassed = false;
                    }
                }
                
                // Check travel hours
                if (expected.travelHours !== undefined) {
                    const actualTravel = serviceResult.details.travelHours;
                    if (Math.abs(actualTravel - expected.travelHours) > 0.01) {
                        errors.push(`Travel hours mismatch for ${serviceKey}: expected ${expected.travelHours}, got ${actualTravel}`);
                        testPassed = false;
                    }
                }
                
                // Check oil gallons
                if (expected.oilGallons !== undefined) {
                    const actualOil = serviceResult.details.oilGallons;
                    if (Math.abs(actualOil - expected.oilGallons) > 0.01) {
                        errors.push(`Oil gallons mismatch for ${serviceKey}: expected ${expected.oilGallons}, got ${actualOil}`);
                        testPassed = false;
                    }
                }
                
                // Check coolant gallons
                if (expected.coolantGallons !== undefined) {
                    const actualCoolant = serviceResult.details.coolantGallons;
                    if (Math.abs(actualCoolant - expected.coolantGallons) > 0.01) {
                        errors.push(`Coolant gallons mismatch for ${serviceKey}: expected ${expected.coolantGallons}, got ${actualCoolant}`);
                        testPassed = false;
                    }
                }
            }
            
            if (testPassed) {

                passed++;
            } else {

                errors.forEach(err => console.log(`   - ${err}`));
                failed++;
            }
            
        } catch (error) {

            failed++;
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));

    console.log('─'.repeat(50));

    console.log(`Success Rate: ${(passed / testCases.length * 100).toFixed(1)}%`);
    
    if (failed === 0) {

    } else {

    }
    
    return failed === 0;
}

/**
 * Compare with legacy engine
 */
async function compareLegacy() {

    const newEngine = new EnergenCalculationEngine();
    const legacyEngine = new LegacyCalculationEngine();
    
    const testPayload = {
        customerInfo: {
            address: '100 Test St',
            city: 'Sacramento',
            state: 'CA',
            zip: '95814'
        },
        generators: [{
            kw: 150,
            quantity: 1
        }],
        services: ['A', 'B', 'C'],
        contractLength: 12,
        facilityType: 'commercial'
    };

    const newResult = await newEngine.calculate(testPayload);

    const legacyResult = await legacyEngine.calculate(testPayload);
    
    // Compare totals
    const newTotal = parseFloat(newResult.calculation.total);
    const legacyTotal = parseFloat(legacyResult.calculation.total);
    
    console.log(`\nNew Engine Total: $${newTotal.toFixed(2)}`);
    console.log(`Legacy Engine Total: $${legacyTotal.toFixed(2)}`);
    
    const difference = Math.abs(newTotal - legacyTotal);
    if (difference < 0.01) {

    } else {
        console.log(`⚠️ Difference: $${difference.toFixed(2)}`);
    }
}

// Run tests

const success = await runParityTests();
await compareLegacy();

// Exit with appropriate code
process.exit(success ? 0 : 1);