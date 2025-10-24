# Cloud-Only Zoho MCP Setup Guide

**Status**: ✅ Active Configuration  
**Last Updated**: 2025-10-23  
**MCP Server**: energen-lean (Zoho Cloud MCP)

---

## Configuration

### Location
```
C:/ECalc/active/energen-calculator-v5.0/.vscode/mcp.json
```

### Current Setup
```json
{
  "servers": {
    "energen-lean": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d",
      "tools": ["*"]
    }
  },
  "inputs": []
}
```

---

## Available Tools

The energen-lean cloud MCP provides **60+ Zoho tools** across:

### Zoho Books
- **Customers/Contacts**: create, update, email, manage
- **Invoices**: create, update, email, convert from sales orders
- **Estimates**: create, approve, mark accepted/declined, email
- **Payments**: create, refund
- **Items/Products**: create, update, manage custom fields
- **Purchase Orders**: create, update, email, convert to bills
- **Sales Orders**: create, email
- **Bills & Expenses**: create, update, attach files
- **Projects & Time**: create projects, log time entries

### Zoho CRM
- Leads, Contacts, Accounts, Deals management
- Custom module operations
- Workflow automation

### Zoho Inventory
- Warehouse management
- Stock tracking
- Item management

### Zoho Creator
- Custom applications
- Database operations

---

## How to Use

### Check Connection Status

In Claude Code, run:
```
/mcp list
```

You should see `energen-lean` in the list of connected servers.

### Call Zoho MCP Tools

Tools will be available as:
```
mcp__energen-lean__create_contact
mcp__energen-lean__create_invoice
mcp__energen-lean__list_estimates
... etc
```

### Example: List Zoho Books Customers


```javascript
// List all customers from Zoho Books
const customers = await call_tool('mcp__energen-lean__list_contacts', {
  organization_id: '883966257',
  contact_type: 'customer',
  per_page: 200
});
```

### Example: Create Invoice
```javascript
await call_tool('mcp__energen-lean__create_invoice', {
  customer_id: 'zoho_customer_id',
  date: '2025-10-23',
  due_date: '2025-11-22',
  line_items: [
    {
      item_id: 'item_id',
      name: 'Service A - Quarterly Maintenance',
      rate: 2500,
      quantity: 1
    }
  ],
  notes: 'Thank you for your business'
});
```

### Example: Create Estimate
```javascript
await call_tool('mcp__energen-lean__create_estimate', {
  customer_id: 'zoho_customer_id',
  estimate_number: 'EST-2025-001',
  date: '2025-10-23',
  line_items: [
    {
      name: 'Generator Maintenance Service',
      description: 'Quarterly maintenance for 500kW generator',
      rate: 2500,
      quantity: 1
    }
  ]
});
```

---

## Troubleshooting

### Issue: MCP Server Not Appearing in `/mcp list`

**Possible Causes:**
1. VS Code / Claude Code not restarted after config changes
2. HTTP MCP not supported in current Claude Code version
3. Network connectivity issues
4. MCP key expired or invalid

**Solutions:**

#### Solution 1: Full Restart
```bash
1. Close ALL VS Code windows
2. Kill any remaining VS Code processes:
   Get-Process | Where-Object {$_.Name -like "*code*"} | Stop-Process -Force
3. Reopen VS Code
4. Open energen-calculator-v5.0 project
5. Check /mcp list
```

#### Solution 2: Try NPX Wrapper
If HTTP MCP still doesn't appear, try wrapping it with npx:

Edit `.vscode/mcp.json`:
```json
{
  "servers": {
    "energen-lean": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything",
        "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d"
      ]
    }
  }
}
```

#### Solution 3: Test Connection Manually
```bash
# Test if the MCP endpoint is accessible
curl "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d"
```

#### Solution 4: Verify Zoho MCP Dashboard
Visit: https://mcp.zoho.com/mcp-client#/mcp-client/server/49790000000011030/connect

