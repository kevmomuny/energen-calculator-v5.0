## SERVER RESTART PROTOCOL (After Bug Fixes)

**Critical:** Code changes require server restart. Node.js caches modules; file edits won't apply until server reloaded.

**Problem Symptoms:**
- API returns old/incorrect data despite code fixes
- Calculation results don't match updated formulas
- New features don't appear in responses
- Console shows old error messages

**Root Cause:**
Old server process (PID) still running with cached version of code. Must kill zombie process and start fresh.

---

## ⚠️ CRITICAL: SURGICAL PROCESS MANAGEMENT

**🚨 THE MISTAKE THAT KILLS CLAUDE CODE ITSELF:**

**Claude Code runs in a Node.js process.** When you kill Node processes indiscriminately, **you terminate Claude Code itself.** This causes immediate disconnection and requires manual restart by the user.

**USE THE SAFE RESTART SCRIPT:**
```powershell
# From project root - safest method
.\safe-server-restart.ps1

# This script:
# 1. Finds process on port 3002 by PID
# 2. Verifies it's not Claude Code
# 3. Kills only the specific server PID
# 4. Optionally restarts the server
```

**THE MISTAKE THAT KILLS YOUR OWN NODE:**

When testing requires killing the Energen server process, you MUST be surgical and precise. The test environment runs in a Node.js process itself - if you kill node processes indiscriminately, you kill yourself.

**❌ NEVER DO THIS (Self-Destructive):**
```javascript
// This kills ALL node processes including the one running Claude Code MCP
taskkill /IM node.exe /F

// This kills ALL PIDs in a list without checking which is YOUR process
Stop-Process -Id 32012,26404,10300,...  // One of these might be YOU!

// This kills processes by name pattern (too broad)
Get-Process node | Stop-Process -Force

// This kills background bash shells indiscriminately
KillShell(shell_id_1), KillShell(shell_id_2), ...  // Might kill your own shell
```

**✅ ALWAYS DO THIS (Surgical):**
```javascript
// 1. IDENTIFY the SPECIFIC PID listening on port 3002
netstat -ano | findstr ":3002"
// Output: TCP  0.0.0.0:3002  ...  LISTENING  32012

// 2. VERIFY this PID is NOT your own process
// Check: Is this PID different from Desktop Commander's PID?
// Check: Is this PID from a server startup you control?

// 3. KILL ONLY the specific PID for port 3002
powershell -Command "Stop-Process -Id 32012 -Force"

// 4. VERIFY the kill was successful
netstat -ano | findstr ":3002"
// Should return empty (no output)
```

**ANALOGY:** A surgeon removing an appendix doesn't cut off their own head. You are performing surgery on the server process while your own Node.js process is the surgeon. Be precise.

**SAFE WORKFLOW:**
1. **Identify target PID**: `netstat -ano | findstr ":3002"` → PID 32012
2. **Verify target**: "Is PID 32012 the server I want to kill?" (YES)
3. **Cross-check**: "Is PID 32012 my Desktop Commander process?" (NO)
4. **Kill target**: `powershell -Command "Stop-Process -Id 32012 -Force"`
5. **Verify death**: `netstat -ano | findstr ":3002"` → (empty)
6. **Start fresh**: `node src/api/server-secure.cjs` → New PID 28888

**ZOMBIE PROCESS CLEANUP:**
If you have multiple zombie servers from previous test runs, kill them ONE BY ONE by PID:
```powershell
# Find all node processes listening on 3002 (should be only one)
Get-NetTCPConnection -LocalPort 3002 | Select-Object -ExpandProperty OwningProcess

# Kill ONLY that specific PID
Stop-Process -Id [SPECIFIC_PID] -Force
```

**NEVER:**
- ❌ Kill all node.exe processes (you ARE node.exe)
- ❌ Kill all background bash processes (one might be yours)
- ❌ Use broad process name filters (node, bash, etc.)
- ❌ Kill PIDs without verifying which is the server

**ALWAYS:**
- ✅ Identify specific PID via port (netstat)
- ✅ Kill ONE specific PID at a time
- ✅ Verify kill success before starting new server
- ✅ Test server is responding before declaring success

**If you violate this rule:** Your own Node.js process dies, Desktop Commander disconnects, and the testing session terminates abruptly. The user has to restart everything. This is like a surgeon cutting off their own head during surgery.

---

### METHOD 1: Desktop Commander (PREFERRED)

**Best for:** Clean, reliable process management with proper error handling

```javascript
// 1. Find current server PID using netstat (can also use list_processes)
// NOTE: list_processes output is malformed on Windows - use PowerShell commands instead

// 2. Kill old process using Desktop Commander
mcp__desktop-commander__start_process({
  command: "Get-NetTCPConnection -LocalPort 3002 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }",
  shell: "powershell.exe",
  timeout_ms: 5000
});

// 3. Wait for port to release
sleep(2);

// 4. Start new server using Desktop Commander
mcp__desktop-commander__start_process({
  command: "Set-Location C:/ECalc/active/energen-calculator-v5.0; node src/api/server-secure.cjs",
  shell: "powershell.exe",
  timeout_ms: 8000  // Wait for startup logs
});

// 5. Verify server started by checking startup logs in response
// Look for: "info: RFP processing endpoints mounted at /api/rfp"
// Look for: "info: ✅ Zoho integration endpoints registered"

// 6. Navigate to fresh page and test
```

