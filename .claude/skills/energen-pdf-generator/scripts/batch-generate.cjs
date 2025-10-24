#!/usr/bin/env node
/**
 * Wrapper script for batch PDF generation using Energen MD Formatter
 * Calls the external energen-md-formatter CLI tool
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to external project
const MD_FORMATTER_PATH = 'C:/ECalc/active/energen-md-formatter';
const CLI_SCRIPT = path.join(MD_FORMATTER_PATH, 'cli', 'batch-generate.js');

// Parse command line arguments
const args = process.argv.slice(2);

// Check if energen-md-formatter exists
if (!fs.existsSync(MD_FORMATTER_PATH)) {
  console.error(`❌ Error: Energen MD Formatter not found at: ${MD_FORMATTER_PATH}`);
  console.error(`\nPlease ensure the project exists at the expected location.`);
  console.error(`Or update MD_FORMATTER_PATH in this script.`);
  process.exit(1);
}

// Check if CLI tool exists
if (!fs.existsSync(CLI_SCRIPT)) {
  console.error(`❌ Error: CLI tool not found: ${CLI_SCRIPT}`);
  console.error(`\nThe energen-md-formatter project may not be set up yet.`);
  console.error(`Please run: cd ${MD_FORMATTER_PATH} && npm install`);
  process.exit(1);
}

// Show usage if no arguments
if (args.length === 0) {
  console.log(`
Energen Batch PDF Generator - Wrapper Script

Usage:
  node batch-generate.cjs --input FOLDER --output FOLDER [OPTIONS]

Options:
  -i, --input FOLDER           Input directory with .md files (required)
  -o, --output FOLDER          Output directory for PDFs (required)
  -t, --template TEMPLATE      Template: energen-default, energen-minimal, energen-formal, plain
                               Default: energen-default
      --tier TIER              Scaling tier: compact, standard, comfortable, presentation
                               Default: standard

Examples:
  # Batch convert all markdown in docs/
  node batch-generate.cjs -i docs/ -o docs/pdf/

  # Batch convert with comfortable tier
  node batch-generate.cjs -i reports/ -o reports/pdf/ --tier comfortable

  # Batch convert with minimal template
  node batch-generate.cjs -i specs/ -o specs/pdf/ --template energen-minimal --tier compact

Features:
  ✓ Processes all .md files in input directory
  ✓ Creates output directory if it doesn't exist
  ✓ Preserves filenames (.md → .pdf)
  ✓ Shows progress for each file
  ✓ Reports summary at completion
`);
  process.exit(0);
}

console.log(`🔧 Calling Energen MD Formatter (Batch Mode)...`);
console.log(`📁 Project: ${MD_FORMATTER_PATH}`);
console.log(`🛠️  Script: ${CLI_SCRIPT}`);
console.log(`📋 Args: ${args.join(' ')}\n`);

// Call the external CLI tool
const child = spawn('node', [CLI_SCRIPT, ...args], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error(`❌ Error executing CLI tool: ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Batch PDF generation failed with exit code ${code}`);
    process.exit(code);
  }
  console.log(`\n✅ Batch PDF generation complete!`);
  process.exit(0);
});
