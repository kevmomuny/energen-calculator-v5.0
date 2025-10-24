# Energen Zoho Official MCP Integration Skill

**Purpose:** Use the official Zoho MCP Server (HTTP/SSE) for comprehensive Zoho Books, CRM, Inventory, Creator, and Projects operations. Prevents OAuth token scope issues by using Zoho's native MCP with full API access.

**When to Use:** ANY operation involving Zoho Books customers, invoices, estimates, or when CRM OAuth token returns 401 Unauthorized errors for Books/Inventory APIs.

---

## ⚠️ CRITICAL: Why Official MCP is Required

### The Problem with Direct API:
```
❌ CRM OAuth Token Scope: ZohoCRM.modules.ALL
✅ Books API Requires: ZohoBooks.fullaccess.all
❌ Result: 401 Unauthorized on /books/v3/* endpoints
```

**All direct Books API calls WILL FAIL with current CRM token.**

### The Solution:
```
✅ Official Zoho MCP has pre-configured OAuth with ALL scopes
✅ No token management needed
✅ Access to Books, CRM, Inventory, Creator, Projects
✅ Avoids API rate limits through Catalyst infrastructure
```

---

## 🔧 Official Zoho MCP Configuration

### Current Configuration Status:

**MCP Server URL:**
```
https://zohomcp-8921.onzatalast.com/mcp/message?key=fY2ep5208fb6edd8791d8326316d0a
```

**Claude Desktop Config Location:**
```
C:\Users\Kevin\AppData\Roaming\Claude\claude_desktop_config.json
```

**Current Config:**
```json
{
  "mcpServers": {
    "zoho-crm": {
      "command": "C:/Program Files/nodejs/node.exe",
      "args": ["C:/ECalc/active/energen-calculator-v5.0/modules/zoho-integration/start-mcp-server.js"],
      "env": {
        "ZOHO_CLIENT_ID": "1000.3048WYPLW66UPPFS6JJE2CLXQ8XAM",
        "ZOHO_CLIENT_SECRET": "...",
        "ZOHO_REFRESH_TOKEN": "...",
        "ZOHO_API_DOMAIN": "https://www.zohoapis.com",
        "ZOHO_ACCOUNTS_URL": "https://accounts.zoho.com"
      }
    },
    "ZohoMCP": {
      "url": "https://zohomcp-8921.onzatalyst.com/mcp/message?key=fY2ep5208fb6edd8791d8326316d0a"
    }
  }
}
```

**Status in Claude Code:**
- ✅ `zoho-crm` (local MCP) - CONNECTED
- ❌ `ZohoMCP` (official HTTP) - NOT APPEARING IN /MCP LIST

---

## 📋 Available Official Zoho MCP Tools

### Zoho Books Tools (from user screenshots):

**Customer/Contact Management:**
- `create_contact` - Create new customer/vendor with full address, payment terms, etc.
- `update_contact` - Update existing contact
- `update_contact_using_custom_field` - Update via custom field unique value
- `email_contact` - Send email to contact

**Invoice Operations:**
- `create_invoice` - Create invoice for customer
- `create_invoice_from_salesorder` - Convert sales order to invoice
- `update_invoice` - Update existing invoice
- `update_invoice_using_custom_field` - Update via custom field
- `email_invoice` - Email invoice to customer
- `email_invoices` - Bulk email up to 10 invoices
- `get_invoice_email` - Get invoice email content

**Estimate Operations:**
- `create_estimate` - Create estimate
- `update_estimate` - Update estimate
- `list_estimates` - List all estimates with pagination
- `list_estimate_templates` - Get estimate PDF templates
- `approve_estimate` - Approve estimate
- `mark_estimate_accepted` - Mark as customer accepted
- `mark_estimate_declined` - Mark as customer rejected
- `mark_estimate_sent` - Mark draft as sent
- `email_estimate` - Email to customer
- `email_multiple_estimates` - Bulk email up to 10
- `bulk_export_estimates_as_pdf` - Export up to 25 as PDF
- `delete_estimate` - Delete estimate
- `get_estimate` - Get estimate details
- `get_estimate_email` - Get email content
- `list_estimate_comments` - Get estimate history/comments
- `update_estimate_comment` - Update comment
- `delete_estimate_comment` - Delete comment

**Payment Operations:**
- `create_customer_payment` - Create payment
- `create_customer_payment_refund` - Refund excess payment
- `update_customer_payment_using_custom_field` - Update via custom field

**Item/Product Management:**
- `create_item` - Create new item
- `update_item` - Update item
- `update_item_using_custom_field` - Update via custom field
- `update_custom_fields_in_item` - Update custom fields in existing items

**Purchase Orders:**
- `create_purchase_order` - Create PO for vendor
- `update_purchase_order` - Update PO
- `email_purchase_order` - Email PO to vendor
- `convert_purchase_order_to_bill` - Convert PO to bill
- `update_custom_fields_in_purchase_order` - Update custom fields

**Sales Orders:**
- `create_sales_order` - Create sales order
- `email_sales_order` - Email to customer

**Bills & Expenses:**
- `update_bill` - Update bill
- `update_bill_billing_address` - Update bill address
- `add_bill_attachment` - Attach file to bill
- `create_recurring_bill` - Create recurring bill
- `update_custom_fields_in_bill` - Update custom fields
- `create_expense` - Create billable/non-billable expense
- `create_expense_receipt` - Attach receipt to expense
- `create_recurring_expense` - Create recurring expense

**Projects:**
- `create_project` - Create project
- `update_project` - Update project
- `update_projects_using_custom_field` - Update via custom field
- `update_project_user` - Update project user
- `update_task` - Update task details
- `create_time_entries` - Log time entries

