### Phase 7: PDF Generation
**Purpose:** Verify PDF creates with accurate data

**PDF Generation Test:**
1. Click "Generate PDF" button
2. Verify button shows loading state
3. Wait for PDF generation (max 10 seconds)
4. Verify PDF download initiates OR preview appears
5. Verify no errors in console

**PDF Content Validation:**
If PDF can be accessed programmatically:
1. Verify customer name matches input
2. Verify generator specs match input
3. Verify all selected services listed
4. Verify quarterly pricing columns:
   - OCT-DEC (Q1)
   - JAN-MAR (Q2)
   - APR-JUN (Q3)
   - JUL-SEP (Q4)
5. Verify quarterly totals row
6. Verify annual total matches calculator
7. Verify no "$0.00" values in quarterly cells
8. Verify no dash "-" placeholders in pricing

**API Validation:**
1. Capture /api/generate-pdf request
2. Verify payload includes:
   - Complete customer data
   - Complete generator data
   - All selected services
   - serviceBreakdown with pricing
   - Quarterly totals
   - Annual total
3. Verify response is PDF buffer (not error)

**Evidence Required:**
- Screenshot of PDF generation button
- Screenshot during generation
- Screenshot of PDF preview/download
- Console log for /api/generate-pdf
- Network request capture
- PDF file saved (if possible)
- **CRITICAL: Visual PDF accuracy inspection** - Open PDF and take screenshots showing:
  - Customer name and contact info clearly visible
  - Generator specifications accurate
  - Service descriptions match selections
  - Quarterly pricing columns populated (no $0.00 or dashes)
  - Quarterly totals row with correct values
  - Annual total matches calculator display
  - Professional formatting (no broken layout)
  - Logo visible (if enriched)
- Manual PDF review checklist with line-by-line verification

**Known Issues:**
- E2E-005: PDF libraries (jsPDF, html2canvas) may not be detected
- Bug #6: PDF template may show $0.00 if reading from wrong data format
- User reported: PDF showed all quarterly totals as $0.00 (EST-17604693)

**Fail If:**
- Generate PDF button doesn't respond
- PDF generation times out
- Console errors during generation
- PDF not created
- PDF contains $0.00 values
- PDF contains dash "-" placeholders
- PDF totals don't match calculator
- API returns error

---
