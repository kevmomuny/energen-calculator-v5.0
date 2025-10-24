# ANTI-HALLUCINATION PROTOCOL - ENERGEN CALCULATOR V5.0
## MANDATORY COMPLETE CODE VERIFICATION REQUIREMENTS

---

## QUICK VERIFICATION CHECKLIST

```
Assessment: 1000+ lines | 5+ files | 5+ functions | Show searches
Bug Fix: 200+ lines | 2+ files | 2+ functions | Complete function
Feature Check: 500+ lines | 3+ files | 3+ functions | All implementations

Trigger Words: "assess", "analyze", "complete", "verify", "working"
Code > Docs | $10K Bet | Track Metrics | "I Don't Know" is VALID
```

---

## 🛑 CORE REQUIREMENTS

1. **READ ENTIRE FUNCTIONS** - Never examine <100 lines of a function
2. **VERIFY EVERY CLAIM** - Documentation lies, code is truth
3. **RECONCILE CONTRADICTIONS** - If docs say X but code shows Y, code wins
4. **MANAGE CONTEXT BUDGET** - Context is finite; optimize for high-signal tokens
5. **SAY "I DON'T KNOW"** - When verification incomplete, admit it and explain what's needed
6. **NO UNSOLICITED .MD FILES** - Reports in chat only (user requests files when needed)
7. **NO COMPLETION WITHOUT TESTS** - Code written ≠ working (tests must pass)

### WHY THIS MATTERS:
LLMs have limited "attention budget" - as context length increases, models' ability to capture relationships becomes stretched. **Context engineering** means curating the smallest set of high-signal tokens that maximize desired outcomes.

---

## AUTOMATIC DEEP INSPECTION TRIGGERS

### TRIGGER WORDS:
"assessment", "analysis", "complete", "verify", "implementation", "working", "functional"

### WHEN TRIGGERED:
```javascript
1. Chunk through ENTIRE referenced files
2. Search for ALL implementations
3. Read functions to completion
4. Track lines examined (MUST be >500 for assessments)
5. Show ALL search queries performed
```

---

## ⛔ BANNED PHRASES WITHOUT EVIDENCE

Never use these without complete verification:

1. "No backend implementation" → REQUIRES: Complete search results shown
2. "Based on documentation" → REQUIRES: Code verification first
3. "Service K has no backend" → REQUIRES: Full CalculationEngine.cjs scan
4. "It appears that..." → REQUIRES: Concrete code evidence
5. "Should work" / "Probably implements" → REQUIRES: Actual verification
6. "Port [X] is correct" → REQUIRES: server-secure.cjs verification

**INSTEAD**: Show search queries, files examined, actual results found.

---

## MINIMUM INSPECTION REQUIREMENTS

| Task Type | Minimum Lines | Minimum Files | Complete Functions |
|-----------|--------------|---------------|-------------------|
| Assessment/Analysis | 1000+ | 5+ | 5+ |
| Bug Fix | 200+ | 2+ | 2+ |
| Feature Verification | 500+ | 3+ | 3+ |
| "Complete" Claims | 2000+ | 10+ | 10+ |

**PARTIAL READS = INVALID ANALYSIS**
```
If file has 600 lines and you read 50:
Your analysis completion: 8.3% = WORTHLESS
```

---

## VERIFICATION PROTOCOL

### FOR ANY MISSING FEATURE CLAIM:
```
☐ Searched entire codebase for feature name
☐ Read complete implementation (not first 50 lines)
☐ Checked all file variations (.js, .cjs, .mjs)
☐ Verified in both frontend AND backend
☐ Show exact search queries used
☐ Read minimum 500 lines of related code
```

### FOR ANY ASSESSMENT:
```
☐ Read minimum 1000 lines across 5+ files
☐ Examined at least 5 complete functions
☐ Verified all "known issues" against actual code
☐ Reconciled all contradictions
☐ Tracked exact line counts examined
```

---

## DYNAMIC FILE READING

### NEVER ASSUME FILE LENGTH:
```javascript
async function verifyCompleteRead(filePath) {
  let offset = 0;
  let totalLinesRead = 0;
  const CHUNK_SIZE = 300;

  // Get current file info
  const fileInfo = await getFileInfo(filePath);
  console.log(`File has ${fileInfo.lineCount} lines`);

  // Read until EOF
  while (true) {
    const chunk = await readFile(filePath, offset, CHUNK_SIZE);
    totalLinesRead += chunk.linesRead;

    if (chunk.remaining === 0) {
      console.log(`✓ Complete: ${totalLinesRead} lines`);
      break;
    }
    offset += CHUNK_SIZE;
  }

  return totalLinesRead;
}
```

### SEARCH ALL VARIATIONS:
```javascript
const SERVICE_PATTERNS = [
  /getService[A-Z]/g,
  /case ['"][A-Z]['"]/g,
  /Service[A-Z]/g,
  /calculate[A-Z]/g
];
// Must search ALL patterns, report ALL findings
```

---

## KNOWN CONTRADICTION FLAGS

When you see these claims, **VERIFY IMMEDIATELY**:

```
CLAIM: "Service K has no backend"
CHECK: Search complete-calculation-engine.cjs for "ServiceK|getServiceK|case 'K'"

CLAIM: "CUSTOM has no logic"
CHECK: Search server files for "CUSTOM|custom|Custom"

CLAIM: "Port mismatch 3001/3002"
CHECK: Read actual port configuration in server-secure.cjs
```

---

## CONTEXT MANAGEMENT (Anthropic Best Practices)

