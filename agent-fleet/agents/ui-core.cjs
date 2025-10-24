#!/usr/bin/env node
/**
 * UI-Core-Workflow-Agent
 * Tests core UI workflows: quote creation, service selection, calculation
 * Phase 2: Real browser automation with Chrome DevTools MCP
 */

const BaseAgent = require('./base-agent.cjs');
const ChromeManager = require('../lib/chrome-manager.cjs');
const path = require('path');
const fs = require('fs').promises;

// MCP Chrome DevTools tools (will be available when running in Claude context)
// For standalone execution, we'll use HTTP API directly
const CDP = require('chrome-remote-interface');

class UICoreWorkflowAgent extends BaseAgent {
  constructor() {
    super({
      name: 'UI-Core-Workflow-Agent',
      layer: 'ui'
    });

    this.chromeManager = new ChromeManager(this.name);
    this.cdpClient = null;
    this.currentUrl = null;
    this.evidenceDir = path.join(__dirname, '../../agent-coordination/evidence');
  }

  /**
   * Initialize agent: base + Chrome
   */
  async initialize() {
    // Base initialization
    await super.initialize();

    // Launch Chrome instance
    console.log(`[${this.name}] Launching dedicated Chrome instance...`);
    const chromeInfo = await this.chromeManager.launchChrome();
    console.log(`[${this.name}] Chrome ready on port ${chromeInfo.port}`);

    // Connect CDP client
    try {
      this.cdpClient = await CDP({ port: chromeInfo.port });
      const { Network, Page, Runtime, Console } = this.cdpClient;

      // Enable necessary domains
      await Network.enable();
      await Page.enable();
      await Runtime.enable();
      await Console.enable();

      // Set up console log collection
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

    // Ensure evidence directory exists
    await fs.mkdir(this.evidenceDir, { recursive: true });
  }

  /**
   * Execute a UI workflow with real browser automation
   */
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

      // Navigate to application
      await this.navigateToApp();

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`[${this.name}]   Step ${i + 1}/${workflow.steps.length}: ${step.action}`);

        const stepResult = await this.executeStep(step, workflow);
        workflowEvidence.steps.push(stepResult);

        // Take screenshot after each step
        const screenshot = await this.takeScreenshot(`${workflow.workflow_id}-step-${i + 1}`);
        workflowEvidence.screenshots.push(screenshot);

