# Data Quality Analysis & Cleanup Plan
**Generated:** October 23, 2025
**Status:** Pre-Action Analysis Phase
**User Directive:** "before you act, look at the data in customers and accounts in all zoho tools. plan the proper sync and removal of bad dupes"

---

## 🔍 CURRENT DATA STATE (VERIFIED)

### CRM Accounts - Confirmed Duplicate: "Element Santa Clara"

#### Record 1: **KEEP THIS** (Fullbay Migration - Complete Data)
```
CRM Account ID: 6712770000003813014
Account Name: Element Santa Clara
External_ID: 2641091 ✅ (Fullbay Customer ID)
Customer_Is_Active: true ✅

COMPLETE DATA:
├─ Phone: 408-469-2702 ✅
├─ Billing Address: 1950 Wyatt Drive, Santa Clara, CA 95054, US ✅
├─ Physical Address: 1950 Wyatt Drive, Santa Clara, CA 95054, US ✅
├─ Billing Contact: Bernabe, Miguel ✅
├─ Credit Terms: Net 30 ✅
├─ Portal: ON ✅
├─ Lead Source: Fullbay Migration ✅
└─ Description: "Imported from Fullbay on 10/22/2025" ✅

Modified: 2025-10-22T15:11:33-07:00
Last Activity: 2025-10-22T15:11:34-07:00
```

#### Record 2: **DELETE THIS** (Empty Skeleton - No Value)
```
CRM Account ID: 6712770000003884067
Account Name: Element Santa Clara
External_ID: NONE ❌

EMPTY RECORD:
├─ Phone: NONE ❌
├─ Billing Address: NONE ❌
├─ Physical Address: NONE ❌
├─ Billing Contact: NONE ❌
├─ Credit Terms: NONE ❌
├─ Portal: OFF ❌
├─ Lead Source: NONE ❌
├─ Description: NONE ❌
└─ Customer_Is_Active: false ❌

Modified: 2025-10-18T16:26:49-07:00 (4 days BEFORE Fullbay migration)
Last Activity: 2025-10-18T16:26:49-07:00
```

---

## 🔴 ROOT CAUSE: How Duplicates Created

**Timeline:**
1. **Oct 18, 2025** - Someone manually created empty "Element Santa Clara" account in CRM
2. **Oct 18, 2025** - CRM-Books auto-sync created Books customer #1 (empty, name only)
3. **Oct 22, 2025** - Fullbay migration created complete "Element Santa Clara" account
4. **Oct 22, 2025** - CRM-Books auto-sync created Books customer #2 (should have full data)

**Result:**
- CRM: 2 accounts with same name
- Books: 2 customers with same name (possibly both with incomplete data due to sync issues)

---

## ⚠️ USER-REPORTED BOOKS ISSUE

**User Discovery:**
> "it looks like customers are doubled up in books and there is only contact name. no address or anything"

### What This Means:
1. **Books customers ARE duplicated** (confirmed - caused by CRM duplicates)
2. **Books customers missing critical data:**
   - No addresses (billing or shipping)
   - No phone numbers
   - No email addresses
   - Possibly no credit terms

### Why Books Missing Data:
Two possible causes:
1. **CRM→Books sync field mapping broken** - Fields not being mapped correctly
2. **Auto-sync synced empty account first** - Then full account, but mapping still broken

---

## 📊 REQUIRED DATA VERIFICATION STEPS

### Step 1: Get Complete CRM Account List ✅ (Partially Done)

**Known So Far:**
- Total migrated from Fullbay: 17 unique customers
- Confirmed duplicates: 1 ("Element Santa Clara")
- Likely more duplicates exist

**Needed:**
- [ ] Fetch all CRM accounts (estimated 17-20 including duplicates)
- [ ] Identify ALL duplicate names
- [ ] Categorize: Empty vs. Full records
- [ ] List all accounts missing: External_ID, Address, Phone, Email

**Method:**
Use CRM MCP `crm_search_accounts` iteratively for common names, OR
Create export/list via Zoho CRM web interface

### Step 2: Get Complete Books Customer List ⏳ (BLOCKED - Need Access)

