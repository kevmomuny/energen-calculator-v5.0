/**
 * @module CacheManager
 * @description Calculation result caching for performance
 */

export class CacheManager {
  constructor(options = {}) {
    this.version = '5.0.0';
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
     * Generate cache key from payload
     * @param {Object} payload - Calculation payload
     * @returns {string} Cache key
     */
  generateKey(payload) {
    // Create deterministic key from relevant fields
    const keyObject = {
      generators: (payload.generators || []).map(g => ({
        kw: g.kw,
        quantity: g.quantity || 1,
        cylinders: g.cylinders,
        injectorType: g.injectorType
      })).sort((a, b) => a.kw - b.kw),
      services: (payload.services || []).sort(),
      contractLength: payload.contractLength || 12,
      facilityType: payload.facilityType || 'commercial',
      // Don't include customer info as it doesn't affect calculations
      // except for tax rate which is handled separately
      taxKey: payload.customerInfo ?
        `${payload.customerInfo.zip}_${payload.customerInfo.city}_${payload.customerInfo.state}` :
        'default'
    };

    return this._hashObject(keyObject);
  }

  /**
     * Get cached result
     * @param {string} key - Cache key
     * @returns {Object|null} Cached result or null
     */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    // Return deep clone to prevent mutations
    return JSON.parse(JSON.stringify(entry.data));
  }

  /**
     * Set cached result
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
  set(key, data) {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this._evictOldest();
    }

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Store deep clone
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }

  /**
     * Clear entire cache
     */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
     * Remove specific entry
     * @param {string} key - Cache key
     * @returns {boolean} True if removed
     */
  remove(key) {
    return this.cache.delete(key);
  }

  /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
  getStatistics() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate + '%',
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  /**
     * Get cache size
     * @returns {number} Number of cached entries
     */
  getSize() {
    return this.cache.size;
  }

  /**
     * Prune expired entries
     * @returns {number} Number of entries removed
     */
  prune() {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
     * Get cache metadata
     * @returns {Array} Array of cache entry metadata
     */
  getMetadata() {
    const metadata = [];

    for (const [key, entry] of this.cache.entries()) {
      metadata.push({
        key,
        timestamp: entry.timestamp,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp,
        expired: Date.now() - entry.timestamp > this.ttl
      });
    }

    return metadata.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
     * Evict oldest entry (LRU)
     * @private
     */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
     * Hash object to create cache key
     * @private
     */
  _hashObject(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `calc_${Math.abs(hash)}`;
  }
}

export default CacheManager;
