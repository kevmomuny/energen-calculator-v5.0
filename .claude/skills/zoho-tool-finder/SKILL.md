---
name: zoho-tool-finder
description: Discover and activate Zoho MCP tools from 600+ available across Books, CRM, and more apps
version: 1.0.0
author: Energen Development Team
tags: [zoho, mcp, tools, discovery, search]
---

# Zoho Tool Finder Skill

**Purpose:** Discover the right Zoho MCP tools for any workflow without loading all 600+ tools into context.

**Problem Solved:** With 600+ Zoho tools available, loading them all consumes 88k+ tokens. This skill provides on-demand tool discovery, letting you find and activate only the 5-20 tools you actually need.

---

## What This Skill Does

1. **Search by workflow** - "I need to sync Fullbay customers" → finds 7 relevant tools
2. **Browse by app** - "Show me all Zoho Books invoice tools" → finds 35 tools, suggests grouping
3. **Browse by category** - "What CRM field management tools exist?" → finds 8 tools
4. **Recommend servers** - Suggests which cloud MCP servers to create with which tools
5. **Generate configs** - Outputs ready-to-use `.vscode/mcp.json` entries

---

## How It Works

### The Catalog (Zero Context Cost)

All 600+ tools are stored in:
```
.claude/zoho-tools/catalog.json
```

**Token cost:** ZERO (file only read when you search)

This catalog contains:
- All tool names, descriptions, parameters
- Categorized by app (Books, CRM, Inventory, etc.)
- Tagged by workflow (invoicing, field-admin, data-sync, etc.)
- Searchable by keywords

### Progressive Discovery

1. You activate this skill (loads skill instructions only, ~5k tokens)
2. Skill reads only relevant portions of catalog for your search
3. Returns 10-20 matching tools
4. You decide which tools to activate
5. Create cloud MCP server with those tools only

---

## Usage Examples

### Example 1: Workflow-Based Search

**You:** "I need to sync Fullbay customers to Zoho Books and CRM"

**Claude (via skill):**
```
Searching catalog for: sync, customer, fullbay, books, crm...

Found 7 relevant tools:

ZOHO BOOKS (4 tools):
✓ create_contact - Create customer/vendor with addresses, payment terms
✓ list_contacts - List all contacts with filters
✓ update_contact - Update existing contact details
✓ import_customer_using_crm_account_id - Import from CRM by account ID

ZOHO CRM (3 tools):
✓ Search Records - Search accounts/contacts by criteria
✓ Create Records - Create new CRM records
✓ Get Fields - Get module fields for mapping

RECOMMENDATION:
Create cloud MCP server: "energen-fullbay-sync"
Add these 7 tools
Estimated context: ~3.5k tokens (vs 88k for all tools)

Would you like me to generate the mcp.json config?
```

### Example 2: App-Specific Browsing

**You:** "Show me all Zoho Books invoice tools"

**Claude:**
```
Reading catalog for: Zoho Books > invoicing category...

Found 38 tools in "invoicing" category:

CREATE & UPDATE (8 tools):
✓ create_invoice
✓ update_invoice
✓ create_invoice_from_salesorder
✓ update_invoice_billing_address
✓ update_invoice_shipping_address
✓ update_invoice_template
✓ update_invoice_using_custom_field
✓ generate_invoice_payment_link

READ & LIST (6 tools):
✓ list_invoices
✓ get_invoice
✓ get_invoice_email
✓ get_invoice_attachment
✓ list_invoice_payments
✓ list_invoice_credits_applied

SEND & EMAIL (4 tools):
✓ email_invoice
✓ email_invoices (bulk, max 10)
✓ bulk_invoice_reminder
✓ bulk_export_invoices_as_pdf

STATUS MANAGEMENT (5 tools):
✓ approve_invoice
✓ mark_invoice_sent
✓ mark_invoice_void
✓ cancel_write_off_invoice
✓ enable_invoice_payment_reminder

... (15 more tools)

RECOMMENDATION:
38 tools is too many for one server. Consider splitting:

Server 1: "energen-invoice-create" (15 tools)
- create, update, email, send operations

Server 2: "energen-invoice-admin" (10 tools)
- approve, void, refund, advanced operations

Server 3: "energen-invoice-explorer" (8 tools)
- list, get, search, read-only operations

Which would you like to create?
```

### Example 3: Category Exploration

**You:** "What custom field management tools are available in CRM?"

