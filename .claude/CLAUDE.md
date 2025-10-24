# CLAUDE CODE CONTEXT - ENERGEN V5.0
## Anti-Hallucination Enforcement Edition

---

## 🛑 STOP - MANDATORY READING

This is your PRIMARY instruction file. EVERY operation requires:
1. Complete code verification (not partial reads)
2. Evidence for every claim
3. Contradiction reconciliation (code wins)

See `.claude/ANTI_HALLUCINATION_PROTOCOL.md` for full requirements.

---

## 🎯 CLAUDE SKILLS AVAILABLE

**17 Total Skills Installed** (6 custom + 11 community/official)

**Project Skills:** energen-bug-reporter, energen-code-investigator, energen-pdf-generator, energen-rfp-evaluator, energen-ui-verifier, energen-zoho-integrator

**Development:** test-driven-development, systematic-debugging, finishing-a-development-branch, using-git-worktrees

**Collaboration:** brainstorming, writing-plans, executing-plans

**Documents:** xlsx, docx, pdf

**See:** `.claude/skills/INTEGRATION_GUIDE.md` for usage patterns and skill composition workflows.

---

## VERIFICATION MINIMUMS BY TASK

| Task | Min Lines | Min Files | Functions | Required |
|------|-----------|-----------|-----------|----------|
| Assessment | 1000+ | 5+ | 5+ | Full search results |
| Bug Fix | 200+ | 2+ | 2+ | Complete function |
| Feature Check | 500+ | 3+ | 3+ | All implementations |
| "Complete" | 2000+ | 10+ | 10+ | Entire codebase |

---

## TRIGGER WORDS = DEEP INSPECTION

When request contains:
- "assess", "analyze", "complete", "verify", "working"

YOU MUST:
- Read 500+ lines minimum
- Search all variations
- Show queries used
- Verify in code

---

## PROJECT FACTS (VERIFY EACH SESSION)

```javascript
// DON'T ASSUME - VERIFY:
const currentPort = await verifyInFile('server-secure.cjs', 'PORT');
const serviceKExists = await searchPattern('*.cjs', 'ServiceK|getServiceK');
const customLogic = await searchPattern('*.cjs', 'CUSTOM|processCustom');
```

### Known Patterns to Check:
- Port configuration (may not be 3002)
- Service implementations (K and CUSTOM status)
- API endpoints (actual vs documented)
- File locations (may have moved)

---

## BANNED PHRASES WITHOUT PROOF

Never say without complete verification:
1. "No backend implementation"
2. "Missing functionality"  
3. "Doesn't work"
4. "Should be"
5. "Appears to"
6. "Based on documentation"

Instead, show:
- Exact search performed
- Files examined (with line count)
- Actual results found
- Code-based conclusion

---

## SEARCH PROTOCOL

```javascript
// For ANY "missing" claim:
const searchQueries = [
  'exactFunctionName',
  'partialName*',
  'case.*variations',
  'related.*terms'
];

for (const query of searchQueries) {
  console.log(`Searching: ${query}`);
  const results = await search(query);
  console.log(`Found: ${results.length} matches`);
  // Show actual results
}
```

---

## ACCURACY TRACKING TEMPLATE

Include in EVERY response:

```markdown
## Verification Metrics:
- Lines examined: [actual count]
- Files read completely: [list files]
- Search queries used: [list patterns]
- Functions analyzed: [list names]
- Contradictions resolved: [list any]
- Confidence: [100% only if all above complete]
```

---

## FILE READING PROTOCOL

```javascript
// NEVER hardcode line numbers
// ALWAYS read dynamically

async function readComplete(file) {
  const info = await getFileInfo(file);
  let lines = 0;
  let offset = 0;
  
  while (true) {
    const chunk = await readFile(file, offset, 300);
    lines += chunk.length;
    if (chunk.remaining === 0) break;
    offset += 300;
  }
  
  console.log(`Read ${lines} total lines`);
  return lines;
}
```

---

## CONTRADICTION PROTOCOL

When docs disagree with code:
1. Code is truth
2. Update docs to match code
3. Note the correction made
4. Never trust docs first

---

## DEVELOPMENT RULES

### DO NOT MODIFY:
- Labor rates without settings
- Service A-J core logic
- Excel-verified formulas
- kW range boundaries

### VERIFY BEFORE CHANGING:
- Port configurations
- Service K/CUSTOM implementations
- API endpoints
- File paths

### ALWAYS TEST:
```bash
npm test
node test-v5-validation.cjs
curl http://localhost:[PORT]/health
```

---

## YOUR COMMITMENT

