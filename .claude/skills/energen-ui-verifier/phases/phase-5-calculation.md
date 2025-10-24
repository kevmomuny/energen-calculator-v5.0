### Phase 5: Quote Calculation
**Purpose:** Verify calculator returns accurate pricing

**UI Elements:**

| Element | Selector | Check | Expected |
|---------|----------|-------|----------|
| Calculate Button | `button:has-text('Calculate Quote')` | Enabled when services selected | Triggers calculation |
| Loading Indicator | `.spinner` or loading message | Appears during calc | Disappears when done |
| Results Summary | `#quote-summary` or results section | Appears after calc | Shows all totals |

**Test Sequence:**
1. Verify "Calculate Quote" button enabled
2. Click "Calculate Quote"
3. Verify loading indicator appears
4. Wait for calculation to complete (max 10 seconds)
5. Verify loading indicator disappears
6. Verify results section appears
7. Verify all selected services listed
8. Verify each service shows:
   - Service name/code
   - Frequency (Quarterly/Semi-Annual/Annual)
   - Per-visit price
   - Annual total
9. Verify quarterly totals (Q1, Q2, Q3, Q4)
10. Verify annual grand total

**API Validation:**
1. Capture /api/calculate request payload
2. Verify includes:
   - Generator kW
   - Fuel type
   - Selected services with frequencies
   - Custom services (if any)
3. Verify response includes:
   - serviceBreakdown (object with service details)
   - Each service has: laborCost, partsCost, totalCost, frequency
   - quarterlyTotals (array or object)
   - annualTotal
4. Compare UI display to API response (must match)

**Pricing Accuracy Tests:**
- Service A (175kW Diesel, Quarterly): Should be ~$1,700-$2,000 per quarter
- Service B (175kW Diesel, Quarterly): Should be ~$400-$600 per quarter
- Service D (175kW Diesel, Annual): Should be max ~$93 (one-time)
- Custom (8 hours): Should be 8 × $85 = $680
- Annual total: Should be sum of all annual costs

**Evidence Required:**
- Screenshot before calculation
- Screenshot during loading
- Screenshot of results
- Console log showing /api/calculate call
- Network request/response capture
- Comparison: API response vs UI display
- Validation: Totals match expected ranges

**Known Issues:**
- E2E-004: Calculation may return $0 if services not properly selected via DOM
- Bug #4: Pricing data may not transfer to PDF/Zoho (check state.units[0].serverCalculations)
- Bug #8: Frequency field may be missing in serviceBreakdown

**Fail If:**
- Calculate button doesn't respond
- Loading never completes (timeout > 15s)
- Results don't appear
- Any service shows $0.00 pricing
- API returns error
- API response missing required fields
- UI totals don't match API totals
- Quarterly totals incorrect
- Console errors during calculation

---
