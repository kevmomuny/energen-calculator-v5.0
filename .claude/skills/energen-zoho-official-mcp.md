# Energen Zoho MCP Master Guide

**Purpose:** Complete reference for all Zoho MCP integrations - official cloud servers, custom project servers, and local OAuth implementations.

**Status:** Active - 12 MCP servers configured (5 global NPX + 6 project Zoho cloud + 1 global Zoho)

**Last Updated:** October 29, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What is Zoho MCP](#what-is-zoho-mcp)
3. [MCP vs Traditional APIs](#mcp-vs-traditional-apis)
4. [Authorization Methods](#authorization-methods)
5. [Current Server Inventory](#current-server-inventory)
6. [Configuration Locations](#configuration-locations)
7. [Official Zoho MCP Tools Reference](#official-zoho-mcp-tools-reference)
8. [Best Practices for Prompts](#best-practices-for-prompts)
9. [Testing & Troubleshooting](#testing--troubleshooting)
10. [Usage Examples](#usage-examples)

---

## Overview

**What is MCP?**

Model Context Protocol (MCP) is an open protocol that establishes a standardized way for applications to interact with Large Language Models (LLMs). It allows AI agents to carry out complex workflows by providing the required instructions in the right context.

**Key Benefits:**
- **Autonomous Operations**: Entire workflows from task initiation to completion handled by AI
- **Context-Aware**: MCP Clients automatically discover available commands and parameter metadata
- **No Manual Intervention**: Once configured, operations require only natural language prompts
- **Unified Access**: Single protocol for accessing 950+ Zoho and third-party applications

---

## What is Zoho MCP

**Zoho MCP** is Zoho's official MCP server service that allows you to create custom MCP servers to perform complex actions across Zoho applications (Books, CRM, Inventory, Creator, Projects, Mail, WorkDrive) and third-party services.

### Key Architecture Components:

```
User → MCP Client (Claude/Cursor/Windsurf) → MCP Protocol → Zoho MCP Server → Web APIs → Zoho Services
```

**How It Works:**
1. User inputs prompt in MCP Client
2. Context extracted using MCP protocols
3. Based on configured tools, required services invoked via APIs
4. Backend operations completely handled by Zoho MCP server
5. No additional authorization or intervention required per execution

### Zoho MCP vs Traditional APIs

| Category | Zoho MCP | Traditional APIs |
|----------|----------|------------------|
| **Operations** | Entirely handled by MCP Clients, no manual intervention beyond initial prompt | Heavily reliant on manual intervention for each execution |
| **Operations Style** | Entirely autonomous | Can be automated but never autonomous |
| **Workflow Harmony** | MCP Clients feed rich context using MCP protocols. Every service linked through tools works in complete harmony | Services cannot function together in harmony. Must be launched individually in silos |
| **Operations Discovery** | MCP Clients automatically discover available commands and structure parameter metadata | Requires manual API exploration |
| **Parameter Handling** | Can handle complex parameter relationships. Supports dynamic parameter resolution and context-aware input handling | Manual input required. Supports strict and conventional static parameter handling |
| **Process Optimization** | Regardless of number of services, if tools configured, all aspects carried out autonomously. Significantly reduces time and effort | Individual services cannot function autonomously. Slight optimization through automation but cannot compare to MCP |

---

## Authorization Methods

Zoho MCP supports two OAuth2.1 authorization methods:

### 1. Authorization On Demand (Default)

**Characteristics:**
- Default method for Zoho suite products
- Account-dependent authorization type
- Each user authenticates separately with their individual account
- User prompted to authorize when first accessing MCP Client

**Use Case:** Individual developers or when each team member has separate Zoho accounts

**Example Flow:**
1. Add tool to MCP server
2. Connect MCP Client
3. User directed to OAuth screen
4. User accepts permissions
5. MCP Client authorized for that user's account

### 2. Authorization via Connection

**Characteristics:**
- Organization-dependent authorization type
- Super Admin shares Access Tokens and Refresh Tokens with organization members
- Used for third-party services
- All organization members authorize using shared tokens

**Use Case:** Teams where Super Admin manages centralized access control

**How to Enable:**
1. Navigate to Connections section in MCP console
2. Click Edit > Choose "Authorization via Connection"
3. Click Update
4. Organization members now use Super Admin's tokens

**Benefits:**
- Centralized token management
- No individual authentication needed
- Easier revocation and security control

---

## Current Server Inventory

### Global MCP Servers (5)
**Location:** `C:/Users/Kevin/.vscode/mcp.json`

1. **desktop-commander** (NPX)
   - File/process management
   - Search, read, write, edit operations
   - **Status:** ✅ TESTED & WORKING

2. **excel** (NPX)
   - Excel file manipulation
   - @negokaz/excel-mcp-server
   - **Status:** ⚠️ Configured but NOT TESTED

3. **git-mcp** (NPX)
   - Git operations via @cyanheads/git-mcp-server
   - **Status:** ⚠️ Configured but NOT TESTED

4. **chrome-devtools** (NPX)
   - Browser automation via chrome-devtools-mcp
   - **Status:** ⚠️ Configured but NOT TESTED

5. **energen-lean** (Zoho Cloud HTTP)
   - URL: `https://energen-lean-897662416.zohomcp.com/mcp/message?key=099883afb805e408f6e184678a16524e`
   - **Tools (16):** create_contact, list_contacts, get_contact, update_contact, create_invoice, list_invoices, get_invoice, update_invoice, email_invoice, create_customer_payment, list_customer_payments, get_customer_payment, create_item, list_items, get_item
   - **Purpose:** Lightweight Zoho Books & CRM operations
   - **Status:** ✅ CONFIGURED - NOT TESTED

### Project MCP Servers (6)
**Location:** `C:/ECalc/active/energen-calculator-v5.0/.vscode/mcp.json`

All are Zoho Cloud HTTP servers with OAuth pre-configured:

1. **energen-crm-structure**
   - URL: `https://energen-crm-structure-897662416.zohomcp.com/mcp/message?key=7dca20fb6493dc7c57da703542cd902e`
   - **Purpose:** CRM module structure, custom fields, layouts
   - **Status:** ⚠️ Configured but NOT TESTED

2. **energen-crm-records**
   - URL: `https://energen-crm-records-897662416.zohomcp.com/mcp/message?key=58c3640c85a9a085a6c284bd3b11fed1`
   - **Purpose:** CRM CRUD operations (Get Records, Search, Update, Mass Update)
   - **Status:** ⚠️ Configured but NOT TESTED

3. **energen-crm-automation**
   - URL: `https://energen-crm-automation-897662416.zohomcp.com/mcp/message?key=b59b57de454762e706a399ec1f98514a`
   - **Purpose:** Workflows, blueprints, assignment rules
   - **Status:** ⚠️ Configured but NOT TESTED

4. **energen-books-customers**
   - URL: `https://energen-books-customers-897662416.zohomcp.com/mcp/message?key=af0eb1cf667198721e0d34913de085b9`
   - **Purpose:** Zoho Books customer/contact management
   - **Status:** ⚠️ Configured but NOT TESTED

5. **energen-books-invoicing**
   - URL: `https://energen-books-invoicing-897662416.zohomcp.com/mcp/message?key=4c8b15d69e8227980937ef30aef89227`
   - **Purpose:** Invoice, estimate, payment operations
   - **Status:** ⚠️ Configured but NOT TESTED

6. **energen-data-explorer**
   - URL: `https://energen-data-explorer-897662416.zohomcp.com/mcp/message?key=bc72c3e82137d542fa70953ed16ec89a`
   - **Purpose:** Cross-module data queries and analytics
   - **Status:** ⚠️ Configured but NOT TESTED

---

## Configuration Locations

### Global Configuration
**File:** `C:/Users/Kevin/.vscode/mcp.json`
**Scope:** Available to all VS Code projects
**Servers:** 5 (4 NPX + 1 Zoho cloud)

### Project Configuration
**File:** `C:/ECalc/active/energen-calculator-v5.0/.vscode/mcp.json`
**Scope:** Only when Energen Calculator project is open
**Servers:** 6 (all Zoho cloud)

### Claude Desktop Configuration (Not Used by Claude Code)
**File:** `C:/Users/Kevin/AppData/Roaming/Claude/claude_desktop_config.json`
**Note:** This is for Claude Desktop app, NOT Claude Code (VS Code extension)

---

## Official Zoho MCP Tools Reference

### Zoho Books - Customer/Contact Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_contact` | Create new customer/vendor | contact_name, company_name, billing_address, phone, email, payment_terms |
| `list_contacts` | List all contacts with pagination | organization_id, contact_type (customer/vendor), per_page |
| `get_contact` | Get specific contact details | contact_id, organization_id |
| `update_contact` | Update existing contact | contact_id, fields to update |
| `update_contact_using_custom_field` | Update via custom field unique value | custom_field_name, custom_field_value, fields to update |
| `email_contact` | Send email to contact | contact_id, subject, body |

### Zoho Books - Invoice Operations

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_invoice` | Create invoice for customer | customer_id, date, due_date, line_items[], notes |
| `list_invoices` | List all invoices with pagination | organization_id, status, customer_id, per_page |
| `get_invoice` | Get specific invoice details | invoice_id, organization_id |
| `update_invoice` | Update existing invoice | invoice_id, fields to update |
| `create_invoice_from_salesorder` | Convert sales order to invoice | salesorder_id |
| `update_invoice_using_custom_field` | Update via custom field | custom_field_name, custom_field_value |
| `email_invoice` | Email invoice to customer | invoice_id, to_mail_ids[], cc_mail_ids[], subject, body |
| `email_invoices` | Bulk email up to 10 invoices | invoice_ids[] (max 10) |
| `get_invoice_email` | Get invoice email content | invoice_id |

### Zoho Books - Estimate Operations

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_estimate` | Create estimate | customer_id, date, expiry_date, line_items[], notes |
| `update_estimate` | Update estimate | estimate_id, fields to update |
| `list_estimates` | List all estimates with pagination | organization_id, status, customer_id, per_page |
| `list_estimate_templates` | Get estimate PDF templates | organization_id |
| `get_estimate` | Get estimate details | estimate_id |
| `approve_estimate` | Approve estimate | estimate_id |
| `mark_estimate_accepted` | Mark as customer accepted | estimate_id |
| `mark_estimate_declined` | Mark as customer rejected | estimate_id |
| `mark_estimate_sent` | Mark draft as sent | estimate_id |
| `email_estimate` | Email to customer | estimate_id, to_mail_ids[], subject, body |
| `email_multiple_estimates` | Bulk email up to 10 | estimate_ids[] (max 10) |
| `bulk_export_estimates_as_pdf` | Export up to 25 as PDF | estimate_ids[] (max 25) |
| `delete_estimate` | Delete estimate | estimate_id |
| `get_estimate_email` | Get email content | estimate_id |
| `list_estimate_comments` | Get estimate history/comments | estimate_id |
| `update_estimate_comment` | Update comment | estimate_id, comment_id, description |
| `delete_estimate_comment` | Delete comment | estimate_id, comment_id |

### Zoho Books - Payment Operations

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_customer_payment` | Create payment | customer_id, amount, date, payment_mode, invoices[] |
| `list_customer_payments` | List payments with pagination | organization_id, customer_id, per_page |
| `get_customer_payment` | Get payment details | payment_id |
| `create_customer_payment_refund` | Refund excess payment | payment_id, refund_amount |
| `update_customer_payment_using_custom_field` | Update via custom field | custom_field_name, value |

### Zoho Books - Item/Product Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_item` | Create new item | name, rate, description, tax_id, account_id |
| `list_items` | List items with pagination | organization_id, per_page |
| `get_item` | Get item details | item_id |
| `update_item` | Update item | item_id, fields to update |
| `update_item_using_custom_field` | Update via custom field | custom_field_name, value |
| `update_custom_fields_in_item` | Update custom fields in existing items | item_id, custom_fields[] |

### Zoho Books - Sales Orders

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_sales_order` | Create sales order | customer_id, date, line_items[], notes |
| `email_sales_order` | Email to customer | salesorder_id, to_mail_ids[], subject, body |

### Zoho Books - Purchase Orders

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_purchase_order` | Create PO for vendor | vendor_id, date, line_items[], delivery_date |
| `update_purchase_order` | Update PO | purchaseorder_id, fields to update |
| `email_purchase_order` | Email PO to vendor | purchaseorder_id, to_mail_ids[] |
| `convert_purchase_order_to_bill` | Convert PO to bill | purchaseorder_id |
| `update_custom_fields_in_purchase_order` | Update custom fields | purchaseorder_id, custom_fields[] |

### Zoho Books - Bills & Expenses

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `update_bill` | Update bill | bill_id, fields to update |
| `update_bill_billing_address` | Update bill address | bill_id, address fields |
| `add_bill_attachment` | Attach file to bill | bill_id, file |
| `create_recurring_bill` | Create recurring bill | recurrence_frequency, vendor_id, line_items[] |
| `update_custom_fields_in_bill` | Update custom fields | bill_id, custom_fields[] |
| `create_expense` | Create billable/non-billable expense | account_id, amount, date, is_billable |
| `create_expense_receipt` | Attach receipt to expense | expense_id, receipt_file |
| `create_recurring_expense` | Create recurring expense | recurrence_frequency, account_id, amount |

### Zoho Books - Projects

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_project` | Create project | project_name, customer_id, billing_type, rate |
| `update_project` | Update project | project_id, fields to update |
| `update_projects_using_custom_field` | Update via custom field | custom_field_name, value |
| `update_project_user` | Update project user | project_id, user_id, role |
| `update_task` | Update task details | task_id, fields to update |
| `create_time_entries` | Log time entries | project_id, task_id, user_id, log_hours, log_date |

### Zoho Books - Organization/Admin

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_organization` | Create organization | name, address, currency_code, time_zone |
| `update_organization` | Update organization details | organization_id, fields to update |
| `create_location` | Create warehouse location | location_name, address |
| `update_location` | Update location | location_id, fields to update |
| `create_user` | Create user | name, email, role |
| `create_employee` | Create employee for expenses | name, email |
| `create_contact_person` | Create contact person | contact_id, first_name, last_name, email |
| `update_contact_person` | Update contact person | contact_person_id, fields to update |

### Zoho Books - Tax Management

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_tax_exemption` | Create tax exemption | customer_id, exemption_certificate_number |
| `create_tax_authority` | Create tax authority | tax_authority_name, tax_type |
| `create_tax_group` | Associate multiple taxes | group_name, taxes[] |
| `update_tax` | Update tax details | tax_id, tax_name, tax_percentage |

### Zoho Books - Custom Modules

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_custom_module` | Create custom module | module_name, fields[] |
| `update_custom_module_record` | Update custom module record | module_api_name, record_id, fields |
| `bulk_update_custom_module_records` | Bulk update records | module_api_name, records[] |

### Zoho CRM Tools

| Tool Category | Example Tools | Purpose |
|---------------|---------------|---------|
| **Records** | Search Records, Get Records, Update Notes, Mass Update Records | CRUD operations on CRM modules |
| **Structure** | Get Module Fields, Get Layouts, Get Custom Views | Module metadata and structure |
| **Automation** | Get Workflows, Get Blueprints, Get Assignment Rules | Automation configuration |

### Zoho Mail Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `sendEmail` | Send email | to, cc, bcc, subject, body, attachments[] |

---

## Best Practices for Prompts

**The prompt you provide in your MCP client is crucial** to extract the required context and carry out operations. Provide prompts as precisely as possible to ensure only one prompt is required.

### Prompt Engineering Guidelines:

1. **Use Unique Identifiers**
   - ✅ "Update contact with ID 12345"
   - ❌ "Update the customer from last week"

2. **Specify All Identifying Fields**
   - ✅ "Create invoice for customer_id '883966257' with items..."
   - ❌ "Create invoice for ABC Corp"

3. **State Actions Explicitly**
   - ✅ "Email invoice ID 789 to customer@example.com with subject 'Payment Due'"
   - ❌ "Send the invoice"

4. **Include Edge Cases and Retries**
   - ✅ "Update Slack step (step_3) to channel '#support' with 3-second timeout. Only update if current app is still 'slack'"
   - ❌ "Change the channel"

5. **Structure as Declarative Intents**
   - ✅ "In editing context ID 12345, update the Slack step (step_3) to use new channel '#support' and add timeout of 3 seconds"
   - ❌ "Can you maybe update that thing?"

### Good Prompt Examples:

**Example 1: Create Books Customer**
```
Create a new contact in Zoho Books organization 883966257:
- Contact Name: "Acme Manufacturing"
- Company Name: "Acme Manufacturing Inc."
- Billing Address: "123 Industrial Pkwy, San Jose, CA 95054, USA"
- Phone: "408-555-1234"
- Email: "billing@acme-mfg.com"
- Payment Terms: "Net 30"
```

**Example 2: Complex Workflow**
```
For the recently closed deal in CRM (Deal ID: 7890), perform the following:
1. Send email to contact using template "sales_completion"
2. Attach Master Services Agreement from WorkDrive path "/contracts/MSA-template.pdf"
3. Create invoice in Zoho Books for items from deal
4. Attach invoice access link to the email
5. CC accounts admin at accounts@energen.com
```

---

## Testing & Troubleshooting

### Test All MCP Servers

**Current Test Status:**
- ✅ **desktop-commander**: TESTED & WORKING
- ❌ **excel**: NOT TESTED
- ❌ **git-mcp**: NOT TESTED
- ❌ **chrome-devtools**: NOT TESTED
- ❌ **energen-lean**: NOT TESTED
- ❌ **energen-crm-structure**: NOT TESTED
- ❌ **energen-crm-records**: NOT TESTED
- ❌ **energen-crm-automation**: NOT TESTED
- ❌ **energen-books-customers**: NOT TESTED
- ❌ **energen-books-invoicing**: NOT TESTED
- ❌ **energen-data-explorer**: NOT TESTED

### How to Test MCP Servers:

1. **List Available Tools**
   ```javascript
   ListMcpResourcesTool(server: 'energen-lean')
   ```

2. **Make Simple Test Call**
   ```javascript
   // Test Zoho Books contact listing
   list_contacts({
       organization_id: '883966257',
       contact_type: 'customer',
       per_page: 5
   })
   ```

3. **Verify Response**
   - Check for successful response
   - Verify data structure
   - Confirm no authorization errors

### Common Issues & Solutions:

**Issue 1: HTTP MCP Not Appearing**
- **Symptom:** Zoho cloud MCP servers not showing in available tools
- **Solution:** Restart VS Code completely (close all windows, reopen)

**Issue 2: 401 Unauthorized**
- **Symptom:** Authorization errors when calling tools
- **Solution:** Check Connections tab in Zoho MCP console, re-authorize if needed

**Issue 3: Tool Not Found**
- **Symptom:** Specific tool not available despite server being connected
- **Solution:** Verify tool was added in Zoho MCP console Config Tools section

---

## Usage Examples

### Example 1: List Zoho Books Customers

```javascript
// Use energen-lean or energen-books-customers server
list_contacts({
    organization_id: '883966257',
    contact_type: 'customer',
    per_page: 200
})
```

### Example 2: Create Invoice

```javascript
// Use energen-lean or energen-books-invoicing server
create_invoice({
    customer_id: '883966257000000012345',
    date: '2025-10-29',
    due_date: '2025-11-28',
    line_items: [
        {
            item_id: '883966257000000067890',
            name: 'Annual Generator Service Contract',
            rate: 25000,
            quantity: 1,
            tax_id: '883966257000000011111'
        }
    ],
    notes: 'Thank you for your business. Payment due within 30 days.',
    terms: 'Net 30'
})
```

### Example 3: Search CRM Records

```javascript
// Use energen-crm-records server
search_records({
    module: 'Accounts',
    criteria: '(Account_Name:equals:ABC Corporation)',
    fields: ['Account_Name', 'Phone', 'Website']
})
```

### Example 4: Email Invoice

```javascript
// Use energen-books-invoicing server
email_invoice({
    invoice_id: '883966257000000045678',
    to_mail_ids: ['customer@example.com'],
    cc_mail_ids: ['accounts@energen.com'],
    subject: 'Invoice #INV-2025-0042 - Payment Due',
    body: 'Please find attached your invoice for services rendered.'
})
```

---

## Critical Notes

### OAuth Token Scope Issue (Why Zoho MCP Required for Books)

**Problem:**
```
❌ CRM OAuth Token Scope: ZohoCRM.modules.ALL
✅ Books API Requires: ZohoBooks.fullaccess.all
❌ Result: 401 Unauthorized on /books/v3/* endpoints
```

**Solution:**
- Use Zoho MCP servers (energen-lean, energen-books-*) for ALL Books operations
- Zoho MCP has pre-configured OAuth with ALL necessary scopes
- Avoids token management and scope issues

### MCP Server Loading

- MCP servers load when VS Code starts
- Configuration changes require full VS Code restart
- HTTP/SSE servers may take longer to initialize than NPX servers

### Support Contact

For Zoho MCP service questions or issues:
**Email:** support@zohomcp.com
**Console:** https://mcp.zoho.com

---

**Document Version:** 2.0
**Last Updated:** October 29, 2025
**Maintained By:** Claude Code + Energen Team
**Source:** Official Zoho MCP Help Documentation (29-9-2025) + Project Configuration Analysis
