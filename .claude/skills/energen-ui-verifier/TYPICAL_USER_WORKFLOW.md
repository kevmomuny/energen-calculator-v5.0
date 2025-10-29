# Typical User Workflow - Energen Calculator v5.0
**Complete UI/UX Interaction Map**

This document describes a complete user workflow from launch to Zoho transfer, touching every UI element at least once.

---

## 🎯 Workflow Overview

**Scenario:** Create a quarterly maintenance quote for a public works facility requiring prevailing wage rates.

**User:** Sarah, Service Manager at Energen Systems Inc.
**Customer:** Lawrence Berkeley National Laboratory (LBNL)
**Generator:** 300kW Diesel (Cummins QSL9-G5)
**Services:** Comprehensive package with prevailing wage compliance
**Duration:** ~8-12 minutes for experienced user

---

## Phase 0: Application Launch & Pre-Flight

### Step 0.1: Start Server
```bash
# User navigates to project directory
cd C:\ECalc\active\energen-calculator-v5.0

# Start server
node src/api/server-secure.cjs

# Expected: "Server running on https://localhost:3002"
```

### Step 0.2: Open Browser
- Open Chrome/Edge
- Navigate to: `https://localhost:3002`
- Accept self-signed certificate warning (if prompted)
- Wait for page load (< 3 seconds)

### Step 0.3: Verify Page Load
- ✅ Energen Systems logo appears (top-left)
- ✅ "Generator Maintenance Quote Calculator" title visible
- ✅ Four metric cards at top: TOTAL QUOTE, LABOR HOURS, MATERIALS, UNITS (all showing $0)
- ✅ No console errors (F12 > Console)

---

## Phase 1: Customer Information Entry

### Step 1.1: Focus on Customer Section
- Scroll to "Customer Information" section (if not visible)
- Note section header with company icon

### Step 1.2: Enter Company Name with Zoho Search
- Click on "Company Name" input field
- Type: "Lawrence Berkeley"
- Wait 500ms for Zoho search debounce
- Observe loading indicator (spinner) appears below input
- Wait for Zoho search results dropdown (max 3 seconds)
- **Expected:** Dropdown shows matching accounts from Zoho CRM

### Step 1.3: Select Existing Zoho Account
- Dropdown shows:
  ```
  Lawrence Berkeley National Laboratory
  1 Cyclotron Rd, Berkeley, CA 94720
  [Select Account Button]
  ```
- Click "Select Account" button
- Observe loading indicator

### Step 1.4: Verify Auto-Population
- Wait for account data to populate (< 2 seconds)
- Verify fields auto-filled:
  - ✅ **Company Name:** "Lawrence Berkeley National Laboratory"
  - ✅ **Address:** "1 Cyclotron Rd"
  - ✅ **City:** "Berkeley"
  - ✅ **State:** "CA"
  - ✅ **ZIP:** "94720"
  - ✅ **Phone:** "(510) 486-4000" (if available)
  - ✅ **Website:** "https://www.lbl.gov" (if available)

### Step 1.5: Verify Logo Display
- Check if customer logo appears (top-right corner)
- If available from Zoho, logo displays automatically
- If not available, placeholder or no logo shown

### Step 1.6: Verify Customer Enrichment Badge
- Look for enrichment status indicator
- May show: "✓ Verified from Zoho CRM"
- Console log shows: `✅ Customer data auto-populated: Lawrence Berkeley National Laboratory`

---

## Phase 1.5: Configure Settings (Including Prevailing Wage)

### Step 1.5.1: Open Settings Modal
- Locate "Settings" button/gear icon (top-right, near logo)
- Click Settings button
- Settings modal opens (< 500ms)
- Modal displays with semi-transparent overlay

### Step 1.5.2: Review Default Settings
- Scroll through settings modal
- Observe default values:
  - **Labor Rate:** $180.00/hour
  - **Mobilization Rate:** $180.00/hour
  - **Mileage Rate:** $0.67/mile
  - **Tax Rate:** 8.75%
  - **Company Information:** Pre-filled with Energen Systems Inc. details

### Step 1.5.3: Enable Prevailing Wage (CRITICAL)
- Scroll to "Prevailing Wage" section
- Locate checkbox: **"Prevailing Wage Required"**
- **Verify:** Checkbox is UNCHECKED by default
- Click checkbox to enable
- Observe: `#prevailingWageDetails` section expands (slides down animation)

### Step 1.5.4: Fetch Prevailing Wage Rate
- Prevailing wage details section now visible:
  ```
  ┌─────────────────────────────────────────────┐
  │ Prevailing Wage Details                     │
  ├─────────────────────────────────────────────┤
  │ ZIP Code: 94720 (auto-filled from customer) │
  │ [Refresh Prevailing Wage] button            │
  │                                             │
  │ API-Fetched Rate: [loading...]              │
  │ Business Overhead: $115.00                  │
  │ Total Labor Rate: [calculating...]          │
  └─────────────────────────────────────────────┘
  ```

- Click **"Refresh Prevailing Wage"** button
- Observe loading spinner
- Wait for API call to `/api/prevailing-wage/94720`
- Response time: < 2 seconds

### Step 1.5.5: Verify Prevailing Wage Rate Display
- After API response:
  ```
  ┌─────────────────────────────────────────────┐
  │ ✅ Prevailing Wage Details                  │
  ├─────────────────────────────────────────────┤
  │ ZIP Code: 94720                             │
  │ County: Alameda                             │
  │ Zone: 1 (Bay Area - Higher Rates)          │
  │                                             │
  │ API-Fetched Rate: $121.50/hr               │
  │   (Electrician Journeyman, DIR 2025)        │
  │                                             │
  │ Business Overhead: $115.00/hr              │
  │                                             │
  │ Total Labor Rate: $236.50/hr               │
  │   (Base + Overhead)                         │
  │                                             │
  │ □ Manual Override                           │
  └─────────────────────────────────────────────┘
  ```

