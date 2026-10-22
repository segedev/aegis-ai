const tokenBucketRateLimiter = async (req, res, next) => {
  try {
    const client = req.client;
    const now = new Date();
    const elapsedMinutes = (now - new Date(client.lastRefillAt)) / (1000 * 60);

    // Calculate tokens to add based on client tier refill rate
    const tokensToAdd = Math.floor(elapsedMinutes * client.refillRatePerMinute);
    let currentTokens = client.bucketTokens;

    if (tokensToAdd > 0) {
      currentTokens = Math.min(client.maxCapacity, client.bucketTokens + tokensToAdd);
      client.lastRefillAt = now;
    }

    if (currentTokens < 1) {
      const retryAfterSeconds = Math.ceil(60 / client.refillRatePerMinute);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded (Token Bucket depleted).',
        tier: client.tier,
        retryAfterSeconds,
      });
    }

    // Consume 1 token and persist state
    client.bucketTokens = currentTokens - 1;
    await client.save();

    // Attach rate limit headers for REST API observability
    res.set({
      'X-RateLimit-Limit': client.maxCapacity,
      'X-RateLimit-Remaining': client.bucketTokens,
      'X-RateLimit-Tier': client.tier,
    });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = tokenBucketRateLimiter;
