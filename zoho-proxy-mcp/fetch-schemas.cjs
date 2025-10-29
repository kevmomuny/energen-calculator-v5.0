#!/usr/bin/env node
/**
 * One-time schema fetcher for Zoho Cloud MCP
 *
 * This script connects to an authenticated Zoho Cloud MCP server
 * and fetches ALL tool schemas, saving them to a local cache.
 *
 * Usage:
 *   node fetch-schemas.cjs <mcp-url>
 *
 * Example:
 *   node fetch-schemas.cjs "https://test-for-proxy-897662416.zohomcp.com/mcp/message?key=796e718f4df077c8ded5d645e87ba010"
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const fs = require('fs').promises;
const path = require('path');

async function fetchSchemas(upstreamUrl) {
  console.log('Connecting to Zoho Cloud MCP...');
  console.log('URL:', upstreamUrl);

  const client = new Client(
    {
      name: 'schema-fetcher',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  const transport = new StreamableHTTPClientTransport(
    new URL(upstreamUrl)
  );

  try {
    await client.connect(transport);
    console.log('✅ Connected successfully!\n');

    console.log('Fetching tool list...');
    const { tools } = await client.listTools();

    console.log(`✅ Retrieved ${tools.length} tool schemas\n`);

    // Organize tools by app and category
    const organized = {
      version: '2.0.0',
      last_updated: new Date().toISOString(),
      total_tools: tools.length,
      tools: {}
    };

    for (const tool of tools) {
      organized.tools[tool.name] = {
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || { type: 'object', properties: {} }
      };
    }

    // Save to file
    const outputPath = path.join(__dirname, 'tool-schemas.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(organized, null, 2),
      'utf8'
    );

    console.log(`✅ Saved ${tools.length} schemas to: ${outputPath}`);
    console.log(`📊 File size: ${(JSON.stringify(organized).length / 1024).toFixed(2)} KB`);

    // Disconnect
    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Get URL from command line
const url = process.argv[2];

if (!url) {
  console.error('Usage: node fetch-schemas.cjs <mcp-url>');
  console.error('');
  console.error('Example:');
  console.error('  node fetch-schemas.cjs "https://test-for-proxy-897662416.zohomcp.com/mcp/message?key=..."');
  process.exit(1);
}

fetchSchemas(url);
