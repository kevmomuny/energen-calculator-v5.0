#!/usr/bin/env node
/**
 * UI-Customer-Search-Agent
 * Tests customer search and enrichment workflows (Zoho search, Google Places, logo lookup)
 */

const BaseAgent = require('./base-agent.cjs');
const ChromeManager = require('../lib/chrome-manager.cjs');
const path = require('path');
const fs = require('fs').promises;

class UICustomerSearchAgent extends BaseAgent {
  constructor() {
    super({
      name: 'UI-Customer-Search-Agent',
      layer: 'ui'
    });

    this.chromeManager = null;
    this.cdpClient = null;
    this.baseUrl = 'http://localhost:3002';
    this.evidenceDir = path.join(__dirname, '../../agent-coordination/evidence');
  }

  async initialize() {
    await super.initialize();
    await fs.mkdir(this.evidenceDir, { recursive: true });

    this.chromeManager = new ChromeManager(this.name);
    await this.chromeManager.allocatePort();
    this.cdpClient = await this.chromeManager.launchChrome();

    console.log(`[${this.name}] Chrome initialized on port ${this.chromeManager.debugPort}`);
    console.log(`[${this.name}] Ready for customer search workflow testing`);
  }

  async executeWorkflow(workflow) {
    const startTime = Date.now();

    try {
      const { Page } = this.cdpClient;
      await Page.navigate({ url: this.baseUrl });
      await Page.loadEventFired();
      await this.sleep(2000);

      console.log(`[${this.name}]   Starting workflow: ${workflow.workflow_id}`);

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`[${this.name}]     Step ${i + 1}: ${step.action}`);
        await this.executeUIAction(step);
        await this.sleep(500);
      }

      const duration = Date.now() - startTime;
      console.log(`[${this.name}]   Completed in ${duration}ms`);
      return { passed: true, duration_ms: duration };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${this.name}]   Failed: ${error.message}`);
      await this.captureFailureEvidence(workflow.workflow_id, error.message);
      return { passed: false, duration_ms: duration, error: error.message };
    }
  }

  async executeUIAction(step) {
    const { Runtime } = this.cdpClient;

    if (step.action === 'search-customer') {
      const script = `(() => {
        const input = document.querySelector('${step.element}');
        if (!input) throw new Error('Search input not found: ${step.element}');
        input.value = '${step.value}';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { success: true };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
    }

    if (step.action === 'enrich-customer') {
      const script = `(() => {
        const btn = document.querySelector('${step.element}');
        if (!btn) throw new Error('Enrich button not found: ${step.element}');
        btn.click();
        return { success: true };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
    }
  }

  async captureFailureEvidence(workflowId, errorMessage) {
    const { Page } = this.cdpClient;
    const screenshot = await Page.captureScreenshot({ format: 'png' });

    const timestamp = Date.now();
    const screenshotPath = path.join(this.evidenceDir, `${workflowId}-${timestamp}.png`);
    await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));

    const evidence = {
      workflow_id: workflowId,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      screenshot: screenshotPath
    };

    const evidencePath = path.join(this.evidenceDir, `${workflowId}-${timestamp}.json`);
    await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2));
  }

  async shutdown() {
    if (this.chromeManager) {
      await this.chromeManager.closeChrome();
    }
    await super.shutdown();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const agent = new UICustomerSearchAgent();

  process.on('SIGINT', async () => {
    await agent.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await agent.shutdown();
    process.exit(0);
  });

  try {
    await agent.initialize();
    await agent.runAllWorkflows();
    await agent.updateStatus('idle', 'all workflows complete');
    console.log(`\n[${agent.name}] All workflows complete. Standing by...`);

  } catch (error) {
    console.error(`\n[${agent.name}] Fatal error:`, error);
    await agent.updateStatus('crashed', `Fatal: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = UICustomerSearchAgent;
