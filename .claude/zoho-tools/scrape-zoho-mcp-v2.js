/**
 * Zoho MCP Tool Scraper v2 - Refined Edition
 *
 * USAGE:
 * 1. Open Zoho MCP console: https://mcp.zoho.com/mcp-client#/mcp-client/server/{your_server_id}/tools
 * 2. Click "Configure Tools" button (upper right)
 * 3. Click on an app (e.g., "Zoho Books")
 * 4. Open browser DevTools console (F12)
 * 5. Paste this entire script and press Enter
 * 6. Copy the JSON output
 * 7. Save to a file for import via sync-catalog.cjs
 *
 * DISCOVERED SELECTORS (from Kapture exploration):
 * - Tool names: lyte-text.mcp-tools-table-content
 * - Tool descriptions: lyte-text.mcp-tools-table-content-desc
 * - "Added" badges: p.zcat-color-added (indicates tool already added to server)
 * - Scroll container: Look for element with many children
 * - App header: lyte-text.add-tools-modal-head
 * - App count: div.add-tools-modal-desc
 */

(function() {
    'use strict';

    // Configuration
    const SCROLL_DELAY = 500; // ms between scrolls
    const SCROLL_STEP = 500;  // pixels to scroll each time

    /**
     * Extract tools from current view
     */
    function extractVisibleTools() {
        const tools = [];

        // Find all tool rows
        const toolRows = document.querySelectorAll('.mcp-tools-table-content-wraper');

        toolRows.forEach(row => {
            // Extract tool name
            const nameElement = row.querySelector('lyte-text.mcp-tools-table-content');
            if (!nameElement) return;

            const name = nameElement.textContent.trim();

            // Extract description
            const descElement = row.querySelector('lyte-text.mcp-tools-table-content-desc');
            const description = descElement ? descElement.textContent.trim() : '';

            // Check if already added to server
            const addedBadge = row.querySelector('p.zcat-color-added');
            const isAdded = !!addedBadge;

            tools.push({
                name,
                description,
                isAdded
            });
        });

        return tools;
    }

    /**
     * Get current app name from modal header
     */
    function getAppName() {
        const headerElement = document.querySelector('lyte-text.add-tools-modal-head');
        if (headerElement) {
            return headerElement.textContent.trim();
        }

        // Fallback: try to get from page title or URL
        return 'Unknown App';
    }

    /**
     * Get tool count from modal description
     */
    function getToolCount() {
        const descElements = document.querySelectorAll('div.add-tools-modal-desc');
        if (descElements.length > 0) {
            const text = descElements[0].textContent.trim();
            const match = text.match(/(\d+)\s+Actions/i);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
        return null;
    }

    /**
     * Find the scrollable container
     */
    function findScrollContainer() {
        // The scroll container should contain the tool table
        const table = document.querySelector('.mcp-tools-table');
        if (!table) return null;

        // Walk up the DOM to find scrollable parent
        let element = table.parentElement;
        while (element) {
            const style = window.getComputedStyle(element);
            if (style.overflowY === 'scroll' || style.overflowY === 'auto') {
                return element;
            }
            element = element.parentElement;
        }

        return null;
    }

    /**
     * Scroll container and extract all tools
     */
    async function scrapeAllTools() {
        console.log('🔍 Starting Zoho MCP Tool Scraper v2...');

        const appName = getAppName();
        const expectedCount = getToolCount();
        console.log(`📦 App: ${appName}`);
        console.log(`📊 Expected tools: ${expectedCount || 'Unknown'}`);

        const scrollContainer = findScrollContainer();
        if (!scrollContainer) {
            console.error('❌ Could not find scroll container');
            return null;
        }

        console.log('✅ Found scroll container');

        const allTools = new Map(); // Use Map to dedupe by name
        let scrollPosition = 0;
        let unchangedCount = 0;
        const MAX_UNCHANGED = 5; // Stop after 5 scrolls with no new tools

        while (unchangedCount < MAX_UNCHANGED) {
            // Extract tools from current view
            const visibleTools = extractVisibleTools();
            const previousSize = allTools.size;

            visibleTools.forEach(tool => {
                if (!allTools.has(tool.name)) {
                    allTools.set(tool.name, tool);
                }
            });

            const newToolsFound = allTools.size - previousSize;
            console.log(`📄 Scroll ${scrollPosition}px: Found ${newToolsFound} new tools (Total: ${allTools.size})`);

            if (newToolsFound === 0) {
                unchangedCount++;
            } else {
                unchangedCount = 0;
            }

            // Check if we've reached the expected count
            if (expectedCount && allTools.size >= expectedCount) {
                console.log('✅ Reached expected tool count');
                break;
            }

            // Scroll down
            scrollContainer.scrollTop += SCROLL_STEP;
            scrollPosition += SCROLL_STEP;

            // Wait for lazy loading
            await new Promise(resolve => setTimeout(resolve, SCROLL_DELAY));

            // Check if we've reached the bottom
            const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;
            if (isAtBottom && unchangedCount > 0) {
                console.log('📍 Reached bottom of scroll container');
                break;
            }
        }

        const toolsArray = Array.from(allTools.values());

        console.log('✅ Scraping complete!');
        console.log(`📊 Total tools extracted: ${toolsArray.length}`);
        console.log(`✓ Already added: ${toolsArray.filter(t => t.isAdded).length}`);
        console.log(`○ Available to add: ${toolsArray.filter(t => !t.isAdded).length}`);

        if (expectedCount && toolsArray.length !== expectedCount) {
            console.warn(`⚠️  Warning: Expected ${expectedCount} tools but found ${toolsArray.length}`);
        }

        return {
            app: appName,
            totalTools: toolsArray.length,
            expectedTools: expectedCount,
            scrapedAt: new Date().toISOString(),
            tools: toolsArray
        };
    }

    /**
     * Format output for easy import
     */
    function formatForImport(data) {
        if (!data) return '';

        const lines = [
            `# ${data.app} - MCP Tools`,
            `# Scraped: ${data.scrapedAt}`,
            `# Total: ${data.totalTools} tools`,
            `# Expected: ${data.expectedTools || 'Unknown'} tools`,
            '',
            '# Format: tool_name | description | [ADDED]',
            ''
        ];

        data.tools.forEach(tool => {
            const addedFlag = tool.isAdded ? ' [ADDED]' : '';
            lines.push(`${tool.name} | ${tool.description}${addedFlag}`);
        });

        return lines.join('\n');
    }

    // Main execution
    scrapeAllTools().then(data => {
        if (!data) {
            console.error('❌ Scraping failed');
            return;
        }

        // Output results
        console.log('\n📋 RESULTS (JSON):');
        console.log('================');
        console.log(JSON.stringify(data, null, 2));

        console.log('\n📋 IMPORT FORMAT:');
        console.log('================');
        console.log(formatForImport(data));

        console.log('\n💾 To save results:');
        console.log('1. Right-click the JSON output above');
        console.log('2. Copy as string');
        console.log('3. Save to a file (e.g., zoho-books-tools.json)');
        console.log('4. Import: node sync-catalog.cjs --import zoho-books-tools.json --app "Zoho Books"');

        // Store in global for easy access
        window.zoh oMcpScraperResults = data;
        console.log('\n✅ Results also stored in: window.zohoMcpScraperResults');
    });
})();
