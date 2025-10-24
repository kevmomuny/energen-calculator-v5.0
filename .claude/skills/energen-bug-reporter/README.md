# Energen Bug Reporter - Claude Skill

**Version**: 1.0.0
**Priority**: 3
**Status**: Complete

## Overview

The Energen Bug Reporter is a Claude Skill for generating standardized, evidence-based bug fix reports that enforce the Energen project's anti-hallucination protocol and quality standards.

## Features

### Core Capabilities
- ✅ Standardized bug fix report generation
- ✅ Evidence-based root cause analysis
- ✅ Anti-hallucination protocol enforcement
- ✅ E2E_BUGS_TRACKING.json management
- ✅ Conventional commit message generation
- ✅ Verification metrics tracking
- ✅ Test-first completion validation

### Key Principles

1. **No Completion Without Tests**
   - Code written ≠ Code working
   - Tests required before "FIXED" status
   - Clear distinction between "ready for testing" and "complete"

2. **Evidence-Based Reporting**
   - File paths (absolute)
   - Line numbers (exact)
   - Actual code snippets
   - Search queries documented
   - Functions fully analyzed

3. **Comprehensive Verification**
   - Lines examined count
   - Files read completely
   - Search patterns used
   - Contradictions resolved
   - 100% confidence required

## Directory Structure

```
.claude/skills/energen-bug-reporter/
├── SKILL.md                           # Main skill definition
├── README.md                          # This file
├── scripts/
│   ├── update-bug-tracking.cjs        # Update E2E_BUGS_TRACKING.json
│   └── generate-commit-message.cjs    # Generate conventional commit
└── resources/
    ├── report-template.md             # Fix report template
    └── bug-tracking-schema.json       # Bug entry schema
```

## Installation

The skill is installed by default in the Energen Calculator v5.0 project.

**Location**: `C:/Ecalc/active/energen-calculator-v5.0/.claude/skills/energen-bug-reporter/`

## Usage

### 1. Activate the Skill

In Claude Code or Claude Desktop:
```
Use the energen-bug-reporter skill to investigate and document bug E2E-002
```

### 2. Investigation Protocol

The skill will guide you through:

1. **Search for Bug Evidence**
   ```bash
   desktop-commander:start_search path:/ pattern:"clearAll"
   desktop-commander:get_more_search_results
   ```

2. **Read Complete Functions**
   ```bash
   desktop-commander:read_file path:[file] offset:0
   # Continue until remaining=0
   ```

3. **Document Search Queries**
   - Pattern searched
   - Results found
   - Evidence extracted

4. **Verify in Code**
   - Original bug location
   - Incorrect code
   - Root cause
   - Fix implementation

### 3. Generate Report

Using `resources/report-template.md`:

```markdown
# Fix Report F1 - Clear All Button Issues

**Bug ID**: E2E-002
**Priority**: P0
**Status**: FIXED
**Date**: 2025-10-12
**Agent**: F1

## Executive Summary
[Your summary here]

...
```

### 4. Update Bug Tracking

```bash
cd .claude/skills/energen-bug-reporter
node scripts/update-bug-tracking.cjs \
  --bug-id "E2E-002" \
  --status "FIXED" \
  --fix-report "FIX_REPORT_F1.md" \
  --fix-summary "Replaced querySelectorAll with direct field access"
```

### 5. Generate Commit Message

```bash
node scripts/generate-commit-message.cjs \
  --bug-id "E2E-002" \
  --report "FIX_REPORT_F1.md" \
  --type "perf"
```

## Example Workflow

### Scenario: Fix Performance Bug E2E-002

**Step 1: Investigation**
```
Claude: Use energen-bug-reporter skill to investigate E2E-002

[Skill executes:]
1. Read E2E_BUGS_TRACKING.json entry for E2E-002
2. Search for "clearAll" function in codebase
3. Read frontend/modules/global-handlers.js completely
4. Analyze clearAll() function (lines 1554-1576)
5. Document root cause: querySelectorAll on 4458-line DOM
```

**Step 2: Implementation**
```
Claude: Fix the performance issue

[Skill verifies:]
1. Code changed from querySelectorAll to getElementById array
2. Complexity reduced from O(n) to O(1)
3. Breaking changes: None
```

**Step 3: Testing** (REQUIRED)
```
User: Run manual test - clicking Clear All

[Results:]
✅ Response time: <10ms (was 5000ms)
✅ All fields cleared (13/13)
✅ No UI freeze
```

