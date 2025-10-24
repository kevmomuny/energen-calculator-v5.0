#!/usr/bin/env node

/**
 * Update Session Memory Script
 *
 * Adds verified facts to SESSION_MEMORY.json while preserving structure
 *
 * Usage:
 *   node update-session-memory.js --fact "..." --verified true --source "file.cjs" --evidence "..."
 *   node update-session-memory.js --code-change "..." --file "..." --lines "..." --commit "..."
 *   node update-session-memory.js --architecture-note "key" "value"
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SESSION_MEMORY_PATH = path.join(PROJECT_ROOT, 'SESSION_MEMORY.json');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      parsed[key] = value;
      i++; // Skip next arg (value)
    }
  }

  return parsed;
}

// Load current session memory
function loadSessionMemory() {
  try {
    const content = fs.readFileSync(SESSION_MEMORY_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error loading SESSION_MEMORY.json:', error.message);
    process.exit(1);
  }
}

// Save updated session memory
function saveSessionMemory(data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(SESSION_MEMORY_PATH, content, 'utf8');
    console.log('✅ SESSION_MEMORY.json updated successfully');
  } catch (error) {
    console.error('❌ Error saving SESSION_MEMORY.json:', error.message);
    process.exit(1);
  }
}

// Add verified fact
function addVerifiedFact(memory, fact, verified, source, evidence) {
  if (!memory.verified_facts) {
    memory.verified_facts = {};
  }

  // Create a key from the fact (sanitized)
  const key = fact
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);

  memory.verified_facts[key] = fact;

  console.log(`✅ Added verified fact: ${fact}`);
  console.log(`   Source: ${source || 'N/A'}`);
  console.log(`   Evidence: ${evidence || 'N/A'}`);
}

// Add code change
function addCodeChange(memory, change, file, lines, commit) {
  if (!memory.recent_code_changes) {
    memory.recent_code_changes = [];
  }

  const changeEntry = {
    date: new Date().toISOString().split('T')[0],
    commit: commit || 'unknown',
    file: file || 'unknown',
    lines: lines || 'unknown',
    change: change,
    verified: true
  };

  // Add to beginning of array (most recent first)
  memory.recent_code_changes.unshift(changeEntry);

  // Keep only last 20 changes
  if (memory.recent_code_changes.length > 20) {
    memory.recent_code_changes = memory.recent_code_changes.slice(0, 20);
  }

  console.log(`✅ Added code change:`);
  console.log(`   File: ${file}`);
  console.log(`   Lines: ${lines}`);
  console.log(`   Change: ${change}`);
}

// Add architecture note
function addArchitectureNote(memory, key, value) {
  if (!memory.architecture_notes) {
    memory.architecture_notes = {};
  }

  memory.architecture_notes[key] = value;

  console.log(`✅ Added architecture note:`);
  console.log(`   Key: ${key}`);
  console.log(`   Value: ${value}`);
}

// Update timestamp
function updateTimestamp(memory) {
  memory.last_updated = new Date().toISOString();
}

// Main function
function main() {
  const args = parseArgs();

  // Load current session memory
  const memory = loadSessionMemory();

  // Determine action based on arguments
  if (args.fact) {
    addVerifiedFact(
      memory,
      args.fact,
      args.verified === 'true',
      args.source,
      args.evidence
    );
  } else if (args['code-change']) {
    addCodeChange(
      memory,
      args['code-change'],
      args.file,
      args.lines,
      args.commit
    );
  } else if (args['architecture-note']) {
    const key = args['architecture-note'];
    const value = args[process.argv.indexOf('--architecture-note') + 2];
    addArchitectureNote(memory, key, value);
  } else {
    console.error('❌ Error: Missing required arguments');
    console.log('');
    console.log('Usage:');
    console.log('  Add verified fact:');
    console.log('    --fact "..." --verified true --source "file.cjs" --evidence "..."');
    console.log('');
    console.log('  Add code change:');
    console.log('    --code-change "..." --file "..." --lines "..." --commit "..."');
    console.log('');
    console.log('  Add architecture note:');
    console.log('    --architecture-note "key" "value"');
    process.exit(1);
  }

  // Update timestamp
  updateTimestamp(memory);

  // Save updated memory
  saveSessionMemory(memory);
}

// Run main function
main();
