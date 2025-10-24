/**
 * Simple entry point for Zoho MCP Server
 * This ensures the server starts correctly when launched by Claude Code
 */

import ZohoMCPServer from './ZohoMCPServer.js';

const server = new ZohoMCPServer();
server.start().catch((error) => {
    console.error('Failed to start Zoho MCP Server:', error);
    process.exit(1);
});
