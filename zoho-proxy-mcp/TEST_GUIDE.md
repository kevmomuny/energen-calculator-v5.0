# Zoho Proxy MCP - Testing Guide

## ✅ What's Been Implemented

The proxy is **fully configured** to connect to energen-lean:
- ✅ Upstream URL configured: `https://energen-lean-897662416.zohomcp.com/mcp/message?key=...`
- ✅ HTTP forwarding implemented using `fetch()`
- ✅ JSON-RPC 2.0 protocol for tool calls
- ✅ Error handling for upstream failures
- ✅ Real tool execution (no more simulated responses)

**Code changes**: [index.js:34](index.js:34) (config) and [index.js:565-621](index.js:565-621) (forwarding)

---

## 🧪 How to Test in Claude Code

### Step 1: Verify Proxy is Active

The proxy is already configured in `.vscode/mcp.json`:
```json
{
  "mcpServers": {
    "zoho-proxy": {
      "command": "node",
      "args": ["C:/ECalc/active/energen-calculator-v5.0/zoho-proxy-mcp/index.js"]
    }
  }
}
```

**Action**: Restart Claude Code (Ctrl+Shift+P → "Developer: Reload Window")

### Step 2: Check Available Tools

In Claude Code chat, ask:
```
What Zoho tools do you have access to?
```

**Expected response**:
```
I have access to 5 Zoho meta-tools:
- search_tools
- list_categories
- get_tool_info
- activate_tools
- deactivate_tools
```

**Token usage**: ~2,000 tokens (vs. 88,000 with direct energen-lean)

---

## 🔍 Test Sequence

### Test 1: Search for Tools

**User**: "Search for contact-related Zoho tools"

**Claude will**:
1. Call `search_tools({ query: "contact", limit: 10 })`
2. Display results like:
   - create_contact
   - list_contacts
   - update_contact
   - delete_contact
   - etc.

**Verify**: Results returned in <10ms

---

### Test 2: Activate Tools

**User**: "Activate the list_contacts tool"

**Claude will**:
1. Call `activate_tools({ tools: ["list_contacts"] })`
2. Report success:
   ```
   ✅ Activated: list_contacts
   Total active: 1
   Estimated tokens: 500
   ```

**Verify**:
- Tool count increases by 1
- Token usage: ~2,500 total (2k meta + 500 for list_contacts)

---

### Test 3: Use Real Tool (Forwarding to energen-lean)

**User**: "List the first 5 contacts from Zoho Books"

**Claude will**:
1. Call `list_contacts({ organization_id: "883966257", per_page: 5 })`
2. Proxy forwards to energen-lean via HTTPS
3. energen-lean executes the call against Zoho Books API
4. Results returned through proxy to Claude

**Expected response**:
- List of 5 real customer names from Zoho Books
- Contact details (email, phone, company)
- **NO "simulated" message** (proves real connection working)

**What happens behind the scenes**:
```
Claude Code
    ↓ calls list_contacts
Zoho Proxy (logs: "Forwarding list_contacts to energen-lean...")
    ↓ HTTP POST to energen-lean URL
Zoho Cloud MCP (energen-lean)
    ↓ calls Zoho Books API
Zoho Books
    ↓ returns customer data
energen-lean
    ↓ JSON-RPC response
Zoho Proxy
    ↓ result
Claude Code (displays customer list)
```

---

### Test 4: Error Handling

**User**: "Activate a tool called 'fake_tool_12345'"

**Expected response**:
```
❌ Error: Tool 'fake_tool_12345' not found in catalog
```

**User**: "Try to call list_contacts without activating it first"

**Expected response**:
```
❌ Error: Tool 'list_contacts' is not active. Use activate_tools() to load it first.
```

---

### Test 5: Deactivate Tools

**User**: "Deactivate all Zoho tools"

**Claude will**:
1. Call `deactivate_tools({ tools: ["all"] })`
2. Report:
   ```
   ✅ Deactivated: list_contacts
   Remaining active: 0
   Estimated tokens: 0
   ```

**Verify**: Back to 2,000 tokens (just meta-tools)

---

## 🎯 Advanced Test Cases

### Test 6: Multi-Tool Workflow

