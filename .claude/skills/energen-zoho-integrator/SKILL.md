---
name: energen-zoho-integrator
description: Auto-generate Zoho module integrations with API wrappers, tests, and setup scripts
version: 1.0.0
author: Energen Development Team
tags: [zoho, integration, code-generation, api]
---

# Energen Zoho Integrator Skill

Auto-generates complete Zoho CRM module integrations following Energen project patterns.

## What This Skill Does

Generates production-ready Zoho integration code including:
- **API Wrapper Class** with OAuth, CRUD operations, and retry logic
- **Field Creation Scripts** with rate limiting and rollback
- **Test Suite** following project test patterns
- **MCP Server Integration** with automatic tool registration

## Usage

```bash
# Generate complete module integration
/energen-zoho-integrator

# You'll be prompted for:
# - Module name (e.g., "Service_Contracts")
# - Module display name (e.g., "Service Contracts")
# - Fields specification (JSON or interactive)
```

## Module Specification Format

```json
{
  "moduleName": "Service_Contracts",
  "displayName": "Service Contracts",
  "fields": [
    {
      "api_name": "Contract_Number",
      "field_label": "Contract Number",
      "data_type": "text",
      "length": 50,
      "mandatory": true
    },
    {
      "api_name": "Start_Date",
      "field_label": "Start Date",
      "data_type": "date"
    },
    {
      "api_name": "Status",
      "field_label": "Status",
      "data_type": "picklist",
      "pick_list_values": [
        { "display_value": "Active", "actual_value": "Active" },
        { "display_value": "Expired", "actual_value": "Expired" }
      ]
    },
    {
      "api_name": "Customer_Account",
      "field_label": "Customer Account",
      "data_type": "lookup",
      "lookup": {
        "module": { "api_name": "Accounts" }
      }
    }
  ],
  "operations": ["create", "read", "update", "delete", "search"]
}
```

## Generated Files

### 1. API Wrapper Class
**Location:** `src/api/zoho-{module-name}-api.cjs`

Features:
- OAuth token management with automatic refresh
- Promise-based token locking to prevent concurrent refreshes
- All CRUD operations (create, read, update, delete, search)
- Retry logic with exponential backoff (3 attempts, 1s/2s/4s delays)
- Rate limiting compliance
- Error handling and logging
- Field transformation utilities

### 2. Field Creation Script
**Location:** `{module-name}-create-fields.cjs`

Features:
- Checks for existing fields before creation
- Creates fields one at a time (Zoho API requirement)
- Rate limiting: 1 second between field creations
- Detailed logging of success/failure
- Summary report
- No rollback on partial failures (follows Zoho patterns)

### 3. Test Suite
**Location:** `tests/test-{module-name}-zoho.cjs`

Features:
- OAuth configuration validation
- Field name verification
- Lookup field simplification checks
- Module reference consistency
- API call statistics
- Color-coded console output
- JSON test results export

### 4. MCP Server Updates
**Location:** `modules/zoho-integration/ZohoMCPServer.js`

Adds:
- Tool definitions with proper input schemas
- Handler function mappings
- CRUD operation handlers

## Code Generation Process

### Step 1: Collect Module Spec
```javascript
// Interactive prompts or JSON file input
const moduleSpec = await collectModuleSpecification();
```

### Step 2: Generate API Class
```javascript
const apiClass = generateAPIClass(moduleSpec);
// Includes:
// - OAuth boilerplate
// - CRUD methods following zoho-generator-asset-api.cjs pattern
// - Search methods with criteria building
// - Field transformation utilities
```

### Step 3: Generate Field Creation Script
```javascript
const setupScript = generateSetupScript(moduleSpec);
// Includes:
// - Field validation
// - Rate limiting
// - Rollback capability (optional)
// - Progress reporting
```

### Step 4: Generate Test Suite
```javascript
const testSuite = generateTestSuite(moduleSpec);
// Includes:
// - Setup/teardown
// - CRUD operation tests
// - Search tests
// - Error handling tests
```

### Step 5: Update MCP Server
```javascript
await updateMCPServer(moduleSpec);
// Adds tool definitions and handlers
// Preserves existing code
```

## Patterns and Standards

### OAuth Handling
```javascript
// Token refresh with promise-based locking
async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
    }

    if (this.tokenRefreshPromise) {
        return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = (async () => {
        // Refresh logic here
    })();

    return this.tokenRefreshPromise;
}
```

