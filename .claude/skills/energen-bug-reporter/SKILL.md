---
name: energen-bug-reporter
description: Generate standardized bug fix reports for Energen Calculator v5.0
priority: 3
version: 1.0.0
author: Energen Team
---

# Energen Bug Reporter Skill

## Purpose
Generate comprehensive, evidence-based bug fix reports following the Energen project's anti-hallucination protocol and standardized report structure.

## When to Use
- After fixing a bug in the Energen Calculator codebase
- When updating E2E_BUGS_TRACKING.json with fix status
- When documenting root cause analysis and solutions
- When preparing deployment checklists for bug fixes

## Core Principles

### 1. Anti-Hallucination Protocol (MANDATORY)
**NEVER declare a bug "fixed" without test verification:**

- Code written ≠ Code working
- Required for "FIXED" status:
  1. ✅ Code written/modified
  2. ✅ Tests pass (automated) OR manual verification confirmed by user
  3. ✅ User confirms functionality (if applicable)

**Acceptable status language:**
- "Implementation ready for testing" (code written, not tested)
- "Code written, needs verification" (awaiting tests)
- "Tests passing, ready for review" (tests pass, awaiting user confirmation)
- "Complete and verified" (tests pass AND user confirms)

**BANNED without tests:**
- ❌ "Task complete!"
- ❌ "Successfully implemented!"
- ❌ "Feature working!"
- ❌ "Bug fixed!"

### 2. Evidence-Based Reporting
**Every claim must be backed by code evidence:**

- File paths (absolute)
- Line numbers (exact)
- Actual code snippets
- Search queries used
- Files examined count
- Functions analyzed list

### 3. Verification Metrics (Required in Every Report)
```markdown
## Verification Metrics
- Lines examined: [actual count]
- Files read completely: [list files with paths]
- Search queries used: [list patterns]
- Functions analyzed: [list names with line numbers]
- Contradictions resolved: [list any]
- Confidence: [100% only if all above complete]
```

## Report Structure

Use the template from `resources/report-template.md`:

1. **Executive Summary** (2-3 sentences)
   - Bugs fixed (with IDs)
   - Impact statement
   - Performance improvement metrics (if applicable)

2. **Root Cause Analysis**
   - File locations with line numbers
   - Code evidence (before fix)
   - Why the bug occurred
   - Search queries used to find issue

3. **Solution Implemented**
   - Code changes (before/after)
   - File paths and line numbers
   - Breaking changes (if any)
   - Backward compatibility status

4. **Performance Metrics** (if applicable)
   - Before fix measurements
   - After fix measurements
   - Improvement calculations

5. **Code Changes Summary**
   - Files modified (with line counts)
   - Functions updated
   - Breaking changes
   - Backward compatibility

6. **Testing Protocol Results**
   - Manual test scenarios (with ✅/❌)
   - Automated test results
   - Test commands used
   - Expected vs actual results

7. **Verification Metrics** (MANDATORY)
   - Lines examined
   - Files read
   - Search queries
   - Functions analyzed
   - Confidence level

8. **Impact Analysis**
   - User experience impact
   - Performance impact
   - Code maintainability impact

9. **Deployment Checklist**
   - [ ] Code changes implemented
   - [ ] Tests passing
   - [ ] No breaking changes (or documented)
   - [ ] Documentation updated
   - [ ] Ready for production

10. **Known Limitations & Future Improvements**

## Investigation Protocol

### Step 1: Search for Bug Evidence
```bash
# Use Desktop Commander search tools
desktop-commander:start_search path:/ pattern:"[bug_pattern]"
desktop-commander:get_more_search_results sessionId:[id]
```

### Step 2: Read Complete Functions
**NEVER read partial functions:**
```bash
desktop-commander:read_file path:[file] offset:0
# Continue reading until remaining=0
```

### Step 3: Document Search Queries
**Show your work:**
```markdown
**Search queries used:**
1. Pattern: `getElementById.*phone` - Found: 5 matches
2. Pattern: `handlePrevailingWage` - Found: 2 matches
3. Pattern: `clearAll.*function` - Found: 1 match
```

### Step 4: Verify in Code
**Find exact evidence:**
- Original bug location (file + line)
- Incorrect code snippet
- Root cause explanation
- Fix location (file + line)
- Corrected code snippet