**User**: "I want to create a new contact and then create an invoice for them"

**Expected workflow**:
1. Claude searches for tools: `search_tools({ query: "contact" })`
2. Claude activates: `activate_tools({ tools: ["create_contact", "list_contacts", "create_invoice"] })`
3. Claude creates contact: `create_contact({ ... })`
4. Claude creates invoice: `create_invoice({ customer_id: "...", ... })`
5. Claude deactivates: `deactivate_tools({ tools: ["all"] })`

**Token usage during workflow**:
- Start: 2,000 (meta-tools only)
- Active: ~3,500 (meta + 3 active tools)
- End: 2,000 (cleaned up)

**Savings**: 84,500 tokens saved vs. loading all 609 tools

---

### Test 7: Browse by Category

**User**: "Show me all available categories in Zoho Books"

**Claude will**:
1. Call `list_categories({ app: "Zoho Books" })`
2. Display:
   - contacts (23 tools)
   - invoicing (74 tools)
   - estimates (32 tools)
   - items (18 tools)
   - etc.

---

### Test 8: Tool Info Inspection

**User**: "What parameters does create_invoice require?"

**Claude will**:
1. Call `get_tool_info({ name: "create_invoice" })`
2. Display:
   - Description
   - Required parameters
   - Optional parameters
   - Usage examples

**Note**: Tool is NOT activated (no token cost increase)

---

## 📊 Monitoring & Debugging

### Check Proxy Logs

The proxy logs to stderr (visible in VS Code Output panel):

```
[Proxy] Zoho Proxy MCP Server running
[Proxy] Catalog: 515 tools loaded
[Proxy] Max active tools: 50
[Proxy] Forwarding list_contacts to energen-lean...
[Proxy] Tool list_contacts executed successfully
```

### Common Log Messages

**Success**:
```
[Proxy] Tool {name} executed successfully
```

**Upstream error**:
```
[Proxy] Upstream error: <error details>
```

**Connection failure**:
```
[Proxy] Failed to forward to energen-lean: <error message>
```

---

## ✅ Success Criteria

The proxy is working correctly if:

1. **Meta-tools respond** - Search, list, info, activate, deactivate all work
2. **Dynamic loading works** - Tool count increases when activated
3. **Real tool calls succeed** - NO "simulated" messages
4. **Actual data returned** - Real customer names, invoices, etc. from Zoho
5. **Token usage low** - ~2k-5k tokens vs. 88k with direct connection

---

## 🐛 Troubleshooting

### Issue: "simulated" in responses

**Cause**: Code still has old simulated forwarding
**Fix**: Verify [index.js:565-621](index.js:565-621) has real `fetch()` implementation

### Issue: "Tool not active" error

**Cause**: Forgot to activate tool before calling
**Fix**: Call `activate_tools({ tools: ["tool_name"] })` first

### Issue: HTTP 403/401 errors

**Cause**: energen-lean API key invalid or expired
**Fix**: Check URL in [index.js:34](index.js:34) - may need to regenerate key

### Issue: "Max active tools reached"

**Cause**: Already have 50 tools active
**Fix**: Call `deactivate_tools({ tools: ["all"] })` to clear

---

## 📈 Performance Expectations

| Operation | Expected Time |
|-----------|---------------|
| Search tools | <10ms |
| Activate tool | 50-100ms |
| List categories | <5ms |
| Real tool call | 500ms-2s (includes Zoho API) |

---

## 🎉 Success Example

**Conversation**:
```
User: Show me Zoho Books contacts

Claude: Let me search and activate the tool...
[Calls: search_tools, activate_tools, list_contacts]

Here are 5 contacts from your Zoho Books:
1. John Doe (john@example.com) - ABC Corp
2. Jane Smith (jane@acme.com) - Acme Industries
3. ...

Token usage: 2,500 (vs. 88,000 with direct energen-lean)
Savings: 97.2%
```

---

## Next Steps

1. ✅ Test in Claude Code (this guide)
2. Monitor proxy logs for errors
3. Test complex workflows (multi-tool operations)
4. Document common patterns
5. Consider adding tool presets for frequent workflows

---

**Status**: Ready for real-world testing
**Updated**: 2025-10-27
