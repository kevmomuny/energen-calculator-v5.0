#!/usr/bin/env node

/**
 * FIX-GENERATOR-AGENT
 *
 * Generates code patches from analysis results.
 *
 * Workflow:
 * 1. Monitor analysis-results/ for completed analyses
 * 2. Generate code patches based on root cause
 * 3. Include confidence score from analysis
 * 4. Write patches to patches/ directory for validation
 *
 * Patch Format:
 * - bug_id, workflow_id, confidence
 * - patches array with file, type, old_string, new_string
 * - Ready for branch validation
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const COORDINATION_DIR = path.join(PROJECT_ROOT, 'agent-coordination');
const FIX_QUEUE_DIR = path.join(COORDINATION_DIR, 'fix-queue');
const ANALYSIS_RESULTS_DIR = path.join(FIX_QUEUE_DIR, 'analysis-results');
const PATCHES_DIR = path.join(FIX_QUEUE_DIR, 'patches');
const LOG_DIR = path.join(COORDINATION_DIR, 'fix-logs');
const LOG_FILE = path.join(LOG_DIR, `fix-generator-${new Date().toISOString().replace(/:/g, '-')}.log`);

const AGENT_NAME = 'Fix-Generator-Agent';
const CHECK_INTERVAL_MS = 7000; // Check every 7 seconds

class FixGeneratorAgent {
  constructor() {
    this.running = false;
    this.generatedPatches = new Set();
    this.stats = {
      patchesGenerated: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      startTime: new Date()
    };
  }

  /**
   * Start the fix generator agent
   */
  async start() {
    this.running = true;
    this.log('🔧 Fix-Generator-Agent starting...');
    this.log('📂 Monitoring analysis results for patch generation');

    // Ensure directories
    await fs.mkdir(PATCHES_DIR, { recursive: true });
    await fs.mkdir(LOG_DIR, { recursive: true });

    // Load generated patches
    await this.loadGeneratedPatches();

    while (this.running) {
      try {
        await this.generationCycle();
        await this.sleep(CHECK_INTERVAL_MS);
      } catch (error) {
        this.log(`❌ Error in generation cycle: ${error.message}`, 'error');
        await this.sleep(CHECK_INTERVAL_MS);
      }
    }
  }

  /**
   * Stop the fix generator agent gracefully
   */
  async stop() {
    this.log('🛑 Stopping Fix-Generator-Agent...');
    this.running = false;
    await this.generateReport();
  }

  /**
   * Load already generated patches
   */
  async loadGeneratedPatches() {
    try {
      const patchFiles = await fs.readdir(PATCHES_DIR);
      patchFiles.forEach(file => this.generatedPatches.add(file.replace('.json', '')));
      this.log(`📊 Loaded ${this.generatedPatches.size} previously generated patches`);
    } catch (error) {
      this.log(`⚠️ Error loading generated patches: ${error.message}`, 'warn');
    }
  }

  /**
   * Main generation cycle
   */
  async generationCycle() {
    // Find analyses ready for patch generation
    const analysisFiles = await this.getAnalysisFiles();
    const unpatched = analysisFiles.filter(f => !this.generatedPatches.has(f.replace('.json', '')));

    if (unpatched.length === 0) {
      return;
    }

    const file = unpatched[0];
    const bugId = file.replace('.json', '');

    try {
      const analysisPath = path.join(ANALYSIS_RESULTS_DIR, file);
      const analysis = await this.readJSON(analysisPath);

      if (!analysis) return;

      this.log(`🔧 Generating patch for: ${bugId} (confidence: ${analysis.confidence}%)`);

      // Generate patch
      const patch = await this.generatePatch(analysis);

      // Save patch
      await this.savePatch(patch);

      this.generatedPatches.add(bugId);
      this.stats.patchesGenerated++;

      // Update confidence stats
      if (patch.confidence >= 80) {
        this.stats.highConfidence++;
      } else if (patch.confidence >= 60) {
        this.stats.mediumConfidence++;
      } else {
        this.stats.lowConfidence++;
      }

      this.log(`✅ Patch generated: ${bugId}`);

    } catch (error) {
      this.log(`❌ Error generating patch for ${bugId}: ${error.message}`, 'error');
      this.generatedPatches.add(bugId); // Mark as processed to avoid retry loop
    }
  }

  /**
   * Get analysis files
   */
  async getAnalysisFiles() {
    try {
      const files = await fs.readdir(ANALYSIS_RESULTS_DIR);
      return files.filter(f => f.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate patch from analysis - Enhanced with real file reading
   */
  async generatePatch(analysis) {
    const patch = {
      bug_id: analysis.bug_id,
      workflow_id: analysis.workflow_id,
      category: analysis.category,
      confidence: analysis.confidence,
      generated_at: new Date().toISOString(),
      patches: [],
      ready_for_validation: analysis.confidence >= 60
    };

    try {
      // Generate patches based on category with real file context
      if (analysis.category === 'missing_ui_element') {
        await this.generateUIElementPatch(patch, analysis);
      } else if (analysis.category === 'api_endpoint_error') {
        await this.generateAPIEndpointPatch(patch, analysis);
      } else if (analysis.category === 'parameter_validation') {
        await this.generateValidationPatch(patch, analysis);
      }

      // If no patches were generated, mark for manual fix
      if (patch.patches.length === 0) {
        patch.patches.push({
          file: 'MANUAL_FIX_REQUIRED.txt',
          type: 'note',
          old_string: '',
          new_string: `Manual fix required for ${analysis.bug_id}: ${analysis.root_cause}`
        });
        patch.ready_for_validation = false;
      }

    } catch (error) {
      this.log(`⚠️ Error generating patch for ${analysis.bug_id}: ${error.message}`, 'warn');
      // Create manual fix note on error
      patch.patches.push({
        file: 'MANUAL_FIX_REQUIRED.txt',
        type: 'note',
        old_string: '',
        new_string: `Error generating patch: ${error.message}\nBug: ${analysis.bug_id}\nCause: ${analysis.root_cause}`
      });
      patch.ready_for_validation = false;
    }

    return patch;
  }

  /**
   * Generate UI element patch by reading actual HTML file
   */
  async generateUIElementPatch(patch, analysis) {
    const htmlFile = path.join(PROJECT_ROOT, 'frontend/integrated-ui.html');

    try {
      const content = await fs.readFile(htmlFile, 'utf8');

      // Extract service ID from workflow_id (e.g., "service-a-selection" -> "a")
      const serviceMatch = analysis.workflow_id.match(/service-([a-k])-selection/i);
      if (!serviceMatch) {
        this.log(`⚠️ Could not extract service ID from: ${analysis.workflow_id}`, 'warn');
        return;
      }

      const serviceId = serviceMatch[1].toUpperCase();

      // Find existing service button pattern in the file
      const serviceButtonPattern = /<button[^>]*data-service="[A-K]"[^>]*>.*?<\/button>/s;
      const existingButton = content.match(serviceButtonPattern);

      if (!existingButton) {
        this.log(`⚠️ Could not find service button pattern in ${htmlFile}`, 'warn');
        return;
      }

      // Check if button for this service already exists
      const specificButtonPattern = new RegExp(`data-service="${serviceId}"`, 'i');
      if (specificButtonPattern.test(content)) {
        this.log(`✓ Service ${serviceId} button already exists in HTML`, 'info');
        return;
      }

      // Find the service buttons container
      const containerPattern = /(<div[^>]*class="[^"]*service-buttons[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/;
      const containerMatch = content.match(containerPattern);

      if (!containerMatch) {
        this.log(`⚠️ Could not find service buttons container in ${htmlFile}`, 'warn');
        return;
      }

      // Extract button template from existing button
      const templateButton = existingButton[0];
      const newButton = templateButton
        .replace(/data-service="[A-K]"/i, `data-service="${serviceId}"`)
        .replace(/Service [A-K]/gi, `Service ${serviceId}`)
        .replace(/id="service-[a-k]-btn"/i, `id="service-${serviceId.toLowerCase()}-btn"`);

      // Create patch to add new button before closing div
      const oldString = containerMatch[0];
      const newString = containerMatch[1] + containerMatch[2] + '\n    ' + newButton + containerMatch[3];

      patch.patches.push({
        file: 'frontend/integrated-ui.html',
        type: 'edit',
        old_string: oldString,
        new_string: newString
      });

      this.log(`✓ Generated UI patch for Service ${serviceId}`, 'info');

    } catch (error) {
      this.log(`⚠️ Error reading ${htmlFile}: ${error.message}`, 'warn');
    }
  }

  /**
   * Generate API endpoint patch by reading actual server file
   */
  async generateAPIEndpointPatch(patch, analysis) {
    const serverFile = path.join(PROJECT_ROOT, 'src/api/server-secure.cjs');

    try {
      const content = await fs.readFile(serverFile, 'utf8');

      // Extract endpoint path from workflow_id (e.g., "api-post-api-calculate-service-price")
      const endpointPath = this.extractEndpointPath(analysis.workflow_id);
      if (!endpointPath) {
        this.log(`⚠️ Could not extract endpoint path from: ${analysis.workflow_id}`, 'warn');
        return;
      }

      // Check if endpoint already exists
      const endpointPattern = new RegExp(`app\\.(get|post|put|delete)\\(['"\`]${endpointPath.path}['"\`]`, 'i');
      if (endpointPattern.test(content)) {
        this.log(`✓ Endpoint ${endpointPath.path} already exists`, 'info');
        return;
      }

      // Find a good insertion point - look for similar endpoints
      const insertionPoint = this.findEndpointInsertionPoint(content, endpointPath.path);
      if (!insertionPoint) {
        this.log(`⚠️ Could not find insertion point for endpoint in ${serverFile}`, 'warn');
        return;
      }

      // Generate endpoint code based on method
      const endpointCode = this.generateEndpointCode(endpointPath, analysis);

      // Create patch
      patch.patches.push({
        file: 'src/api/server-secure.cjs',
        type: 'edit',
        old_string: insertionPoint.oldString,
        new_string: insertionPoint.oldString + '\n' + endpointCode + '\n'
      });

      this.log(`✓ Generated API patch for ${endpointPath.method.toUpperCase()} ${endpointPath.path}`, 'info');

    } catch (error) {
      this.log(`⚠️ Error reading ${serverFile}: ${error.message}`, 'warn');
    }
  }

  /**
   * Generate validation patch
   */
  async generateValidationPatch(patch, analysis) {
    // For now, mark as manual fix needed since validation requires understanding business logic
    this.log(`⚠️ Parameter validation requires manual implementation: ${analysis.workflow_id}`, 'warn');
  }

  /**
   * Extract endpoint path and method from workflow_id
   */
  extractEndpointPath(workflowId) {
    // Pattern: api-{method}-{path-parts}
    const match = workflowId.match(/^api-(get|post|put|delete|patch)-(.+)$/i);
    if (!match) return null;

    const method = match[1].toLowerCase();
    const pathParts = match[2].split('-');

    // Convert path parts to actual endpoint path
    // e.g., "api-calculate-service-price" -> "/api/calculate/service-price"
    let path = '/' + pathParts.join('/');

    // Clean up common patterns
    path = path.replace(/\/api\/api\//, '/api/');

    return { method, path };
  }

  /**
   * Find insertion point for new endpoint
   */
  findEndpointInsertionPoint(content, newPath) {
    // Look for the last endpoint definition before app.listen
    const endpointPattern = /app\.(get|post|put|delete|patch)\([^)]+\)[^{]*{[\s\S]*?}\);/g;
    const matches = [...content.matchAll(endpointPattern)];

    if (matches.length === 0) {
      // Try to find app.listen as fallback
      const listenMatch = content.match(/(app\.listen\([^)]+\))/);
      if (listenMatch) {
        return {
          oldString: listenMatch[0],
          insertBefore: true
        };
      }
      return null;
    }

    // Use last endpoint as insertion point
    const lastMatch = matches[matches.length - 1];
    return {
      oldString: lastMatch[0],
      insertBefore: false
    };
  }

  /**
   * Generate endpoint code
   */
  generateEndpointCode(endpointPath, analysis) {
    const { method, path } = endpointPath;

    // Generate basic endpoint stub
    const code = `// Auto-generated endpoint for ${analysis.workflow_id}
app.${method}('${path}', async (req, res) => {
  try {
    // TODO: Implement ${path} logic
    res.json({
      success: true,
      message: 'Endpoint auto-generated - awaiting implementation',
      workflow_id: '${analysis.workflow_id}'
    });
  } catch (error) {
    console.error('Error in ${path}:', error);
    res.status(500).json({ error: error.message });
  }
});`;

    return code;
  }

  /**
   * Save patch
   */
  async savePatch(patch) {
    const filepath = path.join(PATCHES_DIR, `${patch.bug_id}.json`);
    await this.writeJSON(filepath, patch);
    this.log(`💾 Saved patch: ${patch.bug_id}.json`);
  }

  /**
   * Generate status report
   */
  async generateReport() {
    const runtime = ((Date.now() - this.stats.startTime.getTime()) / (1000 * 60)).toFixed(2);
    const autoValidateRate = this.stats.patchesGenerated > 0
      ? ((this.stats.highConfidence / this.stats.patchesGenerated) * 100).toFixed(1)
      : 0;

    const report = `
╔═══════════════════════════════════════════════════════════╗
║     FIX-GENERATOR-AGENT - STATUS REPORT                  ║
╚═══════════════════════════════════════════════════════════╝
Runtime: ${runtime} minutes | Patches Generated: ${this.stats.patchesGenerated}
High Confidence (80%+): ${this.stats.highConfidence} (auto-validate eligible)
Medium Confidence (60-79%): ${this.stats.mediumConfidence}
Low Confidence (<60%): ${this.stats.lowConfidence}
Auto-Validate Rate: ${autoValidateRate}%
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
  const agent = new FixGeneratorAgent();

  // Handle shutdown signals
  process.on('SIGINT', async () => {
    await agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await agent.stop();
    process.exit(0);
  });

  // Start agent
  await agent.start();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { FixGeneratorAgent };
