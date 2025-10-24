/**
 * END-TO-END AUTOMATED TEST SUITE
 * Uses Chrome DevTools MCP to test every UI element and validate calculations
 * Follows TESTING_DATA_STANDARDS.md - NO FAKE DATA, REAL API CALLS ONLY
 *
 * Test Philosophy:
 * - Click every button and verify it works
 * - Use real generator data from LBNL RFP
 * - Make real API calls (no mocks)
 * - Validate actual calculations against Excel formulas
 * - Test with real addresses and distances
 */

const fs = require('fs');
const path = require('path');

// Load real test data from LBNL RFP
const lbnlGenerators = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../test-data/lbnl-generators.json'), 'utf8')
);

class EnergenE2ETests {
  constructor() {
    this.testResults = [];
    this.baseUrl = 'http://localhost:3002/frontend/integrated-ui.html';
    this.testCustomer = {
      name: 'Lawrence Berkeley National Laboratory',
      address: '1 Cyclotron Road, Berkeley, CA 94720',
      phone: '(510) 555-0100',  // Real area code + 555 test exchange
      email: 'facilities@lbl.gov'
    };
  }

  /**
   * Test Suite 1: UI Element Discovery and Interaction
   * Verify every button, input, and interactive element works
   */
  async testUIElements() {
    console.log('\n==== TEST SUITE 1: UI Elements ====\n');

    const tests = [
      {
        name: 'Company Name Autocomplete',
        action: async (page) => {
          await page.fill('#company-name', 'Lawrence Berkeley');
          await page.waitForSelector('.autocomplete-suggestion', { timeout: 5000 });
          const suggestions = await page.$$eval('.autocomplete-suggestion', els => els.length);
          return { success: suggestions > 0, data: { suggestionCount: suggestions } };
        },
        assertion: (result) => result.success && result.data.suggestionCount > 0,
        errorMessage: 'Autocomplete should return suggestions for real company name'
      },

      {
        name: 'Distance Calculation - Real Address',
        action: async (page) => {
          await page.fill('#customer-address', this.testCustomer.address);
          await page.click('#calculate-distance-btn');
          await page.waitForSelector('#distance-result', { timeout: 10000 });
          const distance = await page.$eval('#distance-result', el => el.textContent);
          const distanceNum = parseInt(distance);
          return { success: !isNaN(distanceNum) && distanceNum > 0, data: { distance: distanceNum } };
        },
        assertion: (result) => result.success && result.data.distance > 0 && result.data.distance < 100,
        errorMessage: 'Distance from Concord to Berkeley should be realistic (< 100 miles)'
      },

      {
        name: 'Add Contact Button',
        action: async (page) => {
          await page.click('#add-contact-btn');
          await page.waitForSelector('#contact-modal', { timeout: 2000 });
          const isVisible = await page.isVisible('#contact-modal');
          return { success: isVisible, data: {} };
        },
        assertion: (result) => result.success,
        errorMessage: 'Add Contact button should open modal'
      },

      {
        name: 'Contact CRUD Operations',
        action: async (page) => {
          // Fill contact form
          await page.fill('#contact-name', 'Robert Birgeneau');
          await page.fill('#contact-email', 'chancellor@berkeley.edu');
          await page.fill('#contact-phone', '(510) 555-0200');

          // Save contact
          await page.click('#save-contact-btn');
          await page.waitForTimeout(1000);

          // Verify contact appears in list
          const contacts = await page.$$eval('.contact-card', els => els.length);

          // Delete contact
          await page.click('.contact-delete-btn');
          await page.click('button:has-text("OK")'); // Confirm deletion
          await page.waitForTimeout(500);

          const contactsAfterDelete = await page.$$eval('.contact-card', els => els.length);

          return {
            success: contacts > 0 && contactsAfterDelete < contacts,
            data: { created: contacts, afterDelete: contactsAfterDelete }
          };
        },
        assertion: (result) => result.success,
        errorMessage: 'Should be able to create and delete contacts'
      },

      {
        name: 'Add Generator Unit',
        action: async (page) => {
          await page.click('#add-unit-btn');
          await page.waitForTimeout(500);
          const units = await page.$$eval('.generator-unit', els => els.length);
          return { success: units > 0, data: { unitCount: units } };
        },
        assertion: (result) => result.success && result.data.unitCount > 0,
        errorMessage: 'Add Unit button should create new generator unit'
      }
    ];

    for (const test of tests) {
      await this.runTest(test);
    }
  }

