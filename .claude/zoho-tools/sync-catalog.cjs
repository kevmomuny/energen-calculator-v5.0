#!/usr/bin/env node

/**
 * Zoho Tool Catalog Sync Script
 *
 * Purpose: Keep catalog.json up-to-date with latest Zoho MCP tools
 *
 * Usage:
 *   node sync-catalog.cjs --import <file>     # Import tools from export file
 *   node sync-catalog.cjs --add-app <name>    # Add new app to catalog
 *   node sync-catalog.cjs --add-keywords      # AI-generate keywords for tools
 *   node sync-catalog.cjs --validate          # Validate catalog structure
 *   node sync-catalog.cjs --stats             # Show catalog statistics
 */

const fs = require('fs');
const path = require('path');

const CATALOG_PATH = path.join(__dirname, 'catalog.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Load catalog from disk
 */
function loadCatalog() {
  try {
    const data = fs.readFileSync(CATALOG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading catalog:', error.message);
    process.exit(1);
  }
}

/**
 * Save catalog to disk with backup
 */
function saveCatalog(catalog) {
  try {
    // Create backup
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(BACKUP_DIR, `catalog-${timestamp}.json`);
    fs.copyFileSync(CATALOG_PATH, backupPath);
    console.log(`✓ Backup created: ${backupPath}`);

    // Update timestamp
    catalog.last_updated = new Date().toISOString();

    // Save
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`✓ Catalog saved: ${CATALOG_PATH}`);
  } catch (error) {
    console.error('Error saving catalog:', error.message);
    process.exit(1);
  }
}

/**
 * Import tools from text export
 * Format: Tool names, one per line or comma-separated
 */
function importTools(filePath, appName, category) {
  console.log(`\nImporting tools from: ${filePath}`);
  console.log(`App: ${appName}, Category: ${category || 'auto-detect'}\n`);

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').map(line => line.trim()).filter(line => line);

    const tools = [];
    for (const line of lines) {
      // Handle comma-separated or newline-separated
      const toolNames = line.includes(',')
        ? line.split(',').map(t => t.trim())
        : [line];

      tools.push(...toolNames);
    }

    console.log(`Found ${tools.length} tools to import`);

    const catalog = loadCatalog();

    // Add app if doesn't exist
    if (!catalog.apps[appName]) {
      catalog.apps[appName] = {
        tool_count: 0,
        description: `Description for ${appName}`,
        categories: {}
      };
      catalog.total_apps++;
    }

    // Add category if specified and doesn't exist
    if (category && !catalog.apps[appName].categories[category]) {
      catalog.apps[appName].categories[category] = [];
    }

    // Add tools
    let added = 0;
    for (const toolName of tools) {
      if (!toolName) continue;

      // Auto-detect category if not specified
      const detectedCategory = category || detectCategory(toolName);

      // Ensure category exists
      if (!catalog.apps[appName].categories[detectedCategory]) {
        catalog.apps[appName].categories[detectedCategory] = [];
      }

      // Add to category if not already there
      if (!catalog.apps[appName].categories[detectedCategory].includes(toolName)) {
        catalog.apps[appName].categories[detectedCategory].push(toolName);
        added++;
      }
    }

    // Update counts
    catalog.apps[appName].tool_count = Object.values(catalog.apps[appName].categories)
      .flat().length;
    catalog.total_tools = Object.values(catalog.apps)
      .reduce((sum, app) => sum + app.tool_count, 0);

    console.log(`✓ Added ${added} new tools`);
    console.log(`✓ ${appName} now has ${catalog.apps[appName].tool_count} tools`);

    saveCatalog(catalog);

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

/**
 * Auto-detect category from tool name
 */
function detectCategory(toolName) {
  const name = toolName.toLowerCase();

  // Pattern matching for common categories
  if (name.includes('invoice')) return 'invoicing';
  if (name.includes('estimate')) return 'estimates';
  if (name.includes('contact') || name.includes('customer') || name.includes('vendor')) return 'contacts';
  if (name.includes('payment')) return 'payments';
  if (name.includes('item') || name.includes('product')) return 'items';
  if (name.includes('bill') && !name.includes('billing')) return 'bills';
  if (name.includes('expense')) return 'expenses';
  if (name.includes('credit_note')) return 'credit_notes';
  if (name.includes('purchase_order') || name.includes('po')) return 'purchase_orders';
  if (name.includes('sales_order') || name.includes('so')) return 'sales_orders';
  if (name.includes('project')) return 'projects';
  if (name.includes('tax')) return 'taxes';
  if (name.includes('record')) return 'records';
  if (name.includes('field')) return 'fields';
  if (name.includes('module')) return 'modules';
  if (name.includes('layout')) return 'layouts';
  if (name.includes('workflow')) return 'workflows';
  if (name.includes('webhook')) return 'webhooks';
  if (name.includes('user')) return 'users';
  if (name.includes('role')) return 'roles';

  return 'other';
}

/**
 * Add new app to catalog
 */
function addApp(appName, description) {
  console.log(`\nAdding new app: ${appName}\n`);

  const catalog = loadCatalog();

  if (catalog.apps[appName]) {
    console.error(`Error: App "${appName}" already exists`);
    process.exit(1);
  }

  catalog.apps[appName] = {
    tool_count: 0,
    description: description || `Tools for ${appName}`,
    categories: {}
  };

  catalog.total_apps++;

  console.log(`✓ App added: ${appName}`);

  saveCatalog(catalog);
}

/**
 * Validate catalog structure
 */
function validateCatalog() {
  console.log('\nValidating catalog...\n');

  const catalog = loadCatalog();
  let errors = 0;
  let warnings = 0;

  // Check required fields
  if (!catalog.version) {
    console.error('✗ Missing: version');
    errors++;
  }
  if (!catalog.apps) {
    console.error('✗ Missing: apps');
    errors++;
  }

  // Validate each app
  for (const [appName, app] of Object.entries(catalog.apps)) {
    if (!app.description) {
      console.warn(`⚠ ${appName}: Missing description`);
      warnings++;
    }
    if (!app.categories) {
      console.error(`✗ ${appName}: Missing categories`);
      errors++;
    }
    if (app.tool_count !== Object.values(app.categories).flat().length) {
      console.warn(`⚠ ${appName}: tool_count mismatch (${app.tool_count} vs ${Object.values(app.categories).flat().length})`);
      warnings++;
    }
  }

  // Validate total counts
  const actualToolCount = Object.values(catalog.apps)
    .reduce((sum, app) => sum + app.tool_count, 0);

  if (catalog.total_tools !== actualToolCount) {
    console.warn(`⚠ total_tools mismatch (${catalog.total_tools} vs ${actualToolCount})`);
    warnings++;
  }

  if (catalog.total_apps !== Object.keys(catalog.apps).length) {
    console.warn(`⚠ total_apps mismatch (${catalog.total_apps} vs ${Object.keys(catalog.apps).length})`);
    warnings++;
  }

  console.log(`\nValidation complete:`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Warnings: ${warnings}`);

  if (errors > 0) {
    process.exit(1);
  }
}

/**
 * Show catalog statistics
 */
function showStats() {
  const catalog = loadCatalog();

  console.log('\n=== Zoho Tool Catalog Statistics ===\n');
  console.log(`Version: ${catalog.version}`);
  console.log(`Last Updated: ${catalog.last_updated}`);
  console.log(`Total Apps: ${catalog.total_apps}`);
  console.log(`Total Tools: ${catalog.total_tools}`);
  console.log('');

  console.log('Apps:');
  for (const [appName, app] of Object.entries(catalog.apps)) {
    console.log(`  ${appName}: ${app.tool_count} tools in ${Object.keys(app.categories).length} categories`);
  }
  console.log('');

  if (catalog.workflows) {
    console.log(`Workflows: ${Object.keys(catalog.workflows).length}`);
    for (const [workflowName, workflow] of Object.entries(catalog.workflows)) {
      console.log(`  ${workflowName}: ${workflow.recommended_tools.length} tools`);
    }
  }

  console.log('\n===================================\n');
}

/**
 * Main CLI handler
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`
Zoho Tool Catalog Sync Script

Usage:
  node sync-catalog.cjs --import <file> --app <name> [--category <cat>]
  node sync-catalog.cjs --add-app <name> [--description <desc>]
  node sync-catalog.cjs --validate
  node sync-catalog.cjs --stats
  node sync-catalog.cjs --help

Examples:
  # Import tools from export
  node sync-catalog.cjs --import zoho-inventory-tools.txt --app "Zoho Inventory"

  # Import to specific category
  node sync-catalog.cjs --import crm-fields.txt --app "Zoho CRM" --category "fields"

  # Add new app
  node sync-catalog.cjs --add-app "Zoho FSM" --description "Field service management"

  # Validate catalog
  node sync-catalog.cjs --validate

  # Show statistics
  node sync-catalog.cjs --stats
    `);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case '--import': {
      const filePath = args[1];
      const appIndex = args.indexOf('--app');
      const categoryIndex = args.indexOf('--category');

      if (!filePath) {
        console.error('Error: Missing file path');
        process.exit(1);
      }
      if (appIndex === -1) {
        console.error('Error: Missing --app parameter');
        process.exit(1);
      }

      const appName = args[appIndex + 1];
      const category = categoryIndex !== -1 ? args[categoryIndex + 1] : null;

      importTools(filePath, appName, category);
      break;
    }

    case '--add-app': {
      const appName = args[1];
      const descIndex = args.indexOf('--description');
      const description = descIndex !== -1 ? args[descIndex + 1] : null;

      if (!appName) {
        console.error('Error: Missing app name');
        process.exit(1);
      }

      addApp(appName, description);
      break;
    }

    case '--validate':
      validateCatalog();
      break;

    case '--stats':
      showStats();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run with --help for usage information');
      process.exit(1);
  }
}

main();
