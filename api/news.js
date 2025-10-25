import { FallbackChain } from "./utils/fallbackChain.js";

// Static fallback data in case everything fails
const EMERGENCY_FALLBACK = [
  {
    source: { id: "bbc", name: "BBC News" },
    author: "BBC News",
    title: "Breaking: Live News Updates",
    description: "Stay informed with the latest breaking news and updates from around the world.",
    url: "https://www.bbc.com/news",
    urlToImage: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
    publishedAt: new Date().toISOString(),
    content: "Breaking news and live updates from around the world.",
  },
  {
    source: { id: "reuters", name: "Reuters" },
    author: "Reuters",
    title: "Global News Headlines",
    description: "Latest world news, business, sports, and entertainment headlines.",
    url: "https://www.reuters.com",
    urlToImage: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop",
    publishedAt: new Date().toISOString(),
    content: "Stay updated with global news coverage.",
  },
  {
    source: { id: "cnn", name: "CNN" },
    author: "CNN",
    title: "Latest News Updates",
    description: "Get the latest news and breaking stories from CNN.",
    url: "https://www.cnn.com",
    urlToImage: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
    publishedAt: new Date().toISOString(),
    content: "Breaking news from CNN.",
  },
];

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category = 'general', pageSize = 20, language = 'en' } = req.query;

  // Set a timeout to prevent Vercel function timeout (max 10s)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Function timeout after 8 seconds')), 8000);
  });

  try {
    console.log(`[API] Starting news fetch for category: ${category}, pageSize: ${pageSize}`);
    
    const normalizedCategory = typeof category === 'string' ? category.toLowerCase() : 'general';
    const chain = new FallbackChain({
      category: normalizedCategory,
      pageSize: Number.parseInt(pageSize, 10) || 20,
      language: typeof language === 'string' ? language : 'en',
    });

    // Race between actual fetch and timeout
    const articles = await Promise.race([
      chain.execute(),
      timeoutPromise
    ]);

    console.log(`[API] Successfully fetched ${articles.length} articles for ${normalizedCategory}`);

    res.status(200).json({
      status: 'ok',
      totalResults: articles.length,
      articles,
    });
  } catch (error) {
    console.error('[API] CRITICAL ERROR - News aggregation failed:', error);
    console.error('[API] Error name:', error.name);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);
    console.error('[API] Error details:', error.details);
    
    // Instead of returning 500, return emergency fallback data
    console.log('[API] Returning emergency fallback data');
    
    res.status(200).json({
      status: 'ok',
      totalResults: EMERGENCY_FALLBACK.length,
      articles: EMERGENCY_FALLBACK,
      _fallback: true,
      _error: error.message,
    });
  }
}
