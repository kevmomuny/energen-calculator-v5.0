# MCP Master - Complete MCP Configuration & Best Practices

**Version:** 2.0  
**Last Updated:** 2025-10-29  
**Status:** ✅ All configurations verified and restored

---

## 🎯 Purpose

Master skill for all MCP server configurations, troubleshooting, and best practices for Energen Calculator v5.0.

**Use this skill when:**
- Setting up or troubleshooting MCP servers
- Need to understand which MCP tools are available
- Configuring Zoho integrations
- Debugging MCP connection issues
- Understanding MCP architecture and workflows

---

## 📋 VERIFIED MCP ARCHITECTURE (2025-10-29)

### Global MCP Servers (~/.vscode/mcp.json)

**Location:** `C:\Users\Kevin\.vscode\mcp.json`  
**Scope:** Available to ALL VS Code/Claude Code projects

#### 1. Desktop Commander ✅ ACTIVE
```json
{
  "command": "npx",
  "args": ["-y", "@wonderwhy-er/desktop-commander"],
  "env": {
    "ALLOWED_DIRECTORIES": "C:\\ECalc,C:\\Users\\Kevin\\Documents,C:\\Users\\Kevin\\Desktop",
    "FILE_READ_LINE_LIMIT": "5000",
    "FILE_WRITE_LINE_LIMIT": "100",
    "DEFAULT_SHELL": "powershell.exe"
  }
}
```

**Capabilities:**
- File operations (read, write, edit, search)
- Process management (start, interact, terminate)
- Terminal command execution with REPL support
- Directory operations
- Full Windows system access

**Tool Prefix:** `mcp__desktop-commander__*`

