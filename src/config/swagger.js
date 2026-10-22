const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Aegis-AI: Intelligent API Gateway & Semantic Vector Cache',
    version: '1.0.0',
    description:
      'Production-ready Node.js & MongoDB API Gateway featuring distributed Token-Bucket rate limiting and Cosine Similarity semantic caching for AI endpoints.',
  },
  servers: [{ url: '/', description: 'Current Server' }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
      },
    },
  },
  paths: {
    '/api/v1/clients': {
      post: {
        summary: '1. Provision a new API Client & Key',
        tags: ['Client Management'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Ardent Universe Production' },
                  tier: { type: 'string', enum: ['free', 'pro', 'enterprise'], example: 'pro' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Client created successfully' } },
      },
    },
    '/api/v1/ai/query': {
      post: {
        summary: '2. Execute AI Query through Semantic Cache & Rate Limiter',
        tags: ['AI Gateway'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  prompt: {
                    type: 'string',
                    example: 'Explain how MongoDB aggregation pipelines improve backend performance.',
                  },
                  bypassCache: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'AI response (from Semantic Cache or Upstream LLM)' },
          429: { description: 'Token bucket depleted (Rate Limit Exceeded)' },
        },
      },
    },
    '/api/v1/analytics': {
      get: {
        summary: '3. Real-time Cache Hit Ratio, Latency & Cost Savings (MongoDB Aggregation)',
        tags: ['Telemetry & Analytics'],
        responses: { 200: { description: 'Aggregated telemetry metrics' } },
      },
    },
  },
};

module.exports = swaggerDocument;
