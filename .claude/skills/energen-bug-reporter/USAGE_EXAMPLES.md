# Usage Examples - Energen Bug Reporter

This document provides detailed examples of using the energen-bug-reporter skill in various scenarios.

---

## Example 1: Document New Bug Discovery

**Scenario:** You discovered that the "Clear All" button takes 5+ seconds to respond

**Command:**
```
Use energen-bug-reporter to document the Clear All button 5-second delay issue
```

**What Claude Does:**
1. Investigates the bug in code (searches for "Clear All" button handlers)
2. Identifies root cause (heavy DOM operations, unnecessary state resets)
3. Generates comprehensive bug report with:
   - Bug ID (E2E-XXX)
   - Symptoms and reproduction steps
   - Root cause analysis with file paths and line numbers
   - Impact assessment
   - Recommended fixes
4. Adds entry to E2E_BUGS_TRACKING.json
5. Creates BUG_REPORT_E2E-XXX.md file

**Output Files:**
- `E2E_BUGS_TRACKING.json` (updated)
- `BUG_REPORT_E2E-002.md` (new)

---

## Example 2: Generate Fix Report After Bug Resolution

**Scenario:** You fixed the multi-unit data overwrite bug (E2E-003)

**Command:**
```
Use energen-bug-reporter to generate fix report for bug E2E-003
```

**What Claude Does:**
1. Reads E2E_BUGS_TRACKING.json to get bug details
2. Investigates the fix in code
3. Runs tests to verify fix
4. Generates FIX_REPORT_F3.md with:
   - Bug summary
   - Root cause
   - Solution implemented
   - Files changed (with line numbers)
   - Tests added/modified
   - Before/after comparison
   - Performance impact
5. Updates E2E_BUGS_TRACKING.json status to "FIXED"
6. Generates conventional commit message

**Output Files:**
- `FIX_REPORT_F3.md` (new)
- `E2E_BUGS_TRACKING.json` (updated)
- `.git/COMMIT_EDITMSG_TEMP` (commit message)

---

## Example 3: Document Bug with Performance Metrics

**Scenario:** PDF generation is slow (taking 15+ seconds)

**Command:**
```
Use energen-bug-reporter to document PDF generation performance issue with metrics
```

**What Claude Does:**
1. Profiles PDF generation code
2. Measures execution time for each step
3. Identifies bottlenecks (e.g., image processing, font loading)
4. Generates bug report with:
   - Performance baseline (before): 15.2s
   - Performance target: <5s
   - Breakdown by operation
   - Memory usage analysis
5. Recommends optimizations

**Report Includes:**
```markdown
## Performance Metrics

**Baseline (Before Fix):**
- Total time: 15.2s
- Image processing: 8.3s (55%)
- Font loading: 3.1s (20%)
- PDF rendering: 2.8s (18%)
- Other: 1.0s (7%)

**Target:**
- Total time: <5s
- Image processing: <2s (optimize/cache)
- Font loading: <1s (preload)
- PDF rendering: <2s
```

---

## Example 4: Update Bug Status to "INVESTIGATING"

**Scenario:** You're actively investigating bug E2E-005

**Command:**
```
Use energen-bug-reporter to update E2E-005 status to INVESTIGATING
```

**What Claude Uses (Script):**
```bash
node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-005" \
  --status "INVESTIGATING" \
  --notes "Reproduced issue in Chrome DevTools, tracking API calls"
```

**Result:**
```json
{
  "E2E-005": {
    "status": "INVESTIGATING",
    "lastUpdated": "2025-10-18T12:30:00Z",
    "notes": "Reproduced issue in Chrome DevTools, tracking API calls"
  }
}
```

---

## Example 5: Generate Commit Message from Fix Report

**Scenario:** You fixed E2E-004 and want proper commit message

**Command:**
```
Use energen-bug-reporter to generate commit message for E2E-004 fix
```

**What Claude Uses (Script):**
```bash
node .claude/skills/energen-bug-reporter/scripts/generate-commit-message.cjs \
  --bug-id "E2E-004" \
  --report "FIX_REPORT_F4.md" \
  --type "fix"
```

**Generated Commit Message:**
```
fix(ui): resolve service selection $0 calculation bug (E2E-004)

**Root Cause:**
Service selection state updates didn't trigger DOM click events,
causing validation to fail silently.

**Solution:**
- Added click event simulation in service-selection.js:line 245
- Updated validation to check both state and DOM
- Added integration test for service selection workflow

**Testing:**
✅ All service cards now trigger calculation correctly
✅ Pricing displays accurate values (no more $0.00)
✅ Integration tests pass (3 scenarios)

**Impact:**
- Fixes critical quote calculation bug
- Improves user experience
- Prevents revenue loss from incorrect quotes

**Files Changed:**
- frontend/modules/service-selection.js (15 lines)
- tests/e2e-service-d-workflow.test.cjs (new, 120 lines)

**Performance:**
No performance impact (additional validation <1ms)

Bug: E2E-004
Report: FIX_REPORT_F4.md
```