**Status:** ✅ Active and verified  
**Installation:** NPX auto-install  
**Cache:** `C:\Users\Kevin\AppData\Local\npm-cache\_npx\`

**Common Tools:**
- `get_config` - Get desktop commander configuration
- `read_file` - Read file contents
- `write_file` - Write file contents
- `edit_block` - Surgical text replacements
- `start_search` - Search files/content
- `list_directory` - List directory contents
- `start_process` - Start terminal process
- `interact_with_process` - Send input to process

---

#### 2. Excel MCP ✅ ACTIVE
```json
{
  "command": "npx",
  "args": ["-y", "@negokaz/excel-mcp-server"],
  "env": {
    "EXCEL_MCP_PAGING_CELLS_LIMIT": "4000"
  }
}
```

**Capabilities:**
- Excel file creation and editing
- Formula management
- Cell formatting
- Data analysis

**Tool Prefix:** `mcp__excel__*`

**Status:** ✅ Active  
**Installation:** NPX auto-install

---

#### 3. Git MCP ✅ ACTIVE
```json
{
  "command": "npx",
  "args": ["-y", "@cyanheads/git-mcp-server"],
  "env": {
    "MCP_LOG_LEVEL": "info",
    "GIT_SIGN_COMMITS": "false"
  }
}
```

**Capabilities:** Git operations and repository management  
**Tool Prefix:** `mcp__git-mcp__*`  
**Status:** ✅ Active

---

#### 4. Chrome DevTools MCP ✅ ACTIVE
```json
{
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp"]
}
```

**Capabilities:** Browser automation and debugging  
**Tool Prefix:** `mcp__chrome-devtools__*`  
**Status:** ✅ Active

---

#### 5. Kapture MCP ✅ ACTIVE
**Note:** Configured elsewhere but verified working

**Capabilities:**
- Browser tab management
- Screenshot capture
- DOM manipulation
- Form filling

**Tool Prefix:** `mcp__kapture__*`  
**Status:** ✅ Active and verified

**Common Tools:**
- `list_tabs` - List connected browser tabs
- `screenshot` - Capture screenshots
- `click` - Click elements
- `fill` - Fill form inputs

---

#### 6. Energen-Lean (Zoho Cloud) ✅ ACTIVE - GLOBAL
```json
{
  "type": "http",
  "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=099883afb805e408f6e184678a16524e",
  "tools": [
    "create_contact", "list_contacts", "get_contact", "update_contact",
    "create_invoice", "list_invoices", "get_invoice", "update_invoice", "email_invoice",
    "create_customer_payment", "list_customer_payments", "get_customer_payment",
    "create_item", "list_items", "get_item"
  ]
}
```

**Purpose:** General-purpose Zoho Books/CRM operations (16 tools)  
**Type:** HTTP Cloud MCP (Zoho Catalyst)  
**Tool Prefix:** `mcp__energen-lean__*`  
**Status:** ✅ Active in global config  
**Created:** Oct 23, 2025

---

### Project MCP Servers (.vscode/mcp.json)

**Location:** `C:\ECalc\active\energen-calculator-v5.0\.vscode\mcp.json`  
**Scope:** Only when this project is open  
**Strategy:** Focused servers with specific tool subsets (see ZOHO_MCP_SERVER_STRATEGY.md)

#### 1. energen-crm-structure ✅ RESTORED
```json
{
  "type": "http",
  "url": "https://energen-crm-structure-897662416.zohomcp.com/mcp/message?key=7dca20fb...",
  "tools": ["*"]
}
```

**Purpose:** CRM schema and metadata operations  
**Created:** Oct 28, 2025 10:01 AM  
**Tool Count:** ~8 tools (Get Fields, Get Modules, Get Layouts, etc.)


#### 2. energen-crm-records ✅ RESTORED
```json
{
  "type": "http",
  "url": "https://energen-crm-records-897662416.zohomcp.com/mcp/message?key=58c3640...",
  "tools": ["*"]
}
```

**Purpose:** CRM CRUD operations (Create, Read, Update, Delete)  
**Created:** Oct 28, 2025 10:12 AM  
**Tool Count:** ~7 tools (Create Records, Search Records, Get Records, etc.)

---

#### 3. energen-crm-automation ✅ RESTORED
```json
{
  "type": "http",
  "url": "https://energen-crm-automation-897662416.zohomcp.com/mcp/message?key=b59b57d...",
  "tools": ["*"]
}
```

**Purpose:** Workflows, blueprints, and webhooks  
**Created:** Oct 28, 2025 10:20 AM  
**Tool Count:** ~8 tools (automation-focused)

---

#### 4. energen-books-customers ✅ RESTORED
```json
{
  "type": "http",
  "url": "https://energen-books-customers-897662416.zohomcp.com/mcp/message?key=af0eb1c...",
  "tools": ["*"]
}
```

**Purpose:** Zoho Books customer/contact management  
**Created:** Oct 28, 2025 10:27 AM  
**Tool Count:** ~7 tools (create_contact, update_contact, etc.)

---

#### 5. energen-books-invoicing ✅ RESTORED
```json
{
  "type": "http",
  "url": "https://energen-books-invoicing-897662416.zohomcp.com/mcp/message?key=4c8b15d...",
  "tools": ["*"]
}
```

**Purpose:** Quote and invoice generation  
**Created:** Oct 28, 2025 10:39 AM  
**Tool Count:** ~10 tools (create_invoice, email_invoice, create_estimate, etc.)

---

#### 6. energen-data-explorer ✅ RESTORED
```json
{
  "type": "http",
  "url": "https://energen-data-explorer-897662416.zohomcp.com/mcp/message?key=bc72c3e...",
  "tools": ["*"]
}
```

**Purpose:** Safe read-only data exploration  
**Created:** Oct 28, 2025 09:46 AM  
**Tool Count:** ~12 tools (list_contacts, get_invoice, list_estimates, etc.)  
**Special:** Read-only operations for safe data browsing

---

## 📊 MCP Server Summary

### By Scope
- **Global (5 NPX + 1 Zoho):** 6 servers - Always available
- **Project (6 Zoho):** 6 servers - Only in Energen Calculator project

### By Type
- **NPX Servers:** 5 (desktop-commander, excel, git-mcp, chrome-devtools, kapture)
- **HTTP Cloud MCP:** 7 (all Zoho servers)

### Total: 12 MCP Servers Configured ✅


---

## 🔧 Zoho MCP Strategy

### Why Multiple Zoho Servers?

**Problem:** Loading all 600+ Zoho tools = 88,000 tokens (exceeds Claude Code limit)

**Solution:** Focused servers with 5-15 tools each
- Load only what's needed for current workflow
- 0 tokens by default
- 3-15k tokens when active
- **97% token reduction!**

### Server Organization

**Phase 1: Backend Data Structure**
1. `energen-data-explorer` - Read-only browsing (12 tools)
2. `energen-crm-structure` - Field/module management (8 tools)
3. `energen-crm-records` - CRM CRUD operations (7 tools)

**Phase 2: Operations**
4. `energen-books-customers` - Customer management (7 tools)
5. `energen-books-invoicing` - Quotes & invoices (10 tools)
6. `energen-crm-automation` - Workflows (8 tools)

**Phase 3: General Purpose**
7. `energen-lean` - Common operations (16 tools, global)

### When to Use Which Server

| Task | Use Server | Why |
|------|------------|-----|
| Browse Zoho data | energen-data-explorer | Read-only, safe |
| Add custom fields | energen-crm-structure | Field management |
| Create CRM records | energen-crm-records | CRM operations |
| Import customers | energen-books-customers | Contact sync |
| Generate quotes | energen-books-invoicing | Invoice/estimate ops |
| Set up workflows | energen-crm-automation | Automation tools |
| General Zoho work | energen-lean | Common operations |


---

## 🚨 Troubleshooting Guide

### MCP Servers Not Appearing

**Symptoms:** Tools not available, `/mcp list` doesn't show server

**Solutions:**
1. **Full VS Code Restart** (Most Common Fix)
   ```bash
   # Close ALL VS Code windows
   # Kill any remaining processes
   Get-Process | Where-Object {$_.Name -like "*code*"} | Stop-Process -Force
   # Reopen VS Code
   ```

2. **Verify Configuration Syntax**
   - Check `.vscode/mcp.json` (project)
   - Check `~/.vscode/mcp.json` (global)
   - Ensure valid JSON (no trailing commas, proper quotes)

3. **HTTP MCP Issues**
   - Verify URL is accessible
   - Check API key is valid
   - Confirm server status in Zoho dashboard: https://mcp.zoho.com/mcp-client

4. **NPX MCP Issues**
   - Clear NPX cache: `npx clear-npx-cache`
   - Verify network connectivity
   - Check npm global prefix: `npm config get prefix`

### OAuth/Authentication Errors

**Symptoms:** 401 Unauthorized, OAuth errors

**Solutions:**
1. Clear authentication and retry
2. Regenerate API keys in Zoho dashboard
3. Check OAuth scopes are sufficient
4. Verify organization ID is correct


### Tools Not Loading

**Symptoms:** Server connected but tools not available

**Solutions:**
1. Check `"tools": ["*"]` in configuration
2. Verify server has tools enabled in Zoho dashboard
3. Reload VS Code window
4. Check for tool name conflicts

### Performance Issues

**Symptoms:** Slow responses, timeouts

**Solutions:**
1. Use focused servers instead of energen-lean
2. Disable unused servers
3. Check network latency to Zoho cloud
4. Reduce `FILE_READ_LINE_LIMIT` if needed

---

## 📖 Best Practices

### 1. Use Focused Servers for Specific Tasks

**Good:**
```
Working on CRM data structure → Enable energen-crm-structure only
```

**Bad:**
```
Enable all 7 Zoho servers at once → High token usage
```

### 2. Start with Data Explorer for Safety

Always explore Zoho data with `energen-data-explorer` before modifying:
- List existing contacts
- Understand data structure
- Verify field mappings
- Test queries safely

### 3. Keep Global Config Clean

**Global (~/.vscode/mcp.json):**
- General-purpose NPX tools (desktop-commander, excel, etc.)
- Cross-project Zoho server (energen-lean)

**Project (.vscode/mcp.json):**
- Project-specific Zoho servers
- Focused tool subsets


### 4. Test Before Production

Always test MCP operations:
1. Test with `energen-data-explorer` (read-only)
2. Create test records in Zoho sandbox
3. Verify results before bulk operations
4. Keep backups of important data

### 5. Monitor Token Usage

- Check context window regularly
- Disable unused servers
- Use focused servers over general-purpose
- Document which servers are needed for which workflows

---

## 💡 Usage Examples

### Example 1: Browse Zoho Customers

**Goal:** List all customers from Zoho Books

**Server:** energen-data-explorer or energen-lean

**Code:**
```javascript
// Using energen-lean (global)
const customers = await mcp__energen_lean__list_contacts({
  organization_id: "883966257",
  contact_type: "customer",
  per_page: 200
});
```

### Example 2: Create Custom CRM Field

**Goal:** Add custom field to Contacts module

**Server:** energen-crm-structure

**Code:**
```javascript
// Using energen-crm-structure (project)
const field = await mcp__energen_crm_structure__create_field({
  module: "Contacts",
  field_label: "Fullbay_Customer_ID",
  data_type: "text",
  field_type: "text"
});
```


### Example 3: Generate Quote and Invoice

**Goal:** Create estimate, get approval, convert to invoice

**Servers:** energen-books-invoicing

**Code:**
```javascript
// 1. Create estimate
const estimate = await mcp__energen_books_invoicing__create_estimate({
  customer_id: "zoho_customer_id",
  estimate_number: "EST-2025-001",
  date: "2025-10-29",
  line_items: [{
    name: "Generator Maintenance Service",
    rate: 2500,
    quantity: 1
  }]
});