**Advantages:**
- ✅ Proper PowerShell execution (no bash compatibility issues)
- ✅ Returns startup logs immediately (see "info:" messages)
- ✅ Detects port conflicts ("EADDRINUSE: address already in use")
- ✅ Can monitor process output with interact_with_process
- ✅ Clean error handling

**Example Output (Success):**
```
Process started with PID 22056 (shell: powershell.exe)
Initial output:
info: Generator enrichment: Claude API enabled
info: 🔧 Verifying Zoho products via Catalyst...
info: RFP processing endpoints mounted at /api/rfp
info: ✅ Zoho integration endpoints registered
```

**Example Output (Port Conflict):**
```
error: 💥 UNCAUGHT EXCEPTION: {"error":"listen EADDRINUSE: address already in use :::3002"}
✅ Process 22056 has finished execution
```
If you see this, a zombie process is still running. Retry step 2 (kill command).

---

### METHOD 2: Bash with PowerShell (FALLBACK)

**Use when:** Desktop Commander unavailable

```bash
# 1. Find process using port 3002
netstat -ano | findstr :3002
# Returns: TCP  0.0.0.0:3002  ...  LISTENING  [PID]

# 2. Kill the old process
# NOTE: Standard bash 'kill' doesn't work with Windows PIDs in Git Bash
powershell -Command "Stop-Process -Id [PID] -Force"

# 3. Verify port is released
netstat -ano | findstr :3002
# Should return empty (no output)

# 4. Start fresh server (will fail with "stdin is not a tty")
# Background bash processes show stderr but server still starts
cd C:/ECalc/active/energen-calculator-v5.0 && node src/api/server-secure.cjs
# Run with: run_in_background=true

# 5. Wait for server startup
sleep 3

# 6. Verify new process running
netstat -ano | findstr :3002
# Should show NEW PID

# 7. Test updated endpoint
# Navigate to fresh page to avoid browser cache
```

**Background Bash Process Caveat:**
- Background bash (`run_in_background=true`) shows "stdin is not a tty" error
- This is NORMAL - server still starts successfully
- BashOutput will show `status: failed, exit_code: 1, stderr: stdin is not a tty`
- **IGNORE the "failed" status** - verify server via netstat or page navigation instead

**Why Bash Fails:**
- Git Bash/MINGW64 runs in pseudo-terminal (PTY)
- Background processes can't access stdin in PTY
- Node.js checks stdin availability on startup
- Reports error but continues running anyway
- This is architectural limitation, not actual failure

---

### METHOD 3: Multiple Retry Strategy (CURRENT WORKAROUND)

**What Actually Happens:**
When you attempt multiple server starts via bash (`run_in_background=true`), some succeed despite showing "failed" status:
- Try 1: Background bash ID `a90b5e` - shows "failed" but **server actually starts**
- Try 2: Background bash ID `3bbacf` - shows "failed" but **server actually starts** 
- Try 3: Background bash ID `447749` - shows "failed" but **server actually starts**
- Try 4: Background bash ID `bfce33` - shows "failed" but **server already running**

One of these processes IS serving on port 3002, we just can't tell which from the error messages.

**Detection:**
```bash
# If navigate_page succeeds, server is running!
mcp__chrome-devtools__navigate_page("http://localhost:3002/integrated-ui.html")
# Success = One of those "failed" processes is actually serving
# ERR_CONNECTION_REFUSED = No server running, retry with Method 1
```

**Current State Evidence:**
- Multiple background bash processes show "stdin is not a tty" (normal)
- Chrome DevTools successfully navigated to page (server IS running)
- Server has UPDATED code (quarterlyTotals fix applied)
- Don't kill these processes - one is serving correctly!

**Verification Checklist After Restart:**
1. ✅ Old PID killed (netstat shows different PID or empty)
2. ✅ New PID listening on port 3002
3. ✅ Navigate to FRESH page (clear cache or new incognito window)
4. ✅ Test endpoint returns expected data (not cached old response)
5. ✅ Console shows no errors from new code
6. ✅ Updated functionality works as expected

**Example: Quarterly Totals Bug Fix:**
```bash
# Before fix: PID 20808 running, hasQuarterlyTotals: false
# After code edit in complete-calculation-engine.cjs line 1210
# Server still returns false because PID 20808 has old cached code

# Kill old process:
powershell -Command "Stop-Process -Id 20808 -Force"

# Start new server (gets new PID like 31428):
node src/api/server-secure.cjs &

# Test now returns: hasQuarterlyTotals: true with Q1-Q4 data
```

**When to Use This Protocol:**
- After ANY edit to `src/api/*.cjs` files
- After modifying calculation engine
- After updating API endpoints
- After changing server configuration
- After installing new npm packages
- Whenever API responses don't reflect code changes

**DO NOT:**
- ❌ Use `kill -9 [PID]` (doesn't work with Windows PIDs in this bash environment)
- ❌ Use `taskkill /F /PID [PID]` (syntax errors in Git Bash)
- ❌ Assume server hot-reloads (it doesn't)
- ❌ Test immediately after starting (wait 3-5 seconds for server initialization)
- ❌ Reuse same browser tab (may have cached responses - open fresh tab)

**DO:**
- ✅ Use PowerShell via bash: `powershell -Command "Stop-Process..."`
- ✅ Verify port release before starting new server
- ✅ Verify new PID different from old PID
- ✅ Test with fresh browser page/incognito
- ✅ Check console logs for confirmation of new code execution

---
