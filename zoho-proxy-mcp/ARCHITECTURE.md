# Zoho Proxy MCP - Architecture Design

## Problem Statement

Zoho Cloud MCP (energen-lean) has 609 tools loaded, consuming 88k+ tokens in Claude Code context, making it unusable. We need a proxy that:
- Holds all tool definitions internally (0 tokens to Claude)
- Exposes tools on-demand when requested
- Forwards tool calls to upstream energen-lean server
- Allows search/browse before loading

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code (Client)                                        │
│ - Sees only 5 meta-tools initially (~2k tokens)             │
│ - Dynamically receives tools on-demand                      │
└───────────────────┬─────────────────────────────────────────┘
                    │ MCP Protocol
                    │
┌───────────────────▼─────────────────────────────────────────┐
│ Zoho Proxy MCP Server (Local Node.js)                       │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Tool Catalog (In-Memory)                               │  │
│ │ - All 609 tool definitions                             │  │
│ │ - Metadata: name, description, category, parameters    │  │
│ │ - Indexed for fast search                              │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Meta Tools (Always Active)                             │  │
│ │ 1. search_tools(query, category, app)                  │  │
│ │ 2. list_categories()                                   │  │
│ │ 3. get_tool_info(name)                                 │  │
│ │ 4. activate_tools([names])                             │  │
│ │ 5. deactivate_tools([names])                           │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Active Tools Registry (Session State)                  │  │
│ │ - Currently active tools for this session              │  │
│ │ - Dynamically added/removed                            │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Tool Call Forwarder                                    │  │
│ │ - Intercepts tool calls from Claude                    │  │
│ │ - Forwards to upstream energen-lean                    │  │
│ │ - Returns results to Claude                            │  │
│ └────────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTPS/MCP Protocol
                    │
┌───────────────────▼─────────────────────────────────────────┐
│ Zoho Cloud MCP (energen-lean)                               │
│ - Has all 609 tools fully loaded                            │
│ - Executes tool calls                                       │
│ - Returns results                                           │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Tool Catalog (In-Memory Storage)

**Purpose**: Store all tool definitions without exposing them to Claude

**Structure**:
```javascript
{
  "Zoho Books": {
    "invoicing": [
      {
        "name": "create_invoice",
        "description": "Create an invoice for your customer",
        "app": "Zoho Books",
        "category": "invoicing",
        "inputSchema": { /* Full JSON schema */ },
        "active": false  // Not currently exposed to Claude
      },
      // ... more tools
    ],
    "contacts": [ /* ... */ ]
  },
  "Zoho CRM": {
    "records": [ /* ... */ ]
  }
}
```

**Source**: Fetched from energen-lean at proxy startup

**Memory cost**: ~2-3 MB for 609 tools (metadata only)

**Claude cost**: 0 tokens (not exposed to Claude)

### 2. Meta Tools (Always Exposed)

#### `search_tools`
```javascript
{
  name: "search_tools",
  description: "Search for Zoho tools by keyword, category, or app",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (matches tool name or description)"
      },
      category: {
        type: "string",
        description: "Filter by category (e.g., 'invoicing', 'contacts')"
      },
      app: {
        type: "string",
        description: "Filter by app (e.g., 'Zoho Books', 'Zoho CRM')"
      },
      limit: {
        type: "number",
        description: "Maximum results to return (default: 20)"
      }
    }
  }
}
```

**Returns**: Array of tool metadata (NOT full tool definitions)
```javascript
[
  {
    name: "create_invoice",
    app: "Zoho Books",
    category: "invoicing",
    description: "Create an invoice for your customer",
    active: false
  },
  // ... more results
]
```

#### `list_categories`
```javascript
{
  name: "list_categories",
  description: "List all available tool categories organized by app",
  inputSchema: {
    type: "object",
    properties: {
      app: {
        type: "string",
        description: "Optional: Filter by specific app"
      }
    }
  }
}
```

**Returns**: Hierarchical category structure
```javascript
{
  "Zoho Books": {
    "invoicing": { count: 74, description: "..." },
    "contacts": { count: 23, description: "..." },
    // ... more categories
  },
  "Zoho CRM": {
    "records": { count: 20, description: "..." },
    // ... more categories
  }
}
```