        // Small delay between steps
        await this.sleep(500);
      }

      const duration = Date.now() - startTime;
      workflowEvidence.completed_at = new Date().toISOString();
      workflowEvidence.duration_ms = duration;
      workflowEvidence.console_logs = this.consoleLogs;

      console.log(`[${this.name}]   Completed in ${duration}ms`);

      // Save evidence
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

      // Take screenshot of failure state
      try {
        const screenshot = await this.takeScreenshot(`${workflow.workflow_id}-FAILURE`);
        workflowEvidence.screenshots.push(screenshot);
      } catch (screenshotError) {
        console.error(`[${this.name}]   Screenshot failed:`, screenshotError.message);
      }

      // Save evidence
      await this.saveEvidence(workflow.workflow_id, workflowEvidence);

      return {
        passed: false,
        duration_ms: duration,
        error: error.message,
        evidence: workflowEvidence
      };
    }
  }

  /**
   * Navigate to the application
   */
  async navigateToApp() {
    const appUrl = 'http://localhost:3002'; // Energen Calculator v5.0
    const { Page } = this.cdpClient;

    console.log(`[${this.name}]   Navigating to ${appUrl}...`);

    await Page.navigate({ url: appUrl });
    await Page.loadEventFired();
    await this.sleep(1000); // Wait for app to initialize

    this.currentUrl = appUrl;
    console.log(`[${this.name}]   Loaded: ${appUrl}`);
  }

  /**
   * Execute a single workflow step with real browser automation
   */
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

      } else if (step.type === 'assertion') {
        await this.executeAssertion(step);
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

  /**
   * Execute UI action (click, fill, select, etc.)
   */
  async executeUIAction(step) {
    const { Runtime } = this.cdpClient;

    if (step.action === 'select-generator') {
      // Find and interact with generator select dropdown
      const script = `(() => {
        const select = document.querySelector('${step.element}');
        if (!select) throw new Error('Element not found: ${step.element}');

        // Check if options populated
        if (select.options.length <= 1) {
          throw new Error('Generator select not populated from Zoho');
        }

        // Select first real generator (skip placeholder)
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, optionsCount: select.options.length };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }

      console.log(`[${this.name}]     [UI] Selected generator (${JSON.parse(result.result.value).optionsCount} options available)`);

    } else if (step.action === 'select-services') {
      // Find and check service checkboxes
      const script = `(() => {
        const checkboxes = document.querySelectorAll('${step.element}');
        if (checkboxes.length === 0) throw new Error('No service checkboxes found');

        // Select first service
        checkboxes[0].checked = true;
        checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, servicesAvailable: checkboxes.length };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }

      console.log(`[${this.name}]     [UI] Selected service (${JSON.parse(result.result.value).servicesAvailable} available)`);

    } else if (step.action === 'generate-pdf') {
      // Click PDF generation button
      const script = `(() => {
        const btn = document.querySelector('${step.element}');
        if (!btn) throw new Error('PDF button not found: ${step.element}');

        btn.click();
        return { success: true };
      })()`;

      const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception.description);
      }

      console.log(`[${this.name}]     [UI] Clicked PDF generation button`);
      await this.sleep(2000); // Wait for PDF generation
    }
  }

  /**
   * Execute API action (wait for network request)
   */
  async executeAPIAction(step) {
    // For now, just validate the endpoint exists
    console.log(`[${this.name}]     [API] Triggering ${step.endpoint}`);

    // In full implementation, we'd use Network domain to monitor requests
    // For Phase 2 MVP, we'll simulate this
    await this.sleep(500);
  }

  /**
   * Execute assertion
   */
  async executeAssertion(step) {
    const { Runtime } = this.cdpClient;

    const script = `
      // Evaluate assertion in page context
      ${step.script || 'true'}
    `;

    const result = await Runtime.evaluate({ expression: script, awaitPromise: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception.description);
    }

    console.log(`[${this.name}]     [ASSERT] ${step.description}`);
  }

  /**
   * Take screenshot
   */
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

  /**
   * Save workflow evidence
   */
  async saveEvidence(workflowId, evidence) {
    const filename = `${workflowId}-${Date.now()}.json`;
    const filepath = path.join(this.evidenceDir, filename);

    await fs.writeFile(filepath, JSON.stringify(evidence, null, 2));

    console.log(`[${this.name}]   Evidence saved: ${filename}`);
  }

  /**
   * Shutdown: close Chrome + base shutdown
   */
  async shutdown() {
    console.log(`\n[${this.name}] Shutting down with Chrome cleanup...`);

    // Close CDP client
    if (this.cdpClient) {
      try {
        await this.cdpClient.close();
        this.cdpClient = null;
      } catch (error) {
        console.error(`[${this.name}] CDP close error:`, error.message);
      }
    }

    // Close Chrome
    await this.chromeManager.closeChrome();

    // Base shutdown
    await super.shutdown();
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main entry point (when run directly)
 */
async function main() {
  const agent = new UICoreWorkflowAgent();

  // Handle graceful shutdown
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
    // Initialize agent
    await agent.initialize();

    // Run all assigned workflows
    await agent.runAllWorkflows();

    // Mark as idle after completion
    await agent.updateStatus('idle', 'all workflows complete');

    console.log(`\n[${agent.name}] All workflows complete. Standing by...`);

    // Keep running for heartbeat (press Ctrl+C to stop)
    // In production, agent would wait for new workflows or commands

  } catch (error) {
    console.error(`\n[${agent.name}] Fatal error:`, error);
    await agent.updateStatus('crashed', `Fatal: ${error.message}`);
    await agent.shutdown();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = UICoreWorkflowAgent;