Check:
- Server status is "Active"
- API key is valid
- Permissions are granted

---

## Advantages of Cloud MCP

### ✅ Full OAuth Scope
- Pre-configured with all necessary Zoho scopes
- No 401 Unauthorized errors
- Access to Books, CRM, Inventory, Creator, Projects

### ✅ No Token Management
- No manual OAuth refresh needed
- No credential storage in project
- Zoho handles authentication

### ✅ Better Tools
- 60+ pre-built Zoho operations
- Maintained by Zoho
- Updated with new features automatically

### ✅ Rate Limit Handling
- Catalyst infrastructure manages rate limits
- Automatic retry with backoff
- Better reliability

### ✅ Simpler Setup
- No local server to run
- No dependencies to install
- Single URL configuration

---

## Migration from Local MCP

If you previously used the local Zoho MCP:

1. **Local MCP removed from** `.vscode/settings.json`
2. **Files archived** in `modules/zoho-integration/README-LOCAL-MCP.md`
3. **All functionality available** through cloud MCP tools
4. **Custom sync logic** can call cloud MCP tools as needed

---

## Usage Patterns

### Pattern 1: CRM to Books Sync
```javascript
// 1. Get CRM account
const crmAccount = await call_tool('mcp__energen-lean__get_crm_account', {
  account_id: 'crm_account_id'
});

// 2. Check if customer exists in Books
const booksCustomers = await call_tool('mcp__energen-lean__list_contacts', {
  organization_id: '883966257',
  contact_type: 'customer',
  search_text: crmAccount.Account_Name
});

// 3. Create if doesn't exist
if (booksCustomers.length === 0) {
  await call_tool('mcp__energen-lean__create_contact', {
    contact_name: crmAccount.Account_Name,
    company_name: crmAccount.Account_Name,
    email: crmAccount.Email,
    phone: crmAccount.Phone
  });
}
```

### Pattern 2: Quote to Invoice Workflow
```javascript
// 1. Create estimate from calculator quote
const estimate = await call_tool('mcp__energen-lean__create_estimate', {
  customer_id: quote.zoho_customer_id,
  line_items: quote.services.map(s => ({
    name: s.name,
    rate: s.price,
    quantity: s.quantity
  }))
});

// 2. Customer approves
await call_tool('mcp__energen-lean__mark_estimate_accepted', {
  estimate_id: estimate.estimate_id
});

// 3. Convert to invoice
const invoice = await call_tool('mcp__energen-lean__create_invoice_from_estimate', {
  estimate_id: estimate.estimate_id
});

// 4. Email invoice
await call_tool('mcp__energen-lean__email_invoice', {
  invoice_id: invoice.invoice_id
});
```

### Pattern 3: Bulk Customer Import
```javascript
// Import multiple customers from Fullbay or CSV
for (const customer of importList) {
  try {
    await call_tool('mcp__energen-lean__create_contact', {
      contact_name: customer.name,
      company_name: customer.company,
      billing_address: {
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zip
      },
      email: customer.email,
      phone: customer.phone
    });
  } catch (error) {
    console.error(`Failed to import ${customer.name}:`, error);
  }
}
```

---

## Next Steps

1. **Restart VS Code** to load the cloud MCP configuration
2. **Verify connection** with `/mcp list`
3. **Test a simple operation** like listing contacts
4. **Document any issues** for troubleshooting

---

## Support

- **Zoho MCP Dashboard**: https://mcp.zoho.com
- **MCP Documentation**: See `.claude/skills/energen-zoho-official-mcp.md`
- **Tool Reference**: Run `/mcp list` to see all available tools

---

**Configuration Type**: Cloud-Only (HTTP MCP)  
**Local MCP Status**: Archived (see `modules/zoho-integration/README-LOCAL-MCP.md`)  
**Recommended Approach**: Use cloud MCP for all Zoho operations
