#!/usr/bin/env node
/**
 * Zoho Tool Finder Skill
 *
 * Helps users discover and activate only the Zoho MCP tools they need,
 * avoiding the 88k token overflow problem.
 */

const fs = require('fs');
const path = require('path');

// Load the tool catalog
const CATALOG_PATH = path.join(__dirname, '../../..', 'zoho-proxy-mcp/tool-catalog.json');
let catalog = null;

try {
  catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
} catch (err) {
  console.error('❌ Could not load tool catalog:', err.message);
  process.exit(1);
}

/**
 * Search tools by keyword
 */
function searchTools(query, limit = 50) {
  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const [app, appData] of Object.entries(catalog.apps)) {
    for (const [category, tools] of Object.entries(appData.categories)) {
      for (const toolName of tools) {
        if (toolName.toLowerCase().includes(lowerQuery) ||
            category.toLowerCase().includes(lowerQuery)) {
          results.push({
            name: toolName,
            app,
            category,
          });

          if (results.length >= limit) {
            return results;
          }
        }
      }
    }
  }

  return results;
}

/**
 * Get tools by category
 */
function getToolsByCategory(category) {
  const results = [];

  for (const [app, appData] of Object.entries(catalog.apps)) {
    if (appData.categories[category]) {
      for (const toolName of appData.categories[category]) {
        results.push({
          name: toolName,
          app,
          category,
        });
      }
    }
  }

  return results;
}

/**
 * Get all categories
 */
function listCategories() {
  const categories = new Set();

  for (const [app, appData] of Object.entries(catalog.apps)) {
    for (const category of Object.keys(appData.categories)) {
      categories.add(category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Generate MCP config
 */
function generateConfig(toolNames, serverUrl, serverName = 'zoho-custom') {
  return {
    mcpServers: {
      [serverName]: {
        type: 'http',
        url: serverUrl,
        tools: toolNames,
      },
    },
  };
}

/**
 * Recommend tools based on task description
 */
function recommendTools(taskDescription) {
  const keywords = taskDescription.toLowerCase();
  const recommended = new Set();

  // Invoice workflow
  if (keywords.includes('invoice')) {
    recommended.add('create_invoice');
    recommended.add('list_invoices');
    recommended.add('get_invoice');
    recommended.add('update_invoice');
    recommended.add('email_invoice');
    recommended.add('create_contact');
    recommended.add('list_contacts');
    recommended.add('get_contact');
  }

  // Contact/Customer workflow
  if (keywords.includes('contact') || keywords.includes('customer')) {
    recommended.add('create_contact');
    recommended.add('list_contacts');
    recommended.add('get_contact');
    recommended.add('update_contact');
    recommended.add('delete_contact');
  }

  // Estimate/Quote workflow
  if (keywords.includes('estimate') || keywords.includes('quote')) {
    recommended.add('create_estimate');
    recommended.add('list_estimates');
    recommended.add('get_estimate');
    recommended.add('update_estimate');
    recommended.add('email_estimate');
    recommended.add('create_contact');
    recommended.add('list_contacts');
  }

  // Payment workflow
  if (keywords.includes('payment')) {
    recommended.add('create_customer_payment');
    recommended.add('list_customer_payments');
    recommended.add('get_customer_payment');
    recommended.add('list_invoices');
    recommended.add('get_invoice');
  }

  // Item/Product management
  if (keywords.includes('item') || keywords.includes('product')) {
    recommended.add('create_item');
    recommended.add('list_items');
    recommended.add('get_item');
    recommended.add('update_item');
    recommended.add('delete_item');
  }

  // CRM workflow
  if (keywords.includes('crm') || keywords.includes('lead') || keywords.includes('deal')) {
    // Add CRM tools
    const crmTools = getToolsByCategory('records')
      .filter(t => t.app === 'Zoho CRM')
      .slice(0, 20)
      .map(t => t.name);
    crmTools.forEach(t => recommended.add(t));
  }

  return Array.from(recommended);
}

// CLI Interface
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'search':
    const query = args[0];
    if (!query) {
      console.error('Usage: skill.js search <query>');
      process.exit(1);
    }
    const results = searchTools(query);
    console.log(JSON.stringify(results, null, 2));
    break;

  case 'category':
    const category = args[0];
    if (!category) {
      console.error('Usage: skill.js category <category-name>');
      process.exit(1);
    }
    const categoryTools = getToolsByCategory(category);
    console.log(JSON.stringify(categoryTools, null, 2));
    break;

  case 'list-categories':
    const categories = listCategories();
    console.log(JSON.stringify(categories, null, 2));
    break;

  case 'recommend':
    const task = args.join(' ');
    if (!task) {
      console.error('Usage: skill.js recommend <task description>');
      process.exit(1);
    }
    const recommended = recommendTools(task);
    console.log(JSON.stringify(recommended, null, 2));
    break;

  case 'generate-config':
    const serverUrl = args[0];
    const toolsJson = args[1];
    if (!serverUrl || !toolsJson) {
      console.error('Usage: skill.js generate-config <server-url> <tools-json>');
      process.exit(1);
    }
    const tools = JSON.parse(toolsJson);
    const config = generateConfig(tools, serverUrl);
    console.log(JSON.stringify(config, null, 2));
    break;

  default:
    console.log(`
Zoho Tool Finder - Available Commands:

  search <query>                Search tools by keyword
  category <name>               Get all tools in a category
  list-categories               List all available categories
  recommend "<task>"            Get tool recommendations for a task
  generate-config <url> <json>  Generate MCP config file

Examples:
  skill.js search invoice
  skill.js category invoicing
  skill.js recommend "create and email invoices"
`);
}
