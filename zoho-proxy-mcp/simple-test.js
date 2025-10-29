#!/usr/bin/env node

/**
 * Simple manual test for Zoho Proxy MCP
 * Just starts the server and verifies it loads correctly
 */

import('./index.js').then(() => {
  console.log('\n✅ Proxy server started successfully!');
  console.log('📊 Check the output above for:');
  console.log('   - Tool catalog loaded');
  console.log('   - Number of tools');
  console.log('   - Max active tools setting');
  console.log('\nPress Ctrl+C to stop the server\n');
}).catch(error => {
  console.error('❌ Failed to start proxy:', error);
  process.exit(1);
});
