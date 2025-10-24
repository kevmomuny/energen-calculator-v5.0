### Phase 16: RFP Upload & Processing
**Purpose:** Verify RFP document upload and AI extraction

**Test Sequence:**
1. Click RFP Upload view in activity bar
2. Verify upload interface appears
3. Verify drag-drop zone visible
4. Verify "Choose File" button exists
5. Click "Choose File" button
6. Select PDF RFP document
7. Verify file upload starts
8. Verify upload progress indicator
9. Verify upload completes
10. Verify AI processing starts
11. Verify extracted data displays:
    - Customer info
    - Generator specs
    - Service requirements
12. Verify "Use This Data" button
13. Click "Use This Data"
14. Verify data populates calculator
15. Verify can modify imported data

**Evidence Required:**
- Screenshot of RFP upload interface
- Screenshot of uploaded file
- Screenshot of extracted data
- Console log of extraction API call
- Network log of /api/rfp/process
- Verification data populated calculator

**Fail If:**
- Upload interface doesn't appear
- File upload fails
- AI extraction doesn't run
- Extracted data incorrect
- Data doesn't populate calculator
- Console errors during process

---