**What We Need to See:**
```
For EACH Books customer:
├─ contact_id (Books customer ID)
├─ contact_name (company name)
├─ billing_address (complete address)
│   ├─ address (street)
│   ├─ city
│   ├─ state
│   ├─ zip
│   └─ country
├─ phone
├─ email
├─ payment_terms (credit terms)
└─ custom_fields (esp. Fullbay Customer ID if mapped)
```

**Access Options:**
1. **Official Zoho MCP `list_contacts` tool** (configured but not connecting)
2. **Direct Books API** (401 Unauthorized - token lacks Books scope)
3. **Manual export from Books web interface** ← Most reliable for immediate analysis

**User Action Needed:**
Go to: https://books.zoho.com/app/883966257#/contacts
Export customer list with all fields, or paste 5-10 sample customer records

### Step 3: Field-by-Field Comparison

Once we have both lists, compare:

| Field | CRM Field Name | Books Field Name | Expected Mapping |
|-------|---------------|------------------|------------------|
| Company Name | Account_Name | contact_name / company_name | DIRECT |
| Fullbay ID | External_ID | custom_field? | NEEDS VERIFICATION |
| Billing Address | Billing_Street, Billing_City, Billing_State, Billing_Code | billing_address.address, city, state, zip | VERIFY SYNC |
| Physical Address | Physical_Address_Line_1, Physical_Address_City, etc. | shipping_address? | VERIFY SYNC |
| Phone | Phone | phone | VERIFY SYNC |
| Email | Email | email | VERIFY SYNC |
| Credit Terms | Credit_Terms | payment_terms | VERIFY SYNC |
| Active Status | Customer_Is_Active | status | VERIFY SYNC |

### Step 4: Identify Date Discrepancies

**User Specifically Requested:** "find the date discrepancies"

**What to Check:**
```
CRM Account               Books Customer
├─ Created_Time      vs.  ├─ created_time
├─ Modified_Time     vs.  ├─ last_modified_time
└─ Last_Activity_Time     └─ last_sync_time?

Date Discrepancy Types:
1. Books customer created BEFORE CRM account (impossible - sync goes CRM→Books)
2. Books customer modified time doesn't match CRM (sync delay)
3. Multiple Books customers with same name but different create dates (duplicates)
4. Books customer last modified OLDER than CRM (sync stopped working)
```

---

## 🎯 CLEANUP STRATEGY (DO NOT EXECUTE YET)

### Phase 1: Clean CRM Duplicates First (Source of Truth)

**Objective:** Remove all empty duplicate CRM accounts

**Deletion Criteria:**
```sql
DELETE CRM Account WHERE:
  1. External_ID IS NULL OR Empty
  AND
  2. (Billing_Street IS NULL OR Empty)
  AND
  3. (Phone IS NULL OR Empty)
  AND
  4. Duplicate name exists with External_ID populated
  AND
  5. Customer_Is_Active = false
```

**Confirmed Deletion Candidate:**
- Element Santa Clara (ID: 6712770000003884067) ✅

**Process:**
1. Export ALL CRM accounts first (backup)
2. Identify all empty duplicates
3. Get user approval for deletion list
4. Delete via CRM API: `mcp__zoho-crm__delete_account` (if available)
   OR manual deletion via CRM web interface

**Expected Result:**
- CRM: 17 unique accounts (no duplicates)
- Books: Still has duplicates (not auto-deleted)

### Phase 2: Clean Books Duplicate Customers

**Two Options:**

#### Option A: Bulk Delete + Re-Sync (RECOMMENDED)
```
WHY: Books customers have incomplete data anyway (user confirmed)
      Starting fresh ensures clean sync with proper field mapping

STEPS:
1. Export ALL Books customers (backup)
2. Delete ALL Books customers (or just duplicates)
3. Fix CRM-Books field mapping configuration (see Phase 3)
4. Re-enable CRM-Books sync
5. Let Zoho auto-sync clean CRM data → Books
6. Verify one customer has complete data
7. Verify all 17 customers synced correctly
```

#### Option B: Manual Deduplication (NOT RECOMMENDED)
```
WHY: Too manual, doesn't fix root cause (broken field mapping)

STEPS:
1. For each duplicate pair in Books:
   - Find which has more complete data
   - Delete the empty one
   - Manually update remaining with missing fields
2. Manual work for 17+ duplicates
3. Field mapping still broken
```