### Step 5: Track Metrics
**Count everything:**
- Lines read (cumulative)
- Files examined (list with paths)
- Functions analyzed (list with signatures)
- Search iterations performed

## Using the Bug Reporter

### Generate Report
1. Investigate bug using search/read tools
2. Implement fix (or analyze existing fix)
3. Run tests (required before "FIXED" status)
4. Generate report from template
5. Update E2E_BUGS_TRACKING.json
6. Generate commit message

### Update Bug Tracking
```bash
node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-002" \
  --status "FIXED" \
  --fix-report "FIX_REPORT_F1.md"
```

### Generate Commit Message
```bash
node .claude/skills/energen-bug-reporter/scripts/generate-commit-message.cjs \
  --bug-id "E2E-002" \
  --report "FIX_REPORT_F1.md"
```

## Report Template Variables

When using `resources/report-template.md`, fill these sections:

- `{BUG_ID}` - E2E bug ID (e.g., "E2E-002")
- `{TITLE}` - Short bug description
- `{PRIORITY}` - P0 (Critical), P1 (High), P2 (Medium)
- `{STATUS}` - IDENTIFIED, FIXED, VERIFIED
- `{DATE}` - Fix date (YYYY-MM-DD)
- `{AGENT}` - Agent identifier (e.g., "F1", "F2")
- `{FILES_AFFECTED}` - Complete list with absolute paths
- `{ROOT_CAUSE}` - Detailed explanation with code evidence
- `{SOLUTION}` - Code changes with before/after
- `{TESTS}` - Test scenarios and results
- `{METRICS}` - Performance measurements (if applicable)

## Examples

### Example 1: Performance Bug (E2E-002)
```markdown
## Executive Summary

Fixed E2E-002: Clear All button performance issue causing 5+ second delay.

**Performance Improvement**: ~5000ms → <10ms (500x faster)

## Root Cause Analysis

**Location**: `C:/Ecalc/active/energen-calculator-v5.0/frontend/modules/global-handlers.js` (lines 1554-1576)

**Problem**: Inefficient DOM query causing massive performance bottleneck

[Code evidence with before/after snippets]
```

### Example 2: Data Integrity Bug (E2E-003)
```markdown
## Executive Summary

Fixed E2E-003: Phone and website fields not clearing on "Clear All".

**Impact**: Data integrity risk - customer data could mix between quotes.

## Root Cause Analysis

**Root Cause**: Selector only matched specific input types, missing:
- Phone field (type="tel")
- Website field (type="url")

[Search queries and evidence]
```

## Script Usage

### update-bug-tracking.cjs

**Purpose**: Update E2E_BUGS_TRACKING.json with fix status

**Parameters:**
- `--bug-id` (required): Bug ID (e.g., "E2E-002")
- `--status` (required): IDENTIFIED, FIXED, VERIFIED
- `--fix-report` (optional): Path to fix report markdown file
- `--fix-summary` (optional): Brief description of fix

**Example:**
```bash
node scripts/update-bug-tracking.cjs \
  --bug-id "E2E-002" \
  --status "FIXED" \
  --fix-report "FIX_REPORT_F1.md" \
  --fix-summary "Replaced querySelectorAll with direct field access"
```

### generate-commit-message.cjs

**Purpose**: Create conventional commit message from bug fix

**Parameters:**
- `--bug-id` (required): Bug ID
- `--report` (required): Path to fix report
- `--type` (optional): fix, feat, perf, refactor (default: fix)

**Example:**
```bash
node scripts/generate-commit-message.cjs \
  --bug-id "E2E-002" \
  --report "FIX_REPORT_F1.md" \
  --type "perf"
```

**Output:**
```
perf(ui): Clear All button performance and completeness

- Fix E2E-002: Reduce Clear All delay from 5000ms to <10ms (500x faster)
- Fix E2E-003: Include phone (tel) and website (url) fields in clearing
- Replace slow querySelectorAll with fast direct field access by ID

Performance: O(n) DOM scan → O(1) direct field access
Fields cleared: 10/13 → 13/13 (100% coverage)
```

## Testing Requirements

### Before Declaring "FIXED"

**Option 1: Automated Tests**
```bash
npm test
# OR
node test-[feature]-validation.cjs
```

