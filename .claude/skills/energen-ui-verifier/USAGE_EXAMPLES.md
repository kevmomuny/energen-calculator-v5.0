# Usage Examples - Energen UI Verifier

## Example 1: Full Production Readiness Verification

**Command:**
```
Use energen-ui-verifier to verify production readiness
```

**What Happens:**
1. Runs all 16 phases sequentially
2. Tests 220+ verification checks
3. Generates evidence (screenshots, logs, API responses)
4. Reports PASS/FAIL for each phase
5. Final verdict: PRODUCTION READY or NOT READY

**Duration:** ~5-10 minutes (automated)

---

## Example 2: Test Specific Phase

**Command:**
```
Use energen-ui-verifier to test Phase 4 (Service Selection) in detail
```

**Tests:**
- All 12 service cards (A-K + Custom)
- Frequency buttons (Quarterly, Semi-Annual, Annual)
- Pricing calculations
- Service summary updates
- 36 total checks

---

## Example 3: After Bug Fix Verification

**Command:**
```
Use energen-ui-verifier to re-verify after fixing E2E-004
```

**Focuses on:**
- Phase 4 (Service Selection)
- Phase 5 (Quote Calculation)
- Verifies fix doesn't break other features

---

## Example 4: Use Test Scenario

**Command:**
```
Use energen-ui-verifier with Starbucks test scenario (150kW Natural Gas)
```

**Test Data:**
- Company: Starbucks
- Generator: 150kW, Natural Gas, Cummins
- Services: A (Q), B (Q), C (SA)
- Expected: $8,000-$12,000 annual

**Result:** PASS/FAIL with evidence

---

**Last Updated:** October 18, 2025
