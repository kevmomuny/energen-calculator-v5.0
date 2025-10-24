# Claude Code Setup Issues - Energen Calculator v5.0

## Issues Identified (2025-10-23)

### 1. **Git Repository Structure Conflict** ⚠️ CRITICAL
- **Problem**: Git repository exists at parent level (`C:/ECalc`) instead of project level (`C:/ECalc/active/energen-calculator-v5.0`)
- **Impact**: Claude Code expects git repo at project root, causing crashes and confusion
- **Current Structure**:
  ```
  C:/ECalc/.git                    ← Git repo here (parent)
  C:/ECalc/active/energen-calculator-v5.0/   ← Project here (no .git)
  ```
- **Expected Structure**: Either:
  - Option A: Git repo at project level (v5.0 has its own .git)
  - Option B: Use git worktree to properly separate v5.0

### 2. **Claude Code Configuration Issues**
- **Location**: `C:/ECalc/active/energen-calculator-v5.0/.claude/settings.local.json`
- **Status**: ✅ Configuration exists and looks good
- **MCP Servers Configured**:
  - desktop-commander ✅
  - kapture ✅
  - playwright (enabled in config) ✅

### 3. **VSCode Configuration**
- **Location**: `C:/ECalc/active/energen-calculator-v5.0/.vscode/`
- **Issues Found**:
  - `mcp.json` points to Zoho cloud MCP (may cause conflicts)
  - `settings.json` has local Zoho MCP disabled (good, but may be confusing)

### 4. **Large Node Modules in Project**
- Over 395 items in node_modules causing potential performance issues
- May contribute to slow loading/crashing

## Recommended Fixes

### Fix 1: Separate Git Repository (RECOMMENDED)
Make v5.0 its own independent git repository:
```bash
cd C:/ECalc/active/energen-calculator-v5.0
git init
git remote add origin https://github.com/kevmomuny/energen-calculator-v5.0.git
git add .
git commit -m "Initial commit for v5.0 project"
```

### Fix 2: Use Git Worktree (ALTERNATIVE)
Keep parent repo but use worktrees properly:
```bash
cd C:/ECalc
git worktree add -b v5.0-main active/energen-calculator-v5.0
```

### Fix 3: Clean Up VSCode MCP Config
- Remove conflicting MCP configurations
- Keep only one source of truth for MCP servers

### Fix 4: Add .gitignore to v5.0
Ensure proper gitignore at project level to exclude:
- node_modules
- .env files
- logs
- temp files

## Next Steps
1. Choose Fix 1 or Fix 2 based on your preference
2. Apply the fix
3. Test opening project in Claude Code
4. Verify no crashes occur
5. Document final setup

---
**Created**: 2025-10-23  
**Issue**: Claude Code crashes when opening energen-calculator-v5.0
