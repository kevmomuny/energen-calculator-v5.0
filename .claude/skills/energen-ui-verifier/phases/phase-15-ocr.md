### Phase 15: Business Card OCR & Contact Photo Scraping
**Purpose:** Verify advanced contact entry features

**Business Card OCR Test:**

1. Click "Add Contact" button
2. Verify contact modal opens
3. Look for "Scan Business Card" or camera icon
4. Click business card OCR button
5. Verify camera modal opens
6. Verify camera preview visible
7. Click "Capture" button
8. Verify image capture successful
9. Verify OCR processing indicator
10. Verify extracted data fills contact form:
    - Name
    - Title
    - Email
    - Phone
11. Verify can edit extracted data
12. Save contact

**Contact Photo Scraping Test:**

1. In contact modal, verify "Scrape Photo" button
2. Click "Scrape Contact Photo" button
3. Verify loading indicator
4. Verify photo preview appears
5. Verify photo URL captured
6. Verify photo persists with contact
7. Save contact with photo

**Evidence Required:**
- Screenshot of camera modal
- Screenshot of captured business card
- Screenshot of extracted data in form
- Screenshot of contact photo preview
- Verification of photo URL in contact data

**Fail If:**
- Camera doesn't activate
- OCR doesn't extract data
- Extracted data incorrect
- Photo scraping fails
- Photos don't persist

---
