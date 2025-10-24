# VERIFICATION CHECKLIST - ENERGEN V5.0
## Mandatory Checks Before Any Conclusion

---

## FOR ANY CLAIM ABOUT MISSING FEATURES

### Required Actions:
```
□ Searched ENTIRE codebase for feature name
□ Used multiple search patterns (show all)
□ Read complete implementation (to EOF)
□ Checked all file extensions (.js, .cjs, .mjs)
□ Verified in frontend AND backend
□ Searched for variations (uppercase, lowercase, partial)
□ Checked comments for TODO/FIXME
□ Looked for test files
```

### Search Patterns to Use:
```javascript
// For Service K example:
patterns = [
  /getServiceK/i,
  /Service.*K/i,
  /case ['"]K['"]/,
  /services\[['"]K['"]\]/,
  /[Kk].*[Bb]attery/,
  /battery.*replacement/i,
  /SERVICE_K/,
  /'K':|"K":/
];
```

---

## FOR ANY ASSESSMENT/ANALYSIS

### Minimum Requirements:
```
□ Read minimum 500 lines of core code
□ Examined at least 3 complete functions
□ Verified all "known issues" against actual code
□ Reconciled all contradictions (docs vs code)
□ Reached EOF on critical files
□ Checked both calculation AND UI code
□ Verified API endpoints exist
□ Tested actual functionality (if possible)
```

### Must Track:
- Lines of code examined: _____ (>500 required)
- Complete functions read: _____ (>3 required)
- Files read to EOF: _____ (list them)
- Search queries: _____ (show patterns)
- Contradictions: _____ (how resolved)

---

## FOR SERVICE IMPLEMENTATION CLAIMS

### Complete Verification Required:
```
□ Backend calculation function found
□ Frontend UI implementation found
□ API endpoint handler found
□ Service name in serviceNames object
□ Mobilization hours defined
□ Test cases exist
□ Validation rules present
□ Price calculations verified
```

### Where to Check:
```javascript
// Backend:
complete-calculation-engine.cjs
  - getService[X] function
  - serviceNames['X']
  - mobilizationHours['X']
  
server-secure.cjs
  - API endpoint handling
  - Validation schemas

// Frontend:
integrated-ui.html
  - Service checkboxes
  - Service display logic
  
energen-client.js
  - Service data transmission
```

---

## FOR BUG REPORTS

### Before Claiming a Bug:
```
□ Read ENTIRE function with the issue
□ Read 200+ lines of context around it
□ Checked all callers of the function
□ Verified input validation
□ Examined error handling
□ Looked for related tests
□ Attempted reproduction
□ Checked for recent fixes
```

---

## FOR "COMPLETE" CLAIMS

### Never Say Complete Without:
```
□ Every service (A-K + CUSTOM) verified
□ All endpoints tested
□ All integrations confirmed working
□ PDF generation tested
□ Tax calculation verified
□ Zoho sync confirmed
□ Error handling checked
□ Validation working
```

---

## CONTRADICTION RESOLUTION

### When Documentation ≠ Code:
```
□ Located the contradiction
□ Read complete code section
□ Verified code is current (not old)
□ Code behavior confirmed
□ Documentation updated
□ Added note about correction
```

### Resolution Format:
```
CONTRADICTION:
- Location: [file:lines]
- Docs said: [claim]
- Code shows: [reality]
- Resolution: CODE IS CORRECT
- Action: Updated [file] to reflect truth
```

---

## SEARCH VERIFICATION

### Required Search Coverage:
```
□ Function definitions
□ Method calls
□ Variable declarations
□ Object properties
□ Array elements
□ String literals
□ Comments
□ Import/Export statements
□ Test descriptions
```

### Show Your Work:
```javascript
// EXAMPLE: Searching for Service K
Searches performed:
1. Pattern: /getServiceK/ - Results: [none/found at line X]
2. Pattern: /case ['"]K['"]/ - Results: [none/found at line X]
3. Pattern: /[Kk]battery/ - Results: [none/found at line X]
4. Pattern: /SERVICE_K/ - Results: [none/found at line X]
5. Files searched: [list all files checked]
```

---

## EOF CONFIRMATION

### Files Requiring Complete Read:
```
□ complete-calculation-engine.cjs (to EOF)
□ server-secure.cjs (to EOF)
□ integrated-ui.html (to EOF)
□ energen-client.js (to EOF)
□ Any file with service implementations
```

### EOF Verification:
```javascript
// Must see this for each file:
"[Reading XXX lines from start (total: XXX lines, 0 remaining)]"
//                                                ^^^^^^^^^^^^
//                                    This confirms EOF reached
```

---

## ACCURACY COMMITMENT

### Before Any Response:
```
□ Would I bet $10,000 on this?
□ Have I shown my work?
□ Can someone verify my claims?
□ Did I check everything?
□ Is my confidence based on CODE?
```

### Final Statement Required:
```
VERIFICATION COMPLETE:
✓ Method: [Code inspection, not documentation]
✓ Coverage: [XXX lines across XX files]
✓ Confidence: [Based on code verification]
✓ Reproducible: [Yes, search patterns provided]
```

---

## THIS CHECKLIST IS MANDATORY

**Skip any item = Invalid analysis**
**Partial completion = Total failure**
**Assumptions = Prohibited**

When in doubt: CHECK MORE CODE
