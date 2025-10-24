### Phase 1: Customer Information Entry & Logo Selection
**Purpose:** Verify customer data entry, enrichment, and logo selection workflow

**CRITICAL: Full Page Scroll Verification**
Before beginning Phase 1, scroll to the absolute bottom of the page and take a screenshot to verify all UI elements load correctly throughout the entire page. This ensures elements like mobilization controls, advanced settings, and footer buttons are properly rendered.

**UI Elements to Verify:**

| Element | Selector | Check | Expected |
|---------|----------|-------|----------|
| Company Name Input | `input[placeholder*='Company Name']` | Exists, Visible, Enabled | Accept text input |
| Phone Input | `input[aria-label='Phone']` | Exists, Visible, Enabled | Accept phone format |
| Email Input | `input[placeholder*='contact@']` | Exists, Visible, Enabled | Accept email format |
| Website Input | `input[placeholder*='www']` | Exists, Visible, Enabled | Accept URL |
| Address Input | `input[aria-label='Address']` | Exists, Visible, Enabled, Autocomplete | Google Places integration |
| Distance Input | `input[name='distance']` | Exists, Visible, Enabled | Accept mileage number |

**Test Sequence:**
1. Fill company name: "Test Generator Services LLC"
2. Wait for Zoho autocomplete (may show "Searching Zoho CRM...")
3. Verify autocomplete completes (no infinite spinner)
4. Fill phone: "(555) 123-4567"
5. Fill email: "test@generator.com"
6. Fill website: "www.generator.com"
7. Fill address: Start typing "1 Market St, San Francisco"
8. Wait for Google Places autocomplete dropdown (CRITICAL - must wait!)
9. Verify dropdown appears within 2 seconds
10. Select first suggestion
11. Verify address auto-completes city, state, zip

**Enrichment Verification:**
- Logo container updates (if available)
- Industry field auto-populated
- Business hours displayed (if available)
- Map preview appears (if available)
- Enrichment status shows "✓ Enriched"

**Logo Enrichment Test (CRITICAL):**
1. After filling company name, wait 2-3 seconds for enrichment
2. Check logo container element (`.logo-container`, `#companyLogo`, or similar)
3. Verify logo image loaded (check `src` attribute)
4. Verify logo displayed (not placeholder/broken image)
5. Take screenshot of logo display
6. If no logo enriched, verify placeholder/default logo shown
7. Check console for logo enrichment API calls (`/api/enrich-logo`, `/api/clearbit`, etc.)

**Logo Modal Selection Test (CRITICAL - USER MUST SELECT BEST LOGO):**
1. After enrichment, verify "Choose Logo" or "Select Logo" button appears
2. Click logo selection button
3. Verify modal opens showing multiple logo options (typically 3-5 options)
4. Verify each logo option displays:
   - Logo image preview
   - Source attribution (Clearbit, Google, Brandfetch, etc.)
   - Resolution/quality indicator
   - "Select" button for each option
5. Click "Select" on preferred logo (test each option)
6. Verify modal closes after selection
7. Verify selected logo appears in main logo container
8. Verify selected logo persists in state.customer.logo
9. Test logo modal can be reopened to change selection
10. Test "No Logo" or "Skip" option (if available)

**Mileage Calculation Test (CRITICAL):**
1. After filling address with Google Places autocomplete
2. Verify distance field auto-calculates from shop address
3. Test manual override of distance field
4. Verify mileage rate applies to quote calculation ($2.50/mile default)
5. Check console for distance calculation API call
6. Verify travel cost appears in quote breakdown
7. Test zero distance (customer at shop location) = $0 travel
8. Test long distance (>100 miles) calculates correctly

**Logo Verification Evidence:**
```javascript
{
  logoElement: document.querySelector('.logo-container img'),
  logoSrc: document.querySelector('.logo-container img')?.src,
  logoLoaded: document.querySelector('.logo-container img')?.complete,
  logoVisible: document.querySelector('.logo-container img')?.offsetParent !== null,
  logoModalButton: document.querySelector('button:has-text("Choose Logo")'),
  distanceInput: document.querySelector('input[name="distance"]'),
  distanceValue: document.querySelector('input[name="distance"]')?.value,
  travelCostInState: window.state?.customer?.travelCost || 0
}
```

**Evidence Required:**
- Screenshot before filling
- Screenshot after each field
- Screenshot of autocomplete dropdown
- Screenshot of enriched data INCLUDING logo
- Screenshot of logo container (close-up)
- Screenshot of logo selection modal (with all options visible)
- Screenshot of selected logo in main container after modal close
- Screenshot of distance field with auto-calculated value
- Console log showing enrichment API calls (customer + logo)
- Console log showing distance calculation API call
- Network log showing /api/enrich-customer response
- Network log showing logo fetch (if external CDN)
- Network log showing /api/calculate-distance response (if applicable)

**Known Issues:**
- E2E-003: Phone/website fields may retain data on Clear All
- Autocomplete timing critical (must wait for dropdown)
- Logo modal may not appear if enrichment returns only one logo source
- Distance calculation may require Google Maps Distance Matrix API key

**Important Testing Note:**
- Use REAL company names for testing (e.g., "Starbucks", "Apple", "Safeway") to verify logo enrichment and logo passthrough to Zoho work correctly with actual data

**Fail If:**
- Any field not accepting input
- Autocomplete doesn't appear
- Enrichment API returns error
- Logo modal doesn't open when button clicked
- Logo modal doesn't display multiple logo options
- Selected logo doesn't persist in state.customer.logo after modal close
- Selected logo doesn't appear in main logo container
- Distance field doesn't auto-calculate from address
- Distance field doesn't accept manual override
- Travel cost not calculated from mileage ($2.50/mile)
- Console errors during entry
- Data doesn't save to state.customer

---
