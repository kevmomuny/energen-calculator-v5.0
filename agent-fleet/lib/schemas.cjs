/**
 * Coordination File Schemas & Validators
 * Defines structure of all coordination files used by agent fleet
 */

/**
 * Agent Status Schema
 * Stored in: agent-coordination/agent-status/<layer>-agents.json
 */
const AgentStatusSchema = {
  agent: String,              // Agent name (e.g., "ui-core-workflow")
  status: String,             // "active" | "idle" | "testing" | "fixing" | "crashed"
  branch: String,             // Current git branch
  worktree: String,           // Path to worktree
  chrome_port: Number,        // Chrome debugging port (UI agents only)
  pid: Number,                // Process ID
  last_heartbeat: String,     // ISO timestamp
  current_task: String,       // Description of current work
  workflows_tested: Number,   // Count
  failures_found: Number,     // Count
  failures_fixed: Number      // Count
};

/**
 * Failure Queue Entry Schema
 * Stored in: agent-coordination/failure-queue/<layer>-failures.json
 */
const FailureSchema = {
  failure_id: String,         // Unique ID (e.g., "ui-001", "api-042")
  agent: String,              // Agent that discovered failure
  workflow: String,           // Workflow ID that failed
  step: String,               // Step that failed
  severity: String,           // "critical" | "high" | "medium" | "low"
  root_cause: String,         // Detailed analysis
  affected_files: Array,      // File paths
  timestamp: String,          // ISO timestamp
  claimed_by: String,         // Agent working on fix (or null)
  retries: Number,            // How many fix attempts
  resolution: String          // "auto-fix" | "manual-review-required" | "persistent"
};

/**
 * Test Result Schema
 * Stored in: agent-coordination/test-results/<agent>/<workflow>-<timestamp>.json
 */
const TestResultSchema = {
  workflow_id: String,
  agent: String,
  result: String,             // "PASS" | "FAIL"
  timestamp: String,
  duration_ms: Number,
  steps: Array,               // Array of step results
  evidence: Object,           // Screenshots, logs, etc.
  error: Object               // Error details if FAIL
};

/**
 * Merge Log Entry Schema
 * Stored in: agent-coordination/merge-log.json
 */
const MergeLogSchema = {
  merge_sha: String,
  agent: String,
  failure_id: String,
  timestamp: String,
  rollback: Boolean,
  reason: String,             // Rollback reason if applicable
  files_changed: Array,
  tests_run: Number,
  tests_passed: Number
};

/**
 * Workflow Definition Schema
 * Stored in: agent-coordination/workflows/<agent>/<workflow-id>.json
 */
const WorkflowSchema = {
  workflow_id: String,
  description: String,
  category: String,           // "ui" | "api" | "integration" | "end-to-end"
  critical_path: Boolean,
  assigned_agent: String,
  steps: Array,               // Array of step definitions
  expected_duration_ms: Number,
  dependencies: Array         // Other workflows that must pass first
};

/**
 * Validators
 */
function validateAgentStatus(data) {
  const required = ['agent', 'status', 'pid', 'last_heartbeat'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`AgentStatus missing required field: ${field}`);
    }
  }

  const validStatuses = ['active', 'idle', 'testing', 'fixing', 'crashed'];
  if (!validStatuses.includes(data.status)) {
    throw new Error(`Invalid status: ${data.status}`);
  }

  return true;
}

function validateFailure(data) {
  const required = ['failure_id', 'agent', 'workflow', 'severity', 'timestamp'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Failure missing required field: ${field}`);
    }
  }

  const validSeverities = ['critical', 'high', 'medium', 'low'];
  if (!validSeverities.includes(data.severity)) {
    throw new Error(`Invalid severity: ${data.severity}`);
  }

  return true;
}

function validateWorkflow(data) {
  const required = ['workflow_id', 'description', 'steps', 'assigned_agent'];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Workflow missing required field: ${field}`);
    }
  }

  if (!Array.isArray(data.steps) || data.steps.length === 0) {
    throw new Error('Workflow must have at least one step');
  }

  return true;
}

module.exports = {
  // Schemas
  AgentStatusSchema,
  FailureSchema,
  TestResultSchema,
  MergeLogSchema,
  WorkflowSchema,

  // Validators
  validateAgentStatus,
  validateFailure,
  validateWorkflow
};
