// Serverless function for news fetching with sequential fallback
// API Priority: Guardian (5000/day) → Currents (600/day) → GNews (100/day) → NewsData (200/day)
// Returns as soon as ONE API succeeds (much more efficient than aggregation)

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

  // Get API keys from environment variables
  const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
  const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
  const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
  const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY;

  try {
    let articles = [];

    // Sequential fallback: Try APIs one by one (most efficient approach)
    // API Ranking: Guardian (5000/day) → Currents (600/day) → GNews (100/day) → NewsData (200/day)

    // Try 1: The Guardian (BEST - 5000 requests/day, highest quota)
    if (GUARDIAN_API_KEY && articles.length === 0) {
      try {
        console.log('🔄 Trying Guardian API (5000/day)...');
        const guardianSection = category === 'general' ? 'world' : category;
        const response = await fetch(
          `https://content.guardianapis.com/search?section=${guardianSection}&show-fields=thumbnail,trailText,byline&page-size=${pageSize}&api-key=${GUARDIAN_API_KEY}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await response.json();
        const guardianArticles = data.response?.results || [];
        
        if (guardianArticles.length > 0) {
          articles = guardianArticles.map(article => normalizeArticle(article, 3));
          console.log(`✅ Guardian SUCCESS: ${articles.length} articles`);
        }
      } catch (err) {
        console.warn('⚠️ Guardian failed, trying next provider...', err.message);
      }
    }

    // Try 2: Currents API (600 requests/day)
    if (CURRENTS_API_KEY && articles.length === 0) {
      try {
        console.log('🔄 Trying Currents API (600/day)...');
        const response = await fetch(
          `https://api.currentsapi.services/v1/latest-news?apiKey=${CURRENTS_API_KEY}&category=${category}&language=${language}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await response.json();
        const currentsArticles = data.news || [];
        
        if (currentsArticles.length > 0) {
          articles = currentsArticles.slice(0, parseInt(pageSize)).map(article => normalizeArticle(article, 1));
          console.log(`✅ Currents SUCCESS: ${articles.length} articles`);
        }
      } catch (err) {
        console.warn('⚠️ Currents failed, trying next provider...', err.message);
      }
    }

    // Try 3: GNews (100 requests/day)
    if (GNEWS_API_KEY && articles.length === 0) {
      try {
        console.log('🔄 Trying GNews API (100/day)...');
        const gnewsCategory = category === 'general' ? 'world' : category;
        const response = await fetch(
          `https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=${language}&max=${pageSize}&apikey=${GNEWS_API_KEY}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await response.json();
        const gnewsArticles = data.articles || [];
        
        if (gnewsArticles.length > 0) {
          articles = gnewsArticles.map(article => normalizeArticle(article, 2));
          console.log(`✅ GNews SUCCESS: ${articles.length} articles`);
        }
      } catch (err) {
        console.warn('⚠️ GNews failed, trying next provider...', err.message);
      }
    }

    // Try 4: NewsData.io (200 requests/day - Last resort)
    if (NEWSDATA_API_KEY && articles.length === 0) {
      try {
        console.log('🔄 Trying NewsData.io API (200/day)...');
        const response = await fetch(
          `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&category=${category}&language=${language}`,
          { signal: AbortSignal.timeout(8000) }
        );
        const data = await response.json();
        const newsdataArticles = data.results || [];
        
        if (newsdataArticles.length > 0) {
          articles = newsdataArticles.slice(0, parseInt(pageSize)).map(article => normalizeArticle(article, 0));
          console.log(`✅ NewsData SUCCESS: ${articles.length} articles`);
        }
      } catch (err) {
        console.warn('⚠️ NewsData failed, all providers exhausted', err.message);
      }
    }

    // Filter out any null articles and sort by date
    const validArticles = articles.filter(a => a !== null);
    validArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    if (validArticles.length === 0) {
      console.error('❌ All 4 API providers failed');
      return res.status(503).json({
        status: 'error',
        message: 'All news providers are currently unavailable',
        totalResults: 0,
        articles: []
      });
    }

    res.status(200).json({
      status: 'ok',
      totalResults: validArticles.length,
      articles: validArticles
    });

  } catch (error) {
    console.error('News aggregation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch news',
      error: error.message
    });
  }
}

// Normalize articles from different sources to a common format
function normalizeArticle(article, sourceIndex) {
  try {
    const sources = ['NewsData.io', 'Currents API', 'GNews', 'The Guardian'];
    
    // NewsData.io format
    if (sourceIndex === 0) {
      return {
        source: { id: 'newsdata', name: article.source_id || 'NewsData' },
        author: article.creator?.[0] || 'NewsData',
        title: article.title,
        description: article.description,
        url: article.link,
        urlToImage: article.image_url,
        publishedAt: article.pubDate,
        content: article.content
      };
    }

    // Currents API format
    if (sourceIndex === 1) {
      return {
        source: { id: 'currents', name: 'Currents' },
        author: article.author || 'Currents',
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedAt: article.published,
        content: article.description
      };
    }

    // GNews format
    if (sourceIndex === 2) {
      return {
        source: { id: 'gnews', name: article.source?.name || 'GNews' },
        author: article.source?.name || 'GNews',
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedAt: article.publishedAt,
        content: article.content
      };
    }

    // The Guardian format
    if (sourceIndex === 3) {
      return {
        source: { id: 'guardian', name: 'The Guardian' },
        author: article.fields?.byline || 'The Guardian',
        title: article.webTitle,
        description: article.fields?.trailText || article.webTitle,
        url: article.webUrl,
        urlToImage: article.fields?.thumbnail,
        publishedAt: article.webPublicationDate,
        content: article.fields?.trailText
      };
    }

    return null;
  } catch (error) {
    console.error('Error normalizing article:', error);
    return null;
  }
}

// Remove duplicate articles based on title similarity
function removeDuplicates(articles) {
  const seen = new Set();
  return articles.filter(article => {
    if (!article.title) return false;
    
    // Create a normalized version of the title for comparison
    const normalizedTitle = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    
    if (seen.has(normalizedTitle)) {
      return false;
    }
    
    seen.add(normalizedTitle);
    return true;
  });
}
