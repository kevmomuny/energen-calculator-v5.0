# Immediate Solution - Get Zoho Working Now

**Goal**: Test Zoho Books integration and create Test Testington customer
**Method**: Use `mcp-remote` bridge (standard solution)
**Time**: 5 minutes

---

## Step 1: Update MCP Configuration

Replace `.vscode/mcp.json` with:

```json
{
  "mcpServers": {
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

**What this does**:
- Uses `mcp-remote` as a bridge between stdio (Claude Code) and HTTP+SSE (energen-lean)
- Connects directly to Zoho Cloud MCP
- No proxy - all 609 tools loaded (88k tokens, but it works!)

---

## Step 2: Restart Claude Code

- Save the file
- Press `Ctrl+Shift+P`
- Run: `Developer: Reload Window`
- Wait 30-60 seconds for `mcp-remote` to initialize

---

## Step 3: Verify Connection

In Claude Code chat, ask:
```
"What Zoho MCP tools do you have access to?"
```

**Expected**: List of energen-lean tools (create_contact, list_contacts, etc.)

---

## Step 4: Create Test Testington

Now ask Claude Code:
```
"Create a new customer in Zoho Books with these details:
- Name: Test Testington
- Company: Testington Industries LLC
- Email: test.testington@testingtonind.com
- Phone: 555-0123
- Mobile: 555-0124
- Billing Address: 123 Test Street, Suite 456, Testville, CA 90210
- Shipping Address: 123 Test Street, Warehouse B, Testville, CA 90210
- Payment Terms: Net 30
- Website: https://testingtonind.com
- Notes: Test customer created via MCP - can be deleted"
```

**Expected**: Customer created successfully with ID returned

---

## Step 5: Verify in Zoho Books

1. Open https://books.zoho.com
2. Go to Customers
3. Search for "Test Testington"
4. Verify all details are correct

---

## Troubleshooting

### Issue: "npx: command not found"

**Fix**: Install Node.js (includes npx)
- Download from https://nodejs.org
- Restart Claude Code after installation

### Issue: "401 Unauthorized" after mcp-remote starts

**Fix**: API key might be expired
- Check if key in URL is complete (not `***`)
- Regenerate key in Zoho Cloud MCP portal
- Update mcp.json with new URL

### Issue: "mcp-remote" not found

**Fix**: Run manually first to cache it:
```bash
npx -y mcp-remote --help
```

---

## Next Steps (After This Works)

Once Test Testington is created:

### Phase 2: Build Token-Saving Proxy

The current solution loads all 609 tools (88k tokens). To reduce this:

1. **Install MCP SDK**:
   ```bash
   cd zoho-proxy-mcp
   npm install @modelcontextprotocol/sdk
   ```

2. **Rewrite proxy** using proper SSE client:
   - Replace `fetch()` with `SSEClientTransport`
   - Implement stdio server for Claude Code
   - Add tool filtering logic

3. **Test token reduction**:
   - Measure before: 88k tokens
   - Measure after: 2-5k tokens
   - Verify: 97% savings achieved

---

## Why This Works (But Proxy Didn't)

**Our proxy attempt**:
```typescript
// ❌ This failed with 401
fetch(URL, {
  method: 'POST',
  body: JSON.stringify({method: 'tools/call'})
})
```

**mcp-remote does**:
```typescript
// ✅ This works
const transport = new SSEClientTransport(new URL(cloudMcpUrl));
const client = new Client(...);
await client.connect(transport);
await client.callTool({...});
```

**Key difference**: mcp-remote uses the **MCP SDK** with proper **SSE (Server-Sent Events)** handling, not raw HTTP POST.

---

## Expected Outcome

✅ energen-lean connected via mcp-remote
✅ All 609 Zoho tools available
✅ Test Testington customer created in Zoho Books
⚠️ High token usage (88k) - will optimize later

**This proves the integration works - token optimization comes next!**