**Step 4: Report Generation**
```
Claude: Generate fix report using template

[Report includes:]
- Executive summary
- Root cause with code evidence
- Solution with before/after code
- Performance metrics (5000ms → <10ms)
- Test results (all passing)
- Verification metrics (100% confidence)
```

**Step 5: Tracking Update**
```bash
$ node scripts/update-bug-tracking.cjs \
    --bug-id "E2E-002" \
    --status "FIXED" \
    --fix-report "FIX_REPORT_F1.md"

✅ Bug E2E-002 updated successfully
   IDENTIFIED → FIXED
   Report: FIX_REPORT_F1.md
```

**Step 6: Commit**
```bash
$ node scripts/generate-commit-message.cjs \
    --bug-id "E2E-002" \
    --report "FIX_REPORT_F1.md" \
    --type "perf"

Generated:
perf(ui): Clear All button performance and completeness

- Fix E2E-002: Reduce Clear All delay from 5000ms to <10ms (500x faster)
- Replace slow querySelectorAll with fast direct field access by ID

Performance: O(n) DOM scan → O(1) direct field access
```

## Quality Gates

### Minimum for "FIXED" Status

- ✅ Root cause identified with code evidence
- ✅ Solution implemented
- ✅ Tests passing (automated OR manual with user confirmation)
- ✅ No breaking changes (or documented)
- ✅ Verification metrics at 100% confidence
- ✅ Deployment checklist complete

### Minimum for "VERIFIED" Status

- ✅ All "FIXED" requirements met
- ✅ Deployed to production/staging
- ✅ User acceptance testing complete
- ✅ No regression bugs
- ✅ Monitoring confirms effectiveness

## Scripts Reference

### update-bug-tracking.cjs

**Purpose**: Update E2E_BUGS_TRACKING.json

**Parameters**:
- `--bug-id` (required): Bug ID (e.g., "E2E-002")
- `--status` (required): IDENTIFIED, FIXED, VERIFIED
- `--fix-report` (optional): Path to fix report
- `--fix-summary` (optional): Brief fix description
- `--fixes-applied` (optional): JSON array of fixes
- `--verification` (optional): Verification notes

**Example**:
```bash
node scripts/update-bug-tracking.cjs \
  --bug-id "E2E-002" \
  --status "FIXED" \
  --fix-report "FIX_REPORT_F1.md" \
  --fix-summary "Performance optimization" \
  --fixes-applied '["Replaced querySelectorAll", "Added direct field access"]'
```

### generate-commit-message.cjs

**Purpose**: Generate conventional commit message

**Parameters**:
- `--bug-id` (required): Bug ID
- `--report` (required): Path to fix report
- `--type` (optional): fix, feat, perf, refactor (default: fix)
- `--scope` (optional): Commit scope (default: auto-detected)
- `--output` (optional): Write to file instead of stdout

**Example**:
```bash
node scripts/generate-commit-message.cjs \
  --bug-id "E2E-002" \
  --report "../../FIX_REPORT_F1.md" \
  --type "perf" \
  --scope "ui" \
  --output "../../.git/COMMIT_MSG"
```

## Templates

### Report Template

**File**: `resources/report-template.md`

**Sections**:
1. Executive Summary
2. Root Cause Analysis
3. Solution Implemented
4. Performance Metrics
5. Code Changes Summary
6. Testing Protocol Results
7. Verification Metrics
8. Impact Analysis
9. Deployment Checklist
10. Known Limitations

### Bug Tracking Schema

**File**: `resources/bug-tracking-schema.json`

**Required Fields**:
- `id`: Bug ID (E2E-XXX)
- `title`: Bug title
- `severity`: CRITICAL, HIGH, MEDIUM, LOW
- `priority`: P0, P1, P2, P3
- `status`: IDENTIFIED, FIXED, VERIFIED
- `component`: Component/module affected
- `discovered_by`: Who found it
- `discovered_date`: When found (YYYY-MM-DD)

**Optional Fields**:
- `fixed_date`: When fixed
- `verified_date`: When verified
- `fix_report`: Report path
- `fix_summary`: Brief summary
- `fixes_applied`: Array of fixes
- `files_affected`: Files changed
- `performance_impact`: Before/after metrics

## Best Practices

