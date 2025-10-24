# How to Use Claude Skills - Quick Reference

## Exact Commands to Type

### energen-ui-verifier (UI Testing)

**Basic invocation:**
```
Use the energen-ui-verifier skill to test the calculator UI
```

**With specific scenario:**
```
Use energen-ui-verifier to verify production readiness using the Starbucks test scenario
```

**For specific phase:**
```
Use energen-ui-verifier to test Phase 4 (Service Selection) in detail
```

**After fixing issues:**
```
Use energen-ui-verifier to re-verify all 160 checks after bug fixes
```

---

### energen-code-investigator (Code Verification)

**Basic invocation:**
```
Use energen-code-investigator to verify the Service K implementation
```

**For bug investigation:**
```
Use energen-code-investigator to investigate why the Calculate button returns $0
```

**For feature verification:**
```
Use energen-code-investigator to verify the complete Zoho integration workflow
```

**For assessment:**
```
Use energen-code-investigator to assess the current state of the PDF generation system
```

---

### energen-zoho-integrator (Zoho Module Generation)

**Basic invocation:**
```
Use energen-zoho-integrator to create integration for Service_Contracts module
```

**With specification file:**
```
Use energen-zoho-integrator to generate integration from service-contracts-spec.json
```

**For new module:**
```
Use energen-zoho-integrator to create complete Zoho integration for the Technician_Schedules module with fields: Name (text), Date (date), Hours (number), Notes (text)
```

---

### energen-bug-reporter (Bug Documentation)

**Basic invocation:**
```
Use energen-bug-reporter to document the multi-unit data overwrite bug
```

**After fixing:**
```
Use energen-bug-reporter to generate fix report for bug E2E-003
```

**For new bug:**
```
Use energen-bug-reporter to create comprehensive bug report for the Clear All button 5-second delay issue
```

---

## Alternative: Direct Script Execution

If skills aren't loading automatically, run scripts directly:

### UI Verifier
```bash
# Manual checklist (recommended first time)
start .claude/skills/energen-ui-verifier/resources/workflow-checklist.md

# Automated execution
node .claude/skills/energen-ui-verifier/scripts/run-ui-verification.cjs
```

### Code Investigator
```bash
# Track metrics
node .claude/skills/energen-code-investigator/scripts/track-metrics.cjs \
  --lines 1500 \
  --files "server.cjs,engine.cjs,ui.html,test.cjs" \
  --functions "getServiceK,calculatePrice,updateUI,validateInput,testServiceK" \
  --queries "ServiceK,getServiceK,battery,calculatePrice,test" \
  --type feature_verification

# Update session memory
node .claude/skills/energen-code-investigator/scripts/update-session-memory.cjs \
  --fact "Service K backend verified at line 505-520" \
  --verified true \
  --source "complete-calculation-engine.cjs"
```

### Bug Reporter
```bash
# Update bug tracking
node .claude/skills/energen-bug-reporter/scripts/update-bug-tracking.cjs \
  --bug-id "E2E-003" \
  --status "FIXED" \
  --fix-report "FIX_REPORT_F3.md"

# Generate commit message
node .claude/skills/energen-bug-reporter/scripts/generate-commit-message.cjs \
  --bug-id "E2E-003" \
  --report "FIX_REPORT_F3.md" \
  --type "fix"
```

---

## Troubleshooting

### If skill doesn't activate:

**1. Check skill files exist:**
```bash
ls -la .claude/skills/
```

**2. Verify SKILL.md has YAML frontmatter:**
```bash
head -20 .claude/skills/energen-ui-verifier/SKILL.md
```

**3. Use explicit path reference:**
```
Load the skill from .claude/skills/energen-ui-verifier/ and use it to verify UI
```

**4. Fall back to manual process:**
- Open SKILL.md
- Follow instructions manually
- Use scripts directly (see above)

---

## Pro Tips

### Combining Skills
```
Use energen-code-investigator to verify the bug fix, then use energen-bug-reporter to generate the fix report
```

### Specifying Test Data
```
Use energen-ui-verifier with the large generator test scenario (Apple, 2000kW) to verify pricing accuracy
```

### Verbose Output
```
Use energen-ui-verifier in verbose mode, capturing screenshots at every step and showing all console logs
```

### Specific Phase Testing
```
Use energen-ui-verifier to test only Phase 8 (Zoho Transfer) to verify the quote creation workflow
```

---

## Expected Behavior

When you invoke a skill, Claude should:

1. **Acknowledge:** "I'll use the energen-ui-verifier skill to test the UI"
2. **Load Context:** Read SKILL.md and understand the protocol
3. **Execute:** Follow the instructions in the skill
4. **Report:** Provide detailed findings with evidence
5. **Status:** Clear PASS/FAIL determination

---

## What Skills Do vs Don't Do

### Skills DO:
✅ Provide structured instructions for Claude to follow
✅ Define verification protocols and standards
✅ Include helper scripts for automation
✅ Enforce quality gates and evidence requirements
✅ Prevent false "completion" claims

### Skills DON'T:
❌ Run automatically in background
❌ Execute without explicit invocation
❌ Require special configuration (just files in `.claude/skills/`)
❌ Need installation (already present when files exist)

---

## Quick Reference Table

| Skill | Quick Command | When to Use |
|-------|---------------|-------------|
| **UI Verifier** | `Use energen-ui-verifier to verify production readiness` | Before ANY "production ready" claim |
| **Code Investigator** | `Use energen-code-investigator to verify [feature]` | Every bug fix, feature verification |
| **Zoho Integrator** | `Use energen-zoho-integrator to create [module]` | New Zoho module integration |
| **Bug Reporter** | `Use energen-bug-reporter to document [bug]` | After fixing any bug |

---

## Example Session

```
User: "I fixed the multi-unit data overwrite bug. Is it production ready?"