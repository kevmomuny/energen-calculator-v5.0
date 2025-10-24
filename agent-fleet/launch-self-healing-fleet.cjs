#!/usr/bin/env node

/**
 * LAUNCH-SELF-HEALING-FLEET
 *
 * Launches the complete autonomous self-healing cycle.
 *
 * Fleet components (6 agents):
 * 1. Fix-Fleet-Coordinator - Routes bugs from evidence to analysis
 * 2. Code-Analysis-Agent - Analyzes root causes with confidence scoring
 * 3. Fix-Generator-Agent - Generates code patches from analyses
 * 4. Branch-Validator-Agent - Validates patches on isolated git branches
 * 5. Commit-Agent - Merges validated patches to main in batches
 * 6. Fleet-Orchestrator - Coordinates pipeline + triggers re-test cycle
 *
 * Complete Autonomous Cycle:
 * Evidence → Analysis → Patch → Validate → Merge → Re-test → Repeat
 *
 * Usage:
 *   node agent-fleet/launch-self-healing-fleet.cjs
 */

const { spawn } = require('child_process');
const path = require('path');

const AGENTS = [
  {
    name: 'Fix-Fleet-Coordinator',
    script: 'fix-fleet-coordinator.cjs',
    delay: 0,
    description: 'Routes bugs from evidence to analysis queue'
  },
  {
    name: 'Code-Analysis-Agent',
    script: 'code-analysis-agent.cjs',
    delay: 2000,
    description: 'Analyzes root causes with confidence scoring'
  },
  {
    name: 'Fix-Generator-Agent',
    script: 'fix-generator-agent.cjs',
    delay: 4000,
    description: 'Generates code patches from analyses'
  },
  {
    name: 'Branch-Validator-Agent',
    script: 'branch-validator-agent.cjs',
    delay: 6000,
    description: 'Validates patches on isolated git branches'
  },
  {
    name: 'Commit-Agent',
    script: 'commit-agent.cjs',
    delay: 8000,
    description: 'Merges validated patches to main branch'
  },
  {
    name: 'Fleet-Orchestrator',
    script: 'fleet-orchestrator.cjs',
    delay: 10000,
    description: 'Coordinates pipeline + triggers re-test cycle'
  }
];

const agents = [];

console.log(`
╔═══════════════════════════════════════════════════════════╗
║     AUTONOMOUS SELF-HEALING FLEET LAUNCHER                ║
╚═══════════════════════════════════════════════════════════╝

Launching complete autonomous cycle (6 agents):
`);

async function launchAgent(config) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const scriptPath = path.join(__dirname, config.script);

      console.log(`🚀 Launching: ${config.name}`);
      console.log(`   ${config.description}`);

      const agent = spawn('node', [scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..')
      });

      // Log stdout
      agent.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        lines.forEach(line => {
          console.log(`[${config.name}] ${line}`);
        });
      });

      // Log stderr
      agent.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        lines.forEach(line => {
          console.error(`[${config.name}] ERROR: ${line}`);
        });
      });

      // Handle exit
      agent.on('exit', (code) => {
        console.log(`❌ ${config.name} exited with code ${code}`);
      });

      agents.push({ name: config.name, process: agent });

      resolve();
    }, config.delay);
  });
}

async function launchFleet() {
  for (const config of AGENTS) {
    await launchAgent(config);
  }

  console.log(`
═══════════════════════════════════════════════════════════
✅ All ${agents.length} agents launched successfully!

Complete Autonomous Cycle:
  1. Fix-Fleet-Coordinator → Monitors evidence, routes bugs
  2. Code-Analysis-Agent   → Analyzes root causes, scores confidence
  3. Fix-Generator-Agent   → Generates code patches (80%+ auto-validated)
  4. Branch-Validator-Agent → Validates on isolated git branches
  5. Commit-Agent          → Merges validated patches to main
  6. Fleet-Orchestrator    → Coordinates pipeline + re-test cycle

Self-Healing Loop:
  Detect → Fix → Validate → Merge → Re-test → Detect (repeat)

Press Ctrl+C to stop the fleet.
═══════════════════════════════════════════════════════════
`);
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down self-healing fleet...');

  agents.forEach(agent => {
    console.log(`   Stopping ${agent.name}...`);
    agent.process.kill('SIGTERM');
  });

  setTimeout(() => {
    console.log('\n✅ Self-healing fleet shutdown complete');
    process.exit(0);
  }, 2000);
});

// Launch the fleet
launchFleet().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
