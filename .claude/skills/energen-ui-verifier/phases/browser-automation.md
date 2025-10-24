## BROWSER AUTOMATION TOOL SELECTION

**UPDATED 2025-10-18:** Based on comprehensive testing of all three MCP tools with Energen Calculator v5.0.

---

## 🏆 TOOL PRIORITY ORDER (Evidence-Based)

### 1. **PRIMARY: Kapture MCP** 🥇
**Why:** Fastest execution (50% faster than Chrome DevTools), simplest API, best debugging

### 2. **SECONDARY: Chrome DevTools MCP** 🥈
**Why:** Native CDP performance, accessibility tree, excellent for CI/CD

### 3. **TERTIARY: Playwright MCP** 🥉
**Why:** Cross-browser support, battle-tested, production test suites

---

## 📊 PERFORMANCE COMPARISON (Tested 2025-10-18)

| Metric | Kapture | Chrome DevTools | Playwright |
|--------|---------|-----------------|------------|
| **Total Test Time** | ~1 min | ~2 min | ~4 min |
| **Navigation** | < 1s | < 2s | ~2s |
| **Form Fill** | < 0.5s | < 1s | ~1s |
| **Screenshot** | < 0.5s | < 1s | ~1s |
| **Success Rate** | 100% | 100% | 100% |

**Winner:** 🥇 **Kapture MCP** (50-75% faster than alternatives)

---

## 🎯 TOOL SELECTION GUIDE

### Use Kapture MCP When:
- ✅ Daily development testing (fastest iteration)
- ✅ Reactive UI debugging (full HTML + metadata)
- ✅ Chrome-only application
- ✅ Standard CSS selectors preferred
- ✅ Need screenshot preview URLs
- ✅ Rapid test development

**Best For:** Energen Calculator v5.0 daily testing

### Use Chrome DevTools MCP When:
- ✅ CI/CD pipeline integration
- ✅ Need accessibility tree structure
- ✅ Testing accessibility compliance
- ✅ Native Chrome DevTools Protocol required
- ✅ Semantic element inspection needed

**Best For:** Automated deployment pipelines

### Use Playwright MCP When:
- ✅ Cross-browser testing (Firefox, WebKit)
- ✅ Testing external applications (no code access)
- ✅ Building production test suites
- ✅ Need battle-tested reliability
- ✅ Robust modal/dialog handling required

**Best For:** Comprehensive cross-browser verification

---

## 🔧 KAPTURE MCP TOOLS (PRIMARY)

### Navigation:
- `mcp__kapture__new_tab` - Open new browser tab
- `mcp__kapture__navigate` - Navigate to URL with timeout
- `mcp__kapture__list_tabs` - List all connected tabs
- `mcp__kapture__close` - Close browser tab
- `mcp__kapture__reload` - Reload current page

### Interaction:
- `mcp__kapture__click` - Click elements by CSS selector
- `mcp__kapture__fill` - Fill input fields by selector
- `mcp__kapture__select` - Select dropdown options
- `mcp__kapture__hover` - Hover over elements
- `mcp__kapture__focus` - Focus elements
- `mcp__kapture__blur` - Remove focus
- `mcp__kapture__keypress` - Send keyboard input

### Inspection:
- `mcp__kapture__dom` - Get full HTML or element HTML
- `mcp__kapture__elements` - Query elements with metadata
- `mcp__kapture__screenshot` - Capture with preview URL
- `mcp__kapture__console_logs` - Get console with filters

### Advantages:
- ✅ Standard CSS selectors (most familiar)
- ✅ Full HTML + element metadata (best debugging)
- ✅ Screenshot preview URLs (immediate viewing)
- ✅ Excellent console log filtering
- ✅ Fastest execution time

---

## 🔧 CHROME DEVTOOLS MCP TOOLS (SECONDARY)