#### `get_tool_info`
```javascript
{
  name: "get_tool_info",
  description: "Get detailed information about a specific tool",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Tool name (e.g., 'create_invoice')"
      }
    },
    required: ["name"]
  }
}
```

**Returns**: Complete tool metadata (but still not activating it)
```javascript
{
  name: "create_invoice",
  app: "Zoho Books",
  category: "invoicing",
  description: "Create an invoice for your customer",
  active: false,
  parameters: {
    // Simplified parameter description (not full schema)
    required: ["customer_id", "line_items"],
    optional: ["due_date", "discount", "notes"]
  },
  usage_example: "Use this tool to create invoices after you have customer and item information"
}
```

#### `activate_tools`
```javascript
{
  name: "activate_tools",
  description: "Load specific tools into context for use. Tools will be available for Claude to call.",
  inputSchema: {
    type: "object",
    properties: {
      tools: {
        type: "array",
        items: { type: "string" },
        description: "Array of tool names to activate (max 25 at once)",
        maxItems: 25
      }
    },
    required: ["tools"]
  }
}
```

**Action**:
1. Validates tool names exist in catalog
2. Adds tools to active registry
3. **Dynamically registers tools with MCP** (Claude now sees them)
4. Returns confirmation

**Returns**:
```javascript
{
  activated: ["create_invoice", "list_contacts", "create_item"],
  failed: [],  // Tools that couldn't be activated
  total_active: 8,  // Total tools now active
  estimated_tokens: 4000  // Approximate context usage
}
```

#### `deactivate_tools`
```javascript
{
  name: "deactivate_tools",
  description: "Remove tools from context to free up tokens. Use 'all' to clear all active tools.",
  inputSchema: {
    type: "object",
    properties: {
      tools: {
        type: "array",
        items: { type: "string" },
        description: "Array of tool names to deactivate, or ['all'] to deactivate everything"
      }
    },
    required: ["tools"]
  }
}
```

**Action**:
1. Removes tools from active registry
2. **Unregisters tools from MCP** (Claude no longer sees them)
3. Returns confirmation

**Returns**:
```javascript
{
  deactivated: ["create_invoice", "list_contacts"],
  remaining_active: 6,
  estimated_tokens: 3000
}
```

### 3. Active Tools Registry

**Purpose**: Track which tools are currently exposed to Claude

**Structure**:
```javascript
{
  activatedTools: new Map([
    ["create_invoice", {
      activatedAt: "2025-10-24T14:30:00Z",
      useCount: 3  // Times this tool was called
    }],
    ["list_contacts", {
      activatedAt: "2025-10-24T14:31:00Z",
      useCount: 1
    }]
  ]),
  maxActiveTools: 50,  // Safety limit
  totalTokenEstimate: 5000
}
```

### 4. Tool Call Forwarder

**Purpose**: Proxy tool calls from Claude to energen-lean

**Flow**:
```javascript
1. Claude calls: create_invoice({ customer_id: "123", ... })
2. Proxy intercepts the call
3. Proxy checks: Is create_invoice in active registry? ✓
4. Proxy forwards to energen-lean via HTTPS
5. energen-lean executes the tool
6. energen-lean returns result
7. Proxy forwards result to Claude
8. Proxy logs usage (increments useCount)
```

## Workflow Examples

### Example 1: Create an Invoice

```
User: "Create an invoice for customer XYZ"

1. Claude doesn't have invoice tools active
2. Claude calls: search_tools({ query: "create invoice" })
3. Proxy returns: [{ name: "create_invoice", ... }, { name: "list_contacts", ... }]
4. Claude calls: activate_tools({ tools: ["create_invoice", "list_contacts"] })
5. Proxy registers these 2 tools dynamically
6. Claude now sees: 7 tools (5 meta + 2 active)
7. Claude calls: list_contacts({ filter: "XYZ" })
8. Proxy forwards → energen-lean → returns customer data
9. Claude calls: create_invoice({ customer_id: "...", ... })
10. Proxy forwards → energen-lean → returns invoice
11. Claude calls: deactivate_tools({ tools: ["all"] })
12. Back to 5 meta-tools only
```

