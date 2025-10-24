#!/usr/bin/env node

/**
 * Track Verification Metrics Script
 *
 * Tracks and calculates verification metrics for code investigations
 *
 * Usage:
 *   node track-metrics.js \
 *     --lines 1247 \
 *     --files "server.cjs,engine.cjs,ui.html" \
 *     --functions "getServiceK,calculatePrice,updateUI" \
 *     --queries "ServiceK,getServiceK,battery" \
 *     --output metrics.json
 */

const fs = require('fs');
const path = require('path');

// Configuration
const INVESTIGATION_MINIMUMS = {
  assessment: { lines: 1000, files: 5, functions: 5 },
  bug_fix: { lines: 200, files: 2, functions: 2 },
  feature_verification: { lines: 500, files: 3, functions: 3 },
  completion_claim: { lines: 2000, files: 10, functions: 10 }
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];

      // Parse numeric values
      if (key === 'lines' || key === 'confidence') {
        parsed[key] = parseInt(value, 10);
      }
      // Parse array values
      else if (key === 'files' || key === 'functions' || key === 'queries') {
        parsed[key] = value.split(',').map(s => s.trim());
      }
      // String values
      else {
        parsed[key] = value;
      }

      i++; // Skip next arg (value)
    }
  }

  return parsed;
}

// Calculate confidence score
function calculateConfidence(metrics, type = 'assessment') {
  const minimums = INVESTIGATION_MINIMUMS[type] || INVESTIGATION_MINIMUMS.assessment;

  const scores = {
    lines: Math.min(100, (metrics.lines / minimums.lines) * 100),
    files: Math.min(100, (metrics.files.length / minimums.files) * 100),
    functions: Math.min(100, (metrics.functions.length / minimums.functions) * 100),
    queries: metrics.queries.length > 0 ? 100 : 0
  };

  const weights = {
    lines: 0.3,
    files: 0.25,
    functions: 0.25,
    queries: 0.2
  };

  const weightedScore =
    scores.lines * weights.lines +
    scores.files * weights.files +
    scores.functions * weights.functions +
    scores.queries * weights.queries;

  return Math.round(weightedScore);
}

// Determine if minimums are met
function checkMinimums(metrics, type = 'assessment') {
  const minimums = INVESTIGATION_MINIMUMS[type] || INVESTIGATION_MINIMUMS.assessment;

  return {
    lines: metrics.lines >= minimums.lines,
    files: metrics.files.length >= minimums.files,
    functions: metrics.functions.length >= minimums.functions,
    queries: metrics.queries.length > 0,
    overall:
      metrics.lines >= minimums.lines &&
      metrics.files.length >= minimums.files &&
      metrics.functions.length >= minimums.functions &&
      metrics.queries.length > 0
  };
}

// Generate metrics report
function generateReport(metrics, type = 'assessment') {
  const minimums = INVESTIGATION_MINIMUMS[type] || INVESTIGATION_MINIMUMS.assessment;
  const confidence = calculateConfidence(metrics, type);
  const minimumsCheck = checkMinimums(metrics, type);

  const report = {
    timestamp: new Date().toISOString(),
    investigation_type: type,
    metrics: {
      lines_examined: metrics.lines,
      files_read: metrics.files.length,
      files_list: metrics.files,
      functions_analyzed: metrics.functions.length,
      functions_list: metrics.functions,
      search_queries: metrics.queries.length,
      queries_list: metrics.queries
    },
    requirements: {
      type: type,
      minimum_lines: minimums.lines,
      minimum_files: minimums.files,
      minimum_functions: minimums.functions
    },
    verification: {
      lines_met: minimumsCheck.lines,
      files_met: minimumsCheck.files,
      functions_met: minimumsCheck.functions,
      queries_met: minimumsCheck.queries,
      all_minimums_met: minimumsCheck.overall
    },
    confidence: {
      score: confidence,
      level: confidence >= 100 ? 'high' : confidence >= 70 ? 'medium' : 'low',
      bet_10k: minimumsCheck.overall && confidence >= 100
    },
    warnings: []
  };

  // Add warnings for unmet minimums
  if (!minimumsCheck.lines) {
    report.warnings.push(
      `Lines examined (${metrics.lines}) below minimum (${minimums.lines})`
    );
  }
  if (!minimumsCheck.files) {
    report.warnings.push(
      `Files read (${metrics.files.length}) below minimum (${minimums.files})`
    );
  }
  if (!minimumsCheck.functions) {
    report.warnings.push(
      `Functions analyzed (${metrics.functions.length}) below minimum (${minimums.functions})`
    );
  }
  if (!minimumsCheck.queries) {
    report.warnings.push('No search queries performed');
  }

  return report;
}

