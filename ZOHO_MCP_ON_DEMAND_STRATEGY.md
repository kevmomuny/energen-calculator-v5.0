# Zoho MCP On-Demand Tool Loading Strategy

**Concept**: Start with minimal tools, add only what you need  
**Benefit**: Keep prompt size small while accessing full 176-tool catalog  
**Date**: 2025-10-23

---

## The Smart Approach

Instead of loading all 176 tools at once, **load only the tools you're actively using**:

### Start Small → Grow As Needed → Shrink When Done

```
Day 1: Working on customer management
  → Enable: create_contact, list_contacts, update_contact (3 tools)

Day 2: Need invoice features
  → Add: create_invoice, email_invoice (now 5 tools)

Day 3: Need estimates
  → Add: create_estimate, list_estimates (now 7 tools)

Day 4: Done with customers
  → Remove: contact tools (back to 4 tools)
```

**Result**: Never load more than 10-15 tools at once, keep prompt size manageable

---

## How It Works

### Current Setup (Empty by Default)
**File**: `.vscode/mcp.json`
```json
{
  "servers": {},
  "inputs": []
}
```
- **Prompt impact**: Zero
- **Zoho tools available**: None
- **Best for**: General development work

### Add Tools When You Need Them
**File**: `.vscode/mcp.json` (modified)
```json
{
  "servers": {
    "energen-lean": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d",
      "tools": [
        "create_contact",
        "list_contacts"
      ]
    }
  },
  "inputs": []
}
```
- **Prompt impact**: ~400 tokens (2 tools × 200 tokens)
- **Zoho tools available**: 2 specific tools
- **Best for**: Focused work on one area

---

## Tool Selection Strategies

### Strategy 1: Task-Based Loading

**For Customer Management:**
```json
"tools": [
  "create_contact",
  "list_contacts",
  "get_contact",
  "update_contact"
]
```
**Prompt size**: ~800 tokens (4 tools)

**For Invoice Processing:**
```json
"tools": [
  "create_invoice",
  "list_invoices",
  "get_invoice",
  "email_invoice",
  "mark_invoice_sent"
]
```
**Prompt size**: ~1,000 tokens (5 tools)

**For Complete Workflow:**
```json
"tools": [
  "create_contact",
  "create_estimate",
  "create_invoice",
  "create_customer_payment",
  "email_invoice"
]
```
**Prompt size**: ~1,000 tokens (5 tools)

### Strategy 2: Progressive Loading

**Week 1 - Customer Setup:**
```json
"tools": ["create_contact", "list_contacts", "update_contact"]
```

**Week 2 - Add Invoicing:**
```json
"tools": [
  "create_contact", "list_contacts", "update_contact",
  "create_invoice", "list_invoices", "email_invoice"
]
```

**Week 3 - Add Payments:**
```json
"tools": [
  "create_contact", "list_contacts",
  "create_invoice", "email_invoice",
  "create_customer_payment", "list_customer_payments"
]
```

**Week 4 - Optimize (remove unused):**
```json
"tools": [
  "list_contacts",
  "create_invoice", "email_invoice",
  "create_customer_payment"
]
```

### Strategy 3: Use Case Presets

Create multiple preset configs for different scenarios:

**`.vscode/mcp-zoho-quotes.json`** (Quote workflow)
```json
{
  "servers": {
    "energen-lean": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=...",
      "tools": [
        "list_contacts",
        "create_estimate",
        "update_estimate",
        "email_estimate",
        "list_estimates"
      ]
    }
  }
}
```

**`.vscode/mcp-zoho-invoices.json`** (Invoice workflow)
```json
{
  "servers": {
    "energen-lean": {
      "tools": [
        "list_contacts",
        "create_invoice",
        "update_invoice",
        "email_invoice",
        "list_invoices",
        "create_customer_payment"
      ]
    }
  }
}
```

**`.vscode/mcp-zoho-crm.json`** (CRM operations)
```json
{
  "servers": {
    "energen-lean": {
      "tools": [
        "Create Records",
        "Get Records",
        "Update Records",
        "Search Records",
        "list_contacts"
      ]
    }
  }
}
```

---

## Workflow: Adding Tools On-Demand

