# Energen Code Investigator Skill

**Version:** 1.0.0
**Status:** Production Ready
**Protocol:** Anti-Hallucination Enforcement

---

## Purpose

This Claude Skill enforces anti-hallucination protocols during code investigations for the Energen Calculator v5.0 project. It ensures:

- Complete code verification (not partial reads)
- Evidence-based claims only
- Accurate metrics tracking
- Contradiction reconciliation (code wins over docs)
- Prevention of premature completion claims
- Prevention of documentation bloat

---

## Quick Start

### Claude.ai / Claude Code

```
Use the energen-code-investigator skill to analyze Service K implementation
```

The skill will automatically:
1. Load context files (CLAUDE.md, SYSTEM_CORE.md, SESSION_MEMORY.json)
2. Classify investigation type
3. Apply minimum verification requirements
4. Track metrics
5. Generate evidence-based report

### API Integration

```javascript
const investigation = await claude.useSkill('energen-code-investigator', {
  task: 'verify Service K backend implementation',
  type: 'feature_verification'
});
```

---

## Investigation Types

### 1. Assessment (1000+ lines, 5+ files, 5+ functions)
**Triggers:** "assess", "analyze", "evaluate", "review"

Use when you need comprehensive analysis of system state, architecture, or multiple components.

### 2. Bug Fix (200+ lines, 2+ files, 2+ functions)
**Triggers:** "bug", "error", "broken", "not working"

Use when investigating specific issues or errors.

### 3. Feature Verification (500+ lines, 3+ files, 3+ functions)
**Triggers:** "verify", "check if", "does it have", "is there"

Use when confirming whether functionality exists and works.

### 4. Completion Claim (2000+ lines, 10+ files, 10+ functions)
**Triggers:** "complete", "done", "finished", "implemented"

Use when validating completion status. **Requires passing tests.**

---

## File Structure

```
.claude/skills/energen-code-investigator/
├── SKILL.md                           # Main skill definition
├── README.md                          # This file
├── scripts/
│   ├── update-session-memory.js      # Update SESSION_MEMORY.json
│   └── track-metrics.js              # Calculate verification metrics
└── resources/
    ├── verification-template.md      # Report template
    └── metrics-tracker.json          # JSON schema for metrics
```

---

## Scripts Usage

### Update Session Memory

Add verified facts after investigation:

```bash
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --fact "Service K backend exists at complete-calculation-engine.cjs:505-520" \
  --verified true \
  --source "complete-calculation-engine.cjs" \
  --evidence "getBatteryService() method with 14 passing tests"
```

Add code changes:

```bash
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --code-change "Added getBatteryService() method" \
  --file "src/api/complete-calculation-engine.cjs" \
  --lines "505-520" \
  --commit "467083d"
```

Add architecture notes:

```bash
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --architecture-note "battery_pricing" "Uses kW-based lookup + parts markup"
```

### Track Metrics

Calculate confidence and verify minimums:

```bash
node .claude/skills/energen-code-investigator/scripts/track-metrics.js \
  --lines 1247 \
  --files "server-secure.cjs,complete-calculation-engine.cjs,integrated-ui.html" \
  --functions "getServiceK,getBatteryService,calculateBatteryPrice" \
  --queries "ServiceK,getServiceK,battery,batteryReplacement" \
  --type feature_verification \
  --output latest-metrics.json
```

Output includes:
- ✅/❌ for each minimum requirement
- Confidence score (0-100%)
- "Would bet $10K?" assessment
- Warnings for unmet requirements

---

## Key Features

### 1. Automatic Context Loading
The skill loads required context files automatically and silently:
- `.claude/CLAUDE.md` - Instructions
- `SYSTEM_CORE.md` - Architecture
- `SESSION_MEMORY.json` - Verified facts
- `CONTEXT_INDEX.md` - File selection guide

### 2. Banned Phrases Enforcement
These phrases **cannot** be used without complete verification:
- "No backend implementation"
- "Based on documentation"
- "It appears that..."
- "Should work"
- "Task complete!" (without tests)

### 3. Search Protocol
For ANY "missing" claim, must show:
- Exact search queries used
- Number of results found
- Files searched
- Pattern variations tried

### 4. Dynamic File Reading
Never hardcodes line numbers. Always reads files completely:
```javascript
// Reads file in chunks until EOF
let offset = 0;
while (hasMore) {
  chunk = await readFile(path, offset, 300);
  offset += 300;
}
```

### 5. Contradiction Reconciliation
When docs disagree with code:
```
Documentation says: X
Code shows: Y
Resolution: CODE WINS ✅
```

### 6. Anti-Documentation-Bloat
**Reports go in chat.** Files only when user explicitly requests.

### 7. Anti-Premature-Completion
**Code written ≠ code working.** Tests must pass before claiming "complete."

