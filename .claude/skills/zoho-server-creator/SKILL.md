---
name: zoho-server-creator
description: Automated Zoho MCP server creation and configuration management for Energen Calculator workflows
version: 1.0.0
author: Energen Development Team
tags: [zoho, mcp, automation, server-management, devops]
---

# Zoho Server Creator Skill

**Purpose:** Automate creation and management of Zoho MCP servers with workflow-specific tool sets.

**Problem Solved:** Creating Zoho MCP servers manually through the web UI is time-consuming. This skill automates the entire process using Chrome DevTools scripts and manages the `.vscode/mcp.json` configuration.

---

## What This Skill Does

1. **Recommends servers** based on user workflow needs
2. **Generates Chrome DevTools script** to create servers automatically
3. **Updates `.vscode/mcp.json`** with new server configurations
4. **Tracks created servers** in registry
5. **Validates server health** and OAuth status

---

## Available Servers

### Priority 1 (Create First)

#### **energen-contacts-sync**
- **Tools:** 7 (~3.5k tokens)
- **Purpose:** Customer/contact management, CRM sync
- **Use cases:** Import Fullbay customers, sync to CRM, basic contact operations
- **Tools:**
  - create_contact, list_contacts, get_contact, update_contact (Books)
  - Search Records, Create Records, Get Fields (CRM)

#### **energen-invoicing**
- **Tools:** 10 (~5k tokens)
- **Purpose:** Invoice and estimate generation
- **Use cases:** Generate quotes, create invoices, send to customers, track payments
- **Tools:**
  - create_invoice, update_invoice, email_invoice, list_invoices, get_invoice
  - create_estimate, email_estimate
  - list_contacts, mark_invoice_sent, create_customer_payment

### Priority 2 (Useful)

#### **energen-data-explorer**
- **Tools:** 12 (~6k tokens)
- **Purpose:** Read-only data exploration (safe)
- **Use cases:** Browse data, generate reports, verify records
- **Tools:** All list/get operations across Books and CRM

#### **energen-field-admin**
- **Tools:** 8 (~4k tokens)
- **Purpose:** Custom field and module administration
- **Use cases:** Setup custom fields, configure modules, layout management
- **Tools:** Create/Update/Get/Delete Field, Get Modules/Layouts, Create Custom Modules

### Priority 3 (Advanced)

#### **energen-sales-orders**
- **Tools:** 8 (~4k tokens)
- **Purpose:** Sales order and purchasing workflow
- **Tools:** Sales order operations, PO creation, order-to-invoice conversion

#### **energen-projects**
- **Tools:** 8 (~4k tokens)
- **Purpose:** Project and time tracking
- **Tools:** Project CRUD, task management, time entry logging

---

## Workflow

### **User Interaction:**

```
User: "I need to create invoices for customers"

Claude (via skill):
  "For invoice generation, you need the 'energen-invoicing' server.

  This server includes:
  • Invoice creation and updates
  • Email functionality
  • Customer lookup
  • Payment tracking

  Would you like me to:
  1. Create this server automatically using Chrome DevTools?
  2. Show you manual creation steps?
  3. Generate the script for you to run?"

User: "Create it automatically"

Claude:
  "Opening browser with automation script...
  [Launches Kapture to navigate to Zoho MCP dashboard]
  [Injects and runs creation script]
  [Waits for completion]

  ✅ Server created: energen-invoicing
  URL: https://energen-invoicing-897662416.zohomcp.com/mcp/message?key=...

  Now updating .vscode/mcp.json..."

[Skill updates config file]

Claude:
  "Configuration updated! Please:
  1. Reload VSCode window (Ctrl+Shift+P → Reload Window)
  2. Check /mcp status
  3. Enable the server if needed

  After enabling, you'll have access to 10 invoice tools!"
```

---

## Commands

### **Discovery Commands**

```
"What Zoho servers do I need for [workflow]?"
"Show me available server templates"
"Which server has [tool name]?"
```

### **Creation Commands**

```
"Create the contacts server"
"Set up all invoice tools"
"I need field administration capabilities"
```

### **Management Commands**

```
"Show created servers"
"Update server registry"
"Which servers are active?"
"Disable [server name]"
```

---

## Implementation Details

### **Step 1: User Request Analysis**

```javascript
function analyzeRequest(userMessage) {
  const keywords = {
    contacts: ['customer', 'contact', 'sync', 'fullbay', 'import'],
    invoicing: ['invoice', 'estimate', 'quote', 'billing', 'payment'],
    fieldAdmin: ['custom field', 'field', 'module', 'layout', 'crm setup'],
    dataExplorer: ['browse', 'explore', 'list', 'search', 'view'],
    salesOrders: ['sales order', 'purchase order', 'po', 'so'],
    projects: ['project', 'time', 'task', 'tracking']
  };

  // Match keywords to determine needed server
  // Return recommended server configuration
}
```

### **Step 2: Server Creation via Chrome DevTools**

