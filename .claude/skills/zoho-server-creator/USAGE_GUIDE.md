# Zoho Server Creator - Quick Start Guide

**For: Energen Calculator v5.0**
**Priority: Building Zoho data structure and backend connections**

---

## 🎯 Priority 1: Data Structure & Backend Setup

Based on "building our zoho data structure and backend connections," here's the recommended sequence:

### **Phase 1: Data Exploration (START HERE)**

Create `energen-data-explorer` FIRST to safely browse existing Zoho data:

```
Server: energen-data-explorer
Tools: 12 (all read-only)
Use: Understand current Zoho structure before making changes
```

**Why first?**
- Read-only (safe, no risk)
- See what fields exist
- Understand data relationships
- Verify Zoho setup

### **Phase 2: Field & Structure Configuration**

Create `energen-field-admin` to build out custom fields and modules:

```
Server: energen-field-admin
Tools: 8 (field/module management)
Use: Configure CRM structure, custom fields, layouts
```

**Use for:**
- Add custom fields to Contacts/Accounts
- Create custom modules if needed
- Configure field layouts
- Set up data structure

### **Phase 3: Backend Data Connections**

Create `energen-contacts-sync` for data synchronization:

```
Server: energen-contacts-sync
Tools: 7 (contact + CRM operations)
Use: Import/sync data, establish connections
```

**Use for:**
- Import Fullbay customers
- Sync between Books & CRM
- Establish data flows
- Test CRUD operations

---

## 🚀 Quick Start (30 Minutes Total)

### **Step 1: Create Servers via Chrome DevTools (15 min)**

1. **Open Zoho MCP Dashboard:**
   ```
   https://mcp.zoho.com/mcp-client
   ```

2. **Open Chrome DevTools:**
   - Press `F12`
   - Click "Console" tab

3. **Load the automation script:**
   - Open: `.claude/scripts/zoho-mcp-server-creator.js`
   - Copy entire contents
   - Paste into console
   - Press Enter

4. **Create servers in order:**

   ```javascript
   // Phase 1: Data Explorer (5 min)
   await createServer(SERVER_CONFIGS["energen-data-explorer"])

   // Wait for completion, then...

   // Phase 2: Field Admin (5 min)
   await createServer(SERVER_CONFIGS["energen-field-admin"])

   // Wait for completion, then...

   // Phase 3: Contacts Sync (5 min)
   await createServer(SERVER_CONFIGS["energen-contacts-sync"])
   ```

5. **Copy server URLs:**
   - Each creation shows the server URL
   - Copy all 3 URLs for next step

---

### **Step 2: Configure Claude Code (5 min)**

1. **Update `.vscode/mcp.json`:**

   ```json
   {
     "servers": {
       "data-explorer": {
         "type": "http",
         "url": "YOUR_DATA_EXPLORER_URL_HERE",
         "tools": ["*"]
       },
       "field-admin": {
         "type": "http",
         "url": "YOUR_FIELD_ADMIN_URL_HERE",
         "tools": ["*"]
       },
       "contacts-sync": {
         "type": "http",
         "url": "YOUR_CONTACTS_SYNC_URL_HERE",
         "tools": ["*"]
       }
     },
     "inputs": []
   }
   ```

2. **Reload VSCode:**
   - `Ctrl+Shift+P`
   - Type: "Developer: Reload Window"
   - Press Enter

---

### **Step 3: Enable & Authenticate (10 min)**

1. **Check server status:**
   ```
   /mcp status
   ```

2. **For each server showing "disabled":**
   - Click the server name
   - Select "Enable"
   - Click "Allow" in OAuth browser window
   - Wait for "connected" status

3. **Verify tools loaded:**
   ```
   /mcp list
   ```

   Should show:
   - `data-explorer`: 12 tools
   - `field-admin`: 8 tools
   - `contacts-sync`: 7 tools
   - **Total: 27 tools (~13.5k tokens)**

---

## 📋 Recommended Workflow After Setup

### **Day 1: Explore Existing Structure**

Use `energen-data-explorer` tools:

```
User: "List all custom fields in Zoho CRM Accounts module"
Claude: [Uses mcp__data_explorer__Get_Fields]

User: "Show me the first 10 contacts in Zoho Books"
Claude: [Uses mcp__data_explorer__list_contacts]

User: "What modules exist in CRM?"
Claude: [Uses mcp__data_explorer__Get_Modules]
```

**Goal:** Understand current Zoho configuration

---

### **Day 2: Configure Data Structure**

Use `energen-field-admin` tools:

```
User: "Create a custom field in CRM Contacts called 'Fullbay_Customer_ID'"
Claude: [Uses mcp__field_admin__Create_Field]

User: "Add a custom field to Accounts for 'Generator_Count'"
Claude: [Uses mcp__field_admin__Create_Field]

User: "Show me the layout for Contacts module"
Claude: [Uses mcp__field_admin__Get_Layouts]
```

