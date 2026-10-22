const crypto = require('crypto');
const { z } = require('zod');
const ApiClient = require('../models/ApiClient.model');
const RequestLog = require('../models/RequestLog.model');
const SemanticCache = require('../models/SemanticCache.model');
const aiService = require('../services/ai.service');
const cacheService = require('../services/cache.service');

const clientSchema = z.object({
  name: z.string().min(2, 'Client name must be at least 2 characters'),
  tier: z.enum(['free', 'pro', 'enterprise']).optional().default('free'),
});

const querySchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
  bypassCache: z.boolean().optional().default(false),
});

const TIER_CONFIG = {
  free: { maxCapacity: 10, refillRatePerMinute: 10 },
  pro: { maxCapacity: 60, refillRatePerMinute: 60 },
  enterprise: { maxCapacity: 300, refillRatePerMinute: 300 },
};

/**
 * POST /api/v1/clients
 * Registers a new API Client and provisions a Token-Bucket configuration.
 */
exports.registerClient = async (req, res, next) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.issues });
    }

    const { name, tier } = parsed.data;
    const apiKey = `aegis_${tier}_${crypto.randomBytes(16).toString('hex')}`;
    const config = TIER_CONFIG[tier];

    const client = await ApiClient.create({
      name,
      tier,
      apiKey,
      bucketTokens: config.maxCapacity,
      maxCapacity: config.maxCapacity,
      refillRatePerMinute: config.refillRatePerMinute,
    });

    res.status(201).json({
      success: true,
      message: 'API Client registered. Use this apiKey in the x-api-key header.',
      data: {
        id: client._id,
        name: client.name,
        tier: client.tier,
        apiKey: client.apiKey,
        rateLimitPerMinute: client.refillRatePerMinute,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/ai/query
 * Main Semantic Gateway Endpoint: Checks vector cache before invoking LLM.
 */
exports.proxyAIQuery = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.issues });
    }

    const { prompt, bypassCache } = parsed.data;

    // Step 1: Generate embedding vector for incoming prompt
    const embedding = await aiService.generateEmbedding(prompt);

    // Step 2: Check MongoDB Semantic Vector Cache
    if (!bypassCache) {
      const cacheResult = await cacheService.findSemanticMatch(embedding);

      if (cacheResult.hit) {
        const latencyMs = Date.now() - startTime;
        const estimatedTokensSaved = Math.ceil((prompt.length + cacheResult.entry.response.length) / 4);

        await RequestLog.create({
          clientId: req.client._id,
          prompt,
          cacheHit: true,
          similarityScore: cacheResult.similarityScore,
          latencyMs,
          estimatedTokensSaved,
        });

        return res.status(200).json({
          success: true,
          source: 'SEMANTIC_VECTOR_CACHE',
          meta: {
            cacheHit: true,
            similarityScore: cacheResult.similarityScore,
            matchedPrompt: cacheResult.entry.prompt,
            latencyMs,
            estimatedTokensSaved,
          },
          response: cacheResult.entry.response,
        });
      }
    }

    // Step 3: Cache Miss — Call upstream AI provider
    const aiResponse = await aiService.generateCompletion(prompt);
    const latencyMs = Date.now() - startTime;

    // Store in semantic cache for future queries
    await cacheService.storeInCache({
      prompt,
      response: aiResponse,
      embedding,
    });

    await RequestLog.create({
      clientId: req.client._id,
      prompt,
      cacheHit: false,
      similarityScore: 1.0,
      latencyMs,
      estimatedTokensSaved: 0,
    });

    return res.status(200).json({
      success: true,
      source: 'UPSTREAM_LLM_PROVIDER',
      meta: {
        cacheHit: false,
        latencyMs,
      },
      response: aiResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/analytics
 * Uses a MongoDB Aggregation Pipeline to calculate real-time cost & latency telemetry.
 */
exports.getGatewayAnalytics = async (req, res, next) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          cacheHits: { $sum: { $cond: ['$cacheHit', 1, 0] } },
          cacheMisses: { $sum: { $cond: ['$cacheHit', 0, 1] } },
          avgCacheHitLatencyMs: {
            $avg: {$cond: ['$cacheHit', '$latencyMs', null] },
          },
          avgUpstreamLatencyMs: {
            $avg: { $cond: [{$eq: ['$cacheHit', false] }, '$latencyMs', null] },
          },
          totalTokensSaved: { $sum: '$estimatedTokensSaved' },
        },
      },
      {
        $project: {
          _id: 0,
          totalRequests: 1,
          cacheHits: 1,
          cacheMisses: 1,
          cacheHitRatioPercent: {
            $cond: [
              { $eq: ['$totalRequests', 0] }, 0, {$round: [{ $multiply: [{$divide: ['$cacheHits', '$totalRequests'] }, 100] }, 2] },
            ],
          },
          avgCacheHitLatencyMs: { $round: [{ $ifNull: ['$avgCacheHitLatencyMs', 0] }, 2] },
          avgUpstreamLatencyMs: { $round: [{ $ifNull: ['$avgUpstreamLatencyMs', 0] }, 2] },
          totalTokensSaved: 1,
          estimatedCostSavedUSD: {
            $round: [{ $multiply: ['$totalTokensSaved', 0.000002] }, 6],
          },
        },
      },
    ];

    const [stats] = await RequestLog.aggregate(pipeline);
    const totalCachedVectors = await SemanticCache.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        ...(stats || {
          totalRequests: 0,
          cacheHits: 0,
          cacheMisses: 0,
          cacheHitRatioPercent: 0,
          avgCacheHitLatencyMs: 0,
          avgUpstreamLatencyMs: 0,
          totalTokensSaved: 0,
          estimatedCostSavedUSD: 0,
        }),
        activeVectorsInCache: totalCachedVectors,
      },
    });
  } catch (error) {
    next(error);
  }
};
