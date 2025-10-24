/**
 * Atomic File Operations for Agent Coordination
 * Provides thread-safe read/write operations with file locking
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const COORDINATION_DIR = path.join(PROJECT_ROOT, 'agent-coordination');

const LOCK_TIMEOUT_MS = 30000; // 30 seconds max wait for lock
const LOCK_CHECK_INTERVAL_MS = 100; // Check every 100ms

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if lock file exists
 */
async function isLocked(filePath) {
  const lockPath = `${filePath}.lock`;
  try {
    await fs.access(lockPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Acquire lock on file
 * @param {string} filePath - File to lock
 * @returns {Promise<string>} - Lock file path
 */
async function acquireLock(filePath) {
  const lockPath = `${filePath}.lock`;
  const startTime = Date.now();

  while (await isLocked(filePath)) {
    if (Date.now() - startTime > LOCK_TIMEOUT_MS) {
      throw new Error(`Lock timeout: ${filePath} (waited ${LOCK_TIMEOUT_MS}ms)`);
    }
    await sleep(LOCK_CHECK_INTERVAL_MS);
  }

  // Create lock file with PID
  await fs.writeFile(lockPath, JSON.stringify({
    pid: process.pid,
    timestamp: new Date().toISOString()
  }));

  return lockPath;
}

/**
 * Release lock on file
 * @param {string} lockPath - Path to lock file
 */
async function releaseLock(lockPath) {
  try {
    await fs.unlink(lockPath);
  } catch (error) {
    // Lock file might already be deleted, ignore
  }
}

/**
 * Read coordination file with optional lock
 * @param {string} relativePath - Path relative to agent-coordination/
 * @param {boolean} withLock - Whether to acquire lock (default: false)
 * @returns {Promise<any>} - Parsed JSON content
 */
async function readCoordinationFile(relativePath, withLock = false) {
  const fullPath = path.join(COORDINATION_DIR, relativePath);
  let lockPath = null;

  try {
    if (withLock) {
      lockPath = await acquireLock(fullPath);
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty structure based on extension
      return relativePath.endsWith('.json') ? (
        relativePath.includes('merge-log') ? [] : {}
      ) : null;
    }
    throw error;
  } finally {
    if (lockPath) {
      await releaseLock(lockPath);
    }
  }
}

/**
 * Write coordination file atomically with lock
 * @param {string} relativePath - Path relative to agent-coordination/
 * @param {any} data - Data to write (will be JSON.stringify'd)
 */
async function writeCoordinationFile(relativePath, data) {
  const fullPath = path.join(COORDINATION_DIR, relativePath);
  const lockPath = await acquireLock(fullPath);

  try {
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Atomic update: read → modify → write
 * @param {string} relativePath - Path relative to agent-coordination/
 * @param {Function} updateFn - Function that receives current data and returns new data
 */
async function atomicUpdate(relativePath, updateFn) {
  const fullPath = path.join(COORDINATION_DIR, relativePath);
  const lockPath = await acquireLock(fullPath);

  try {
    // Read current data
    let currentData;
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      currentData = JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start with empty structure
        currentData = relativePath.endsWith('merge-log.json') ? [] :
                      relativePath.includes('failures.json') ? [] :
                      relativePath.includes('agents.json') ? [] : {};
      } else {
        throw error;
      }
    }

    // Apply update function
    const newData = updateFn(currentData);

    // Write new data
    await fs.writeFile(fullPath, JSON.stringify(newData, null, 2));

    return newData;
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Agent Status Helpers
 */
async function getAgentStatus(layer, agentName) {
  const agents = await readCoordinationFile(`agent-status/${layer}-agents.json`);
  return Array.isArray(agents) ? agents.find(a => a.agent === agentName) : null;
}

async function updateAgentStatus(layer, agentName, updates) {
  await atomicUpdate(`agent-status/${layer}-agents.json`, (agents) => {
    if (!Array.isArray(agents)) agents = [];

    const index = agents.findIndex(a => a.agent === agentName);
    if (index >= 0) {
      agents[index] = { ...agents[index], ...updates };
    } else {
      agents.push({ agent: agentName, ...updates });
    }

    return agents;
  });
}

async function updateHeartbeat(layer, agentName, status, currentTask) {
  await updateAgentStatus(layer, agentName, {
    last_heartbeat: new Date().toISOString(),
    status,
    current_task: currentTask
  });
}

/**
 * Failure Queue Helpers
 */
async function addFailure(layer, failure) {
  await atomicUpdate(`failure-queue/${layer}-failures.json`, (failures) => {
    if (!Array.isArray(failures)) failures = [];
    failures.push(failure);
    return failures;
  });
}

async function claimFailure(layer, agentName) {
  return await atomicUpdate(`failure-queue/${layer}-failures.json`, (failures) => {
    if (!Array.isArray(failures)) return failures;

    // Find first unclaimed failure
    const unclaimed = failures.find(f => !f.claimed_by);
    if (unclaimed) {
      unclaimed.claimed_by = agentName;
      unclaimed.claim_timestamp = new Date().toISOString();
    }

    return failures;
  });
}

async function getFailureQueue(layer) {
  return await readCoordinationFile(`failure-queue/${layer}-failures.json`) || [];
}

/**
 * Merge Log Helpers
 */
async function logMerge(mergeEntry) {
  await atomicUpdate('merge-log.json', (log) => {
    if (!Array.isArray(log)) log = [];
    log.push(mergeEntry);
    return log;
  });
}

async function getMergeLog(limit = 50) {
  const log = await readCoordinationFile('merge-log.json') || [];
  return Array.isArray(log) ? log.slice(-limit) : [];
}

module.exports = {
  // Low-level operations
  acquireLock,
  releaseLock,
  readCoordinationFile,
  writeCoordinationFile,
  atomicUpdate,

  // Agent status
  getAgentStatus,
  updateAgentStatus,
  updateHeartbeat,

  // Failure queue
  addFailure,
  claimFailure,
  getFailureQueue,

  // Merge log
  logMerge,
  getMergeLog
};
