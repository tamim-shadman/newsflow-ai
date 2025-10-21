// Serverless function for LLM API calls with multi-provider fallback
// This runs on Vercel's backend, keeping your API keys secure
// Strategy: Groq (primary) → Gemini (fallback) → OpenRouter (last resort)

// Simple in-memory cache (resets on cold start, but works for multiple requests in same instance)
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Rate limiting (per instance)
const requestCounts = {
  groq: { count: 0, resetTime: Date.now() + 60 * 60 * 1000 },
  gemini: { count: 0, resetTime: Date.now() + 60 * 60 * 1000 },
};

// Rate limits per hour (conservative estimates)
const RATE_LIMITS = {
  groq: 30,   // Free tier: ~30 requests/minute, we'll limit to 30/hour to be safe
  gemini: 50, // Free tier: 50 requests/day, limit to 50/hour
};

function checkRateLimit(provider) {
  const now = Date.now();
  if (now > requestCounts[provider].resetTime) {
    requestCounts[provider].count = 0;
    requestCounts[provider].resetTime = now + 60 * 60 * 1000;
  }
  
  if (requestCounts[provider].count >= RATE_LIMITS[provider]) {
    return false;
  }
  
  requestCounts[provider].count++;
  return true;
}

function getCacheKey(messages) {
  // Create a hash of the last user message for caching
  const lastMessage = messages[messages.length - 1]?.content || '';
  return lastMessage.substring(0, 200); // Use first 200 chars as key
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, temperature = 0.7, max_tokens = 1000, model = 'llama-3.3-70b-versatile' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  // Check cache first
  const cacheKey = getCacheKey(messages);
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log('✅ Returning cached response');
    return res.status(200).json({ ...cached.data, cached: true });
  }

  // Strategy 1: Try Groq first (fastest and most reliable)
  if (process.env.GROQ_API_KEY && checkRateLimit('groq')) {
    try {
      console.log('🚀 Trying Groq API...');
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens
        })
      });

      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const response = { ...data, provider: 'groq' };
        
        // Cache the response
        cache.set(cacheKey, { data: response, timestamp: Date.now() });
        
        console.log('✅ Groq API success');
        return res.status(200).json(response);
      } else {
        console.log(`⚠️ Groq failed with status: ${groqResponse.status}`);
      }
    } catch (error) {
      console.log('⚠️ Groq error:', error.message);
    }
  } else {
    console.log('⚠️ Groq rate limit reached or not configured');
  }

  // Strategy 2: Fallback to Gemini
  if (process.env.GEMINI_API_KEY && checkRateLimit('gemini')) {
    try {
      console.log('🚀 Trying Gemini API...');
      
      // Convert OpenAI format to Gemini format
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature,
              maxOutputTokens: max_tokens,
            }
          })
        }
      );

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        const response = {
          choices: [{
            message: {
              content: data.candidates[0].content.parts[0].text,
              role: 'assistant'
            },
            index: 0,
            finish_reason: 'stop'
          }],
          provider: 'gemini',
          model: 'gemini-1.5-flash'
        };

        // Cache the response
        cache.set(cacheKey, { data: response, timestamp: Date.now() });
        
        console.log('✅ Gemini API success');
        return res.status(200).json(response);
      } else {
        console.log(`⚠️ Gemini failed with status: ${geminiResponse.status}`);
      }
    } catch (error) {
      console.log('⚠️ Gemini error:', error.message);
    }
  } else {
    console.log('⚠️ Gemini rate limit reached or not configured');
  }

  // Strategy 3: Last resort - use OpenRouter (aggregates many providers)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log('🚀 Trying OpenRouter API (last resort)...');
      const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
          messages,
          temperature,
          max_tokens
        })
      });

      if (openrouterResponse.ok) {
        const data = await openrouterResponse.json();
        const response = { ...data, provider: 'openrouter' };
        
        // Cache the response
        cache.set(cacheKey, { data: response, timestamp: Date.now() });
        
        console.log('✅ OpenRouter API success');
        return res.status(200).json(response);
      }
    } catch (error) {
      console.log('⚠️ OpenRouter error:', error.message);
    }
  }

  // All providers failed
  console.error('❌ All LLM providers failed');
  res.status(503).json({ 
    error: 'All AI providers are currently unavailable. Please try again later.',
    details: 'Tried: Groq, Gemini, OpenRouter'
  });
}