### Retry Logic
```javascript
// 3 attempts with exponential backoff
async makeApiRequest(endpoint, method = 'GET', body = null) {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await actualRequest();
        } catch (error) {
            // Don't retry on 4xx (except 429 rate limit)
            if (error.response?.status >= 400 &&
                error.response?.status < 500 &&
                error.response?.status !== 429) {
                throw error;
            }

            if (attempt === maxRetries) break;

            const delay = baseDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
}
```

### Lookup Fields (Simplified)
```javascript
// Zoho accepts just the ID string for lookups
if (args.customerAccountId) {
    recordData.Customer_Account = args.customerAccountId;
}
// NOT: { id: args.customerAccountId }
```

### Field Creation
```javascript
// Add fields one at a time
for (const field of fields) {
    await axios.post(
        `${apiUrl}/crm/v2/settings/fields?module=${moduleName}`,
        { fields: [field] },
        { headers: { 'Authorization': `Zoho-oauthtoken ${token}` } }
    );

    // Rate limiting
    await sleep(1000);
}
```

### Search with Criteria
```javascript
// Build search criteria
buildSearchCriteria(criteria) {
    const conditions = [];

    Object.keys(criteria).forEach(field => {
        const value = criteria[field];
        if (typeof value === 'object' && value.operator) {
            conditions.push(`(${field}:${value.operator}:${value.value})`);
        } else {
            conditions.push(`(${field}:equals:${value})`);
        }
    });

    return conditions.join('and');
}
```

## Error Handling

### Non-Retriable Errors
- 400-499 status codes (except 429) → Immediate failure
- 401 Unauthorized → Immediate failure (bad credentials)
- Malformed requests → Immediate failure

### Retriable Errors
- 500-599 server errors → Retry with backoff
- 429 rate limit → Retry with backoff
- Network errors → Retry with backoff
- Timeout errors → Retry with backoff

### Rate Limiting
```javascript
// Field creation: 1 second between calls
await sleep(1000);

// API calls: Built into retry logic
// Batch operations: 2 seconds between batches of 5
```

## Testing Standards

### Test Structure
```javascript
class ZohoModuleTest {
    constructor() {
        this.results = { passed: 0, failed: 0, tests: [] };
    }

    async runTests() {
        // Test 1: Method exists
        // Test 2: Field names correct
        // Test 3: Retry logic present
        // Test 4: Lookup simplification
        // Test 5: Module references
        this.printSummary();
    }
}
```

### Color-Coded Output
```javascript
const colors = {
    green: '\x1b[32m',   // Success
    red: '\x1b[31m',     // Failure
    yellow: '\x1b[33m',  // Warning
    blue: '\x1b[34m',    // Info
    cyan: '\x1b[36m'     // Highlight
};
```

## MCP Tool Definition Pattern

```javascript
{
    name: 'create_{module_snake_case}',
    description: 'Create a new {module display name} record in Zoho CRM',
    inputSchema: {
        type: 'object',
        properties: {
            // Field properties from module spec
        },
        required: ['name', 'customerAccountId'] // From spec
    }
}
```

## Example: Service Contracts Module

### Input Spec
```json
{
  "moduleName": "Service_Contracts",
  "displayName": "Service Contracts",
  "fields": [
    {
      "api_name": "Contract_Number",
      "field_label": "Contract Number",
      "data_type": "text",
      "length": 50,
      "mandatory": true
    },
    {
      "api_name": "Customer_Account",
      "field_label": "Customer Account",
      "data_type": "lookup",
      "lookup": { "module": { "api_name": "Accounts" } }
    },
    {
      "api_name": "Start_Date",
      "field_label": "Start Date",
      "data_type": "date",
      "mandatory": true
    },
    {
      "api_name": "End_Date",
      "field_label": "End Date",
      "data_type": "date"
    },
    {
      "api_name": "Annual_Value",
      "field_label": "Annual Value",
      "data_type": "currency"
    },
    {
      "api_name": "Status",
      "field_label": "Status",
      "data_type": "picklist",
      "pick_list_values": [
        { "display_value": "Draft", "actual_value": "Draft" },
        { "display_value": "Active", "actual_value": "Active" },
        { "display_value": "Expired", "actual_value": "Expired" }
      ]
    }
  ],
  "operations": ["create", "read", "update", "delete", "search"]
}
```

