# Zoho MCP Tools Reference - Complete List

**MCP Server**: energen-lean  
**Total Tools**: 176 tools  
**Last Updated**: 2025-10-23

---

## Tools by Category

### 📋 Contacts & Customers (22 tools)

#### Contact Management
- `add_contact_address` - Add additional address for contact
- `create_contact` - Create new customer/vendor with comprehensive info
- `create_contact_person` - Create contact person for contact
- `delete_contact_address` - Delete additional address
- `get_contact` - Get comprehensive contact details
- `get_contact_address` - Get all addresses of contact
- `get_contact_person` - Get contact person details
- `get_contact_statement_mail` - Get statement mail content
- `list_contacts` - List all contacts with advanced filters
- `mark_contact_as_active` - Mark contact as active
- `mark_contact_as_inactive` - Mark contact as inactive
- `update_contact` - Update existing contact
- `update_contact_address` - Edit additional address
- `update_contact_person` - Update existing contact person
- `update_contact_using_custom_field` - Update via custom field unique value

### 💰 Invoices (30+ tools)

#### Invoice Creation & Management
- `create_invoice` - Create invoice for customer
- `create_invoice_from_salesorder` - Create instant invoice from confirmed sales orders
- `create_invoice_comment` - Add comment to invoice
- `create_retainer_invoice` - Create retainer invoice
- `create_retainer_invoice_comment` - Add comment to retainer invoice
- `delete_invoice` - Delete existing invoice
- `delete_invoice_attachment` - Delete file attached to invoice
- `delete_invoice_comment` - Delete invoice comment
- `delete_invoice_payment` - Delete payment from invoice
- `delete_retainer_invoice` - Delete retainer invoice
- `get_invoice` - Get invoice details
- `get_invoice_attachment` - Get file attached to invoice
- `get_invoice_email` - Get invoice email content
- `list_invoices` - List all invoices with pagination/filtering
- `list_invoice_comments` - Get complete history and comments
- `list_invoice_payments` - List payments made for invoice
- `list_invoice_templates` - Get all invoice PDF templates
- `mark_invoice_sent` - Mark draft invoice as sent
- `mark_invoice_void` - Mark invoice as void
- `update_invoice` - Update existing invoice
- `update_invoice_billing_address` - Update billing address
- `update_invoice_comment` - Update existing comment
- `update_invoice_shipping_address` - Update shipping address
- `update_invoice_template` - Update PDF template
- `update_invoice_using_custom_field` - Update via custom field
- `email_invoice` - Email invoice to customer
- `email_invoices` - Email up to 10 invoices at once
- `bulk_export_invoices` - Export up to 25 invoices as PDF


### 📝 Estimates (10 tools)

- `create_estimate` - Create estimate for customer
- `create_estimate_comment` - Add comment to estimate
- `delete_estimate_comment` - Delete estimate comment
- `get_estimate` - Get estimate details
- `get_estimate_email` - Get estimate email content
- `list_estimates` - List all estimates with pagination
- `update_estimate` - Update existing estimate
- `update_estimate_billing_address` - Update billing address for estimate
- `update_estimate_comment` - Update existing estimate comment
- `update_estimate_shipping_address` - Update shipping address for estimate
- `update_estimate_template` - Update PDF template
- `update_estimate_using_custom_field` - Update via custom field

### 💳 Payments (14 tools)

- `categorize_bank_transaction_as_customer_payment` - Categorize uncategorized transaction
- `create_customer_payment` - Create new payment
- `create_customer_payment_refund` - Refund excess amount
- `delete_customer_payment` - Delete existing payment
- `delete_customer_payment_refund` - Delete refund
- `get_customer_payment` - Get payment details
- `get_customer_payment_refund` - Get refund details
- `list_customer_payments` - List all customer payments
- `list_customer_payment_refunds` - List all refunds for a payment
- `update_custom_fields_in_customer_payment` - Update custom fields
- `update_customer_payment` - Update payment information
- `update_customer_payment_refund` - Update refund transaction
- `update_customer_payment_using_custom_field` - Update via custom field