### Step 1: Identify Tools You Need
Check the complete catalog:
```bash
cat ZOHO_MCP_TOOLS_REFERENCE.md
```

Find the exact tool names you need.

### Step 2: Edit MCP Config
Open `.vscode/mcp.json` and add tools:

**Before:**
```json
{
  "servers": {},
  "inputs": []
}
```

**After:**
```json
{
  "servers": {
    "energen-lean": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d",
      "tools": [
        "create_contact",
        "create_invoice"
      ]
    }
  },
  "inputs": []
}
```

### Step 3: Restart Claude Code
```powershell
# Close all windows
Get-Process | Where-Object {$_.Name -like "*code*"} | Stop-Process -Force

# Reopen project
```

### Step 4: Verify Tools Loaded
```
/mcp list

# Should show:
energen-lean: 2 tools
- create_contact
- create_invoice
```

### Step 5: Use the Tools
```javascript
// Now you can call these specific tools:
await mcp__energen_lean__create_contact({ ... });
await mcp__energen_lean__create_invoice({ ... });
```

### Step 6: Add More Tools as Needed
Edit `.vscode/mcp.json` again, add more tool names, restart.

---

## Quick Commands

### Enable Specific Tools
```powershell
# Edit the config file
code .vscode/mcp.json

# Add tool names to the "tools" array
# Save and restart Claude Code
```

### Switch Between Presets
```powershell
# Use quote workflow
Copy-Item .vscode/mcp-zoho-quotes.json .vscode/mcp.json -Force

# Use invoice workflow
Copy-Item .vscode/mcp-zoho-invoices.json .vscode/mcp.json -Force

# Use CRM workflow
Copy-Item .vscode/mcp-zoho-crm.json .vscode/mcp.json -Force

# Disable all
'{"servers": {}, "inputs": []}' | Out-File .vscode/mcp.json -Encoding utf8
```

---

## Recommended Tool Limits

| # Tools | Prompt Impact | Load Time | Recommendation |
|---------|---------------|-----------|----------------|
| 0 | 0 tokens | Instant | ✅ Default for general work |
| 1-5 | ~1K tokens | Fast | ✅ Perfect for focused tasks |
| 6-10 | ~2K tokens | Fast | ✅ Good for single workflows |
| 11-20 | ~4K tokens | Moderate | ⚠️ Use temporarily |
| 21-50 | ~10K tokens | Slow | ⚠️ Only if necessary |
| 51+ | ~15K+ tokens | Very slow | ❌ Avoid |
| 176 (all) | ~35K tokens | Fails | ❌ Never use |

---

## Common Tool Combinations

### Energen Calculator Workflows

**Quote Generation (5 tools)**
```json
[
  "list_contacts",
  "create_estimate",
  "update_estimate", 
  "email_estimate",
  "list_estimates"
]
```

**Invoice Creation (6 tools)**
```json
[
  "list_contacts",
  "create_invoice",
  "update_invoice",
  "email_invoice",
  "list_invoices",
  "create_customer_payment"
]
```

**Customer Sync (7 tools)**
```json
[
  "create_contact",
  "list_contacts",
  "get_contact",
  "update_contact",
  "Create Records",
  "Get Records",
  "Update Records"
]
```

**Full Service Workflow (12 tools)**
```json
[
  "list_contacts",
  "create_estimate",
  "email_estimate",
  "create_invoice",
  "email_invoice",
  "create_customer_payment",
  "create_sales_order",
  "mark_sales_order_as_confirmed",
  "create_project",
  "add_task",
  "Create Records",
  "Update Records"
]
```

---

## Best Practices

### ✅ DO

1. **Start with 0 tools** - Enable only when needed
2. **Add tools incrementally** - Don't jump to 20+ tools
3. **Use presets** - Create workflow-specific configs
4. **Remove unused tools** - Clean up when done with a task
5. **Check prompt size** - Stay under 15K tokens total

### ❌ DON'T

1. **Don't use `["*"]`** - Loads all 176 tools
2. **Don't keep tools loaded** - Disable when not actively using
3. **Don't mix workflows** - Use focused tool sets
4. **Don't exceed 20 tools** - Without good reason
5. **Don't forget to restart** - Changes require restart

