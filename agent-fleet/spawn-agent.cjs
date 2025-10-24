#!/usr/bin/env node
/**
 * Agent Spawner
 * Utility to spawn autonomous test agents as separate processes
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const AGENTS_DIR = path.join(__dirname, 'agents');
const LOGS_DIR = path.join(__dirname, '../agent-logs');

// Available agents - 16 Total
const AVAILABLE_AGENTS = {
  // UI Agents (8)
  'ui-core': {
    script: 'ui-core.cjs',
    name: 'UI-Core-Workflow-Agent',
    description: 'Tests core UI workflows (quote creation, service selection)'
  },
  'ui-multi-unit': {
    script: 'ui-multi-unit.cjs',
    name: 'UI-Multi-Unit-Agent',
    description: 'Tests multi-unit quote workflows'
  },
  'ui-service-selection': {
    script: 'ui-service-selection.cjs',
    name: 'UI-Service-Selection-Agent',
    description: 'Tests service selection workflows (A-J, K, Custom)'
  },
  'ui-pdf-generation': {
    script: 'ui-pdf-generation.cjs',
    name: 'UI-PDF-Generation-Agent',
    description: 'Tests PDF generation workflows'
  },
  'ui-customer-search': {
    script: 'ui-customer-search.cjs',
    name: 'UI-Customer-Search-Agent',
    description: 'Tests customer search and enrichment workflows'
  },
  'ui-quote-revisions': {
    script: 'ui-quote-revisions.cjs',
    name: 'UI-Quote-Revisions-Agent',
    description: 'Tests quote revision workflows'
  },
  'ui-settings-validation': {
    script: 'ui-settings-validation.cjs',
    name: 'UI-Settings-Validation-Agent',
    description: 'Tests settings validation workflows'
  },

  // API Agents (4)
  'api-core': {
    script: 'api-core-endpoints.cjs',
    name: 'API-Core-Endpoints-Agent',
    description: 'Tests core API endpoints (calculate, PDF generation, health)'
  },
  'api-zoho': {
    script: 'api-zoho-endpoints.cjs',
    name: 'API-Zoho-Endpoints-Agent',
    description: 'Tests Zoho API endpoints (CRM, Books, Inventory, OAuth)'
  },
  'api-enrichment': {
    script: 'api-enrichment-services.cjs',
    name: 'API-Enrichment-Services-Agent',
    description: 'Tests enrichment API endpoints (Google Places, logo, tax)'
  },
  'api-multi-unit': {
    script: 'api-multi-unit-endpoints.cjs',
    name: 'API-Multi-Unit-Endpoints-Agent',
    description: 'Tests multi-unit quote API endpoints'
  },

  // Integration Agents (3)
  'zoho-crm': {
    script: 'zoho-crm-agent.cjs',
    name: 'Zoho-CRM-Integration-Agent',
    description: 'Tests Zoho CRM integration (account creation, quote sync)'
  },
  'zoho-books': {
    script: 'zoho-books-agent.cjs',
    name: 'Zoho-Books-Integration-Agent',
    description: 'Tests Zoho Books integration (invoice creation, estimates)'
  },
  'fullbay': {
    script: 'fullbay-integration.cjs',
    name: 'Fullbay-Integration-Agent',
    description: 'Tests Fullbay sync (customer sync, invoice sync, unit tracking)'
  },

  // Oversight Agents (1)
  'regression-sentinel': {
    script: 'regression-sentinel.cjs',
    name: 'Regression-Sentinel-Agent',
    description: 'Monitors git merges and auto-reverts broken changes'
  }
};

/**
 * Spawn an agent as a separate process
 */
function spawnAgent(agentKey) {
  const agentConfig = AVAILABLE_AGENTS[agentKey];

  if (!agentConfig) {
    console.error(`❌ Unknown agent: ${agentKey}`);
    console.log('\nAvailable agents:');
    Object.keys(AVAILABLE_AGENTS).forEach(key => {
      console.log(`  - ${key}: ${AVAILABLE_AGENTS[key].description}`);
    });
    process.exit(1);
  }

  const agentScript = path.join(AGENTS_DIR, agentConfig.script);

  if (!fs.existsSync(agentScript)) {
    console.error(`❌ Agent script not found: ${agentScript}`);
    process.exit(1);
  }

  console.log(`\n🚀 Spawning: ${agentConfig.name}`);
  console.log(`   Script: ${agentConfig.script}`);

  // Ensure logs directory exists
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  // Create log file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOGS_DIR, `${agentKey}-${timestamp}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  console.log(`   Logs: ${logFile}\n`);

  // Spawn agent process
  const child = spawn('node', [agentScript], {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  console.log(`✅ Agent spawned with PID: ${child.pid}\n`);

  // Pipe output to both console and log file
  child.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    logStream.write(output);
  });

  child.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    logStream.write(`[STDERR] ${output}`);
  });

  child.on('close', (code) => {
    console.log(`\n[${agentConfig.name}] Process exited with code ${code}`);
    logStream.end();
  });

  child.on('error', (error) => {
    console.error(`\n[${agentConfig.name}] Spawn error:`, error.message);
    logStream.write(`[ERROR] ${error.message}\n`);
    logStream.end();
  });

  // Handle parent process signals
  process.on('SIGINT', () => {
    console.log('\n[SPAWNER] Received SIGINT, terminating agent...');
    child.kill('SIGINT');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    console.log('\n[SPAWNER] Received SIGTERM, terminating agent...');
    child.kill('SIGTERM');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  return child;
}

/**
 * CLI Interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    console.log('\nAgent Spawner - Launch autonomous test agents\n');
    console.log('Usage:');
    console.log('  node spawn-agent.cjs <agent-key>\n');
    console.log('Available agents:');
    Object.keys(AVAILABLE_AGENTS).forEach(key => {
      console.log(`  ${key.padEnd(20)} - ${AVAILABLE_AGENTS[key].description}`);
    });
    console.log('\nExamples:');
    console.log('  node spawn-agent.cjs ui-core');
    console.log('  node spawn-agent.cjs help\n');
    process.exit(0);
  }

  const agentKey = args[0];
  spawnAgent(agentKey);
}

if (require.main === module) {
  main();
}

module.exports = { spawnAgent, AVAILABLE_AGENTS };
