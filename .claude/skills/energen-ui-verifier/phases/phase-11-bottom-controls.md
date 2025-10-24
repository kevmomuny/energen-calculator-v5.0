### Phase 11: Bottom-of-Page UI Controls
**Purpose:** Verify all UI elements at bottom of page (often missed in testing)

**CRITICAL: Scroll Verification**
1. Scroll to absolute bottom of page
2. Take screenshot showing bottom controls
3. Verify all elements visible and clickable

**Mobilization Controls to Test:**

| Element | Location | Function |
|---------|----------|----------|
| Mobilization Charge Presets | Bottom section | $0, $65, $100 buttons |
| Mobilization Stacking Toggle | Bottom section | Enable/disable charge stacking |
| Custom Mobilization Input | Bottom section | Manual charge entry |

**Test Sequence:**
1. Scroll to bottom of page
2. Click "$0" mobilization preset
3. Verify charge updates to $0
4. Click "$65" mobilization preset
5. Verify charge updates to $65
6. Verify pricing recalculates with mobilization
7. Click "$100" mobilization preset
8. Test mobilization stacking toggle
9. Verify stacking behavior (per-unit vs one-time)
10. Test custom mobilization input
11. Enter custom value: "150"
12. Verify custom charge applies

**Advanced Features at Bottom:**
- Additional services toggle
- Emergency service premium
- Prevailing wage toggle (if present)
- Any footer buttons or links

**Evidence Required:**
- Screenshot of bottom section (full view)
- Screenshot of each mobilization preset selected
- Verification of pricing calculations with mobilization
- Console logs for mobilization changes

**Fail If:**
- Bottom controls not visible
- Mobilization presets don't work
- Pricing doesn't update with mobilization
- Stacking toggle doesn't function
- Custom input rejected

---
