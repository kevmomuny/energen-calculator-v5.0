# MCP Proxy Research Findings - How to Build a Cloud MCP Proxy

**Date**: 2025-10-27
**Research Topic**: Building a proxy server for HTTP Cloud MCP like Zoho energen-lean

---

## Executive Summary

After extensive research, I've discovered that **our original proxy architecture was correct but incomplete**. The proxy needs to:
1. Act as an MCP stdio server (for Claude Code to connect to)
2. Act as an MCP HTTP/SSE client (to connect to energen-lean)
3. Bridge between these two transport types

---

## Key Findings

### 1. MCP Transport Types

**Three main transport mechanisms**:
- **stdio**: Standard input/output (used by Claude Desktop, Claude Code)
- **HTTP with SSE**: Server-Sent Events for server→client (used by Cloud MCP)
- **Streamable HTTP**: New protocol replacing standalone SSE (2024-11-05 spec)

### 2. Why Direct HTTP POST Failed

Our attempts to use `fetch()` POST requests failed because:
- Cloud MCP uses **SSE (Server-Sent Events)** for streaming responses
- Requires **persistent connection** for bidirectional communication
- Needs proper **MCP handshake** (initialize, initialized flow)
- Not a simple request/response REST API

### 3. Existing Proxy Solutions

Several production-ready MCP proxy implementations exist:

#### **punkpeye/mcp-proxy** (TypeScript)
- **What it does**: Stdio ↔ HTTP+SSE bridge
- **Endpoints**: `/mcp` (HTTP), `/sse` (SSE)
- **Features**: Authentication, CORS, stateless mode
- **Usage**: `npx mcp-proxy <stdio-server-command>`

#### **sparfenyuk/mcp-proxy** (Python)
- **What it does**: Bidirectional transport bridge
- **Modes**: stdio→SSE or SSE→stdio
- **Usage**: `mcp-proxy http://example.io/sse`
- **Features**: Named servers, Docker support

#### **mcp-remote** (npm package)
- **What it does**: OAuth + HTTP+SSE → stdio bridge
- **Purpose**: Connect stdio clients to remote HTTP servers
- **Usage**: `npx mcp-remote <url> --transport sse-only`
- **Features**: OAuth flow, authentication caching

---

## How Cloud MCP Actually Works

### Architecture

```
Claude Code (stdio client)
    ↓ JSON-RPC over stdio
mcp-remote bridge
    ↓ HTTP POST (client→server)
    ↓ SSE stream (server→client)
Cloud MCP Server (energen-lean)
    ↓ Zoho API calls
Zoho Books/CRM
```

### Protocol Flow

1. **Initialize Handshake**:
   ```javascript
   Client → Server: {"method": "initialize", "params": {...}}
   Server → Client: {"result": {"capabilities": {...}}}
   Client → Server: {"method": "initialized"}
   ```

2. **Tool Discovery**:
   ```javascript
   Client → Server: {"method": "tools/list"}
   Server → Client (via SSE): {"result": {"tools": [...]}}
   ```

3. **Tool Execution**:
   ```javascript
   Client → Server: {"method": "tools/call", "params": {"name": "...", "arguments": {...}}}
   Server → Client (via SSE): {"result": {...}}
   ```

### Why SSE is Critical

**Server-Sent Events (SSE)** enable:
- **Streaming responses**: Server can push multiple messages
- **Long-running operations**: Progress updates during execution
- **Bidirectional communication**: Client sends POST, server pushes via SSE
- **Connection persistence**: Keeps channel open for multiple requests

---

## Correct Proxy Implementation Strategy

### Option A: Use Existing Bridge (RECOMMENDED)

**Don't reinvent the wheel** - use `mcp-remote`:

```json
{
  "mcpServers": {
    "energen-lean-proxied": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://energen-lean-897662416.zohomcp.com/mcp/message?key=...",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

**Pros**:
- ✅ Production-ready
- ✅ OAuth support
- ✅ Maintained by community
- ✅ No custom code needed

**Cons**:
- ❌ All 609 tools still loaded (no on-demand filtering)
- ❌ No token savings (88k tokens)

### Option B: Build Custom Proxy with Tool Filtering

**Architecture**:
```
Claude Code
    ↓ stdio
Custom Zoho Proxy (our code)
    ├─ Meta-tools: search, activate, deactivate
    ├─ Tool catalog: 515 tools in memory
    ├─ Active tools registry
    └─ HTTP+SSE client to energen-lean
        ↓
