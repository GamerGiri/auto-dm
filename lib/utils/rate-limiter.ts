/**
 * Rate Limiter
 *
 * Redis-based sliding window rate limiter for Instagram DM sending.
 * Enforces a cap of 190 DMs per hour per Instagram account.
 */

import Redis from "ioredis";

const RATE_LIMIT_MAX = 190; // DMs per hour
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const REQUEUE_DELAY_MS = 30 * 60 * 1000; // 30 minutes
const MAX_REQUEUE_ATTEMPTS = 3;

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return redis;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remainingDMs: number;
  shouldRequeue: boolean;
  requeueDelayMs: number;
  shouldSkip: boolean;
}

/**
 * Check if an Instagram account is within its DM rate limit.
 *
 * Uses a Redis counter with a 1-hour TTL per account.
 * Key pattern: `rate:dm:{instagramAccountId}`
 *
 * @param instagramAccountId - The Instagram account ID to check
 * @param requeueAttempt - How many times this job has been requeued (0 = first attempt)
 * @returns Rate limit result with action recommendations
 */
export async function checkRateLimit(
  instagramAccountId: string,
  requeueAttempt: number = 0
): Promise<RateLimitResult> {
  const client = getRedis();
  const key = `rate:dm:${instagramAccountId}`;

  const currentCount = await client.get(key);
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  if (count >= RATE_LIMIT_MAX) {
    // Over the limit
    if (requeueAttempt >= MAX_REQUEUE_ATTEMPTS) {
      // Exceeded max requeue attempts — skip this DM
      return {
        allowed: false,
        currentCount: count,
        remainingDMs: 0,
        shouldRequeue: false,
        requeueDelayMs: 0,
        shouldSkip: true,
      };
    }

    return {
      allowed: false,
      currentCount: count,
      remainingDMs: 0,
      shouldRequeue: true,
      requeueDelayMs: REQUEUE_DELAY_MS,
      shouldSkip: false,
    };
  }

  return {
    allowed: true,
    currentCount: count,
    remainingDMs: RATE_LIMIT_MAX - count,
    shouldRequeue: false,
    requeueDelayMs: 0,
    shouldSkip: false,
  };
}

/**
 * Increment the DM counter for an Instagram account.
 * Called after a DM is successfully sent.
 */
export async function incrementDMCounter(
  instagramAccountId: string
): Promise<number> {
  const client = getRedis();
  const key = `rate:dm:${instagramAccountId}`;

  const pipeline = client.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, RATE_LIMIT_WINDOW);
  const results = await pipeline.exec();

  // Return the new count
  const incrResult = results?.[0];
  return (incrResult?.[1] as number) ?? 0;
}

/**
 * Get the current DM count for an Instagram account.
 */
export async function getCurrentDMCount(
  instagramAccountId: string
): Promise<number> {
  const client = getRedis();
  const key = `rate:dm:${instagramAccountId}`;
  const count = await client.get(key);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Reset the rate limiter for an account (useful for testing).
 */
export async function resetRateLimit(
  instagramAccountId: string
): Promise<void> {
  const client = getRedis();
  const key = `rate:dm:${instagramAccountId}`;
  await client.del(key);
}

// Export constants for use in tests
export { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW, REQUEUE_DELAY_MS, MAX_REQUEUE_ATTEMPTS };