- Verify all fields populated correctly
- Console shows: `✅ Prevailing wage fetched for ZIP 94720: $121.50`

### Step 1.5.6: Test Manual Override (Optional)
- Check **"Manual Override"** checkbox
- New input field appears: **"Custom Labor Rate"**
- Enter custom value: $250.00
- Observe visual feedback (field background changes color, maybe yellow highlight)
- Total Labor Rate updates to: $250.00
- **Note:** For this workflow, we'll UNCHECK manual override to use API rate

### Step 1.5.7: Save Settings
- Scroll to bottom of settings modal
- Click **"Save Settings"** button
- Observe:
  - Modal closes with fade animation
  - Success notification: "Settings saved successfully!"
  - Console log: `💾 Settings saved to default-settings.json`

### Step 1.5.8: Verify Settings Persistence
- Verify `window.state.settings.prevailingWage` object:
  ```javascript
  {
    enabled: true,
    businessOverhead: 115.00,
    defaultClassification: "electricianJourneyman",
    lastApiRate: 121.50,
    lastUpdated: "2025-10-27T14:30:00Z",
    lastZip: "94720"
  }
  ```

---

## Phase 2: Contact Information Entry

### Step 2.1: Navigate to Contact Section
- Scroll to "Contact Information" section
- Observe section header: "Primary Contact"

### Step 2.2: Check for Existing Contacts
- Click **"Select Existing Contact"** button
- Contact picker modal opens
- Shows contacts linked to LBNL account from Zoho
- **If contacts exist:** Dropdown/list displays names
- **If no contacts:** "No contacts found" message

### Step 2.3: Add New Contact
- Click **"Add New Contact"** button (blue, prominent)
- Contact form expands or modal opens:
  ```
  ┌─────────────────────────────────────────┐
  │ Add New Contact                         │
  ├─────────────────────────────────────────┤
  │ Full Name: [__________________]         │
  │ Title:     [__________________]         │
  │ Email:     [__________________]         │
  │ Phone:     [__________________]         │
  │ Company:   Lawrence Berkeley... (auto)  │
  │                                         │
  │ [Cancel] [Add Contact]                  │
  └─────────────────────────────────────────┘
  ```

### Step 2.4: Enter Contact Details
- **Full Name:** "Dr. James Chen"
- **Title:** "Facilities Director"
- **Email:** "jchen@lbl.gov"
- **Phone:** "(510) 486-5555"
- **Company:** Pre-filled with "Lawrence Berkeley National Laboratory"

### Step 2.5: Submit Contact
- Click **"Add Contact"** button
- Observe loading indicator
- Wait for:
  1. Photo enrichment attempt (Clearbit API)
  2. Local storage save (contactManager)
  3. Zoho CRM sync (`/api/zoho/create-contact`)

### Step 2.6: Verify Contact Creation
- Success notification: "Contact added and synced to Zoho!"
- Contact form closes
- Contact details appear in "Primary Contact" section:
  ```
  Dr. James Chen
  Facilities Director
  jchen@lbl.gov | (510) 486-5555
  [Photo if enriched]
  ```

- Console logs:
  ```
  ✅ Contact enriched with photo
  💾 Contact saved to local storage
  ✅ Contact synced to Zoho CRM: [Contact ID]
  ```

---

## Phase 3: Generator Information Entry

### Step 3.1: Navigate to Generator Section
- Scroll to "Generator Information" section
- Section header: "Generator Specifications"

### Step 3.2: Enter Generator Model
- Click **"Generator Model"** input
- Type: "Cummins QSL9-G5"
- Field accepts text input

### Step 3.3: Enter Generator kW Rating
- Click **"Generator kW"** input
- Type: "300"
- Observe:
  - Input validates (accepts numbers only)
  - Services section below becomes enabled (opacity changes from 0.5 to 1.0)
  - Console: `Generator kW updated: 300`

### Step 3.4: Select Fuel Type
- Click **"Fuel Type"** dropdown
- Options appear:
  - Diesel
  - Natural Gas
  - Propane
  - Bi-Fuel
- Select: **"Diesel"**

### Step 3.5: Enter Serial Number
- Click **"Serial Number"** input
- Type: "QSL9G5-12345678"

### Step 3.6: Enter Additional Generator Details (Optional)
- **Manufacturer:** "Cummins Inc."
- **Year:** "2018"
- **Location:** "Building 50, Room 1023"
- **Hours Run:** "8,450"

### Step 3.7: Verify Generator Data in State
- Console: `🔧 Generator specifications captured`
- Verify `window.state.units[0]`:
  ```javascript
  {
    model: "Cummins QSL9-G5",
    kw: 300,
    fuelType: "diesel",
    serialNumber: "QSL9G5-12345678",
    manufacturer: "Cummins Inc.",
    year: 2018,
    location: "Building 50, Room 1023",
    hoursRun: 8450
  }
  ```

---

## Phase 4: Service Selection (A-K + Custom)

### Step 4.1: Navigate to Services Section
- Scroll to "Service Selection" section
- Observe: All service cards now enabled (no longer dimmed)
- Header: "Select Maintenance Services"

### Step 4.2: Service A - Comprehensive Inspection
- Locate **Service A** card:
  ```
  ┌─────────────────────────────────────────┐
  │ SERVICE A                               │
  │ Comprehensive Inspection                │
  │                                         │
  │ Complete system inspection including... │
  │                                         │
  │ [Q] [SA] [A]   (frequency buttons)     │
  │                                         │
  │ Price: [calculating...]                 │
  └─────────────────────────────────────────┘
  ```

- Click **"Q"** (Quarterly) button
- Observe:
  - Button becomes active (highlighted, blue background)
  - Frequency badge appears: "4x/year"
  - Price calculates and displays: "$2,276.80/visit" (with prevailing wage)
  - Annual total: "$9,107.20/year"
  - Service card gains "active" class (blue border)

