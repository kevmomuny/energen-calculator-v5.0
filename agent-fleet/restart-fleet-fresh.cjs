#!/usr/bin/env node

/**
 * FRESH FLEET RESTART
 *
 * Kills all running agents and restarts the fleet cleanly.
 * Use this when agents get stuck or stalled.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('═══════════════════════════════════════════════════');
console.log('🔄 FRESH FLEET RESTART');
console.log('═══════════════════════════════════════════════════\n');

console.log('Step 1: Killing old Node.js agent processes...');
console.log('Looking for agent-fleet processes to terminate\n');

// Kill processes by finding agent-fleet in command line
const killCmd = `Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*agent-fleet*' -or $_.CommandLine -like '*agent-fleet*' } | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; Write-Output "Killed PID: $($_.Id)" }`;

const killProc = spawn('powershell.exe', ['-Command', killCmd], {
  cwd: __dirname,
  stdio: 'inherit'
});

killProc.on('exit', (code) => {
  console.log('\nStep 2: Waiting 3 seconds for cleanup...');

  setTimeout(() => {
    console.log('\nStep 3: Launching fresh self-healing fleet...\n');

    const fleetProc = spawn('node', [path.join(__dirname, 'launch-self-healing-fleet.cjs')], {
      cwd: __dirname,
      stdio: 'inherit',
      detached: false
    });

    fleetProc.on('error', (err) => {
      console.error('❌ Failed to launch fleet:', err.message);
      process.exit(1);
    });

    // Keep this process alive to show output
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping fleet...');
      fleetProc.kill();
      process.exit(0);
    });
  }, 3000);
});