☐ I will read complete functions, not snippets
☐ I will verify every claim in code
☐ I will show my search queries
☐ I will track metrics
☐ I will choose accuracy over speed
☐ I will bet $10,000 on my answers
☐ I will NEVER create unsolicited .md files (reports in chat only)
☐ I will NEVER declare "complete" without passing tests

**Remember: Fast wrong answers = MORE work**
**Thorough correct analysis = LESS total time**

---

## ANTI-DOCUMENTATION-BLOAT PROTOCOL

### The Problem:
Creating endless .md files (guides, summaries, reports, evaluations) wastes user time:
- User waits for file writes
- User waits for chat repetition of same content
- User spends time deleting unrequested files
- Context polluted with false "completion" claims

### The Rule:
**REPORTS GO IN CHAT. FILES ONLY WHEN EXPLICITLY REQUESTED.**

### Examples:

❌ BAD (NEVER DO THIS):
```
"Let me create IMPLEMENTATION_SUMMARY.md..."
"Let me document this in QUICK_REFERENCE.md..."
"I'll write a completion report to TASK_COMPLETE.md..."
```

✅ GOOD (ALWAYS DO THIS):
```
"Here's the summary: [detailed report in chat]"
"Implementation complete. Summary: [in chat]"
[User asks: "Save that to a file"]
"I'll write it to [filename].md..."
```

### Exceptions (Files You May Update):
- SYSTEM_CORE.md (when architecture changes verified)
- SESSION_MEMORY.json (when new facts verified)
- BUG_LOG.md (when bugs found/fixed)
- Existing docs explicitly mentioned by user

### The Test:
Before creating any .md file, ask:
"Did the user explicitly say 'write this to a file' or 'create a document'?"
- If NO → Put it in chat
- If YES → Create the file

---

## ANTI-PREMATURE-COMPLETION PROTOCOL

### The Problem:
Declaring "complete" or "success" when only code is written (not tested) creates:
- False confidence
- Polluted context with incorrect completion claims
- Broken AI agent chains (next agent trusts false completion)
- Wasted user time debugging "complete" features

### The Rule:
**CODE WRITTEN ≠ CODE WORKING. TESTS REQUIRED FOR COMPLETION.**

### Completion Criteria (ALL REQUIRED):

1. ✅ Code written/modified
2. ✅ Tests pass (automated) OR manual verification confirmed by user
3. ✅ User confirms functionality (if applicable)

### Acceptable Status Language:

| Status | When to Use |
|--------|-------------|
| "Implementation ready for testing" | Code written, not tested |
| "Code written, needs verification" | Code done, awaiting tests |
| "Tests passing, ready for review" | Tests pass, awaiting user confirmation |
| "Complete and verified" | Tests pass AND user confirms |

### Banned Without Tests:

❌ "Task complete!"
❌ "Successfully implemented!"
❌ "Feature working!"
❌ "Bug fixed!"
❌ "100% functional"

### The Test:
Before declaring completion, ask:
"Have tests passed or has user manually verified this works?"
- If NO → Use "ready for testing/verification"
- If YES → May declare completion

### Sub-Agent Instructions:
When spawning sub-agents, explicitly instruct:
"Report what was implemented and whether tests passed. Do NOT declare completion without test results."

---

## WHY THIS MATTERS

**Documentation Bloat:**
- 253 files were just archived
- Most were false "completion" reports
- This destroyed AI agent context utility
- User spent hours managing unrequested files

**False Completion Claims:**
- "Complete" without tests = lie
- Next AI agent trusts the lie
- Chain of failures propagates
- User loses trust in AI assistance

**Professional Standard:**
Engineers don't declare code "complete" until it passes tests.
AI agents must follow the same standard.

---

## QUICK COMMAND REFERENCE

```bash
# Start every session with:
desktop-commander:get_config
desktop-commander:list_directory path:/src/api
desktop-commander:get_file_info path:[each critical file]

# For any "missing" claim:
desktop-commander:start_search path:/ pattern:"[feature]"
desktop-commander:get_more_search_results

# For verification:
desktop-commander:read_file (until remaining=0)
```

---

## CLAUDE 4 PARALLEL TOOL CALLING

When to parallelize (do in single message):
✓ Reading multiple independent files for comparison
✓ Searching different patterns across codebase
✓ Running tests while checking documentation
✓ Verifying implementation in frontend + backend simultaneously

When NOT to parallelize (sequential):
✗ Reading file → Editing same file (dependency)
✗ Creating directory → Writing files to it (dependency)
✗ Search results needed → Reading matched files (dependency)

Example (GOOD - parallel):
Read('server.cjs') + Read('calculation-engine.cjs') + Read('integrated-ui.html')

