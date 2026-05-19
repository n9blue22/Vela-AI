const buckets = new Map();

function nowMs() {
  return Date.now();
}

function getClientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function clampNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function refillTokens(bucket, capacity, refillPerSecond, currentTimeMs) {
  const elapsedSeconds = Math.max((currentTimeMs - bucket.lastRefillAt) / 1000, 0);
  if (elapsedSeconds <= 0) return bucket.tokens;
  const replenished = elapsedSeconds * refillPerSecond;
  bucket.tokens = Math.min(capacity, bucket.tokens + replenished);
  bucket.lastRefillAt = currentTimeMs;
  return bucket.tokens;
}

function cleanupStaleBuckets(ttlMs) {
  const currentTimeMs = nowMs();
  for (const [key, bucket] of buckets) {
    if (currentTimeMs - bucket.lastSeenAt > ttlMs) {
      buckets.delete(key);
    }
  }
}

setInterval(() => cleanupStaleBuckets(30 * 60 * 1000), 5 * 60 * 1000).unref();

export function createTokenBucketLimiter(options = {}) {
  const {
    keyPrefix = "global",
    capacity = 60,
    refillPerSecond = 1,
    blockDurationMs = 0,
    message = "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    getKey
  } = options;

  const safeCapacity = clampNumber(capacity, 60);
  const safeRefillRate = clampNumber(refillPerSecond, 1);
  const safeBlockDurationMs = Number.isFinite(blockDurationMs) && blockDurationMs > 0 ? blockDurationMs : 0;

  return function tokenBucketLimiter(req, res, next) {
    try {
      const suffix = getKey ? getKey(req) : getClientKey(req);
      const bucketKey = `${keyPrefix}:${suffix}`;
      const currentTimeMs = nowMs();

      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = {
          tokens: safeCapacity,
          lastRefillAt: currentTimeMs,
          blockedUntil: 0,
          lastSeenAt: currentTimeMs
        };
        buckets.set(bucketKey, bucket);
      }

      bucket.lastSeenAt = currentTimeMs;

      if (bucket.blockedUntil > currentTimeMs) {
        const retryAfter = Math.ceil((bucket.blockedUntil - currentTimeMs) / 1000);
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({ message });
      }

      refillTokens(bucket, safeCapacity, safeRefillRate, currentTimeMs);

      if (bucket.tokens < 1) {
        if (safeBlockDurationMs > 0) {
          bucket.blockedUntil = currentTimeMs + safeBlockDurationMs;
          res.setHeader("Retry-After", String(Math.ceil(safeBlockDurationMs / 1000)));
        }
        return res.status(429).json({ message });
      }

      bucket.tokens -= 1;
      return next();
    } catch (error) {
      console.error("[rate-limit] unexpected error", error);
      return res.status(429).json({ message: "Yêu cầu tạm thời bị giới hạn. Vui lòng thử lại." });
    }
  };
}
