/**
 * Zoho MCP Tool Scraper
 *
 * Run this script in the browser console while on:
 * https://mcp.zoho.com/mcp-client#/mcp-client/server/{server_id}/tools
 *
 * This will extract all available tools from all configured apps
 * and output them in a format ready to import to catalog.json
 */

(function() {
  console.log('🔍 Zoho MCP Tool Scraper v1.0');
  console.log('Starting tool discovery...\n');

  const tools = [];
  const appTools = {};

  // Wait for page to be fully loaded
  function waitForElements(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelectorAll(selector));
      }

      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelectorAll(selector));
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  // Extract tools from current view
  function extractCurrentTools() {
    const discovered = [];

    // Try multiple selectors to find tool names
    const selectors = [
      '.zcat-display-name',
      '[class*="tool-name"]',
      '[class*="action-name"]',
      'lyte-text.zcat-display-name'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✓ Found ${elements.length} tools using selector: ${selector}`);

        elements.forEach(el => {
          const name = el.textContent.trim();
          const description = el.closest('[class*="table-content"]')?.querySelector('[class*="description"]')?.textContent.trim() || '';

          if (name && !discovered.find(t => t.name === name)) {
            discovered.push({
              name: name,
              description: description || `${name} operation`
            });
          }
        });

        break; // Use first successful selector
      }
    }

    return discovered;
  }

  // Get current app name from sidebar
  function getCurrentAppName() {
    const selectors = [
      '.mcp-tools-sidemenu.selected',
      '[class*="sidemenu"][class*="selected"]'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const appName = element.textContent.trim();
        if (appName) return appName;
      }
    }

    return 'Unknown App';
  }

  // Click on app in sidebar
  async function clickApp(appElement) {
    return new Promise(resolve => {
      appElement.click();
      setTimeout(resolve, 1000); // Wait for content to load
    });
  }

  // Main scraping function
  async function scrapeAllApps() {
    console.log('📊 Discovering all apps...\n');

    // Get all app menu items
    const appMenuItems = document.querySelectorAll('.mcp-tools-sidemenu');
    console.log(`Found ${appMenuItems.length} apps\n`);

    for (let i = 0; i < appMenuItems.length; i++) {
      const appElement = appMenuItems[i];

      // Click app to load its tools
      await clickApp(appElement);

      const appName = getCurrentAppName();
      console.log(`\n📱 Scraping: ${appName}`);

      // Extract tools from this app
      const appToolList = extractCurrentTools();

      if (appToolList.length > 0) {
        appTools[appName] = appToolList;
        tools.push(...appToolList.map(t => ({ ...t, app: appName })));
        console.log(`   ✓ Found ${appToolList.length} tools`);
      } else {
        console.log(`   ⚠ No tools found (may need to scroll or different selector)`);
      }

      // Scroll to load more tools if needed
      const scrollContainer = document.querySelector('.mcp-tools-rightmenu-content-wraper');
      if (scrollContainer) {
        const initialHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 500));

        if (scrollContainer.scrollHeight > initialHeight) {
          console.log(`   📜 Scrolled to load more tools...`);
          const moreTools = extractCurrentTools();
          const newTools = moreTools.filter(t => !appToolList.find(existing => existing.name === t.name));
          if (newTools.length > 0) {
            appTools[appName].push(...newTools);
            tools.push(...newTools.map(t => ({ ...t, app: appName })));
            console.log(`   ✓ Found ${newTools.length} additional tools`);
          }
        }
      }
    }

    return { tools, appTools };
  }

  // Format output for catalog import
  function formatForImport(data) {
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 SCRAPING COMPLETE');
    console.log('='.repeat(60) + '\n');

    console.log(`Total Apps: ${Object.keys(data.appTools).length}`);
    console.log(`Total Tools: ${data.tools.length}\n`);

    console.log('Tools by App:');
    for (const [appName, toolList] of Object.entries(data.appTools)) {
      console.log(`  ${appName}: ${toolList.length} tools`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('💾 EXPORT OPTIONS');
    console.log('='.repeat(60) + '\n');

    console.log('Option 1: Copy as JSON');
    console.log('---');
    console.log('window.zohToolsJSON = ' + JSON.stringify(data, null, 2) + ';');
    console.log('copy(JSON.stringify(window.zohoToolsJSON, null, 2));');
    console.log('');

    console.log('Option 2: Download as File');
    console.log('---');
    console.log(`
const blob = new Blob([JSON.stringify(window.zohoToolsJSON, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'zoho-mcp-tools-${new Date().toISOString().split('T')[0]}.json';
a.click();
URL.revokeObjectURL(url);
    `.trim());

    console.log('\n' + '='.repeat(60));
    console.log('📝 IMPORT TO CATALOG');
    console.log('='.repeat(60) + '\n');

    console.log('For each app, create a file and import:');
    for (const [appName, toolList] of Object.entries(data.appTools)) {
      const filename = appName.toLowerCase().replace(/\s+/g, '-') + '-tools.txt';
      console.log(`\n// ${filename}`);
      console.log(toolList.map(t => t.name).join('\n'));
      console.log(`\n// Import command:`);
      console.log(`node .claude/zoho-tools/sync-catalog.cjs --import ${filename} --app "${appName}"`);
    }

    // Store in global variable for easy access
    window.zohoToolsData = data;

    return data;
  }

  // Run the scraper
  console.log('🚀 Starting scraper in 2 seconds...');
  console.log('(This will click through each app to discover tools)\n');

  setTimeout(async () => {
    try {
      const data = await scrapeAllApps();
      const formatted = formatForImport(data);

      console.log('\n✅ Scraping complete!');
      console.log('Data stored in: window.zohoToolsData');
      console.log('\nTo export, run one of the commands shown above.');

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      console.log('\nTroubleshooting:');
      console.log('1. Make sure you are on the Tools page');
      console.log('2. Check browser console for errors');
      console.log('3. Try manually clicking through apps first');
    }
  }, 2000);

})();

// Alternative: Manual extraction for current page only
function extractCurrentPageTools() {
  console.log('📄 Extracting tools from current page only...\n');

  const tools = [];
  const toolElements = document.querySelectorAll('.zcat-display-name, [class*="tool-name"]');

  toolElements.forEach(el => {
    const name = el.textContent.trim();
    if (name) {
      tools.push(name);
    }
  });

  console.log(`Found ${tools.length} tools:\n`);
  console.log(tools.join('\n'));
  console.log('\n---\n');
  console.log('Copy to clipboard:');
  console.log(`copy("${tools.join('\\n')}")`);

  return tools;
}

console.log('\n📌 Quick Commands:');
console.log('  extractCurrentPageTools() - Extract tools from current view');
console.log('  window.zohoToolsData       - View scraped data');
console.log('');
