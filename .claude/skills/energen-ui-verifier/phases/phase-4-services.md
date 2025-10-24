### Phase 4: Service Selection
**Purpose:** Verify all services (A-K + Custom) can be selected with correct frequencies

**Services to Test:**

| Service | Description | Frequencies | Template |
|---------|-------------|-------------|----------|
| A | Comprehensive Inspection | Q, SA, A | default |
| B | Air & Fuel System Service | Q, SA, A | default |
| C | Cooling System Service | Q, SA, A | default |
| D | DPF Service | SA, A only | service-card-d |
| E | Oil & Filter Service | Q, SA, A | default |
| F | Fuel System Service | Q, SA, A | service-card-fg |
| G | Governor/Actuator Service | Q, SA, A | service-card-fg |
| H | Load Bank Test | A only | service-card-h |
| I | Valve Lash Adjustment | A only | default |
| J | Vibration Dampener Inspection | Q, SA, A | default |
| K | SCR/DEF System Service | Q, SA, A | service-card-k |
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
- Service D: MUST NOT show Quarterly option (annual service only)
- Service H: MUST NOT show Quarterly/Semi-Annual (annual only)
- Each service: Pricing updates when frequency changes
- Each service: Selected services appear in summary

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
