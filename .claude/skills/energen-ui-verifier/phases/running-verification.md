## RUNNING THE VERIFICATION

### Manual Execution (Recommended for First Run)
```bash
# 1. Ensure server running
node src/api/server-secure.cjs

# 2. Run verification skill (via Claude Code)
# This skill will guide you through each phase
# Take screenshots at every step
# Document every finding

# 3. Review results
cat .claude/skills/energen-ui-verifier/results/verification-report.json
```

### Automated Execution (After Manual Validation)
```bash
# Run automated verification script
node .claude/skills/energen-ui-verifier/scripts/run-ui-verification.cjs

# Exit code 0 = PASS (production ready)
# Exit code 1 = FAIL (NOT production ready)
```

---
