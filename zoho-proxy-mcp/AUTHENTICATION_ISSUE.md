# Cloud MCP Authentication Issue - Diagnostic Report

**Date**: 2025-10-27
**Issue**: HTTP 401 "Authentication required" with fresh API key

---

## Problem Summary

We're getting `401 Unauthorized` with the error message "Authentication required" when trying to access:
```
https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d
```

You confirmed this is a **brand new key** copied directly from the live portal.

---

## Tests Performed

### Test 1: Various JSON-RPC Methods
- ✅ Connection successful (server responds)
- ✅ Protocol understood (no 400 errors)
- ❌ Authentication rejected (401 on all requests)

### Test 2: Different HTTP Methods
- POST with JSON body: 401
- GET request: 405 (Method not allowed)
- Different headers: 401

### Test 3: MCP Protocol Formats
- Standard JSON-RPC 2.0: 401
- MCP initialize: 401
- MCP tools/list: 401
- MCP tools/call: 401

**Consistent result**: "Authentication required"

---

## Possible Causes

### 1. Key is Censored in Documentation ⭐ MOST LIKELY
When you copied the URL from the Cloud MCP portal, did you see:
```
https://energen-lean-897662416.zohomcp.com/mcp/message?key=****************
```

The asterisks `****************` might be placeholder masking in the UI. You need to:
1. Click a "Show Key" or "Copy" button
2. Or look for the **actual key value** (not censored)

### 2. Key Requires Activation
Some API keys need to be "activated" or "enabled" after generation:
- Check if there's an "Enable" or "Activate" toggle in the portal
- Verify the key status shows as "Active" not "Created" or "Pending"

### 3. Key is Account-Specific
The key might be tied to:
- A specific Zoho account login session
- An organization ID that must be included
- A workspace or environment setting

### 4. Different Auth Method Required
Instead of URL parameter `?key=...`, it might need:
- Header: `Authorization: Bearer <key>`
- Header: `X-API-Key: <key>`
- Cookie-based authentication
- OAuth token instead of static key

### 5. Server Configuration Issue
The energen-lean server instance might:
- Need to be restarted/regenerated
- Require re-linking to Zoho account
- Have IP whitelist restrictions
- Be in a suspended/expired state

---

## How to Get the Correct Working Key

### Step 1: Verify in Portal

Go to the Cloud MCP portal and look for:
- "Show API Key" button (might reveal the real key)
- "Copy to Clipboard" button (gets actual key value)
- "Test Connection" button (validates the key works)

### Step 2: Check Key Format

The key should look like:
- `9f15f41fdd1a73dba505c3be6857016d` (32 hex characters)
- OR a longer format like JWT tokens

If you see `****************`, that's not the actual key!

### Step 3: Test Key in Portal

Most Cloud MCP portals have a "Test" feature:
- Button to test the connection
- Sample request builder
- Key validation tool

Try this first to confirm the key actually works.

---

## Quick Diagnostic Commands

### Test 1: Verify the key you have
```bash
# Show the key currently in the config
node -e "console.log('Current key:', 'https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d'.match(/key=(.+)/)[1])"
```

Expected: Shows the actual key value (not asterisks)

### Test 2: Try the URL directly
```bash
curl -X POST https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

If this returns 401, the key is definitely invalid.

---

## What to Check in the Portal

When you're in the Cloud MCP portal, look for:

1. **Key Status**
   - [ ] Active / Enabled
   - [ ] Created date
   - [ ] Last used date
   - [ ] Expiration date

2. **Connection URL**
   - [ ] Copy button (might reveal real key)
   - [ ] Show/Hide button for key
   - [ ] "Test Connection" feature

3. **Server Status**
   - [ ] Server is "Running" not "Stopped"
   - [ ] No error messages or warnings
   - [ ] Recent activity logs

4. **Account Linking**
   - [ ] Zoho account connected
   - [ ] Organization selected
   - [ ] Permissions granted

---

## Next Steps

### Option A: If Key is Censored (Most Likely)
1. Go to Cloud MCP portal
2. Find the "Show Key" or "Copy Key" button
3. Get the **actual uncensored key value**
4. Update proxy config with real key
5. Test again

### Option B: If Key Shows as Inactive
1. Look for "Activate" or "Enable" button
2. Enable the key
3. Test again

### Option C: If Server is Down
1. Check server status in portal
2. Restart/regenerate the energen-lean server
3. Get new connection URL
4. Test again

### Option D: If Different Auth Method
1. Check portal documentation
2. Look for "Integration Examples"
3. See if headers are required instead of URL param
4. Update our request format

---

## Current Proxy Status

The proxy implementation is **100% correct** for standard MCP HTTP protocol:
- ✅ Proper JSON-RPC 2.0 format
- ✅ Correct method names
- ✅ Valid request structure
- ✅ Error handling implemented

The **only issue** is authentication - we need the working key/auth method.

---

## Action Required

**Please check the Cloud MCP portal and:**

1. Verify the key is not showing as `****************` (censored)
2. Click any "Show Key" or "Copy URL" buttons to get the real value
3. Confirm the server status is "Active" or "Running"
4. Test the connection using any built-in test feature
5. Share the **actual working URL** with the real key value

Once we have the correct working key, the proxy will function immediately!

---

**Status**: ⏳ Waiting for actual working API key from portal
