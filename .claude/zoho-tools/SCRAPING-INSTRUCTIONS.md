# How to Scrape Tools from Zoho MCP Console

This guide shows you how to extract all available tools from your Zoho MCP server.

---

## Quick Start (3 Minutes)

### Step 1: Open Zoho MCP Console

Go to: https://mcp.zoho.com/mcp-client#/mcp-client/server/49790000000017243/tools

(Or navigate to your energen-lean server → Tools tab)

### Step 2: Open Browser Console

**Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)

### Step 3: Copy & Paste Scraper Script

1. Open file: `.claude/zoho-tools/scrape-zoho-mcp.js`
2. Copy ALL the code
3. Paste into browser console
4. Press `Enter`

The scraper will:
- Automatically click through each app (Books, CRM, etc.)
- Extract all tool names and descriptions
- Output results in console

### Step 4: Export the Data

After scraping completes, run ONE of these commands in console:

**Option A: Copy to clipboard**
```javascript
copy(JSON.stringify(window.zohoToolsData, null, 2));
```
Then paste into a file: `zoho-mcp-discovered-tools.json`

**Option B: Download as file**
```javascript
const blob = new Blob([JSON.stringify(window.zohoToolsData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'zoho-mcp-tools-' + new Date().toISOString().split('T')[0] + '.json';
a.click();
URL.revokeObjectURL(url);
```

### Step 5: Import to Catalog

Once you have the JSON file, I'll help you import it to the catalog.

---

## Alternative: Manual Extraction (Per App)

If automatic scraping doesn't work:

### Method 1: Current Page Only

In console, run:
```javascript
extractCurrentPageTools()
```

This will extract tools from whatever app is currently selected.

### Method 2: One App at a Time

1. Click on "Zoho Books" in sidebar
2. Wait for tools to load
3. Scroll to bottom to load all tools
4. Run: `extractCurrentPageTools()`
5. Copy output
6. Save to file: `zoho-books-tools.txt`
7. Repeat for each app (Zoho CRM, etc.)

Then import each file:
```bash
node .claude/zoho-tools/sync-catalog.cjs --import zoho-books-tools.txt --app "Zoho Books"
node .claude/zoho-tools/sync-catalog.cjs --import zoho-crm-tools.txt --app "Zoho CRM"
```

---

## Troubleshooting

### "Nothing happens when I run the script"

- Make sure you're on the Tools page (URL should end with `/tools`)
- Check for JavaScript errors in console (red text)
- Try the manual method instead

### "Only a few tools extracted"

- The page may use lazy loading
- Scroll down to load more tools before running scraper
- Run `extractCurrentPageTools()` after scrolling

### "Tools are cut off or incomplete"

- Some apps have 100+ tools that require scrolling
- The scraper attempts to scroll automatically
- If it misses some, manually scroll and re-run on that app

### "Script says 'Timeout waiting for...'"

- Page may still be loading
- Refresh page and wait 5 seconds before running script
- Try manual extraction method instead

---

## Expected Output

The scraper should find:

- **Zoho Books**: ~490 tools
- **Zoho CRM**: ~119 tools
- **Zoho Inventory**: 50-100 tools (if configured)
- **Zoho FSM**: 30-50 tools (if configured)
- **Zoho Desk**: 40-80 tools (if configured)
- **Others**: Varies

**Total expected**: 600-1000+ tools depending on which apps are enabled

---

## What to Do With the Results

After exporting, ping me in Claude Code and say:

"I've scraped the Zoho MCP tools, here's the JSON file"

I'll then:
1. Parse the JSON
2. Update catalog.json with all discovered tools
3. Add proper categorization
4. Update the tool counts
5. Generate workflows for the new apps

---

## Next Steps After Import

Once tools are in the catalog:

1. **Search for tools**
   ```
   "Use zoho-tool-finder to find all Inventory tools"
   ```

2. **Create specialized servers**
   ```bash
   node .claude/zoho-tools/generate-server-config.cjs --workflow inventory-management
   ```

3. **Add to your Claude Code config**

4. **Start using the tools!**

---

**File:** `.claude/zoho-tools/scrape-zoho-mcp.js`
**Last Updated:** 2025-10-24
