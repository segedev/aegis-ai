const SemanticCache = require('../models/SemanticCache.model');
const { cosineSimilarity } = require('../utils/math.util');

class CacheService {
  /**
   * Searches MongoDB for a semantically equivalent prompt using Cosine Similarity.
   */
  async findSemanticMatch(queryEmbedding) {
    const threshold = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.88');

    // Fetch recent cache entries to evaluate vector similarity
    const candidates = await SemanticCache.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    let bestMatch = null;
    let highestScore = -1;

    for (const candidate of candidates) {
      const score = cosineSimilarity(queryEmbedding, candidate.embedding);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = candidate;
      }
    }

    if (bestMatch && highestScore >= threshold) {
      // Increment hit counter asynchronously without blocking response
      SemanticCache.findByIdAndUpdate(bestMatch._id, {
        $inc: { hitCount: 1 },
      }).exec();

      return {
        hit: true,
        entry: bestMatch,
        similarityScore: Number(highestScore.toFixed(4)),
      };
    }

    return { hit: false, similarityScore: Number(Math.max(0, highestScore).toFixed(4)) };
  }

  /**
   * Stores a newly generated AI response and its embedding vector in MongoDB.
   */
  async storeInCache({ prompt, response, embedding }) {
    return await SemanticCache.create({
      prompt,
      response,
      embedding,
    });
  }
}

module.exports = new CacheService();