Uses the automation script at: `.claude/scripts/zoho-mcp-server-creator.js`

**Approach A: Kapture Automation** (Preferred)
```javascript
// 1. Open Zoho MCP dashboard
await mcp__kapture__navigate({
  tabId: activeTab,
  url: 'https://mcp.zoho.com/mcp-client'
});

// 2. Wait for page load
await sleep(2000);

// 3. Inject automation script
const scriptContent = readFile('.claude/scripts/zoho-mcp-server-creator.js');
await mcp__kapture__evaluate({
  tabId: activeTab,
  script: scriptContent
});

// 4. Run creation command
await mcp__kapture__evaluate({
  tabId: activeTab,
  script: `await createServer(SERVER_CONFIGS["energen-invoicing"])`
});

// 5. Extract server URL from result
const result = await mcp__kapture__evaluate({
  tabId: activeTab,
  script: 'document.querySelector(".mcp-url").textContent'
});
```

**Approach B: Manual Script Injection** (User-assisted)
```javascript
// 1. Generate script with embedded config
const script = generateServerCreationScript(serverConfig);

// 2. Open browser and show instructions
console.log(`
Please:
1. Open https://mcp.zoho.com/mcp-client in Chrome
2. Open DevTools (F12) → Console tab
3. Paste this script and press Enter:

${script}

4. Copy the server URL when creation completes
5. Return here and paste the URL
`);

// 3. Wait for user to provide URL
const serverUrl = await askUser("Paste the server URL:");

// 4. Continue with config update
updateMCPConfig(serverName, serverUrl);
```

### **Step 3: Configuration Management**

**Update `.vscode/mcp.json`:**
```javascript
function addServerToConfig(serverName, serverUrl, toolList) {
  // Read current config
  const config = JSON.parse(readFile('.vscode/mcp.json'));

  // Add new server
  config.servers[serverName] = {
    type: "http",
    url: serverUrl,
    tools: ["*"]  // Load all tools from this server (it only has the subset we want)
  };

  // Write back
  writeFile('.vscode/mcp.json', JSON.stringify(config, null, 2));

  console.log(`✅ Added ${serverName} to .vscode/mcp.json`);
  console.log(`Please reload VSCode window to activate.`);
}
```

**Update Server Registry:**
```javascript
function registerServer(serverInfo) {
  const registry = JSON.parse(readFile('.claude/zoho-tools/servers/registry.json'));

  registry.servers.push({
    name: serverInfo.name,
    url: serverInfo.url,
    tools: serverInfo.tools.length,
    apps: [...new Set(serverInfo.tools.map(t => t.app))],
    workflow: serverInfo.description,
    created: new Date().toISOString(),
    status: 'active'
  });

  writeFile('.claude/zoho-tools/servers/registry.json', JSON.stringify(registry, null, 2));
}
```

### **Step 4: Validation & Health Check**

```javascript
async function validateServer(serverName, serverUrl) {
  // Test connection
  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Server ${serverName} is healthy`);
      console.log(`   Tools available: ${data.result.tools.length}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Server ${serverName} is not responding: ${error.message}`);
    return false;
  }
}
```

---

## Server Creation Strategies

### **Strategy 1: Create One Server (Quick Start)**

Best for: Immediate need, testing

```
User: "I need to create invoices"
→ Create energen-invoicing only (10 tools, 5 minutes)
```

### **Strategy 2: Create Core Servers (Recommended)**

Best for: Production use, common workflows

```
User: "Set up Energen for daily use"
→ Create: contacts-sync + invoicing + data-explorer
→ Total: 29 tools, ~14.5k tokens, 15 minutes
```

### **Strategy 3: Create All Servers (Complete Setup)**

Best for: Full functionality, all workflows supported

```
User: "Set up all Zoho capabilities"
→ Create all 6 servers
→ Total: 53 tools, ~26.5k tokens, 30 minutes
```

---

## File Locations

### **Script:**
```
.claude/scripts/zoho-mcp-server-creator.js
```
- Chrome DevTools automation script
- Contains all server configurations
- Self-contained, ready to paste into console

### **Registry:**
```
.claude/zoho-tools/servers/registry.json
```
- Tracks all created servers
- Stores URLs, tool counts, creation dates
- Updated automatically by skill

### **Configuration:**
```
.vscode/mcp.json
```
- VSCode MCP server configuration
- Modified by skill when servers are added/removed
- Requires VSCode reload after changes

---

## Usage Examples

### **Example 1: First-Time Setup**

```
User: "I'm setting up Energen for the first time. What do I need?"

Claude (via skill):
  "For initial setup, I recommend creating 2 core servers:

  1. energen-contacts-sync (7 tools)
     - Import customers from Fullbay
     - Sync to Zoho CRM/Books

  2. energen-invoicing (10 tools)
     - Generate quotes and invoices
     - Email to customers
     - Track payments

  This gives you 17 tools (8.5k tokens) covering most daily operations.

  Would you like me to create these automatically?"

User: "Yes"

