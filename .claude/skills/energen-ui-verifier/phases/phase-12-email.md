### Phase 12: Email Quote Workflow
**Purpose:** Verify email quote modal and sending functionality

**UI Elements:**

| Element | Selector | Function |
|---------|----------|----------|
| Email Quote Button | `button[onclick*='emailQuote']` | Opens email modal |
| Email Modal | Email modal container | Shows recipient selection |
| Recipient Inputs | Email inputs | Enter email addresses |
| Add Recipient Button | Add recipient button | Add multiple recipients |
| Subject Line | Subject input | Email subject |
| Message Body | Message textarea | Email message |
| Attach PDF Checkbox | PDF attachment checkbox | Include PDF |
| Send Button | Send email button | Send quote email |

**Test Sequence:**
1. Complete quote calculation (prerequisite)
2. Click "Email Quote" button
3. Verify email modal opens
4. Verify pre-filled recipient (if contact exists)
5. Click "Add Recipient" button
6. Add additional email: "manager@test.com"
7. Verify subject line auto-populated
8. Modify message body
9. Check "Attach PDF" checkbox
10. Click "Send" button
11. Verify loading indicator
12. Verify success message
13. Verify modal closes
14. Verify email API call successful

**Evidence Required:**
- Screenshot of email modal
- Screenshot with multiple recipients
- Console log showing email API call
- Network log showing /api/send-quote-email
- Success confirmation screenshot

**Fail If:**
- Email modal doesn't open
- Can't add multiple recipients
- Send button doesn't respond
- API returns error
- No confirmation message

---
