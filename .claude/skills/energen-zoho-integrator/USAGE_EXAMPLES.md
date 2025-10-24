# Usage Examples - Energen Zoho Integrator

## Example 1: Create New Module Integration (Service Contracts)

**Command:**
```
Use energen-zoho-integrator to create integration for Service_Contracts module
```

**Workflow:**
1. Claude prompts for module specification
2. You provide fields (Contract_Number, Start_Date, End_Date, Customer_Account lookup, etc.)
3. Claude generates 4 files in ~2 minutes

**Generated:**
- `src/api/zoho-service-contracts-api.cjs` (370 lines)
- `service-contracts-create-fields.cjs` (setup script)
- `tests/test-service-contracts-zoho.cjs` (tests)
- Updates `modules/zoho-integration/ZohoMCPServer.js`

**Time Saved:** 4-6 hours → 10 minutes

---

## Example 2: From JSON Specification

**File:** `my-module-spec.json`
```json
{
  "moduleName": "Technician_Schedules",
  "displayName": "Technician Schedules",
  "fields": [
    {"api_name": "Schedule_Date", "field_label": "Date", "data_type": "date"},
    {"api_name": "Technician", "field_label": "Technician", "data_type": "lookup",
     "lookup": {"module": {"api_name": "Users"}}},
    {"api_name": "Hours_Worked", "field_label": "Hours", "data_type": "number"}
  ]
}
```

**Command:**
```
Use energen-zoho-integrator with spec file my-module-spec.json
```

---

## Example 3: Test Generated Integration

**After generation:**
```bash
# 1. Create fields in Zoho
node technician-schedules-create-fields.cjs

# 2. Run tests
node tests/test-technician-schedules-zoho.cjs
```

---

**Last Updated:** October 18, 2025