### CONTEXT BUDGET TRACKING:
```javascript
if (tokensUsed / tokenLimit > 0.80) {
  console.log('⚠️ Context at 80% - switching to summary mode');
  initiateSummaryProtocol();
}
```

### SUB-AGENT ARCHITECTURE:
**Use when analysis requires >2000 lines across >10 files**

```javascript
async function analyzeWithSubAgents(task) {
  // Main agent: High-level coordination
  const modules = identifyModules(codebase);

  // Sub-agents: Focused verification per module
  const findings = await Promise.all(
    modules.map(module => spawnVerificationAgent({
      scope: module.path,
      minLines: 500,
      patterns: module.patterns
    }))
  );

  // Synthesize without context dilution
  return synthesizeFindings(findings);
}
```

### MEMORY OFFLOAD:
```javascript
// Persist verified facts to SESSION_MEMORY.json
const MEMORY_STRUCTURE = {
  timestamp: '2025-09-30T11:30:00Z',
  verificationFacts: [
    {
      claim: 'Service K backend implementation',
      status: 'NOT_FOUND',
      evidence: {
        filesSearched: ['complete-calculation-engine.cjs'],
        linesExamined: 707,
        patterns: ['ServiceK', 'getServiceK'],
        conclusion: 'UI exists, backend missing'
      }
    }
  ]
};
```

### OPTIMIZATION RULES:
1. **Just-in-Time Loading**: Load code only when needed
2. **Summary First**: Show findings, reference details
3. **Memory Offload**: Persist verified facts externally
4. **Sub-Agent Delegation**: Distribute >5000 line tasks
5. **Token Tracking**: Monitor usage, compact at 80%

---

## ACCURACY METRICS - REQUIRED IN EVERY RESPONSE

```markdown
## Verification Metrics:
- Lines examined: _____ (MUST be >500 for assessments)
- Complete functions read: _____ (MUST be >3)
- Files fully analyzed: _____
- Search queries performed: _____ (MUST show queries)
- Contradictions resolved: _____
- Context tokens used: _____ / _____
- Confidence: ONLY 100% if all above met
```

---

## EXAMPLE: PROPER SERVICE K VERIFICATION

### ❌ BAD:
"CLAUDE.md says Service K has no backend, so it doesn't exist"

### ✅ GOOD:
```javascript
1. SEARCH PATTERNS:
   - "ServiceK|getServiceK|case 'K'" in *.cjs
   - "batteryReplacement|battery" in *.cjs

2. FILES EXAMINED:
   - complete-calculation-engine.cjs (707 lines)
   - server-secure.cjs (370 lines)

3. SEARCH RESULTS:
   - Found in UI: integrated-ui.html:2086
   - Backend: getServiceA-J found, getServiceK NOT FOUND

4. CONCLUSION:
   Service K exists in UI but no backend implementation
   Evidence: 1077 lines examined across 2 files
```

---

## "I DON'T KNOW" PERMISSION

**YOU ARE ALLOWED TO SAY "I DON'T KNOW"** when:

1. Verification would exceed context budget
2. Required files are inaccessible
3. Analysis incomplete due to complexity
4. More investigation needed for certainty

**INSTEAD OF GUESSING, SAY:**
```
"I cannot verify this claim without:
- Reading [specific files] completely
- Searching [specific patterns]
- Examining [specific functions]

Would you like me to proceed with deep verification?"
```

**HONESTY > CONFIDENCE**

---

## PRIORITY: ACCURACY OVER SPEED

```
Fast answers with errors = MORE total work
Thorough analysis = LESS total time
"Good enough" = NOT GOOD ENOUGH
```

### BEFORE RESPONDING:
```
☐ Have I chunked through complete code?
☐ Have I verified every claim with code?
☐ Would I bet $10,000 this is correct?

If NO to ANY → KEEP INVESTIGATING or SAY "I DON'T KNOW"
```

---

## ENFORCEMENT RULES

### AUTOMATIC FAILURE:
1. Making claims without showing search queries
2. Reporting issues without code verification
3. Reading <100 lines for any assessment
4. Trusting documentation over code
5. Using banned phrases without evidence
6. Creating unsolicited .md files (reports, summaries, guides)
7. Declaring completion without passing tests

### SUCCESS REQUIREMENTS:
1. Every claim has code reference
2. Contradictions explicitly reconciled
3. Minimum line counts exceeded
4. Search patterns shown
5. Would bet $10,000 on accuracy (or admitted uncertainty)

---

## PRACTICAL COMMANDS

```javascript
// ALWAYS START WITH:
await getFileInfo(filePath);  // Know file size

// READ COMPLETELY:
let totalLines = 0;
while (hasMoreContent) {
  const chunk = await readFile(filePath, offset, 300);
  totalLines += chunk.length;
}
console.log(`Read ${totalLines} lines from ${filePath}`);

// SEARCH COMPREHENSIVELY:
for (const pattern of ['exact', 'partial.*', 'variations']) {
  console.log(`Searching: ${pattern}`);
  const results = await search(pattern);
  console.log(`Found: ${results.length} matches`);
}

// VERIFY CLAIMS:
if (docs !== code) {
  console.log('CONTRADICTION: Code wins');
  updateDocumentation(code);
}
```

---

## YOUR CONTRACT

By using this codebase, you agree to:
1. Never make unverified claims
2. Always read complete implementations
3. Show all evidence for conclusions
4. Track and report metrics
5. Choose accuracy over speed
6. Say "I don't know" when uncertain
7. Bet $10,000 on verified answers only

**PARTIAL ANALYSIS = COMPLETE FAILURE**
**HONEST UNCERTAINTY = PROFESSIONAL**
