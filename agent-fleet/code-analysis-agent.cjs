#!/usr/bin/env node

/**
 * CODE-ANALYSIS-AGENT
 *
 * Analyzes bugs to determine root cause and confidence scores.
 *
 * Workflow:
 * 1. Monitor analysis queue for bugs to analyze
 * 2. Perform root cause analysis
 * 3. Assign confidence score (0-100%)
 * 4. Write analysis to analysis-results/ directory
 *
 * Confidence Scoring:
 * - 90-100%: Trivial fix, clear pattern
 * - 80-89%: High confidence, well-understood issue
 * - 70-79%: Medium confidence, some complexity
 * - 60-69%: Lower confidence, needs human review
 * - <60%: Flag for manual intervention
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const COORDINATION_DIR = path.join(PROJECT_ROOT, 'agent-coordination');
const FIX_QUEUE_DIR = path.join(COORDINATION_DIR, 'fix-queue');
const ANALYSIS_QUEUE_DIR = path.join(FIX_QUEUE_DIR, 'analysis');
const ANALYSIS_RESULTS_DIR = path.join(FIX_QUEUE_DIR, 'analysis-results');
const LOG_DIR = path.join(COORDINATION_DIR, 'fix-logs');
const LOG_FILE = path.join(LOG_DIR, `analysis-${new Date().toISOString().replace(/:/g, '-')}.log`);

const AGENT_NAME = 'Code-Analysis-Agent';
const CHECK_INTERVAL_MS = 6000; // Check every 6 seconds

class CodeAnalysisAgent {
  constructor() {
    this.running = false;
    this.analyzedBugs = new Set();
    this.stats = {
      bugsAnalyzed: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      startTime: new Date()
    };
  }

  /**
   * Start the analysis agent
   */
  async start() {
    this.running = true;
    this.log('🔍 Code-Analysis-Agent starting...');
    this.log('📂 Monitoring analysis queue for bugs to analyze');

    // Ensure directories
    await fs.mkdir(ANALYSIS_RESULTS_DIR, { recursive: true });
    await fs.mkdir(LOG_DIR, { recursive: true });

    // Load analyzed bugs
    await this.loadAnalyzedBugs();

    while (this.running) {
      try {
        await this.analysisCycle();
        await this.sleep(CHECK_INTERVAL_MS);
      } catch (error) {
        this.log(`❌ Error in analysis cycle: ${error.message}`, 'error');
        await this.sleep(CHECK_INTERVAL_MS);
      }
    }
  }

  /**
   * Stop the analysis agent gracefully
   */
  async stop() {
    this.log('🛑 Stopping Code-Analysis-Agent...');
    this.running = false;
    await this.generateReport();
  }

  /**
   * Load already analyzed bugs
   */
  async loadAnalyzedBugs() {
    try {
      const resultFiles = await fs.readdir(ANALYSIS_RESULTS_DIR);
      resultFiles.forEach(file => this.analyzedBugs.add(file.replace('.json', '')));
      this.log(`📊 Loaded ${this.analyzedBugs.size} previously analyzed bugs`);
    } catch (error) {
      this.log(`⚠️ Error loading analyzed bugs: ${error.message}`, 'warn');
    }
  }

  /**
   * Main analysis cycle
   */
  async analysisCycle() {
    // Find bugs to analyze
    const queueFiles = await this.getQueueFiles();
    const unanalyzed = queueFiles.filter(f => !this.analyzedBugs.has(f.replace('.json', '')));

    if (unanalyzed.length === 0) {
      return;
    }

    const file = unanalyzed[0];
    const bugId = file.replace('.json', '');

    try {
      const queuePath = path.join(ANALYSIS_QUEUE_DIR, file);
      const bug = await this.readJSON(queuePath);

      if (!bug) return;

      this.log(`🔍 Analyzing: ${bugId} (category: ${bug.category})`);

      // Perform analysis
      const analysis = await this.analyzeBug(bug);

      // Save analysis result
      await this.saveAnalysis(analysis);

      this.analyzedBugs.add(bugId);
      this.stats.bugsAnalyzed++;

      // Update confidence stats
      if (analysis.confidence >= 80) {
        this.stats.highConfidence++;
      } else if (analysis.confidence >= 60) {
        this.stats.mediumConfidence++;
      } else {
        this.stats.lowConfidence++;
      }

      this.log(`✅ Analysis complete: ${bugId} (confidence: ${analysis.confidence}%)`);

    } catch (error) {
      this.log(`❌ Error analyzing ${bugId}: ${error.message}`, 'error');
      this.analyzedBugs.add(bugId); // Mark as processed to avoid retry loop
    }
  }

  /**
   * Get queue files
   */
  async getQueueFiles() {
    try {
      const files = await fs.readdir(ANALYSIS_QUEUE_DIR);
      return files.filter(f => f.endsWith('.json'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze bug to determine root cause and confidence
   * NOW WITH FACT-FINDING: Verifies files exist, endpoints exist, patterns match
   */
  async analyzeBug(bug) {
    const analysis = {
      bug_id: bug.bug_id,
      workflow_id: bug.workflow_id,
      category: bug.category,
      priority: bug.priority,
      analyzed_at: new Date().toISOString(),
      root_cause: '',
      confidence: 0,
      recommended_fix: '',
      files_affected: [],
      requires_human_review: false,
      verification_details: [] // Track what was verified
    };

    // Analyze based on category WITH VERIFICATION
    if (bug.category === 'missing_ui_element') {
      await this.analyzeUIElement(bug, analysis);

    } else if (bug.category === 'api_endpoint_error') {
      await this.analyzeAPIEndpoint(bug, analysis);

    } else if (bug.category === 'parameter_validation') {
      await this.analyzeParameterValidation(bug, analysis);

    } else {
      analysis.root_cause = 'Unknown issue - requires manual investigation';
      analysis.confidence = 50;
      analysis.recommended_fix = 'Manual investigation required';
      analysis.requires_human_review = true;
    }

    // Flag low confidence for human review
    if (analysis.confidence < 60) {
      analysis.requires_human_review = true;
    }

    return analysis;
  }

  /**
   * Analyze UI element bug with fact-finding
   */
  async analyzeUIElement(bug, analysis) {
    analysis.root_cause = 'Service selection UI element not visible or accessible';
    analysis.files_affected = ['frontend/integrated-ui.html', 'frontend/modules/service-templates.js'];

    let confidence = 70; // Start at medium confidence

    // Verify HTML file exists
    const htmlPath = path.join(PROJECT_ROOT, 'frontend/integrated-ui.html');
    try {
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      confidence += 5; // +5 for file exists
      analysis.verification_details.push('✓ HTML file exists');

      // Check if similar service buttons exist (pattern matching)
      const serviceButtonPattern = /<button[^>]*data-service="[A-K]"[^>]*>/gi;
      const matches = htmlContent.match(serviceButtonPattern);
      if (matches && matches.length > 0) {
        confidence += 10; // +10 for template pattern found
        analysis.verification_details.push(`✓ Found ${matches.length} existing service button patterns`);
        analysis.recommended_fix = 'Clone existing service button pattern for missing service';
      } else {
        analysis.verification_details.push('⚠️ No service button patterns found - may need custom implementation');
        analysis.recommended_fix = 'Create new service button (no template available)';
      }
    } catch (error) {
      confidence -= 10; // -10 for file not found
      analysis.verification_details.push(`❌ HTML file not found: ${error.message}`);
    }

    analysis.confidence = Math.min(100, Math.max(50, confidence));
  }

  /**
   * Analyze API endpoint bug with fact-finding
   */
  async analyzeAPIEndpoint(bug, analysis) {
    analysis.root_cause = 'API endpoint returning error or not found';
    analysis.files_affected = ['src/api/server-secure.cjs'];

    let confidence = 70; // Start at medium confidence

    // Extract endpoint from workflow_id
    const endpointPath = this.extractEndpointPath(bug.workflow_id);

    if (!endpointPath) {
      confidence = 50;
      analysis.verification_details.push('❌ Could not parse endpoint from workflow_id');
      analysis.confidence = confidence;
      return;
    }

    analysis.verification_details.push(`✓ Parsed endpoint: ${endpointPath.method.toUpperCase()} ${endpointPath.path}`);

    // Verify server file exists
    const serverPath = path.join(PROJECT_ROOT, 'src/api/server-secure.cjs');
    try {
      const serverContent = await fs.readFile(serverPath, 'utf8');
      confidence += 5; // +5 for file exists
      analysis.verification_details.push('✓ Server file exists');

      // Check if endpoint already exists
      const endpointPattern = new RegExp(`app\\.${endpointPath.method}\\(['"\`]${endpointPath.path}['"\`]`, 'i');
      if (endpointPattern.test(serverContent)) {
        confidence = 50; // Lower confidence - endpoint exists but returns error
        analysis.verification_details.push(`⚠️ Endpoint ${endpointPath.path} EXISTS but returns error - needs debugging`);
        analysis.recommended_fix = 'Debug existing endpoint error handling';
      } else {
        confidence += 10; // +10 for clear missing endpoint
        analysis.verification_details.push(`✓ Endpoint ${endpointPath.path} MISSING - needs implementation`);
        analysis.recommended_fix = 'Implement missing endpoint';

        // Check for similar endpoints (template availability)
        const similarPattern = new RegExp(`app\\.${endpointPath.method}\\(['"\`][^'"\`]*['"\`]`, 'gi');
        const matches = serverContent.match(similarPattern);
        if (matches && matches.length > 0) {
          confidence += 5; // +5 for templates available
          analysis.verification_details.push(`✓ Found ${matches.length} similar ${endpointPath.method.toUpperCase()} endpoints as templates`);
        }
      }
    } catch (error) {
      confidence -= 10; // -10 for file not found
      analysis.verification_details.push(`❌ Server file not found: ${error.message}`);
    }

    analysis.confidence = Math.min(100, Math.max(50, confidence));
  }

  /**
   * Analyze parameter validation bug with fact-finding
   */
  async analyzeParameterValidation(bug, analysis) {
    analysis.root_cause = 'Missing or incorrect parameter validation';
    analysis.files_affected = ['src/api/server-secure.cjs'];

    let confidence = 75; // Start at medium-high confidence

    // Verify server file exists
    const serverPath = path.join(PROJECT_ROOT, 'src/api/server-secure.cjs');
    try {
      const serverContent = await fs.readFile(serverPath, 'utf8');
      confidence += 5; // +5 for file exists
      analysis.verification_details.push('✓ Server file exists');

      // Check for existing validation patterns
      const validationPatterns = [
        /if\s*\([^)]*\)\s*{\s*res\.status\(400\)/gi,  // Basic validation
        /\.validate\(/gi,                              // Validation libraries
        /joi\./gi,                                     // Joi validation
        /express-validator/gi                          // Express validator
      ];

      let patternsFound = 0;
      validationPatterns.forEach(pattern => {
        if (pattern.test(serverContent)) patternsFound++;
      });

      if (patternsFound > 0) {
        confidence += 5; // +5 for validation patterns exist
        analysis.verification_details.push(`✓ Found ${patternsFound} validation pattern types`);
        analysis.recommended_fix = 'Clone existing validation pattern for this endpoint';
      } else {
        confidence -= 5; // -5 for no validation patterns
        analysis.verification_details.push('⚠️ No validation patterns found - may need custom implementation');
        analysis.recommended_fix = 'Add parameter validation (no template available)';
      }
    } catch (error) {
      confidence -= 10; // -10 for file not found
      analysis.verification_details.push(`❌ Server file not found: ${error.message}`);
    }

    analysis.confidence = Math.min(100, Math.max(50, confidence));
  }

  /**
   * Extract endpoint path from workflow_id
   * Pattern: api-{method}-{path-parts}
   */
  extractEndpointPath(workflowId) {
    const match = workflowId.match(/^api-(get|post|put|delete|patch)-(.+)$/i);
    if (!match) return null;

    const method = match[1].toLowerCase();
    const pathParts = match[2].split('-');

    // Convert to endpoint path
    let path = '/' + pathParts.join('/');
    path = path.replace(/\/api\/api\//, '/api/');

    return { method, path };
  }

  /**
   * Save analysis result
   */
  async saveAnalysis(analysis) {
    const filepath = path.join(ANALYSIS_RESULTS_DIR, `${analysis.bug_id}.json`);
    await this.writeJSON(filepath, analysis);
    this.log(`💾 Saved analysis: ${analysis.bug_id}.json`);
  }

  /**
   * Generate status report
   */
  async generateReport() {
    const runtime = ((Date.now() - this.stats.startTime.getTime()) / (1000 * 60)).toFixed(2);
    const avgConfidence = this.stats.bugsAnalyzed > 0
      ? (((this.stats.highConfidence * 85) + (this.stats.mediumConfidence * 70) + (this.stats.lowConfidence * 50)) / this.stats.bugsAnalyzed).toFixed(1)
      : 0;

    const report = `
╔═══════════════════════════════════════════════════════════╗
║     CODE-ANALYSIS-AGENT - STATUS REPORT                  ║
╚═══════════════════════════════════════════════════════════╝
Runtime: ${runtime} minutes | Bugs Analyzed: ${this.stats.bugsAnalyzed}
High Confidence (80%+): ${this.stats.highConfidence}
Medium Confidence (60-79%): ${this.stats.mediumConfidence}
Low Confidence (<60%): ${this.stats.lowConfidence}
Average Confidence: ${avgConfidence}%
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
  const agent = new CodeAnalysisAgent();

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

module.exports = { CodeAnalysisAgent };
