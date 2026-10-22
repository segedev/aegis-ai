const mongoose = require('mongoose');

const apiClientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    apiKey: { type: String, required: true, unique: true, index: true },
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    bucketTokens: { type: Number, default: 10 },
    maxCapacity: { type: Number, default: 10 },
    refillRatePerMinute: { type: Number, default: 10 },
    lastRefillAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApiClient', apiClientSchema);
