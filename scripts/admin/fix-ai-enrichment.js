/**
 * Fix AI Enrichment - Solution Implementation
 *
 * This script demonstrates the fix for AI enrichment Claude API integration
 *
 * PROBLEM: Claude API never triggered because:
 * 1. ANTHROPIC_API_KEY not set
 * 2. Interpolation logic returns before reaching Claude API
 *
 * SOLUTION:
 * 1. Add ANTHROPIC_API_KEY to environment
 * 2. Reorder enrichment priority (Claude API before interpolation)
 */

const axios = require('axios');

async function testEnrichmentWithApiKey() {
    console.log('================================================================================');
    console.log('AI ENRICHMENT FIX - Testing with ANTHROPIC_API_KEY');
    console.log('================================================================================\n');

    // Check if API key is set
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log('ANTHROPIC_API_KEY status:', apiKey ? 'SET ✓' : 'NOT SET ✗');

    if (!apiKey) {
        console.log('\n❌ ANTHROPIC_API_KEY is not set');
        console.log('\nTo fix:');
        console.log('  Windows PowerShell:');
        console.log('    $env:ANTHROPIC_API_KEY = "sk-ant-api..."');
        console.log('    node fix-ai-enrichment.js');
        console.log('\n  Or create .env file:');
        console.log('    echo ANTHROPIC_API_KEY=sk-ant-api... > .env');
        console.log('    Add require("dotenv").config() to server-secure.cjs');
        console.log('\n  Or set in Windows Environment Variables (persistent):');
        console.log('    System Properties → Environment Variables → New');
        console.log('    Variable: ANTHROPIC_API_KEY');
        console.log('    Value: sk-ant-api...');
        return;
    }

    console.log('✓ API key is set (length:', apiKey.length, ')');

    // Test enrichment with real Kohler model
    const testUnit = {
        manufacturer: 'Kohler',
        model: '400REQZV',
        kw: 400,
        serialNumber: '2031139',
        fuelType: 'Diesel'
    };

    console.log('\nTesting with:', testUnit.manufacturer, testUnit.model, `(${testUnit.kw}kW)`);
    console.log('Expected: Claude API should search manufacturer websites\n');

    try {
        const response = await axios.post('http://localhost:3002/api/enrichment/generator', testUnit, {
            timeout: 30000
        });

        const result = response.data;

        console.log('Enrichment Result:');
        console.log('  Success:', result.success);
        console.log('  Tier:', result.tier);
        console.log('  Confidence:', (result.confidence * 100).toFixed(1) + '%');
        console.log('  Sources:', result.sources?.join(', ') || 'none');

        // Check if Claude API was used
        const usedClaudeAPI = result.sources?.includes('claude_api');
        console.log('\n✓ Claude API used:', usedClaudeAPI ? 'YES ✓' : 'NO ✗');

        if (!usedClaudeAPI && result.sources?.includes('manufacturer_interpolation')) {
            console.log('\n⚠️  WARNING: Still using interpolation instead of Claude API');
            console.log('    This means the enrichment logic needs modification');
            console.log('    See: AI_ENRICHMENT_DIAGNOSIS.md → Solution Step 2');
        }

        // Check what data was returned
        if (result.data) {
            console.log('\nReturned Data Fields:');
            console.log('  Engine:', !!result.data.engine ? '✓' : '✗');
            console.log('  Oil Capacity:', result.data.oilCapacity || result.data.fluids?.oilCapacity ? '✓' : '✗');
            console.log('  Coolant Capacity:', result.data.coolantCapacity || result.data.fluids?.coolantCapacity ? '✓' : '✗');
            console.log('  Oil Filter:', result.data.oilFilter ? '✓' : '✗');
            console.log('  Air Filter:', result.data.airFilter ? '✓' : '✗');
            console.log('  Service Intervals:', result.data.maintenance ? '✓' : '✗');
        }

        console.log('\n' + '='.repeat(80));
        if (usedClaudeAPI) {
            console.log('✓ AI ENRICHMENT WORKING - Claude API successfully queried');
        } else {
            console.log('✗ AI ENRICHMENT NEEDS FIX - See AI_ENRICHMENT_DIAGNOSIS.md');
        }
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n✗ Error during enrichment test:');
        if (error.response) {
            console.error('  Status:', error.response.status);
            console.error('  Error:', error.response.data.error || error.response.data);
        } else if (error.request) {
            console.error('  No response from server');
            console.error('  Is server running? npm run start-server');
        } else {
            console.error('  Error:', error.message);
        }
    }
}

// Run the test
testEnrichmentWithApiKey()
    .catch(error => {
        console.error('\nUnexpected error:', error);
        process.exit(1);
    });
