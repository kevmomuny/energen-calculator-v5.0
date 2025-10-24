---
name: energen-code-investigator
version: 1.0.0
description: Anti-hallucination code investigation enforcing complete verification, evidence-based claims, and accurate metrics tracking for the Energen Calculator v5.0 project
category: analysis
author: Energen Team
tags: [verification, code-analysis, anti-hallucination, evidence-based, metrics-tracking]
---

# Energen Code Investigator Skill

**Purpose:** Enforce anti-hallucination protocols during code investigations to ensure complete verification, evidence-based claims, and accurate reporting.

---

## AUTOMATIC CONTEXT LOADING

When this skill is activated, **automatically and silently** load these files in order:

```javascript
// PHASE 1: Core Context (< 1000 tokens)
1. Read .claude/CLAUDE.md (instructions)
2. Read SYSTEM_CORE.md (architecture)
3. Read SESSION_MEMORY.json (verified facts)
4. Read CONTEXT_INDEX.md (file selection guide)

// PHASE 2: Task-Specific Context (load based on investigation type)
// See "Investigation Types" section below
```

**CRITICAL:** These files provide verified facts. Trust SESSION_MEMORY.json over assumptions.

---

## INVESTIGATION TYPES & MINIMUM REQUIREMENTS

### 1. ASSESSMENT / ANALYSIS
**Trigger words:** "assess", "analyze", "evaluate", "review", "complete status"

**Minimum Requirements:**
- Lines examined: 1000+
- Files read completely: 5+
- Complete functions analyzed: 5+
- Search queries performed: Show all queries and results
- Confidence: Only 100% if all minimums met

**Additional Context to Load:**
- `src/api/complete-calculation-engine.cjs` (core logic)
- `src/api/server-secure.cjs` (API endpoints)
- `frontend/integrated-ui.html` (UI implementation)
- Relevant test files (behavior verification)

### 2. BUG FIX INVESTIGATION
**Trigger words:** "bug", "error", "broken", "not working", "issue"

**Minimum Requirements:**
- Lines examined: 200+
- Files read completely: 2+
- Complete functions analyzed: 2+
- Search queries performed: Show all queries
- Confidence: 100% requires reproduction verification

**Additional Context to Load:**
- Search for error message/function name
- Read complete function implementation
- Check related test files
- Review SESSION_MEMORY.json for recent changes

### 3. FEATURE VERIFICATION
**Trigger words:** "verify", "check if", "does it have", "is there", "working"

**Minimum Requirements:**
- Lines examined: 500+
- Files read completely: 3+
- Complete functions analyzed: 3+
- Search queries performed: Show all variations searched
- Confidence: 100% requires code evidence + tests

**Additional Context to Load:**
- Search all pattern variations (exact, partial, case-insensitive)
- Read both frontend and backend implementations
- Check test coverage
- Verify in actual running code

### 4. COMPLETION CLAIMS
**Trigger words:** "complete", "done", "finished", "implemented"

**Minimum Requirements:**
- Lines examined: 2000+
- Files read completely: 10+
- Complete functions analyzed: 10+
- Search queries performed: Comprehensive codebase scan
- Tests: MUST pass (automated or manual verification)
- Confidence: 100% requires passing tests + user confirmation

**NEVER declare complete without:**
1. ✅ Code written/modified
2. ✅ Tests pass (or manual verification confirmed)
3. ✅ User confirms functionality

---

## BANNED PHRASES (Without Evidence)

**NEVER use these without complete verification:**

1. ❌ "No backend implementation" → REQUIRES: Complete search results shown
2. ❌ "Based on documentation" → REQUIRES: Code verification first
3. ❌ "Service X has no backend" → REQUIRES: Full codebase scan
4. ❌ "It appears that..." → REQUIRES: Concrete code evidence
5. ❌ "Should work" / "Probably implements" → REQUIRES: Actual verification
6. ❌ "Port X is correct" → REQUIRES: server-secure.cjs verification
7. ❌ "Missing functionality" → REQUIRES: Comprehensive search shown
8. ❌ "Task complete!" → REQUIRES: Tests passing
9. ❌ "Successfully implemented!" → REQUIRES: Verification confirmed

