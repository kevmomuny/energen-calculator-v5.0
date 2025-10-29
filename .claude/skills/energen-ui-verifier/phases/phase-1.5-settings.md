### Phase 1.5: Settings Modal & Application Configuration
**Purpose:** Verify settings modal opens, displays configuration options, and persists changes

**CRITICAL:** Settings modal is ESSENTIAL for configuring labor rates, mileage rates, tax rates, and other application-wide settings.

**UI Elements to Verify:**

| Element | Selector | Check | Expected |
|---------|----------|-------|----------|
| Settings Button/Icon | `button:has-text('Settings')` or `.settings-icon` | Exists, Visible, Enabled | Opens settings modal |
| Settings Modal | `.settings-modal` or `[role='dialog']` | Opens on click | Display all settings |
| Labor Rate Input | Settings modal `input[name='laborRate']` | Exists, Visible, Enabled | Current rate ($85 default) |
| Mileage Rate Input | Settings modal `input[name='mileageRate']` | Exists, Visible, Enabled | Current rate ($2.50 default) |
| Tax Rate Input | Settings modal `input[name='taxRate']` | Exists, Visible, Enabled | Current rate (% format) |
| Shop Address Input | Settings modal `input[name='shopAddress']` | Exists, Visible, Enabled | Base location for mileage |
| Prevailing Wage Checkbox | `#prevailingWageRequired` | Exists, Visible, Clickable | Toggles prevailing wage mode |
| Prevailing Wage Details | `#prevailingWageDetails` | Hidden when unchecked | Shows when checkbox checked |
| Business Overhead Input | Inside prevailing wage section | Exists, Editable | Default: $115.00 |
| API Rate Display | Inside prevailing wage section | Shows after ZIP lookup | DIR rate for location |
| Manual Override Checkbox | Inside prevailing wage section | Exists, Toggleable | Allows custom rate entry |
| Manual Rate Input | Inside prevailing wage section | Enabled when override checked | Custom rate input field |
| Save Button | Settings modal `button:has-text('Save')` | Exists, Enabled | Save and close |
| Cancel Button | Settings modal `button:has-text('Cancel')` | Exists, Enabled | Close without saving |

**Test Sequence:**
1. Locate and click Settings button/icon
2. Verify settings modal opens within 500ms
3. Verify modal displays current settings values
4. Test labor rate modification:
   - Change from $85 to $95
   - Verify input accepts change
5. Test mileage rate modification:
   - Change from $2.50 to $3.00
   - Verify input accepts change
6. Test tax rate modification:
   - Enter location-specific tax rate (e.g., 9.5%)
   - Verify input accepts percentage format
7. Verify shop address field (for mileage calculations)
8. Test prevailing wage settings:
   - Locate "Prevailing Wage Required" checkbox
   - Verify checkbox is unchecked by default
   - Check the prevailing wage checkbox
   - Verify `#prevailingWageDetails` section appears
   - Enter customer ZIP code (e.g., 94520 for Concord, CA)
   - Click "Refresh Prevailing Wage" or trigger auto-fetch
   - Verify API call to `/api/prevailing-wage/{zip}` succeeds
   - Verify API-fetched rate displays (e.g., $121.50 for Alameda County electrician)
   - Verify business overhead field shows $115.00
   - Calculate: Final Rate = API Rate + Business Overhead
   - Verify manual override checkbox exists
   - Check manual override checkbox
   - Enter custom rate (e.g., $250.00)
   - Verify manual override visual feedback (different styling)
9. Click "Save" button
10. Verify modal closes
11. Verify settings persist in window.state.settings or localStorage
12. Verify prevailing wage settings persist to `frontend/config/default-settings.json`
13. Verify `window.state.settings.prevailingWage` object contains:
    - `businessOverhead`: 115.00
    - `defaultClassification`: "electricianJourneyman"
    - `lastApiRate`: (fetched rate)
    - `lastUpdated`: (timestamp)
    - `lastZip`: (ZIP code)
14. Verify new rates apply to subsequent calculations

**Settings Persistence Test:**
1. Change a setting and save
2. Reload page
3. Open settings modal
4. Verify changed setting still reflects new value
5. Verify calculation uses new setting value

**Prevailing Wage Persistence Verification:**
```javascript
// Check settings object structure
console.log(window.state.settings.prevailingWage);
// Expected:
{
  businessOverhead: 115.00,
  defaultClassification: "electricianJourneyman",
  defaultZone: 1,
  lastApiRate: 121.50,
  lastUpdated: "2025-10-27T...",
  lastZip: "94520"
}
```

**Evidence Required:**
- Screenshot of Settings button/icon location
- Screenshot of opened settings modal with all fields visible
- Screenshot of modified settings before save
- Screenshot after save (modal closed)
- Console log showing settings save event
- window.state.settings or localStorage verification
- Test calculation with new rates to prove they apply

**Known Issues:**
- Settings may be stored in localStorage vs window.state
- Modal may use different selectors (`.modal`, `[role='dialog']`, etc.)
- Tax rate may be location-based (auto-calculated) vs manual override

**Fail If:**
- Settings button not visible or not clickable
- Modal doesn't open
- Any settings field missing
- Settings don't accept input changes
- Save doesn't persist settings
- Settings don't apply to calculations
- Modal can't be dismissed with Cancel
- Console errors during settings interaction
- Settings lost on page reload
- Prevailing wage checkbox doesn't toggle details section
- API call fails or times out (>5s)
- Fetched rate doesn't display
- Business overhead field missing or not editable
- Manual override doesn't override API rate
- Prevailing wage settings don't persist on save
- Calculations don't use prevailing wage when enabled

---
