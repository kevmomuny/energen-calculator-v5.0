#!/usr/bin/env node

/**
 * Zoho Proxy MCP Server
 *
 * On-demand tool loading proxy for Zoho Cloud MCP (energen-lean)
 *
 * Features:
 * - Holds all 609 tool definitions internally (0 tokens to Claude)
 * - Exposes 5 meta-tools for search/browse/activate/deactivate
 * - Dynamically loads tools on-demand (only active tools count toward context)
 * - Forwards tool calls to upstream energen-lean server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Upstream Zoho Cloud MCP (energen-lean) - Updated 2025-10-27
  upstreamUrl: process.env.UPSTREAM_MCP_URL || 'https://energen-lean-897662416.zohomcp.com/mcp/message?key=9f15f41fdd1a73dba505c3be6857016d',

  // Proxy settings
  maxActiveTools: parseInt(process.env.MAX_ACTIVE_TOOLS) || 50,
  cacheEnabled: process.env.CACHE_CATALOG !== 'false',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Paths - use absolute path
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

  /**
   * Load tool catalog from upstream or cache
   */
  async load() {
    if (this.loaded) return;

    console.error('[Catalog] Loading tool catalog...');

    // TODO: In production, fetch from energen-lean
    // For now, load from local cache if available
    try {
      if (CONFIG.cacheEnabled) {
        const fs = await import('fs/promises');
        const data = await fs.readFile(CONFIG.catalogPath, 'utf-8');
        const catalog = JSON.parse(data);
        this.importCatalog(catalog);
        console.error(`[Catalog] Loaded ${this.tools.size} tools from cache`);
      }
    } catch (err) {
      console.error('[Catalog] No cache found, will need to fetch from upstream');
      // In production: fetchFromUpstream()
    }

    this.loaded = true;
  }

  /**
   * Import tool catalog from JSON
   */
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
            // In production, would have full inputSchema
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

  /**
   * Search tools by query
   */
  search({ query = '', category = '', app = '', limit = 20 }) {
    let results = Array.from(this.tools.values());

    // Filter by app
    if (app) {
      results = results.filter(t => t.app === app);
    }

    // Filter by category
    if (category) {
      results = results.filter(t => t.category === category);
    }

    // Filter by query
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    // Limit results
    return results.slice(0, limit).map(t => ({
      name: t.name,
      app: t.app,
      category: t.category,
      description: t.description,
    }));
  }

  /**
   * Get tool by name
   */
  getTool(name) {
    return this.tools.get(name);
  }

  /**
   * List all categories
   */
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
    this.active = new Map(); // name -> { activatedAt, useCount }
    this.maxTools = maxTools;
  }

  /**
   * Activate tools
   */
  activate(toolNames) {
    const activated = [];
    const failed = [];

    for (const name of toolNames) {
      if (this.active.size >= this.maxTools) {
        failed.push({ name, reason: 'Max active tools reached' });
        continue;
      }

      if (!this.active.has(name)) {
        this.active.set(name, {
          activatedAt: new Date().toISOString(),
          useCount: 0,
        });
        activated.push(name);
      } else {
        failed.push({ name, reason: 'Already active' });
      }
    }

    return { activated, failed };
  }

  /**
   * Deactivate tools
   */
  deactivate(toolNames) {
    const deactivated = [];

    // Handle 'all' special case
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

  /**
   * Check if tool is active
   */
  isActive(name) {
    return this.active.has(name);
  }

  /**
   * Increment use count
   */
  recordUse(name) {
    if (this.active.has(name)) {
      const tool = this.active.get(name);
      tool.useCount++;
    }
  }

  /**
   * Get active tool names
   */
  getActiveNames() {
    return Array.from(this.active.keys());
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      total: this.active.size,
      max: this.maxTools,
      tools: Array.from(this.active.entries()).map(([name, info]) => ({
        name,
        ...info,
      })),
    };
  }
}

// ============================================================================
// MCP Server
// ============================================================================

class ZohoProxyServer {
  constructor() {
    this.catalog = new ToolCatalog();
    this.activeRegistry = new ActiveToolsRegistry(CONFIG.maxActiveTools);
    this.server = new Server(
      {
        name: 'zoho-proxy-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP handlers
   */
  setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const metaTools = this.getMetaTools();
      const activeTools = this.getActiveTools();

      return {
        tools: [...metaTools, ...activeTools],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Handle meta-tools
      if (this.isMetaTool(name)) {
        return await this.handleMetaTool(name, args || {});
      }

      // Handle active tools (forward to upstream)
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

  /**
   * Get meta-tool definitions
   */
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

  /**
   * Get currently active tool definitions
   */
  getActiveTools() {
    const activeNames = this.activeRegistry.getActiveNames();
    const tools = [];

    for (const name of activeNames) {
      const tool = this.catalog.getTool(name);
      if (tool) {
        tools.push({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        });
      }
    }

    return tools;
  }

  /**
   * Check if tool is a meta-tool
   */
  isMetaTool(name) {
    return [
      'search_tools',
      'list_categories',
      'get_tool_info',
      'activate_tools',
      'deactivate_tools',
    ].includes(name);
  }

  /**
   * Handle meta-tool calls
   */
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
          const activateResult = this.activeRegistry.activate(args.tools || []);
          const stats = this.activeRegistry.getStats();
          result = {
            ...activateResult,
            total_active: stats.total,
            estimated_tokens: stats.total * 500, // Rough estimate
          };
          break;

        case 'deactivate_tools':
          const deactivateResult = this.activeRegistry.deactivate(args.tools || []);
          const statsAfter = this.activeRegistry.getStats();
          result = {
            ...deactivateResult,
            remaining_active: statsAfter.total,
            estimated_tokens: statsAfter.total * 500,
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
   * Forward tool call to upstream energen-lean
   */
  async forwardToUpstream(name, args) {
    // Record usage
    this.activeRegistry.recordUse(name);

    console.error(`[Proxy] Forwarding ${name} to energen-lean...`);

    try {
      // Make HTTP POST request to energen-lean MCP
      const response = await fetch(CONFIG.upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: name,
            arguments: args,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle JSON-RPC error
      if (result.error) {
        console.error(`[Proxy] Upstream error:`, result.error);
        return {
          content: [{
            type: 'text',
            text: `Error from energen-lean: ${result.error.message || JSON.stringify(result.error)}`,
          }],
          isError: true,
        };
      }

      // Return successful result
      console.error(`[Proxy] Tool ${name} executed successfully`);
      return result.result;

    } catch (error) {
      console.error(`[Proxy] Failed to forward to energen-lean:`, error);
      return {
        content: [{
          type: 'text',
          text: `Proxy error: Failed to connect to energen-lean - ${error.message}`,
        }],
        isError: true,
      };
    }
  }

  /**
   * Start the server
   */
  async start() {
    // Load catalog
    await this.catalog.load();

    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('[Proxy] Zoho Proxy MCP Server running');
    console.error(`[Proxy] Catalog: ${this.catalog.tools.size} tools loaded`);
    console.error(`[Proxy] Max active tools: ${CONFIG.maxActiveTools}`);
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
