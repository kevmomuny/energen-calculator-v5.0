# Playwright MCP Usage Patterns

**Purpose:** Comprehensive guide for using Playwright MCP tools in Energen UI Verification

---

## Core Playwright Tools

### Navigation

```javascript
// Navigate to page
mcp__playwright__playwright_navigate({
  url: "http://localhost:3002/frontend/integrated-ui.html",
  waitUntil: "networkidle",  // Wait for all network requests to complete
  timeout: 5000
})

// Go back
mcp__playwright__playwright_go_back()

// Go forward
mcp__playwright__playwright_go_forward()
```

**Best Practices:**
- Always use `waitUntil: "networkidle"` for SPAs
- Set reasonable timeout (5-10 seconds)
- Verify page load before proceeding

---

## Element Interaction

### Clicking Elements

```javascript
// Click by text content
mcp__playwright__playwright_click({
  selector: "button:has-text('Calculate Quote')"
})

// Click by CSS selector
mcp__playwright__playwright_click({
  selector: "#calculate-btn"
})

// Click by class and attribute
mcp__playwright__playwright_click({
  selector: "button.primary[data-action='submit']"
})

// Double click
mcp__playwright__playwright_click({
  selector: "button.edit",
  dblClick: true
})
```

**Best Practices:**
- Prefer `:has-text()` for buttons with visible labels
- Use specific selectors (ID > class > element)
- Wait for element to be clickable (Playwright does this automatically)

### Filling Input Fields

```javascript
// Fill text input
mcp__playwright__playwright_fill({
  selector: "input[placeholder='Company Name']",
  value: "Test Generator Services LLC"
})

// Fill number input
mcp__playwright__playwright_fill({
  selector: "input[type='number']",
  value: "175"
})

// Fill email input
mcp__playwright__playwright_fill({
  selector: "input[type='email']",
  value: "test@example.com"
})
```

**Best Practices:**
- Use specific attribute selectors (placeholder, type, aria-label)
- Fill one field at a time
- Verify value set after filling

### Selecting Dropdown Options

```javascript
// Select by value
mcp__playwright__playwright_select({
  selector: "select#fuel-type",
  value: "Diesel"
})

// Select first dropdown on page
mcp__playwright__playwright_select({
  selector: "select",
  value: "Cummins"
})
```

**Best Practices:**
- Use ID selectors for dropdowns when available
- Verify option exists before selecting
- Check selection confirmed after select

### Hovering

```javascript
// Hover to reveal tooltip or menu
mcp__playwright__playwright_hover({
  selector: ".service-card[data-service='A']"
})
```

### Keyboard Input

```javascript
// Press Enter key
mcp__playwright__playwright_press_key({
  key: "Enter"
})

// Press key in specific field
mcp__playwright__playwright_press_key({
  selector: "input[type='text']",
  key: "Enter"
})

// Press Tab to navigate
mcp__playwright__playwright_press_key({
  key: "Tab"
})
```

---

## Waiting for Elements

### Wait for Text to Appear

```javascript
// Wait for specific text
mcp__playwright__playwright_wait_for({
  text: "ANNUAL TOTAL",
  timeout: 5000
})

// Wait for loading to disappear
mcp__playwright__playwright_wait_for({
  text: "Loading...",
  timeout: 2000
})
```

**Best Practices:**
- Set appropriate timeouts (loading indicators: 2-5s, API calls: 5-15s)
- Wait for unique text that indicates completion
- Use this for async operations

---

## Getting Page Content

### Get Visible Text

```javascript
// Get all visible text on page
const text = await mcp__playwright__playwright_get_visible_text()

// Parse for specific content
if (text.includes("Quote Generated Successfully")) {
  console.log("Success message found");
}
```

### Get HTML Content

```javascript
// Get full page HTML (scripts removed by default)
const html = await mcp__playwright__playwright_get_visible_html()

// Get HTML with scripts
const htmlWithScripts = await mcp__playwright__playwright_get_visible_html({
  removeScripts: false
})

// Get specific element HTML
const summaryHtml = await mcp__playwright__playwright_get_visible_html({
  selector: "#quote-summary"
})

// Get cleaned HTML
const cleanHtml = await mcp__playwright__playwright_get_visible_html({
  cleanHtml: true,
  removeScripts: true,
  removeStyles: true,
  removeComments: true
})
```