### 📦 Items & Products (9 tools)

- `create_item` - Create new item/product
- `get_item` - Get item details
- `list_items` - List all active items with pagination
- `mark_item_active` - Mark inactive item as active
- `mark_item_inactive` - Mark active item as inactive
- `mark_item_as_active` - Change item status to active (Inventory)
- `mark_item_as_inactive` - Change item status to inactive (Inventory)
- `update_item` - Update item details
- `update_item_using_custom_field` - Update via custom field

### 🏭 Composite Items & Assemblies (10 tools)

- `create_assemblies` - Create assembly from components
- `create_composite_item` - Create composite item
- `delete_assembly` - Delete existing assembly
- `delete_composite_item` - Delete composite item
- `get_assembly` - Get assembly details
- `get_composite_item` - Get composite item details
- `list_assemblies` - List all assemblies
- `list_composite_items` - List all composite items
- `mark_composite_item_active` - Mark as active
- `mark_composite_item_inactive` - Mark as inactive
- `update_composite_item` - Update composite item

### 🛒 Sales Orders (8 tools)

- `create_sales_order` - Create sales order (Books & Inventory)
- `delete_sales_order` - Delete sales order
- `get_sales_order` - Get sales order details
- `list_sales_orders` - List all sales orders
- `update_sales_order` - Update sales order
- `bulk_confirm_sales_orders` - Mark multiple as confirmed
- `bulk_delete_sales_orders` - Delete multiple sales orders
- `mark_sales_order_as_confirmed` - Change status to confirmed
- `mark_sales_order_as_void` - Change status to void

### 📄 Bills (3 tools)

- `create_bill` - Create bill from vendor
- `update_bill_billing_address` - Update bill billing address

### 💸 Credit Notes (2 tools)

- `create_credit_note` - Create credit note for returns/adjustments
- `delete_credits_applied_to_invoice` - Delete credits from invoice
- `delete_applied_credit_to_invoice` - Delete specific credit from invoice
- `list_invoices_of_credit_note` - List invoices with credit note applied

### 🏢 Organizations (2 tools)

- `create_organization` - Create organization
- `get_organization` - Get organization details

### 📊 Projects (2 tools)

- `create_project` - Create project
- `add_task` - Add task to project

### 💼 Taxes (12 tools)

- `create_tax` - Create tax for items
- `create_tax_authority` - Create tax authority
- `create_tax_exemption` - Create tax exemption
- `create_tax_group` - Create tax group with multiple taxes
- `delete_tax` - Delete simple/compound tax
- `delete_tax_authority` - Delete tax authority
- `delete_tax_exemption` - Delete tax exemption
- `delete_tax_group` - Delete tax group
- `get_tax` - Get tax details
- `get_tax_authority` - Get tax authority details
- `get_tax_exemption` - Get tax exemption details
- `get_tax_group` - Get tax group details
- `list_tax_authorities` - List all tax authorities
- `list_tax_exemptions` - List all tax exemptions
- `list_taxes` - List all taxes with pagination
- `update_tax` - Update tax details
- `update_tax_authority` - Update tax authority
- `update_tax_exemption` - Update tax exemption
- `update_tax_group` - Update tax group


### 📍 Locations & Warehouses (7 tools)

- `create_location` - Create warehouse location
- `list_locations` - List all locations
- `mark_location_as_active` - Mark location as active
- `mark_location_as_inactive` - Mark location as inactive
- `mark_location_as_primary` - Mark location as primary
- `mark_warehouse_active` - Mark warehouse as active
- `mark_warehouse_inactive` - Mark warehouse as inactive
- `update_location` - Update location details

### 🏷️ Item Groups (2 tools)

- `mark_item_group_active` - Mark item group as active
- `mark_item_group_inactive` - Mark item group as inactive

### 🔧 Fixed Assets (1 tool)

- `create_fixed_asset` - Create fixed asset

### 💰 Opening Balances (1 tool)

- `create_opening_balance` - Create opening balance

---

## 🔗 Zoho CRM Tools (60+ tools)