### Navigation:
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__new_page` - Create new page
- `mcp__chrome-devtools__close_page` - Close page

### Interaction:
- `mcp__chrome-devtools__click` - Click by UID
- `mcp__chrome-devtools__fill` - Fill by UID
- `mcp__chrome-devtools__evaluate_script` - Execute JavaScript

### Inspection:
- `mcp__chrome-devtools__take_snapshot` - Accessibility tree with UIDs
- `mcp__chrome-devtools__take_screenshot` - Visual capture
- `mcp__chrome-devtools__list_console_messages` - Console logs
- `mcp__chrome-devtools__list_network_requests` - Network activity

### Advantages:
- ✅ Native Chrome DevTools Protocol
- ✅ Semantic accessibility tree
- ✅ Real-time console monitoring
- ✅ Excellent for CI/CD

### Disadvantages:
- ⚠️ UIDs change on re-render (fragile)
- ⚠️ Requires `AUTOMATED_TEST_MODE` flag
- ⚠️ Accessibility tree lacks HTML details

---

## 🔧 PLAYWRIGHT MCP TOOLS (TERTIARY)

### Navigation:
- `mcp__playwright__playwright_navigate` - Navigate with options
- `mcp__playwright__playwright_close` - Close browser

### Interaction:
- `mcp__playwright__playwright_click` - Click by CSS selector
- `mcp__playwright__playwright_fill` - Fill by selector
- `mcp__playwright__playwright_select` - Select dropdown
- `mcp__playwright__playwright_hover` - Hover elements
- `mcp__playwright__playwright_upload_file` - File upload

### Inspection:
- `mcp__playwright__playwright_get_visible_text` - Page text
- `mcp__playwright__playwright_get_visible_html` - Page HTML
- `mcp__playwright__playwright_screenshot` - Screenshot
- `mcp__playwright__playwright_console_logs` - Console logs

### Advantages:
- ✅ Cross-browser support (Chrome, Firefox, WebKit)
- ✅ Robust modal/dialog handling
- ✅ Battle-tested reliability
- ✅ Excellent retry logic

### Disadvantages:
- ⚠️ Slower (heavier abstraction)
- ⚠️ More verbose API
- ⚠️ Overkill for Chrome-only apps

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: Timeout Errors
**Root Cause:** Blocking modal dialogs (alert/confirm)

**Solution:**
```javascript
// Set automated test mode to suppress blocking dialogs
window.AUTOMATED_TEST_MODE = true;

// Use safeAlert wrapper in application code
window.safeAlert('Message'); // Logs instead of blocking in test mode
```

### Issue: Element Not Found
**Root Cause:** Dynamic content loading, element not yet rendered

**Solution (Kapture/Playwright):**
```javascript
// Add explicit waits
await page.waitForSelector('#element-id', { timeout: 5000 });
```

**Solution (Chrome DevTools):**
```javascript
// Re-take snapshot after delay
await new Promise(r => setTimeout(r, 1000));
const newSnapshot = await takeSnapshot();
```

### Issue: UIDs Change (Chrome DevTools)
**Root Cause:** Page re-renders invalidate accessibility tree UIDs

**Solution:**
- Switch to Kapture MCP (CSS selectors more stable)
- Re-take snapshot before each interaction
- Use Playwright for dynamic UIs

---

## 🧪 TESTING WORKFLOW (RECOMMENDED)

### For Energen Calculator v5.0:

1. **Start with Kapture MCP:**
   ```javascript
   // Connect to existing tab or create new
   const tabs = await mcp__kapture__list_tabs();
   const tabId = tabs[0]?.id || await mcp__kapture__new_tab();

   // Navigate
   await mcp__kapture__navigate(tabId, "http://localhost:3002");

   // Set test mode
   await mcp__kapture__dom(tabId); // Inject script if needed

   // Interact
   await mcp__kapture__fill(tabId, "#companyName", "Test Co");
   await mcp__kapture__click(tabId, "button:has-text('Calculate')");

   // Verify
   const screenshot = await mcp__kapture__screenshot(tabId);
   const logs = await mcp__kapture__console_logs(tabId);
   ```

2. **If Kapture unavailable, use Chrome DevTools:**
   ```javascript
   await mcp__chrome-devtools__new_page("http://localhost:3002");
   const snapshot = await mcp__chrome-devtools__take_snapshot();
   await mcp__chrome-devtools__fill(snapshot.uidForCompanyName, "Test Co");
   await mcp__chrome-devtools__click(snapshot.uidForCalculateButton);
   ```

3. **For cross-browser, use Playwright:**
   ```javascript
   await mcp__playwright__playwright_navigate("http://localhost:3002");
   await mcp__playwright__playwright_fill("#companyName", "Test Co");
   await mcp__playwright__playwright_click("button:has-text('Calculate')");
   ```

---

## 📋 EVIDENCE FROM TESTING (2025-10-18)

### All Three Tools Tested Successfully:

**Phases 0-6 Results:**
- ✅ Kapture MCP: 124/124 checks, ~1 min, 100% success
- ✅ Chrome DevTools MCP: 124/124 checks, ~2 min, 100% success
- ✅ Playwright MCP: 124/124 checks, ~4 min, 100% success

**Key Finding:** Earlier timeout issues were **application-side blocking dialogs**, not tool failures. All three tools work perfectly after fixes.

**Fixes Applied:**
1. `window.AUTOMATED_TEST_MODE` flag
2. `window.safeAlert()` wrapper
3. Modal system CSS (450 lines)
4. Server startup race condition fix

---

## 🎯 FINAL RECOMMENDATION

**For Energen Calculator v5.0:** Use **Kapture MCP** as primary tool.

**Rationale:**
- 50% faster than Chrome DevTools
- 75% faster than Playwright
- Standard CSS selectors (familiar to team)
- Best debugging (full HTML + metadata)
- Simplest API (fastest test development)
- Excellent for reactive UI debugging

**Document which tool was used in all verification reports.**

---

**Last Updated:** 2025-10-18
**Test Evidence:** All three tools validated with Phases 0-6
**Recommendation:** Kapture MCP primary, Chrome DevTools secondary, Playwright tertiary
