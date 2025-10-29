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
- Service A (300kW Diesel, Annual): Should be ~$1,873/year
- Service B (300kW Diesel, Annual): Should be ~$1,852/year
- Service C (300kW Diesel, Annual): Should be ~$2,165/year
- Service D (300kW Diesel, Annual with Oil+Coolant): Should be $33.10/year
- Service D (300kW Diesel, Annual with all fluids): Should be $93.10/year
- Service E (300kW Diesel, Annual): Should be ~$3,820/year
- Custom (8 hours): Should be 8 × labor rate (e.g., 8 × $200 = $1,600)
- Annual total: Should be sum of all annual costs
- Top totals: TOTAL QUOTE, LABOR HOURS, MATERIALS must update in real-time

**Prevailing Wage Impact on Calculations:**

**When prevailing wage is ENABLED:**
1. Verify `/api/calculate` request includes prevailingWage flag
2. Verify labor rate calculation uses:
   - Base: Prevailing wage rate (API or manual)
   - Add: Business overhead ($115.00 default)
   - Formula: `laborRate = prevailingWageRate + businessOverhead`
3. Example validation:
   - API rate: $121.50 (Electrician Journeyman, Alameda)
   - Business overhead: $115.00
   - **Expected labor rate: $236.50/hour**
4. Compare to non-prevailing wage:
   - Default labor rate: $180.00/hour (from default-settings.json)
   - Difference: $56.50/hour premium

**API Request Validation:**
```javascript
// Capture /api/calculate payload with prevailing wage
{
  generatorKw: 300,
  fuelType: "diesel",
  selectedServices: [...],
  settings: {
    laborRate: 236.50,  // ← Prevailing wage + overhead
    prevailingWage: {
      enabled: true,
      apiRate: 121.50,
      businessOverhead: 115.00,
      manualOverride: false
    }
  }
}
```

**Evidence Required:**
- Screenshot before calculation
- Screenshot during loading
- Screenshot of results
- Console log showing /api/calculate call
- Network request/response capture
- Comparison: API response vs UI display
- Validation: Totals match expected ranges
- Side-by-side calculation: default rate vs prevailing wage rate
- Verify all services (A-K) use prevailing wage rate consistently

**Known Issues:**
- E2E-004: Calculation may return $0 if services not properly selected via DOM
- Bug #4: Pricing data may not transfer to PDF/Zoho (check state.units[0].serverCalculations)
- Bug #8: Frequency field may be missing in serviceBreakdown
- BUG-026: Top totals (TOTAL QUOTE, LABOR HOURS, MATERIALS) require summary-calculator.js import in init.js (FIXED)
- BUG-027: Service D price display was overwritten by generic pricing code in service-pricing.js (FIXED with skip at line 217)

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
- Prevailing wage setting doesn't affect calculation
- Labor rate doesn't reflect prevailing wage + overhead
- Some services use prevailing wage, others don't (inconsistency)

---
