## ERROR DETECTION & MONITORING SYSTEM

**CRITICAL PROBLEM:** Browser alert() dialogs and popups block JavaScript execution, causing tests to hang indefinitely. Chrome DevTools doesn't see these automatically - you must CHECK for them.

**Why This Matters:**
- User saw alert: "Please fix the following before calculating: Customer name is required"
- I tried to run calculation but JavaScript timed out
- I couldn't see the popup dialog
- Test appeared "stuck" with no error message

**Detection Strategy:**
BEFORE and AFTER every major action (click, fill, submit), check for:
1. Browser alert/confirm/prompt dialogs
2. Console errors
3. Network request failures

### Monitoring Protocol

**BEFORE Every Action:**
```javascript
// Use Chrome DevTools list_console_messages to check for errors
// Use Chrome DevTools list_network_requests to see if open dialog exists
```

**Key Indicators of Popup Dialogs:**
- Console messages tool returns: `# Open dialog` message
- Network requests tool returns: `# Open dialog` message
- JavaScript evaluate operations timeout
- Actions appear to "hang" with no response

**AFTER Every Action:**
```javascript
// Check for alert dialogs:
// 1. Look for "# Open dialog" in console messages response
// 2. If found, use handle_dialog to dismiss before continuing

// Check for errors:
const consoleErrors = await list_console_messages();
// Parse for "error:" or "Error:" entries

// Check for failures:
const networkErrors = await list_network_requests();
// Parse for [failed] or 5xx status codes
```

### Automatic Error Detection Workflow

**Step 1: Pre-Action Check**
```javascript
// Before clicking Calculate button:
1. list_console_messages() → Check for existing errors
2. list_network_requests() → Check for failed requests
3. evaluate_script() → Check window.state for error flags
```

**Step 2: Execute Action**
```javascript
// Click button or fill field
// Wait appropriate time (1-3 seconds for UI updates)
```

**Step 3: Post-Action Verification**
```javascript
// Immediately after action:
1. list_console_messages() → Look for "# Open dialog" or new errors
2. If dialog detected → handle_dialog('accept' or 'dismiss')
3. list_network_requests() → Check for API errors
4. take_screenshot() → Visual confirmation
```

### Example: Calculate Button with Error Detection

```javascript
// WRONG (causes hangs):
click('calculate-button')
wait(3s)
check results

// RIGHT (detects popups):
// 1. Pre-check
const preConsole = await list_console_messages();
const preErrors = preConsole.filter(msg => msg.includes('error'));

// 2. Execute
await click('calculate-button');
await sleep(1s);

// 3. Post-check for dialog
const postConsole = await list_console_messages();
if (postConsole.includes('# Open dialog')) {
  // Popup detected! Handle it
  await handle_dialog('accept');
  
  // Read dialog message from console
  const dialogMsg = extractDialogMessage(postConsole);
  console.log('⚠️ POPUP BLOCKED ACTION:', dialogMsg);
  
  // Take corrective action based on message
  // e.g., "Customer name required" → fill customer name first
}

// 4. Continue or retry
const newErrors = postConsole.filter(msg => msg.includes('error') && !preErrors.includes(msg));
if (newErrors.length > 0) {
  console.log('❌ NEW ERRORS:', newErrors);
  // Handle errors
}
```

### Common Validation Errors That Trigger Popups

From the alert message: **"Please fix the following before calculating:"**

**Required Fields:**
- Customer name (company name input)
- Company name (may be same as above or separate field)
- Contact name (if Contact Management enabled)
- Generator kW (if validation enabled)
- At least one service selected

**Fix Strategy:**
1. Fill ALL required fields before clicking Calculate
2. Check console for validation errors
3. Verify `window.state` has required data populated
4. Test validation by intentionally leaving field blank (verify popup appears)
5. Fill field and verify popup doesn't appear

### Monitoring Checklist (Add to Every Phase)

**Phase 0 - Page Load:**
- [ ] No console errors on load
- [ ] No dialogs on load
- [ ] No network failures

**Phase 1 - Customer Entry:**
- [ ] Check for validation popup after each field
- [ ] Verify required field warnings
- [ ] Handle any autocomplete popups

**Phase 2 - Contact Entry:**
- [ ] Check for modal open errors
- [ ] Verify save completes without popup
- [ ] Handle validation popups

**Phase 3 - Generator Specs:**
- [ ] Check for kW range validation popup
- [ ] Verify fuel type selection
- [ ] Handle any specification warnings

**Phase 4 - Service Selection:**
- [ ] Check for "no services selected" popup
- [ ] Verify service card interactions
- [ ] Handle frequency validation popups

**Phase 5 - Calculate:**
- [ ] **CRITICAL:** Check for "required fields" popup
- [ ] Verify calculation started (loading indicator)
- [ ] Handle any calculation errors
- [ ] Verify calculation completed (no timeout)

**Phase 6-9:**
- [ ] Continue error checking for each phase
- [ ] Document any popups encountered
- [ ] Report popup handling in verification report

### Error Types to Monitor

**1. Browser Dialogs:**
- alert() - Informational popup (OK button only)
- confirm() - Yes/No popup
- prompt() - Text input popup
- Custom modals - Application-specific dialogs

**2. Console Errors:**
- JavaScript errors (TypeError, ReferenceError, etc.)
- Network errors (failed fetch, CORS, timeouts)
- Validation errors (form field requirements)
- API errors (400, 500 responses)

**3. Network Failures:**
- 404 Not Found
- 500 Internal Server Error
- Timeout
- CORS blocked
- Aborted requests

### Fail Fast on Errors

**If ANY error detected during phase:**
1. Take screenshot of error state
2. Capture console logs
3. Capture network logs
4. Save current window.state
5. Mark phase as FAILED
6. DO NOT continue to next phase
7. Report error in verification summary

**Example Failure Report:**
```
Phase 5: Quote Calculation - FAILED ❌

Error Type: Validation Popup
Dialog Message: "Please fix the following before calculating: Customer name is required, Company name is required"
Root Cause: Required fields not filled before clicking Calculate
Evidence: screenshot-phase5-validation-error.png
Action Taken: Dismissed dialog, filled required fields, retried calculation
Retry Result: SUCCESS ✅

Lesson: Always fill ALL required fields before calculation attempt
```

---