---

## Output Format

Every investigation produces a structured report with:

```markdown
## 🔍 Verification Metrics
- Lines examined: [count] (Minimum: [required])
- Files read: [list with counts]
- Functions analyzed: [list with signatures]
- Search queries: [list with results]

## 📊 Confidence Assessment
- Confidence Level: [0-100%]
- All Minimums Met: [Yes/No]
- Would I bet $10,000? [Yes/No]

## 🔬 Code Evidence
[File paths, line numbers, actual code snippets]

## ⚠️ Contradictions Resolved
[Docs vs Code, Resolution]

## ✅ Completion Status
- Code written: [✓/✗]
- Tests passing: [✓/✗]
- User confirmed: [✓/✗]
- Status: [ready for testing | tests passing | complete]
```

---

## Examples

### Example 1: Feature Verification

```
Use energen-code-investigator to verify if Service K backend is implemented
```

Output includes:
- ✅ Comprehensive search results (7+ queries)
- ✅ Complete file reads (925 lines complete-calculation-engine.cjs)
- ✅ Code evidence (getBatteryService() at lines 505-520)
- ✅ Test verification (14/14 tests passing)
- ✅ Confidence: 100% (would bet $10K)

### Example 2: Bug Investigation

```
Use energen-code-investigator to investigate pricing calculation error
```

Output includes:
- ✅ Search for calculation functions
- ✅ Read complete calculation logic (500+ lines)
- ✅ Identify contradiction (docs said no markup, code shows 1.2x)
- ✅ Provide fix recommendation
- ✅ Status: "Bug identified, fix ready for testing"

### Example 3: Assessment

```
Use energen-code-investigator to assess overall system completeness
```

Output includes:
- ✅ 1000+ lines examined across 5+ files
- ✅ All service implementations verified
- ✅ Test coverage checked (69/69 passing)
- ✅ Architecture validated against code
- ✅ Contradictions resolved (3 found)

---

## Best Practices

### 1. Let the Skill Do the Work
Don't manually track metrics - the skill does it automatically.

### 2. Trust the Confidence Score
- 100% = All minimums met, would bet $10K
- 70-99% = Minimums partially met
- <70% = Insufficient verification

### 3. Review Code Evidence
Every claim should have file path + line numbers + code snippet.

### 4. Use Scripts for Deterministic Tasks
- `update-session-memory.js` - Persist verified facts
- `track-metrics.js` - Calculate confidence

### 5. Follow Completion Protocol
Never claim "complete" without:
1. ✅ Code written
2. ✅ Tests passing
3. ✅ User confirmation

---

## Integration

### With Other Skills
```javascript
// Use with code-writer skill
await claude.useSkill('energen-code-investigator', {
  task: 'verify implementation before deployment'
});
await claude.useSkill('code-writer', {
  task: 'fix identified issues'
});
```

### With CI/CD
```bash
# In pre-commit hook
node .claude/skills/energen-code-investigator/scripts/track-metrics.js \
  --lines $(wc -l changed_files) \
  --files $(git diff --name-only) \
  --functions $(grep -E '^function|^const.*=' changed_files) \
  --queries "test" \
  --type completion_claim

# Exit 1 if minimums not met
```

### With Documentation
```bash
# After investigation, update SESSION_MEMORY.json
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --fact "New finding from investigation" \
  --verified true
```

---

## Troubleshooting

### "Minimums not met" Error
**Cause:** Investigation didn't meet minimum requirements for type.

**Solution:**
1. Check investigation type classification
2. Read more files / lines
3. Perform more comprehensive searches
4. Or downgrade investigation type

### "Confidence < 100%" Warning
**Cause:** Some verification requirements not fully met.

**Solution:**
1. Review metrics section
2. Address gaps in verification
3. Or acknowledge uncertainty ("I don't know")

### "No code evidence" Error
**Cause:** Claims made without code snippets.

**Solution:**
1. Include file paths
2. Include line numbers
3. Include actual code snippets
4. Reference specific functions

---

## Version History

- **1.0.0** (2025-10-17) - Initial release
  - Anti-hallucination protocol enforcement
  - Investigation type classification
  - Minimum verification requirements
  - Metrics tracking scripts
  - Evidence-based reporting
  - Session memory integration

---

## License

MIT License - Internal use for Energen Calculator v5.0 project

---

## Support

For issues or questions:
1. Review `.claude/CLAUDE.md` for instructions
2. Check `.claude/ANTI_HALLUCINATION_PROTOCOL.md` for requirements
3. Verify minimums in `track-metrics.js` output
4. Check metrics section in investigation report

---

**Remember:** This skill enforces professional engineering standards. Code written ≠ code working. Tests must pass. Evidence required. Accuracy > Speed.
