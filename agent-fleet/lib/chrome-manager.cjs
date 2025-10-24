/**
 * Chrome Instance Manager
 * Manages dedicated Chrome instances for UI agents with port allocation
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { atomicUpdate } = require('./coordination.cjs');

const CHROME_PROFILES_DIR = path.join(__dirname, '../../.chrome-profiles');
const CHROME_PORTS_FILE = 'mcp-instances/chrome-ports.json';
const BASE_DEBUG_PORT = 9222;
const MAX_CHROME_INSTANCES = 8;

class ChromeManager {
  constructor(agentName) {
    this.agentName = agentName;
    this.chromeProcess = null;
    this.debugPort = null;
    this.profileDir = null;
  }

  /**
   * Allocate a Chrome debugging port for this agent
   */
  async allocatePort() {
    return await atomicUpdate(CHROME_PORTS_FILE, (ports) => {
      // Find first available port
      for (let i = 0; i < MAX_CHROME_INSTANCES; i++) {
        const port = BASE_DEBUG_PORT + i;
        const portInUse = Object.values(ports).includes(port);

        if (!portInUse) {
          ports[this.agentName] = port;
          this.debugPort = port;
          return ports;
        }
      }

      throw new Error(`No available Chrome ports (max ${MAX_CHROME_INSTANCES} instances)`);
    });
  }

  /**
   * Release the Chrome port for this agent
   */
  async releasePort() {
    if (!this.debugPort) return;

    await atomicUpdate(CHROME_PORTS_FILE, (ports) => {
      delete ports[this.agentName];
      return ports;
    });

    this.debugPort = null;
  }

  /**
   * Launch Chrome with remote debugging enabled
   */
  async launchChrome() {
    // Allocate port first
    await this.allocatePort();

    // Create agent-specific profile directory
    this.profileDir = path.join(CHROME_PROFILES_DIR, this.agentName.toLowerCase().replace(/\s+/g, '-'));
    await fs.mkdir(this.profileDir, { recursive: true });

    console.log(`[${this.agentName}] Launching Chrome on port ${this.debugPort}`);
    console.log(`[${this.agentName}] Profile: ${this.profileDir}`);

    // Chrome executable paths by platform
    const chromePaths = {
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
      ],
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      ],
      linux: [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ]
    };

    const platform = process.platform;
    const possiblePaths = chromePaths[platform] || chromePaths.linux;

    let chromePath = null;
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        chromePath = p;
        break;
      } catch (err) {
        // Path doesn't exist, try next
      }
    }

    if (!chromePath) {
      throw new Error(`Chrome executable not found. Searched: ${possiblePaths.join(', ')}`);
    }

    // Chrome launch arguments
    const args = [
      '--headless=new', // New headless mode (keeps Chrome alive)
      `--remote-debugging-port=${this.debugPort}`,
      `--user-data-dir=${this.profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain',
      '--window-size=1280,720'
    ];

    // Spawn Chrome
    this.chromeProcess = spawn(chromePath, args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    console.log(`[${this.agentName}] Chrome PID: ${this.chromeProcess.pid}`);

    // Handle Chrome output (suppress most of it)
    this.chromeProcess.stdout.on('data', (data) => {
      // Silently consume stdout
    });

    this.chromeProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Only log errors, not DevTools info
      if (output.includes('ERROR') || output.includes('FATAL')) {
        console.error(`[${this.agentName}] Chrome error:`, output);
      }
    });

    this.chromeProcess.on('close', (code) => {
      console.log(`[${this.agentName}] Chrome exited with code ${code}`);
    });

    this.chromeProcess.on('error', (error) => {
      console.error(`[${this.agentName}] Chrome spawn error:`, error.message);
    });

    // Wait for Chrome to initialize
    await this.sleep(2000);

    return {
      port: this.debugPort,
      pid: this.chromeProcess.pid,
      profileDir: this.profileDir
    };
  }

  /**
   * Close Chrome instance
   */
  async closeChrome() {
    if (this.chromeProcess && !this.chromeProcess.killed) {
      console.log(`[${this.agentName}] Closing Chrome (PID ${this.chromeProcess.pid})`);

      this.chromeProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await this.sleep(1000);

      // Force kill if still running
      if (!this.chromeProcess.killed) {
        this.chromeProcess.kill('SIGKILL');
      }

      this.chromeProcess = null;
    }

    // Release port
    await this.releasePort();
  }

  /**
   * Get Chrome DevTools endpoint URL
   */
  getDevToolsUrl() {
    if (!this.debugPort) {
      throw new Error('Chrome not launched - no debug port allocated');
    }
    return `http://localhost:${this.debugPort}`;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ChromeManager;
