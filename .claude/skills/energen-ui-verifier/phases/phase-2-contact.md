### Phase 2: Contact Information Entry
**Purpose:** Verify contact addition and management

**UI Elements to Verify:**

| Element | Selector | Check | Expected |
|---------|----------|-------|----------|
| Add Contact Button | `button:has-text('Add Contact')` | Exists, Visible, Enabled | Opens contact modal |
| Contact Name Input | Contact modal `input[placeholder*='Name']` | Exists in modal | Accept text |
| Contact Title Input | Contact modal `input[placeholder*='Title']` | Exists in modal | Accept text |
| Contact Email Input | Contact modal `input[placeholder*='Email']` | Exists in modal | Accept email |
| Contact Phone Input | Contact modal `input[placeholder*='Phone']` | Exists in modal | Accept phone |
| Save Contact Button | Contact modal `button:has-text('Save')` | Exists in modal | Save and close |
| Contact Card | `.contact-card` | Appears after save | Shows contact data |

**Test Sequence:**
1. Click "Add Contact" button
2. Verify modal opens within 500ms
3. Fill contact name: "John Smith"
4. Fill contact title: "Facilities Manager"
5. Fill contact email: "john@generator.com"
6. Fill contact phone: "(555) 234-5678"
7. Click "Save Contact"
8. Verify modal closes
9. Verify contact card appears in sidebar
10. Verify card shows all entered data
11. Verify card is clickable for editing

**Evidence Required:**
- Screenshot of "Add Contact" button
- Screenshot of opened modal
- Screenshot of filled modal
- Screenshot of contact card in sidebar
- Console log (no errors)
- state.contacts array verification

**Fail If:**
- Modal doesn't open
- Fields don't accept input
- Save doesn't close modal
- Contact card doesn't appear
- Data doesn't save to state.contacts

---
