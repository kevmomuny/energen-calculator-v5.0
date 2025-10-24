# Usage Examples - Energen Code Investigator Skill

This document provides practical examples of using the energen-code-investigator skill.

---

## Example 1: Feature Verification

### User Request
```
Verify if Service K (battery replacement) backend is fully implemented
```

### Skill Activation
```
Use energen-code-investigator to verify Service K backend implementation
```

### What the Skill Does (Automatic)

1. **Context Loading** (Silent)
   - Loads SYSTEM_CORE.md
   - Loads SESSION_MEMORY.json
   - Loads CLAUDE.md
   - Loads CONTEXT_INDEX.md

2. **Investigation Classification**
   - Type: `feature_verification`
   - Minimums: 500 lines, 3 files, 3 functions

3. **Comprehensive Search**
   ```javascript
   Queries performed:
   - "ServiceK" → 12 matches
   - "getServiceK" → 2 matches
   - "battery" → 47 matches
   - "batteryReplacement" → 3 matches
   - "getBatteryService" → 2 matches
   - "test-battery" → 1 file
   - "Battery.*Service" → 5 matches
   ```

4. **Complete File Reading**
   ```
   ✅ complete-calculation-engine.cjs (925 lines - complete)
   ✅ server-secure.cjs (1400 lines - complete)
   ✅ test-battery-service.cjs (147 lines - complete)
   ✅ integrated-ui.html (300 lines - partial, relevant section)

   Total: 1247 lines examined
   ```

5. **Function Analysis**
   ```javascript
   ✅ getBatteryService() - lines 505-520 (complete)
   ✅ calculateBatteryPrice() - lines 618-635 (complete)
   ✅ validateBatteryConfig() - lines 275-290 (complete)
   ✅ updateBatteryUI() - UI integration (complete)
   ✅ testBatteryCalculation() - test suite (complete)

   Total: 5 functions analyzed completely
   ```

6. **Contradiction Detection**
   ```
   ⚠️ CONTRADICTION FOUND:
   - CLAUDE.md says: "Service K has no backend"
   - Code shows: getBatteryService() exists at lines 505-520
   - Resolution: CODE WINS ✅
   ```

### Output Report

```markdown
## 🔍 Verification Metrics

### Evidence Gathered
- **Lines examined:** 1247 (Minimum: 500) ✅
- **Files read completely:** 4 (Minimum: 3) ✅
  - complete-calculation-engine.cjs (925 lines)
  - server-secure.cjs (1400 lines)
  - test-battery-service.cjs (147 lines)
  - integrated-ui.html (300 lines - partial)
- **Complete functions analyzed:** 5 (Minimum: 3) ✅
  - getBatteryService()
  - calculateBatteryPrice()
  - validateBatteryConfig()
  - updateBatteryUI()
  - testBatteryCalculation()
- **Search queries used:** 7 ✅
  - ServiceK → 12 matches
  - getServiceK → 2 matches
  - battery → 47 matches
  - batteryReplacement → 3 matches
  - getBatteryService → 2 matches
  - test-battery → 1 file
  - Battery.*Service → 5 matches

### Confidence Assessment
- **Confidence Level:** 100%
- **All Minimums Met:** ✅ Yes
- **Would I bet $10,000?** ✅ Yes

### Code Evidence

**Finding: Service K Backend Implementation**
Location: `src/api/complete-calculation-engine.cjs:505-520`

```javascript
getBatteryService(kw, contractMonths, serviceFrequency) {
  const kwRange = this.getKwRange(kw);
  const batteryReplacementData = this.settings.services.battery_replacement;

  if (!batteryReplacementData || !batteryReplacementData.prices) {
    return { error: 'Battery replacement service not configured' };
  }

  const baseBatteryPrice = batteryReplacementData.prices[kwRange];
  if (!baseBatteryPrice) {
    return { error: `No battery price found for kW range ${kwRange}` };
  }

  const effectiveFrequency = serviceFrequency === 0 ? 0 : 1;
  return this.calculateServicePrice(baseBatteryPrice, contractMonths, effectiveFrequency);
}
```

**Analysis:** Service K backend is fully implemented with:
- kW-based pricing lookup
- Frequency handling (one-time service)
- Error checking
- Consistent pattern with Services A-J

**Finding: Tests Verified**
Location: `test-battery-service.cjs`

Tests: 14/14 passing ✅

### Contradictions Resolved
- **Documentation:** "Service K has no backend implementation"
- **Code Reality:** getBatteryService() exists at lines 505-520
- **Resolution:** CODE WINS - Documentation outdated

### Completion Status
- [✅] Code written/modified
- [✅] Tests exist and passing (14/14)
- [ ] User confirmation pending
- **Status:** Tests passing, ready for review
```

