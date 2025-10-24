#!/usr/bin/env node
/**
 * Phase 2 Live Automation Test
 * Tests UI-Core-Workflow-Agent with real browser automation
 *
 * Prerequisites:
 * - Energen server running on localhost:3002
 * - Chrome installed
 */

const { spawn } = require('child_process');
const path = require('path');

const AGENT_SCRIPT = path.join(__dirname, '../../agent-fleet/agents/ui-core.cjs');
const TEST_TIMEOUT_MS = 120000; // 2 minutes

class LiveAutomationTester {
  constructor() {
    this.agentProcess = null;
  }

  async runTest() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 2 LIVE AUTOMATION TEST                             ║');
    console.log('║  Real Browser Automation with Chrome DevTools             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('Prerequisites:');
    console.log('  ✓ Energen server on localhost:3002');
    console.log('  ✓ Chrome browser installed');
    console.log('  ✓ chrome-remote-interface npm package\n');

    console.log('Test will:');
    console.log('  1. Launch Chrome with remote debugging');
    console.log('  2. Navigate to Energen Calculator');
    console.log('  3. Execute simple-quote-creation workflow');
    console.log('  4. Capture screenshots and evidence');
    console.log('  5. Report results\n');

    console.log('─'.repeat(60));
    console.log('SPAWNING AGENT...\n');

    try {
      // Spawn agent
      this.agentProcess = spawn('node', [AGENT_SCRIPT], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      console.log(`Agent PID: ${this.agentProcess.pid}\n`);

      // Collect output in real-time
      this.agentProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });

      this.agentProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      // Wait for agent to complete or timeout
      const exitCode = await new Promise((resolve) => {
        this.agentProcess.on('close', (code) => {
          resolve(code);
        });

        // Timeout after 2 minutes
        setTimeout(() => {
          console.log('\n⏱️  Test timeout - terminating agent...');
          this.agentProcess.kill('SIGTERM');
        }, TEST_TIMEOUT_MS);
      });

      console.log('\n' + '─'.repeat(60));
      console.log('TEST COMPLETE');
      console.log('─'.repeat(60));

      if (exitCode === 0) {
        console.log('\n✅ Agent completed successfully');
        console.log('\nCheck evidence:');
        console.log('  - Screenshots: agent-coordination/evidence/*.png');
        console.log('  - Workflow data: agent-coordination/evidence/*.json');
        console.log('  - Agent logs: agent-logs/*.log\n');
        process.exit(0);
      } else {
        console.log(`\n❌ Agent exited with code ${exitCode}`);
        console.log('\nCheck logs for errors:');
        console.log('  - agent-logs/*.log\n');
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Test error:', error.message);
      await this.cleanup();
      process.exit(1);
    }
  }

  async cleanup() {
    if (this.agentProcess && !this.agentProcess.killed) {
      console.log('\nCleaning up: Terminating agent...');
      this.agentProcess.kill('SIGTERM');
      await this.sleep(1000);
      if (!this.agentProcess.killed) {
        this.agentProcess.kill('SIGKILL');
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main
async function main() {
  const tester = new LiveAutomationTester();

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n\nTest interrupted');
    await tester.cleanup();
    process.exit(1);
  });

  await tester.runTest();
}

if (require.main === module) {
  main();
}

module.exports = LiveAutomationTester;