**INSTEAD:** Show search queries, files examined, actual results found, code evidence.

---

## SEARCH PROTOCOL (Mandatory for "Missing" Claims)

```javascript
// For ANY claim that something is missing/absent:

const searchProtocol = {
  step1: "Search exact name/pattern",
  step2: "Search partial variations (case-insensitive)",
  step3: "Search related terms and synonyms",
  step4: "Check both frontend and backend",
  step5: "Verify in test files",
  step6: "Show ALL queries and results"
};

// Example: Verifying Service K implementation
const queries = [
  'ServiceK',           // Exact
  'getServiceK',        // Function name
  'case.*K',            // Switch case
  'battery',            // Related term
  'batteryReplacement'  // Full term
];

for (const query of queries) {
  console.log(`🔍 Searching: ${query}`);
  const results = await grep(query, '*.cjs');
  console.log(`📊 Found: ${results.length} matches`);
  // Show actual results in output
}
```

**RULE:** If you didn't show your search queries, your claim is invalid.

---

## DYNAMIC COMPLETE FILE READING

**NEVER hardcode line numbers. ALWAYS read files completely.**

```javascript
// Anti-pattern (WRONG):
await readFile('engine.cjs', 0, 100); // Only 100 lines? Incomplete!

// Correct pattern:
async function readComplete(filePath) {
  const info = await getFileInfo(filePath);
  console.log(`📄 File: ${filePath} (${info.lineCount} lines)`);

  let offset = 0;
  let totalLines = 0;
  const CHUNK_SIZE = 300;

  while (true) {
    const chunk = await readFile(filePath, offset, CHUNK_SIZE);
    totalLines += chunk.linesRead;

    if (chunk.remaining === 0) {
      console.log(`✅ Complete: Read ${totalLines} lines`);
      break;
    }
    offset += CHUNK_SIZE;
  }

  return totalLines;
}
```

**VERIFICATION:** Your metrics MUST show total lines read, not assumptions.

---

## CONTRADICTION RECONCILIATION

When documentation disagrees with code:

```javascript
if (SYSTEM_CORE.md !== actualCode) {
  // STEP 1: Code is TRUTH
  const truth = actualCode;

  // STEP 2: Note the contradiction
  console.log('⚠️ CONTRADICTION FOUND:');
  console.log(`Documentation says: ${SYSTEM_CORE.md}`);
  console.log(`Code shows: ${actualCode}`);

  // STEP 3: Report and optionally update docs
  console.log('✅ CODE WINS - Documentation may need update');

  // STEP 4: Update SESSION_MEMORY.json with verified fact
  await updateSessionMemory({
    verified_fact: truth,
    contradiction_resolved: true,
    source_file: filePath,
    line_numbers: [start, end]
  });
}
```

**RULE:** Code > Documentation. Always. No exceptions.

---

## OUTPUT FORMAT TEMPLATE

Every investigation response MUST include this metrics section:

```markdown
## 🔍 Verification Metrics

### Evidence Gathered
- **Lines examined:** [exact count] (Minimum: [required for task type])
- **Files read completely:** [list with line counts]
- **Complete functions analyzed:** [list function names]
- **Search queries used:** [list all patterns searched]
- **Search results:** [summary of findings]

### Verification Process
1. [First search/read action taken]
2. [Second search/read action taken]
3. [Continue for all verification steps...]

### Contradictions Resolved
- [List any docs vs code contradictions found]
- [Resolution: code evidence shown]

### Confidence Assessment
- **Confidence Level:** [percentage]
- **Rationale:** [Why this confidence level - based on minimums met]
- **Would I bet $10,000?** [Yes/No with explanation]

### Code Evidence
```language
[Actual code snippets supporting claims]
[Include file path and line numbers]
```

### Completion Status
- [ ] Code written/modified (if applicable)
- [ ] Tests pass (required for "complete" claims)
- [ ] User confirmation received (if applicable)
- **Status:** [ready for testing | tests passing | complete and verified]
```

