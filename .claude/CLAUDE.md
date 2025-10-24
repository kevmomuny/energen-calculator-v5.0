# ENERGEN CALCULATOR V5.0 - CONTEXT

**Project**: Advanced bid tool for generator service contracts  
**Stack**: Node.js + Express backend, Vanilla JS frontend, Zoho integrations  
**Port**: 3002 (check `src/api/server-secure.cjs` to verify)

---

## CRITICAL PROTOCOLS

### Verification Requirements
- Read complete functions (not snippets)
- Search all variations before claiming "missing"
- Show evidence for every claim
- Track metrics: lines read, files examined, searches performed
- Code truth > documentation assumptions

### Anti-Hallucination Rules
- ❌ Never say "missing" without exhaustive search
- ❌ Never declare "complete" without passing tests
- ❌ Never create unsolicited .md report files
- ✅ Always verify in actual code
- ✅ Reports go in chat, files only when requested
- ✅ Complete = code written AND tests passing

### Process Management Safety
⚠️ **NEVER kill all node processes** - you will kill Claude Code itself
- Use specific PID only: `taskkill /PID <exact_pid> /F`
- Always list processes first with full paths
- When uncertain, ASK USER

---

## SKILLS AVAILABLE (17)

**Project**: bug-reporter, code-investigator, pdf-generator, rfp-evaluator, ui-verifier, zoho-integrator  
**Dev**: test-driven-development, systematic-debugging, finishing-branch, git-worktrees  
**Collab**: brainstorming, writing-plans, executing-plans  
**Docs**: xlsx, docx, pdf

**Usage**: Skills auto-activate or use explicitly: "Use energen-ui-verifier to test production readiness"

See: `.claude/skills/INTEGRATION_GUIDE.md` for patterns

---

## PROJECT STRUCTURE

```
frontend/               # UI (integrated-ui.html + modules)
src/api/               # Express server
src/engine/            # Calculation logic
modules/               # Shared modules (@energen/*, zoho-integration, pdf-generator)
tests/                 # Test suites
```

---

## KEY FILES

- `src/api/server-secure.cjs` - Main API server
- `frontend/integrated-ui.html` - Main UI
- `src/engine/calculation-engine.cjs` - Quote calculations
- `modules/zoho-integration/` - Zoho CRM/Books integration
- `tests/` - Automated tests

---

## MCP SERVERS

**Active**:
- `desktop-commander` - File/process management
- `kapture` - Browser automation
- `energen-lean` - Zoho cloud MCP (60+ tools)

**Docs**: See `CLOUD_MCP_SETUP.md`, `MCP_SETUP_REPORT.md`

---

## DEVELOPMENT RULES

### DO NOT MODIFY
- Labor rates (use settings)
- Service A-J core logic
- Excel-verified formulas

### ALWAYS TEST
```bash
npm test
curl http://localhost:3002/health
```

### GIT WORKFLOW
- Commit only when requested
- Never skip hooks (--no-verify)
- Follow message format in git log

---

## QUICK COMMANDS

```bash
# Verify everything
desktop-commander:get_file_info path:[file]
desktop-commander:start_search path:/ pattern:"[term]"

# For "missing" claims
desktop-commander:start_search pattern:"exactName"
desktop-commander:start_search pattern:"partial*"
desktop-commander:start_search pattern:"case.*variations"
```

---

## CONTEXT MANAGEMENT

**Strategy**: Selective auto-compact (enabled)  
**Permissions**: Full `//c/**` access, PowerShell, Git, Node.js

---

**Full protocols**: See `.claude/CLAUDE.md.backup-verbose` (archived)  
**Anti-hallucination**: See `.claude/ANTI_HALLUCINATION_PROTOCOL.md`  
**Skills guide**: See `.claude/skills/INTEGRATION_GUIDE.md`
