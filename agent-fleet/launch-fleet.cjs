#!/usr/bin/env node
/**
 * Fleet Launcher
 * Spawns multiple autonomous test agents in parallel
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const AGENTS_DIR = path.join(__dirname, 'agents');
const LOGS_DIR = path.join(__dirname, '../agent-logs');

// Fleet configuration - 16 Total Agents
const FLEET_CONFIG = {
  // UI agents (8 agents with Chrome instances)
  'ui-core': {
    script: 'ui-core.cjs',
    name: 'UI-Core-Workflow-Agent',
    enabled: true
  },
  'ui-multi-unit': {
    script: 'ui-multi-unit.cjs',
    name: 'UI-Multi-Unit-Agent',
    enabled: true
  },
  'ui-service-selection': {
    script: 'ui-service-selection.cjs',
    name: 'UI-Service-Selection-Agent',
    enabled: true
  },
  'ui-pdf-generation': {
    script: 'ui-pdf-generation.cjs',
    name: 'UI-PDF-Generation-Agent',
    enabled: true
  },
  'ui-customer-search': {
    script: 'ui-customer-search.cjs',
    name: 'UI-Customer-Search-Agent',
    enabled: true
  },
  'ui-quote-revisions': {
    script: 'ui-quote-revisions.cjs',
    name: 'UI-Quote-Revisions-Agent',
    enabled: true
  },
  'ui-settings-validation': {
    script: 'ui-settings-validation.cjs',
    name: 'UI-Settings-Validation-Agent',
    enabled: true
  },

  // API agents (4 agents, HTTP-based)
  'api-core': {
    script: 'api-core-endpoints.cjs',
    name: 'API-Core-Endpoints-Agent',
    enabled: true
  },
  'api-zoho': {
    script: 'api-zoho-endpoints.cjs',
    name: 'API-Zoho-Endpoints-Agent',
    enabled: true
  },
  'api-enrichment': {
    script: 'api-enrichment-services.cjs',
    name: 'API-Enrichment-Services-Agent',
    enabled: true
  },
  'api-multi-unit': {
    script: 'api-multi-unit-endpoints.cjs',
    name: 'API-Multi-Unit-Endpoints-Agent',
    enabled: true
  },

  // Integration agents (3 agents, HTTP-based)
  'zoho-crm': {
    script: 'zoho-crm-agent.cjs',
    name: 'Zoho-CRM-Integration-Agent',
    enabled: true
  },
  'zoho-books': {
    script: 'zoho-books-agent.cjs',
    name: 'Zoho-Books-Integration-Agent',
    enabled: true
  },
  'fullbay': {
    script: 'fullbay-integration.cjs',
    name: 'Fullbay-Integration-Agent',
    enabled: true
  },

  // Oversight agents (1 agent, git monitoring)
  'regression-sentinel': {
    script: 'regression-sentinel.cjs',
    name: 'Regression-Sentinel-Agent',
    enabled: false  // Disabled by default (enable for CI/CD)
  }
};

class FleetLauncher {
  constructor() {
    this.agents = [];
    this.running = true;
  }

  /**
   * Launch all enabled agents in parallel
   */
  async launchFleet() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  AUTONOMOUS TEST FLEET LAUNCHER                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const enabledAgents = Object.entries(FLEET_CONFIG)
      .filter(([key, config]) => config.enabled);

    console.log(`Launching ${enabledAgents.length} agents in parallel...\n`);

    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Spawn all agents in parallel
    for (const [agentKey, config] of enabledAgents) {
      this.spawnAgent(agentKey, config);
      await this.sleep(1000); // Stagger launches to avoid port conflicts
    }

    console.log(`\n✅ Fleet launched: ${this.agents.length} agents running\n`);
    console.log('Agents will run autonomously until:');
    console.log('  - All workflows complete');
    console.log('  - Manual termination (Ctrl+C)');
    console.log('  - Fatal error\n');

    console.log('Monitor fleet status:');
    console.log('  - Dashboard: http://localhost:3003');
    console.log('  - CLI: node agent-fleet/fleet-status.cjs');
    console.log('  - Logs: agent-logs/*.log\n');

    console.log('Press Ctrl+C to terminate entire fleet\n');
    console.log('─'.repeat(60));

    // Wait for all agents to complete
    await this.waitForFleet();
  }

  /**
   * Spawn a single agent
   */
  spawnAgent(agentKey, config) {
    const agentScript = path.join(AGENTS_DIR, config.script);

    if (!fs.existsSync(agentScript)) {
      console.error(`❌ Agent script not found: ${agentScript}`);
      return;
    }

    console.log(`🚀 Spawning: ${config.name}`);

    // Create log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(LOGS_DIR, `${agentKey}-${timestamp}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // Spawn agent process
    const child = spawn('node', [agentScript], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    console.log(`   PID: ${child.pid}`);
    console.log(`   Log: ${logFile}`);

    // Track agent
    this.agents.push({
      key: agentKey,
      name: config.name,
      process: child,
      pid: child.pid,
      logStream
    });

    // Pipe output to log
    child.stdout.on('data', (data) => {
      logStream.write(data);
      // Optionally echo to console (can be very verbose)
      // process.stdout.write(`[${agentKey}] ${data}`);
    });

    child.stderr.on('data', (data) => {
      logStream.write(`[STDERR] ${data}`);
      process.stderr.write(`[${agentKey} ERROR] ${data}`);
    });

    child.on('close', (code) => {
      console.log(`\n[${config.name}] Exited with code ${code}`);
      logStream.end();

      // Remove from active agents
      this.agents = this.agents.filter(a => a.pid !== child.pid);

      // If all agents done, exit
      if (this.agents.length === 0 && this.running) {
        console.log('\n✅ All agents completed\n');
        process.exit(0);
      }
    });

    child.on('error', (error) => {
      console.error(`\n[${config.name}] Spawn error:`, error.message);
      logStream.write(`[ERROR] ${error.message}\n`);
      logStream.end();
    });
  }

  /**
   * Wait for all agents to complete or user interruption
   */
  async waitForFleet() {
    return new Promise((resolve) => {
      // Agents will exit on their own or be killed by SIGINT handler
      // This promise never resolves naturally - process exits via signals
    });
  }

  /**
   * Terminate all agents
   */
  async terminateFleet() {
    console.log('\n\n🛑 Terminating entire fleet...\n');

    for (const agent of this.agents) {
      console.log(`   Stopping ${agent.name} (PID ${agent.pid})`);
      try {
        agent.process.kill('SIGTERM');
        agent.logStream.end();
      } catch (error) {
        console.error(`   Failed to stop ${agent.name}:`, error.message);
      }
    }

    // Wait for graceful shutdown
    await this.sleep(2000);

    // Force kill any remaining
    for (const agent of this.agents) {
      if (!agent.process.killed) {
        console.log(`   Force killing ${agent.name}`);
        try {
          agent.process.kill('SIGKILL');
        } catch (error) {}
      }
    }

    console.log('\n✅ Fleet terminated\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main
async function main() {
  const launcher = new FleetLauncher();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    launcher.running = false;
    await launcher.terminateFleet();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    launcher.running = false;
    await launcher.terminateFleet();
    process.exit(0);
  });

  await launcher.launchFleet();
}

if (require.main === module) {
  main();
}

module.exports = FleetLauncher;
