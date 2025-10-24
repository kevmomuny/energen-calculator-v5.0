/**
 * Base Agent Framework
 * Parent class for all autonomous test agents
 */

const path = require('path');
const fs = require('fs').promises;
const {
  readCoordinationFile,
  atomicUpdate,
  getAgentStatus,
  updateAgentStatus,
  updateHeartbeat
} = require('../lib/coordination.cjs');

const WORKFLOWS_DIR = path.join(__dirname, '../../agent-coordination/workflows');

class BaseAgent {
  constructor(config) {
    this.name = config.name;
    this.layer = config.layer; // 'ui', 'api', 'integration'
    this.pid = process.pid;
    this.status = 'initializing';
    this.workflows = [];
    this.workflowsTested = 0;
    this.failuresFound = 0;
    this.failuresFixed = 0;
    this.currentTask = 'starting up';
    this.heartbeatInterval = null;
    this.running = false;
  }

  /**
   * Initialize agent: register, load workflows, start heartbeat
   */
  async initialize() {
    console.log(`[${this.name}] Initializing...`);

    // Register in coordination layer
    await this.updateStatus('active', 'initializing');

    // Load assigned workflows
    await this.loadWorkflows();

    console.log(`[${this.name}] Loaded ${this.workflows.length} workflows`);

    // Start heartbeat
    this.startHeartbeat();

    this.status = 'active';
    this.running = true;

    console.log(`[${this.name}] Ready. PID: ${this.pid}`);
  }

  /**
   * Load workflows assigned to this agent
   */
  async loadWorkflows() {
    try {
      const agentShortName = this.getAgentShortName();
      const agentWorkflowDir = path.join(WORKFLOWS_DIR, agentShortName);

      // Check if agent has a dedicated workflow directory
      try {
        const stat = await fs.stat(agentWorkflowDir);
        if (stat.isDirectory()) {
          // Load workflows from agent-specific directory
          const files = await fs.readdir(agentWorkflowDir);

          for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const workflowPath = path.join(agentWorkflowDir, file);
            const content = await fs.readFile(workflowPath, 'utf-8');
            const workflow = JSON.parse(content);

            this.workflows.push(workflow);
          }
        }
      } catch (err) {
        // Directory doesn't exist, try flat structure
        const files = await fs.readdir(WORKFLOWS_DIR);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const workflowPath = path.join(WORKFLOWS_DIR, file);
          const content = await fs.readFile(workflowPath, 'utf-8');
          const workflow = JSON.parse(content);

          // Check if this workflow is assigned to this agent
          if (workflow.assigned_agent === agentShortName) {
            this.workflows.push(workflow);
          }
        }
      }

      // Sort by critical_path first, then by workflow_id
      this.workflows.sort((a, b) => {
        if (a.critical_path && !b.critical_path) return -1;
        if (!a.critical_path && b.critical_path) return 1;
        return a.workflow_id.localeCompare(b.workflow_id);
      });

    } catch (error) {
      console.error(`[${this.name}] Failed to load workflows:`, error.message);
      this.workflows = [];
    }
  }

  /**
   * Get short agent name (for workflow assignment matching)
   * e.g., "UI-Core-Workflow-Agent" -> "ui-core-workflow"
   */
  getAgentShortName() {
    return this.name
      .toLowerCase()
      .replace(/-agent$/, '')
      .replace(/\s+/g, '-');
  }

  /**
   * Start heartbeat loop (every 30 seconds)
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await updateHeartbeat(this.layer, this.name, this.status, this.currentTask);
      } catch (error) {
        console.error(`[${this.name}] Heartbeat failed:`, error.message);
      }
    }, 30000); // 30 seconds

    console.log(`[${this.name}] Heartbeat started (30s interval)`);
  }

  /**
   * Stop heartbeat loop
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log(`[${this.name}] Heartbeat stopped`);
    }
  }

  /**
   * Update agent status in coordination layer
   */
  async updateStatus(status, task) {
    this.status = status;
    this.currentTask = task || this.currentTask;

    await updateAgentStatus(this.layer, this.name, {
      status: this.status,
      pid: this.pid,
      last_heartbeat: new Date().toISOString(),
      current_task: this.currentTask,
      workflows_tested: this.workflowsTested,
      failures_found: this.failuresFound,
      failures_fixed: this.failuresFixed
    });
  }

  /**
   * Run all assigned workflows
   */
  async runAllWorkflows() {
    console.log(`\n[${this.name}] Starting workflow execution...`);
    console.log(`[${this.name}] Total workflows: ${this.workflows.length}\n`);

    for (const workflow of this.workflows) {
      if (!this.running) {
        console.log(`[${this.name}] Stopped by shutdown`);
        break;
      }

      await this.updateStatus('testing', `Testing: ${workflow.workflow_id}`);

      console.log(`[${this.name}] Executing: ${workflow.workflow_id}`);
      console.log(`[${this.name}] Description: ${workflow.description}`);

      const result = await this.executeWorkflow(workflow);

      this.workflowsTested++;
      await this.updateStatus('active', `Completed: ${workflow.workflow_id}`);

      if (result.passed) {
        console.log(`[${this.name}] ✅ PASS: ${workflow.workflow_id}\n`);
      } else {
        console.log(`[${this.name}] ❌ FAIL: ${workflow.workflow_id}`);
        console.log(`[${this.name}] Error: ${result.error}\n`);
        this.failuresFound++;

        // Report failure to queue
        await this.reportFailure(workflow, result);
      }
    }

    console.log(`[${this.name}] Workflow execution complete`);
    console.log(`[${this.name}] Tested: ${this.workflowsTested} | Failed: ${this.failuresFound}`);
  }

  /**
   * Execute a single workflow (to be overridden by child classes)
   */
  async executeWorkflow(workflow) {
    throw new Error('executeWorkflow() must be implemented by child class');
  }

  /**
   * Report a failure to the failure queue
   */
  async reportFailure(workflow, result) {
    const failureId = `F-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const failure = {
      failure_id: failureId,
      agent: this.name,
      workflow: workflow.workflow_id,
      category: workflow.category,
      severity: workflow.critical_path ? 'critical' : 'high',
      discovered_at: new Date().toISOString(),
      root_cause: result.error || 'Unknown error',
      steps_to_reproduce: workflow.steps,
      claimed_by: null,
      fix_pr_url: null,
      verified_fixed: false
    };

    // Add to failure queue
    const queueFile = `failure-queue/${this.layer}-failures.json`;
    await atomicUpdate(queueFile, (queue) => {
      queue.push(failure);
      return queue;
    });

    console.log(`[${this.name}] Failure reported: ${failureId}`);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log(`\n[${this.name}] Shutting down...`);
    this.running = false;

    this.stopHeartbeat();
    await this.updateStatus('idle', 'shutdown');

    console.log(`[${this.name}] Shutdown complete`);
  }
}

module.exports = BaseAgent;
