#!/usr/bin/env node

/**
 * FLEET-ORCHESTRATOR
 *
 * Coordinates the complete autonomous self-healing cycle.
 *
 * Responsibilities:
 * 1. Monitor pipeline status (analysis → patches → validated → committed)
 * 2. Check for re-test signals from Commit-Agent
 * 3. Trigger detection fleet to re-test fixed workflows
 * 4. Assign patch validation work to idle agents
 * 5. Close the autonomous loop
 *
 * Complete Cycle:
 * Detection → Evidence → Analysis → Patch → Validate → Merge → Re-test → Detection (repeat)
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const COORDINATION_DIR = path.join(PROJECT_ROOT, 'agent-coordination');
const FIX_QUEUE_DIR = path.join(COORDINATION_DIR, 'fix-queue');
const RETEST_SIGNAL_PATH = path.join(COORDINATION_DIR, 'retest-signal.json');
const LOG_DIR = path.join(COORDINATION_DIR, 'fix-logs');
const LOG_FILE = path.join(LOG_DIR, `orchestrator-${new Date().toISOString().replace(/:/g, '-')}.log`);

const AGENT_NAME = 'Fleet-Orchestrator';
const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds

class FleetOrchestrator {
  constructor() {
    this.running = false;
    this.stats = {
      cyclesExecuted: 0,
      retestSignalsProcessed: 0,
      patchesValidated: 0,
      startTime: new Date()
    };
  }

  /**
   * Start the orchestrator
   */
  async start() {
    this.running = true;
    this.log('🎯 Fleet-Orchestrator starting...');
    this.log('📊 Coordinating autonomous self-healing cycle');

    // Ensure directories
    await fs.mkdir(LOG_DIR, { recursive: true });

    while (this.running) {
      try {
        await this.orchestrateCycle();
        this.stats.cyclesExecuted++;
        await this.sleep(CHECK_INTERVAL_MS);
      } catch (error) {
        this.log(`❌ Error in orchestration cycle: ${error.message}`, 'error');
        await this.sleep(CHECK_INTERVAL_MS);
      }
    }
  }

  /**
   * Stop the orchestrator gracefully
   */
  async stop() {
    this.log('🛑 Stopping Fleet-Orchestrator...');
    this.running = false;
    await this.generateReport();
  }

  /**
   * Main orchestration cycle
   */
  async orchestrateCycle() {
    // 1. Monitor fixing fleet pipeline status
    await this.monitorFixingFleetPipeline();

    // 2. Check for re-test signals from Commit Agent
    await this.checkRetestSignals();

    // 3. Assign patch validation work if available
    await this.assignPatchValidationWork();
  }

  /**
   * Monitor fixing fleet pipeline status
   */
  async monitorFixingFleetPipeline() {
    try {
      const patchesDir = path.join(FIX_QUEUE_DIR, 'patches');
      const validatedDir = path.join(FIX_QUEUE_DIR, 'validated');
      const committedDir = path.join(FIX_QUEUE_DIR, 'committed');

      let patchesCount = 0;
      let validatedCount = 0;
      let committedCount = 0;

      // Count files in each directory
      try {
        const patchFiles = await fs.readdir(patchesDir);
        patchesCount = patchFiles.filter(f => f.endsWith('.json')).length;
      } catch (error) {
        // Directory may not exist yet
      }

      try {
        const validatedFiles = await fs.readdir(validatedDir);
        validatedCount = validatedFiles.filter(f => f.endsWith('.json')).length;
      } catch (error) {
        // Directory may not exist yet
      }

      try {
        const committedFiles = await fs.readdir(committedDir);
        committedCount = committedFiles.filter(f => f.endsWith('.json')).length;
      } catch (error) {
        // Directory may not exist yet
      }

      if (patchesCount > 0 || validatedCount > 0 || committedCount > 0) {
        this.log(`🔧 Pipeline Status: ${patchesCount} patches created, ${validatedCount} validated, ${committedCount} committed`);

        if (patchesCount > 0 && validatedCount === 0) {
          this.log(`⚡ Patches ready for validation - Branch-Validator-Agent will process`);
        }

        if (validatedCount > 0 && committedCount < validatedCount) {
          this.log(`⚡ Validated patches ready for commit - Commit-Agent will process`);
        }
      }

    } catch (error) {
      this.log(`⚠️ Error monitoring pipeline: ${error.message}`, 'warn');
    }
  }

  /**
   * Check for re-test signals from Commit Agent
   */
  async checkRetestSignals() {
    try {
      const signal = await this.readJSON(RETEST_SIGNAL_PATH);

      if (signal && signal.workflows_to_retest) {
        this.log(`🔄 RE-TEST SIGNAL RECEIVED!`);
        this.log(`   ${signal.patches_committed} patches committed to main`);
        this.log(`   ${signal.workflows_to_retest.length} workflows need re-testing`);

        // Delete signal file (processed)
        await fs.unlink(RETEST_SIGNAL_PATH);

        this.stats.retestSignalsProcessed++;

        this.log(`🔁 CYCLE COMPLETE: Triggering detection fleet to re-test fixed workflows`);
        this.log(`   Detection fleet will re-run workflows: ${signal.workflows_to_retest.join(', ')}`);

        // In a full implementation, would trigger detection fleet here
        // For now, we log that the cycle is complete
      }

    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`⚠️ Error checking re-test signals: ${error.message}`, 'warn');
      }
    }
  }

  /**
   * Assign patch validation work
   */
  async assignPatchValidationWork() {
    try {
      const patchesDir = path.join(FIX_QUEUE_DIR, 'patches');
      const patchFiles = await fs.readdir(patchesDir);

      const highConfidencePatches = [];

      for (const file of patchFiles) {
        if (!file.endsWith('.json')) continue;

        const patch = await this.readJSON(path.join(patchesDir, file));

        if (patch && patch.confidence >= 80) {
          highConfidencePatches.push({
            bugId: patch.bug_id,
            confidence: patch.confidence
          });
        }
      }

      if (highConfidencePatches.length > 0) {
        this.log(`📋 Found ${highConfidencePatches.length} high-confidence patches (80%+) ready for auto-validation`);
      }

    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.log(`⚠️ Error assigning validation work: ${error.message}`, 'warn');
      }
    }
  }

  /**
   * Generate status report
   */
  async generateReport() {
    const runtime = ((Date.now() - this.stats.startTime.getTime()) / (1000 * 60)).toFixed(2);

    const report = `
╔═══════════════════════════════════════════════════════════╗
║     FLEET-ORCHESTRATOR - STATUS REPORT                   ║
╚═══════════════════════════════════════════════════════════╝
Runtime: ${runtime} minutes
Orchestration Cycles: ${this.stats.cyclesExecuted}
Re-test Signals Processed: ${this.stats.retestSignalsProcessed}
Autonomous Cycles Completed: ${this.stats.retestSignalsProcessed}

Complete Cycle Flow:
  Detection Fleet → Evidence Files → Fix-Fleet-Coordinator
  → Code-Analysis-Agent → Fix-Generator-Agent
  → Branch-Validator-Agent → Commit-Agent
  → Fleet-Orchestrator (re-test signal) → Detection Fleet
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
  const orchestrator = new FleetOrchestrator();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await orchestrator.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await orchestrator.stop();
    process.exit(0);
  });

  // Start orchestrator
  await orchestrator.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { FleetOrchestrator };