### DO:
- ✅ Read complete functions (not snippets)
- ✅ Document all search queries used
- ✅ Show actual code evidence (before/after)
- ✅ Track verification metrics (lines, files, queries)
- ✅ Run tests before declaring "FIXED"
- ✅ Use absolute file paths
- ✅ Include performance metrics when applicable

### DON'T:
- ❌ Declare "complete" without tests
- ❌ Use relative file paths
- ❌ Skip verification metrics
- ❌ Claim fixes without evidence
- ❌ Ignore search query documentation
- ❌ Read partial functions
- ❌ Skip deployment checklist

## Examples

### Good Report (100% Confidence)
```markdown
## Verification Metrics

- ✅ Lines examined: 1906 (complete global-handlers.js)
- ✅ Files read completely: 3 (global-handlers.js, integrated-ui.html sections)
- ✅ Search queries used: 2 (`id="phone"`, `id="website"`)
- ✅ Functions analyzed: 1 (clearAll, lines 1554-1576)
- ✅ Contradictions resolved: 0
- ✅ Confidence: 100%

## Root Cause

**Location**: `C:/Ecalc/active/energen-calculator-v5.0/frontend/modules/global-handlers.js`
(lines 1554-1576)

**Problem**: Inefficient DOM query

```javascript
// BEFORE (lines 1554-1558)
document.querySelectorAll('input[type="text"], input[type="email"]')
  .forEach(input => {
    input.value = '';
  });
```

**Why**: querySelectorAll scans entire 4458-line DOM tree...
```

### Bad Report (Unverifiable)
```markdown
## Status: FIXED

The bug has been fixed by updating the code.

[No code evidence, no line numbers, no tests]
```

## Troubleshooting

### Scripts Not Running

**Problem**: `node: command not found`

**Solution**:
```bash
# Install Node.js
# Or use full path:
/path/to/node scripts/update-bug-tracking.js --bug-id E2E-002 --status FIXED
```

### Bug Not Found

**Problem**: `Bug E2E-XXX not found in tracking data`

**Solution**:
```bash
# Check available bugs:
cat E2E_BUGS_TRACKING.json | grep '"id":'

# Or list all bugs:
node scripts/update-bug-tracking.cjs --list
```

### Invalid Status

**Problem**: `Invalid status "DONE"`

**Solution**:
Use valid statuses only: IDENTIFIED, FIXED, VERIFIED, WONTFIX, DUPLICATE

## Integration

### With Git Workflow

```bash
# 1. Fix bug
# 2. Run tests
npm test

# 3. Update tracking
node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-002" --status "FIXED" --fix-report "FIX_REPORT_F1.md"

# 4. Generate commit message
node .claude/skills/energen-bug-reporter/scripts/generate-commit-message.cjs \
  --bug-id "E2E-002" --report "FIX_REPORT_F1.md" --output ".git/COMMIT_MSG"

# 5. Commit
git add .
git commit -F .git/COMMIT_MSG
```

### With CI/CD

```yaml
# .github/workflows/bug-tracking.yml
name: Update Bug Tracking

on:
  push:
    paths:
      - 'FIX_REPORT_*.md'

jobs:
  update-tracking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Extract bug ID from report
        run: |
          BUG_ID=$(grep -oP 'Bug ID.*E2E-\K\d+' FIX_REPORT_*.md | head -1)
          echo "BUG_ID=E2E-$BUG_ID" >> $GITHUB_ENV
      - name: Update tracking
        run: |
          node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
            --bug-id $BUG_ID --status FIXED --fix-report ${{ github.event.head_commit.message }}
```

## Support

### Documentation
- Main skill definition: `SKILL.md`
- Report examples: `FIX_REPORT_F*.md` (project root)
- Bug tracking: `E2E_BUGS_TRACKING.json`
- Anti-hallucination protocol: `.claude/ANTI_HALLUCINATION_PROTOCOL.md`

### Getting Help
1. Read `SKILL.md` for detailed instructions
2. Check example reports (FIX_REPORT_F1-F6)
3. Review bug tracking schema
4. Consult anti-hallucination protocol

## Version History

### 1.0.0 (2025-10-17)
- ✅ Initial release
- ✅ Report template
- ✅ Bug tracking update script
- ✅ Commit message generator
- ✅ Schema definition
- ✅ Complete documentation

## License

Part of Energen Calculator v5.0 project.

---

**Built with**: Claude Code
**Maintained by**: Energen Team
**Last updated**: 2025-10-17
