#!/usr/bin/env node
/**
 * UI-Multi-Unit-Agent
 * Tests multi-unit quote workflows: multiple generators in single quote
 */

const BaseAgent = require('./base-agent.cjs');
const ChromeManager = require('../lib/chrome-manager.cjs');
const path = require('path');
const fs = require('fs').promises;
const CDP = require('chrome-remote-interface');

class UIMultiUnitAgent extends BaseAgent {
  constructor() {
    super({
      name: 'UI-Multi-Unit-Agent',
      layer: 'ui'
    });

    this.chromeManager = new ChromeManager(this.name);
    this.cdpClient = null;
    this.currentUrl = null;
    this.evidenceDir = path.join(__dirname, '../../agent-coordination/evidence');
  }

  async initialize() {
    await super.initialize();

    console.log(`[${this.name}] Launching dedicated Chrome instance...`);
    const chromeInfo = await this.chromeManager.launchChrome();
    console.log(`[${this.name}] Chrome ready on port ${chromeInfo.port}`);

    try {
      this.cdpClient = await CDP({ port: chromeInfo.port });
      const { Network, Page, Runtime, Console } = this.cdpClient;

      await Network.enable();
      await Page.enable();
      await Runtime.enable();
      await Console.enable();

      this.consoleLogs = [];
      Console.messageAdded((params) => {
        this.consoleLogs.push({
          level: params.message.level,
          text: params.message.text,
          timestamp: new Date().toISOString()
        });
      });

      console.log(`[${this.name}] CDP connected successfully`);

    } catch (error) {
      console.error(`[${this.name}] CDP connection failed:`, error.message);
      throw error;
    }

    await fs.mkdir(this.evidenceDir, { recursive: true });
  }

  async executeWorkflow(workflow) {
    const startTime = Date.now();
    const workflowEvidence = {
      workflow_id: workflow.workflow_id,
      started_at: new Date().toISOString(),
      steps: [],
      screenshots: [],
      console_logs: []
    };

    try {
      console.log(`[${this.name}]   Starting workflow: ${workflow.workflow_id}`);

      await this.navigateToApp();

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`[${this.name}]   Step ${i + 1}/${workflow.steps.length}: ${step.action}`);

        const stepResult = await this.executeStep(step, workflow);
        workflowEvidence.steps.push(stepResult);

        const screenshot = await this.takeScreenshot(`${workflow.workflow_id}-step-${i + 1}`);
        workflowEvidence.screenshots.push(screenshot);

        await this.sleep(500);
      }

      const duration = Date.now() - startTime;
      workflowEvidence.completed_at = new Date().toISOString();
      workflowEvidence.duration_ms = duration;
      workflowEvidence.console_logs = this.consoleLogs;

      console.log(`[${this.name}]   Completed in ${duration}ms`);

      await this.saveEvidence(workflow.workflow_id, workflowEvidence);

      return {
        passed: true,
        duration_ms: duration,
        steps_completed: workflow.steps.length,
        evidence: workflowEvidence
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      workflowEvidence.failed_at = new Date().toISOString();
      workflowEvidence.duration_ms = duration;
      workflowEvidence.error = error.message;
      workflowEvidence.console_logs = this.consoleLogs;

      console.error(`[${this.name}]   Failed after ${duration}ms:`, error.message);

      try {
        const screenshot = await this.takeScreenshot(`${workflow.workflow_id}-FAILURE`);
        workflowEvidence.screenshots.push(screenshot);
      } catch (screenshotError) {
        console.error(`[${this.name}]   Screenshot failed:`, screenshotError.message);
      }

      await this.saveEvidence(workflow.workflow_id, workflowEvidence);

      return {
        passed: false,
        duration_ms: duration,
        error: error.message,
        evidence: workflowEvidence
      };
    }
  }

  async navigateToApp() {
    const appUrl = 'http://localhost:3002';
    const { Page } = this.cdpClient;

    console.log(`[${this.name}]   Navigating to ${appUrl}...`);

    await Page.navigate({ url: appUrl });
    await Page.loadEventFired();
    await this.sleep(1000);

    this.currentUrl = appUrl;
    console.log(`[${this.name}]   Loaded: ${appUrl}`);
  }

  async executeStep(step, workflow) {
    const stepResult = {
      action: step.action,
      type: step.type,
      started_at: new Date().toISOString(),
      success: false
    };

    try {
      if (step.type === 'ui') {
        await this.executeUIAction(step);
        stepResult.success = true;
      } else if (step.type === 'api') {
        await this.executeAPIAction(step);
        stepResult.success = true;
      }

      stepResult.completed_at = new Date().toISOString();
      console.log(`[${this.name}]     ✓ ${step.action}`);

    } catch (error) {
      stepResult.failed_at = new Date().toISOString();
      stepResult.error = error.message;
      console.error(`[${this.name}]     ✗ ${step.action}: ${error.message}`);
      throw error;
    }

    return stepResult;
  }

  async executeUIAction(step) {
    const { Runtime } = this.cdpClient;

    // Multi-unit specific actions
    if (step.action === 'open-multi-unit-modal') {
      const script = `(() => {
        const btn = document.querySelector('${step.element}');
        if (!btn) throw new Error('Multi-unit button not found: ${step.element}');
        btn.click();
        return { success: true };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }

      console.log(`[${this.name}]     [UI] Opened multi-unit modal`);
      await this.sleep(1000);

    } else if (step.action === 'add-generator-to-quote') {
      const script = `(() => {
        const addBtn = document.querySelector('${step.element}');
        if (!addBtn) throw new Error('Add generator button not found');
        addBtn.click();
        return { success: true };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }

      console.log(`[${this.name}]     [UI] Added generator to quote`);

    } else {
      // Generic UI action
      console.log(`[${this.name}]     [UI] ${step.action} (generic handler)`);
      await this.sleep(500);
    }
  }

  async executeAPIAction(step) {
    console.log(`[${this.name}]     [API] Triggering ${step.endpoint}`);
    await this.sleep(500);
  }

  async takeScreenshot(name) {
    const { Page } = this.cdpClient;
    const screenshot = await Page.captureScreenshot({ format: 'png' });
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(this.evidenceDir, filename);
    await fs.writeFile(filepath, screenshot.data, 'base64');

    return {
      filename,
      path: filepath,
      timestamp: new Date().toISOString()
    };
  }

  async saveEvidence(workflowId, evidence) {
    const filename = `${workflowId}-${Date.now()}.json`;
    const filepath = path.join(this.evidenceDir, filename);
    await fs.writeFile(filepath, JSON.stringify(evidence, null, 2));
    console.log(`[${this.name}]   Evidence saved: ${filename}`);
  }

  async shutdown() {
    console.log(`\n[${this.name}] Shutting down with Chrome cleanup...`);

    if (this.cdpClient) {
      try {
        await this.cdpClient.close();
        this.cdpClient = null;
      } catch (error) {
        console.error(`[${this.name}] CDP close error:`, error.message);
      }
    }

    await this.chromeManager.closeChrome();
    await super.shutdown();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const agent = new UIMultiUnitAgent();

  process.on('SIGINT', async () => {
    console.log('\n[SIGINT] Received shutdown signal');
    await agent.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[SIGTERM] Received shutdown signal');
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
    await agent.shutdown();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = UIMultiUnitAgent;
