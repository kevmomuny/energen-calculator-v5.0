#!/usr/bin/env node
/**
 * API-Enrichment-Services-Agent
 * Tests enrichment API endpoints (Google Places, logo lookup, tax rate, distance calc)
 */

const BaseAgent = require('./base-agent.cjs');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs').promises;

class APIEnrichmentServicesAgent extends BaseAgent {
  constructor() {
    super({
      name: 'API-Enrichment-Services-Agent',
      layer: 'api'
    });

    this.baseUrl = 'http://localhost:3002';
    this.evidenceDir = path.join(__dirname, '../../agent-coordination/evidence');
  }

  async initialize() {
    await super.initialize();
    await fs.mkdir(this.evidenceDir, { recursive: true });
    console.log(`[${this.name}] Initialized for enrichment API testing`);
  }

  async executeWorkflow(workflow) {
    const startTime = Date.now();

    try {
      console.log(`[${this.name}]   Starting workflow: ${workflow.workflow_id}`);

      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`[${this.name}]     Step ${i + 1}: ${step.action}`);
        await this.executeAPICall(step);
        await this.sleep(200);
      }

      const duration = Date.now() - startTime;
      console.log(`[${this.name}]   Completed in ${duration}ms`);
      return { passed: true, duration_ms: duration };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${this.name}]   Failed: ${error.message}`);
      return { passed: false, duration_ms: duration, error: error.message };
    }
  }

  async executeAPICall(step) {
    const url = `${this.baseUrl}${step.endpoint}`;
    const method = step.method || 'POST';

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (step.body) {
      options.body = JSON.stringify(step.body);
    }

    console.log(`[${this.name}]     ${method} ${step.endpoint}`);

    const response = await fetch(url, options);
    const statusCode = response.status;

    if (statusCode < 200 || statusCode >= 300) {
      const text = await response.text();
      throw new Error(`HTTP ${statusCode}: ${text.substring(0, 100)}`);
    }

    console.log(`[${this.name}]     ✓ ${statusCode}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const agent = new APIEnrichmentServicesAgent();

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

module.exports = APIEnrichmentServicesAgent;
