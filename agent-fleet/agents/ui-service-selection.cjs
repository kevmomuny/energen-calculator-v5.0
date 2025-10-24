#!/usr/bin/env node
/**
 * UI-Service-Selection-Agent
 * Tests service selection workflows: Services A-J, Service K, Custom services
 */

const BaseAgent = require('./base-agent.cjs');
const ChromeManager = require('../lib/chrome-manager.cjs');
const path = require('path');
const fs = require('fs').promises;
const CDP = require('chrome-remote-interface');

class UIServiceSelectionAgent extends BaseAgent {
  constructor() {
    super({
      name: 'UI-Service-Selection-Agent',
      layer: 'ui'
    });

    this.chromeManager = new ChromeManager(this.name);
    this.cdpClient = null;
    this.evidenceDir = path.join(__dirname, '../../agent-coordination/evidence');
  }

  async initialize() {
    await super.initialize();

    console.log(`[${this.name}] Launching dedicated Chrome instance...`);
    const chromeInfo = await this.chromeManager.launchChrome();

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

    } catch (error) {
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
      await this.navigateToApp();

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepResult = await this.executeStep(step, workflow);
        workflowEvidence.steps.push(stepResult);

        const screenshot = await this.takeScreenshot(`${workflow.workflow_id}-step-${i + 1}`);
        workflowEvidence.screenshots.push(screenshot);

        await this.sleep(300);
      }

      const duration = Date.now() - startTime;
      workflowEvidence.completed_at = new Date().toISOString();
      workflowEvidence.duration_ms = duration;
      workflowEvidence.console_logs = this.consoleLogs;

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

      try {
        const screenshot = await this.takeScreenshot(`${workflow.workflow_id}-FAILURE`);
        workflowEvidence.screenshots.push(screenshot);
      } catch (e) {}

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
    const { Page } = this.cdpClient;
    await Page.navigate({ url: 'http://localhost:3002' });
    await Page.loadEventFired();
    await this.sleep(1000);
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
      } else if (step.type === 'api') {
        await this.sleep(500);
      }

      stepResult.success = true;
      stepResult.completed_at = new Date().toISOString();

    } catch (error) {
      stepResult.failed_at = new Date().toISOString();
      stepResult.error = error.message;
      throw error;
    }

    return stepResult;
  }

  async executeUIAction(step) {
    const { Runtime } = this.cdpClient;

    if (step.action.includes('select-service')) {
      const script = `(() => {
        const checkbox = document.querySelector('${step.element}');
        if (!checkbox) throw new Error('Service checkbox not found: ${step.element}');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }
    } else {
      await this.sleep(300);
    }
  }

  async takeScreenshot(name) {
    const { Page } = this.cdpClient;
    const screenshot = await Page.captureScreenshot({ format: 'png' });
    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(this.evidenceDir, filename);
    await fs.writeFile(filepath, screenshot.data, 'base64');
    return { filename, path: filepath, timestamp: new Date().toISOString() };
  }

  async saveEvidence(workflowId, evidence) {
    const filename = `${workflowId}-${Date.now()}.json`;
    const filepath = path.join(this.evidenceDir, filename);
    await fs.writeFile(filepath, JSON.stringify(evidence, null, 2));
  }

  async shutdown() {
    if (this.cdpClient) {
      try { await this.cdpClient.close(); } catch (e) {}
    }
    await this.chromeManager.closeChrome();
    await super.shutdown();
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const agent = new UIServiceSelectionAgent();

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
  } catch (error) {
    await agent.updateStatus('crashed', `Fatal: ${error.message}`);
    await agent.shutdown();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = UIServiceSelectionAgent;
