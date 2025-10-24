### Phase 6: Results Validation
**Purpose:** Verify results display is accurate and complete

**Quarterly Breakdown Validation:**

| Quarter | Check | Expected |
|---------|-------|----------|
| Q1 (Oct-Dec) | Sum of quarterly services | Match service totals |
| Q2 (Jan-Mar) | Sum of quarterly services | Match service totals |
| Q3 (Apr-Jun) | Sum of quarterly services | Match service totals |
| Q4 (Jul-Sep) | Sum of quarterly services | Match service totals |

**Service Breakdown Validation:**
For each service:
1. Verify service code/name displayed
2. Verify frequency badge (Q/SA/A)
3. Verify per-visit price shown
4. Verify annual total shown
5. Calculate: per-visit × frequency = annual (must match)

**Example Validation (Service A Quarterly):**
```
Per-visit: $1,733.50
Frequency: 4
Calculated Annual: $1,733.50 × 4 = $6,934.00
Displayed Annual: $6,934.00 ✓ MUST MATCH
```

**Grand Total Validation:**
```
Sum of all service annual totals = Grand Total
Verify: Calculator shows same total as manual sum
```

**Evidence Required:**
- Screenshot of complete results
- Manual calculation spreadsheet
- Comparison table (expected vs actual)
- All values logged to JSON
- Verification: Each total matches calculation

**Fail If:**
- Any quarterly total incorrect
- Any service total incorrect
- Grand total doesn't match sum
- Any service missing from breakdown
- Any value shows $0.00 when should have value

---