**Organization/Admin:**
- `create_organization` - Create organization
- `update_organization` - Update organization details
- `create_location` - Create warehouse location
- `update_location` - Update location
- `create_user` - Create user
- `create_employee` - Create employee for expenses
- `create_contact_person` - Create contact person
- `update_contact_person` - Update contact person

**Tax Management:**
- `create_tax_exemption` - Create tax exemption
- `create_tax_authority` - Create tax authority
- `create_tax_group` - Associate multiple taxes
- `update_tax` - Update tax details

**Attachments & Preferences:**
- `update_attachment_preference` - Set file attachment preferences for invoices

**Custom Modules:**
- `create_custom_module` - Create custom module
- `update_custom_module_record` - Update custom module record
- `bulk_update_custom_module_records` - Bulk update records

---

## 🚨 Troubleshooting HTTP MCP Connection

### Why HTTP MCP Not Loading in Claude Code:

**Hypothesis 1: Claude Code vs Claude Desktop**
- HTTP/SSE MCP servers work differently in Claude Code (VS Code extension)
- May require npx wrapper or different configuration

**Hypothesis 2: Restart Required**
- MCP servers load on Claude Code startup
- Changes to config require full VS Code restart

**Hypothesis 3: HTTP Server Format**
- HTTP-based servers may need `command` + `args` wrapper instead of direct `url`

### Solutions to Try:

**Option A: Restart VS Code Completely**
```bash
1. Close ALL VS Code windows
2. Kill any remaining VS Code processes
3. Reopen VS Code
4. Check /MCP command - should show ZohoMCP connected
```

**Option B: Use npx HTTP MCP Wrapper**
```json
{
  "mcpServers": {
    "ZohoMCP": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything",
        "https://zohomcp-8921.onzatalyst.com/mcp/message?key=fY2ep5208fb6edd8791d8326316d0a"
      ]
    }
  }
}
```

**Option C: Use Catalyst CLI as Proxy**
```bash
# Since Catalyst CLI is installed at /c/Users/Kevin/.npm-global/catalyst
# May be able to use it to proxy MCP requests
catalyst mcp connect
```

**Option D: Create Fetch Wrapper**
```javascript
// Create local MCP server that proxies to HTTP endpoint
// modules/zoho-integration/proxy-official-mcp.js
const axios = require('axios');
const MCP_URL = 'https://zohomcp-8921.onzatalyst.com/mcp/message?key=...';

// Forward all MCP calls to HTTP endpoint
```

---

## 📖 Usage Patterns (Once Connected)

### Pattern 1: List Books Customers
```javascript
// Once official MCP tools are available, they'll appear as:
// mcp__ZohoMCP__list_contacts or similar

// Check available tools:
ListMcpResourcesTool(server: 'ZohoMCP')

// Call list contacts (tool name may vary):
const customers = await call_tool('list_contacts', {
    organization_id: '883966257',
    contact_type: 'customer',
    per_page: 200
});
```

### Pattern 2: Create Books Customer
```javascript
await call_tool('create_contact', {
    contact_name: 'Customer Name',
    company_name: 'Company Name',
    billing_address: {
        address: '123 Main St',
        city: 'San Jose',
        state: 'CA',
        zip: '95054',
        country: 'USA'
    },
    phone: '408-555-1234',
    email: 'customer@example.com',
    payment_terms: 'Net 30'
});
```

### Pattern 3: Create Invoice
```javascript
await call_tool('create_invoice', {
    customer_id: 'books_customer_id',
    date: '2025-10-23',
    due_date: '2025-11-22',
    line_items: [
        {
            item_id: 'item_id',
            name: 'Service A',
            rate: 500,
            quantity: 1
        }
    ],
    notes: 'Thank you for your business'
});
```

---

## 🎯 Immediate Action Plan

**User confirmed official Zoho MCP has all necessary Books tools configured.**

**Problem:** HTTP MCP server not appearing in Claude Code /MCP list

**Next Steps:**

1. **Try Full VS Code Restart**
   - Close all VS Code windows
   - Restart VS Code
   - Check if ZohoMCP appears in /MCP

2. **If Still Not Working:**
   - Try npx wrapper configuration (Option B above)
   - Create local proxy server (Option D above)
   - Contact Zoho support about Claude Code integration

3. **Once Connected:**
   - Use official `list_contacts` or equivalent tool
   - Fetch ALL Books customers
   - Complete CRM vs Books data comparison
   - Execute cleanup plan

---

## 📝 Skill Execution Checklist

When this skill is invoked:

- [ ] Check /MCP to verify official ZohoMCP connection status
- [ ] If not connected: Try restart, then npx wrapper
- [ ] Once connected: List available ZohoMCP tools
- [ ] Test with simple `list_contacts` call
- [ ] If working: Fetch all Books customers
- [ ] Compare with CRM accounts
- [ ] Generate comprehensive data quality report
- [ ] Present cleanup plan to user

---

## 🔗 Related Files

- **Local MCP:** `modules/zoho-integration/ZohoMCPServer.js`
- **Config:** `C:\Users\Kevin\AppData\Roaming\Claude\claude_desktop_config.json`
- **Catalyst CLI:** `/c/Users/Kevin/.npm-global/catalyst`
- **Zoho MCP Dashboard:** https://mcp.zoho.com/mcp-client#/mcp-client/server/49790000000011030/connect

---

## ✅ Success Criteria

Skill execution is successful when:
1. Official ZohoMCP shows as "connected" in /MCP list
2. Books customer list successfully fetched (no 401 errors)
3. Data comparison CRM vs Books completed
4. Cleanup plan generated and approved by user

---

**Created:** October 23, 2025
**Status:** TROUBLESHOOTING - HTTP MCP not connecting in Claude Code
**User Request:** "troubleshoot and fix your use and create a skill"
