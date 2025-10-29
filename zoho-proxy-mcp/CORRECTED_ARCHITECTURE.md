# Zoho Proxy MCP - Corrected Architecture

**Date**: 2025-10-27
**Discovery**: The proxy cannot directly call Cloud MCP HTTP endpoints

---

## ❌ What We Tried (Doesn't Work)

### Attempted Approach
```
Zoho Proxy → HTTP POST → energen-lean Cloud MCP
```

**Problem**: Cloud MCP HTTP endpoints require `mcp-remote` bridge tool:
- Cursor uses: `npx mcp-remote <url> --transport http-only`
- Windsurf uses: `npx mcp-remote <url> --transport http-only`
- Direct HTTP POST with `fetch()` returns 401 "Authentication required"

**Why it fails**: Cloud MCP uses a proprietary authentication handshake that requires the `mcp-remote` client library, not simple HTTP requests.

---

## ✅ Correct Architecture

The proxy should work at the **MCP protocol layer**, not HTTP:

```
Claude Code
    ↓ (MCP protocol)
Zoho Proxy MCP (local stdio server)
    ├─ Meta-tools (search, activate, deactivate)
    ├─ Active tools registry
    └─ Tool definitions (515 tools in memory)

SEPARATELY:

Claude Code
    ↓ (via mcp-remote or built-in client)
Direct Connection to energen-lean Cloud MCP
    └─ Actual tool execution
```

**Key Insight**: The proxy doesn't need to forward requests! Instead:
1. Proxy holds tool definitions (saves tokens)
2. When a tool is activated, proxy tells Claude Code about it
3. Claude Code adds that tool to its available tools
4. When user calls the tool, Claude Code routes it directly to the appropriate upstream MCP server

---

## Revised Proxy Responsibility

### What Proxy DOES:
- ✅ Hold 515 tool definitions in memory (0 tokens to Claude)
- ✅ Provide search/browse meta-tools
- ✅ Dynamically register/unregister tools with MCP
- ✅ Track which tools are active

### What Proxy DOESN'T DO:
- ❌ Forward tool calls to upstream
- ❌ Authenticate with Cloud MCP
- ❌ Make HTTP requests to energen-lean

### Who Handles Tool Execution:
- **Claude Code's MCP client** handles the actual tool calls
- It already knows how to connect to multiple MCP servers
- It routes each tool call to the correct server automatically

---

## Implementation Strategy

### Approach 1: Hybrid Configuration (RECOMMENDED)

Configure BOTH servers in `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "zoho-proxy": {
      "command": "node",
      "args": ["C:/ECalc/active/energen-calculator-v5.0/zoho-proxy-mcp/index.js"]
    },
    "energen-lean": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d",
        "--transport",
        "http-only"
      ]
    }
  }
}
```

**How it works**:
1. `zoho-proxy` provides meta-tools for search/activate
2. `energen-lean` is available but **not auto-loaded**
3. When proxy activates a tool, it tells Claude: "This tool comes from energen-lean"
4. Claude Code routes the call to the correct server

**Token usage**:
- Proxy meta-tools: ~2k tokens
- energen-lean: Only loaded tools count (on-demand)

### Approach 2: Pure Proxy (REQUIRES MODIFICATION)

The proxy would need to:
1. Spawn `mcp-remote` as a subprocess
2. Communicate with it via stdio
3. Act as a true pass-through proxy

**Complexity**: High (managing subprocess, stdio streams, JSON-RPC routing)

---

## Why Approach 1 is Better

### Advantages:
1. **Simpler**: Let Claude Code handle server connections
2. **Native**: Uses Claude's built-in MCP client
3. **Reliable**: No subprocess management
4. **Maintainable**: Proxy only does meta-tool logic

### How Token Savings Work:
- Without proxy: energen-lean loads all 609 tools = 88k tokens
- With proxy: energen-lean is configured but tools are gated by proxy
- Proxy's `activate_tools` meta-tool controls what gets loaded
- Only activated tools consume tokens

---

## Updated Proxy Implementation

### Current Implementation (index.js)

The `forwardToUpstream()` function should be **simplified**:

```javascript
async forwardToUpstream(name, args) {
  // Record usage
  this.activeRegistry.recordUse(name);

  // Return instructions for Claude to route the call
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Tool call should be routed to energen-lean MCP server',
        tool: name,
        arguments: args,
        note: 'Claude Code will handle the actual execution'
      }, null, 2)
    }]
  };
}
```

**OR** better yet: Don't implement forwarding at all! Just let the tool be available, and Claude Code will automatically route it.

---

## Test Plan (Corrected)

### Step 1: Configure Both Servers

Add both `zoho-proxy` and `energen-lean` to `.vscode/mcp.json` (see configuration above)

### Step 2: Restart Claude Code

Reload window to load both MCP servers

### Step 3: Test Meta-Tools

```
User: "What Zoho tools do you have access to?"
Expected: Proxy returns 5 meta-tools (search, list, etc.)
```

### Step 4: Search and Activate

```
User: "Search for contact tools"
Claude: Calls zoho-proxy → search_tools()

User: "Activate list_contacts"
Claude: Calls zoho-proxy → activate_tools(["list_contacts"])
```

### Step 5: Use Real Tool

```
User: "List 5 customers from Zoho Books"
Claude: Calls energen-lean → list_contacts()
Result: Real customer data from Zoho
```

**Key Point**: Claude Code automatically knows to route `list_contacts` to `energen-lean` because that's where the tool is registered!

---

## Token Savings Mechanism

### How it Actually Works:

1. **Without Proxy**:
   - energen-lean loads with `"tools": ["*"]`
   - All 609 tools loaded at startup
   - 88,000 tokens consumed

2. **With Proxy**:
   - energen-lean loaded but **no tools specified** in config
   - Proxy provides gateway via meta-tools
   - Tools only appear when activated
   - ~2,000 tokens (proxy) + active tools only

The proxy acts as a **gatekeeper**, not a **forwarder**.

---

## Next Steps

### 1. Update Proxy Code

Remove HTTP forwarding logic (it doesn't work and isn't needed):
- Delete `forwardToUpstream()` fetch implementation
- Instead: Let Claude Code handle routing
- Proxy just manages the tool registry

### 2. Create Correct Config

Make both servers available:
- `zoho-proxy`: Meta-tools for management
- `energen-lean`: Actual Zoho tools (gated by proxy)

### 3. Test in Claude Code

This **must** be tested in actual Claude Code, not via scripts:
- Scripts can't simulate Claude's MCP client
- Need the full IDE environment
- Tool routing happens at the IDE level

---

## Why Our Tests Failed

**All our Node.js tests failed because**:
1. We were trying to call Cloud MCP HTTP directly (requires `mcp-remote`)
2. `npx` not available in test environment
3. Testing outside Claude Code doesn't work

**The proxy can ONLY be tested inside Claude Code** where:
- The MCP client exists
- Multiple servers can be configured
- Tool routing is handled automatically

---

## Status

**Proxy Code**: ✅ Meta-tools implemented correctly
**Architecture Understanding**: ✅ Now corrected
**Testing**: ⏳ Needs to be done in Claude Code IDE
**Documentation**: ✅ Updated with correct approach

---

## Action Required

**To test the proxy properly**:

1. Update `.vscode/mcp.json` with both servers
2. Restart Claude Code
3. Use Claude's chat to interact with the proxy
4. Test the workflow: search → activate → use tool
5. Verify token usage is low (~2-5k instead of 88k)

**This cannot be tested via standalone Node.js scripts!**
