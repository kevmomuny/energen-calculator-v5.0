#!/usr/bin/env node

/**
 * FIX-FLEET-COORDINATOR
 *
 * Routes bugs from evidence files to the analysis queue.
 *
 * Workflow:
 * 1. Monitor agent-coordination/evidence directory for bug evidence
 * 2. Categorize and prioritize bugs
 * 3. Route to agent-coordination/fix-queue/analysis for processing
 * 4. Track processed bugs to avoid duplicates
 *
 * Priority Levels:
 * - Critical UI bugs (Service selection): 85
 * - API endpoint errors: 75
 * - Parameter validation: 70
 * - Other bugs: 65
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const COORDINATION_DIR = path.join(PROJECT_ROOT, 'agent-coordination');
const EVIDENCE_DIR = path.join(COORDINATION_DIR, 'evidence');
const FIX_QUEUE_DIR = path.join(COORDINATION_DIR, 'fix-queue');
const ANALYSIS_QUEUE_DIR = path.join(FIX_QUEUE_DIR, 'analysis');
const STATE_FILE = path.join(FIX_QUEUE_DIR, 'coordinator-state.json');
const LOG_DIR = path.join(COORDINATION_DIR, 'fix-logs');
const LOG_FILE = path.join(LOG_DIR, `coordinator-${new Date().toISOString().replace(/:/g, '-')}.log`);

const AGENT_NAME = 'Fix-Fleet-Coordinator';
const CHECK_INTERVAL_MS = 5000; // Check every 5 seconds

class FixFleetCoordinator {
  constructor() {
    this.running = false;
    this.processedBugs = new Set();
    this.pendingQueue = [];
    this.stats = {
      bugsDiscovered: 0,
      bugsRouted: 0,
      startTime: new Date()
    };
  }

  /**
   * Start the coordinator
   */
  async start() {
    this.running = true;
    this.log('🚀 Fix-Fleet-Coordinator starting...');

    // Ensure directories exist
    await this.ensureDirectories();

    // Load state
    await this.loadState();
    this.log(`📊 Initial state: ${this.processedBugs.size} bugs already processed`);

    // Monitor evidence directory
    this.log(`🔄 Monitoring ${EVIDENCE_DIR} for new bugs every ${CHECK_INTERVAL_MS}ms`);

    while (this.running) {
      try {
        await this.coordinationCycle();
        await this.sleep(CHECK_INTERVAL_MS);
      } catch (error) {
        this.log(`❌ Error in coordination cycle: ${error.message}`, 'error');
        await this.sleep(CHECK_INTERVAL_MS);
      }
    }
  }

  /**
   * Stop the coordinator gracefully
   */
  async stop() {
    this.log('🛑 Stopping Fix-Fleet-Coordinator...');
    this.running = false;
    await this.saveState();
    await this.generateReport();
  }

  /**
   * Main coordination cycle
   */
  async coordinationCycle() {
    // 1. Discover new bugs from evidence
    const newBugs = await this.discoverNewBugs();

    if (newBugs.length > 0) {
      this.log(`🆕 Discovered ${newBugs.length} new bugs`);
      this.stats.bugsDiscovered += newBugs.length;

      // 2. Add to pending queue
      this.pendingQueue.push(...newBugs);
      this.log(`📋 Added ${newBugs.length} bugs to pending queue`);
      this.log(`   Total pending: ${this.pendingQueue.length}`);
    }

    // 3. Route pending bugs to analysis
    await this.routePendingBugs();

    // 4. Save state periodically
    if (this.stats.bugsRouted % 10 === 0 && this.stats.bugsRouted > 0) {
      await this.saveState();
    }
  }

  /**
   * Discover new bugs from evidence directory
   */
  async discoverNewBugs() {
    const newBugs = [];

    try {
      const evidenceFiles = await fs.readdir(EVIDENCE_DIR);

      for (const file of evidenceFiles) {
        if (!file.endsWith('.json')) continue;

        const bugId = file.replace('.json', '');

        // Skip if already processed
        if (this.processedBugs.has(bugId)) continue;

        // Read evidence
        const evidencePath = path.join(EVIDENCE_DIR, file);
        const evidence = await this.readJSON(evidencePath);

        if (!evidence) continue;

        // Categorize and prioritize
        const bug = this.categorizeBug(evidence, bugId);

        newBugs.push(bug);
      }
    } catch (error) {
      this.log(`❌ Error discovering bugs: ${error.message}`, 'error');
    }

    return newBugs;
  }

  /**
   * Categorize bug and assign priority
   */
  categorizeBug(evidence, bugId) {
    let category = 'unknown';
    let priority = 65;

    // Categorize based on workflow type and error patterns
    if (bugId.includes('service-') && bugId.includes('-selection')) {
      category = 'missing_ui_element';
      priority = 85; // Critical UI bug
    } else if (bugId.includes('api-post-') || bugId.includes('api-get-')) {
      category = 'api_endpoint_error';
      priority = bugId.includes('service-price') ? 75 : 65;
    } else if (bugId.includes('calculate')) {
      category = 'parameter_validation';
      priority = 70;
    } else if (bugId.includes('multi-unit') || bugId.includes('quote-creation')) {
      category = 'missing_ui_element';
      priority = 75;
    }

    return {
      bug_id: bugId,
      workflow_id: evidence.workflow_id || bugId,
      category,
      priority,
      evidence,
      discovered_at: new Date().toISOString()
    };
  }

  /**
   * Route pending bugs to analysis queue
   */
  async routePendingBugs() {
    // Route all pending bugs
    while (this.pendingQueue.length > 0) {
      const bug = this.pendingQueue.shift();

      try {
        // Write to analysis queue
        const analysisPath = path.join(ANALYSIS_QUEUE_DIR, `${bug.bug_id}.json`);
        await this.writeJSON(analysisPath, bug);

        this.log(`🔀 Routed bug ${bug.bug_id} to analysis (category: ${bug.category}, priority: ${bug.priority})`);

        // Mark as processed
        this.processedBugs.add(bug.bug_id);
        this.stats.bugsRouted++;

      } catch (error) {
        this.log(`❌ Error routing bug ${bug.bug_id}: ${error.message}`, 'error');
        // Put back in queue
        this.pendingQueue.unshift(bug);
        break;
      }
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [
      COORDINATION_DIR,
      EVIDENCE_DIR,
      FIX_QUEUE_DIR,
      ANALYSIS_QUEUE_DIR,
      path.join(FIX_QUEUE_DIR, 'patches'),
      path.join(FIX_QUEUE_DIR, 'validated'),
      path.join(FIX_QUEUE_DIR, 'committed'),
      path.join(FIX_QUEUE_DIR, 'failed'),
      LOG_DIR
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Load coordinator state
   */
  async loadState() {
    try {
      const state = await this.readJSON(STATE_FILE);
      if (state && state.processedBugs) {
        this.processedBugs = new Set(state.processedBugs);
      }
    } catch (error) {
      this.log(`⚠️ Could not load state: ${error.message}`, 'warn');
    }
  }

  /**
   * Save coordinator state
   */
  async saveState() {
    const state = {
      processedBugs: Array.from(this.processedBugs),
      lastSaved: new Date().toISOString(),
      stats: this.stats
    };

    await this.writeJSON(STATE_FILE, state);
  }

  /**
   * Generate status report
   */
  async generateReport() {
    const runtime = ((Date.now() - this.stats.startTime.getTime()) / (1000 * 60)).toFixed(2);

    const report = `
╔═══════════════════════════════════════════════════════════╗
║     FIX-FLEET-COORDINATOR - STATUS REPORT                 ║
╚═══════════════════════════════════════════════════════════╝
Runtime: ${runtime} minutes
Bugs Discovered: ${this.stats.bugsDiscovered}
Bugs Routed: ${this.stats.bugsRouted}
Pending: ${this.pendingQueue.length}
Total Processed: ${this.processedBugs.size}
═══════════════════════════════════════════════════════════`;

    this.log(report);
    console.log(report);
  }

  /**
   * Read JSON file
   */
  async readJSON(filepath) {
    try {
      const content = await fs.readFile(filepath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Write JSON file atomically
   */
  async writeJSON(filepath, data) {
    const tmpPath = `${filepath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
    await fs.rename(tmpPath, filepath);
  }

  /**
   * Log message
   */
  async log(message, level = 'info') {
    const logLine = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${AGENT_NAME}] ${message}\n`;
    console.log(logLine.trim());

    try {
      await fs.appendFile(LOG_FILE, logLine);
    } catch (error) {
      // Ignore log file errors
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const coordinator = new FixFleetCoordinator();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await coordinator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await coordinator.stop();
    process.exit(0);
  });

  // Start coordinator
  await coordinator.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { FixFleetCoordinator };
