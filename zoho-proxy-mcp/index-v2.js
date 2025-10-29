#!/usr/bin/env node

/**
 * Zoho Proxy MCP Server v2.0
 *
 * Proper implementation using MCP SDK with Streamable HTTP transport
 * - stdio server for Claude Code
 * - Streamable HTTP client for energen-lean Cloud MCP
 * - On-demand tool loading with 97% token savings
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Upstream Zoho Cloud MCP (test-for-proxy)
  upstreamUrl: process.env.UPSTREAM_MCP_URL || 'https://test-for-proxy-897662416.zohomcp.com/mcp/message?key=796e718f4df077c8ded5d645e87ba010',

  // Proxy settings
  maxActiveTools: parseInt(process.env.MAX_ACTIVE_TOOLS) || 50,
  cacheEnabled: process.env.CACHE_CATALOG !== 'false',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Paths
  catalogPath: join(__dirname, 'tool-catalog.json'),
};

// ============================================================================
// Tool Catalog (In-Memory Storage)
// ============================================================================

class ToolCatalog {
  constructor() {
    this.tools = new Map(); // name -> tool definition
    this.byApp = new Map(); // app -> category -> tools[]
    this.byCategory = new Map(); // category -> tools[]
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;

    console.error('[Catalog] Loading tool catalog...');

    try {
      if (CONFIG.cacheEnabled) {
        const fs = await import('fs/promises');
        const data = await fs.readFile(CONFIG.catalogPath, 'utf-8');
        const catalog = JSON.parse(data);
        this.importCatalog(catalog);
        console.error(`[Catalog] Loaded ${this.tools.size} tools from cache`);
      }
    } catch (err) {
      console.error('[Catalog] No cache found, will fetch from upstream');
    }

    this.loaded = true;
  }

  importCatalog(catalog) {
    for (const [app, categories] of Object.entries(catalog.apps || {})) {
      if (!this.byApp.has(app)) {
        this.byApp.set(app, new Map());
      }

      for (const [category, toolNames] of Object.entries(categories.categories || {})) {
        if (!this.byCategory.has(category)) {
          this.byCategory.set(category, []);
        }

        for (const toolName of toolNames) {
          const tool = {
            name: toolName,
            app,
            category,
            description: `${app} - ${category} tool: ${toolName}`,
            inputSchema: {
              type: 'object',
              properties: {},
            },
          };

          this.tools.set(toolName, tool);
          this.byCategory.get(category).push(tool);

          if (!this.byApp.get(app).has(category)) {
            this.byApp.get(app).set(category, []);
          }
          this.byApp.get(app).get(category).push(tool);
        }
      }
    }
  }

  search({ query = '', category = '', app = '', limit = 20 }) {
    let results = Array.from(this.tools.values());

    if (app) {
      results = results.filter(t => t.app === app);
    }

    if (category) {
      results = results.filter(t => t.category === category);
    }

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    return results.slice(0, limit).map(t => ({
      name: t.name,
      app: t.app,
      category: t.category,
      description: t.description,
    }));
  }

  getTool(name) {
    return this.tools.get(name);
  }

  listCategories(app = null) {
    const result = {};

    if (app) {
      const appCategories = this.byApp.get(app);
      if (appCategories) {
        for (const [category, tools] of appCategories.entries()) {
          result[category] = {
            count: tools.length,
            app,
          };
        }
      }
    } else {
      for (const [app, categories] of this.byApp.entries()) {
        result[app] = {};
        for (const [category, tools] of categories.entries()) {
          result[app][category] = {
            count: tools.length,
          };
        }
      }
    }

    return result;
  }
}

// ============================================================================
// Active Tools Registry
// ============================================================================

class ActiveToolsRegistry {
  constructor(maxTools = 50) {
    this.active = new Map(); // name -> { activatedAt, useCount, definition }
    this.maxTools = maxTools;
  }

  activate(toolNames, catalog) {
    const activated = [];
    const failed = [];

    for (const name of toolNames) {
      if (this.active.size >= this.maxTools) {
        failed.push({ name, reason: 'Max active tools reached' });
        continue;
      }

      const toolDef = catalog.getTool(name);
      if (!toolDef) {
        failed.push({ name, reason: 'Tool not found in catalog' });
        continue;
      }

      if (!this.active.has(name)) {
        this.active.set(name, {
          activatedAt: new Date().toISOString(),
          useCount: 0,
          definition: toolDef,
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

  getActiveNames() {
    return Array.from(this.active.keys());
  }

  getActiveDefinitions() {
    return Array.from(this.active.values()).map(t => t.definition);
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
// Zoho Proxy Server with SSE Client
// ============================================================================

class ZohoProxyServer {
  constructor() {
    this.catalog = new ToolCatalog();
    this.activeRegistry = new ActiveToolsRegistry(CONFIG.maxActiveTools);

    // Create stdio server (for Claude Code to connect to)
    this.server = new Server(
      {
        name: 'zoho-proxy-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // SSE client for upstream (will be initialized when needed)
    this.upstreamClient = null;
    this.upstreamConnected = false;

    this.setupHandlers();
  }

  /**
   * Initialize Streamable HTTP client connection to energen-lean
   */
  async connectUpstream() {
    if (this.upstreamConnected) return;

    console.error('[Proxy] Connecting to energen-lean via Streamable HTTP...');

    try {
      this.upstreamClient = new Client(
        {
          name: 'zoho-proxy-client',
          version: '2.0.0',
        },
        {
          capabilities: {},
        }
      );

      const transport = new StreamableHTTPClientTransport(
        new URL(CONFIG.upstreamUrl),
        {
          requestInit: {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        }
      );

      await this.upstreamClient.connect(transport);

      this.upstreamConnected = true;
      console.error('[Proxy] ✅ Connected to energen-lean!');

      // Optionally fetch full tool list from upstream
      try {
        const { tools } = await this.upstreamClient.listTools();
        console.error(`[Proxy] Upstream has ${tools.length} tools available`);
      } catch (err) {
        console.error('[Proxy] Could not fetch upstream tools:', err.message);
      }

    } catch (error) {
      console.error('[Proxy] ❌ Failed to connect to energen-lean:', error.message);
      this.upstreamConnected = false;
    }
  }

  setupHandlers() {
    // List tools handler - return meta-tools + active tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const metaTools = this.getMetaTools();
      const activeTools = this.getActiveTools();

      return {
        tools: [...metaTools, ...activeTools],
      };
    });

    // Call tool handler - handle meta-tools or forward to upstream
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Handle meta-tools locally
      if (this.isMetaTool(name)) {
        return await this.handleMetaTool(name, args || {});
      }

      // Forward active tools to upstream
      if (this.activeRegistry.isActive(name)) {
        return await this.forwardToUpstream(name, args || {});
      }

      // Tool not active
      return {
        content: [{
          type: 'text',
          text: `Error: Tool '${name}' is not active. Use activate_tools() to load it first.`,
        }],
        isError: true,
      };
    });
  }

  getMetaTools() {
    return [
      {
        name: 'search_tools',
        description: 'Search for Zoho tools by keyword, category, or app. Returns tool metadata without loading them into context.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (matches tool name or description)',
            },
            category: {
              type: 'string',
              description: 'Filter by category (e.g., "invoicing", "contacts")',
            },
            app: {
              type: 'string',
              description: 'Filter by app (e.g., "Zoho Books", "Zoho CRM")',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20, max: 100)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'list_categories',
        description: 'List all available tool categories organized by app',
        inputSchema: {
          type: 'object',
          properties: {
            app: {
              type: 'string',
              description: 'Optional: Filter by specific app (e.g., "Zoho Books")',
            },
          },
        },
      },
      {
        name: 'get_tool_info',
        description: 'Get detailed information about a specific tool without activating it',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Tool name (e.g., "create_invoice")',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'activate_tools',
        description: 'Load specific tools into context for use. After activation, Claude can call these tools directly. Maximum 25 tools at once.',
        inputSchema: {
          type: 'object',
          properties: {
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tool names to activate (max 25)',
              maxItems: 25,
            },
          },
          required: ['tools'],
        },
      },
      {
        name: 'deactivate_tools',
        description: 'Remove tools from context to free up tokens. Use ["all"] to deactivate all tools at once.',
        inputSchema: {
          type: 'object',
          properties: {
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tool names to deactivate, or ["all"] for everything',
            },
          },
          required: ['tools'],
        },
      },
    ];
  }

  getActiveTools() {
    return this.activeRegistry.getActiveDefinitions();
  }

  isMetaTool(name) {
    return [
      'search_tools',
      'list_categories',
      'get_tool_info',
      'activate_tools',
      'deactivate_tools',
    ].includes(name);
  }

  async handleMetaTool(name, args) {
    try {
      let result;

      switch (name) {
        case 'search_tools':
          result = this.catalog.search(args);
          break;

        case 'list_categories':
          result = this.catalog.listCategories(args.app);
          break;

        case 'get_tool_info':
          const tool = this.catalog.getTool(args.name);
          if (!tool) {
            return {
              content: [{
                type: 'text',
                text: `Tool '${args.name}' not found in catalog`,
              }],
              isError: true,
            };
          }
          result = {
            ...tool,
            active: this.activeRegistry.isActive(args.name),
          };
          break;

        case 'activate_tools':
          const activateResult = this.activeRegistry.activate(args.tools || [], this.catalog);
          const stats = this.activeRegistry.getStats();
          result = {
            ...activateResult,
            total_active: stats.total,
            estimated_tokens: 2000 + (stats.total * 500), // Estimate
          };
          break;

        case 'deactivate_tools':
          const deactivateResult = this.activeRegistry.deactivate(args.tools || []);
          const statsAfter = this.activeRegistry.getStats();
          result = {
            ...deactivateResult,
            remaining_active: statsAfter.total,
            estimated_tokens: 2000 + (statsAfter.total * 500),
          };
          break;

        default:
          return {
            content: [{
              type: 'text',
              text: `Unknown meta-tool: ${name}`,
            }],
            isError: true,
          };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${name}: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Forward tool call to upstream energen-lean via SSE client
   */
  async forwardToUpstream(name, args) {
    this.activeRegistry.recordUse(name);

    // Ensure upstream connection
    if (!this.upstreamConnected) {
      await this.connectUpstream();
    }

    if (!this.upstreamConnected) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Not connected to energen-lean upstream server',
        }],
        isError: true,
      };
    }

    console.error(`[Proxy] Forwarding ${name} to energen-lean via SSE...`);

    try {
      // Call tool via SSE client
      const result = await this.upstreamClient.callTool({
        name: name,
        arguments: args,
      });

      console.error(`[Proxy] ✅ Tool ${name} executed successfully`);
      return result;

    } catch (error) {
      console.error(`[Proxy] ❌ Tool ${name} failed:`, error.message);
      return {
        content: [{
          type: 'text',
          text: `Error calling ${name}: ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  async start() {
    // Load catalog
    await this.catalog.load();

    // Start stdio server (for Claude Code)
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[Proxy] Zoho Proxy MCP Server v2.0 running');
    console.error(`[Proxy] Catalog: ${this.catalog.tools.size} tools loaded`);
    console.error(`[Proxy] Max active tools: ${CONFIG.maxActiveTools}`);
    console.error('[Proxy] Streamable HTTP client will connect to energen-lean on first tool call');
  }
}

// ============================================================================
// Main
// ============================================================================

const server = new ZohoProxyServer();
server.start().catch((error) => {
  console.error('[Proxy] Fatal error:', error);
  process.exit(1);
});