### Session Memory Update (Automatic)
```bash
# Automatically adds verified fact to SESSION_MEMORY.json:
{
  "service_k_backend": "complete at complete-calculation-engine.cjs:505-520",
  "service_k_tests": "14/14 passing",
  "last_verified": "2025-10-17"
}
```

---

## Example 2: Bug Investigation

### User Request
```
Investigate why mobilization costs are doubling incorrectly
```

### Skill Activation
```
Use energen-code-investigator to investigate mobilization doubling bug
```

### What the Skill Does

1. **Classification:** `bug_fix`
2. **Minimums:** 200 lines, 2 files, 2 functions
3. **Search:** Mobilization-related code
4. **Read:** Complete functions involved
5. **Analyze:** Logic flow

### Output Report

```markdown
## 🔍 Verification Metrics

### Evidence Gathered
- **Lines examined:** 437 (Minimum: 200) ✅
- **Files read:** 3 ✅
  - complete-calculation-engine.cjs (925 lines)
  - MobilizationStackingEngine.js (312 lines)
  - test-mobilization-doubling.cjs (200 lines)
- **Functions analyzed:** 3 ✅
  - calculateMobilization()
  - applyStackingDiscount()
  - testMobilizationStacking()

### Code Evidence

**Bug Location:** `complete-calculation-engine.cjs:755`

```javascript
// INCORRECT (BEFORE):
const totalMobilization = mobilizationCost * 2; // ❌ Always doubles

// CORRECT (SHOULD BE):
const totalMobilization = serviceCount > 1
  ? mobilizationCost * 0.65 * serviceCount
  : mobilizationCost;
```

**Root Cause:** Unconditional doubling instead of conditional stacking discount

### Completion Status
- [✅] Bug identified with code evidence
- [✅] Root cause determined
- [ ] Fix implemented
- [ ] Tests passing
- **Status:** Bug identified, fix ready for implementation
```

---

## Example 3: Assessment

### User Request
```
Assess overall system completeness and production readiness
```

### Skill Activation
```
Use energen-code-investigator to assess overall system status
```

### What the Skill Does

1. **Classification:** `assessment`
2. **Minimums:** 1000 lines, 5 files, 5 functions
3. **Comprehensive scan:** All services, APIs, tests
4. **Verification:** Complete architecture review

### Output Report

```markdown
## 🔍 Verification Metrics

### Evidence Gathered
- **Lines examined:** 3247 (Minimum: 1000) ✅
- **Files read:** 8 ✅
  - server-secure.cjs (1400 lines)
  - complete-calculation-engine.cjs (925 lines)
  - integrated-ui.html (6650 lines - partial 500)
  - default-settings.json (412 lines)
  - test-all-services.cjs (145 lines)
  - test-battery-service.cjs (147 lines)
  - test-fuel-polishing.cjs (118 lines)
  - SYSTEM_CORE.md (145 lines)
- **Functions analyzed:** 12 ✅

### System Status

**Services Implemented:**
- ✅ Service A-J (Core services) - Complete with tests
- ✅ Service K (Battery) - Complete with 14 tests
- ✅ Fuel Polishing - Complete with 10 tests
- ✅ CUSTOM service support - Complete

**Test Coverage:**
- Total tests: 69/69 passing (100%) ✅
- Last run: 2025-09-30
- All service types covered

**API Endpoints:**
- ✅ POST /api/calculate
- ✅ POST /api/preview-prices
- ✅ POST /api/calculate-unit-price
- ✅ POST /api/generate-pdf
- ✅ POST /api/zoho/create-quote
- ✅ GET /api/zoho/oauth

**Integrations:**
- ✅ Google Maps (unified key)
- ✅ Zoho CRM (OAuth2)
- ✅ CDTFA Tax (real-time)

### Contradictions Resolved
1. Documentation claimed Service K missing → Code shows complete
2. Documentation said port 3001 → Code shows 3002
3. Documentation said no custom service → Code has full support

### Confidence Assessment
- **Confidence:** 100%
- **Would bet $10K:** ✅ Yes
- **Rationale:** Comprehensive review (3247 lines, 8 files, 12 functions). All tests passing. All integrations verified in code.

### Completion Status
- **Overall Status:** Production ready ✅
- **Blocking Issues:** None
- **Recommendations:** Update documentation to match code reality
```

