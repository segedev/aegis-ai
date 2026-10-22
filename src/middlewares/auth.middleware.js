const ApiClient = require('../models/ApiClient.model');

const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing x-api-key header. Create a client via POST /api/v1/clients first.',
      });
    }

    const client = await ApiClient.findOne({ apiKey });
    if (!client) {
      return res.status(403).json({
        success: false,
        error: 'Invalid x-api-key provided.',
      });
    }

    req.client = client;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateApiKey;
