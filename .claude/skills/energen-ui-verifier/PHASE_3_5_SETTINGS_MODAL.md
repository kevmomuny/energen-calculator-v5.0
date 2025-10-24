# Phase 3.5: Settings Modal - Live Pricing Updates

**Purpose:** Verify settings modal allows manual adjustment with real-time pricing recalculation

**CRITICAL USER REQUIREMENT:**
User must be able to open settings modal and manually adjust labor rates, markups, or other parameters, and see pricing update LIVE without re-calculating.

## Settings Modal Discovery

1. Find settings button/icon (usually gear icon, "settings" text, or in nav bar)
2. Possible selectors: `button:has-text('settings')`, `.settings-btn`, `#settingsBtn`, `[aria-label='Settings']`
3. Click to open settings modal

## Settings Fields to Test

| Setting | Expected Type | Test Values | Expected Behavior |
|---------|---------------|-------------|-------------------|
| Labor Rate ($/hr) | Number input | 180 → 200 | All labor costs recalculate immediately |
| Mobilization Rate ($/hr) | Number input | 180 → 150 | Mobilization costs update |
| Material Markup (%) | Number input | 20% → 25% | Material costs recalculate |
| Tax Rate (%) | Number input | 0% → 8.5% | Tax total updates |
| Per Diem Rate ($/day) | Number input | Default → 300 | Travel costs update (if applicable) |

## Test Sequence

1. **After Phase 5** (after calculation complete with pricing visible)
2. Open settings modal
3. Verify modal displays current settings
4. Screenshot: Initial settings values
5. Change labor rate: 180 → 200
6. **WITHOUT closing modal**, verify pricing updates in background
7. Screenshot: Settings changed, pricing updated
8. Change material markup: 20% → 25%
9. Verify material costs update
10. Close settings modal
11. Verify final pricing reflects all changes
12. Screenshot: Final updated pricing

## Live Update Verification

```javascript
{
  beforeChange: {
    laborRate: 180,
    annualTotal: 18744,
    laborCost: 6120
  },
  afterChange: {
    laborRate: 200,
    annualTotal: 20560,  // Should increase
    laborCost: 6800      // 6120 * (200/180) = 6800
  }
}
```

## Critical Checks

1. ✅ Settings modal opens
2. ✅ All adjustable fields visible and editable
3. ✅ Changes trigger recalculation
4. ✅ Pricing updates WITHOUT clicking "Calculate Quote" again
5. ✅ Changes persist after closing modal
6. ✅ Summary sidebar updates (if visible)
7. ✅ Service-level pricing updates
8. ✅ No console errors during live updates

## Evidence Required

- Screenshot: Settings button location
- Screenshot: Settings modal opened
- Screenshot: Before changing values (with pricing visible)
- Screenshot: After changing labor rate (pricing updated)
- Screenshot: After changing markup (pricing updated again)
- Screenshot: Final pricing after modal closed
- Console log: No errors during updates
- State verification: Settings saved to `window.state.settings`

## API Expectations

- Modal changes should NOT trigger new `/api/calculate` call
- Recalculation should happen client-side
- If API call triggered, flag as INEFFICIENT (but not failure)

## Known Issues

- Settings modal location may vary (nav bar, sidebar, floating button)
- Some implementations may require "Apply" button before updates
- Legacy implementations may force full recalculation

## Fail If

- Cannot find settings modal/button
- Settings modal doesn't open
- Fields not editable
- Changes don't update pricing
- Must click "Calculate Quote" again for updates
- Console errors on setting changes
- Pricing updates incorrectly (math wrong)
- Changes don't persist

---

**Insert this phase between Phase 3 and Phase 4 in the main skill.md file.**
