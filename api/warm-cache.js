export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Verify this is from Vercel Cron
  const cronSecret = req.headers['x-vercel-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    console.warn('[warm-cache] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[warm-cache] Starting cache warming...');
  
  try {
    const categories = [
      'all', 'technology', 'sports', 'business', 
      'health', 'entertainment', 'world', 'bangladesh'
    ];
    
    const results = {
      timestamp: new Date().toISOString(),
      categories: {},
      totalWarmed: 0,
      errors: []
    };

    const baseUrl = req.headers.origin || 
                    `https://${req.headers.host}` || 
                    'https://newsflow-ai-dusky.vercel.app';

    // Warm news cache for each category
    for (const category of categories) {
      try {
        const response = await fetch(
          `${baseUrl}/api/news?category=${category}&pageSize=20`,
          { 
            headers: { 'x-internal-request': 'true' },
            signal: AbortSignal.timeout(8000) // 8s timeout
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          results.categories[category] = {
            articles: data.articles?.length || 0,
            status: 'warmed'
          };
          results.totalWarmed += data.articles?.length || 0;
          console.log(`[warm-cache] ✓ ${category}: ${data.articles?.length || 0} articles`);
        } else {
          results.categories[category] = { status: 'failed', code: response.status };
          results.errors.push(`${category} returned ${response.status}`);
        }
      } catch (err) {
        results.categories[category] = { status: 'error', message: err.message };
        results.errors.push(`${category}: ${err.message}`);
        console.error(`[warm-cache] ✗ ${category}:`, err.message);
      }
    }

    console.log(`[warm-cache] Complete! Warmed ${results.totalWarmed} articles`);
    
    res.status(200).json({
      success: true,
      ...results
    });
    
  } catch (error) {
    console.error('[warm-cache] Fatal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
