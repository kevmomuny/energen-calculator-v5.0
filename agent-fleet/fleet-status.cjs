#!/usr/bin/env node
/**
 * Fleet Status CLI
 * Simple command-line tool to view agent fleet status
 */

const {
  readCoordinationFile,
  getFailureQueue,
  getMergeLog
} = require('./lib/coordination.cjs');

async function showAgentStatus() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  AGENT FLEET STATUS                                       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Read all agents
  const uiAgents = await readCoordinationFile('agent-status/ui-agents.json') || [];
  const apiAgents = await readCoordinationFile('agent-status/api-agents.json') || [];
  const integrationAgents = await readCoordinationFile('agent-status/integration-agents.json') || [];

  const allAgents = [
    ...(Array.isArray(uiAgents) ? uiAgents : []),
    ...(Array.isArray(apiAgents) ? apiAgents : []),
    ...(Array.isArray(integrationAgents) ? integrationAgents : [])
  ];

  if (allAgents.length === 0) {
    console.log('ℹ️  No agents registered\n');
    return;
  }

  // UI Layer
  if (uiAgents.length > 0) {
    console.log('● UI Layer (' + uiAgents.length + ' agents)');
    for (const agent of uiAgents) {
      const status = getStatusIcon(agent.status);
      console.log(`  ${status} ${agent.agent.padEnd(25)} | ${agent.status.padEnd(10)} | Workflows: ${agent.workflows_tested || 0}`);
    }
    console.log('');
  }

  // API Layer
  if (apiAgents.length > 0) {
    console.log('● API Layer (' + apiAgents.length + ' agents)');
    for (const agent of apiAgents) {
      const status = getStatusIcon(agent.status);
      console.log(`  ${status} ${agent.agent.padEnd(25)} | ${agent.status.padEnd(10)} | Workflows: ${agent.workflows_tested || 0}`);
    }
    console.log('');
  }

  // Integration Layer
  if (integrationAgents.length > 0) {
    console.log('● Integration Layer (' + integrationAgents.length + ' agents)');
    for (const agent of integrationAgents) {
      const status = getStatusIcon(agent.status);
      console.log(`  ${status} ${agent.agent.padEnd(25)} | ${agent.status.padEnd(10)} | Workflows: ${agent.workflows_tested || 0}`);
    }
    console.log('');
  }

  // Summary
  console.log('SUMMARY');
  console.log('─────────────────────────────────────────────────────────');

  const totalWorkflows = allAgents.reduce((sum, a) => sum + (a.workflows_tested || 0), 0);
  const totalFailures = allAgents.reduce((sum, a) => sum + (a.failures_found || 0), 0);
  const totalFixed = allAgents.reduce((sum, a) => sum + (a.failures_fixed || 0), 0);

  console.log(`Total Agents:       ${allAgents.length}`);
  console.log(`Workflows Tested:   ${totalWorkflows}`);
  console.log(`Failures Found:     ${totalFailures}`);
  console.log(`Failures Fixed:     ${totalFixed}`);

  if (totalFailures > 0) {
    const fixRate = Math.round(totalFixed / totalFailures * 100);
    console.log(`Fix Rate:           ${fixRate}%`);
  }

  console.log('');
}

async function showFailures() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  FAILURE QUEUE                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const uiFailures = await getFailureQueue('ui');
  const apiFailures = await getFailureQueue('api');
  const integrationFailures = await getFailureQueue('integration');

  const allFailures = [...uiFailures, ...apiFailures, ...integrationFailures];

  if (allFailures.length === 0) {
    console.log('✅ No failures in queue!\n');
    return;
  }

  // Group by severity
  const critical = allFailures.filter(f => f.severity === 'critical');
  const high = allFailures.filter(f => f.severity === 'high');
  const medium = allFailures.filter(f => f.severity === 'medium');
  const low = allFailures.filter(f => f.severity === 'low');

  if (critical.length > 0) {
    console.log('🔴 CRITICAL (' + critical.length + ')');
    critical.forEach(f => printFailure(f));
    console.log('');
  }

  if (high.length > 0) {
    console.log('🟠 HIGH (' + high.length + ')');
    high.forEach(f => printFailure(f));
    console.log('');
  }

  if (medium.length > 0) {
    console.log('🟡 MEDIUM (' + medium.length + ')');
    medium.forEach(f => printFailure(f));
    console.log('');
  }

  if (low.length > 0) {
    console.log('🟢 LOW (' + low.length + ')');
    low.forEach(f => printFailure(f));
    console.log('');
  }

  console.log(`Total failures: ${allFailures.length} | Claimed: ${allFailures.filter(f => f.claimed_by).length} | Unclaimed: ${allFailures.filter(f => !f.claimed_by).length}\n`);
}

async function showMerges() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  RECENT MERGES                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const merges = await getMergeLog(10);

  if (merges.length === 0) {
    console.log('ℹ️  No merges recorded\n');
    return;
  }

  merges.slice(-10).reverse().forEach(merge => {
    const icon = merge.rollback ? '⏪' : '✅';
    const status = merge.rollback ? 'ROLLED BACK' : 'MERGED';
    console.log(`${icon} ${merge.merge_sha.substring(0, 7)} | ${status.padEnd(12)} | ${merge.agent}`);
    if (merge.rollback) {
      console.log(`   Reason: ${merge.reason}`);
    }
  });

  console.log('');
}

function getStatusIcon(status) {
  switch (status) {
    case 'active': return '✅';
    case 'idle': return '⏸️';
    case 'testing': return '🧪';
    case 'fixing': return '🔧';
    case 'crashed': return '🔴';
    default: return '❓';
  }
}

function printFailure(failure) {
  const claimed = failure.claimed_by ? `[CLAIMED by ${failure.claimed_by}]` : '[UNCLAIMED]';
  console.log(`  ${failure.failure_id}: ${failure.workflow} ${claimed}`);
  if (failure.root_cause) {
    console.log(`    └─ ${failure.root_cause.substring(0, 80)}${failure.root_cause.length > 80 ? '...' : ''}`);
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'failures':
    case 'f':
      await showFailures();
      break;
    case 'merges':
    case 'm':
      await showMerges();
      break;
    case 'help':
    case 'h':
      console.log('\nFleet Status CLI\n');
      console.log('Commands:');
      console.log('  node fleet-status.cjs           Show agent status (default)');
      console.log('  node fleet-status.cjs failures  Show failure queue');
      console.log('  node fleet-status.cjs merges    Show recent merges');
      console.log('  node fleet-status.cjs help      Show this help\n');
      break;
    default:
      await showAgentStatus();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