### Step 4.3: Service B - Oil & Filter Service
- Scroll to **Service B** card
- Click **"Q"** (Quarterly) button
- Verify:
  - Button active
  - Price displays: "$2,255.90/visit"
  - Annual total: "$9,023.60/year"
  - Summary updates at top of page

### Step 4.4: Service C - Coolant Service
- Scroll to **Service C** card
- Click **"A"** (Annual) button (instead of quarterly)
- Verify:
  - Button active
  - Frequency: "1x/year"
  - Price: "$2,637.00/visit"
  - Annual total: "$2,637.00/year"

### Step 4.5: Service D - Oil, Fuel & Coolant Analysis (SPECIAL CASE)
- Scroll to **Service D** card
- **Note:** Service D has checkboxes for fluid analysis

- Click **"A"** (Annual) button first
- Service D details section expands:
  ```
  ┌─────────────────────────────────────────┐
  │ SERVICE D                               │
  │ Oil, Fuel & Coolant Analysis            │
  │                                         │
  │ ☐ Oil Analysis ($16.55/sample)         │
  │ ☐ Coolant Analysis ($16.55/sample)     │
  │ ☐ Fuel Analysis ($60.00/sample)        │
  │                                         │
  │ Frequency: [Q] [SA] [A]                │
  │                                         │
  │ Subtotal: $0.00/year                   │
  └─────────────────────────────────────────┘
  ```

- Check **☑ Oil Analysis** checkbox
  - Subtotal updates: "$16.55/year"

- Check **☑ Coolant Analysis** checkbox
  - Subtotal updates: "$33.10/year"

- **DO NOT** check Fuel Analysis (leave unchecked)

- Verify:
  - Service D price shows: "$33.10/year" (NOT $0.00)
  - Price persists through recalculations
  - Console: `Service D fluids updated: Oil + Coolant = $33.10`

### Step 4.6: Service E - Load Bank Testing
- Scroll to **Service E** card
- Click **"A"** (Annual) button
- Verify price: "$4,653.50/visit" (300kW rate with prevailing wage)

### Step 4.7: Service F - Diesel Engine Tune-Up
- Scroll to **Service F** card
- Note: Dropdown for injector type (Pop/Nozzle vs Unit Injectors)
- Select: **"Unit Injectors"**
- Click **"Triennial"** button (every 3 years)
- Verify:
  - Frequency: "0.33x/year"
  - Price: "$792.75/visit"
  - Annual equivalent: "$264.25/year"

### Step 4.8: Service G - Gas Engine Tune-Up (SKIP)
- Scroll to **Service G** card
- **Do NOT select** (generator is diesel, not gas)
- Card remains inactive (gray/unselected)

### Step 4.9: Service H - Electrical Testing
- Scroll to **Service H** card
- Click **"5-Year"** button (only option for Service H)
- Verify:
  - Frequency: "0.2x/year" (every 5 years)
  - Price: "$1,382.50/visit"
  - Annual equivalent: "$276.50/year"

### Step 4.10: Service I - Transfer Switch Service
- Scroll to **Service I** card
- Click **"A"** (Annual) button
- Verify price: "$1,359.00/visit"

### Step 4.11: Service J - Thermal Imaging
- Scroll to **Service J** card
- Click **"A"** (Annual) button
- Verify price: "$788.50/visit"

