const express = require('express');
const router = express.Router();
const gatewayController = require('../controllers/gateway.controller');
const authenticateApiKey = require('../middlewares/auth.middleware');
const tokenBucketRateLimiter = require('../middlewares/rateLimiter.middleware');

// Public endpoint to provision an API key
router.post('/clients', gatewayController.registerClient);

// Protected + Rate-Limited AI Semantic Gateway endpoint
router.post(
  '/ai/query',
  authenticateApiKey,
  tokenBucketRateLimiter,
  gatewayController.proxyAIQuery
);

// Telemetry & MongoDB Aggregation metrics
router.get('/analytics', gatewayController.getGatewayAnalytics);

module.exports = router;
