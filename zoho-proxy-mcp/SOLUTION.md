# The Real Solution - Tool Filtering in Claude Code

## The Discovery

Looking at `.vscode/mcp-zoho-minimal.json`, I found this:

```json
{
  "servers": {
    "energen-lean": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=...",
      "tools": [
        "create_contact",
        "list_contacts",
        "get_contact",
        "update_contact",
        "create_invoice",
        "list_invoices",
        "email_invoice",
        "create_estimate",
        "list_estimates",
        "create_customer_payment"
      ]
    }
  }
}
```

**THE "tools" ARRAY!** This is Claude Code's native way to filter which tools load!

## The Actual Problem & Solution

**Problem:** 609 tools = 88k tokens = session dies

**Attempted Solution #1:** Proxy server that filters tools
- ❌ Complex architecture
- ❌ Authentication issues (HTTP 401)
- ❌ mcp-remote coordination failures

**ACTUAL Solution:** Use Claude Code's native tool filtering!

```json
{
  "mcpServers": {
    "zoho-essentials": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=YOUR_KEY",
      "tools": [
        "create_contact",
        "list_contacts",
        "get_contact",
        "update_contact",
        "delete_contact",
        "create_invoice",
        "list_invoices",
        "get_invoice",
        "update_invoice",
        "email_invoice",
        "create_estimate",
        "list_estimates",
        "create_customer_payment",
        "list_customer_payments",
        "create_item",
        "list_items"
      ]
    }
  }
}
```

## Token Savings

- **Full server:** 609 tools × ~145 tokens = **88,000 tokens**
- **Filtered (16 tools):** 16 tools × ~145 tokens = **~2,300 tokens**
- **Savings:** 97% reduction!

## Multiple Configurations

You can create multiple filtered configs for different use cases:

### zoho-contacts.json
Just contact-related tools (~10 tools = 1.5k tokens)

### zoho-invoicing.json
Just invoicing tools (~15 tools = 2.2k tokens)

### zoho-full-crm.json
CRM + Sales workflow (~30 tools = 4.5k tokens)

Switch between them based on your task!

## Why This Works Better Than Proxy

1. ✅ **Native OAuth** - Claude Code handles authentication
2. ✅ **No middleware** - Direct connection to Zoho
3. ✅ **Simple configuration** - Just a JSON file
4. ✅ **No maintenance** - No proxy server to debug
5. ✅ **Multiple configs** - Easy to switch contexts

## The Innovation

**Create a skill that generates these filtered configs based on task!**

```javascript
// .claude/skills/zoho-tool-picker/
// Analyzes user's task and generates optimal tool filter config
```

When user says "I need to work with invoices", the skill:
1. Identifies needed tools (invoice + contact + payment tools)
2. Generates filtered MCP config
3. User restarts Claude Code with optimized toolset
4. Work proceeds with minimal tokens!

## Conclusion

We were overthinking it. Claude Code already has the solution built-in.
The "tools" array in MCP config is the token optimization feature we needed.

No proxy. No mcp-remote. Just smart configuration.