**Option 2: Manual Verification**
1. Document test steps in report
2. Execute each step
3. Mark results (✅ PASS / ❌ FAIL)
4. Get user confirmation if applicable

**Option 3: Integration Tests**
```bash
node tests/comprehensive-e2e-test-suite.cjs
```

### Test Documentation Template

```markdown
## Testing Protocol Results

### Manual Test Scenarios

✅ **Test 1: [Scenario Name]**
- Action: [What user does]
- Expected: [What should happen]
- Result: PASS - [Actual result]

❌ **Test 2: [Scenario Name]**
- Action: [What user does]
- Expected: [What should happen]
- Result: FAIL - [Actual result and error]

### Automated Tests

```bash
$ npm test
> 15 passing (342ms)
```

[Include test output]
```

## Quality Gates

### Minimum Requirements for "FIXED" Status

1. ✅ Root cause identified with code evidence
2. ✅ Solution implemented
3. ✅ Tests passing (automated OR manual with user confirmation)
4. ✅ No breaking changes (or documented with migration guide)
5. ✅ Verification metrics at 100% confidence
6. ✅ Deployment checklist complete

### Minimum Requirements for "VERIFIED" Status

1. ✅ All "FIXED" requirements met
2. ✅ Deployed to production (or staging)
3. ✅ User acceptance testing complete
4. ✅ No regression bugs reported
5. ✅ Monitoring confirms fix effectiveness

## Common Pitfalls

### ❌ DON'T DO THIS:
```markdown
## Status: FIXED

I've implemented the fix by updating the code.

[Shows code changes but no tests]
```

### ✅ DO THIS:
```markdown
## Status: Implementation ready for testing

Code changes implemented. Running tests...

[After tests pass]

## Status: FIXED

Tests passing. All verification complete.

**Test Results:**
```bash
$ npm test
> All tests passing
```
```

## Report Naming Convention

**Pattern**: `FIX_REPORT_{AGENT_ID}.md`

Examples:
- `FIX_REPORT_F1.md` - Agent F1's first fix
- `FIX_REPORT_F2.md` - Agent F2's fix
- `FIX_REPORT_F3.md` - Agent F3's fix

**Multi-bug reports**: Use primary bug ID in title but document all bugs fixed

## Integration with Project Workflow

1. **Bug Discovery** → E2E_BUGS_TRACKING.json (status: IDENTIFIED)
2. **Investigation** → Use this skill to generate report
3. **Implementation** → Code changes with evidence
4. **Testing** → Required before "FIXED" status
5. **Report Generation** → Use template
6. **Tracking Update** → Run update-bug-tracking.js
7. **Commit** → Use generate-commit-message.js
8. **Deploy** → Follow deployment checklist

## Additional Resources

- **Report Template**: `resources/report-template.md`
- **Bug Tracking Schema**: `resources/bug-tracking-schema.json`
- **Example Reports**: `FIX_REPORT_F1.md` through `FIX_REPORT_F6.md`
- **E2E Bug Tracker**: `E2E_BUGS_TRACKING.json`
- **Anti-Hallucination Protocol**: `.claude/ANTI_HALLUCINATION_PROTOCOL.md`

## Success Metrics

**Good Report Checklist:**
- [ ] Executive summary is 2-3 sentences
- [ ] Root cause has file + line numbers
- [ ] Code evidence shown (before/after)
- [ ] Search queries documented
- [ ] Tests documented (passing or manual verification)
- [ ] Verification metrics at 100%
- [ ] Deployment checklist complete
- [ ] No "complete" claims without test verification
- [ ] All file paths are absolute
- [ ] Performance metrics included (if applicable)

---

**Remember**: The goal is not speed, but accuracy. A thorough, evidence-based report that would stand up to peer review is more valuable than a quick summary with unverified claims.


## Changelog

### v1.1.0 (2025-10-18)
- ✅ Added comprehensive USAGE_EXAMPLES.md with 10 scenarios
- ✅ Enhanced anti-hallucination enforcement ("no completion without tests")
- ✅ Improved error messaging and user guidance
- ✅ Added integration examples with other skills

### v1.0.0 (2025-10-17)
- Initial release with standardized bug reporting
- E2E_BUGS_TRACKING.json integration
- Fix report template system
- Conventional commit message generation

