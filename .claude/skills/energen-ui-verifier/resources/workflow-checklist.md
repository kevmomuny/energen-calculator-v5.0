# Complete Workflow Verification Checklist

**Purpose:** Manual checklist for thorough UI verification when automation not possible

---

## Phase 0: Pre-Flight Checks

### Server Health
- [ ] Server running on port 3002
- [ ] GET /health returns 200 OK
- [ ] Server console shows no errors

### Page Load
- [ ] Navigate to http://localhost:3002/frontend/integrated-ui.html
- [ ] Page loads within 3 seconds
- [ ] No browser console errors
- [ ] No failed network requests (check Network tab)

### Module Loading
- [ ] Open browser console
- [ ] Type `window.state` and press Enter
- [ ] Verify: Returns object (not undefined)
- [ ] Verify: state.customer object exists
- [ ] Verify: state.units array exists
- [ ] Verify: state.selectedServices array exists

### External Dependencies
- [ ] Open console, type `window.google`
- [ ] Verify: Google Maps API loaded
- [ ] Check page for "Failed to load Google Maps" errors
- [ ] Verify all CSS loaded (page styled correctly)

**Evidence:**
- [ ] Screenshot of loaded page
- [ ] Screenshot of console showing window.state
- [ ] Console log copied to file

---

## Phase 1: Customer Information Entry

### Input Fields Existence
- [ ] Company Name input visible
- [ ] Phone input visible
- [ ] Email input visible
- [ ] Website input visible
- [ ] Address input visible

### Company Name
- [ ] Click company name field
- [ ] Type: "Test Generator Services LLC"
- [ ] Verify: Text appears in field
- [ ] Verify: May trigger Zoho autocomplete
- [ ] If autocomplete appears: Wait for it to complete
- [ ] If autocomplete appears: Close dropdown or select option

### Phone
- [ ] Click phone field
- [ ] Type: "(555) 123-4567"
- [ ] Verify: Text appears in field
- [ ] Verify: Field accepts phone format

### Email
- [ ] Click email field
- [ ] Type: "test@generator.com"
- [ ] Verify: Text appears in field
- [ ] Verify: Email format accepted

### Website
- [ ] Click website field
- [ ] Type: "www.generator.com"
- [ ] Verify: Text appears in field
- [ ] Verify: URL format accepted

### Address with Autocomplete (CRITICAL)
- [ ] Click address field
- [ ] Type slowly: "1 Market St"
- [ ] Wait 2 seconds for Google Places dropdown
- [ ] Verify: Autocomplete dropdown appears
- [ ] Click first autocomplete suggestion
- [ ] Verify: Full address auto-completes
- [ ] Verify: City field populated (if separate)
- [ ] Verify: State field populated (if separate)
- [ ] Verify: Zip code populated (if separate)

### Enrichment Verification
- [ ] Wait 3 seconds after address selection
- [ ] Check for "Enriching..." or loading indicator
- [ ] Wait for enrichment to complete
- [ ] Verify: Logo updates (if available)
- [ ] Verify: Industry field populated (if available)
- [ ] Verify: Additional data appears (if available)
- [ ] Verify: No error messages

### State Verification
- [ ] Open console
- [ ] Type: `window.state.customer`
- [ ] Verify: Object contains all entered data
- [ ] Verify: Company name matches input
- [ ] Verify: Phone matches input
- [ ] Verify: Email matches input
- [ ] Verify: Address matches input

**Evidence:**
- [ ] Screenshot before filling
- [ ] Screenshot of autocomplete dropdown
- [ ] Screenshot after enrichment
- [ ] Screenshot of console showing state.customer
- [ ] Console log showing API calls

---

## Phase 2: Contact Information Entry

### Add Contact Button
- [ ] Locate "Add Contact" button
- [ ] Verify: Button visible
- [ ] Verify: Button enabled
- [ ] Click "Add Contact"
- [ ] Verify: Modal opens within 500ms

