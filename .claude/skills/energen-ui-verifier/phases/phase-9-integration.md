### Phase 9: Complete Workflow Integration Test
**Purpose:** Verify end-to-end workflow from fresh page to complete Zoho record

**Complete Test Sequence:**
1. Navigate to fresh page (clear cache/cookies)
2. Verify Phase 0 (Pre-flight)
3. Execute Phase 1 (Customer entry)
4. Execute Phase 2 (Contact entry)
5. Execute Phase 3 (Generator specs)
6. Execute Phase 4 (Service selection - minimum 3 services: A, B, D)
7. Execute Phase 5 (Calculate quote)
8. Execute Phase 6 (Validate results)
9. Execute Phase 7 (Generate PDF)
10. Execute Phase 8 (Complete Zoho transfer)
11. Verify in Zoho CRM:
    - Account record exists
    - Contact record exists and linked
    - Generator asset exists and linked
    - Quote record exists with all services
    - All pricing correct
    - All lookups linked

**Test Scenarios (Use Test Dataset):**

**Scenario 1: Small Generator (test_004 - Safeway)**
- 100 kW, Natural Gas, Generac
- Services: A (Q), B (SA), G (A)
- Expected: $6,000-$9,000

**Scenario 2: Medium Generator (test_001 - Starbucks)**
- 150 kW, Natural Gas, Cummins
- Services: A (Q), B (Q), C (SA)
- Expected: $8,000-$12,000

**Scenario 3: Large Generator (test_003 - Apple)**
- 2000 kW, Diesel, MTU
- Services: A (Q), B (Q), C (Q), E (SA), F (SA), J (SA)
- Expected: $95,000-$115,000

**Evidence Required:**
- Complete screenshot sequence (every phase)
- Complete console log (entire workflow)
- Complete network log (all API calls)
- Complete state dump (JSON export)
- Complete Zoho verification (screenshots of all records)
- Comparison report (expected vs actual for all values)

**Fail If:**
- ANY phase fails
- ANY data missing in Zoho
- ANY pricing incorrect
- ANY link broken
- ANY console error
- Workflow cannot complete end-to-end

---