**Best Practices:**
- Use `cleanHtml: true` for content extraction
- Use `selector` to limit to specific section
- Remove scripts by default for security

---

## Screenshots

### Take Screenshot

```javascript
// Full page screenshot (saved to Downloads)
mcp__playwright__playwright_screenshot({
  name: "phase0-preflight",
  savePng: true,
  fullPage: true
})

// Viewport screenshot (faster)
mcp__playwright__playwright_screenshot({
  name: "phase1-customer-entry",
  savePng: true,
  fullPage: false
})

// Element screenshot
mcp__playwright__playwright_screenshot({
  name: "service-summary",
  savePng: true,
  selector: "#quote-summary"
})

// Custom directory
mcp__playwright__playwright_screenshot({
  name: "test-result",
  savePng: true,
  downloadsDir: "C:/ECalc/active/energen-calculator-v5.0/test-results/screenshots"
})

// Adjust quality
mcp__playwright__playwright_screenshot({
  name: "high-quality",
  savePng: true,
  width: 1920,
  height: 1080
})
```

**Best Practices:**
- Use descriptive names (phase-action format)
- Use `fullPage: false` for speed (viewport only)
- Save to custom directory for organization
- Take screenshots at every critical step

---

## Console Logs

### Get Console Logs

```javascript
// Get all console logs
const logs = await mcp__playwright__playwright_console_logs()

// Get only errors
const errors = await mcp__playwright__playwright_console_logs({
  type: "error"
})

// Get warnings
const warnings = await mcp__playwright__playwright_console_logs({
  type: "warning"
})

// Get logs and clear
const logs = await mcp__playwright__playwright_console_logs({
  type: "all",
  clear: true
})

// Limit results
const recentLogs = await mcp__playwright__playwright_console_logs({
  type: "all",
  limit: 50
})

// Search in logs
const apiLogs = await mcp__playwright__playwright_console_logs({
  search: "API",
  type: "log"
})
```

**Best Practices:**
- Check for errors after every major action
- Clear logs between phases for clean tracking
- Search for specific patterns (API, ERROR, etc.)
- Limit results to avoid overwhelming output

---

## JavaScript Evaluation

### Evaluate JavaScript

```javascript
// Check if element exists
const exists = await mcp__playwright__playwright_evaluate({
  script: "return document.querySelector('#calculate-btn') !== null"
})

// Get element value
const total = await mcp__playwright__playwright_evaluate({
  script: "return document.querySelector('#annual-total').textContent"
})

// Get application state
const customerData = await mcp__playwright__playwright_evaluate({
  script: "return JSON.stringify(window.state.customer)"
})
const customer = JSON.parse(customerData);

// Check if element is visible
const visible = await mcp__playwright__playwright_evaluate({
  script: `
    const el = document.querySelector('.loading-spinner');
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  `
})

// Get form field values
const formData = await mcp__playwright__playwright_evaluate({
  script: `
    return {
      company: document.querySelector('input[placeholder*="Company"]').value,
      phone: document.querySelector('input[aria-label="Phone"]').value,
      email: document.querySelector('input[placeholder*="email"]').value
    }
  `
})

// Trigger custom event
await mcp__playwright__playwright_evaluate({
  script: "window.dispatchEvent(new Event('refresh'))"
})
```

**Best Practices:**
- Use for state verification
- Get computed values (not just HTML)
- Check visibility programmatically
- Access window.state for application data

---

## Advanced Patterns

### Autocomplete Handling

```javascript
// Fill field and wait for autocomplete
await mcp__playwright__playwright_fill({
  selector: "input[aria-label='Address']",
  value: "1 Market St, San Francisco"
})

// Wait for dropdown to appear
await mcp__playwright__playwright_wait_for({
  text: "San Francisco, CA",
  timeout: 2000
})

// Click first suggestion
await mcp__playwright__playwright_click({
  selector: ".pac-item:first-child"  // Google Places autocomplete class
})

// Verify value populated
const address = await mcp__playwright__playwright_evaluate({
  script: "return document.querySelector('input[aria-label=\"Address\"]').value"
})
```

