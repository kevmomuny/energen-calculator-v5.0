# Fix Report {AGENT_ID} - {TITLE}

**Bug ID**: {BUG_ID}
**Priority**: {PRIORITY}
**Status**: {STATUS}
**Date**: {DATE}
**Agent**: {AGENT}

---

## Executive Summary

[2-3 sentence summary of bugs fixed and impact]

**Performance Improvement**: [If applicable: Before → After metrics]

---

## Bug {BUG_ID}: {TITLE}

### Root Cause Analysis

**Location**: `{FILE_PATH}` (lines {LINE_START}-{LINE_END})

**Problem**: [Detailed explanation of what was wrong]

```javascript
// BEFORE (PROBLEM CODE)
{CODE_BEFORE}
```

**Why This Was Wrong**:
1. [Reason 1]
2. [Reason 2]
3. [Impact explanation]

**Evidence from Code Search**:
```bash
Search: {SEARCH_PATTERN}  → Found: {RESULT_COUNT} matches
{SEARCH_RESULTS}
```

---

## Solution Implemented

### Approach

**Strategy**: [High-level description of fix strategy]

```javascript
// AFTER (FIXED CODE)
{CODE_AFTER}
```

### Key Changes

1. **{CHANGE_1}**
   - [Details]

2. **{CHANGE_2}**
   - [Details]

3. **{CHANGE_3}**
   - [Details]

---

## Performance Metrics

### Before Fix
- **Metric 1**: {VALUE_BEFORE}
- **Metric 2**: {VALUE_BEFORE}
- **User Experience**: {UX_BEFORE}

### After Fix
- **Metric 1**: {VALUE_AFTER}
- **Metric 2**: {VALUE_AFTER}
- **User Experience**: {UX_AFTER}

### Performance Improvement
- **Speed Increase**: {IMPROVEMENT_FACTOR}
- **Algorithmic Complexity**: {COMPLEXITY_BEFORE} → {COMPLEXITY_AFTER}
- **Additional Improvements**: {OTHER_IMPROVEMENTS}

---

## Code Changes Summary

**Files Modified**:
1. `{FILE_1}` (lines {LINES_1})
2. `{FILE_2}` (lines {LINES_2})

**Functions Updated**:
- `{FUNCTION_1}` - {FUNCTION_1_DESCRIPTION}
- `{FUNCTION_2}` - {FUNCTION_2_DESCRIPTION}

**Breaking Changes**: {BREAKING_CHANGES_YN}

**Backward Compatibility**: {COMPATIBILITY_STATUS}

---

## Testing Protocol Results

### Manual Test Scenarios

✅ **Test 1: {TEST_NAME_1}**
- Action: {TEST_ACTION_1}
- Expected: {TEST_EXPECTED_1}
- Result: PASS - {TEST_RESULT_1}

✅ **Test 2: {TEST_NAME_2}**
- Action: {TEST_ACTION_2}
- Expected: {TEST_EXPECTED_2}
- Result: PASS - {TEST_RESULT_2}

❌ **Test 3: {TEST_NAME_3}** [If any tests failed]
- Action: {TEST_ACTION_3}
- Expected: {TEST_EXPECTED_3}
- Result: FAIL - {TEST_RESULT_3}

### Automated Tests

```bash
{TEST_COMMAND}
{TEST_OUTPUT}
```

**Test Summary**: {TEST_SUMMARY}

---

## Verification Metrics

### Code Quality
- ✅ Lines examined: {LINES_COUNT}
- ✅ Files read completely: {FILES_LIST}
- ✅ Search queries used: {SEARCH_COUNT}
  - Query 1: `{QUERY_1}` - Found: {RESULTS_1}
  - Query 2: `{QUERY_2}` - Found: {RESULTS_2}
- ✅ Functions analyzed: {FUNCTIONS_COUNT}
  - {FUNCTION_LIST}
- ✅ Contradictions resolved: {CONTRADICTIONS}
- ✅ Confidence: {CONFIDENCE_LEVEL}%

### Evidence-Based Findings
- {FINDING_1}
- {FINDING_2}
- {FINDING_3}

---

## Impact Analysis

### User Experience
- **Before**: {UX_BEFORE}
- **After**: {UX_AFTER}
- **User Satisfaction**: {SATISFACTION_IMPACT}

### Application Performance
- **Memory**: {MEMORY_IMPACT}
- **CPU**: {CPU_IMPACT}
- **Responsiveness**: {RESPONSIVENESS_IMPACT}

### Code Maintainability
- **Clarity**: {CLARITY_IMPACT}
- **Extensibility**: {EXTENSIBILITY_IMPACT}
- **Debuggability**: {DEBUGGABILITY_IMPACT}

---

## Deployment Checklist

- [ ] Code changes implemented
- [ ] Performance improvement verified
- [ ] All tests passing
- [ ] No breaking changes introduced
- [ ] Code follows existing style
- [ ] Comments explain changes
- [ ] Fix report documented
- [ ] Manual testing in production environment
- [ ] User acceptance testing
- [ ] E2E_BUGS_TRACKING.json updated

---

## Known Limitations & Future Improvements

### Current Limitations
{LIMITATIONS}

### Future Enhancements (Optional)
1. {ENHANCEMENT_1}
2. {ENHANCEMENT_2}
3. {ENHANCEMENT_3}

---

## Conclusion

{CONCLUSION_SUMMARY}

**Status**: {FINAL_STATUS}

**Recommendation**: {DEPLOYMENT_RECOMMENDATION}

---

## Technical Details

### Files Modified
```
{FILES_MODIFIED_LIST}
```

### Commit Message Suggestion
```
{COMMIT_TYPE}({COMMIT_SCOPE}): {COMMIT_SUBJECT}

- Fix {BUG_ID}: {FIX_DESCRIPTION}
{ADDITIONAL_CHANGES}

{PERFORMANCE_NOTE}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Verification Command
```bash
{VERIFICATION_COMMAND}

# Expected: {EXPECTED_OUTPUT}
```

---

**Report Generated**: {DATE}
**Agent**: {AGENT}
**Bugs Fixed**: {BUGS_FIXED_LIST}
**Performance Gain**: {PERFORMANCE_SUMMARY}