---

## Example 4: Premature Completion Prevention

### User Request
```
I added a new feature. Mark it as complete.
```

### Skill Response (Prevents Premature Claim)

```markdown
## Investigation Status: INCOMPLETE

I cannot declare this feature "complete" without:

### Missing Requirements
- [ ] Tests executed and passing
- [ ] Manual verification in running system
- [ ] User confirmation of functionality

### Current Status
- [✅] Code written
- [❌] Tests not run
- [❌] Functionality not verified

### Evidence Found
- Code exists at: [file:lines]
- Test file exists: [yes/no]
- Tests passing: UNKNOWN (not run)

### Accurate Status
**"Implementation ready for testing"**

NOT "Complete" - Code written ≠ Code working

### Next Steps
1. Run tests: `npm test`
2. Verify functionality manually
3. User confirms it works
4. THEN can claim "complete and verified"

**Would I bet $10,000 this works?** ❌ No - Tests not run
```

---

## Example 5: "I Don't Know" Response

### User Request
```
Verify the entire Zoho integration implementation
```

### Skill Response (Honest Uncertainty)

```markdown
## Investigation Status: INCOMPLETE

### Verification Attempted
- **Lines examined so far:** 547
- **Files checked:** 2
  - zoho-integration.cjs (347 lines)
  - server-secure.cjs (200 lines - partial)
- **Functions analyzed:** 3

### What I Found
- ✅ OAuth2 flow exists
- ✅ Quote creation endpoint exists
- ⚠️ Token refresh logic partially examined

### What I Could NOT Verify
- Complete token refresh implementation (file too large, hit context limit)
- Error handling coverage (would need 500+ more lines)
- All integration endpoints (need to read 3+ more files)
- Test coverage (test files not yet examined)

### Honest Assessment
**Confidence: 45%** (Below professional standard)
**Would bet $10K:** ❌ No

**I don't know if Zoho integration is complete** because:
1. Only examined 547/2000+ relevant lines
2. Partial function reads (incomplete verification)
3. Test files not checked
4. Error paths not fully traced

### To Achieve 100% Confidence, I Need To:
1. Read 1500+ additional lines across 4+ files
2. Analyze complete token refresh implementation
3. Verify all error handling paths
4. Check test coverage
5. Estimated additional context: ~3000 tokens

**Recommendation:**
- Accept 45% confidence partial report OR
- Allow deep investigation (will require full context budget)

**Your choice: Speed with uncertainty OR thoroughness with certainty?**
```

---

## Script Usage Examples

### Track Metrics During Investigation

```bash
# During investigation, track your metrics
node .claude/skills/energen-code-investigator/scripts/track-metrics.js \
  --lines 1247 \
  --files "server-secure.cjs,complete-calculation-engine.cjs,ui.html,test.cjs" \
  --functions "getServiceK,calculatePrice,updateUI,validateConfig,test" \
  --queries "ServiceK,getServiceK,battery,test" \
  --type feature_verification \
  --output metrics-report.json

# Output:
# ✅ Metrics saved to: metrics-report.json
#
# ## 🔍 Verification Metrics
# - Lines examined: 1247 (Minimum: 500) ✅
# - Files read: 4 (Minimum: 3) ✅
# - Functions analyzed: 5 (Minimum: 3) ✅
# - Search queries: 4 ✅
# - Confidence: 100% (high)
# - Would bet $10K: ✅ Yes
```

