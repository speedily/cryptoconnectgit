import { config } from '../config/config';
import { Client } from '@xmtp/node-sdk';

interface RateLimitData {
  count: number;
  resetTime: number;
  lastRequestTime: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitData>;
  private windowMs: number;
  private maxRequests: number;

  private constructor() {
    this.limits = new Map();
    this.windowMs = config.get('RATE_LIMIT_WINDOW_MS');
    this.maxRequests = config.get('RATE_LIMIT_MAX_REQUESTS');
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  public checkLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
    const key = this.getKey(identifier);
    const now = Date.now();
    
    let limit = this.limits.get(key);

    if (!limit) {
      limit = {
        count: 1,
        resetTime: now + this.windowMs,
        lastRequestTime: now
      };
      this.limits.set(key, limit);
      return { allowed: true };
    }

    // Reset counter if window has passed
    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + this.windowMs;
      limit.lastRequestTime = now;
      return { allowed: true };
    }

    // Check if within rate limit
    if (limit.count < this.maxRequests) {
      limit.count += 1;
      limit.lastRequestTime = now;
      return { allowed: true };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      retryAfter: Math.ceil((limit.resetTime - now) / 1000) // in seconds
    };
  }

  // Clean up old rate limit records
  public cleanup(olderThanMs: number = this.windowMs * 2): void {
    const now = Date.now();
    for (const [key, data] of this.limits.entries()) {
      if (now - data.lastRequestTime > olderThanMs) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = RateLimiter.getInstance();

// Middleware for XMTP message handlers
export function withRateLimit(
  handler: (message: any, client: Client) => Promise<void>,
  identifierFn: (message: any) => string
) {
  return async (message: any, client: Client): Promise<void> => {
    const identifier = identifierFn(message);
    const { allowed, retryAfter } = rateLimiter.checkLimit(identifier);

    if (!allowed) {
      console.warn(`Rate limit exceeded for ${identifier}. Try again in ${retryAfter} seconds.`);
      // Optionally send a message to the user about rate limiting
      if (message.conversation) {
        await message.conversation.send(
          `You're sending messages too quickly. Please wait ${retryAfter} seconds before trying again.`
        );
      }
      return;
    }

    await handler(message, client);
  };
}

// Start cleanup interval
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes
