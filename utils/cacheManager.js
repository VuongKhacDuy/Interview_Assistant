class CacheManager {
    constructor(ttlSeconds = 3600) {
        this.cache = new Map();
        this.ttlSeconds = ttlSeconds;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        return item.value;
    }

    set(key, value) {
        const expiry = Date.now() + (this.ttlSeconds * 1000);
        this.cache.set(key, { value, expiry });
        return true;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    // Generate cache key based on parameters
    generateKey(prefix, params) {
        return `${prefix}_${JSON.stringify(params)}`;
    }

    // Wrapper function for caching API results
    async getCachedData(key, fetchFunction) {
        const cachedData = this.get(key);
        if (cachedData) {
            return cachedData;
        }

        const freshData = await fetchFunction();
        this.set(key, freshData);
        return freshData;
    }

    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

module.exports = new CacheManager();