/**
 * SCHEDULE CACHE SERVICE
 *
 * In-memory caching layer for timetable schedule generation.
 * Uses LRU (Least Recently Used) eviction policy with TTL.
 *
 * Purpose:
 * - Cache generated schedules to avoid repeated DB queries
 * - Invalidate cache when exceptions or timetables are modified
 * - Reduce server load and improve response times
 *
 * NOTE: For production with multiple server instances, replace with Redis.
 */

class ScheduleCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100; // Maximum cached items
    this.defaultTTL = options.defaultTTL || 1000 * 60 * 30; // 30 minutes default
    this.cleanupInterval = options.cleanupInterval || 1000 * 60 * 5; // Clean every 5 minutes

    // Track hit/miss statistics
    this.hits = 0;
    this.misses = 0;

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);

    // Unref timer to allow graceful shutdown
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Generate cache key from timetable ID and date range
   * @param {string} timetableId - Timetable ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} type - Cache type (schedule, today, week)
   * @returns {string} Cache key
   */
  generateKey(timetableId, startDate, endDate, type = "schedule") {
    return `${type}:${timetableId}:${startDate}:${endDate}`;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Object|null} Cached data or null if expired/missing
   */
  get(key) {
    try {
      const item = this.cache.get(key);

      if (!item) {
        this.misses++;
        return null;
      }

      // Check if expired
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        this.misses++;
        return null;
      }

      // Update access time for LRU
      item.lastAccess = Date.now();
      this.hits++;

      return item.data;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cache data
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = this.defaultTTL) {
    try {
      // Evict LRU item if cache is full
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      this.cache.set(key, {
        data,
        createdAt: Date.now(),
        expiry: Date.now() + ttl,
        lastAccess: Date.now(),
      });
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   */
  delete(key) {
    try {
      this.cache.delete(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * Invalidate all caches for a specific timetable
   * @param {string} timetableId - Timetable ID
   */
  invalidateTimetable(timetableId) {
    try {
      const keysToDelete = [];

      for (const key of this.cache.keys()) {
        // Use exact matching with colon delimiter to avoid partial matches
        // Key format: type:timetableId:startDate:endDate
        const parts = key.split(":");
        if (parts[1] === timetableId) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.cache.delete(key));
    } catch (error) {
      console.error("Cache invalidateTimetable error:", error);
    }
  }

  /**
   * Invalidate all caches for a specific college
   * @param {string} collegeId - College ID
   */
  invalidateCollege(collegeId) {
    try {
      const keysToDelete = [];

      for (const key of this.cache.keys()) {
        // Use exact matching - college ID should be embedded in the key structure
        // For schedule keys, we need to check if college is referenced
        // Note: Current key format doesn't include collegeId directly
        // This method is kept for future use when college-based caching is implemented
        if (key.includes(collegeId)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.cache.delete(key));
    } catch (error) {
      console.error("Cache invalidateCollege error:", error);
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    try {
      this.cache.clear();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    try {
      const now = Date.now();
      const keysToDelete = [];

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiry) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.cache.delete(key));
    } catch (error) {
      console.error("Cache cleanup error:", error);
    }
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    try {
      let oldestKey = null;
      let oldestAccess = Infinity;

      for (const [key, item] of this.cache.entries()) {
        if (item.lastAccess < oldestAccess) {
          oldestAccess = item.lastAccess;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    } catch (error) {
      console.error("Cache evictLRU error:", error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let activeCount = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      totalItems: this.cache.size,
      activeItems: activeCount,
      expiredItems: expiredCount,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  /**
   * Calculate hit rate (actual tracking)
   * @returns {number} Hit rate percentage
   */
  calculateHitRate() {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return Math.round((this.hits / total) * 100);
  }

  /**
   * Reset statistics counters
   */
  resetStats() {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Destroy cache and stop cleanup timer
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
    this.resetStats();
  }
}

// Create singleton instance
const scheduleCache = new ScheduleCache({
  maxSize: 100,
  defaultTTL: 1000 * 60 * 30, // 30 minutes
  cleanupInterval: 1000 * 60 * 5, // 5 minutes
});

// Export class for testing and singleton for use
module.exports = {
  ScheduleCache,
  cache: scheduleCache,
};
