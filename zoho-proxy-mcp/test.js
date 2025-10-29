#!/usr/bin/env node

/**
 * Test script for Zoho Proxy MCP
 *
 * Tests the proxy server functionality without needing Claude Code
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function test() {
  console.log('🧪 Testing Zoho Proxy MCP Server\n');

  // Start the server
  const serverProcess = spawn('node', ['index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Create client
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['index.js'],
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // Connect
    console.log('📡 Connecting to proxy server...');
    await client.connect(transport);
    console.log('✅ Connected!\n');

    // Test 1: List tools
    console.log('Test 1: List available tools');
    const toolsResponse = await client.request(
      { method: 'tools/list' },
      { method: 'tools/list' }
    );
    console.log(`✅ Found ${toolsResponse.tools.length} tools`);
    console.log('   Meta-tools:', toolsResponse.tools.map(t => t.name).join(', '));
    console.log('');

    // Test 2: Search tools
    console.log('Test 2: Search for "invoice" tools');
    const searchResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'search_tools',
          arguments: {
            query: 'invoice',
            limit: 5,
          },
        },
      },
      { method: 'tools/call' }
    );
    const searchResults = JSON.parse(searchResponse.content[0].text);
    console.log(`✅ Found ${searchResults.length} results:`);
    searchResults.forEach(tool => {
      console.log(`   - ${tool.name} (${tool.app} / ${tool.category})`);
    });
    console.log('');

    // Test 3: List categories
    console.log('Test 3: List categories');
    const categoriesResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'list_categories',
          arguments: {},
        },
      },
      { method: 'tools/call' }
    );
    const categories = JSON.parse(categoriesResponse.content[0].text);
    console.log(`✅ Found categories for ${Object.keys(categories).length} apps`);
    for (const [app, cats] of Object.entries(categories)) {
      const catCount = Object.keys(cats).length;
      console.log(`   - ${app}: ${catCount} categories`);
    }
    console.log('');

    // Test 4: Get tool info
    console.log('Test 4: Get info for "create_invoice"');
    const infoResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'get_tool_info',
          arguments: {
            name: 'create_invoice',
          },
        },
      },
      { method: 'tools/call' }
    );
    const toolInfo = JSON.parse(infoResponse.content[0].text);
    console.log('✅ Tool info:');
    console.log(`   Name: ${toolInfo.name}`);
    console.log(`   App: ${toolInfo.app}`);
    console.log(`   Category: ${toolInfo.category}`);
    console.log(`   Active: ${toolInfo.active}`);
    console.log('');

    // Test 5: Activate tools
    console.log('Test 5: Activate 3 tools');
    const activateResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'activate_tools',
          arguments: {
            tools: ['create_invoice', 'list_contacts', 'create_item'],
          },
        },
      },
      { method: 'tools/call' }
    );
    const activateResult = JSON.parse(activateResponse.content[0].text);
    console.log('✅ Activation result:');
    console.log(`   Activated: ${activateResult.activated.join(', ')}`);
    console.log(`   Total active: ${activateResult.total_active}`);
    console.log(`   Estimated tokens: ${activateResult.estimated_tokens}`);
    console.log('');

    // Test 6: List tools again (should now include active tools)
    console.log('Test 6: List tools (should include active tools now)');
    const toolsResponse2 = await client.request(
      { method: 'tools/list' },
      { method: 'tools/list' }
    );
    console.log(`✅ Now have ${toolsResponse2.tools.length} tools`);
    console.log(`   (5 meta-tools + ${toolsResponse2.tools.length - 5} active tools)`);
    console.log('');

    // Test 7: Call an active tool (simulated)
    console.log('Test 7: Call active tool "create_invoice" (simulated)');
    const callResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'create_invoice',
          arguments: {
            customer_id: '123',
            line_items: [],
          },
        },
      },
      { method: 'tools/call' }
    );
    const callResult = JSON.parse(callResponse.content[0].text);
    console.log('✅ Tool call result:');
    console.log(`   Status: ${callResult.status}`);
    console.log(`   Message: ${callResult.message}`);
    console.log('');

    // Test 8: Deactivate tools
    console.log('Test 8: Deactivate all tools');
    const deactivateResponse = await client.request(
      {
        method: 'tools/call',
        params: {
          name: 'deactivate_tools',
          arguments: {
            tools: ['all'],
          },
        },
      },
      { method: 'tools/call' }
    );
    const deactivateResult = JSON.parse(deactivateResponse.content[0].text);
    console.log('✅ Deactivation result:');
    console.log(`   Deactivated: ${deactivateResult.deactivated.join(', ')}`);
    console.log(`   Remaining active: ${deactivateResult.remaining_active}`);
    console.log('');

    console.log('🎉 All tests passed!\n');

    // Cleanup
    await client.close();
    serverProcess.kill();

  } catch (error) {
    console.error('❌ Test failed:', error);
    serverProcess.kill();
    process.exit(1);
  }
}

test();
