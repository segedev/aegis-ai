const mongoose = require('mongoose');

const semanticCacheSchema = new mongoose.Schema({
  prompt: { type: String, required: true, trim: true },
  response: { type: String, required: true },
  embedding: { type: [Number], required: true },
  modelUsed: { type: String, default: 'gemini-1.5-flash' },
  hitCount: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB TTL Index: Automatically purges cached entries after 7 days
    expires: 60 * 60 * 24 * 7,
  },
});

module.exports = mongoose.model('SemanticCache', semanticCacheSchema);
