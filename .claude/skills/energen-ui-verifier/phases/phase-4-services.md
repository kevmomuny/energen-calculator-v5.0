### Phase 4: Service Selection
**Purpose:** Verify all services (A-K + Custom) can be selected with correct frequencies

**Services to Test:**

| Service | Description | Frequencies | Template |
|---------|-------------|-------------|----------|
| A | Comprehensive Inspection | Q, SA, A | default |
| B | Oil & Filter Service | Q, SA, A | default |
| C | Coolant Service | Q, SA, A | default |
| D | Oil & Fuel Analysis | Q, SA, A | service-card-d |
| E | Load Bank Testing | Q, SA, A | default |
| F | Diesel Engine Tune-Up | Q, SA, A | service-card-fg |
| G | Gaseous Engine Tune-Up | Q, SA, A | service-card-fg |
| H | Electrical Testing | 5-year | service-card-h |
| I | Transfer Switch Service | Q, SA, A | default |
| J | Thermal Imaging | Q, SA, A | default |
| K | DEF System Service | Q, SA, A | service-card-k |
| CUSTOM | Custom Service | Any | service-card-custom |

**Test Sequence for Each Service:**
1. Scroll to service card
2. Verify service card renders
3. Verify service description visible
4. Click "Quarterly" button (if available)
5. Verify button becomes "active" (highlighted)
6. Verify pricing displays (non-zero)
7. Verify frequency badge shows "4x/year"
8. Click "Semi-Annual" button
9. Verify updates to "2x/year"
10. Click "Annual" button
11. Verify updates to "1x/year"
12. Deselect by clicking active button again
13. Verify service removed from selection

**Custom Service Additional Tests:**
1. Click "Add Custom Service"
2. Verify custom service card appears
3. Fill description: "Emergency Generator Inspection"
4. Fill hours: "8"
5. Verify per-visit price calculates (hours × $85)
6. Verify quarterly/annual totals update
7. Verify can add multiple custom services

**Critical Validation:**
- Service D: MUST show fluid checkboxes (Oil $16.55, Coolant $16.55, Fuel $60.00)
- Service D: MUST show subtotal when fluids are checked (e.g., Oil+Coolant = $33.10/yr)
- Service D: Price display must persist through recalculations (custom pricing, not overwritten by generic service-pricing.js code)
- Service D: Uses `updateServiceDFluids()` for custom pricing logic
- Service H: 5-year service (not quarterly/semi-annual/annual)
- Each service: Pricing updates when frequency changes
- Each service: Selected services appear in summary
- All services: Consistent opacity dimming when no kW rating entered
- All services: Consistent text color styling using `var(--text-tertiary)`

**Evidence Required:**
- Screenshot of each service card (12 total)
- Screenshot of each frequency selected
- Screenshot of pricing display
- Screenshot of service summary
- Console log for service selection events
- state.selectedServices verification
- Pricing calculation verification

**Known Issues:**
- E2E-004: Service selection may require DOM click (not just state update)
- Template loading may fail for specific services

**Fail If:**
- Any service card doesn't render
- Frequency buttons don't toggle
- Pricing shows $0.00
- Service doesn't appear in summary
- Console errors on selection
- state.selectedServices doesn't update

---