### Records Management
- `Create Records` - Create new CRM records
- `Create Record` - Create single record
- `Delete Record` - Delete record
- `Delete Records` - Delete multiple records
- `Delete Record Using External ID` - Delete via external ID
- `Get Record` - Get single record
- `Get Records` - Get multiple records
- `Get Record Using External ID` - Get via external ID
- `Get Deleted Records` - Get deleted records list
- `Get Updated Field Details` - Get field update details
- `Mass Update Records` - Bulk update records
- `Record Count` - Get record count
- `Search Records` - Search CRM records
- `Update Record` - Update single record
- `Update Records` - Update multiple records
- `Update Record Using External ID` - Update via external ID
- `Upsert Records` - Create or update records

### Modules & Fields
- `Create Custom Modules` - Create custom module
- `Create Field` - Create field in module
- `Delete Field` - Delete field
- `Get Field` - Get field details
- `Get Fields` - Get all fields
- `Get Layout` - Get module layout
- `Get Module` - Get module details
- `Get Module By API Name` - Get module by API name
- `Get Modules` - Get all modules
- `Update Custom Layout` - Update layout
- `Update Custom Layouts` - Update multiple layouts
- `Update Custom Modules` - Update custom modules
- `Update Field` - Update field
- `Update Fields` - Update multiple fields
- `Update Module` - Update module
- `Update Module By API Name` - Update module by API name
- `Update the Field Updates` - Update field updates

### Workflows & Automation
- `Create Workflow Rules` - Create workflow rule
- `Create field updates` - Create field updates
- `Get Workflow Action Count` - Get action count
- `Get Workflow Configurations` - Get configurations
- `Get Workflow Rule` - Get workflow rule details
- `Get Workflow Rules` - Get all workflow rules
- `Update Workflow Rule` - Update workflow rule
- `Workflow Rules Reorder` - Reorder workflow rules

### Notes & Tags
- `Create Notes` - Create notes
- `Create Tags` - Create tags
- `Get Record Count For Tag` - Get tag record count

### Tasks
- `Create Tasks` - Create tasks
- `Get All Tasks` - Get all tasks
- `Get Tasks` - Get specific tasks
- `Update Task` - Update task

### Webhooks
- `Create Webhook` - Create webhook
- `Get Webhook` - Get webhook details
- `Get Webhooks` - Get all webhooks
- `Get Webhooks associated modules` - Get webhook modules
- `Get Webhooks failures` - Get webhook failures
- `Update Webhook` - Update webhook

### Organization & Users
- `Delete Organization Photo` - Delete org photo
- `Delete Photo` - Delete photo
- `Get Org Photo` - Get org photo
- `Get Organization` - Get org details
- `Get Photo` - Get photo
- `Get User` - Get user details

### Rich Text
- `Get Full Data For Rich Text` - Get rich text data
- `Get Rich Text Records` - Get rich text records
- `Get Updated fields` - Get updated fields

---

## Common Usage Patterns

### Pattern 1: Create Customer → Invoice → Payment

```javascript
// 1. Create customer
const customer = await mcp__energen_lean__create_contact({
  contact_name: "ACME Corporation",
  company_name: "ACME Corp",
  email: "billing@acme.com",
  phone: "555-1234"
});

// 2. Create invoice
const invoice = await mcp__energen_lean__create_invoice({
  customer_id: customer.contact_id,
  date: "2025-10-23",
  line_items: [{
    name: "Service A - Quarterly Maintenance",
    rate: 2500,
    quantity: 1
  }]
});

// 3. Record payment
const payment = await mcp__energen_lean__create_customer_payment({
  customer_id: customer.contact_id,
  invoice_id: invoice.invoice_id,
  amount: 2500,
  payment_mode: "check"
});
```