**RULE:** No metrics section = Invalid investigation.

---

## VERIFICATION SCRIPT USAGE

Use provided scripts for deterministic tasks:

### Update Session Memory
```bash
# After verifying new facts:
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --fact "Service K backend implemented in complete-calculation-engine.cjs lines 505-520" \
  --verified true \
  --source "complete-calculation-engine.cjs" \
  --evidence "getBatteryService() method exists with 14 passing tests"
```

### Track Metrics
```bash
# During investigation:
node .claude/skills/energen-code-investigator/scripts/track-metrics.js \
  --lines 1247 \
  --files "server-secure.cjs,complete-calculation-engine.cjs,integrated-ui.html" \
  --functions "getServiceK,getBatteryService,calculateBatteryPrice" \
  --queries "ServiceK,getServiceK,battery,batteryReplacement" \
  --output .claude/skills/energen-code-investigator/resources/latest-metrics.json
```

---

## PROJECT-SPECIFIC PATTERNS TO VERIFY

Based on Energen Calculator v5.0 codebase:

### Always Verify (Don't Assume)
```javascript
const verificationChecklist = {
  port: "Check actual PORT in server-secure.cjs (may not be 3002)",
  serviceK: "Search complete-calculation-engine.cjs for getBatteryService()",
  custom: "Search for 'CUSTOM' in all *.cjs files",
  endpoints: "Read server-secure.cjs routes (actual vs documented)",
  testStatus: "Run actual tests, don't trust reports",
  fileLocations: "Files may have moved - search, don't assume"
};
```

### Common File Patterns
- Backend logic: `src/api/*.cjs`
- Frontend: `frontend/**/*.{html,js}`
- Tests: `test*.cjs` (root level)
- Settings: `frontend/config/default-settings.json`
- Context: `.claude/*.md`, `*.md` (root level)

### Service Implementation Search Pattern
```javascript
// To verify if a service is implemented:
const serviceSearches = {
  backend: [
    `getService${serviceLetter}`,
    `case '${serviceLetter}'`,
    `${serviceName}`,
  ],
  frontend: [
    `service-card-${serviceLetter.toLowerCase()}.html`,
    `data-service="${serviceLetter}"`,
    `#service${serviceLetter}`,
  ],
  tests: [
    `test-${serviceName}.cjs`,
    `describe.*Service ${serviceLetter}`,
  ]
};
```

---

## PERMISSION TO SAY "I DON'T KNOW"

**YOU ARE EXPLICITLY AUTHORIZED to say "I don't know" when:**

1. Verification would exceed context budget
2. Required files are inaccessible
3. Analysis incomplete due to complexity
4. More investigation needed for certainty
5. Tests haven't been run yet
6. User hasn't confirmed functionality

**Template Response:**
```markdown
## Investigation Status: INCOMPLETE

I cannot verify this claim without:
- Reading [specific files] completely (estimated [X] lines)
- Searching [specific patterns] comprehensively
- Examining [specific functions] in detail
- Running tests to confirm functionality