**Recommendation:** Option A (Bulk Delete + Re-Sync)

### Phase 3: Fix CRM-Books Sync Field Mapping

**Problem:** Books customers only have contact_name, missing everything else

**Investigation Needed:**
1. Check Zoho Settings → Integrations → CRM-Books sync configuration
2. Verify field mappings are set correctly:
   ```
   CRM Account → Books Contact Mappings:
   - Account_Name → contact_name ✅ (working)
   - Account_Name → company_name (needs verification)
   - Billing_Street → billing_address.address ❌ (NOT working)
   - Billing_City → billing_address.city ❌ (NOT working)
   - Billing_State → billing_address.state ❌ (NOT working)
   - Billing_Code → billing_address.zip ❌ (NOT working)
   - Phone → phone ❌ (NOT working)
   - Email → email ❌ (NOT working)
   - Credit_Terms → payment_terms ❌ (NOT working)
   - External_ID → custom_field? ❓ (needs setup)
   ```

3. Update sync configuration if needed
4. Test with ONE account:
   - Pick clean CRM account
   - Trigger sync
   - Verify Books customer has ALL fields
   - If not, adjust mapping and retry

**Where to Check:**
- Zoho CRM: Settings → Marketplace → Zoho Books → Configure Sync
- Zoho Books: Settings → Integrations → Zoho CRM → Field Mappings

### Phase 4: Verify & Test

**Test Checklist:**
```
[ ] CRM has 17 unique accounts (no duplicates)
[ ] All CRM accounts have External_ID (Fullbay Customer ID)
[ ] All CRM accounts have billing address
[ ] All CRM accounts have phone number
[ ] Books has 17 unique customers (no duplicates)
[ ] Books customers have complete billing addresses
[ ] Books customers have phone numbers
[ ] Books customers have email addresses (where available)
[ ] Books customers have payment terms
[ ] CRM-Books sync working correctly
[ ] Test invoice creation with clean customer data
```

---

## 📋 IMMEDIATE NEXT ACTIONS (WAITING FOR DATA)

### Action 1: Get Books Customer List ⏳

**User Can Help:**
1. Go to https://books.zoho.com/app/883966257#/contacts
2. Click "Customers"
3. Export to CSV or Excel, OR
4. Copy/paste first 10 customer records with all fields visible

**What We're Looking For:**
- How many Books customers exist (should be ~17-34 if all duplicated)
- What fields actually populated (user says "only contact name")
- Which customers are duplicates
- Date fields for discrepancy analysis

### Action 2: Verify Other CRM Duplicates

**Search Common Names:**
Need to search for other likely duplicate patterns:
- Companies with common words: "Systems", "Services", "Corp", etc.
- Check all 17 known Fullbay customer names

**Method:**
Use `mcp__zoho-crm__crm_search_accounts` for each known customer name

### Action 3: Document Field Mapping Configuration

**User Can Help:**
Screenshot or describe current CRM-Books sync field mappings from Zoho settings

---

## ❓ QUESTIONS FOR USER

Before proceeding with cleanup:

1. **Books Customer Data:** Can you export/paste Books customer list so we can see actual data?

2. **Other Duplicates:** Have you noticed other duplicate customer names besides "Element Santa Clara"?

3. **Field Mapping:** Can you check Settings in Zoho CRM → Books integration and see what fields are mapped?

4. **Cleanup Preference:**
   - Option A: Delete all Books customers and re-sync clean from CRM? (RECOMMENDED)
   - Option B: Manually clean up each duplicate?

5. **Timeline:** How urgent is the invoice migration? (Determines if we do quick fix vs. proper cleanup)

---

## 🚨 CRITICAL: DO NOT EXECUTE DELETIONS YET

**User said:** "before you act, look at the data"

**Current Status:**
- ✅ Analyzed CRM duplicate (Element Santa Clara)
- ⏳ Waiting for Books customer data
- ⏳ Need to verify other CRM duplicates
- ⏳ Need to check field mapping configuration

**Next Step:**
Get complete Books customer list to finalize analysis and present deletion plan for approval.

---

**Report Status:** ANALYSIS IN PROGRESS - AWAITING DATA
