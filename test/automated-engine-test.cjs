// Automated Backend Calculation Engine Test
// Testing the core calculation logic in isolation

const CalculationEngine = require('../src/api/complete-calculation-engine.cjs');

// Test Harness Function
async function testCalculationEngine() {
    console.log('=== BACKEND CALCULATION ENGINE TEST ===\n');
    
    // Initialize the engine
    const engine = new CalculationEngine();
    
    // Test Input Configuration - Corrected format for the actual API
    const testInput = {
        customerInfo: {
            companyName: "Test Corp",
            phone: "(916) 555-0100",
            address: "123 Industrial Way",
            city: "Sacramento",
            state: "CA",
            zip: "95814"
        },
        generators: [
            {
                kw: 100,
                quantity: 1,
                fuel: "Diesel",
                location: "Main Building"
            }
        ],
        services: ['A', 'B', 'E'],  // Service letters
        contractLength: 12,
        facilityType: 'commercial',
        settings: {}
    };
    
    try {
        // Execute calculation
        console.log('Executing calculation with test input...\n');
        const result = await engine.calculate(testInput);
        
        // Output the result as formatted JSON
        console.log('=== CALCULATION RESULT ===');
        console.log(JSON.stringify(result, null, 2));
        
        // Extract calculation from result
        const calc = result.calculation || result;
        
        // Validate critical values
        console.log('\n=== VALIDATION ===');
        console.log(`Total: ${calc.total} (Expected: 9997.78)`);
        console.log(`Mobilization Savings: ${calc.mobilizationSavings} (Expected: 525.00)`);
        console.log(`Tax: ${calc.tax} (Expected: 447.78)`);
        
        // Check if values match expectations
        const totalMatch = calc.total === "9997.78";
        const mobilizationMatch = calc.mobilizationSavings === "525.00";
        const taxMatch = calc.tax === "447.78";
        
        if (totalMatch && mobilizationMatch && taxMatch) {
            console.log('\n✓ TEST PASSED: All values match expected output');
            return true;
        } else {
            console.log('\n✗ TEST FAILED: Values do not match expected output');
            return false;
        }
        
    } catch (error) {
        console.error('ERROR during calculation:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
testCalculationEngine().then(testResult => {
    process.exit(testResult ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});