### Phase 10: View Switching & Navigation
**Purpose:** Verify all activity bar views load and function correctly

**Views to Test:**

| View | Activity Bar Icon | Expected Behavior |
|------|-------------------|-------------------|
| Calculator | analytics icon | Main calculator view (default) |
| RFP Upload | upload_file icon | RFP document upload interface |
| Customers | group icon | Customer management view |
| Settings | settings icon | Settings modal/view |
| Documents | folder icon | Documents library |
| Reports | insights icon | Reports and analytics |

**Test Sequence:**
1. Verify all 6 activity bar icons visible
2. Click "RFP Upload" → verify view switches
3. Take screenshot of RFP upload interface
4. Verify upload button, drag-drop zone exist
5. Click "Customers" → verify view switches
6. Take screenshot of customer list view
7. Verify customer search, add customer button
8. Click "Settings" → verify settings modal/view opens
9. Click "Documents" → verify documents view loads
10. Click "Reports" → verify reports view loads
11. Click "Calculator" → verify returns to main view
12. Verify state preserved (customer data still there)

**Evidence Required:**
- Screenshot of each view
- Console logs for view switching
- Verification that view switching doesn't clear state
- All views load without errors

**Fail If:**
- Any view doesn't load
- View switching clears calculator data
- Console errors during switching
- Any view shows blank page

---
