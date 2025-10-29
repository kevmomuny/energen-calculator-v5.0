# Zoho MCP Tool Scraper v2 - Complete Guide

## Overview

Extract ALL available tools from Zoho MCP using the refined scraper that works with the "Configure Tools" modal.

**Key Discovery:** The main Tools page only shows tools already added. To see ALL available tools (800-1000+), you must use the "Configure Tools" modal.

---

## Quick Start (5 Minutes Per App)

### 1. Open Zoho MCP Console
`https://mcp.zoho.com/mcp-client#/mcp-client/server/{your_server_id}/tools`

### 2. Click "Configure Tools" Button
Upper right corner → Opens modal showing all Zoho apps

### 3. Select an App
Click on app (e.g., "Zoho Books") → Shows complete tool list with checkboxes

### 4. Open Browser Console
`F12` or `Ctrl+Shift+J` → Console tab

### 5. Run Scraper
1. Copy entire contents of `.claude/zoho-tools/scrape-zoho-mcp-v2.js`
2. Paste into console
3. Press Enter

Watch it work:
```
🔍 Starting Zoho MCP Tool Scraper v2...
📦 App: Zoho Books
📊 Expected tools: 600
📄 Scroll 0px: Found 6 new tools (Total: 6)
...
✅ Scraping complete!
📊 Total tools extracted: 600
```

### 6. Save Results
```javascript
// Option A: Copy to clipboard
copy(JSON.stringify(window.zohoMcpScraperResults, null, 2));

// Option B: Auto-download
const blob = new Blob([JSON.stringify(window.zohoMcpScraperResults, null, 2)], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'zoho-books-tools.json';
a.click();
```

### 7. Import to Catalog
```bash
cd .claude/zoho-tools
node sync-catalog.cjs --import zoho-books-tools.json --app "Zoho Books"
```

### 8. Repeat for All Apps
- Zoho CRM (~119 tools)
- Zoho Inventory (~200-300)
- Zoho Desk (~100-200)
- Zoho Invoice (~100-150)
- And more...

---

## Detailed Workflow

### Understanding the UI Structure

**Main Tools Page** (reached from sidebar):
- Shows only tools ALREADY ADDED to your server
- Limited view (maybe 12-20 tools)
- Not useful for discovery

**Configure Tools Modal** (button in upper right):
- Shows ALL available tools for each app
- Includes checkboxes (green = already added)
- Can add up to 50 tools at once
- Can only remove 1 at a time (from main page)
- THIS is where you scrape from

### What the Scraper Does

1. **Detects app name** from modal header
2. **Reads tool count** from description (e.g., "600 Actions")
3. **Finds scroll container** automatically
4. **Scrolls through entire list** with intelligent lazy-loading detection
5. **Extracts each tool:**
   - Name (e.g., `create_invoice`)
   - Description (e.g., "Create a new invoice for a customer")
   - Added status (true/false based on green checkmark)
6. **Deduplicates** tools by name
7. **Outputs JSON** with complete data

### Scraper Features

**Smart scrolling:**
- Scrolls in 500px increments
- Waits 500ms between scrolls for lazy loading
- Stops after 5 scrolls with no new tools
- Detects when bottom is reached

**Progress tracking:**
```
📄 Scroll 0px: Found 6 new tools (Total: 6)
📄 Scroll 500px: Found 8 new tools (Total: 14)
📄 Scroll 1000px: Found 7 new tools (Total: 21)
```

**Validation:**
- Compares extracted count with expected count
- Warns if mismatch detected
- Reports added vs. available tools

**Output formats:**
- JSON (for programmatic import)
- Text (for human review)
- Both include timestamps and metadata

---

## Apps to Scrape

Based on modal exploration, these apps are available:

1. **Zoho Books** - ~600 actions (accounting/finance)
2. **Zoho CRM** - ~119 actions (customer relationship)
3. **Zoho Inventory** - ~200-300 (inventory management)
4. **Zoho Invoice** - ~100-150 (invoicing)
5. **Zoho Billing** - ~50-100 (subscriptions/billing)
6. **Zoho Desk** - ~100-200 (helpdesk/support)
7. **Zoho Projects** - ~100-200 (project management)
8. **Zoho Mail** - ~50-100 (email)
9. **Zoho WorkDrive** - ~50-100 (file storage)
10. **Zoho Cliq** - ~20-50 (chat/messaging)
11. **Zoho Delve** - ~10-30 (analytics)
12. **Bigin** - ~50-100 (CRM lite)

**Estimated total: 800-1000+ tools**

---

## Troubleshooting

### Scraper can't find scroll container

**Symptoms:**
```
❌ Could not find scroll container
```

**Solution:**
```javascript
// Debug manually:
const table = document.querySelector('.mcp-tools-table');
console.log('Table found:', !!table);

// Find scrollable parent:
let el = table?.parentElement;
while (el) {
    const style = window.getComputedStyle(el);
    console.log(el.className, style.overflowY);
    if (style.overflowY === 'scroll' || style.overflowY === 'auto') {
        console.log('✅ Found:', el);
        break;
    }
    el = el.parentElement;
}
```