### Generated Files
1. `src/api/zoho-service-contracts-api.cjs` (370 lines)
2. `service-contracts-create-fields.cjs` (165 lines)
3. `tests/test-service-contracts-zoho.cjs` (340 lines)
4. Updated `modules/zoho-integration/ZohoMCPServer.js` (+150 lines)

## Field Type Reference

### Supported Zoho Field Types
- `text` - Text field (specify `length`)
- `textarea` - Multi-line text
- `number` - Integer or decimal
- `currency` - Currency field
- `date` - Date field
- `datetime` - Date and time
- `email` - Email address
- `phone` - Phone number
- `url` - Web URL
- `picklist` - Dropdown (single select)
- `multiselectpicklist` - Multi-select dropdown
- `boolean` - Checkbox
- `lookup` - Lookup to another module
- `autonumber` - Auto-incrementing number

### Field Definition Examples

**Text Field:**
```json
{
  "api_name": "Description",
  "field_label": "Description",
  "data_type": "text",
  "length": 255
}
```

**Picklist:**
```json
{
  "api_name": "Priority",
  "field_label": "Priority",
  "data_type": "picklist",
  "pick_list_values": [
    { "display_value": "Low", "actual_value": "Low" },
    { "display_value": "Medium", "actual_value": "Medium" },
    { "display_value": "High", "actual_value": "High" }
  ]
}
```

**Lookup:**
```json
{
  "api_name": "Customer_Account",
  "field_label": "Customer Account",
  "data_type": "lookup",
  "lookup": {
    "module": { "api_name": "Accounts" }
  }
}
```

**Currency:**
```json
{
  "api_name": "Total_Amount",
  "field_label": "Total Amount",
  "data_type": "currency",
  "precision": 2
}
```

## Execution Steps

When this skill is invoked, it will:

1. **Prompt for module specification** (JSON file or interactive input)
2. **Validate specification** (required fields, data types, etc.)
3. **Generate API class** using `scripts/generate-api-class.js`
4. **Generate test suite** using `scripts/generate-tests.js`
5. **Generate setup script** using `scripts/generate-setup.js`
6. **Update MCP server** using `scripts/update-mcp-server.js`
7. **Display summary** with file paths and next steps

## Next Steps After Generation

1. **Review generated code** for any module-specific customizations
2. **Run field creation script** to add fields to Zoho module
3. **Run test suite** to verify integration
4. **Update .env** with Zoho OAuth credentials if needed
5. **Restart MCP server** to load new tools
6. **Test via MCP client** (Claude Desktop, etc.)

## Customization Points

### API Class Customizations
- Add module-specific business logic
- Add custom search methods
- Add field transformation utilities
- Add validation rules

### Test Suite Customizations
- Add module-specific test cases
- Add integration test scenarios
- Add performance tests

### Setup Script Customizations
- Add data migration logic
- Add rollback procedures
- Add validation scripts

## Troubleshooting

### Common Issues

**OAuth Token Refresh Failures:**
- Check `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` in `.env`
- Verify token hasn't expired (refresh tokens last 1 year)
- Check Zoho API console for OAuth app status

**Field Creation Failures:**
- Check field API names (no spaces, underscores only)
- Verify module exists in Zoho CRM
- Check picklist values format
- Ensure lookup module exists

**Rate Limiting:**
- Zoho API limits: 100 calls/minute per user
- Field creation: 1 second delay between calls
- Batch operations: 2 second delay between batches

**Test Failures:**
- Verify module exists in Zoho
- Check field names match generated code
- Verify MCP server has been restarted

## Additional Resources

- **Zoho CRM API Documentation:** https://www.zoho.com/crm/developer/docs/api/v6/
- **Zoho OAuth Guide:** https://www.zoho.com/crm/developer/docs/api/v6/oauth-overview.html
- **Project Documentation:** See `.claude/CLAUDE.md` for context
- **Existing Integrations:** See `src/api/zoho-*-api.cjs` for examples

## Support

For issues or questions:
1. Check existing Zoho integration files for patterns
2. Review test output for specific errors
3. Check `.env` configuration
4. Verify Zoho CRM module structure matches specification


## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added USAGE_EXAMPLES.md with practical scenarios
- ✅ Enhanced field type documentation
- ✅ Improved error handling in generated code
- ✅ Added integration testing examples

### v1.0.0 (2025-10-17)
- Initial release with code generation capability
- API wrapper class generation
- Field creation scripts with rate limiting
- Test suite generation
- MCP server integration

