#!/usr/bin/env node
/**
 * Zoho Smart Proxy v3.0 - The Breakthrough Solution
 *
 * Architecture:
 * - Uses mcp-remote to connect to Zoho Cloud MCP (handles OAuth)
 * - Wraps mcp-remote with filtering layer (only expose activated tools)
 * - Token savings: 88k → 2.5k (97% reduction)
 *
 * How it works:
 * 1. Spawns mcp-remote as child process
 * 2. Communicates with it via stdio
 * 3. Fetches full tool list on connect
 * 4. Exposes only meta-tools + activated tools to Claude Code
 * 5. Forwards activated tool calls to mcp-remote
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  upstreamUrl: process.env.UPSTREAM_URL || 'https://test-for-proxy-897662416.zohomcp.com/mcp/message?key=796e718f4df077c8ded5d645e87ba010',
  maxActiveTools: parseInt(process.env.MAX_ACTIVE_TOOLS) || 50,
};

// ============================================================================
// Active Tools Registry
// ============================================================================

class ActiveToolsRegistry {
  constructor(maxTools = 50) {
    this.active = new Map(); // name -> { activatedAt, useCount, schema }
    this.maxTools = maxTools;
  }

  activate(toolNames, allTools) {
    const activated = [];
    const failed = [];

    for (const name of toolNames) {
      if (this.active.size >= this.maxTools) {
        failed.push({ name, reason: 'Max active tools reached' });
        continue;
      }

      const toolSchema = allTools.find(t => t.name === name);
      if (!toolSchema) {
        failed.push({ name, reason: 'Tool not found' });
        continue;
      }

      if (!this.active.has(name)) {
        this.active.set(name, {
          activatedAt: new Date().toISOString(),
          useCount: 0,
          schema: toolSchema,
        });
        activated.push(name);
      } else {
        failed.push({ name, reason: 'Already active' });
      }
    }

    return { activated, failed };
  }

  deactivate(toolNames) {
    const deactivated = [];

    if (toolNames.length === 1 && toolNames[0] === 'all') {
      for (const name of this.active.keys()) {
        deactivated.push(name);
      }
      this.active.clear();
    } else {
      for (const name of toolNames) {
        if (this.active.has(name)) {
          this.active.delete(name);
          deactivated.push(name);
        }
      }
    }

    return { deactivated };
  }

  isActive(name) {
    return this.active.has(name);
  }

  recordUse(name) {
    if (this.active.has(name)) {
      const tool = this.active.get(name);
      tool.useCount++;
    }
  }

  getActiveSchemas() {
    return Array.from(this.active.values()).map(t => t.schema);
  }

  getStats() {
    return {
      total: this.active.size,
      max: this.maxTools,
      tools: Array.from(this.active.entries()).map(([name, info]) => ({
        name,
        activatedAt: info.activatedAt,
        useCount: info.useCount,
      })),
    };
  }
}

// ============================================================================
// MCP Remote Client
// ============================================================================

class MCPRemoteClient {
  constructor(url) {
    this.url = url;
    this.process = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.allTools = [];
    this.connected = false;
  }

  async start() {
    console.error('[v3] Starting mcp-remote...');

    // Spawn mcp-remote as child process
    this.process = spawn('npx', ['mcp-remote', this.url], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    let buffer = '';

    this.process.stdout.on('data', (data) => {
      buffer += data.toString();

      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const msg = JSON.parse(line);
            this.handleResponse(msg);
          } catch (e) {
            // Ignore non-JSON lines (auth prompts, etc.)
          }
        }
      }
    });

    this.process.on('close', (code) => {
      console.error(`[v3] mcp-remote exited with code ${code}`);
      this.connected = false;
    });

    // Initialize connection
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'zoho-smart-proxy',
        version: '3.0.0',
      },
    });

    // Fetch all tools
    const result = await this.sendRequest('tools/list', {});
    this.allTools = result.tools || [];
    this.connected = true;

    console.error(`[v3] ✅ Connected! Fetched ${this.allTools.length} tool schemas`);
  }

  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  handleResponse(msg) {
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const { resolve, reject } = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);

      if (msg.error) {
        reject(new Error(msg.error.message || 'Unknown error'));
      } else {
        resolve(msg.result);
      }
    }
  }

  async callTool(name, args) {
    return await this.sendRequest('tools/call', { name, arguments: args });
  }

  getAllTools() {
    return this.allTools;
  }
}

// ============================================================================
// Smart Proxy Server
// ============================================================================

class ZohoSmartProxy {
  constructor() {
    this.server = new Server(
      {
        name: 'zoho-smart-proxy',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.activeRegistry = new ActiveToolsRegistry(CONFIG.maxActiveTools);
    this.mcpRemote = new MCPRemoteClient(CONFIG.upstreamUrl);
  }

  async start() {
    // Start mcp-remote connection
    await this.mcpRemote.start();

    // Setup handlers
    this.setupHandlers();

    // Start stdio server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[v3] 🚀 Zoho Smart Proxy v3.0 ready!');
    console.error(`[v3] 📊 Upstream tools: ${this.mcpRemote.getAllTools().length}`);
    console.error(`[v3] 🎯 Max active tools: ${CONFIG.maxActiveTools}`);
  }

  setupHandlers() {
    // List tools - return meta-tools + active tools only
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const metaTools = this.getMetaTools();
      const activeTools = this.activeRegistry.getActiveSchemas();

      return {
        tools: [...metaTools, ...activeTools],
      };
    });

    // Call tool - handle meta-tools or forward to mcp-remote
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Handle meta-tools
      if (this.isMetaTool(name)) {
        return await this.handleMetaTool(name, args || {});
      }

      // Forward to mcp-remote
      if (this.activeRegistry.isActive(name)) {
        this.activeRegistry.recordUse(name);
        return await this.mcpRemote.callTool(name, args || {});
      }

      throw new Error(`Tool '${name}' not activated. Use activate_tools first.`);
    });
  }

  getMetaTools() {
    return [
      {
        name: 'search_tools',
        description: 'Search for Zoho tools by keyword. Returns tool metadata without loading into context.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (matches tool name or description)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 20)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'activate_tools',
        description: 'Load specific tools into context. Maximum 25 tools at once.',
        inputSchema: {
          type: 'object',
          properties: {
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tool names to activate',
              maxItems: 25,
            },
          },
          required: ['tools'],
        },
      },
      {
        name: 'deactivate_tools',
        description: 'Remove tools from context. Use ["all"] to deactivate everything.',
        inputSchema: {
          type: 'object',
          properties: {
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tool names to deactivate, or ["all"]',
            },
          },
          required: ['tools'],
        },
      },
      {
        name: 'get_tool_info',
        description: 'Get detailed information about a specific tool.',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tool name',
            },
          },
          required: ['name'],
        },
      },
    ];
  }

  isMetaTool(name) {
    return ['search_tools', 'activate_tools', 'deactivate_tools', 'get_tool_info'].includes(name);
  }

  async handleMetaTool(name, args) {
    try {
      let result;
      const allTools = this.mcpRemote.getAllTools();

      switch (name) {
        case 'search_tools':
          const query = (args.query || '').toLowerCase();
          const limit = args.limit || 20;
          result = allTools
            .filter(t =>
              t.name.toLowerCase().includes(query) ||
              (t.description || '').toLowerCase().includes(query)
            )
            .slice(0, limit)
            .map(t => ({
              name: t.name,
              description: t.description || '',
            }));
          break;

        case 'activate_tools':
          const activateResult = this.activeRegistry.activate(args.tools || [], allTools);
          const stats = this.activeRegistry.getStats();
          result = {
            ...activateResult,
            total_active: stats.total,
            estimated_tokens: 2000 + stats.total * 500,
          };
          break;

        case 'deactivate_tools':
          const deactivateResult = this.activeRegistry.deactivate(args.tools || []);
          const statsAfter = this.activeRegistry.getStats();
          result = {
            ...deactivateResult,
            remaining_active: statsAfter.total,
            estimated_tokens: 2000 + statsAfter.total * 500,
          };
          break;

        case 'get_tool_info':
          const tool = allTools.find(t => t.name === args.name);
          if (!tool) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Tool '${args.name}' not found`,
                },
              ],
              isError: true,
            };
          }
          result = {
            ...tool,
            active: this.activeRegistry.isActive(args.name),
          };
          break;

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown meta-tool: ${name}`,
              },
            ],
            isError: true,
          };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}

// ============================================================================
// Main
// ============================================================================

const proxy = new ZohoSmartProxy();
proxy.start().catch((error) => {
  console.error('[v3] Fatal error:', error);
  process.exit(1);
});