Example (BAD - unnecessary sequential):
Read('config.json') → wait → Edit('config.json', based on read)

## VERIFICATION METRICS IN TODO TRACKING

When using TodoWrite for analysis tasks, include verification subtasks:

Example:
- "Analyze Service K implementation" (main task)
  - "Search for ServiceK patterns (show queries)" (verification)
  - "Read complete functions (track lines)" (verification)
  - "Verify in tests (show results)" (verification)

This creates audit trail and prevents "completion" without verification.

---

## 🚨 CRITICAL: PROCESS MANAGEMENT SAFETY

### THE PROBLEM: SELF-TERMINATION
Claude Code runs in a Node.js process. Killing Node processes carelessly **WILL KILL CLAUDE CODE ITSELF**.

### ABSOLUTE RULES FOR PROCESS MANAGEMENT

#### ❌ NEVER DO THIS:
```bash
# These commands WILL KILL CLAUDE CODE:
taskkill /F /IM node.exe              # Kills ALL Node processes including Claude
Get-Process node | Stop-Process       # Kills ALL Node processes including Claude
pkill node                            # Kills ALL Node processes including Claude
killall node                          # Kills ALL Node processes including Claude
```

#### ✅ SAFE SERVER RESTART METHODS:

**Method 1: Graceful Restart (PREFERRED)**
```bash
# Find specific process by port
netstat -ano | findstr :3002
# Kill only that specific PID
taskkill /PID <specific_pid> /F
# Then restart
node src/api/server-secure.cjs
```

**Method 2: Use Built-in Scripts**
```bash
# If project has restart scripts, use them
npm run restart-server  # (if exists)
npm run server:restart  # (if exists)
```

**Method 3: Manual Specific Kill**
```bash
# List all Node processes with details
Get-Process -Name node | Select-Object Id,ProcessName,Path,StartTime

# Identify the server process (look for 'server-secure.cjs' in Path)
# Kill ONLY that specific process by PID
taskkill /PID <server_pid> /F

# NOT by name, NOT all node processes
```

### BEFORE KILLING ANY PROCESS:

1. **List all running Node processes with details**:
   ```powershell
   Get-Process node | Select-Object Id, ProcessName, Path, StartTime | Format-Table -AutoSize
   ```

2. **Identify which process is which**:
   - Look for `server-secure.cjs` in Path → That's the server
   - Look for `Claude` or `Code` in Path → That's Claude Code (DO NOT KILL)
   - When uncertain → DO NOT KILL

3. **Kill by specific PID, never by name**:
   ```powershell
   taskkill /PID <exact_pid_of_server> /F
   ```

### DECISION TREE:

```
Need to restart server?
├─ Do you know the EXACT PID of server-secure.cjs?
│  ├─ YES → Use: taskkill /PID <exact_pid> /F
│  └─ NO →
│     ├─ Find it: Get-Process node | Select Path
│     └─ Still uncertain? → ASK USER to manually restart
│
└─ Considering killing "all node processes"?
   └─ STOP. You will kill Claude Code. Use PID method above.
```

### IF YOU'RE ABOUT TO KILL PROCESSES:

**STOP AND ASK YOURSELF:**
1. Do I know the EXACT PID of the server process?
2. Am I using a command that kills ALL node processes?
3. Could this kill Claude Code itself?

**IF ANY ANSWER IS "NO" OR "MAYBE":**
→ DO NOT PROCEED
→ ASK USER FOR GUIDANCE

### RECOVERY IF CLAUDE CODE IS KILLED:

User will need to:
1. Restart Claude Code manually
2. Reload the workspace
3. Resume from where work was interrupted

### RECOMMENDED WORKFLOW:

**When user reports server issues:**
```markdown
1. First, try graceful solutions (code fixes, configuration changes)
2. If restart needed, ASK USER: "Would you like me to find and restart
   the server process? I'll need to identify the exact PID to avoid
   killing Claude Code itself."
3. If user confirms, use the safe methods above
4. ALWAYS kill by specific PID, never by process name
```

### SUMMARY:

| Command Type | Safety | When to Use |
|--------------|--------|-------------|
| `taskkill /F /IM node.exe` | ❌ DANGEROUS | NEVER |
| `Get-Process node \| Stop-Process` | ❌ DANGEROUS | NEVER |
| `taskkill /PID <specific> /F` | ✅ SAFE | Always prefer this |
| Ask user to restart | ✅ SAFEST | When uncertain |

---

## IF IN DOUBT

1. Keep reading (you haven't read enough)
2. Search more patterns
3. Check file variations (.js, .cjs, .mjs)
4. Verify in both frontend and backend
5. Show your work
6. Would you bet $10,000?

No? Then keep investigating.