**Current Evidence:** [What I found so far]
**Missing:** [What's needed for 100% confidence]
**Recommendation:** [Next steps for verification]

Would you like me to proceed with deep verification?
(This will require reading [X] additional lines across [Y] files)
```

**REMEMBER:** Honest uncertainty > False confidence

---

## ENFORCEMENT RULES

### ❌ AUTOMATIC FAILURE (Invalid Investigation)
1. Making claims without showing search queries
2. Reporting issues without code verification
3. Reading <100 lines for any assessment
4. Trusting documentation over code
5. Using banned phrases without evidence
6. Creating unsolicited .md files (reports, summaries, guides)
7. Declaring completion without passing tests
8. Partial function reads (must read complete functions)
9. No metrics section in response
10. Confidence >50% without meeting minimums

### ✅ SUCCESS CRITERIA (Valid Investigation)
1. Every claim has code reference (file + line numbers)
2. Contradictions explicitly reconciled
3. Minimum line counts exceeded for task type
4. Search patterns shown with results
5. Metrics section complete
6. Would bet $10,000 on accuracy (or admitted uncertainty)
7. Files read completely (not partial)
8. Both frontend and backend verified (when applicable)
9. Tests referenced or run
10. Evidence-based conclusions only

---

## PARALLEL TOOL CALLING OPTIMIZATION

**Use parallel tool calls when tasks are independent:**

```javascript
// ✅ GOOD - Parallel independent reads
await Promise.all([
  readFile('server-secure.cjs'),
  readFile('complete-calculation-engine.cjs'),
  readFile('integrated-ui.html')
]);

// ✅ GOOD - Parallel independent searches
await Promise.all([
  grep('ServiceK', '*.cjs'),
  grep('battery', '*.cjs'),
  grep('getBatteryService', '*.cjs')
]);

// ❌ BAD - Sequential when parallel possible
await readFile('server.cjs');
await readFile('engine.cjs'); // Could be parallel!

// ✅ GOOD - Sequential when dependent
const searchResults = await grep('ServiceK', '*.cjs');
// Now read the matched files (depends on search results)
await readFile(searchResults[0].file);
```

**RULE:** Maximize parallel calls when no dependencies exist.

---

## ANTI-DOCUMENTATION-BLOAT PROTOCOL

### The Rule
**REPORTS GO IN CHAT. FILES ONLY WHEN EXPLICITLY REQUESTED.**

### Examples

❌ **NEVER DO THIS:**
```
"Let me create INVESTIGATION_REPORT.md..."
"I'll document findings in VERIFICATION_SUMMARY.md..."
"Creating ANALYSIS_COMPLETE.md..."
```

✅ **ALWAYS DO THIS:**
```
"Here's my investigation report: [detailed findings in chat]"
"Analysis complete. Summary: [in chat]"
[User says: "Save that to a file"]
"I'll write it to [filename].md..."
```

### Exceptions (Files You May Update)
- `SESSION_MEMORY.json` - Add verified facts
- `SYSTEM_CORE.md` - Update when architecture verified changed
- `BUG_LOG.md` - Document bugs found/fixed
- Files explicitly requested by user

### The Test
Before creating ANY .md file:
**"Did the user explicitly say 'write this to a file' or 'create a document'?"**
- If NO → Report in chat only
- If YES → Create the file

---

## ANTI-PREMATURE-COMPLETION PROTOCOL

### The Rule
**CODE WRITTEN ≠ CODE WORKING. TESTS REQUIRED FOR COMPLETION.**

### Completion Criteria (ALL Required)
1. ✅ Code written/modified
2. ✅ Tests pass (automated) OR manual verification confirmed by user
3. ✅ User confirms functionality (if applicable)

### Status Language Reference

| Actual Status | Correct Language | Wrong Language |
|---------------|------------------|----------------|
| Code written, not tested | "Implementation ready for testing" | ❌ "Task complete!" |
| Code written, not tested | "Code written, needs verification" | ❌ "Successfully implemented!" |
| Tests pass, no user confirm | "Tests passing, ready for review" | ❌ "Feature working!" |
| Tests pass + user confirms | "Complete and verified" | ✅ (now valid) |

### Before Declaring Completion
**Ask yourself:** "Have tests passed or has user manually verified this works?"
- If NO → Use "ready for testing/verification"
- If YES → May declare completion

---

## SKILL ACTIVATION WORKFLOW

When user invokes this skill:

```javascript
async function investigateCode(request) {
  // STEP 1: Auto-load context (silent)
  await loadContext([
    '.claude/CLAUDE.md',
    'SYSTEM_CORE.md',
    'SESSION_MEMORY.json',
    'CONTEXT_INDEX.md'
  ]);

  // STEP 2: Determine investigation type
  const type = classifyRequest(request);
  // → assessment | bug_fix | feature_verification | completion_claim

  // STEP 3: Load task-specific minimums
  const requirements = getRequirements(type);
  console.log(`📋 Investigation type: ${type}`);
  console.log(`📊 Minimums: ${requirements.lines} lines, ${requirements.files} files`);

  // STEP 4: Execute verification protocol
  const metrics = await executeVerification({
    patterns: extractSearchPatterns(request),
    files: identifyRelevantFiles(request),
    minimums: requirements
  });

  // STEP 5: Check if minimums met
  if (metrics.lineCount < requirements.lines) {
    console.warn(`⚠️ Insufficient verification: ${metrics.lineCount}/${requirements.lines} lines`);
    // Continue reading or admit uncertainty
  }

  // STEP 6: Generate evidence-based report
  return formatReport({
    metrics,
    evidence: metrics.codeSnippets,
    contradictions: metrics.contradictionsFound,
    confidence: calculateConfidence(metrics, requirements),
    status: determineCompletionStatus(metrics)
  });
}
```

---

## QUICK REFERENCE COMMANDS

```bash
# Start every session with:
1. Auto-load context files (silent)
2. Verify current state
3. Check SESSION_MEMORY.json for recent changes

# For any investigation:
1. Identify investigation type → Load minimums
2. Search all pattern variations → Show queries
3. Read complete files → Track lines
4. Generate metrics report → Include evidence
5. Assess confidence → Would you bet $10,000?

# For "missing" claims:
1. Search exact term
2. Search partial variations
3. Search related terms
4. Check frontend + backend + tests
5. Show ALL queries and results
6. Only then claim "missing" (with evidence)

# Before declaring "complete":
1. Code written? ✅
2. Tests pass? ✅
3. User confirmed? ✅
4. All three? → May declare complete
5. Missing any? → Use "ready for testing/verification"
```

---

## COMMITMENT CHECKLIST

When using this skill, I commit to:

- [ ] Read complete functions, not snippets
- [ ] Verify every claim in code
- [ ] Show my search queries and results
- [ ] Track metrics (lines, files, functions, queries)
- [ ] Choose accuracy over speed
- [ ] Say "I don't know" when verification incomplete
- [ ] Bet $10,000 on verified answers only
- [ ] NEVER create unsolicited .md files
- [ ] NEVER declare "complete" without passing tests
- [ ] Generate metrics section in every response
- [ ] Reconcile contradictions (code wins)
- [ ] Use parallel tool calls when possible
- [ ] Load context files automatically
- [ ] Meet minimum requirements for investigation type

**Remember:**
- Fast wrong answers = MORE work
- Thorough correct analysis = LESS total time
- "I don't know" is a valid and professional answer
- Code is truth, documentation is suggestion
- Tests must pass before claiming completion

---

## VERSION HISTORY

- **1.0.0** (2025-10-17): Initial release with anti-hallucination protocols
  - Auto-context loading
  - Investigation type classification
  - Minimum verification requirements
  - Banned phrases enforcement
  - Metrics tracking templates
  - Anti-documentation-bloat protocol
  - Anti-premature-completion protocol
  - Parallel tool calling optimization
  - Evidence-based reporting
  - Permission to say "I don't know"


## Changelog

### v1.1.0 (2025-10-18)
- ✅ Enhanced USAGE_EXAMPLES.md with additional scenarios
- ✅ Improved metric tracking accuracy
- ✅ Added progressive disclosure best practices
- ✅ Enhanced session memory integration

### v1.0.0 (2025-10-17)
- Initial release with anti-hallucination protocol
- Automatic context loading (SYSTEM_CORE.md, SESSION_MEMORY.json)
- Verification minimums enforcement
- Metrics tracking scripts

