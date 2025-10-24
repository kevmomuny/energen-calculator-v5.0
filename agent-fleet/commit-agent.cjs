#!/usr/bin/env node

/**
 * COMMIT-AGENT
 *
 * Merges validated patches to main branch and coordinates re-testing.
 *
 * Workflow:
 * 1. Monitor validated/ directory for patches that passed tests
 * 2. Apply validated patches to main branch in batches
 * 3. Create commit with detailed message
 * 4. Signal orchestrator to trigger re-test cycle
 *
 * Safety Features:
 * - Only touches main after validation passes
 * - Batches related fixes together
 * - Detailed commit messages
 * - Automatic re-test triggering
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const COORDINATION_DIR = path.join(PROJECT_ROOT, 'agent-coordination');
const FIX_QUEUE_DIR = path.join(COORDINATION_DIR, 'fix-queue');
const VALIDATED_DIR = path.join(FIX_QUEUE_DIR, 'validated');
const COMMITTED_DIR = path.join(FIX_QUEUE_DIR, 'committed');
const RETEST_SIGNAL_PATH = path.join(COORDINATION_DIR, 'retest-signal.json');
const LOG_DIR = path.join(COORDINATION_DIR, 'fix-logs');
const LOG_FILE = path.join(LOG_DIR, `commit-agent-${new Date().toISOString().replace(/:/g, '-')}.log`);

const AGENT_NAME = 'Commit-Agent';
const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds
const BATCH_SIZE = 10; // Commit up to 10 fixes at once

class CommitAgent {
  constructor() {
    this.running = false;
    this.stats = {
      patchesCommitted: 0,
      batchesCommitted: 0,
      retestSignalsSent: 0,
      startTime: new Date()
    };
  }

  /**
   * Start the commit agent
   */
  async start() {
    this.running = true;
    this.log('📦 Commit-Agent starting...');
    this.log('📂 Monitoring validated patches for commit to main');

    while (this.running) {
      try {
        await this.commitCycle();
        await this.sleep(CHECK_INTERVAL_MS);
      } catch (error) {
        this.log(`❌ Error in commit cycle: ${error.message}`, 'error');
        await this.sleep(CHECK_INTERVAL_MS);
      }
    }
  }

  /**
   * Stop the commit agent gracefully
   */
  async stop() {
    this.log('🛑 Stopping Commit-Agent...');
    this.running = false;
  }

  /**
   * Main commit cycle
   */
  async commitCycle() {
    // Get validated patches ready for commit
    const validatedPatches = await this.getValidatedPatches();

    if (validatedPatches.length === 0) {
      return; // Nothing to commit
    }

    this.log(`📋 Found ${validatedPatches.length} validated patches ready for commit`);

    // Commit in batches
    const batch = validatedPatches.slice(0, BATCH_SIZE);
    await this.commitBatch(batch);
  }

  /**
   * Get validated patches that haven't been committed yet
   */
  async getValidatedPatches() {
    const patches = [];

    try {
      const validatedFiles = await fs.readdir(VALIDATED_DIR);

      for (const file of validatedFiles) {
        if (!file.endsWith('.json')) continue;

        const validatedPath = path.join(VALIDATED_DIR, file);
        const committedPath = path.join(COMMITTED_DIR, file);

        // Check if already committed
        const alreadyCommitted = await this.fileExists(committedPath);

        if (!alreadyCommitted) {
          const patch = await this.readJSON(validatedPath);
          if (patch && patch.ready_for_merge) {
            patches.push({ ...patch, file });
          }
        }
      }
    } catch (error) {
      this.log(`⚠️ Error getting validated patches: ${error.message}`, 'warn');
    }

    return patches;
  }

  /**
   * Commit a batch of validated patches to main
   */
  async commitBatch(patches) {
    this.log(`📦 Committing batch of ${patches.length} patches to main branch`);

    try {
      // 1. Ensure we're on main and it's clean
      await this.ensureMainBranch();
      await this.ensureCleanWorkingTree();

      // 2. Apply all patches in batch
      for (const patch of patches) {
        await this.applyPatch(patch);
      }

      // 3. Stage changes
      this.exec('git add .');

      // 4. Create detailed commit message
      const commitMessage = this.createCommitMessage(patches);

      // 5. Commit
      this.exec(`git commit -m "${commitMessage}"`);
      this.log(`✅ Committed ${patches.length} patches to main`);

      this.stats.batchesCommitted++;
      this.stats.patchesCommitted += patches.length;

      // 6. Move patches to committed directory
      for (const patch of patches) {
        await this.markAsCommitted(patch);
      }

      // 7. Signal orchestrator to trigger re-test
      await this.signalRetest(patches);

    } catch (error) {
      this.log(`❌ Error committing batch: ${error.message}`, 'error');
      // Rollback on error
      this.exec('git reset --hard HEAD');
    }
  }

  /**
   * Apply patch to main branch
   */
  async applyPatch(patch) {
    for (const p of patch.patches) {
      const filePath = path.join(PROJECT_ROOT, p.file);

      if (p.type === 'edit') {
        // Read file
        let content = await fs.readFile(filePath, 'utf8');

        // Apply replacement
        const oldString = p.old_string;
        const newString = p.new_string;

        if (!content.includes(oldString)) {
          this.log(`⚠️ Warning: Old string not found in ${p.file} for ${patch.bug_id}`, 'warn');
          continue;
        }

        content = content.replace(oldString, newString);

        // Write file
        await fs.writeFile(filePath, content, 'utf8');
        this.log(`  ✓ Applied ${patch.bug_id} to ${p.file}`);
      }
    }
  }

  /**
   * Create detailed commit message for batch
   */
  createCommitMessage(patches) {
    const bugIds = patches.map(p => p.bug_id).join(', ');
    const count = patches.length;

    let message = `fix: Auto-fix ${count} bug${count > 1 ? 's' : ''} via AI agent fleet\\n\\n`;
    message += `Bugs fixed:\\n`;

    for (const patch of patches) {
      message += `- ${patch.bug_id} (confidence: ${patch.confidence}%)\\n`;
    }

    message += `\\n🤖 Generated by Autonomous Fixing Fleet`;
    message += `\\nValidated: ${patches[0].validated_at}`;
    message += `\\nCommitted: ${new Date().toISOString()}`;

    return message;
  }

  /**
   * Mark patch as committed
   */
  async markAsCommitted(patch) {
    const committedPath = path.join(COMMITTED_DIR, patch.file);

    const committedResult = {
      ...patch,
      committed_at: new Date().toISOString(),
      committed_by: AGENT_NAME
    };

    await this.writeJSON(committedPath, committedResult);
    this.log(`💾 Marked ${patch.bug_id} as committed`);
  }

  /**
   * Signal orchestrator to trigger re-test cycle
   */
  async signalRetest(patches) {
    const signal = {
      timestamp: new Date().toISOString(),
      patches_committed: patches.length,
      bug_ids: patches.map(p => p.bug_id),
      workflows_to_retest: patches.map(p => p.workflow_id),
      signal_from: AGENT_NAME
    };

    await this.writeJSON(RETEST_SIGNAL_PATH, signal);
    this.stats.retestSignalsSent++;

    this.log(`📡 Sent re-test signal for ${patches.length} workflows`);
    this.log(`💡 Orchestrator will assign re-test work to detection fleet`);
  }

  /**
   * Ensure we're on main branch
   */
  async ensureMainBranch() {
    const currentBranch = this.exec('git branch --show-current').trim();
    if (currentBranch !== 'main') {
      this.exec('git checkout main');
    }
  }

  /**
   * Ensure working tree is clean
   */
  async ensureCleanWorkingTree() {
    const status = this.exec('git status --porcelain').trim();
    if (status) {
      this.log('⚠️ Working tree has changes, resetting...');
      this.exec('git reset --hard HEAD');
    }
  }

  /**
   * Execute shell command synchronously
   */
  exec(command) {
    try {
      return execSync(command, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read JSON file
   */
  async readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Write JSON file atomically
   */
  async writeJSON(filePath, data) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, filePath);
  }

  /**
   * Log message
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] [${AGENT_NAME}] ${message}\n`;

    console.log(logLine.trim());

    // Append to log file
    fs.appendFile(LOG_FILE, logLine).catch(() => {});
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
  const commitAgent = new CommitAgent();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await commitAgent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await commitAgent.stop();
    process.exit(0);
  });

  // Start commit agent
  await commitAgent.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { CommitAgent };