**Token usage**:
- Start: ~2k tokens (5 meta-tools)
- Active: ~3.5k tokens (5 meta + 2 active tools)
- End: ~2k tokens (5 meta-tools)

**Savings**: 85.5k tokens saved vs. loading all 609 tools (88k)

### Example 2: Fullbay Sync Workflow

```
User: "Sync Fullbay customers to Zoho"

1. Claude calls: search_tools({ category: "contacts" })
2. Reviews results, picks relevant tools
3. Claude calls: activate_tools({
     tools: [
       "create_contact",
       "list_contacts",
       "update_contact",
       "import_customer_using_crm_account_id"
     ]
   })
4. Proxy activates 4 tools (~2k tokens)
5. Claude performs sync using these 4 tools
6. When done: deactivate_tools({ tools: ["all"] })
```

**Token usage**: 2k (base) + 2k (4 tools) = 4k total
**Savings**: 84k tokens vs. full 609-tool load

## Implementation Technology

### Server Framework
- **Node.js** with `@modelcontextprotocol/sdk`
- **TypeScript** for type safety
- **stdio transport** for local MCP communication

### Upstream Connection
- **HTTPS client** to connect to energen-lean cloud MCP
- **Credential management** (API key, OAuth token)
- **Connection pooling** for performance

### Catalog Storage
- **In-memory Map** for fast lookup
- **JSON file** for persistence (optional caching)
- **Indexing** by name, category, app, keywords

### Dynamic Tool Registration
- **MCP Server SDK** supports dynamic tool lists
- Use `server.setRequestHandler(ListToolsRequestSchema, ...)`
- Return different tool lists based on active registry
- Update tool list when activate/deactivate is called

## Configuration

### `.vscode/mcp.json`
```json
{
  "mcpServers": {
    "zoho-proxy": {
      "command": "node",
      "args": ["C:/ECalc/active/energen-calculator-v5.0/zoho-proxy-mcp/index.js"],
      "env": {
        "UPSTREAM_MCP_URL": "https://mcp.zoho.com/api/...",
        "UPSTREAM_API_KEY": "your-api-key",
        "MAX_ACTIVE_TOOLS": "50",
        "CACHE_CATALOG": "true"
      }
    }
  }
}
```

### Environment Variables
- `UPSTREAM_MCP_URL`: Zoho Cloud MCP endpoint
- `UPSTREAM_API_KEY`: Authentication for energen-lean
- `MAX_ACTIVE_TOOLS`: Safety limit (default: 50)
- `CACHE_CATALOG`: Cache tool catalog to disk (default: true)
- `LOG_LEVEL`: debug|info|warn|error (default: info)

## Performance Metrics

### Startup
- **Cold start**: ~2-5 seconds (fetch 609 tools from upstream)
- **Warm start**: ~0.5 seconds (load from cache)

### Search
- **search_tools**: <10ms (in-memory search)
- **list_categories**: <5ms (pre-computed)

### Activation
- **activate_tools**: ~50-100ms per tool (register with MCP)
- **10 tools**: ~0.5-1 second total

### Tool Calls
- **Overhead**: ~50-100ms (proxy forwarding)
- **Total time**: Upstream execution + 50-100ms

## Security Considerations

1. **Authentication**: Proxy uses API key to connect to energen-lean
2. **Rate limiting**: Prevent abuse of activate_tools
3. **Tool validation**: Only activate tools that exist in catalog
4. **No tool injection**: Tools come only from upstream energen-lean
5. **Session isolation**: Each Claude Code session has separate active registry

## Future Enhancements

1. **Auto-deactivation**: Remove tools not used for 10 minutes
2. **Usage analytics**: Track most-used tools
3. **Smart suggestions**: "You might also need these tools"
4. **Presets**: Save/load tool groups (e.g., "fullbay-sync" preset)
5. **Multi-upstream**: Connect to multiple Zoho MCP servers
6. **Tool caching**: Cache frequently-used tool results

---

**Next**: Implementation of proxy server
