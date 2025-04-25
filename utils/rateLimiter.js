class RateLimiter {
    constructor(cooldownMs = 5000) {
        this.cooldownMs = cooldownMs;
        this.requests = new Map();
    }

    async checkRateLimit(ip) {
        const now = Date.now();
        const lastRequest = this.requests.get(ip);

        if (lastRequest && (now - lastRequest) < this.cooldownMs) {
            const waitTime = Math.ceil((this.cooldownMs - (now - lastRequest)) / 1000);
            return {
                success: false,
                error: `Vui lòng đợi ${waitTime} giây trước khi gửi yêu cầu tiếp theo.`
            };
        }

        this.requests.set(ip, now);
        return { success: true };
    }

    // Clean up old entries periodically
    cleanup() {
        const now = Date.now();
        for (const [ip, timestamp] of this.requests.entries()) {
            if (now - timestamp > this.cooldownMs) {
                this.requests.delete(ip);
            }
        }
    }
}

module.exports = RateLimiter;