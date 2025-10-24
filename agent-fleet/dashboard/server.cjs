#!/usr/bin/env node
/**
 * Simple Dashboard Server
 * Serves static dashboard and provides API for agent status
 */

const express = require('express');
const path = require('path');
const {
  readCoordinationFile,
  getFailureQueue,
  getMergeLog
} = require('../lib/coordination.cjs');

const app = express();
const PORT = 3003;

// Serve static files from dashboard directory
app.use(express.static(__dirname));

/**
 * API: Get all agent statuses
 */
app.get('/api/agents', async (req, res) => {
  try {
    const uiAgents = await readCoordinationFile('agent-status/ui-agents.json') || [];
    const apiAgents = await readCoordinationFile('agent-status/api-agents.json') || [];
    const integrationAgents = await readCoordinationFile('agent-status/integration-agents.json') || [];
    const sentinel = await readCoordinationFile('agent-status/sentinel.json') || {};

    res.json({
      ui: Array.isArray(uiAgents) ? uiAgents : [],
      api: Array.isArray(apiAgents) ? apiAgents : [],
      integration: Array.isArray(integrationAgents) ? integrationAgents : [],
      sentinel: sentinel
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Get failure queue
 */
app.get('/api/failures', async (req, res) => {
  try {
    const uiFailures = await getFailureQueue('ui');
    const apiFailures = await getFailureQueue('api');
    const integrationFailures = await getFailureQueue('integration');

    res.json({
      ui: uiFailures,
      api: apiFailures,
      integration: integrationFailures,
      total: uiFailures.length + apiFailures.length + integrationFailures.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Get merge log
 */
app.get('/api/merges', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const merges = await getMergeLog(limit);
    res.json(merges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Get fleet summary
 */
app.get('/api/summary', async (req, res) => {
  try {
    const uiAgents = await readCoordinationFile('agent-status/ui-agents.json') || [];
    const apiAgents = await readCoordinationFile('agent-status/api-agents.json') || [];
    const integrationAgents = await readCoordinationFile('agent-status/integration-agents.json') || [];

    const allAgents = [...(Array.isArray(uiAgents) ? uiAgents : []),
                       ...(Array.isArray(apiAgents) ? apiAgents : []),
                       ...(Array.isArray(integrationAgents) ? integrationAgents : [])];

    const uiFailures = await getFailureQueue('ui');
    const apiFailures = await getFailureQueue('api');
    const integrationFailures = await getFailureQueue('integration');
    const allFailures = [...uiFailures, ...apiFailures, ...integrationFailures];

    const summary = {
      agents: {
        total: allAgents.length,
        active: allAgents.filter(a => a.status === 'active').length,
        idle: allAgents.filter(a => a.status === 'idle').length,
        crashed: allAgents.filter(a => a.status === 'crashed').length
      },
      failures: {
        total: allFailures.length,
        critical: allFailures.filter(f => f.severity === 'critical').length,
        high: allFailures.filter(f => f.severity === 'high').length,
        claimed: allFailures.filter(f => f.claimed_by).length,
        unclaimed: allFailures.filter(f => !f.claimed_by).length
      },
      tests: {
        total: allAgents.reduce((sum, a) => sum + (a.workflows_tested || 0), 0),
        failures_found: allAgents.reduce((sum, a) => sum + (a.failures_found || 0), 0),
        failures_fixed: allAgents.reduce((sum, a) => sum + (a.failures_fixed || 0), 0)
      }
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  AUTONOMOUS TEST FLEET - DASHBOARD                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Dashboard server running on http://localhost:${PORT}`);
  console.log(`   Open in browser to view live agent status\n`);
});
