# Energen Zoho Integrator Skill

Auto-generates complete Zoho CRM module integrations with API wrappers, tests, and setup scripts.

## Quick Start

```bash
# Invoke the skill
/energen-zoho-integrator
```

You'll be prompted for module specifications. Provide either:
1. **JSON file path** containing module spec
2. **Interactive input** for each field

## Example Module Spec

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
      "lookup": {
        "module": { "api_name": "Accounts" }
      }
    },
    {
      "api_name": "Status",
      "field_label": "Status",
      "data_type": "picklist",
      "pick_list_values": [
        { "display_value": "Active", "actual_value": "Active" },
        { "display_value": "Expired", "actual_value": "Expired" }
      ]
    }
  ],
  "operations": ["create", "read", "update", "delete", "search"]
}
```

## Generated Files

1. **API Class:** `src/api/zoho-{module}-api.cjs`
   - OAuth token management
   - CRUD operations
   - Retry logic with exponential backoff
   - Rate limiting compliance

2. **Field Setup Script:** `{module}-create-fields.cjs`
   - Checks for existing fields
   - Creates fields with rate limiting
   - Detailed progress reporting

3. **Test Suite:** `tests/test-{module}-zoho.cjs`
   - OAuth configuration validation
   - CRUD method verification
   - MCP integration checks
   - Color-coded console output

4. **MCP Server Updates:** `modules/zoho-integration/ZohoMCPServer.js`
   - Tool definitions added
   - Handler functions registered

## Directory Structure

```
.claude/skills/energen-zoho-integrator/
├── SKILL.md                    # Skill documentation
├── README.md                   # This file
├── scripts/
│   ├── generate-api-class.js   # API class generator
│   ├── generate-tests.js       # Test suite generator
│   ├── generate-setup.js       # Setup script generator
│   └── update-mcp-server.js    # MCP server updater
└── resources/
    ├── api-template.cjs        # API class template
    ├── test-template.cjs       # Test suite template
    └── oauth-boilerplate.js    # Reusable OAuth code
```

## Usage Examples

### Generate from JSON File

```bash
# Create spec file
cat > service-contracts-spec.json <<EOF
{
  "moduleName": "Service_Contracts",
  "displayName": "Service Contracts",
  "fields": [...],
  "operations": ["create", "read", "update", "delete", "search"]
}
EOF

# Generate integration
/energen-zoho-integrator service-contracts-spec.json
```

### Generate Interactively

```bash
/energen-zoho-integrator

# Answer prompts:
# Module name: Service_Contracts
# Display name: Service Contracts
# Number of fields: 5
# Field 1 name: Contract_Number
# Field 1 type: text
# ...
```

## Field Types Reference

- **text** - Text field (specify `length`)
- **textarea** - Multi-line text
- **number** - Integer or decimal
- **currency** - Currency field
- **date** - Date field
- **datetime** - Date and time
- **email** - Email address
- **phone** - Phone number
- **url** - Web URL
- **picklist** - Dropdown (single select)
- **multiselectpicklist** - Multi-select dropdown
- **boolean** - Checkbox
- **lookup** - Lookup to another module
- **autonumber** - Auto-incrementing number

## Post-Generation Steps

1. **Review generated code** for customizations
2. **Run field creation script:**
   ```bash
   node {module}-create-fields.cjs
   ```

3. **Run test suite:**
   ```bash
   node tests/test-{module}-zoho.cjs
   ```

4. **Restart MCP server** to load new tools

5. **Test via MCP client** (Claude Desktop)

## Patterns Used

### OAuth Token Management
- Promise-based locking prevents concurrent refreshes
- 5-minute buffer on token expiry
- Automatic retry on 401 errors

### Retry Logic
- 3 attempts with exponential backoff (1s, 2s, 4s)
- Skips 4xx errors (except 429 rate limit)
- Logs retry attempts for debugging

### Lookup Fields
- Simplified to just ID string: `Customer_Account: accountId`
- NOT object format: `{ id: accountId }`

### Rate Limiting
- Field creation: 1 second between calls
- API calls: Built into retry logic
- Batch operations: Configurable delays

## Troubleshooting

### OAuth Token Issues
```bash
# Check credentials in .env
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
```

### Field Creation Failures
- Check field API names (no spaces, underscores only)
- Verify module exists in Zoho CRM
- Check picklist values format
- Ensure lookup module exists

### Test Failures
- Verify module exists in Zoho
- Check field names match generated code
- Verify MCP server has been restarted

## Support

For issues or questions:
1. Check existing Zoho integration files for patterns
2. Review test output for specific errors
3. Check `.env` configuration
4. Verify Zoho CRM module structure

## Examples in Project

See these existing integrations for reference:
- `src/api/zoho-generator-asset-api.cjs`
- `src/api/zoho-bid-integration.cjs`
- `modules/zoho-integration/ZohoMCPServer.js`
- `tests/test-3-zoho-mcp-integration.cjs`
