#!/usr/bin/env node
/**
 * Fullbay-Integration-Agent
 * Tests Fullbay sync workflows: customer sync, invoice sync, unit tracking
 */

const BaseAgent = require('./base-agent.cjs');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs').promises;

class FullbayIntegrationAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Fullbay-Integration-Agent',
      layer: 'integration'
    });

    this.baseUrl = 'http://localhost:3002';
    this.evidenceDir = path.join(__dirname, '../../agent-coordination/evidence');
  }

  async initialize() {
    await super.initialize();
    await fs.mkdir(this.evidenceDir, { recursive: true });
    console.log(`[${this.name}] Initialized for Fullbay integration testing`);
  }

  async executeWorkflow(workflow) {
    const startTime = Date.now();
    const workflowEvidence = {
      workflow_id: workflow.workflow_id,
      started_at: new Date().toISOString(),
      steps: [],
      api_calls: [],
      fullbay_responses: []
    };

    try {
      console.log(`[${this.name}]   Starting workflow: ${workflow.workflow_id}`);

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`[${this.name}]   Step ${i + 1}/${workflow.steps.length}: ${step.action}`);

        const stepResult = await this.executeStep(step, workflow);
        workflowEvidence.steps.push(stepResult);

        await this.sleep(200);
      }

      const duration = Date.now() - startTime;
      workflowEvidence.completed_at = new Date().toISOString();
      workflowEvidence.duration_ms = duration;

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

      console.error(`[${this.name}]   Failed after ${duration}ms:`, error.message);

      await this.saveEvidence(workflow.workflow_id, workflowEvidence);

      return {
        passed: false,
        duration_ms: duration,
        error: error.message,
        evidence: workflowEvidence
      };
    }
  }

  async executeStep(step, workflow) {
    const stepResult = {
      action: step.action,
      endpoint: step.endpoint,
      started_at: new Date().toISOString(),
      success: false
    };

    try {
      const url = `${this.baseUrl}${step.endpoint}`;
      const method = step.method || 'GET';
      const headers = { 'Content-Type': 'application/json' };

      const options = {
        method,
        headers
      };

      if (step.body) {
        options.body = JSON.stringify(step.body);
      }

      console.log(`[${this.name}]     ${method} ${step.endpoint}`);

      const response = await fetch(url, options);
      const statusCode = response.status;
      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      stepResult.status_code = statusCode;
      stepResult.response = responseData;
      stepResult.success = statusCode >= 200 && statusCode < 300;
      stepResult.completed_at = new Date().toISOString();

      // Validate Fullbay-specific responses
      if (stepResult.success && responseData) {
        stepResult.fullbay_validation = this.validateFullbayResponse(step.action, responseData);
      }

      if (!stepResult.success) {
        throw new Error(`HTTP ${statusCode}: ${responseText.substring(0, 200)}`);
      }

      console.log(`[${this.name}]     ✓ ${statusCode} ${step.action}`);

    } catch (error) {
      stepResult.failed_at = new Date().toISOString();
      stepResult.error = error.message;
      console.error(`[${this.name}]     ✗ ${step.action}: ${error.message}`);
      throw error;
    }

    return stepResult;
  }

  /**
   * Validate Fullbay-specific response fields
   */
  validateFullbayResponse(action, response) {
    const validation = {
      has_fullbay_id: false,
      has_customer_id: false,
      has_unit_id: false,
      has_invoice_id: false,
      has_sync_status: false,
      has_mapping: false,
      valid: false
    };

    if (action.includes('customer-sync')) {
      validation.has_fullbay_id = !!response.fullbay_customer_id;
      validation.has_customer_id = !!response.zoho_customer_id || !!response.customer_id;
      validation.has_sync_status = !!response.sync_status;
    }

    if (action.includes('unit-sync') || action.includes('unit-tracking')) {
      validation.has_fullbay_id = !!response.fullbay_unit_id;
      validation.has_unit_id = !!response.zoho_unit_id || !!response.generator_asset_id;
      validation.has_sync_status = !!response.sync_status;
    }

    if (action.includes('invoice-sync')) {
      validation.has_fullbay_id = !!response.fullbay_invoice_id;
      validation.has_invoice_id = !!response.zoho_invoice_id || !!response.invoice_id;
      validation.has_sync_status = !!response.sync_status;
    }

    if (action.includes('mapping') || action.includes('link')) {
      validation.has_mapping = !!response.fullbay_id && !!response.zoho_id;
    }

    validation.valid = Object.values(validation).some(v => v === true);

    return validation;
  }

  async saveEvidence(workflowId, evidence) {
    const filename = `${workflowId}-${Date.now()}.json`;
    const filepath = path.join(this.evidenceDir, filename);
    await fs.writeFile(filepath, JSON.stringify(evidence, null, 2));
    console.log(`[${this.name}]   Evidence saved: ${filename}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const agent = new FullbayIntegrationAgent();

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

module.exports = FullbayIntegrationAgent;