// 2. Mark accepted
await mcp__energen_books_invoicing__mark_estimate_accepted({
  estimate_id: estimate.estimate_id
});

// 3. Convert to invoice
const invoice = await mcp__energen_books_invoicing__create_invoice_from_estimate({
  estimate_id: estimate.estimate_id
});

// 4. Email to customer
await mcp__energen_books_invoicing__email_invoice({
  invoice_id: invoice.invoice_id
});
```

### Example 4: File Operations with Desktop Commander

**Goal:** Search and analyze project files

**Server:** desktop-commander (always available)

**Code:**
```javascript
// Search for service implementations
const searchSession = await mcp__desktop_commander__start_search({
  path: "C:/ECalc/active/energen-calculator-v5.0",
  pattern: "getService",
  searchType: "content",
  timeout_ms: 10000
});

// Get results
const results = await mcp__desktop_commander__get_more_search_results({
  sessionId: searchSession.sessionId
});
```

---

## 🔗 Related Documentation

- **Zoho Strategy:** `ZOHO_MCP_SERVER_STRATEGY.md` - Complete server architecture
- **Setup Report:** `MCP_SETUP_REPORT.md` - Historical setup documentation
- **Cloud Migration:** `CLOUD_MCP_SETUP.md` - Cloud MCP migration guide
- **Skills:** `.claude/skills/zoho-server-creator/` - Zoho server management skill

---

## ✅ Testing Checklist

After VS Code restart, verify all MCPs are working:

### Global MCPs
- [ ] `mcp__desktop_commander__get_config` - Returns config
- [ ] `mcp__kapture__list_tabs` - Returns tab list
- [ ] Excel, Git, Chrome DevTools tools available

### Project Zoho MCPs (Requires Project Open)
- [ ] `energen-data-explorer` - Can list contacts
- [ ] `energen-crm-structure` - Can get modules
- [ ] `energen-crm-records` - Can search records
- [ ] `energen-books-customers` - Can list contacts
- [ ] `energen-books-invoicing` - Can list invoices
- [ ] `energen-crm-automation` - Tools available

### Global Zoho MCP
- [ ] `energen-lean` - Can list contacts

---

## 🎯 Quick Reference

### Check MCP Status
```
ListMcpResourcesTool() - List all available MCP resources
```

### Common Desktop Commander Operations
```javascript
mcp__desktop_commander__read_file({path: "..."})
mcp__desktop_commander__write_file({path: "...", content: "..."})
mcp__desktop_commander__start_search({path: "...", pattern: "..."})
```


### Common Zoho Operations
```javascript
// List customers
mcp__energen_lean__list_contacts({organization_id: "883966257", contact_type: "customer"})