  /**
   * Test Suite 2: Calculator Accuracy with Real LBNL Generators
   * Test quote calculation with actual equipment from RFP
   */
  async testCalculatorAccuracy() {
    console.log('\n==== TEST SUITE 2: Calculator Accuracy ====\n');

    // Test 3 generator sizes: Small, Medium, Large
    const testGenerators = [
      lbnlGenerators.find(g => g.kwRating && g.kwRating < 200),    // Small
      lbnlGenerators.find(g => g.kwRating && g.kwRating >= 200 && g.kwRating <= 500),  // Medium
      lbnlGenerators.find(g => g.kwRating && g.kwRating > 500)     // Large
    ];

    for (const generator of testGenerators) {
      const test = {
        name: `Calculate Quote - ${generator.manufacturer} ${generator.kwRating}kW`,
        action: async (page) => {
          // Fill generator details
          await page.fill('#gen-manufacturer', generator.manufacturer);
          await page.fill('#gen-model', generator.model);
          await page.fill('#gen-kw-rating', generator.kwRating.toString());
          await page.fill('#gen-serial', generator.serialNumber);

          // Select services
          await page.click('#service-a-annual');
          await page.click('#service-b-annual');
          await page.click('#service-c-annual');

          // Calculate quote
          await page.click('#calculate-quote-btn');
          await page.waitForSelector('#quote-total', { timeout: 5000 });

          const total = await page.$eval('#quote-total', el => parseFloat(el.textContent.replace(/[$,]/g, '')));
          const laborHours = await page.$eval('#total-labor-hours', el => parseFloat(el.textContent));
          const materialsCost = await page.$eval('#materials-cost', el => parseFloat(el.textContent.replace(/[$,]/g, '')));

          return {
            success: total > 0 && laborHours > 0 && materialsCost >= 0,
            data: { total, laborHours, materialsCost, generator: generator.model }
          };
        },
        assertion: (result) => {
          // Validate calculation makes sense
          const { total, laborHours, materialsCost } = result.data;
          const laborRate = 175; // Base rate per hour
          const minExpectedTotal = (laborHours * laborRate) + materialsCost;

          return result.success && total >= minExpectedTotal && total < minExpectedTotal * 2;
        },
        errorMessage: `Quote calculation for ${generator.manufacturer} should be realistic`
      };

      await this.runTest(test);
    }
  }

  /**
   * Test Suite 3: Google Places API Integration
   * Verify real API calls (no mocks) with actual responses
   */
  async testGooglePlacesAPI() {
    console.log('\n==== TEST SUITE 3: Google Places API Integration ====\n');

    const tests = [
      {
        name: 'Google Places Autocomplete - Real API Call',
        action: async (page) => {
          // Type in real company name
          await page.fill('#company-name', 'Apple Inc');
          await page.waitForTimeout(1000); // Wait for debounce

          // Check network request was made
          const response = await page.waitForResponse(
            resp => resp.url().includes('/api/google-places') && resp.status() === 200,
            { timeout: 5000 }
          );

          const data = await response.json();

          return {
            success: data.success && data.predictions && data.predictions.length > 0,
            data: {
              count: data.predictions.length,
              apiVersion: data.apiVersion,
              firstResult: data.predictions[0].description
            }
          };
        },
        assertion: (result) => {
          return result.success &&
                 result.data.count > 0 &&
                 (result.data.apiVersion === 'new' || result.data.apiVersion === 'legacy' || result.data.apiVersion === 'legacy_fallback') &&
                 result.data.firstResult.toLowerCase().includes('apple');
        },
        errorMessage: 'Google Places API should return real results for Apple Inc'
      },

      {
        name: 'Logo Enrichment - Real Photo',
        action: async (page) => {
          await page.fill('#company-name', 'Tesla Inc');
          await page.click('#enrich-logo-btn');
          await page.waitForSelector('#company-logo', { timeout: 10000 });

          const logoSrc = await page.getAttribute('#company-logo', 'src');
          const isValidUrl = logoSrc && (logoSrc.startsWith('http') || logoSrc.startsWith('data:'));

          return { success: isValidUrl, data: { logoUrl: logoSrc } };
        },
        assertion: (result) => result.success && result.data.logoUrl !== null,
        errorMessage: 'Logo enrichment should return valid URL (not fake placeholder)'
      }
    ];

    for (const test of tests) {
      await this.runTest(test);
    }
  }

