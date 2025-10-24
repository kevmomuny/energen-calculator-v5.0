# Claude Instructions - Energen v5.0

## Primary Context
1. Read `SYSTEM_CORE.md` for system architecture and state
2. Read `SESSION_MEMORY.json` for current work and verified facts
3. Use `CONTEXT_INDEX.md` for task-based file selection

## Verification Standard
- Read complete functions before claiming implementation status
- Search code variations before declaring absence
- Provide evidence: file path, line numbers, actual code
- Update `SESSION_MEMORY.json` with new verified facts

## File Path Convention
All paths relative to project root.
Desktop Commander requires absolute paths: `C:/Ecalc/active/energen-calculator-v5.0/...`

## Code-First Principle
Git log + actual code > documentation > completion reports

## CRITICAL: No Unsolicited Documentation Files
- **NEVER create .md files unless explicitly requested by user**
- Reports, summaries, guides, evaluations → CHAT ONLY
- User will ask: "Write this to a file" when needed
- Creating unrequested documentation wastes user time
- Exception: Updating existing instruction/context files when asked

## CRITICAL: No Premature Completion Claims
- **NEVER declare "complete" or "success" without verification**
- Code written ≠ code working
- Required for completion claim:
  1. Code written AND
  2. Tests pass (or manual verification confirmed) AND
  3. User confirms functionality
- Acceptable: "Code written, needs testing" or "Implementation ready for verification"
- Unacceptable: "Task complete!" when only code exists
- False completion claims pollute context and destroy AI agent utility

## Permission to Acknowledge Uncertainty
- If information cannot be verified in code: Say "I cannot verify this in the code"
- If search patterns return no results: Report "No matches found" (don't speculate)
- If file doesn't exist: State clearly (don't assume)

## Tool Usage Optimization
- **Parallel tool calls**: When reading multiple independent files, call Read in parallel
- **Agent vs. Search**: Use Agent tool for open-ended searches (>3 search iterations expected)
- **Grep before Read**: Search for patterns before reading large files

---

## 🚨 CRITICAL: PROCESS MANAGEMENT SAFETY

**THE PROBLEM:** Claude Code runs in Node.js. Killing Node processes carelessly **WILL KILL CLAUDE CODE**.

### ❌ NEVER DO THIS:
```bash
taskkill /F /IM node.exe          # Kills Claude Code itself!
Get-Process node | Stop-Process   # Kills Claude Code itself!
pkill node                        # Kills Claude Code itself!
```

### ✅ SAFE APPROACH:
```bash
# 1. List processes with details to identify server
Get-Process node | Select-Object Id,Path,StartTime

# 2. Find server by port
netstat -ano | findstr :3002

# 3. Kill ONLY the specific server PID
taskkill /PID <server_specific_pid> /F

# 4. When uncertain, ASK USER to manually restart
```

### RULES:
1. **Always kill by specific PID, never by process name**
2. **List processes first to identify which is which**
3. **When uncertain, ask user for guidance**
4. **Prefer code fixes over process restarts**

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for complete process management guide.

---
