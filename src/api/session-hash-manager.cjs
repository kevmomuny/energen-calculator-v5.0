/**
 * Session Hash Manager - Bid Recreation System
 *
 * Creates unique hashes for UI/bid sessions that can be embedded in Zoho quotes.
 * Allows complete recreation of any bid with exact settings, generators, and services.
 *
 * Hash Format: BASE64(JSON({settings, generators, services, metadata, timestamp}))
 * Storage: In-memory + optional file persistence for production
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class SessionHashManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.storageDir = options.storageDir || path.join(__dirname, '../../data/sessions');
    this.enablePersistence = options.enablePersistence !== false;
    this.maxAge = options.maxAge || 365 * 24 * 60 * 60 * 1000; // 1 year default

    // Initialize storage directory if persistence enabled
    if (this.enablePersistence) {
      this._initStorage();
    }
  }

  async _initStorage() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize session storage:', error);
      this.enablePersistence = false;
    }
  }

  /**
   * Create session hash from bid state
   *
   * @param {Object} bidState - Complete bid state
   * @param {Object} bidState.settings - User's customized settings (labor rates, markups, etc.)
   * @param {Array} bidState.generators - Array of generator specs
   * @param {Array} bidState.services - Selected services with frequencies
   * @param {Object} bidState.customerInfo - Customer information
   * @param {Object} bidState.metadata - Additional metadata (user, timestamp, etc.)
   * @returns {Promise<string>} - Unique session hash
   */
  async createSessionHash(bidState) {
    // Validate required fields
    if (!bidState || typeof bidState !== 'object') {
      throw new Error('Invalid bid state: must be an object');
    }

    // Create session object with timestamp
    const session = {
      version: '5.0',
      timestamp: new Date().toISOString(),
      settings: bidState.settings || {},
      generators: bidState.generators || [],
      services: bidState.services || [],
      customerInfo: bidState.customerInfo || {},
      metadata: bidState.metadata || {}
    };

    // Generate unique hash using SHA256 + timestamp
    const dataString = JSON.stringify(session);
    const hash = crypto
      .createHash('sha256')
      .update(dataString + Date.now())
      .digest('hex')
      .substring(0, 16); // 16-char hash for readability

    // Store in memory
    this.sessions.set(hash, session);

    // Persist to disk if enabled
    if (this.enablePersistence) {
      await this._persistSession(hash, session);
    }

    return hash;
  }

  /**
   * Retrieve session state from hash
   *
   * @param {string} hash - Session hash
   * @returns {Promise<Object|null>} - Session state or null if not found
   */
  async getSessionByHash(hash) {
    // Check memory first
    if (this.sessions.has(hash)) {
      return this.sessions.get(hash);
    }

    // Try loading from disk
    if (this.enablePersistence) {
      const session = await this._loadSession(hash);
      if (session) {
        // Cache in memory
        this.sessions.set(hash, session);
        return session;
      }
    }

    return null;
  }

  /**
   * Create compact hash for embedding in quote PDFs/metadata
   * Returns shorter hash with checksum for data integrity
   */
  createCompactHash(bidState) {
    const dataString = JSON.stringify({
      s: bidState.settings,
      g: bidState.generators,
      v: bidState.services,
      c: bidState.customerInfo
    });

    // Create hash
    const hash = crypto
      .createHash('sha256')
      .update(dataString)
      .digest('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 12);

    return hash;
  }

  /**
   * Persist session to disk
   * @private
   */
  async _persistSession(hash, session) {
    try {
      const filePath = path.join(this.storageDir, `${hash}.json`);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to persist session ${hash}:`, error);
    }
  }

  /**
   * Load session from disk
   * @private
   */
  async _loadSession(hash) {
    try {
      const filePath = path.join(this.storageDir, `${hash}.json`);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to load session ${hash}:`, error);
      }
      return null;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredHashes = [];

    for (const [hash, session] of this.sessions.entries()) {
      const sessionTime = new Date(session.timestamp).getTime();
      if (now - sessionTime > this.maxAge) {
        expiredHashes.push(hash);
      }
    }

    // Remove from memory
    for (const hash of expiredHashes) {
      this.sessions.delete(hash);
    }

    // Remove from disk
    if (this.enablePersistence) {
      for (const hash of expiredHashes) {
        try {
          const filePath = path.join(this.storageDir, `${hash}.json`);
          await fs.unlink(filePath);
        } catch (error) {
          // Ignore errors
        }
      }
    }

    return expiredHashes.length;
  }

  /**
   * Get session statistics
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      persistenceEnabled: this.enablePersistence,
      storageDir: this.storageDir,
      maxAge: this.maxAge
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get or create singleton instance
 */
function getInstance(options) {
  if (!instance) {
    instance = new SessionHashManager(options);
  }
  return instance;
}

module.exports = {
  SessionHashManager,
  getInstance,
  // Export for testing
  _resetInstance: () => { instance = null; }
};