Cloud MCP (energen-lean)
```

**Implementation requirements**:

1. **Stdio Server** (for Claude Code):
   ```typescript
   import { Server, StdioServerTransport } from '@modelcontextprotocol/sdk/server/index.js';

   const server = new Server({
     name: 'zoho-proxy',
     version: '1.0.0'
   }, {
     capabilities: { tools: {} }
   });

   const transport = new StdioServerTransport();
   await server.connect(transport);
   ```

2. **HTTP+SSE Client** (for energen-lean):
   ```typescript
   import { Client, SSEClientTransport } from '@modelcontextprotocol/sdk/client/index.js';

   const client = new Client({
     name: 'zoho-proxy-client',
     version: '1.0.0'
   }, {
     capabilities: {}
   });

   const transport = new SSEClientTransport(
     new URL('https://energen-lean-897662416.zohomcp.com/mcp/message?key=...')
   );

   await client.connect(transport);
   ```

3. **Tool Filtering Logic**:
   ```typescript
   // Only expose activated tools
   server.setRequestHandler(ListToolsRequestSchema, async () => {
     const metaTools = getMetaTools();
     const activeTools = await fetchActiveToolsFromUpstream();
     return { tools: [...metaTools, ...activeTools] };
   });

   // Forward only if tool is active
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     if (!isToolActive(request.params.name)) {
       throw new Error('Tool not activated');
     }
     return await client.callTool(request.params);
   });
   ```

**Pros**:
- ✅ On-demand tool loading
- ✅ Token savings (97%)
- ✅ Custom filtering logic

**Cons**:
- ❌ More complex implementation
- ❌ Requires maintenance
- ❌ Need to handle SSE connection management

---

## Why Our Original Implementation Failed

### What We Built:
```typescript
// ❌ This doesn't work
async forwardToUpstream(name, args) {
  const response = await fetch(URL, {
    method: 'POST',
    body: JSON.stringify({method: 'tools/call', params: {...}})
  });
  return await response.json();
}
```

### Why It Failed:
1. **No persistent connection**: fetch() creates one-time requests
2. **No SSE handling**: Can't receive server-pushed events
3. **No handshake**: Didn't initialize the MCP session
4. **Wrong protocol**: Cloud MCP expects SSE, not simple POST

### What We Should Have Built:
```typescript
// ✅ This is correct
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/index.js';

const transport = new SSEClientTransport(new URL(upstreamUrl));
const client = new Client({...}, {capabilities: {}});
await client.connect(transport);

// Now can call tools through the client
const result = await client.callTool({name, arguments: args});
```

---

## Implementation Plan for Zoho Proxy

### Phase 1: Use mcp-remote (Immediate Solution)

**Goal**: Get energen-lean working in Claude Code

**Steps**:
1. Configure mcp-remote in `.vscode/mcp.json`
2. Test connection to energen-lean
3. Create Test Testington customer
4. Verify 609 tools are available (but 88k tokens consumed)

**Timeline**: 5 minutes

### Phase 2: Build Custom Proxy (Token Optimization)

**Goal**: Reduce token usage from 88k to 2-5k

**Steps**:
1. Install MCP SDK: `npm install @modelcontextprotocol/sdk`
2. Implement stdio server (for Claude Code)
3. Implement SSE client (for energen-lean)
4. Add meta-tools (search, activate, deactivate)
5. Implement tool filtering logic
6. Test token usage reduction

**Timeline**: 2-3 hours

### Phase 3: Production Hardening

**Features**:
- Error handling and reconnection
- Tool activation state persistence
- Usage analytics
- Tool presets
- Auto-deactivation (timeout)

**Timeline**: 4-6 hours

---

## Code Examples from Research

### Example 1: MCP stdio Server (from punkpeye/mcp-proxy)

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-proxy',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {}
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

// Register tool handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_tools',
        description: 'Search for tools',
        inputSchema: { type: 'object', properties: {...} }
      }
    ]
  };
});
```

### Example 2: SSE Client (from SDK docs)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

const transport = new SSEClientTransport(
  new URL('https://example.com/mcp')
);

await client.connect(transport);

// List tools from upstream
const { tools } = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'some_tool',
  arguments: { key: 'value' }
});
```

### Example 3: Proxy Bridge (from sparfenyuk/mcp-proxy)

```python
# Python example showing the concept
def proxy_bridge(stdio_server, sse_client):
    # Forward stdio requests to SSE upstream
    @stdio_server.on_request
    async def handle_request(method, params):
        if method == 'tools/list':
            return await sse_client.list_tools()
        elif method == 'tools/call':
            return await sse_client.call_tool(params)

    # Forward SSE events to stdio
    @sse_client.on_event
    async def handle_event(event):
        await stdio_server.send_event(event)
```

---

## Recommended Action

### Immediate (Today):

1. **Use mcp-remote** to get energen-lean working:
   ```json
   {
     "mcpServers": {
       "energen-lean": {
         "command": "npx",
         "args": ["-y", "mcp-remote", "<url>", "--transport", "http-only"]
       }
     }
   }
   ```

2. **Test Zoho Books integration**:
   - Create Test Testington customer
   - Verify all tools work
   - Measure token usage (will be 88k)

### Short-term (This Week):

3. **Build custom proxy** with proper SSE client:
   - Use `@modelcontextprotocol/sdk` for both server and client
   - Implement stdio server + SSE client
   - Add tool filtering logic
   - Test token reduction

### Long-term (Next Week):

4. **Production features**:
   - Tool presets
   - Usage analytics
   - Auto-deactivation
   - Persistent state

---

## Key Takeaways

1. **MCP Cloud servers use SSE**, not simple REST APIs
2. **mcp-remote exists** and solves the stdio→HTTP bridge problem
3. **Custom proxy needs two transports**: stdio (server) + SSE (client)
4. **Tool filtering happens at proxy level**, not upstream
5. **Proper MCP SDK is essential** - can't use raw fetch()

---

## Resources

- **MCP TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **punkpeye/mcp-proxy**: https://github.com/punkpeye/mcp-proxy
- **sparfenyuk/mcp-proxy**: https://github.com/sparfenyuk/mcp-proxy
- **mcp-remote**: https://www.npmjs.com/package/mcp-remote
- **MCP Specification**: https://modelcontextprotocol.io/specification

---

**Status**: Research complete ✅
**Next**: Implement proper SSE-based proxy
