import { FallbackChain } from "./utils/fallbackChain";

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

  try {
    console.log(`[API] Starting news fetch for category: ${category}, pageSize: ${pageSize}`);
    
    const normalizedCategory = typeof category === 'string' ? category.toLowerCase() : 'general';
    const chain = new FallbackChain({
      category: normalizedCategory,
      pageSize: Number.parseInt(pageSize, 10) || 20,
      language: typeof language === 'string' ? language : 'en',
    });

    const articles = await chain.execute();

    console.log(`[API] Successfully fetched ${articles.length} articles for ${normalizedCategory}`);

    res.status(200).json({
      status: 'ok',
      totalResults: articles.length,
      articles,
    });
  } catch (error) {
    console.error('[API] News aggregation error:', error);
    console.error('[API] Error stack:', error.stack);
    console.error('[API] Error details:', error.details);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch news',
      error: error.message,
      details: error.details || [],
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