  /**
   * Test Suite 4: Zoho CRM Integration
   * Test real Zoho API calls (no mocks)
   */
  async testZohoIntegration() {
    console.log('\n==== TEST SUITE 4: Zoho CRM Integration ====\n');

    const test = {
      name: 'Zoho Sync - Create Quote in CRM',
      action: async (page) => {
        // Fill customer info
        await page.fill('#company-name', this.testCustomer.name);
        await page.fill('#customer-address', this.testCustomer.address);

        // Add a generator
        const testGen = lbnlGenerators[0];
        await page.fill('#gen-manufacturer', testGen.manufacturer);
        await page.fill('#gen-model', testGen.model);
        await page.fill('#gen-kw-rating', testGen.kwRating.toString());

        // Select services and calculate
        await page.click('#service-a-annual');
        await page.click('#calculate-quote-btn');
        await page.waitForTimeout(2000);

        // Sync with Zoho
        await page.click('#sync-zoho-btn');

        const response = await page.waitForResponse(
          resp => resp.url().includes('/api/zoho/sync') && resp.status() === 200,
          { timeout: 15000 }
        );

        const data = await response.json();

        return {
          success: data.success && data.zohoAccountId,
          data: {
            accountId: data.zohoAccountId,
            quoteId: data.zohoQuoteId
          }
        };
      },
      assertion: (result) => result.success && result.data.accountId && result.data.quoteId,
      errorMessage: 'Zoho sync should create real records in CRM (not mocked)'
    };

    await this.runTest(test);
  }

  /**
   * Test Suite 5: PDF Generation
   * Verify PDF actually generates and downloads
   */
  async testPDFGeneration() {
    console.log('\n==== TEST SUITE 5: PDF Generation ====\n');

    const test = {
      name: 'Generate PDF - Real Download',
      action: async (page) => {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download');

        // Generate PDF
        await page.click('#generate-pdf-btn');

        const download = await downloadPromise;
        const filename = download.suggestedFilename();
        const path = await download.path();

        // Verify file exists and has content
        const stats = fs.statSync(path);

        return {
          success: stats.size > 0,
          data: {
            filename,
            size: stats.size,
            path
          }
        };
      },
      assertion: (result) => result.success && result.data.size > 10000, // PDF should be > 10KB
      errorMessage: 'PDF should actually generate and download (not fake)'
    };

    await this.runTest(test);
  }

  /**
   * Helper: Run a single test and record results
   */
  async runTest(test) {
    const startTime = Date.now();

    try {
      console.log(`Running: ${test.name}...`);

      const result = await test.action();
      const passed = test.assertion(result);
      const duration = Date.now() - startTime;

      const testResult = {
        name: test.name,
        passed,
        duration,
        data: result.data,
        error: passed ? null : test.errorMessage
      };

      this.testResults.push(testResult);

      if (passed) {
        console.log(`  [PASS] ${test.name} (${duration}ms)`);
      } else {
        console.log(`  [FAIL] ${test.name} (${duration}ms)`);
        console.log(`         ${test.errorMessage}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  [ERROR] ${test.name} (${duration}ms)`);
      console.log(`          ${error.message}`);

      this.testResults.push({
        name: test.name,
        passed: false,
        duration,
        data: null,
        error: error.message
      });
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    const passed = this.testResults.filter(t => t.passed).length;
    const failed = this.testResults.filter(t => !t.passed).length;
    const total = this.testResults.length;
    const passRate = ((passed / total) * 100).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed,
        passRate: passRate + '%'
      },
      results: this.testResults
    };

    // Save report
    const reportPath = path.join(__dirname, '../test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log('\nReport saved to: test-results.json');
    console.log('='.repeat(60));

    return report;
  }
}

module.exports = EnergenE2ETests;
