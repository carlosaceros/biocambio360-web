interface RateLimitRecord {
    count: number;
    resetTime: number;
}

// Global in-memory cache across serverless warm invocations
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Checks if a client IP or identifier has exceeded the rate limit.
 * @param identifier IP or unique key (e.g. `wompi_status_192.168.1.1`)
 * @param maxRequests Maximum requests allowed within window
 * @param windowMs Time window in milliseconds (default: 60s)
 */
export function rateLimit(
    identifier: string,
    maxRequests: number = 60,
    windowMs: number = 60 * 1000
): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);

    // Evict expired entries if map gets too large (prevent memory leak)
    if (rateLimitMap.size > 5000) {
        for (const [key, val] of rateLimitMap.entries()) {
            if (now > val.resetTime) {
                rateLimitMap.delete(key);
            }
        }
    }

    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
        return {
            success: true,
            limit: maxRequests,
            remaining: maxRequests - 1,
            reset: now + windowMs
        };
    }

    if (record.count >= maxRequests) {
        return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset: record.resetTime
        };
    }

    record.count++;
    return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - record.count,
        reset: record.resetTime
    };
}

/**
 * Extracts real client IP from incoming request headers
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '127.0.0.1';
}