// Format report as markdown
function formatMarkdown(report) {
  let md = '## 🔍 Verification Metrics\n\n';

  md += '### Evidence Gathered\n';
  md += `- **Lines examined:** ${report.metrics.lines_examined} `;
  md += `(Minimum: ${report.requirements.minimum_lines}) `;
  md += report.verification.lines_met ? '✅\n' : '❌\n';

  md += `- **Files read completely:** ${report.metrics.files_read} `;
  md += `(Minimum: ${report.requirements.minimum_files}) `;
  md += report.verification.files_met ? '✅\n' : '❌\n';
  report.metrics.files_list.forEach(file => {
    md += `  - ${file}\n`;
  });

  md += `- **Complete functions analyzed:** ${report.metrics.functions_analyzed} `;
  md += `(Minimum: ${report.requirements.minimum_functions}) `;
  md += report.verification.functions_met ? '✅\n' : '❌\n';
  report.metrics.functions_list.forEach(func => {
    md += `  - ${func}\n`;
  });

  md += `- **Search queries performed:** ${report.metrics.search_queries} `;
  md += report.verification.queries_met ? '✅\n' : '❌\n';
  report.metrics.queries_list.forEach(query => {
    md += `  - ${query}\n`;
  });

  md += '\n### Confidence Assessment\n';
  md += `- **Confidence Level:** ${report.confidence.score}% (${report.confidence.level})\n`;
  md += `- **All Minimums Met:** ${report.verification.all_minimums_met ? '✅ Yes' : '❌ No'}\n`;
  md += `- **Would I bet $10,000?** ${report.confidence.bet_10k ? '✅ Yes' : '❌ No'}\n`;

  if (report.warnings.length > 0) {
    md += '\n### ⚠️ Warnings\n';
    report.warnings.forEach(warning => {
      md += `- ${warning}\n`;
    });
  }

  return md;
}

// Main function
function main() {
  const args = parseArgs();

  // Validate required arguments
  if (!args.lines || !args.files || !args.functions || !args.queries) {
    console.error('❌ Error: Missing required arguments');
    console.log('');
    console.log('Usage:');
    console.log('  node track-metrics.js \\');
    console.log('    --lines 1247 \\');
    console.log('    --files "server.cjs,engine.cjs,ui.html" \\');
    console.log('    --functions "getServiceK,calculatePrice,updateUI" \\');
    console.log('    --queries "ServiceK,getServiceK,battery" \\');
    console.log('    --type assessment \\');
    console.log('    --output metrics.json');
    process.exit(1);
  }

  const metrics = {
    lines: args.lines,
    files: args.files,
    functions: args.functions,
    queries: args.queries
  };

  const type = args.type || 'assessment';

  // Generate report
  const report = generateReport(metrics, type);

  // Output to file if specified
  if (args.output) {
    try {
      fs.writeFileSync(args.output, JSON.stringify(report, null, 2), 'utf8');
      console.log(`✅ Metrics saved to: ${args.output}`);
    } catch (error) {
      console.error(`❌ Error saving metrics: ${error.message}`);
    }
  }

  // Output to console
  console.log('\n' + formatMarkdown(report));

  // Exit with appropriate code
  process.exit(report.verification.all_minimums_met ? 0 : 1);
}

// Run main function
main();
