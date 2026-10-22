# aegis-ai
A reverse-proxy and middleware engine built in Node.js that sits in front of AI and REST endpoints. It uses MongoDB Atlas Vector Search as a semantic cache (if a user asks an AI endpoint a question similar to one asked 10 minutes ago, it serves the cached response from MongoDB in 15ms instead of paying for a new OpenAI/Gemini API call).
