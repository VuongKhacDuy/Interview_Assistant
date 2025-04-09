/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
    constructor(cooldownPeriod = 5000) {
        this.userCooldowns = new Map();
        this.cooldownPeriod = cooldownPeriod;
    }

    /**
     * Check if a user is rate limited
     * @param {string} userId - User identifier (e.g., IP address)
     * @returns {Object} Result with isLimited and remainingTime properties
     */
    checkLimit(userId) {
        const now = Date.now();
        const lastRequestTime = this.userCooldowns.get(userId);
        
        if (lastRequestTime && now - lastRequestTime < this.cooldownPeriod) {
            const remainingTime = Math.ceil((this.cooldownPeriod - (now - lastRequestTime)) / 1000);
            return {
                isLimited: true,
                remainingTime
            };
        }
        
        this.userCooldowns.set(userId, now);
        return {
            isLimited: false,
            remainingTime: 0
        };
    }
}

module.exports = RateLimiter;