**Claude:**
```
Searching: custom field, crm, fields, metadata...

Found 8 tools in "fields" category:

CREATE & UPDATE:
✓ Create Field - Create custom field in any module
✓ Update Field - Modify existing field definition
✓ Update Fields - Bulk update multiple fields

READ & GET:
✓ Get Fields - List all fields for a module
✓ Get Field - Get details of specific field
✓ Get Updated Field Details - Get recently modified fields
✓ Get Updated fields - Bulk get modified fields

DELETE:
✓ Delete Field - Remove custom field from module

RELATED TOOLS (consider adding):
✓ Get Modules - See which modules you can add fields to
✓ Create Custom Modules - Create entirely new module
✓ Get Layouts - See field layout configuration

RECOMMENDATION:
Server: "energen-field-admin" (12 tools total)
Estimated context: ~6k tokens

Tools to add:
- 8 field management tools above
- 4 related module/layout tools

Perfect for: Custom field setup, module administration, CRM customization

Generate config?
```

---

## Workflows

The catalog includes 5 pre-defined workflows:

### 1. Fullbay Sync
**Tools:** 7 (Books contacts + CRM records + field mapping)
**Use case:** Sync Fullbay customers/assets to Zoho

### 2. Field Administration
**Tools:** 12 (CRM field + module + layout management)
**Use case:** Set up custom fields, modules, layouts

### 3. Data Exploration
**Tools:** 15 (list/get operations across Books & CRM)
**Use case:** Browse data, search records, explore without modifications

### 4. Invoicing
**Tools:** 10 (invoice create/send + contacts + items)
**Use case:** Daily invoicing operations

### 5. CRM Workflow Automation
**Tools:** 8 (workflows + webhooks + notifications)
**Use case:** Automate CRM processes, integrate external apps

---

## Commands

### Search Commands

```
"Find tools for [workflow]"
"Search for [keyword]"
"Show me tools to [do something]"
```

### Browse Commands

```
"Show all [app name] tools"
"What tools are in [category]?"
"List tools for [operation type]"
```

### Workflow Commands

```
"Recommend tools for [workflow name]"
"Show me the fullbay-sync workflow"
"What's in the field-administration workflow?"
```

### Configuration Commands

```
"Generate mcp.json for [server name]"
"Create config for these tools: [tool list]"
"Show me the registry of created servers"
```

---

## Behind the Scenes

When you activate this skill, Claude will:

### 1. Read Catalog (selective)
```javascript
// Only reads relevant sections, not entire 1.5MB file
const catalog = readCatalog();
const searchTerms = extractKeywords(userRequest);
const results = searchCatalog(searchTerms, options);
```

### 2. Search & Filter
```javascript
// Multi-criteria search
function searchTools(query, options = {}) {
  // Search by:
  // - Tool name exact match (high priority)
  // - Keywords match
  // - Description match
  // - Category match
  // - App filter (if specified)
  // - Workflow association
}
```

### 3. Recommend Grouping
```javascript
// If too many results, suggest splitting
if (results.length > 20) {
  return splitIntoServers(results);
}
```

### 4. Generate Config
```javascript
// Output ready-to-use mcp.json entry
function generateMCPConfig(serverName, tools) {
  return {
    [serverName]: {
      "type": "http",
      "url": `https://${serverName}-*.zohomcp.com/...`,
      "tools": ["*"]
    }
  };
}
```

### 5. Update Registry
```javascript
// Track created server
function registerServer(serverInfo) {
  const registry = readRegistry();
  registry.servers.push(serverInfo);
  writeRegistry(registry);
}
```

---

## Creating a Cloud MCP Server

After tool discovery, here's the workflow:

### Step 1: Skill Recommends Tools
```
Claude: "I recommend these 7 tools for Fullbay sync:
1. create_contact
2. list_contacts
3. update_contact
4. Search Records
5. Create Records
6. Get Fields
7. import_customer_using_crm_account_id

