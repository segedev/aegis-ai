const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApiClient',
    required: true,
    index: true,
  },
  prompt: { type: String, required: true },
  cacheHit: { type: Boolean, required: true, index: true },
  similarityScore: { type: Number, default: 0 },
  latencyMs: { type: Number, required: true },
  estimatedTokensSaved: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB TTL Index: Automatically purges telemetry logs after 30 days
    expires: 60 * 60 * 24 * 30,
  },
});

module.exports = mongoose.model('RequestLog', requestLogSchema);