### Pattern 2: Estimate → Sales Order → Invoice
```javascript
// 1. Create estimate
const estimate = await mcp__energen_lean__create_estimate({
  customer_id: customer_id,
  line_items: [/* items */]
});

// 2. Convert to sales order (create new)
const salesOrder = await mcp__energen_lean__create_sales_order({
  customer_id: customer_id,
  estimate_id: estimate.estimate_id,
  line_items: estimate.line_items
});

// 3. Confirm sales order
await mcp__energen_lean__mark_sales_order_as_confirmed({
  salesorder_id: salesOrder.salesorder_id
});

// 4. Convert to invoice
const invoice = await mcp__energen_lean__create_invoice_from_salesorder({
  salesorder_ids: [salesOrder.salesorder_id]
});
```

### Pattern 3: Bulk Operations
```javascript
// Email multiple invoices
await mcp__energen_lean__email_invoices({
  invoice_ids: [id1, id2, id3] // max 10
});

// Export multiple invoices as PDF
await mcp__energen_lean__bulk_export_invoices({
  invoice_ids: [id1, id2, ...] // max 25
});

// Bulk confirm sales orders
await mcp__energen_lean__bulk_confirm_sales_orders({
  salesorder_ids: [id1, id2, id3]
});
```

---

## Tool Naming Convention

Tools follow this pattern:
```
mcp__energen_lean__<action>_<resource>

Examples:
- mcp__energen_lean__create_contact
- mcp__energen_lean__list_invoices
- mcp__energen_lean__update_estimate
- mcp__energen_lean__mark_invoice_sent
```

---

## Quick Reference by Use Case

### For Energen Calculator v5.0

**Quote Generation Workflow:**
1. `list_contacts` or `create_contact` - Get/create customer
2. `create_estimate` - Create estimate from quote
3. `email_estimate` - Send to customer
4. `mark_estimate_accepted` - When customer accepts
5. `create_invoice_from_estimate` - Convert to invoice
6. `email_invoice` - Send invoice

**CRM Integration:**
1. `Create Records` - Create account in CRM
2. `create_contact` - Create customer in Books
3. `create_project` - Create service project
4. `add_task` - Add maintenance tasks

**Inventory Management:**
1. `list_items` - Get parts/services
2. `create_composite_item` - Create service package
3. `create_assemblies` - Create maintenance kit
4. `create_sales_order` - Order parts

---

## Important Notes

### Organization ID
Most Books/Inventory operations require `organization_id`:
```javascript
organization_id: "883966257" // Your Energen organization
```

### Custom Fields
Many tools support custom field operations:
- `update_*_using_custom_field` - Update via unique custom field
- `update_custom_fields_in_*` - Bulk update custom fields

### Pagination
List operations support pagination:
```javascript
{
  page: 1,
  per_page: 200, // max varies by endpoint
  sort_column: "created_time",
  sort_order: "D" // D=descending, A=ascending
}
```

### Bulk Limits
- Email invoices: 10 max
- Export invoices: 25 max
- Sales order bulk operations: Check API limits

---

## Tool Categories Summary

| Category | Tools | Key Operations |
|----------|-------|----------------|
| **Contacts** | 22 | Create, list, update customers/vendors |
| **Invoices** | 30+ | Create, email, void, payments |
| **Estimates** | 10 | Create, update, convert to orders |
| **Payments** | 14 | Record, refund, categorize |
| **Items** | 9 | Manage products/services |
| **Sales Orders** | 8 | Create, confirm, bulk operations |
| **CRM Records** | 17 | CRUD operations on all modules |
| **CRM Modules** | 16 | Custom modules, fields, layouts |
| **Workflows** | 8 | Automation rules |
| **Taxes** | 12 | Tax management |
| **Locations** | 7 | Warehouse management |
| **Webhooks** | 6 | Integration callbacks |

**Total**: 176 tools across Books, CRM, and Inventory

---

## See Also

- `CLOUD_MCP_SETUP.md` - Cloud MCP configuration guide
- `MCP_SETUP_REPORT.md` - Complete MCP audit
- `.claude/skills/energen-zoho-official-mcp.md` - Zoho MCP troubleshooting

---

**Last Updated**: 2025-10-23  
**Source**: energen-lean cloud MCP server  
**Status**: Active and ready for use