### Service Selection Pattern

```javascript
// For each service to select
const services = ["A", "B", "D"];
const frequencies = { "A": "Quarterly", "B": "Quarterly", "D": "Annual" };

for (const service of services) {
  const freq = frequencies[service];

  // Scroll service into view
  await mcp__playwright__playwright_evaluate({
    script: `document.querySelector('[data-service="${service}"]').scrollIntoView()`
  });

  // Click frequency button
  await mcp__playwright__playwright_click({
    selector: `[data-service="${service}"] button:has-text('${freq}')`
  });

  // Verify selection
  const selected = await mcp__playwright__playwright_evaluate({
    script: `
      return document.querySelector('[data-service="${service}"] button:has-text("${freq}")')
        .classList.contains('active')
    `
  });

  console.log(`Service ${service} ${freq}: ${selected ? 'SELECTED' : 'FAILED'}`);
}
```

### API Call Verification Pattern

```javascript
// Before triggering action, prepare to capture network
// (Note: Playwright doesn't have built-in network capture in these tools)
// Alternative: Check console logs or evaluate window.fetch calls

// Trigger action
await mcp__playwright__playwright_click({
  selector: "button:has-text('Calculate Quote')"
})

// Wait for API response
await new Promise(resolve => setTimeout(resolve, 2000));

// Check state for API response
const apiResponse = await mcp__playwright__playwright_evaluate({
  script: "return JSON.stringify(window.state.units[0].serverCalculations)"
})

const calculations = JSON.parse(apiResponse);
console.log("API Response:", calculations);
```

### Error Recovery Pattern

```javascript
// Try action with retry logic
async function clickWithRetry(selector, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await mcp__playwright__playwright_click({ selector });
      return true;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === maxAttempts - 1) throw error;
      await new Promise(r => setTimeout(r, 1000)); // Wait 1s between attempts
    }
  }
}

// Use in verification
await clickWithRetry("button:has-text('Calculate Quote')");
```

### State Dump Pattern

```javascript
// Capture complete application state
const stateDump = await mcp__playwright__playwright_evaluate({
  script: `
    return JSON.stringify({
      customer: window.state.customer,
      contacts: window.state.contacts,
      units: window.state.units,
      selectedServices: window.state.selectedServices,
      calculations: window.state.units[0]?.serverCalculations
    }, null, 2)
  `
});

// Save to file
const fs = require('fs');
fs.writeFileSync('state-dump.json', stateDump);
```

---

## Timing and Synchronization

### Sleep/Wait Utility

```javascript
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Use between actions
await mcp__playwright__playwright_fill({ selector: "input", value: "test" });
await sleep(500); // Wait 500ms
await mcp__playwright__playwright_click({ selector: "button" });
```

### Wait for Network Idle

```javascript
// Navigate and wait for network to settle
await mcp__playwright__playwright_navigate({
  url: "http://localhost:3002/frontend/integrated-ui.html",
  waitUntil: "networkidle",
  timeout: 10000
})

// Additional wait if needed
await sleep(1000);
```

### Wait for Element State

```javascript
// Wait for element to exist
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const exists = await mcp__playwright__playwright_evaluate({
      script: `return document.querySelector('${selector}') !== null`
    });

    if (exists) return true;
    await sleep(100);
  }

  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

// Use in verification
await waitForElement("#quote-summary");
```

---

## Error Handling Patterns

### Try-Catch with Screenshots

```javascript
async function verifyWithEvidence(phase, action) {
  try {
    await action();
    console.log(`✅ ${phase} PASSED`);
  } catch (error) {
    console.error(`❌ ${phase} FAILED: ${error.message}`);

    // Capture failure evidence
    await mcp__playwright__playwright_screenshot({
      name: `failure-${phase}-${Date.now()}`,
      savePng: true
    });

    const logs = await mcp__playwright__playwright_console_logs({ type: "error" });
    console.log("Console errors:", logs);

    throw error; // Re-throw to stop execution
  }
}

// Use in verification
await verifyWithEvidence("customer-entry", async () => {
  await mcp__playwright__playwright_fill({ selector: "input", value: "Test" });
});
```

