#!/usr/bin/env node
/**
 * Simple Watchdog Process
 * Monitors agent heartbeats and detects crashed agents
 */

const { readCoordinationFile } = require('./lib/coordination.cjs');

const HEARTBEAT_TIMEOUT_MS = 120000; // 2 minutes
const CHECK_INTERVAL_MS = 60000; // Check every minute

let checkCount = 0;

async function checkAgentHeartbeats() {
  checkCount++;
  console.log(`\n[${new Date().toISOString()}] Watchdog check #${checkCount}`);

  try {
    // Read all agent statuses
    const uiAgents = await readCoordinationFile('agent-status/ui-agents.json') || [];
    const apiAgents = await readCoordinationFile('agent-status/api-agents.json') || [];
    const integrationAgents = await readCoordinationFile('agent-status/integration-agents.json') || [];

    const allAgents = [
      ...(Array.isArray(uiAgents) ? uiAgents : []),
      ...(Array.isArray(apiAgents) ? apiAgents : []),
      ...(Array.isArray(integrationAgents) ? integrationAgents : [])
    ];

    if (allAgents.length === 0) {
      console.log('ℹ️  No agents registered yet');
      return;
    }

    const now = Date.now();
    let healthyCount = 0;
    let suspectCount = 0;

    for (const agent of allAgents) {
      if (!agent.last_heartbeat) {
        console.log(`⚠️  ${agent.agent}: No heartbeat recorded`);
        continue;
      }

      const lastBeat = new Date(agent.last_heartbeat).getTime();
      const timeSinceLastBeat = now - lastBeat;

      if (timeSinceLastBeat > HEARTBEAT_TIMEOUT_MS) {
        console.log(`🔴 ${agent.agent}: CRASHED (no heartbeat for ${Math.round(timeSinceLastBeat / 1000)}s)`);
        console.log(`   Last seen: ${agent.last_heartbeat}`);
        console.log(`   Last task: ${agent.current_task || 'unknown'}`);
        console.log(`   PID: ${agent.pid || 'unknown'}`);
        console.log(`   → Agent restart would be triggered here`);
        suspectCount++;
      } else {
        healthyCount++;
      }
    }

    console.log(`\n✅ Healthy: ${healthyCount} | 🔴 Suspect: ${suspectCount} | Total: ${allAgents.length}`);

  } catch (error) {
    console.error('❌ Watchdog error:', error.message);
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  AUTONOMOUS TEST FLEET - WATCHDOG                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`Monitoring agent heartbeats every ${CHECK_INTERVAL_MS / 1000}s`);
  console.log(`Timeout threshold: ${HEARTBEAT_TIMEOUT_MS / 1000}s\n`);
  console.log('Press Ctrl+C to stop\n');

  // Initial check
  await checkAgentHeartbeats();

  // Periodic checks
  setInterval(checkAgentHeartbeats, CHECK_INTERVAL_MS);
}

main();