### Contact Modal Fields
- [ ] Verify: Name field visible in modal
- [ ] Verify: Title field visible in modal
- [ ] Verify: Email field visible in modal
- [ ] Verify: Phone field visible in modal
- [ ] Verify: Save button visible in modal

### Fill Contact Information
- [ ] Click name field
- [ ] Type: "John Smith"
- [ ] Click title field
- [ ] Type: "Facilities Manager"
- [ ] Click email field
- [ ] Type: "john@generator.com"
- [ ] Click phone field
- [ ] Type: "(555) 234-5678"

### Save Contact
- [ ] Click "Save Contact" button
- [ ] Verify: Modal closes
- [ ] Verify: Contact card appears in sidebar
- [ ] Verify: Card shows correct name
- [ ] Verify: Card shows correct title
- [ ] Verify: Card shows correct email
- [ ] Verify: Card shows correct phone

### State Verification
- [ ] Open console
- [ ] Type: `window.state.contacts`
- [ ] Verify: Array contains contact object
- [ ] Verify: Contact data matches input

**Evidence:**
- [ ] Screenshot of Add Contact button
- [ ] Screenshot of opened modal
- [ ] Screenshot of filled modal
- [ ] Screenshot of contact card
- [ ] Screenshot of console showing state.contacts

---

## Phase 3: Generator Specifications Entry

### Generator Card Rendering
- [ ] Verify: Generator card visible (not "Loading...")
- [ ] Verify: All input fields visible
- [ ] Verify: No rendering errors

### Generator kW
- [ ] Locate kW input field
- [ ] Verify: Field accepts numbers
- [ ] Type: "175"
- [ ] Verify: Value appears
- [ ] Try invalid: "5000"
- [ ] Verify: Validation error or rejection
- [ ] Return to valid: "175"

### Manufacturer
- [ ] Locate manufacturer dropdown
- [ ] Click dropdown
- [ ] Verify: Options appear (Cummins, CAT, Kohler, etc.)
- [ ] Select: "Cummins"
- [ ] Verify: Selection displays

### Model
- [ ] Locate model input
- [ ] Type: "C175D6"
- [ ] Verify: Text appears

### Serial Number
- [ ] Locate serial number input
- [ ] Type: "SN-TEST-175-001"
- [ ] Verify: Text appears

### Fuel Type
- [ ] Locate fuel type dropdown
- [ ] Click dropdown
- [ ] Verify: Options appear (Diesel, Natural Gas, Propane, Bi-Fuel)
- [ ] Select: "Diesel"
- [ ] Verify: Selection displays

### Location
- [ ] Locate location input
- [ ] Type: "Main Building - Basement"
- [ ] Verify: Text appears

### Extended Fields (if available)
- [ ] Check for engine manufacturer field
- [ ] Check for engine model field
- [ ] Check for engine serial field
- [ ] Check for cylinders field
- [ ] Check for displacement field
- [ ] Fill any additional fields found

### State Verification
- [ ] Open console
- [ ] Type: `window.state.units`
- [ ] Verify: Array contains unit object
- [ ] Verify: kW = 175
- [ ] Verify: manufacturer = "Cummins"
- [ ] Verify: All entered data present

**Evidence:**
- [ ] Screenshot of empty generator form
- [ ] Screenshot of filled generator form
- [ ] Screenshot of console showing state.units

---

## Phase 4: Service Selection

### Service A - Comprehensive Inspection
- [ ] Scroll to Service A card
- [ ] Verify: Card visible
- [ ] Verify: Service description visible
- [ ] Click "Quarterly" button
- [ ] Verify: Button becomes active/highlighted
- [ ] Verify: Pricing displays (not $0.00)
- [ ] Verify: Frequency badge shows "4x/year"
- [ ] Click "Semi-Annual" button
- [ ] Verify: Updates to "2x/year"
- [ ] Click "Annual" button
- [ ] Verify: Updates to "1x/year"
- [ ] Return to "Quarterly"