---

## Complete Example: Customer Entry Phase

```javascript
async function phase1_customerEntry(testCase) {
  console.log("\n=== PHASE 1: CUSTOMER ENTRY ===\n");

  // 1. Navigate to page
  await mcp__playwright__playwright_navigate({
    url: "http://localhost:3002/frontend/integrated-ui.html",
    waitUntil: "networkidle"
  });

  // 2. Take initial screenshot
  await mcp__playwright__playwright_screenshot({
    name: "phase1-start",
    savePng: true
  });

  // 3. Fill company name
  await mcp__playwright__playwright_fill({
    selector: "input[placeholder*='Company Name']",
    value: testCase.customer.company_name
  });

  // 4. Wait for Zoho autocomplete (if appears)
  await sleep(1000);

  // 5. Fill phone
  await mcp__playwright__playwright_fill({
    selector: "input[aria-label='Phone']",
    value: testCase.customer.phone
  });

  // 6. Fill email
  await mcp__playwright__playwright_fill({
    selector: "input[placeholder*='email']",
    value: testCase.customer.email
  });

  // 7. Fill website
  await mcp__playwright__playwright_fill({
    selector: "input[placeholder*='www']",
    value: testCase.customer.website || ""
  });

  // 8. Fill address with autocomplete
  await mcp__playwright__playwright_fill({
    selector: "input[aria-label='Address']",
    value: testCase.customer.address.split(',')[0] // First part only
  });

  // 9. Wait for Google Places autocomplete
  await sleep(2000);

  // 10. Click first autocomplete suggestion
  await mcp__playwright__playwright_click({
    selector: ".pac-item:first-child"
  });

  // 11. Wait for enrichment
  await sleep(3000);

  // 12. Verify state
  const customerState = await mcp__playwright__playwright_evaluate({
    script: "return JSON.stringify(window.state.customer)"
  });
  const customer = JSON.parse(customerState);
  console.log("Customer state:", customer);

  // 13. Check for errors
  const errors = await mcp__playwright__playwright_console_logs({ type: "error" });
  if (errors && errors.length > 0) {
    throw new Error(`Console errors during customer entry: ${JSON.stringify(errors)}`);
  }

  // 14. Take final screenshot
  await mcp__playwright__playwright_screenshot({
    name: "phase1-complete",
    savePng: true
  });

  console.log("✅ Phase 1: Customer Entry COMPLETE\n");
  return true;
}
```

---

## Troubleshooting

### Element Not Found
```javascript
// Debug: Get all matching elements
const elements = await mcp__playwright__playwright_evaluate({
  script: `
    return Array.from(document.querySelectorAll('button'))
      .map(el => el.textContent.trim());
  `
});
console.log("Available buttons:", elements);
```

### Click Not Working
```javascript
// Check if element is visible and enabled
const info = await mcp__playwright__playwright_evaluate({
  script: `
    const el = document.querySelector('button#my-button');
    return {
      exists: el !== null,
      visible: el ? (el.getBoundingClientRect().width > 0) : false,
      enabled: el ? !el.disabled : false,
      text: el ? el.textContent : null
    }
  `
});
console.log("Button info:", info);
```

### Autocomplete Not Appearing
```javascript
// Check if Google Maps API loaded
const googleLoaded = await mcp__playwright__playwright_evaluate({
  script: "return typeof window.google !== 'undefined'"
});
console.log("Google Maps loaded:", googleLoaded);

// Try typing slower
for (const char of "1 Market St") {
  await mcp__playwright__playwright_press_key({ key: char });
  await sleep(100);
}
```

---

**Remember:** Playwright MCP is preferred over Chrome DevTools MCP due to timeout issues (E2E-001). Use these patterns consistently for reliable verification.