**Goal:** Set up custom fields for Energen data model

---

### **Day 3: Test Data Sync**

Use `energen-contacts-sync` tools:

```
User: "Create a test contact in Zoho Books"
Claude: [Uses mcp__contacts_sync__create_contact]

User: "Search for that contact in CRM"
Claude: [Uses mcp__contacts_sync__Search_Records]

User: "Update the contact's email address"
Claude: [Uses mcp__contacts_sync__update_contact]
```

**Goal:** Verify CRUD operations work correctly

---

## 🔧 Manual Server Creation (If Automation Fails)

If the Chrome DevTools script doesn't work, create manually:

### **Manual Steps for Each Server:**

1. **Go to:** https://mcp.zoho.com/mcp-client
2. **Click:** "Create Server"
3. **Name:** `energen-data-explorer` (or other server name)
4. **Click:** "Create"
5. **Click:** "Config Tools"
6. **For each tool in the list:**
   - Search for the app (ZohoBooks, ZohoCRM)
   - Click the app
   - Find and check the tool
7. **Click:** "Add Now"
8. **Click:** "Connect" tab
9. **Copy:** The MCP URL
10. **Paste:** Into `.vscode/mcp.json`

**Tool lists are in:** `.claude/scripts/zoho-mcp-server-creator.js`

---

## 📊 Expected Results

### **After Phase 1 (Data Explorer):**

✅ Can browse all Zoho data safely
✅ See custom fields and modules
✅ Understand data structure
✅ Generate reports

**Token usage:** ~6k (one server active)

---

### **After Phase 2 (Field Admin):**

✅ Can create custom fields
✅ Can modify layouts
✅ Can manage modules
✅ CRM structure configured

**Token usage:** ~10k (two servers active)

---

### **After Phase 3 (Contacts Sync):**

✅ Can import customers
✅ Can sync Books ↔ CRM
✅ Full CRUD operations
✅ Data flow established

**Token usage:** ~13.5k (three servers active)

---

## 🎯 Success Checklist

Before moving to invoicing/operations, verify:

- [ ] Created all 3 servers in Zoho dashboard
- [ ] Updated `.vscode/mcp.json` with URLs
- [ ] Reloaded VSCode window
- [ ] All servers show "connected" in `/mcp status`
- [ ] OAuth completed for each server
- [ ] Can list contacts from Books
- [ ] Can search records in CRM
- [ ] Can get CRM fields
- [ ] Custom fields created (if needed)
- [ ] Test contact created successfully

**Once checklist complete:** Backend structure is ready for operations!

---

## 🔄 Next Steps (After Backend Setup)

### **Phase 4: Operations (Later)**

After backend is solid, add operational servers:

```
energen-invoicing      → Create quotes, invoices, send emails
energen-sales-orders   → Sales order workflow
energen-projects       → Project and time tracking
```

**But don't create these yet!** Focus on backend structure first.

---

## 💡 Pro Tips

### **Tip 1: Start with Data Explorer**
Always explore before modifying. Understanding existing structure prevents mistakes.

### **Tip 2: Keep Servers Disabled When Not Using**
In `/mcp status`, disable servers you're not actively using to save tokens.

### **Tip 3: Use Server Registry**
Track created servers in `.claude/zoho-tools/servers/registry.json` to remember what's what.

### **Tip 4: Test in Data Explorer First**
Before using field-admin or contacts-sync, verify the operation in data-explorer (read-only mode).

---

## 📞 Support

**If you encounter issues:**

1. **OAuth failures:**
   - Clear authentication in `/mcp status`
   - Try re-enabling the server
   - Check you're logged into Zoho (https://accounts.zoho.com)

2. **Tools not loading:**
   - Verify `.vscode/mcp.json` has correct URLs
   - Check `"tools": ["*"]` is set
   - Reload VSCode window

3. **400 Bad Request:**
   - Server might need to be recreated
   - Try creating a new server with different name
   - Verify API key in URL is correct

4. **Server creation automation fails:**
   - Fall back to manual creation
   - Follow manual steps above
   - Script works for most cases but manual is always an option

---

## ⏱️ Time Estimates

| Task | Time | Complexity |
|------|------|------------|
| Create 1 server (automated) | 30 sec | Easy |
| Create 1 server (manual) | 5 min | Easy |
| Create 3 servers (automated) | 90 sec | Easy |
| Create 3 servers (manual) | 15 min | Medium |
| Configure `.vscode/mcp.json` | 2 min | Easy |
| Complete OAuth (per server) | 30 sec | Easy |
| **Total setup time** | **~10-30 min** | **Easy-Medium** |

---

**Ready to begin?** Start with Phase 1: Create `energen-data-explorer`!