### Service B - Air & Fuel System
- [ ] Scroll to Service B card
- [ ] Verify: Card visible
- [ ] Click "Quarterly" button
- [ ] Verify: Button active
- [ ] Verify: Pricing displays (not $0.00)
- [ ] Verify: Different price than Service A

### Service D - DPF Service
- [ ] Scroll to Service D card
- [ ] Verify: Card visible
- [ ] Verify: "Quarterly" button NOT available (annual only)
- [ ] Verify: "Semi-Annual" button available
- [ ] Click "Annual" button
- [ ] Verify: Pricing displays (max ~$93)

### Services E, F, G (if desired)
- [ ] Repeat selection process for additional services
- [ ] Verify each service has independent pricing

### Service Summary
- [ ] Locate service summary section
- [ ] Verify: Shows count of selected services
- [ ] Verify: Lists all selected services
- [ ] Verify: Shows frequency for each

### State Verification
- [ ] Open console
- [ ] Type: `window.state.selectedServices`
- [ ] Verify: Array contains selected service codes
- [ ] Example: ["A", "B", "D"]

**Evidence:**
- [ ] Screenshot of each selected service
- [ ] Screenshot of service summary
- [ ] Screenshot of console showing selectedServices

---

## Phase 5: Quote Calculation

### Calculate Button
- [ ] Locate "Calculate Quote" button
- [ ] Verify: Button enabled
- [ ] Verify: Button not grayed out
- [ ] Click "Calculate Quote"

### Loading State
- [ ] Verify: Loading indicator appears
- [ ] Verify: Button shows loading state
- [ ] Wait for calculation (max 10 seconds)

### Results Appear
- [ ] Verify: Loading indicator disappears
- [ ] Verify: Results section appears
- [ ] Verify: Results visible on page

### API Verification
- [ ] Open browser Network tab
- [ ] Find /api/calculate request
- [ ] Click request to view details
- [ ] View "Payload" tab
- [ ] Verify: Payload includes generator kW
- [ ] Verify: Payload includes fuel type
- [ ] Verify: Payload includes selected services
- [ ] View "Response" tab
- [ ] Verify: Response includes serviceBreakdown
- [ ] Verify: Each service has totalCost, frequency, laborCost
- [ ] Verify: Response includes quarterlyTotals or annualTotal

### Results Display
- [ ] Verify: Service A total shown
- [ ] Verify: Service B total shown
- [ ] Verify: Service D total shown
- [ ] Verify: All selected services listed
- [ ] Verify: No service shows $0.00
- [ ] Verify: Quarterly total shown (Q1, Q2, Q3, Q4)
- [ ] Verify: Annual grand total shown

### Console Check
- [ ] Open console
- [ ] Verify: No errors during calculation
- [ ] Type: `window.state.units[0].serverCalculations`
- [ ] Verify: Object contains serviceBreakdown
- [ ] Verify: Contains all selected services

**Evidence:**
- [ ] Screenshot of Calculate button
- [ ] Screenshot of loading state
- [ ] Screenshot of results
- [ ] Screenshot of Network tab showing API call
- [ ] Screenshot of API response
- [ ] Screenshot of console showing serverCalculations

---

## Phase 6: Results Validation

### Quarterly Totals
- [ ] Locate quarterly breakdown
- [ ] Verify: Q1 (Oct-Dec) total shown
- [ ] Verify: Q2 (Jan-Mar) total shown
- [ ] Verify: Q3 (Apr-Jun) total shown
- [ ] Verify: Q4 (Jul-Sep) total shown
- [ ] Verify: No quarter shows $0.00 (if services selected)

### Service Breakdown Validation
For Service A (Quarterly):
- [ ] Note per-visit price: $______
- [ ] Note frequency: 4
- [ ] Calculate: per-visit × 4 = $______
- [ ] Verify: Displayed annual total matches calculation
- [ ] Verify: Q1 = Q2 = Q3 = Q4 (quarterly service)