Claude:
  [Opens browser, runs automation]

  "✅ Created energen-contacts-sync
  ✅ Created energen-invoicing

  Updated .vscode/mcp.json with both servers.

  Next steps:
  1. Reload VSCode (Ctrl+Shift+P → Reload Window)
  2. Run: /mcp status
  3. Enable both servers
  4. Complete OAuth for each (click Allow)

  Then you'll have 17 Zoho tools available!"
```

### **Example 2: Adding Capabilities**

```
User: "I need to set up custom fields in CRM"

Claude (via skill):
  "For custom field administration, you need: energen-field-admin

  This server provides:
  • Create/Update/Delete custom fields
  • Manage modules and layouts
  • Configure CRM structure

  Creating server..."

  [Creates server]

  "✅ Server created and configured
  Reload VSCode to activate the 8 field admin tools."
```

### **Example 3: Troubleshooting**

```
User: "My contacts server isn't working"

Claude (via skill):
  "Let me check the server status..."

  [Reads registry, validates server]

  "Found energen-contacts-sync in registry:
  • Created: 2025-10-28
  • Tools: 7
  • Status: active
  • URL: https://energen-contacts-sync-897662416...

  Checking connection..."

  [Tests server health]

  "❌ Server returned 401 Unauthorized

  This means OAuth needs to be refreshed.

  In VSCode:
  1. Type: /mcp
  2. Click energen-contacts-sync
  3. Select 'Re-authenticate'
  4. Complete OAuth flow in browser

  This should resolve the connection issue."
```

---

## Integration with zoho-tool-finder

These two skills work together:

1. **zoho-tool-finder** → Find specific tools
2. **zoho-server-creator** → Create server with those tools

**Workflow:**
```
User: "I need to email estimates to customers"

Claude (via zoho-tool-finder):
  "Found 3 relevant tools:
  • create_estimate
  • email_estimate
  • list_contacts

  These are in the 'energen-invoicing' server template."

Claude (via zoho-server-creator):
  "This server is not yet created. Would you like me to create it?

  The energen-invoicing server includes:
  • 10 tools total
  • Invoice + estimate operations
  • Customer lookup
  • Payment tracking

  Create now?"
```

---

## Server Management Commands

### **List Servers**

```javascript
function listCreatedServers() {
  const registry = readRegistry();
  console.table(registry.servers.map(s => ({
    Name: s.name,
    Tools: s.tools,
    Status: s.status,
    Created: s.created
  })));
}
```

### **Remove Server**

```javascript
function removeServer(serverName) {
  // 1. Remove from .vscode/mcp.json
  const config = JSON.parse(readFile('.vscode/mcp.json'));
  delete config.servers[serverName];
  writeFile('.vscode/mcp.json', JSON.stringify(config, null, 2));

  // 2. Update registry status
  const registry = readRegistry();
  const server = registry.servers.find(s => s.name === serverName);
  if (server) server.status = 'removed';
  writeRegistry(registry);

  console.log(`✅ Removed ${serverName} from configuration`);
  console.log(`Reload VSCode to deactivate.`);
  console.log(`Note: Server still exists in Zoho dashboard. Delete manually if needed.`);
}
```

### **Validate All Servers**

```javascript
async function validateAllServers() {
  const config = JSON.parse(readFile('.vscode/mcp.json'));
  const results = [];

  for (const [name, serverConfig] of Object.entries(config.servers)) {
    const isHealthy = await validateServer(name, serverConfig.url);
    results.push({ name, healthy: isHealthy, url: serverConfig.url });
  }

  console.table(results);
}
```

---

## Troubleshooting

### **Server Creation Fails**

**Problem:** Script throws error during creation

**Solutions:**
1. Check if you're logged into Zoho (https://accounts.zoho.com)
2. Verify you have MCP access enabled
3. Try manual creation instead
4. Check browser console for specific error

### **OAuth Fails After Creation**

**Problem:** 400 Bad Request during OAuth

**Solutions:**
1. Clear authentication: `/mcp` → server → "Clear authentication"
2. Delete and recreate server in Zoho dashboard
3. Verify redirect URI is set to `localhost` in server settings

### **Tools Not Loading**

**Problem:** Server connects but tools don't appear

**Solutions:**
1. Check `.vscode/mcp.json` has correct URL
2. Verify `"tools": ["*"]` is set
3. Reload VSCode window
4. Check server has tools enabled in Zoho dashboard

---

## Success Metrics

- **Server creation time:** <5 minutes per server (manual), <30 seconds (automated)
- **Configuration accuracy:** 100% (auto-generated configs)
- **OAuth success rate:** >95% (after initial setup)
- **Tool loading:** All configured tools available after reload

---

**Version:** 1.0.0
**Last Updated:** 2025-10-28
**Status:** ✅ Ready for Use

**Dependencies:**
- `.claude/scripts/zoho-mcp-server-creator.js`
- `.claude/zoho-tools/servers/registry.json`
- Kapture MCP (optional, for browser automation)
