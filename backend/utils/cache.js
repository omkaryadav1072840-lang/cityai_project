/**
 * SmartCity AI - High-Performance In-Memory TTL Cache
 * Caches high-frequency read endpoints (e.g. SCADA metrics, live signals)
 * reducing database read load by up to 90%.
 */

class MemoryCache {
    constructor() {
        this.store = new Map();
    }

    /**
     * Get cached item if not expired
     * @param {string} key
     * @returns {any|null}
     */
    get(key) {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    /**
     * Set cache entry with TTL in milliseconds (default 5000ms / 5s)
     * @param {string} key
     * @param {any} value
     * @param {number} [ttlMs=5000]
     */
    set(key, value, ttlMs = 5000) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
    }

    /**
     * Invalidate specific key
     * @param {string} key
     */
    del(key) {
        this.store.delete(key);
    }

    /**
     * Invalidate all keys matching prefix
     * @param {string} prefix
     */
    delByPrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Clear entire cache store
     */
    flush() {
        this.store.clear();
    }
}

const memoryCache = new MemoryCache();
module.exports = memoryCache;