// Create invoice
mcp__energen_books_invoicing__create_invoice({customer_id: "...", line_items: [...]})

// Get CRM fields
mcp__energen_crm_structure__get_fields({module: "Contacts"})
```

---

## 📦 Installation Paths

### NPX MCPs
- **Execution:** `C:\Program Files\nodejs\npx.cmd`
- **Global Prefix:** `C:\Users\Kevin\AppData\Roaming\npm\`
- **Cache:** `C:\Users\Kevin\AppData\Local\npm-cache\_npx\`

### Cloud MCPs
- **No local installation** - Hosted on Zoho Catalyst infrastructure
- **Managed via:** https://mcp.zoho.com/mcp-client

---

## 🛡️ Security & Safety

### API Key Protection
- ❌ Never commit `.vscode/mcp.json` to git (contains API keys)
- ✅ Add to `.gitignore`
- ✅ Use environment variables where possible
- ✅ Regenerate keys if exposed

### Safe Operations
1. Always test with read-only server first (`energen-data-explorer`)
2. Use test data before production operations
3. Verify operations in Zoho dashboard
4. Keep backups before bulk operations
5. Monitor rate limits

---

## 📝 Maintenance

### Weekly
- Review active MCP servers
- Disable unused servers
- Check for MCP tool updates
- Verify OAuth status


### Monthly
- Update NPX MCP packages
- Review Zoho MCP dashboard for new features
- Check server health and performance
- Update documentation

### As Needed
- Refresh OAuth if expired
- Regenerate API keys if compromised
- Add new servers for new workflows
- Archive unused servers

---

## 🎉 Summary

This skill provides complete mastery of all MCP configurations for Energen Calculator v5.0:

- **12 MCP servers** properly configured and restored
- **Global + Project scoping** for optimal organization
- **Focused Zoho servers** for token efficiency (97% reduction)
- **Comprehensive troubleshooting** guide
- **Best practices** and usage examples
- **Complete testing** checklist

**Status:** ✅ All configurations verified (2025-10-29)

---

**Version:** 2.0  
**Created:** 2025-10-29  
**Last Verified:** 2025-10-29  
**Maintainer:** Claude Code with energen-code-investigator anti-hallucination protocols
