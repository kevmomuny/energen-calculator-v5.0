# Local Zoho MCP Implementation - ARCHIVED

**Status**: Archived - Project now uses cloud-only Zoho MCP  
**Date Archived**: 2025-10-23  
**Reason**: Simplified to single cloud MCP server (energen-lean)

---

## Original Purpose

This directory contained a custom local MCP server implementation for Zoho integration.

## Files

- `ZohoMCPServer.js` - Custom MCP server implementation
- `start-mcp-server.js` - Server startup script
- `v5-zoho-sync.cjs` - V5-specific Zoho sync logic
- `proxy-zoho-http-mcp.cjs` - HTTP MCP proxy

## Original Configuration

Previously configured in `.vscode/settings.json`:

```json
{
  "zoho-crm-local": {
    "type": "stdio",
    "command": "node",
    "args": ["C:\\ECalc\\active\\energen-calculator-v5.0\\modules\\zoho-integration\\start-mcp-server.js"],
    "env": {
      "ZOHO_CLIENT_ID": "...",
      "ZOHO_CLIENT_SECRET": "...",
      "ZOHO_REFRESH_TOKEN": "...",
      "ZOHO_API_DOMAIN": "https://www.zohoapis.com",
      "ZOHO_ACCOUNTS_URL": "https://accounts.zoho.com"
    }
  }
}
```

## Why Switched to Cloud MCP

1. **Full OAuth Scope**: Cloud MCP has pre-configured OAuth with all necessary scopes (Books, CRM, Inventory, etc.)
2. **No Token Management**: No need to manually refresh tokens or manage credentials
3. **Simpler Setup**: No local server to maintain or troubleshoot
4. **Better Tools**: 60+ pre-built Zoho tools vs custom implementation
5. **Rate Limit Handling**: Catalyst infrastructure handles rate limits

## Current Cloud MCP Configuration

See `.vscode/mcp.json`:

```json
{
  "servers": {
    "energen-lean": {
      "type": "http",
      "url": "https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d",
      "tools": ["*"]
    }
  }
}
```

## If You Need to Re-enable Local MCP

1. Uncomment configuration in `.vscode/settings.json`
2. Update OAuth credentials in environment variables
3. Install dependencies: `npm install` in this directory
4. Start server: `node start-mcp-server.js`
5. Verify connection in Claude Code with `/mcp list`

## Migration Notes

The cloud MCP provides equivalent or better functionality:
- All CRM operations → Use `mcp__energen-lean__*` tools
- All Books operations → Use `mcp__energen-lean__*` tools
- Custom sync logic → Can be implemented as wrapper functions calling cloud MCP tools

---

**Files kept for reference only. Not actively used.**
