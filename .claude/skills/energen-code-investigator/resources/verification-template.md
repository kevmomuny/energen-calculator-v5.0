# Code Investigation Report Template

**Investigation Date:** [YYYY-MM-DD HH:MM:SS]
**Investigation Type:** [assessment | bug_fix | feature_verification | completion_claim]
**Investigator:** [AI Agent Name/Version]

---

## 🔍 Verification Metrics

### Evidence Gathered
- **Lines examined:** [exact count] (Minimum required: [minimum for type])
- **Files read completely:** [count]
  - [file1.ext] ([line count] lines)
  - [file2.ext] ([line count] lines)
  - [file3.ext] ([line count] lines)
- **Complete functions analyzed:** [count]
  - [functionName1] (lines [start-end])
  - [functionName2] (lines [start-end])
  - [functionName3] (lines [start-end])
- **Search queries used:** [count]
  - `[query1]` → [results count] matches
  - `[query2]` → [results count] matches
  - `[query3]` → [results count] matches

### Verification Process
1. **[Action 1]** - [Description of search/read action]
   - Query: `[search pattern]`
   - Results: [count] matches in [file list]
2. **[Action 2]** - [Description]
   - File: [file path]
   - Lines read: [count]
3. **[Continue for all verification steps...]**

### Search Results Summary
- **Total searches performed:** [count]
- **Total files scanned:** [count]
- **Pattern variations searched:** [count]
- **Matches found:** [count]
- **False positives filtered:** [count]

---

## 📊 Confidence Assessment

- **Confidence Level:** [percentage]%
- **Confidence Category:** [High (90-100%) | Medium (70-89%) | Low (<70%)]
- **Minimums Met:** [Yes/No]
  - Lines: [✅/❌] ([actual] / [required])
  - Files: [✅/❌] ([actual] / [required])
  - Functions: [✅/❌] ([actual] / [required])
  - Queries: [✅/❌] ([actual] searches performed)
- **Would I bet $10,000?** [Yes/No]
- **Rationale:** [Explanation of confidence level based on evidence gathered]

---

## 🔬 Code Evidence

### Finding 1: [Title]
**Location:** `[file path]:[line numbers]`
**Verification:** [Complete/Partial]

```javascript
// Actual code from codebase:
[code snippet]
```

**Analysis:** [What this code proves/disproves]

### Finding 2: [Title]
**Location:** `[file path]:[line numbers]`
**Verification:** [Complete/Partial]

```javascript
// Actual code from codebase:
[code snippet]
```

**Analysis:** [What this code proves/disproves]

### [Continue for all findings...]

---

## ⚠️ Contradictions Resolved

### Contradiction 1
- **Documentation Claim:** [What docs/previous reports said]
- **Actual Code:** [What code shows]
- **Source:** `[file path]:[line numbers]`
- **Resolution:** CODE WINS - [Explanation]
- **Action Taken:** [Updated docs / Noted discrepancy / etc.]

### [Continue for all contradictions...]

---

## 🧪 Test Verification

### Tests Found
- **Test file:** [path to test file]
- **Test coverage:** [percentage or count]
- **Tests passing:** [✅/❌] [count passed / count total]
- **Test commands used:** `[command]`

### Test Results
```bash
[Test output if run]
```

**Analysis:** [What tests prove about implementation status]

---

## ✅ Completion Status

**Code Status:**
- [ ] Code written/modified
- [ ] Code read completely
- [ ] Implementation verified in codebase

**Test Status:**
- [ ] Tests exist
- [ ] Tests executed
- [ ] Tests passing
- [ ] Manual verification completed

**User Confirmation:**
- [ ] User reviewed findings
- [ ] User confirmed functionality
- [ ] User approved completion

**Overall Status:** [ready for testing | tests passing | complete and verified | incomplete]

**Status Rationale:** [Explanation of why this status assigned]

---

## 📝 Investigation Summary

### What Was Investigated
[Brief description of what was being verified/analyzed]

### Key Findings
1. [Finding 1 with evidence reference]
2. [Finding 2 with evidence reference]
3. [Finding 3 with evidence reference]

### Unverified Claims
**The following could NOT be verified in code:**
- [Claim 1] - [Reason why not verified]
- [Claim 2] - [Reason why not verified]

### Recommendations
1. [Recommendation 1 based on findings]
2. [Recommendation 2 based on findings]
3. [Recommendation 3 based on findings]

---

## 🚨 Known Limitations

### Incomplete Verification
- [Area not fully verified] - [Reason]
- [Area not fully verified] - [Reason]

### Additional Investigation Needed
- [What needs more investigation] - [Estimated effort]
- [What needs more investigation] - [Estimated effort]

### Assumptions Made
- [Assumption 1] - [Basis for assumption]
- [Assumption 2] - [Basis for assumption]

**Note:** For 100% confidence, the above limitations must be addressed.

---

## 📚 Files Referenced

### Primary Files (Fully Read)
1. `[file path]` - [line count] lines
2. `[file path]` - [line count] lines
3. `[file path]` - [line count] lines

### Secondary Files (Partially Read/Searched)
1. `[file path]` - [lines read] / [total lines]
2. `[file path]` - [lines read] / [total lines]

### Supporting Files (Referenced)
1. `[file path]` - [Purpose of reference]
2. `[file path]` - [Purpose of reference]

---

## 🔄 Session Memory Updates

**Verified Facts Added:**
- [Fact 1]: [Brief description]
- [Fact 2]: [Brief description]

**Code Changes Documented:**
- [Change 1]: [File, lines, description]
- [Change 2]: [File, lines, description]

**Architecture Notes Added:**
- [Key]: [Value/Description]

---

## 🎯 Next Steps

**For User:**
1. [Action user should take]
2. [Action user should take]

**For Next Investigation:**
1. [What should be investigated next]
2. [What should be investigated next]

**For Documentation:**
1. [What docs should be updated]
2. [What docs should be updated]

---

## 📎 Appendix

### Full Search Log
```
[Complete log of all searches performed]
Query: [pattern]
Files: [list]
Matches: [count]
Results: [summary]
```

### Function Signatures Analyzed
```javascript
// [functionName1]
[complete function signature with params and return type]

// [functionName2]
[complete function signature with params and return type]
```

### Git Information
- **Latest commit:** [hash] - [date]
- **Branch:** [branch name]
- **Files modified recently:** [list]

---

**Report Generated:** [timestamp]
**Tool Version:** energen-code-investigator v1.0.0
**Protocol:** Anti-Hallucination Enforcement
**Signed:** [AI Agent with $10K bet commitment]
