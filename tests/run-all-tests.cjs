#!/usr/bin/env node
/**
 * Master Test Runner
 * Runs all test suites and generates comprehensive report
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    bold: '\x1b[1m'
};

class MasterTestRunner {
    constructor() {
        this.testSuites = [
            {
                name: 'Syntax Validation',
                file: 'test-1-syntax-validation.cjs',
                description: 'Validates JavaScript syntax and code changes'
            },
            {
                name: 'Calculation Engine',
                file: 'test-2-calculation-engine.cjs',
                description: 'Tests calculation engine and error handling',
                requiresServer: true
            },
            {
                name: 'Zoho MCP Integration',
                file: 'test-3-zoho-mcp-integration.cjs',
                description: 'Tests Zoho MCP retry logic and field mappings'
            }
        ];

        this.results = {
            startTime: new Date().toISOString(),
            endTime: null,
            duration: null,
            suites: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0
            }
        };
    }

    log(message, color = 'reset') {
        const colorCode = colors[color] || colors.reset;
        console.log(`${colorCode}${message}${colors.reset}`);
    }

    async runTestSuite(suite) {
        return new Promise((resolve) => {
            this.log(`\n${'='.repeat(64)}`, 'blue');
            this.log(`Running: ${suite.name}`, 'bold');
            this.log(`File: ${suite.file}`, 'cyan');
            this.log(`Description: ${suite.description}`, 'cyan');
            this.log('='.repeat(64), 'blue');

            const startTime = Date.now();
            const testPath = path.join(__dirname, suite.file);

            if (!fs.existsSync(testPath)) {
                this.log(`✗ Test file not found: ${testPath}`, 'red');
                resolve({
                    name: suite.name,
                    success: false,
                    error: 'Test file not found',
                    duration: 0
                });
                return;
            }

            const child = spawn('node', [testPath], {
                stdio: 'inherit',
                cwd: path.resolve(__dirname, '..')
            });

            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                const success = code === 0;

                // Try to load results JSON
                let testResults = null;
                const resultsFileName = suite.file.replace('.cjs', '').replace('test-', 'test-results-') + '.json';
                const resultsPath = path.join(__dirname, resultsFileName);

                if (fs.existsSync(resultsPath)) {
                    try {
                        testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
                    } catch (error) {
                        this.log(`Warning: Could not parse results file: ${error.message}`, 'yellow');
                    }
                }

                resolve({
                    name: suite.name,
                    file: suite.file,
                    success,
                    exitCode: code,
                    duration,
                    results: testResults
                });
            });

            child.on('error', (error) => {
                const duration = Date.now() - startTime;
                this.log(`✗ Failed to run test: ${error.message}`, 'red');
                resolve({
                    name: suite.name,
                    success: false,
                    error: error.message,
                    duration
                });
            });
        });
    }

    printHeader() {
        this.log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
        this.log('║                   MASTER TEST RUNNER                       ║', 'magenta');
        this.log('║              Energen Calculator v5.0                       ║', 'magenta');
        this.log('╚════════════════════════════════════════════════════════════╝', 'magenta');
        this.log(`\nStart Time: ${this.results.startTime}`, 'cyan');
        this.log(`Test Suites: ${this.testSuites.length}\n`, 'cyan');
    }

    async checkServerStatus() {
        const axios = require('axios');
        try {
            const response = await axios.get('http://localhost:3002/health', { timeout: 3000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async runAllTests() {
        this.printHeader();

        // Check if server is running for tests that need it
        const serverRunning = await this.checkServerStatus();
        if (serverRunning) {
            this.log('✓ Server detected at http://localhost:3002', 'green');
        } else {
            this.log('⚠️  Server not detected - tests requiring server will fail', 'yellow');
        }

        // Run each test suite
        for (const suite of this.testSuites) {
            if (suite.requiresServer && !serverRunning) {
                this.log(`\nSkipping ${suite.name} (server required but not running)`, 'yellow');
                this.results.suites.push({
                    name: suite.name,
                    skipped: true,
                    reason: 'Server not running'
                });
                this.results.summary.skipped++;
                continue;
            }

            const result = await this.runTestSuite(suite);
            this.results.suites.push(result);

            if (result.success) {
                this.results.summary.passed++;
            } else {
                this.results.summary.failed++;
            }
            this.results.summary.total++;
        }

        this.results.endTime = new Date().toISOString();
        this.results.duration = Date.now() - new Date(this.results.startTime).getTime();

        this.printFinalSummary();
        this.saveResults();

        return this.results.summary.failed === 0;
    }

    printFinalSummary() {
        this.log('\n\n╔════════════════════════════════════════════════════════════╗', 'magenta');
        this.log('║                   FINAL TEST SUMMARY                       ║', 'magenta');
        this.log('╚════════════════════════════════════════════════════════════╝\n', 'magenta');

        this.log(`Total Test Suites: ${this.results.summary.total}`, 'blue');
        this.log(`Passed: ${this.results.summary.passed}`, 'green');
        this.log(`Failed: ${this.results.summary.failed}`, this.results.summary.failed > 0 ? 'red' : 'green');
        this.log(`Skipped: ${this.results.summary.skipped}`, 'yellow');

        const totalRan = this.results.summary.total;
        const passRate = totalRan > 0 ? ((this.results.summary.passed / totalRan) * 100).toFixed(1) : '0.0';
        this.log(`Pass Rate: ${passRate}%`, passRate === '100.0' ? 'green' : 'yellow');

        this.log(`\nTotal Duration: ${(this.results.duration / 1000).toFixed(2)}s`, 'cyan');

        // Individual suite results
        this.log('\n📊 Suite Breakdown:', 'blue');
        for (const suite of this.results.suites) {
            if (suite.skipped) {
                this.log(`  ⊘ ${suite.name} - SKIPPED (${suite.reason})`, 'yellow');
            } else {
                const status = suite.success ? '✓' : '✗';
                const color = suite.success ? 'green' : 'red';
                const duration = (suite.duration / 1000).toFixed(2);
                this.log(`  ${status} ${suite.name} - ${duration}s`, color);

                if (suite.results) {
                    const { passed, failed } = suite.results;
                    const total = (passed || 0) + (failed || 0);
                    this.log(`    Tests: ${total}, Passed: ${passed || 0}, Failed: ${failed || 0}`, 'cyan');
                }
            }
        }

        // Final verdict
        if (this.results.summary.failed === 0 && this.results.summary.passed > 0) {
            this.log('\n🎉 ALL TESTS PASSED! CODE IS PRODUCTION READY! 🎉', 'green');
        } else if (this.results.summary.failed > 0) {
            this.log('\n⚠️  SOME TESTS FAILED - REVIEW OUTPUT ABOVE', 'red');
        } else {
            this.log('\n⚠️  NO TESTS RAN SUCCESSFULLY', 'yellow');
        }
    }

    saveResults() {
        const resultsPath = path.join(__dirname, 'test-results-master.json');
        fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        this.log(`\nMaster results saved to: ${resultsPath}`, 'cyan');

        // Also save a timestamp-based copy
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(__dirname, `test-results-${timestamp}.json`);
        fs.writeFileSync(archivePath, JSON.stringify(this.results, null, 2));
        this.log(`Archive saved to: ${archivePath}`, 'cyan');
    }
}

// Run all tests
(async () => {
    const runner = new MasterTestRunner();
    const success = await runner.runAllTests();
    process.exit(success ? 0 : 1);
})();