Create cloud MCP server named: 'energen-fullbay-sync'"
```

### Step 2: You Create Server in Zoho UI
1. Go to: https://mcp.zoho.com/mcp-client
2. Click "Create New Server"
3. Name: `energen-fullbay-sync`
4. Search and enable each of the 7 tools
5. Save server
6. Copy the MCP URL

### Step 3: Claude Generates Config
```json
{
  "servers": {
    "fullbay-sync": {
      "type": "http",
      "url": "https://energen-fullbay-sync-897662416.zohomcp.com/mcp/message?key=YOUR_KEY",
      "tools": ["*"]
    }
  }
}
```

### Step 4: Add to .vscode/mcp.json
Paste the generated config into your MCP configuration file.

### Step 5: Restart Claude Code
Tools are now available!

---

## Catalog Structure

### Apps Currently in Catalog

1. **Zoho Books** (490 tools)
   - Categories: contacts, invoicing, estimates, payments, items, bills, expenses, credit_notes, purchase_orders, sales_orders, vendor_credits, vendor_payments, projects, taxes, organization, banking, accounting, fixed_assets, recurring, retainer, custom_modules, crm_integration

2. **Zoho CRM** (119 tools)
   - Categories: records, fields, modules, layouts, workflows, field_updates, webhooks, notifications, tags, notes, tasks, users, roles, organization, photos, territories, data

### Coming Soon
- Zoho Inventory
- Zoho FSM (Field Service Management)
- Zoho Desk
- Zoho Projects
- Zoho Creator
- Zoho Analytics
- 3rd-party integrations

---

## Search Algorithm

### Keyword Matching (Prioritized)

1. **Exact tool name match** → Score: 100
2. **Keyword match** → Score: 10 per keyword
3. **Description match** → Score: 5 per keyword
4. **Category match** → Score: 3

### Filters

- **By App:** `app: "Zoho Books"`
- **By Category:** `category: "invoicing"`
- **By Operation:** `operation: "create"` (create, read, update, delete, list, search)
- **By Workflow:** `workflow: "fullbay-sync"`

### Result Limit

- Default: 20 tools max per search
- Sorted by relevance score (descending)
- If more results exist, suggest refining search

---

## Server Registry Tracking

File: `.claude/zoho-tools/servers/registry.json`

Tracks:
- Server name
- MCP URL
- Creation date
- Tool list
- Apps used
- Associated workflows
- Status (active/inactive)
- Last used date

**Why:** Helps you remember which servers you've created and what tools are in each.

---

## Token Savings Calculator

### Before (Loading All Tools)
```
800+ tools × ~110 tokens avg = 88,000 tokens
Leaves: 112,000 tokens for actual work (56% of context)
```

### After (Selective Loading)
```
Catalog: 0 tokens (not loaded until searched)
Skill: ~5,000 tokens (instructions only)
Search results: ~10,000 tokens (20 tools found)
Active server: ~3,500 tokens (7 tools loaded)

Total: ~18,500 tokens
Leaves: 181,500 tokens for actual work (91% of context)
```

**Savings: 70,000 tokens (78% reduction!)**

---

## Tips for Best Results

### Be Specific
❌ "Show me Zoho tools"
✅ "Find tools for creating invoices in Zoho Books"

### Use Workflow Language
❌ "What tools do you have?"
✅ "I need to sync Fullbay data to Zoho"

### Browse Before Searching
```
1. "What categories exist in Zoho Books?"
2. "Show me the invoicing category"
3. "I need these 5 invoice tools"
```

### Start with Workflows
```
Pre-defined workflows are the fastest path:
- fullbay-sync
- field-administration
- data-exploration
- invoicing
- crm-workflow-automation
```

---

## Troubleshooting

### "Too many tools returned"
- Add app filter: "Show Zoho Books tools for..."
- Add category: "Show invoicing tools"
- Add operation type: "Show create operations for..."

### "Tool not found"
- Try synonyms: "customer" vs "contact"
- Browse category instead of searching
- Check if tool is in a different app than expected

### "Which server should I use?"
- Check registry: "Show me created servers"
- Skill will recommend based on workflow
- Create new server if no match

### "How do I know what keywords to use?"
- Browse categories first to see tool names
- Look at workflow recommendations
- Use natural language (skill will extract keywords)

---

## Maintenance

### Weekly: Sync Catalog
```bash
# When new Zoho apps/tools are added
node .claude/zoho-tools/sync-catalog.cjs --sync
```

### Monthly: Clean Registry
```bash
# Remove unused/inactive servers
node .claude/zoho-tools/manage-registry.cjs --cleanup
```

### As Needed: Add Keywords
```bash
# Improve search by adding keywords to tools
node .claude/zoho-tools/sync-catalog.cjs --add-keywords
```

---

## Next Steps

After using this skill to discover tools:

1. **Create cloud MCP server** in Zoho UI with recommended tools
2. **Copy MCP URL** from Zoho dashboard
3. **Add to .vscode/mcp.json** (Claude generates config for you)
4. **Restart Claude Code** to load tools
5. **Verify** with `/mcp list` command
6. **Update registry** (Claude does this automatically)

---

## Support Files

- **Catalog:** `.claude/zoho-tools/catalog.json`
- **Registry:** `.claude/zoho-tools/servers/registry.json`
- **Sync Script:** `.claude/zoho-tools/sync-catalog.cjs`
- **Design Doc:** `docs/plans/2025-10-24-zoho-tool-catalog-system-design.md`

---

## Success Metrics

- **Tool discovery time:** <30 seconds per search
- **Recommendation accuracy:** >90% (tools match actual needs)
- **Context savings:** 70k+ tokens (78% reduction)
- **Server creation time:** <5 minutes per server

---

**Version:** 1.0.0
**Last Updated:** 2025-10-24
**Status:** ✅ Ready for Use
