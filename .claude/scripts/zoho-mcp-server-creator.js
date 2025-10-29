/**
 * ZOHO MCP SERVER CREATOR - Chrome DevTools Script
 *
 * Purpose: Automate creation of Zoho MCP servers with specific tool sets
 * Usage: Run in Chrome DevTools Console on https://mcp.zoho.com/mcp-client
 *
 * Instructions:
 * 1. Navigate to https://mcp.zoho.com/mcp-client
 * 2. Open Chrome DevTools (F12)
 * 3. Go to Console tab
 * 4. Paste this entire script
 * 5. Call: await createServer(serverConfig)
 *
 * Created: 2025-10-28
 * For: Energen Calculator v5.0
 */

// ============================================================================
// SERVER CONFIGURATIONS
// ============================================================================

const SERVER_CONFIGS = {
  "energen-contacts-sync": {
    name: "energen-contacts-sync",
    description: "Customer/contact management and CRM sync",
    tools: [
      { app: "ZohoBooks", name: "create_contact" },
      { app: "ZohoBooks", name: "list_contacts" },
      { app: "ZohoBooks", name: "get_contact" },
      { app: "ZohoBooks", name: "update_contact" },
      { app: "ZohoCRM", name: "Search Records" },
      { app: "ZohoCRM", name: "Create Records" },
      { app: "ZohoCRM", name: "Get Fields" }
    ]
  },

  "energen-invoicing": {
    name: "energen-invoicing",
    description: "Invoice and estimate generation",
    tools: [
      { app: "ZohoBooks", name: "create_invoice" },
      { app: "ZohoBooks", name: "update_invoice" },
      { app: "ZohoBooks", name: "email_invoice" },
      { app: "ZohoBooks", name: "list_invoices" },
      { app: "ZohoBooks", name: "get_invoice" },
      { app: "ZohoBooks", name: "create_estimate" },
      { app: "ZohoBooks", name: "email_estimate" },
      { app: "ZohoBooks", name: "list_contacts" },
      { app: "ZohoBooks", name: "mark_invoice_sent" },
      { app: "ZohoBooks", name: "create_customer_payment" }
    ]
  },

  "energen-field-admin": {
    name: "energen-field-admin",
    description: "Custom field and module administration",
    tools: [
      { app: "ZohoCRM", name: "Create Field" },
      { app: "ZohoCRM", name: "Update Field" },
      { app: "ZohoCRM", name: "Get Fields" },
      { app: "ZohoCRM", name: "Delete Field" },
      { app: "ZohoCRM", name: "Get Modules" },
      { app: "ZohoCRM", name: "Get Layouts" },
      { app: "ZohoCRM", name: "Update Layouts" },
      { app: "ZohoCRM", name: "Create Custom Modules" }
    ]
  },

  "energen-sales-orders": {
    name: "energen-sales-orders",
    description: "Sales order and purchasing workflow",
    tools: [
      { app: "ZohoBooks", name: "create_sales_order" },
      { app: "ZohoBooks", name: "update_sales_order" },
      { app: "ZohoBooks", name: "list_sales_order" },
      { app: "ZohoBooks", name: "email_sales_order" },
      { app: "ZohoBooks", name: "mark_sales_order_as_confirmed" },
      { app: "ZohoBooks", name: "create_invoice_from_salesorder" },
      { app: "ZohoBooks", name: "list_contacts" },
      { app: "ZohoBooks", name: "create_purchase_order" }
    ]
  },

  "energen-data-explorer": {
    name: "energen-data-explorer",
    description: "Read-only data exploration",
    tools: [
      { app: "ZohoBooks", name: "list_contacts" },
      { app: "ZohoBooks", name: "get_contact" },
      { app: "ZohoBooks", name: "list_invoices" },
      { app: "ZohoBooks", name: "get_invoice" },
      { app: "ZohoBooks", name: "list_estimates" },
      { app: "ZohoBooks", name: "get_estimate" },
      { app: "ZohoBooks", name: "list_sales_order" },
      { app: "ZohoCRM", name: "Get Records" },
      { app: "ZohoCRM", name: "Search Records" },
      { app: "ZohoCRM", name: "Get Fields" },
      { app: "ZohoCRM", name: "Get Modules" },
      { app: "ZohoBooks", name: "list_items" }
    ]
  },

  "energen-projects": {
    name: "energen-projects",
    description: "Project and time tracking",
    tools: [
      { app: "ZohoBooks", name: "create_project" },
      { app: "ZohoBooks", name: "update_project" },
      { app: "ZohoBooks", name: "list_projects" },
      { app: "ZohoBooks", name: "get_project" },
      { app: "ZohoBooks", name: "add_task" },
      { app: "ZohoBooks", name: "log_time_entry" },
      { app: "ZohoBooks", name: "list_time_entries" },
      { app: "ZohoBooks", name: "list_contacts" }
    ]
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wait for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for element to appear in DOM
 */
async function waitForElement(selector, timeout = 10000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(100);
  }
  throw new Error(`Timeout waiting for element: ${selector}`);
}

/**
 * Click element and wait for response
 */
async function clickAndWait(selector, waitMs = 500) {
  const element = await waitForElement(selector);
  element.click();
  await sleep(waitMs);
  return element;
}

/**
 * Type text into input field
 */
async function typeText(selector, text) {
  const input = await waitForElement(selector);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(200);
}

/**
 * Search for and click a tool in the tool list
 */
async function selectTool(appName, toolName) {
  // Search for the app first
  const appSelector = `[data-app="${appName}"]`;
  await clickAndWait(appSelector);

  // Search for the tool
  const searchInput = 'input[placeholder*="Search"]';
  await typeText(searchInput, toolName);
  await sleep(500);

  // Click the tool checkbox
  const toolCheckbox = `input[type="checkbox"][value="${toolName}"]`;
  await clickAndWait(toolCheckbox);

  console.log(`✓ Selected: ${appName} > ${toolName}`);
}

// ============================================================================
// MAIN SERVER CREATION FUNCTION
// ============================================================================

/**
 * Create a Zoho MCP server with specified configuration
 *
 * @param {Object} config - Server configuration object
 * @returns {Promise<Object>} Created server details
 */
async function createServer(config) {
  console.log(`\n🚀 Creating Zoho MCP Server: ${config.name}\n`);
  console.log(`Description: ${config.description}`);
  console.log(`Tools to add: ${config.tools.length}\n`);

  try {
    // Step 1: Click "Create Server" button
    console.log('Step 1: Opening server creation dialog...');
    await clickAndWait('button:contains("Create Server")', 1000);

    // Step 2: Enter server name
    console.log('Step 2: Entering server name...');
    await typeText('input[name="serverName"]', config.name);

    // Step 3: Click "Create" to create empty server
    console.log('Step 3: Creating server...');
    await clickAndWait('button:contains("Create")', 2000);

    // Step 4: Click "Config Tools" to add tools
    console.log('Step 4: Opening tool configuration...');
    await clickAndWait('button:contains("Config Tools")', 1000);

    // Step 5: Add each tool
    console.log('Step 5: Adding tools...');
    for (let i = 0; i < config.tools.length; i++) {
      const tool = config.tools[i];
      console.log(`  [${i + 1}/${config.tools.length}] Adding ${tool.app} > ${tool.name}...`);

      try {
        await selectTool(tool.app, tool.name);
      } catch (error) {
        console.warn(`  ⚠️  Warning: Could not add ${tool.name}: ${error.message}`);
      }
    }

    // Step 6: Click "Add Now" to save tools
    console.log('Step 6: Saving tool configuration...');
    await clickAndWait('button:contains("Add Now")', 2000);

    // Step 7: Get server URL
    console.log('Step 7: Retrieving server URL...');
    await clickAndWait('.tab:contains("Connect")', 1000);

    const urlElement = await waitForElement('.mcp-url');
    const serverUrl = urlElement.textContent || urlElement.value;

    console.log('\n✅ Server created successfully!\n');
    console.log('Server Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Name: ${config.name}`);
    console.log(`Description: ${config.description}`);
    console.log(`Tools: ${config.tools.length}`);
    console.log(`URL: ${serverUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      name: config.name,
      description: config.description,
      url: serverUrl,
      tools: config.tools.length,
      created: new Date().toISOString()
    };

  } catch (error) {
    console.error(`\n❌ Error creating server: ${error.message}\n`);
    throw error;
  }
}

/**
 * Create all predefined servers
 */
async function createAllServers() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         ZOHO MCP MASS SERVER CREATION                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const serverNames = Object.keys(SERVER_CONFIGS);
  console.log(`Creating ${serverNames.length} servers...\n`);

  const results = [];

  for (let i = 0; i < serverNames.length; i++) {
    const serverName = serverNames[i];
    const config = SERVER_CONFIGS[serverName];

    console.log(`\n[${ i + 1}/${serverNames.length}] Creating: ${serverName}`);
    console.log('─'.repeat(60));

    try {
      const result = await createServer(config);
      results.push({ success: true, ...result });

      // Wait between server creations
      if (i < serverNames.length - 1) {
        console.log('\nWaiting 3 seconds before next server...');
        await sleep(3000);
      }
    } catch (error) {
      console.error(`Failed to create ${serverName}: ${error.message}`);
      results.push({ success: false, name: serverName, error: error.message });
    }
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    CREATION SUMMARY                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

  if (successful.length > 0) {
    console.log('Successful Servers:');
    console.log('─'.repeat(60));
    successful.forEach(s => {
      console.log(`  ✓ ${s.name} (${s.tools} tools)`);
      console.log(`    ${s.url}\n`);
    });
  }

  if (failed.length > 0) {
    console.log('\nFailed Servers:');
    console.log('─'.repeat(60));
    failed.forEach(f => {
      console.log(`  ✗ ${f.name}: ${f.error}\n`);
    });
  }

  // Generate .vscode/mcp.json configuration
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              .vscode/mcp.json CONFIGURATION                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const mcpConfig = {
    servers: {},
    inputs: []
  };

  successful.forEach(server => {
    mcpConfig.servers[server.name.replace('energen-', '')] = {
      type: "http",
      url: server.url,
      tools: ["*"]
    };
  });

  console.log(JSON.stringify(mcpConfig, null, 2));
  console.log('\n');

  return results;
}

// ============================================================================
// EXPORTS & USAGE INSTRUCTIONS
// ============================================================================

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       ZOHO MCP SERVER CREATOR - Chrome DevTools Script       ║
╚═══════════════════════════════════════════════════════════════╝

Available Functions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• createServer(config)        - Create a single server
• createAllServers()           - Create all predefined servers
• SERVER_CONFIGS               - View server configurations

Examples:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Create one server:
   await createServer(SERVER_CONFIGS["energen-contacts-sync"])

2. Create all servers:
   await createAllServers()

3. View available servers:
   console.table(Object.keys(SERVER_CONFIGS))

Ready to use! Type a command above to begin.
`);

// Make functions available globally
window.createServer = createServer;
window.createAllServers = createAllServers;
window.SERVER_CONFIGS = SERVER_CONFIGS;
