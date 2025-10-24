#!/usr/bin/env node
/**
 * Setup Infrastructure for Autonomous Test Fleet
 * Creates all required directories and initializes coordination files
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const DIRECTORIES = [
  // Coordination layer
  'agent-coordination',
  'agent-coordination/agent-status',
  'agent-coordination/failure-queue',
  'agent-coordination/test-results',
  'agent-coordination/workflows',
  'agent-coordination/evidence',
  'agent-coordination/mcp-instances',

  // Agent worktrees (git will create these, but prepare parent)
  'worktrees',

  // Logging
  'agent-logs',

  // Chrome profiles (will be created per-agent)
  '.chrome-profiles',

  // Agent fleet code
  'agent-fleet/lib',
  'agent-fleet/agents',
  'agent-fleet/dashboard'
];

const INITIAL_FILES = {
  'agent-coordination/agent-status/ui-agents.json': [],
  'agent-coordination/agent-status/api-agents.json': [],
  'agent-coordination/agent-status/integration-agents.json': [],
  'agent-coordination/agent-status/sentinel.json': {},
  'agent-coordination/failure-queue/ui-failures.json': [],
  'agent-coordination/failure-queue/api-failures.json': [],
  'agent-coordination/failure-queue/integration-failures.json': [],
  'agent-coordination/merge-log.json': [],
  'agent-coordination/mcp-instances/chrome-ports.json': {},
  'agent-coordination/mcp-instances/active-agents.json': []
};

function createDirectories() {
  console.log('Creating directory structure...\n');

  for (const dir of DIRECTORIES) {
    const fullPath = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created: ${dir}`);
    } else {
      console.log(`⏭️  Exists: ${dir}`);
    }
  }
}

function initializeFiles() {
  console.log('\nInitializing coordination files...\n');

  for (const [filePath, initialContent] of Object.entries(INITIAL_FILES)) {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
      fs.writeFileSync(fullPath, JSON.stringify(initialContent, null, 2));
      console.log(`✅ Created: ${filePath}`);
    } else {
      console.log(`⏭️  Exists: ${filePath}`);
    }
  }
}

function createGitignoreEntries() {
  console.log('\nUpdating .gitignore...\n');

  const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');
  const entriesToAdd = [
    '',
    '# Autonomous Test Fleet',
    'worktrees/',
    'agent-logs/',
    '.chrome-profiles/',
    'agent-coordination/test-results/',
    'agent-coordination/evidence/',
    '*.lock'
  ];

  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Check if entries already exist
  if (!gitignoreContent.includes('# Autonomous Test Fleet')) {
    fs.appendFileSync(gitignorePath, '\n' + entriesToAdd.join('\n') + '\n');
    console.log('✅ Updated .gitignore');
  } else {
    console.log('⏭️  .gitignore already contains fleet entries');
  }
}

function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  AUTONOMOUS TEST FLEET - INFRASTRUCTURE SETUP             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    createDirectories();
    initializeFiles();
    createGitignoreEntries();

    console.log('\n✅ Infrastructure setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Review created directories in agent-coordination/');
    console.log('  2. Verify coordination files are initialized');
    console.log('  3. Proceed to implement coordination library\n');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