### Step 4.12: Service K - DEF System Service (SKIP)
- Scroll to **Service K** card
- **Do NOT select** (only for diesel engines with DEF systems, LBNL unit doesn't have DEF)
- Card remains inactive

### Step 4.13: Add Custom Service
- Scroll to bottom of services section
- Click **"Add Custom Service"** button (blue, with "+" icon)
- Custom service card appears:
  ```
  ┌─────────────────────────────────────────┐
  │ CUSTOM SERVICE                          │
  │                                         │
  │ Description:                            │
  │ [________________________________]      │
  │                                         │
  │ Estimated Hours: [____]                 │
  │                                         │
  │ Frequency: [Q] [SA] [A]                │
  │                                         │
  │ Per-Visit Price: $0.00                  │
  │ Annual Total: $0.00                     │
  │                                         │
  │ [Remove Service ×]                      │
  └─────────────────────────────────────────┘
  ```

- **Description:** "Emergency Response Retainer"
- **Estimated Hours:** "24"
- Click **"A"** (Annual) frequency button
- Verify calculations:
  - Per-Visit Price: $5,676.00 (24 hours × $236.50 prevailing wage rate)
  - Annual Total: $5,676.00

### Step 4.14: Verify Service Selection Summary
- Scroll to top of page
- Check metric cards:
  - **TOTAL QUOTE:** $0.00 (not calculated yet, needs "Calculate Quote" button)
  - **LABOR HOURS:** Shows total hours from all selected services
  - **MATERIALS:** Shows total materials costs
  - **UNITS:** 1

- Check right sidebar or summary section (if visible):
  ```
  Selected Services (9):
  ✓ Service A - Quarterly ($9,107.20/yr)
  ✓ Service B - Quarterly ($9,023.60/yr)
  ✓ Service C - Annual ($2,637.00/yr)
  ✓ Service D - Annual ($33.10/yr)
  ✓ Service E - Annual ($4,653.50/yr)
  ✓ Service F - Triennial ($264.25/yr)
  ✓ Service H - 5-Year ($276.50/yr)
  ✓ Service I - Annual ($1,359.00/yr)
  ✓ Service J - Annual ($788.50/yr)
  ✓ Custom - Annual ($5,676.00/yr)
  ```

---

## Phase 5: Quote Calculation

### Step 5.1: Locate Calculate Button
- Scroll to **"Calculate Quote"** button
- Button location: Bottom of services section OR floating action button
- Button appearance: Large, blue, prominent
- Verify button is ENABLED (not dimmed)

### Step 5.2: Trigger Calculation
- Click **"Calculate Quote"** button
- Observe immediate feedback:
  - Loading spinner appears on button ("Calculating...")
  - Button becomes disabled (prevent double-click)
  - Services section dims slightly
  - Optional: Progress indicator or loading overlay

### Step 5.3: Monitor API Call
- Open DevTools (F12) > Network tab
- Watch for POST request to `/api/calculate`
- Request payload includes:
  ```javascript
  {
    generatorKw: 300,
    fuelType: "diesel",
    selectedServices: [
      { code: "A", frequency: 4 },
      { code: "B", frequency: 4 },
      { code: "C", frequency: 1 },
      { code: "D", frequency: 1, fluids: ["oil", "coolant"] },
      { code: "E", frequency: 1 },
      { code: "F", frequency: 0.33 },
      { code: "H", frequency: 0.2 },
      { code: "I", frequency: 1 },
      { code: "J", frequency: 1 },
      { code: "CUSTOM", frequency: 1, hours: 24, description: "..." }
    ],
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

### Step 5.4: Wait for Response
- Typical response time: 2-5 seconds
- Max timeout: 10 seconds
- Watch console for progress logs:
  ```
  🔄 Calculating quote...
  📊 Processing 10 services...
  ✅ Quote calculated successfully
  ```

### Step 5.5: Verify API Response
- Response structure:
  ```javascript
  {
    success: true,
    serviceBreakdown: {
      A: {
        laborCost: 1892.00,
        partsCost: 802.20,
        mobilizationCost: 473.00,
        totalCost: 2276.80,
        frequency: 4,
        annualTotal: 9107.20
      },
      B: { ... },
      // ... all services
    },
    quarterlyTotals: {
      Q1: 12850.35,
      Q2: 12850.35,
      Q3: 12850.35,
      Q4: 12850.35
    },
    annualTotal: 33818.65,
    totalLaborHours: 96.66,
    totalMaterials: 8945.30
  }
  ```

---

## Phase 6: Results Validation & Display

### Step 6.1: Results Section Appears
- Scroll automatically to results (or scroll manually)
- Results section expands with animation
- Header: "Quote Summary"

### Step 6.2: Verify Top Metric Cards Updated
- Check metric cards at top of page:
  ```
  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │ TOTAL QUOTE      │ │ LABOR HOURS      │ │ MATERIALS        │ │ UNITS            │
  │ $33,818.65       │ │ 96.66 hrs        │ │ $8,945.30        │ │ 1                │
  │                  │ │                  │ │                  │ │                  │
  │ Prev Wage Rate:  │ │                  │ │                  │ │                  │
  │ $236.50/hr       │ │                  │ │                  │ │                  │
  └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
  ```

- Verify prevailing wage indicator shows: "$236.50/hr (Prevailing Wage + Overhead)"

### Step 6.3: Verify Quarterly Breakdown
- Results section shows quarterly breakdown table:
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ QUARTERLY BREAKDOWN                                         │
  ├──────────────┬──────────────┬──────────────┬──────────────┤
  │ Q1 (Oct-Dec) │ Q2 (Jan-Mar) │ Q3 (Apr-Jun) │ Q4 (Jul-Sep) │
  ├──────────────┼──────────────┼──────────────┼──────────────┤
  │ $12,850.35   │ $12,850.35   │ $12,850.35   │ $12,850.35   │
  └──────────────┴──────────────┴──────────────┴──────────────┘
  ```

- All quarters equal (quarterly services evenly distributed)

### Step 6.4: Verify Service Breakdown
- Scroll through detailed service breakdown:
  ```
  SERVICE A - COMPREHENSIVE INSPECTION
  ┌────────────────────────────────────────────┐
  │ Frequency: Quarterly (4x/year)             │
  │ Per-Visit: $2,276.80                       │
  │   Labor: $1,892.00 (8 hrs @ $236.50)      │
  │   Parts: $802.20                           │
  │   Mobilization: $473.00 (2 hrs @ $236.50)  │
  │ Annual Total: $9,107.20                    │
  └────────────────────────────────────────────┘

  SERVICE B - OIL & FILTER SERVICE
  ┌────────────────────────────────────────────┐
  │ Frequency: Quarterly (4x/year)             │
  │ Per-Visit: $2,255.90                       │
  │   Labor: $1,419.00 (6 hrs @ $236.50)      │
  │   Parts: $363.90 (filters + oil)          │
  │   Mobilization: $473.00                    │
  │ Annual Total: $9,023.60                    │
  └────────────────────────────────────────────┘

  // ... continue for all services
  ```

### Step 6.5: Verify Service D Special Display
- Check Service D breakdown shows fluid analysis:
  ```
  SERVICE D - FLUID ANALYSIS
  ┌────────────────────────────────────────────┐
  │ Frequency: Annual (1x/year)                │
  │                                            │
  │ ☑ Oil Analysis: $16.55                    │
  │ ☑ Coolant Analysis: $16.55                │
  │                                            │
  │ Annual Total: $33.10                       │
  └────────────────────────────────────────────┘
  ```

- Verify NOT $0.00

### Step 6.6: Verify Custom Service Display
- Check custom service appears:
  ```
  CUSTOM SERVICE - EMERGENCY RESPONSE RETAINER
  ┌────────────────────────────────────────────┐
  │ Frequency: Annual (1x/year)                │
  │ Estimated Hours: 24                        │
  │ Labor Rate: $236.50/hr (Prevailing Wage)   │
  │ Annual Total: $5,676.00                    │
  └────────────────────────────────────────────┘
  ```

### Step 6.7: Manual Total Verification
- Use calculator or spreadsheet to verify:
  ```
  Service A:  $9,107.20
  Service B:  $9,023.60
  Service C:  $2,637.00
  Service D:  $33.10
  Service E:  $4,653.50
  Service F:  $264.25
  Service H:  $276.50
  Service I:  $1,359.00
  Service J:  $788.50
  Custom:     $5,676.00
  ─────────────────────
  TOTAL:      $33,818.65 ✓
  ```

### Step 6.8: Compare to Non-Prevailing Wage (Optional Test)
- Open calculator or note:
  - **With prevailing wage ($236.50/hr):** $33,818.65
  - **Without prevailing wage ($180.00/hr):** ~$25,781.00
  - **Difference:** $8,037.65 (31% increase)
  - **Premium validates:** Prevailing wage significantly impacts pricing

---

## Phase 7: PDF Generation

### Step 7.1: Locate PDF Generation Button
- Scroll to bottom of results section
- Locate **"Generate PDF"** button (red PDF icon, prominent)
- Button enabled after calculation complete

### Step 7.2: Generate PDF
- Click **"Generate PDF"** button
- Observe:
  - Loading spinner on button: "Generating PDF..."
  - Button disabled temporarily
  - Optional: Progress indicator (0-100%)

### Step 7.3: Monitor PDF Generation
- Console logs:
  ```
  📄 Generating PDF...
  📊 Rendering customer info...
  🔧 Rendering generator details...
  💰 Rendering service breakdown...
  ✅ PDF generated: quote-LBNL-20251027.pdf
  ```

### Step 7.4: PDF Download
- Browser downloads PDF automatically
- File name: `quote-LBNL-20251027-143045.pdf`
- File size: ~500-800 KB
- Download notification appears (browser-dependent)

### Step 7.5: Open & Verify PDF
- Open downloaded PDF in PDF viewer
- **Page 1: Cover Page**
  - ✅ Energen Systems logo (top-left)
  - ✅ "Generator Maintenance Quote" title
  - ✅ Quote date: October 27, 2025
  - ✅ Quote number: Auto-generated (e.g., Q-2025-1027-001)
  - ✅ Valid until: November 26, 2025 (30 days)

- **Page 1: Customer Info**
  - ✅ Lawrence Berkeley National Laboratory
  - ✅ 1 Cyclotron Rd, Berkeley, CA 94720
  - ✅ Contact: Dr. James Chen, Facilities Director
  - ✅ jchen@lbl.gov | (510) 486-5555

- **Page 1: Generator Info**
  - ✅ Model: Cummins QSL9-G5
  - ✅ Rating: 300 kW
  - ✅ Fuel Type: Diesel
  - ✅ Serial: QSL9G5-12345678
  - ✅ Location: Building 50, Room 1023

- **Page 2: Service Breakdown**
  - ✅ All 10 services listed (A, B, C, D, E, F, H, I, J, Custom)
  - ✅ Each service shows frequency, per-visit, annual total
  - ✅ Service D shows fluid analysis checkboxes (☑ Oil, ☑ Coolant)
  - ✅ Custom service shows description and hours

- **Page 2-3: Quarterly Breakdown**
  - ✅ Table with Q1, Q2, Q3, Q4 totals
  - ✅ Each quarter: $12,850.35

- **Page 3: Totals**
  - ✅ **Subtotal:** $33,818.65
  - ✅ **Tax (8.75%):** $2,959.13
  - ✅ **GRAND TOTAL:** $36,777.78

- **Page 3: Prevailing Wage Disclosure** ⚠️ CRITICAL
  - ✅ Box or highlighted section:
    ```
    PREVAILING WAGE COMPLIANCE

    This quote uses California prevailing wage rates per DIR
    (Department of Industrial Relations) requirements for public
    works projects.

    Labor Rate: $236.50/hour
      - Base Prevailing Wage: $121.50/hr (Electrician Journeyman)
      - Business Overhead: $115.00/hr
      - County: Alameda (Zone 1)
      - Source: DIR 2025 Wage Determination
      - Fetched: October 27, 2025

    This rate complies with Davis-Bacon Act requirements.
    ```

- **Page 4: Terms & Conditions**
  - ✅ Payment terms
  - ✅ Service agreement details
  - ✅ Warranty information
  - ✅ Signature blocks

### Step 7.6: Verify PDF Stored in State
- Check console or state:
  ```javascript
  window.state.pdf = {
    filename: "quote-LBNL-20251027-143045.pdf",
    blob: Blob { size: 524288, type: "application/pdf" },
    generated: "2025-10-27T14:30:45Z"
  }
  ```

---

## Phase 8: Zoho CRM Integration - Complete Data Transfer

### Step 8.1: Locate Zoho Transfer Button
- Scroll to bottom of results/PDF section
- Locate **"Send to Zoho CRM"** button (green button with Zoho logo)
- Button enabled after PDF generation

### Step 8.2: Initiate Zoho Transfer
- Click **"Send to Zoho CRM"** button
- Observe:
  - Loading overlay appears
  - Multi-step progress indicator:
    ```
    ┌─────────────────────────────────────────┐
    │ Transferring to Zoho CRM...             │
    ├─────────────────────────────────────────┤
    │ ✓ Account created/verified              │
    │ ⏳ Creating contact...                  │
    │ ⏺ Creating generator asset...          │
    │ ⏺ Creating quote...                     │
    │ ⏺ Uploading PDF...                      │
    └─────────────────────────────────────────┘
    ```

### Step 8.3: Monitor Account Creation/Verification
- **Step 1:** Account (already exists from Step 1.3)
- API call: `GET /api/customers/[zoho_account_id]`
- Response: Account details verified
- Progress: ✓ Account verified
- Console: `✅ Zoho Account verified: Lawrence Berkeley National Laboratory (ID: 123456789)`

### Step 8.4: Monitor Contact Creation
- **Step 2:** Contact creation
- API call: `POST /api/zoho/create-contact`
- Payload:
  ```javascript
  {
    accountId: "123456789",
    firstName: "James",
    lastName: "Chen",
    email: "jchen@lbl.gov",
    phone: "(510) 486-5555",
    title: "Facilities Director"
  }
  ```
- Response: `{ success: true, contactId: "987654321" }`
- Progress: ✓ Contact created
- Console: `✅ Contact created in Zoho: Dr. James Chen (ID: 987654321)`

### Step 8.5: Monitor Generator Asset Creation
- **Step 3:** Generator asset creation
- API call: `POST /api/zoho/create-generator-asset`
- Payload includes all generator fields:
  ```javascript
  {
    customerAccountId: "123456789",
    generatorModel: "Cummins QSL9-G5",
    generatorKwRating: 300,
    fuelType: "Diesel",
    serialNumber: "QSL9G5-12345678",
    manufacturer: "Cummins Inc.",
    year: 2018,
    siteLocation: "Building 50, Room 1023",
    hoursRun: 8450,
    // ... 124+ additional optional fields
  }
  ```
- Response: `{ success: true, assetId: "555666777" }`
- Progress: ✓ Generator asset created
- Console: `✅ Generator asset created (ID: 555666777)`

### Step 8.6: Monitor Quote Creation (CRITICAL)
- **Step 4:** Quote creation with line items
- API call: `POST /api/zoho/create-quote`
- Payload structure:
  ```javascript
  {
    accountId: "123456789",
    subject: "Generator Maintenance Quote - Lawrence Berkeley National Laboratory",
    quoteDate: "2025-10-27",
    validTill: "2025-11-26",

    // PREVAILING WAGE FIELDS ⚠️
    prevailingWageRequired: true,
    prevailingWageRate: 236.50,
    prevailingWageSource: "DIR API",
    businessOverhead: 115.00,
    county: "Alameda",
    zone: 1,

    grandTotal: 33818.65,
    quarterlyTotal: 12850.35,

    // LINE ITEMS
    lineItems: [
      {
        product: { id: "100001" },  // Product ID lookup for Service A
        quantity: 4,
        listPrice: 2276.80,
        total: 9107.20,
        description: "Service A - Comprehensive Inspection (Quarterly)"
      },
      {
        product: { id: "100002" },
        quantity: 4,
        listPrice: 2255.90,
        total: 9023.60,
        description: "Service B - Oil & Filter Service (Quarterly)"
      },
      // ... all 10 services
    ],

    description: "This quote uses California prevailing wage rates per DIR requirements."
  }
  ```

- Response: `{ success: true, quoteId: "444555666" }`
- Progress: ✓ Quote created
- Console: `✅ Quote created in Zoho (ID: 444555666) with 10 line items`

### Step 8.7: Monitor PDF Upload to Zoho
- **Step 5:** PDF attachment
- API call: `POST /api/zoho/upload-attachment`
- Payload: Binary PDF blob + quote ID
- Response: `{ success: true, attachmentId: "888999000" }`
- Progress: ✓ PDF uploaded
- Console: `✅ PDF attached to quote (ID: 888999000)`

### Step 8.8: Verify Complete Transfer Success
- Final progress indicator:
  ```
  ┌─────────────────────────────────────────┐
  │ ✅ Zoho Transfer Complete!              │
  ├─────────────────────────────────────────┤
  │ ✓ Account: Lawrence Berkeley...        │
  │ ✓ Contact: Dr. James Chen              │
  │ ✓ Generator: Cummins QSL9-G5 (300kW)   │
  │ ✓ Quote: Q-2025-1027-001               │
  │ ✓ PDF: Attached                        │
  │                                         │
  │ [View in Zoho CRM] [Close]             │
  └─────────────────────────────────────────┘
  ```

- Success notification appears (green banner, 5 seconds)
- Button changes to: **"View in Zoho CRM"** (opens Zoho quote page)

### Step 8.9: Verify in Zoho CRM (External Verification)
- Click **"View in Zoho CRM"** button
- New browser tab opens to Zoho CRM
- Navigate to Quotes module
- Search for quote: "Lawrence Berkeley"
- Open quote record

- **Verify Quote Header:**
  - ✅ Subject: "Generator Maintenance Quote - Lawrence Berkeley National Laboratory"
  - ✅ Account: Lawrence Berkeley National Laboratory (linked)
  - ✅ Grand Total: $33,818.65
  - ✅ Quarterly Total: $12,850.35
  - ✅ Status: Draft

- **Verify Prevailing Wage Fields:**
  - ✅ Prevailing Wage Required: ☑ (checked)
  - ✅ Prevailing Wage Rate: $236.50
  - ✅ Prevailing Wage Source: "DIR API"
  - ✅ Business Overhead: $115.00
  - ✅ County: Alameda
  - ✅ Zone: 1 (Bay Area)

- **Verify Line Items (10 total):**
  - ✅ Service A: Qty 4, Unit Price $2,276.80, Total $9,107.20
  - ✅ Service B: Qty 4, Unit Price $2,255.90, Total $9,023.60
  - ✅ Service C: Qty 1, Unit Price $2,637.00, Total $2,637.00
  - ✅ Service D: Qty 1, Unit Price $33.10, Total $33.10
  - ✅ Service E: Qty 1, Unit Price $4,653.50, Total $4,653.50
  - ✅ Service F: Qty 0.33, Unit Price $792.75, Total $264.25
  - ✅ Service H: Qty 0.2, Unit Price $1,382.50, Total $276.50
  - ✅ Service I: Qty 1, Unit Price $1,359.00, Total $1,359.00
  - ✅ Service J: Qty 1, Unit Price $788.50, Total $788.50
  - ✅ Custom: Qty 1, Unit Price $5,676.00, Total $5,676.00

- **Verify Attachments:**
  - ✅ PDF attached: "quote-LBNL-20251027-143045.pdf"
  - ✅ Click to download/view - matches generated PDF

- **Verify Links:**
  - ✅ Account link works → Lawrence Berkeley account page
  - ✅ Contact link works → Dr. James Chen contact page
  - ✅ Generator asset linked (if module exists)

---

## Phase 9: Additional Workflow Actions

### Step 9.1: Email Quote
- Return to calculator page
- Locate **"Email Quote"** button (blue email icon)
- Click button
- Email modal opens:
  ```
  ┌─────────────────────────────────────────┐
  │ Email Quote                             │
  ├─────────────────────────────────────────┤
  │ To: jchen@lbl.gov (pre-filled)         │
  │ CC: [_________________________]         │
  │ Subject: Generator Maintenance Quote... │
  │                                         │
  │ Message:                                │
  │ ┌─────────────────────────────────────┐ │
  │ │ Dear Dr. Chen,                      │ │
  │ │                                     │ │
  │ │ Please find attached your generator │ │
  │ │ maintenance quote for the 300kW...  │ │
  │ │ (editable template)                 │ │
  │ └─────────────────────────────────────┘ │
  │                                         │
  │ Attachment: quote-LBNL-20251027.pdf    │
  │                                         │
  │ [Cancel] [Send Email]                   │
  └─────────────────────────────────────────┘
  ```

- Edit message if needed
- Click **"Send Email"** button
- Success notification: "Email sent to jchen@lbl.gov"
- Modal closes

### Step 9.2: Duplicate Quote
- Locate **"Duplicate Quote"** button (copy icon)
- Click button
- Confirmation dialog:
  ```
  Create a duplicate of this quote?

  This will create a new quote with the same
  customer, generator, and service selections.

  [Cancel] [Duplicate]
  ```

- Click **"Duplicate"** button
- Page reloads or navigates to new quote
- New quote ID assigned (e.g., Q-2025-1027-002)
- All data copied except:
  - Quote date (uses current date)
  - Quote ID (new unique ID)
  - Zoho links (not yet created)

### Step 9.3: Create Revision
- Locate **"Create Revision"** button (version icon)
- Click button
- Revision modal opens:
  ```
  ┌─────────────────────────────────────────┐
  │ Create Quote Revision                   │
  ├─────────────────────────────────────────┤
  │ Current Version: 1.0                    │
  │ New Version: 1.1                        │
  │                                         │
  │ Revision Notes:                         │
  │ ┌─────────────────────────────────────┐ │
  │ │ [Enter revision notes...]           │ │
  │ └─────────────────────────────────────┘ │
  │                                         │
  │ [Cancel] [Create Revision]              │
  └─────────────────────────────────────────┘
  ```

- Enter notes: "Removed Service F per customer request"
- Click **"Create Revision"** button
- New revision created (version 1.1)
- Quote remains editable
- Original version saved in history

### Step 9.4: View Switching
- Locate view tabs (top of page or sidebar):
  ```
  [Calculator] [History] [Documents] [Reports]
  ```

- Click **"History"** tab
  - Shows all quotes created
  - List view with columns: Date, Customer, Total, Status
  - Search/filter functionality
  - Click row to load quote

- Click **"Documents"** tab
  - Shows all PDFs generated
  - Thumbnail view with preview
  - Download/share buttons
  - Search by customer or date

- Click **"Reports"** tab
  - Sales summary charts
  - Service popularity graph
  - Revenue trends
  - Export to Excel option

- Click **"Calculator"** tab (return to main view)

### Step 9.5: Save Quote (without Zoho transfer)
- Locate **"Save Quote"** button (disk icon)
- Click button
- Save dialog:
  ```
  ┌─────────────────────────────────────────┐
  │ Save Quote                              │
  ├─────────────────────────────────────────┤
  │ Quote Name:                             │
  │ [LBNL - Quarterly Maintenance (PW)]    │
  │                                         │
  │ Save Location:                          │
  │ ● Local Storage (browser)              │
  │ ○ Export to File                       │
  │                                         │
  │ [Cancel] [Save]                         │
  └─────────────────────────────────────────┘
  ```

- Click **"Save"** button
- Quote saved to localStorage
- Success notification: "Quote saved locally"
- Quote ID stored: `localStorage.getItem('quote-2025-1027-001')`

---

## Phase 10: Advanced Features

### Step 10.1: Business Card OCR (Optional)
- Scroll to Contact Information section
- Locate **"Scan Business Card"** button (camera icon)
- Click button
- File upload dialog opens
- Select business card image file
- Wait for OCR processing
- Contact fields auto-populate from OCR results
- Review and correct if needed

### Step 10.2: RFP Upload (Optional)
- Locate **"Upload RFP"** button (document upload icon)
- Click button
- File dialog opens
- Select RFP PDF file
- Upload and process RFP
- Calculator attempts to:
  - Extract customer info
  - Identify required services
  - Parse specifications
  - Pre-populate form fields

### Step 10.3: Settings - Excel Export Configuration
- Open Settings modal
- Navigate to **"Excel Export"** tab
- Configure export template:
  - ☑ Include customer info
  - ☑ Include generator specs
  - ☑ Include service breakdown
  - ☑ Include quarterly totals
  - ☑ Include prevailing wage details
- Set export format: `.xlsx` or `.csv`
- Save settings

### Step 10.4: Export to Excel
- Return to results section
- Locate **"Export to Excel"** button (Excel icon)
- Click button
- Excel file downloads
- File name: `quote-LBNL-20251027.xlsx`
- Open in Excel:
  - Sheet 1: Quote Summary
  - Sheet 2: Service Breakdown
  - Sheet 3: Quarterly Breakdown
  - Sheet 4: Prevailing Wage Details
  - Sheet 5: Customer & Generator Info

---

## Phase 11: Bottom-of-Page Controls

### Step 11.1: Locate Bottom Control Bar
- Scroll to very bottom of page
- Fixed or sticky control bar visible:
  ```
  ┌───────────────────────────────────────────────────────────────┐
  │ [New Quote] [Save] [Calculate] [Generate PDF] [Send to Zoho] │
  │                                            [Settings] [Help]   │
  └───────────────────────────────────────────────────────────────┘
  ```

### Step 11.2: Test Quick Actions
- **New Quote:** Clears all fields, starts fresh
- **Save:** Opens save dialog
- **Calculate:** Triggers quote calculation (same as main button)
- **Generate PDF:** Creates PDF (same as main button)
- **Send to Zoho:** Initiates Zoho transfer (same as main button)
- **Settings:** Opens settings modal
- **Help:** Opens help documentation or tooltip

### Step 11.3: Keyboard Shortcuts (if implemented)
- Press `Ctrl+S` → Save quote
- Press `Ctrl+Enter` → Calculate quote
- Press `Ctrl+P` → Generate PDF
- Press `Ctrl+Shift+Z` → Send to Zoho
- Press `Ctrl+,` → Open settings
- Press `F1` → Open help

---

## Phase 12: Cleanup & Logout

### Step 12.1: Review Final State
- Scroll through entire page one last time
- Verify all data persisted correctly
- Check console for any errors (should be none)

### Step 12.2: Local Storage Check
- Open DevTools > Application > Local Storage
- Verify stored data:
  - `quote-2025-1027-001` → Quote data JSON
  - `settings` → Settings object
  - `contacts` → Contact list array
  - `prevailingWageCache` → Cached API rates

### Step 12.3: Clear Session (Optional)
- Click **"New Quote"** button
- Confirmation dialog: "Unsaved changes will be lost. Continue?"
- Click **"Yes"** (we already saved to Zoho)
- Page clears all fields
- Returns to blank calculator state

### Step 12.4: Close Application
- Close browser tab or window
- Server continues running (unless stopped manually)

---

## 🎉 Workflow Complete!

**Total Time:** ~10-12 minutes
**UI Elements Touched:** 80+ individual elements
**API Calls Made:** 8-10 calls
**Files Generated:** 2 (PDF + Excel)
**Zoho Records Created:** 4 (Account, Contact, Asset, Quote)

---

## Summary of All UI Elements Interacted With

### Input Fields (22)
1. Company Name (with Zoho autocomplete)
2. Address
3. City
4. State
5. ZIP Code
6. Phone
7. Website
8. Contact Full Name
9. Contact Title
10. Contact Email
11. Contact Phone
12. Generator Model
13. Generator kW
14. Generator Fuel Type (dropdown)
15. Generator Serial Number
16. Generator Manufacturer
17. Generator Year
18. Generator Location
19. Generator Hours
20. Custom Service Description
21. Custom Service Hours
22. Settings - Multiple fields (labor rate, mileage, tax, prevailing wage, etc.)

### Buttons (35+)
1. Select Zoho Account
2. Add New Contact
3. Submit Contact
4. Settings (open modal)
5. Prevailing Wage Checkbox
6. Refresh Prevailing Wage
7. Manual Override Checkbox
8. Save Settings
9. Cancel Settings
10. Service A - Quarterly button
11. Service A - Semi-Annual button
12. Service A - Annual button
13. Service B - Quarterly button
14. Service C - Annual button
15. Service D - Annual button
16. Service D - Oil checkbox
17. Service D - Coolant checkbox
18. Service D - Fuel checkbox
19. Service E - Annual button
20. Service F - Triennial button
21. Service H - 5-Year button
22. Service I - Annual button
23. Service J - Annual button
24. Add Custom Service
25. Remove Custom Service
26. Calculate Quote
27. Generate PDF
28. Send to Zoho CRM
29. View in Zoho CRM
30. Email Quote
31. Duplicate Quote
32. Create Revision
33. Save Quote
34. Export to Excel
35. New Quote

### Navigation Elements (8)
1. Calculator tab
2. History tab
3. Documents tab
4. Reports tab
5. Settings tab
6. Scroll to top button
7. Scroll to results
8. Bottom control bar

### Display Elements (15+)
1. Company logo display
2. Metric cards (4): Total Quote, Labor Hours, Materials, Units
3. Service selection summary sidebar
4. Quarterly breakdown table
5. Service breakdown cards (10 services)
6. Prevailing wage indicator
7. Loading spinners/indicators
8. Success notifications
9. Error notifications
10. Progress indicators (Zoho transfer)
11. PDF preview (optional)
12. History list view
13. Documents grid view
14. Reports charts/graphs
15. Help tooltips

### Modals/Dialogs (7)
1. Settings modal
2. Add Contact modal
3. Contact Picker modal
4. Email Quote modal
5. Duplicate Confirmation dialog
6. Revision Creation modal
7. Save Quote dialog

---

## Key User Experience Observations

### Positive UX Elements
✅ **Auto-population from Zoho** reduces data entry
✅ **Real-time validation** prevents errors early
✅ **Progressive disclosure** (settings, prevailing wage) keeps UI clean
✅ **Visual feedback** (loading spinners, success notifications)
✅ **Consistent pricing display** across all service cards
✅ **Prevailing wage transparency** shows rate breakdown
✅ **Multi-step progress indicators** for long operations
✅ **Persistent bottom controls** for quick access

### Potential UX Improvements
⚠️ **Long scroll depth** - Consider sticky navigation or tabs
⚠️ **Multiple calculation steps** - Could auto-calculate on service selection
⚠️ **Zoho transfer time** - 15-30 seconds may feel long (needs progress feedback)
⚠️ **Service D complexity** - Fluid checkboxes hidden until service selected
⚠️ **Manual override** - Could benefit from warning message about compliance

---

**Document Version:** 1.0
**Last Updated:** October 27, 2025
**Status:** Complete User Workflow Reference
**Use Case:** UI/UX Testing, Training, Demo Scripts