---

## Example 6: Batch Update Multiple Bug Statuses

**Scenario:** Sprint complete, mark 3 bugs as fixed

**Commands:**
```bash
# Update each bug
node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-001" --status "FIXED" --fix-report "FIX_REPORT_F1.md"

node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-002" --status "FIXED" --fix-report "FIX_REPORT_F2.md"

node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-003" --status "FIXED" --fix-report "FIX_REPORT_F3.md"
```

---

## Example 7: Document Bug with User Impact

**Scenario:** Logo enrichment fails silently, users see broken images

**Command:**
```
Use energen-bug-reporter to document logo enrichment failure with user impact analysis
```

**Generated Report Includes:**
```markdown
## User Impact Analysis

**Severity:** HIGH
**Affected Users:** 100% of new customers
**Frequency:** Every new customer entry
**Workaround:** Manual logo upload (requires 2-3 minutes)

**Business Impact:**
- Professional appearance compromised
- User frustration with broken images
- Extended quote creation time (+2-3 min per customer)
- Potential revenue impact if quotes appear unprofessional

**Urgency:** Fix in current sprint
**Priority:** P1 (Critical)
```

---

## Example 8: Link Bug to Zoho Integration

**Scenario:** Bug prevents Zoho quote creation

**Command:**
```
Use energen-bug-reporter to document Zoho quote creation failure and link to integration
```

**Report Includes:**
```markdown
## Integration Impact

**Affected System:** Zoho CRM Quote Module
**API Endpoint:** POST /api/zoho/create-quote
**Error:** Product IDs missing in line items

**Workflow Broken:**
Phase 8 (Zoho Transfer) → Phase 8.4 (Quote Creation) ❌

**Dependent Features:**
- PDF generation ⚠️ (works standalone)
- Email quote ⚠️ (works without Zoho)
- Complete workflow ❌ (blocked)

**Resolution Blocks:** Production deployment
```

---

## Example 9: Use Template for Consistent Reports

**Scenario:** Need to follow standard report structure

**File:** `.claude/skills/energen-bug-reporter/resources/report-template.md`

**Sections:**
1. Bug Summary
2. Reproduction Steps
3. Expected Behavior
4. Actual Behavior
5. Root Cause Analysis
6. Solution Implemented
7. Files Changed
8. Tests Added
9. Performance Impact
10. Related Issues

**Claude automatically populates all sections with evidence-based content**

---

## Example 10: No Completion Without Tests Rule

**Scenario:** You claim bug is fixed but tests haven't run

**Command:**
```
Use energen-bug-reporter to mark E2E-006 as fixed
```

**What Happens:**
```
❌ ERROR: Cannot mark bug as FIXED without test evidence

Required:
1. Tests must pass (show test output)
2. Manual verification confirmed (provide evidence)
3. User confirms functionality (if applicable)

Current Status:
- Code written: ✅
- Tests passing: ❓ (no evidence)
- User confirmed: ❓

Action Required:
1. Run: npm test
2. Provide test output
3. Then retry this command with --test-results flag
```

**Correct Workflow:**
```bash
# 1. Run tests first
npm test > test-results.txt

# 2. Then update bug status with test evidence
node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-006" \
  --status "FIXED" \
  --fix-report "FIX_REPORT_F6.md" \
  --test-results "test-results.txt"
```

---

## Tips for Effective Bug Reporting

### 1. Include File Paths and Line Numbers
✅ Good: "Bug in `service-selection.js:245` - missing click event"
❌ Bad: "Bug in service selection code"

### 2. Provide Reproduction Steps
✅ Good: "1. Click Service A, 2. Click Calculate, 3. Observe $0.00"
❌ Bad: "Calculation doesn't work"

### 3. Show Before/After
✅ Good: "Before: 15.2s, After: 3.8s (75% improvement)"
❌ Bad: "Performance improved"

### 4. Link to Evidence
✅ Good: "See screenshot-phase5-error.png showing $0.00"
❌ Bad: "Pricing shows zero"

### 5. Quantify Impact
✅ Good: "Affects 100% of users, blocks deployment"
❌ Bad: "Important bug"

---

## Integration with Other Skills

### With energen-code-investigator
```
1. Use energen-code-investigator to verify the bug exists
2. Use energen-bug-reporter to document findings
```

### With energen-ui-verifier
```
1. Use energen-ui-verifier to test after fix
2. Use energen-bug-reporter to generate fix report with test evidence
```

---

**Last Updated:** October 18, 2025
**Skill Version:** 1.1.0