### Update Session Memory After Investigation

```bash
# Add verified fact
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --fact "Service K backend fully implemented in complete-calculation-engine.cjs:505-520" \
  --verified true \
  --source "complete-calculation-engine.cjs" \
  --evidence "getBatteryService() method with 14 passing tests"

# Output:
# ✅ Added verified fact: Service K backend fully implemented...
#    Source: complete-calculation-engine.cjs
#    Evidence: getBatteryService() method with 14 passing tests
# ✅ SESSION_MEMORY.json updated successfully
```

```bash
# Add code change
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --code-change "Added getBatteryService() method" \
  --file "src/api/complete-calculation-engine.cjs" \
  --lines "505-520" \
  --commit "467083d"

# Output:
# ✅ Added code change:
#    File: src/api/complete-calculation-engine.cjs
#    Lines: 505-520
#    Change: Added getBatteryService() method
# ✅ SESSION_MEMORY.json updated successfully
```

```bash
# Add architecture note
node .claude/skills/energen-code-investigator/scripts/update-session-memory.js \
  --architecture-note "service_k_pricing" "Uses kW-based lookup with frequency=1 (one-time service)"

# Output:
# ✅ Added architecture note:
#    Key: service_k_pricing
#    Value: Uses kW-based lookup with frequency=1 (one-time service)
# ✅ SESSION_MEMORY.json updated successfully
```

---

## Integration with Development Workflow

### Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Track metrics for changed files
FILES=$(git diff --cached --name-only | grep -E '\.(js|cjs)$' | tr '\n' ',')
LINES=$(git diff --cached --numstat | awk '{sum += $1} END {print sum}')

node .claude/skills/energen-code-investigator/scripts/track-metrics.js \
  --lines $LINES \
  --files "$FILES" \
  --functions "$(git diff --cached | grep -E '^[+-]function|^[+-]const.*=' | wc -l)" \
  --queries "test" \
  --type completion_claim

# Exit 1 if minimums not met
if [ $? -ne 0 ]; then
  echo "❌ Commit blocked: Verification minimums not met"
  echo "Run tests and ensure code quality before committing"
  exit 1
fi
```

### CI/CD Pipeline
```yaml
# .github/workflows/verify.yml
name: Code Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2

      - name: Track Metrics
        run: |
          node .claude/skills/energen-code-investigator/scripts/track-metrics.js \
            --lines $(wc -l src/**/*.cjs | tail -1 | awk '{print $1}') \
            --files "$(find src -name '*.cjs' | tr '\n' ',')" \
            --functions "$(grep -r 'function\|const.*=' src | wc -l)" \
            --queries "test" \
            --type assessment \
            --output metrics.json

      - name: Upload Metrics
        uses: actions/upload-artifact@v2
        with:
          name: verification-metrics
          path: metrics.json
```

---

## Best Practices

### 1. Always Show Your Work
```markdown
❌ BAD: "Service K exists"
✅ GOOD: "Service K backend found at complete-calculation-engine.cjs:505-520 (verified by reading 925 complete lines and 7 search queries)"
```

### 2. Track Metrics in Real-Time
```markdown
As you investigate, note:
- Lines read: [running count]
- Files examined: [list]
- Functions analyzed: [list]
- Searches performed: [list with results]
```

### 3. Use Scripts for Automation
```bash
# Don't manually calculate confidence - use the script
node track-metrics.js [params] # Automatic calculation
```

### 4. Update Session Memory Immediately
```bash
# After verifying a fact, persist it
node update-session-memory.js --fact "..." --verified true
```

### 5. Never Claim Completion Without Tests
```markdown
❌ "Feature complete!"
✅ "Implementation ready for testing"
✅ "Tests passing (14/14), ready for review"
✅ "Complete and verified" (only after tests pass + user confirms)
```

---

**Remember:** The skill enforces professional engineering standards. Code written ≠ code working. Tests must pass. Evidence required. Accuracy > Speed.
