#!/usr/bin/env node
/**
 * Proxy MCP Server for Official Zoho Books HTTP MCP
 * Handles authentication and forwards requests to the HTTP endpoint
 */

const { spawn } = require('child_process');
const axios = require('axios');

// Zoho OAuth credentials from environment
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '1000.HCNTM9V9V8R0D7QNFKC29RXOLZ8WSS';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '6e745df6594b79af8d6fd8f3385531dc81048c0bfa';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '1000.be6b303f811ce9d912fd469eefddc972.96aa26f60ecb33ecd9f254ed2fee96fa';
const ZOHO_ACCOUNTS_URL = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

// HTTP MCP endpoint - corrected domain
const MCP_URL = 'https://zohomcp-8921.zohomcp.com/mcp/message?key=fY2ep5208fb6edd8791d8326316d0a';

// Use npx to run mcp-remote with proper authentication
const args = [
  '-y',
  'mcp-remote',
  MCP_URL
];

console.error('Starting Zoho Books HTTP MCP Proxy...');
console.error('MCP URL:', MCP_URL);
console.error('OAuth Client ID:', ZOHO_CLIENT_ID);

// Set environment variables for OAuth
const env = {
  ...process.env,
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ACCOUNTS_URL
};

// Spawn mcp-remote as child process
const child = spawn('npx', args, {
  env,
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('Failed to start HTTP MCP proxy:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.error('HTTP MCP proxy exited with code:', code);
  process.exit(code || 0);
});

// Forward signals
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