---

## Tool Discovery

### Finding the Right Tools

**Option 1: Search the Reference**
```bash
# Find all invoice tools
cat ZOHO_MCP_TOOLS_REFERENCE.md | grep -i invoice

# Find all contact tools
cat ZOHO_MCP_TOOLS_REFERENCE.md | grep -i contact
```

**Option 2: Browse by Category**
Open `ZOHO_MCP_TOOLS_REFERENCE.md` and navigate to:
- Contacts & Customers (22 tools)
- Invoices (30+ tools)
- Estimates (10 tools)
- Payments (14 tools)
- etc.

**Option 3: Test with Minimal Config**
Enable just 1-2 tools to test, then expand as needed.

---

## Example: Real-World On-Demand Loading

### Day 1: Setting Up Customer Import

**Task**: Import customers from Fullbay to Zoho

**Tools Needed**:
```json
"tools": [
  "create_contact",
  "list_contacts",
  "update_contact_using_custom_field"
]
```

**Prompt impact**: ~600 tokens  
**Result**: Fast load, focused work ✅

### Day 2: Generate Invoices for New Customers

**Task**: Create and send invoices

**Tools Added**:
```json
"tools": [
  "list_contacts",
  "create_invoice",
  "email_invoice",
  "create_customer_payment"
]
```

**Prompt impact**: ~800 tokens  
**Result**: Still fast, covers workflow ✅

### Day 3: Done with Zoho Work

**Action**: Disable Zoho MCP

```json
{
  "servers": {},
  "inputs": []
}
```

**Prompt impact**: 0 tokens  
**Result**: Maximum speed for other work ✅

---

## Automation Scripts

### PowerShell Helper Functions

Add to your PowerShell profile or run manually:

```powershell
# Function to add a tool
function Add-ZohoTool {
    param([string]$ToolName)
    
    $config = Get-Content .vscode/mcp.json | ConvertFrom-Json
    if (-not $config.servers."energen-lean") {
        # Initialize if empty
        $config = @{
            servers = @{
                "energen-lean" = @{
                    type = "http"
                    url = "https://energen-lean-897662416.zohomcp.com/mcp/message?key=..."
                    tools = @()
                }
            }
            inputs = @()
        }
    }
    
    $config.servers."energen-lean".tools += $ToolName
    $config | ConvertTo-Json -Depth 10 | Out-File .vscode/mcp.json -Encoding utf8
    
    Write-Host "Added tool: $ToolName"
    Write-Host "Restart Claude Code to apply changes"
}

# Function to remove a tool
function Remove-ZohoTool {
    param([string]$ToolName)
    
    $config = Get-Content .vscode/mcp.json | ConvertFrom-Json
    $config.servers."energen-lean".tools = $config.servers."energen-lean".tools | Where-Object { $_ -ne $ToolName }
    $config | ConvertTo-Json -Depth 10 | Out-File .vscode/mcp.json -Encoding utf8
    
    Write-Host "Removed tool: $ToolName"
}

# Function to list current tools
function Get-ZohoTools {
    $config = Get-Content .vscode/mcp.json | ConvertFrom-Json
    $config.servers."energen-lean".tools
}
```

**Usage**:
```powershell
Add-ZohoTool "create_contact"
Add-ZohoTool "create_invoice"
Get-ZohoTools
Remove-ZohoTool "create_contact"
```

---

## Summary

**Strategy**: Load only the Zoho tools you're actively using

**Benefits**:
- ✅ Small prompt size (stay under 2K tokens)
- ✅ Fast Claude Code startup
- ✅ Access to all 176 tools (when needed)
- ✅ Flexibility to change as work changes

**Workflow**:
1. Start with 0 tools (disabled)
2. Add 3-5 tools for current task
3. Use them for your work
4. Remove when done
5. Repeat for next task

**Result**: Best of both worlds - full Zoho MCP access without prompt size issues!

---

**See Also**:
- `ZOHO_MCP_TOOLS_REFERENCE.md` - Complete tool catalog
- `ZOHO_MCP_ACTIVATION_GUIDE.md` - Enable/disable instructions
- `PROMPT_SIZE_FINAL_FIX.md` - Why this approach is necessary
