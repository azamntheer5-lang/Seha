/**
 * In-memory sliding-window rate limiter.
 *
 * The reference site has zero abuse protection on its inquiry endpoint.
 * We add a per-IP sliding window (default: 10 requests / 60s) so the
 * service stays stable under load or scraping attempts.
 */

type Hit = { ts: number };

type Bucket = {
  hits: Hit[];
};

const buckets = new Map<string, Bucket>();

// Periodically purge stale buckets to keep memory flat.
const PURGE_INTERVAL_MS = 5 * 60 * 1000;
let lastPurge = Date.now();

function purge(now: number, windowMs: number) {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, bucket] of buckets) {
    bucket.hits = bucket.hits.filter((h) => now - h.ts < windowMs);
    if (bucket.hits.length === 0) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  purge(now, windowMs);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // Drop expired hits.
  bucket.hits = bucket.hits.filter((h) => now - h.ts < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest.ts)) / 1000)
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  bucket.hits.push({ ts: now });
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

/** Extract the best-effort client IP from request headers (behind gateway). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Cheap, privacy-preserving hash for logging IPs (FNV-1a, hex). */
export function hashIp(ip: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