For Service D (Annual):
- [ ] Note annual price: $______
- [ ] Verify: Price ≤ $93 (max for DPF annual)
- [ ] Verify: Q1 shows full amount
- [ ] Verify: Q2, Q3, Q4 show $0.00

### Grand Total Validation
- [ ] Note Service A annual: $______
- [ ] Note Service B annual: $______
- [ ] Note Service D annual: $______
- [ ] Add all service annuals: $______
- [ ] Compare to displayed grand total
- [ ] Verify: Totals match within $1

### Expected Range Check
- [ ] Note test case expected range (from test data)
- [ ] Compare actual total to expected range
- [ ] Verify: Total within expected range
- [ ] If outside range: Document variance

**Evidence:**
- [ ] Screenshot of complete results
- [ ] Manual calculation spreadsheet or notes
- [ ] Comparison table (expected vs actual)

---

## Phase 7: PDF Generation

### Generate PDF Button
- [ ] Locate "Generate PDF" or "Download PDF" button
- [ ] Verify: Button visible
- [ ] Verify: Button enabled
- [ ] Click button

### PDF Generation
- [ ] Verify: Button shows loading state
- [ ] Wait for PDF generation (max 10 seconds)
- [ ] Verify: PDF download starts OR preview appears
- [ ] Verify: No error message

### PDF Content Validation (if accessible)
- [ ] Open PDF file
- [ ] Verify: Customer name matches input
- [ ] Verify: Generator kW matches input (175 kW)
- [ ] Verify: Generator manufacturer matches (Cummins)
- [ ] Verify: All selected services listed
- [ ] Verify: Quarterly pricing columns present:
  - [ ] OCT-DEC (Q1)
  - [ ] JAN-MAR (Q2)
  - [ ] APR-JUN (Q3)
  - [ ] JUL-SEP (Q4)
- [ ] Verify: Quarterly totals row shows values (not $0.00)
- [ ] Verify: No dash "-" placeholders in pricing
- [ ] Verify: Service A quarterly prices match UI
- [ ] Verify: Service D shows annual price in Q1 only
- [ ] Verify: Annual total matches calculator

### Console Check
- [ ] Open console
- [ ] Verify: No errors during PDF generation
- [ ] Check Network tab
- [ ] Find /api/generate-pdf request
- [ ] Verify: Response is PDF (not error)

**Evidence:**
- [ ] Screenshot of Generate PDF button
- [ ] Screenshot during generation
- [ ] Screenshot of PDF preview (if applicable)
- [ ] PDF file saved for review
- [ ] Console log showing API call

---

## Phase 8: Zoho Data Transfer

### Send to Zoho Button
- [ ] Locate "Send to Zoho" or "Create Bid" button
- [ ] Verify: Button visible
- [ ] Verify: Button enabled
- [ ] Click button

### Zoho Account Creation
- [ ] Wait for account creation (max 10 seconds)
- [ ] Verify: Success message appears
- [ ] Note: Account ID from success message
- [ ] Open console, check Network tab
- [ ] Find Zoho account creation request
- [ ] Verify: Response includes Account ID
- [ ] Verify: No error response

### Verify in Zoho CRM - Account
- [ ] Open Zoho CRM in browser
- [ ] Navigate to Accounts module
- [ ] Search for: "Test Generator Services LLC"
- [ ] Verify: Account found
- [ ] Open account record
- [ ] Verify: Account Name = "Test Generator Services LLC"
- [ ] Verify: Phone = "(555) 123-4567"
- [ ] Verify: Email = "test@generator.com"
- [ ] Verify: Website = "www.generator.com"
- [ ] Verify: Address populated

### Verify in Zoho CRM - Contact
- [ ] In Zoho CRM, navigate to Contacts
- [ ] Search for: "John Smith"
- [ ] Verify: Contact found
- [ ] Open contact record
- [ ] Verify: Name = "John Smith"
- [ ] Verify: Title = "Facilities Manager"
- [ ] Verify: Email = "john@generator.com"
- [ ] Verify: Phone = "(555) 234-5678"
- [ ] Verify: Account Name linked to correct account
- [ ] Click Account Name link
- [ ] Verify: Opens correct account record

