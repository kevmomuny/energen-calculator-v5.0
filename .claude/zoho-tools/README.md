# Zoho MCP Tool Configurations

Pre-built optimized configurations for different Zoho workflows.

## The Problem

Loading all 609 Zoho MCP tools = **88,000 tokens** → session crashes

## The Solution

Use Claude Code's native `"tools"` array filtering to load only what you need.

## Available Configs

### invoicing-workflow.json (15 tools, ~2.2k tokens)
- **Use for:** Creating quotes/invoices, emailing to customers, tracking payments
- **Tools:** Contacts, invoices, payments, items
- **Token savings:** 97.5% (88k → 2.2k)

### contacts-only.json (9 tools, ~1.3k tokens)
- **Use for:** Managing customer/vendor contacts and addresses
- **Tools:** Contact CRUD operations, addresses, contact persons
- **Token savings:** 98.5% (88k → 1.3k)

## How to Use

1. Choose the config you need
2. Copy `mcpServers` section to C:/Users/Kevin/.vscode/mcp.json
3. Restart Claude Code
4. Tools available with minimal tokens!

## The Breakthrough

Claude Code **already supports** tool filtering via the "tools" array.
No proxy needed. Just smart configuration.