### Tool count doesn't match

**Symptoms:**
```
⚠️  Warning: Expected 600 tools but found 583
```

**Causes:**
- Lazy loading not complete
- Some tools filtered out (permissions/subscription)
- Different app version

**Solutions:**
- Increase `SCROLL_DELAY` to 1000ms in scraper
- Manually scroll to bottom before running
- Run scraper again
- Accept the count if close (within 5%)

### No tools extracted

**Symptoms:**
```
📊 Total tools extracted: 0
```

**Solution:**
1. Verify you're in the Configure Tools modal (not main Tools page)
2. Verify an app is selected (see app name in header)
3. Check console for JavaScript errors (red text)
4. Try manual extraction (see below)

### Can't copy results

**Solution 1: Use clipboard API**
```javascript
navigator.clipboard.writeText(JSON.stringify(window.zohoMcpScraperResults, null, 2))
  .then(() => console.log('✅ Copied!'))
  .catch(err => console.error('❌ Copy failed:', err));
```

**Solution 2: Download file**
```javascript
const data = JSON.stringify(window.zohoMcpScraperResults, null, 2);
const blob = new Blob([data], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${window.zohoMcpScraperResults.app.toLowerCase().replace(/\s+/g, '-')}-tools.json`;
a.click();
URL.revokeObjectURL(url);
```

### Console clears results

**Solutions:**
- Enable "Preserve log" in DevTools settings (top of console)
- Results are stored in `window.zohoMcpScraperResults` (survives console clear)
- Copy/download immediately after scraping

---

## Manual Extraction (Fallback)

If scraper fails completely, extract manually:

```javascript
// 1. Get all tool names
const names = Array.from(document.querySelectorAll('lyte-text.mcp-tools-table-content'))
    .map(el => el.textContent.trim());

// 2. Get all descriptions
const descs = Array.from(document.querySelectorAll('lyte-text.mcp-tools-table-content-desc'))
    .map(el => el.textContent.trim());

// 3. Check for "Added" badges
const rows = document.querySelectorAll('.mcp-tools-table-content-wraper');
const tools = Array.from(rows).map((row, i) => {
    const nameEl = row.querySelector('lyte-text.mcp-tools-table-content');
    const descEl = row.querySelector('lyte-text.mcp-tools-table-content-desc');
    const addedEl = row.querySelector('p.zcat-color-added');

    return {
        name: nameEl?.textContent.trim() || '',
        description: descEl?.textContent.trim() || '',
        isAdded: !!addedEl
    };
});

// 4. Copy results
copy(JSON.stringify({
    app: document.querySelector('lyte-text.add-tools-modal-head')?.textContent.trim() || 'Unknown',
    totalTools: tools.length,
    scrapedAt: new Date().toISOString(),
    tools: tools
}, null, 2));

console.log(`✅ Extracted ${tools.length} tools - copied to clipboard`);
```

---

## Import Workflow

After scraping all apps:

### 1. Import each JSON file
```bash
cd .claude/zoho-tools

# Import each app
node sync-catalog.cjs --import zoho-books-tools.json --app "Zoho Books"
node sync-catalog.cjs --import zoho-crm-tools.json --app "Zoho CRM"
node sync-catalog.cjs --import zoho-inventory-tools.json --app "Zoho Inventory"
# ... etc
```

### 2. Verify catalog
```bash
# Show statistics
node sync-catalog.cjs --stats

# Expected output:
# Total apps: 12
# Total tools: 800-1000+
# Categories: 50+
```

### 3. Search tools
```bash
# Search by keyword
node sync-catalog.cjs --search "invoice"

# Expected: 50+ tools across Books, Invoice, CRM
```

### 4. Create workflows
```bash
# Generate server config for specific workflow
node generate-server-config.cjs --workflow inventory-management
```

---

## Next Steps

Once catalog is complete:

### Use the zoho-tool-finder Skill
```
"Use zoho-tool-finder to find all Inventory management tools"
"Use zoho-tool-finder to recommend tools for Fullbay sync"
"Use zoho-tool-finder to show tools in the 'invoicing' category"
```

### Create Specialized Servers
1. Go to Zoho MCP dashboard
2. Create new server for workflow (e.g., "energen-inventory")
3. Add 15-25 tools recommended by tool-finder
4. Configure in `.vscode/mcp.json`

### Zero-Context Tool Access
- Catalog stays out of context (0 tokens)
- Skill loads only when needed (~5k tokens)
- Search without loading tools
- Progressive disclosure: metadata → instructions → tools

**Token savings: 88k → 18.5k (78% reduction)**

---

## Files Reference

- **Scraper:** `.claude/zoho-tools/scrape-zoho-mcp-v2.js`
- **Catalog:** `.claude/zoho-tools/catalog.json`
- **Sync script:** `.claude/zoho-tools/sync-catalog.cjs`
- **Config generator:** `.claude/zoho-tools/generate-server-config.cjs`
- **Tool finder skill:** `.claude/skills/zoho-tool-finder/SKILL.md`

---

**Last Updated:** 2025-10-24
**Version:** 2.0 (Refined with Kapture exploration)