### Verify in Zoho CRM - Generator Asset
- [ ] In Zoho CRM, navigate to Generator Assets (custom module)
- [ ] Search for: Serial "SN-TEST-175-001"
- [ ] Verify: Asset found
- [ ] Open asset record
- [ ] Verify: Generator kW = 175
- [ ] Verify: Manufacturer = "Cummins"
- [ ] Verify: Model = "C175D6"
- [ ] Verify: Serial Number = "SN-TEST-175-001"
- [ ] Verify: Fuel Type = "Diesel"
- [ ] Verify: Location = "Main Building - Basement"
- [ ] Verify: Customer Account linked to correct account
- [ ] Click Customer Account link
- [ ] Verify: Opens correct account record

### Verify in Zoho CRM - Quote
- [ ] In Zoho CRM, navigate to Quotes
- [ ] Search for latest quote for "Test Generator Services LLC"
- [ ] Verify: Quote found
- [ ] Open quote record
- [ ] Verify: Account Name linked to correct account
- [ ] Verify: Quote status (Draft/Pending/etc.)
- [ ] Verify: Grand Total matches calculator
- [ ] Scroll to Product Details / Line Items section
- [ ] Verify: Service A listed as line item
- [ ] Verify: Service A quantity = 4 (quarterly)
- [ ] Verify: Service A list price = per-visit price
- [ ] Verify: Service A total = list price × 4
- [ ] Verify: Service B listed as line item
- [ ] Verify: Service B pricing correct
- [ ] Verify: Service D listed as line item
- [ ] Verify: Service D quantity = 1 (annual)
- [ ] Verify: Service D pricing correct
- [ ] Verify: ALL selected services appear
- [ ] Verify: NO line items show $0.00
- [ ] Verify: Sum of line items = Grand Total

**Evidence:**
- [ ] Screenshot of Send to Zoho button
- [ ] Screenshot of success message
- [ ] Screenshot of Zoho Account record
- [ ] Screenshot of Zoho Contact record
- [ ] Screenshot of Zoho Generator Asset record
- [ ] Screenshot of Zoho Quote header
- [ ] Screenshot of Zoho Quote line items
- [ ] Console log showing Zoho API calls

---

## Phase 9: Complete Workflow Summary

### Workflow Completion
- [ ] All 8 phases completed without stopping
- [ ] No critical errors encountered
- [ ] All data transferred successfully
- [ ] All verification steps passed

### Data Integrity Check
- [ ] Customer data: Form → Zoho (100% match)
- [ ] Contact data: Form → Zoho (100% match)
- [ ] Generator data: Form → Zoho (100% match)
- [ ] Service selection: UI → Quote (100% match)
- [ ] Pricing: Calculator → PDF → Zoho (100% match)

### Production Ready Criteria
- [ ] All UI elements functional
- [ ] No console errors
- [ ] All calculations accurate
- [ ] PDF generates correctly
- [ ] Complete Zoho transfer successful
- [ ] All links/lookups working
- [ ] Performance acceptable (<60s total)

**Final Assessment:**
- [ ] PASS: Production ready ✅
- [ ] FAIL: Not production ready ❌

**If FAIL, document reasons:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## Evidence Collection Summary

**Screenshots Captured:** _____ total
**Console Logs Saved:** _____ files
**Network Logs Saved:** _____ files
**PDF Reviewed:** [ ] Yes [ ] No
**Zoho Verified:** [ ] Yes [ ] No

**Report Saved:** _______________________________________
**Date/Time:** _________________________________________
**Tester:** ___________________________________________

---

**Remember:** This checklist is UNFORGIVING. If any step fails, document it and mark as NOT PRODUCTION READY. Better to fail a test than declare ready when it's not.
