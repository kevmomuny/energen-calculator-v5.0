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

**Top Totals Validation:**
Verify metric cards at top of page update correctly:
1. **TOTAL QUOTE**: Should match grand total from all services
2. **LABOR HOURS**: Should be sum of all service labor hours
3. **MATERIALS**: Should be sum of all materials/parts costs
4. **UNITS**: Should show number of generators (typically 1)
5. **Labor Rate Indicator**: Verify UI shows which rate was used
   - Standard: "$180/hr"
   - Prevailing Wage: "$236.50/hr (Prevailing Wage + Overhead)"

**Service D Special Validation:**
- Service D price must show fluid analysis subtotal
- Must NOT show $0.00 when fluids are checked
- Must persist through recalculations
- Example: Oil ($16.55) + Coolant ($16.55) = $33.10/year

**Prevailing Wage Results Verification:**

**Prevailing Wage Comparison Test:**
Run TWO calculations side-by-side:
1. Calculate quote WITHOUT prevailing wage (default $180/hr)
2. Enable prevailing wage (e.g., $121.50 API + $115 overhead = $236.50/hr)
3. Re-calculate same services
4. Compare totals:
   ```
   Example (Service A Quarterly, 300kW Diesel):
   - Default rate: $1,733.50/visit × 4 = $6,934/year
   - Prevailing wage: $2,276.80/visit × 4 = $9,107/year
   - Difference: $2,173/year (31% increase)
   ```
5. Verify all labor costs scaled proportionally
6. Verify materials costs remain unchanged

**Evidence Required:**
- Screenshot of complete results
- Screenshot of top totals (TOTAL QUOTE, LABOR HOURS, MATERIALS, UNITS)
- Screenshot showing labor rate used in calculation
- Manual calculation spreadsheet
- Comparison table (expected vs actual)
- Comparison table: default vs prevailing wage totals
- All values logged to JSON
- Verification: Each total matches calculation
- JSON dump showing prevailing wage settings in state

**Known Issues:**
- BUG-026: Top totals require summary-calculator.js import in init.js (FIXED)
- BUG-027: Service D price overwritten by generic pricing (FIXED)
- BUG-028: Service card styling inconsistency (opacity dimming) (FIXED)

**Fail If:**
- Any quarterly total incorrect
- Any service total incorrect
- Grand total doesn't match sum
- Top totals showing $0.00 when services selected
- Service D shows $0.00 when fluids checked
- Any service missing from breakdown
- Any value shows $0.00 when should have value
- Labor rate indicator doesn't show correct rate
- Prevailing wage impact not reflected in totals
- Labor costs don't scale proportionally with prevailing wage

---
