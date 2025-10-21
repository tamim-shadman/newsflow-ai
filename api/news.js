// Serverless function for news aggregation from multiple sources
// Combines NewsData.io, Currents API, GNews, and The Guardian

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
    const articles = [];

    // Fetch from multiple sources in parallel
    const promises = [];

    // 1. NewsData.io (Free: 200 requests/day)
    if (NEWSDATA_API_KEY) {
      promises.push(
        fetch(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&category=${category}&language=${language}`)
          .then(res => res.json())
          .then(data => data.results || [])
          .catch(err => {
            console.error('NewsData.io error:', err);
            return [];
          })
      );
    }

    // 2. Currents API (Free: 600 requests/day)
    if (CURRENTS_API_KEY) {
      promises.push(
        fetch(`https://api.currentsapi.services/v1/latest-news?apiKey=${CURRENTS_API_KEY}&category=${category}&language=${language}`)
          .then(res => res.json())
          .then(data => data.news || [])
          .catch(err => {
            console.error('Currents API error:', err);
            return [];
          })
      );
    }

    // 3. GNews (Free: 100 requests/day)
    if (GNEWS_API_KEY) {
      const gnewsCategory = category === 'general' ? 'world' : category;
      promises.push(
        fetch(`https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=${language}&apikey=${GNEWS_API_KEY}`)
          .then(res => res.json())
          .then(data => data.articles || [])
          .catch(err => {
            console.error('GNews error:', err);
            return [];
          })
      );
    }

    // 4. The Guardian (Free: 5000 requests/day - Best!)
    if (GUARDIAN_API_KEY) {
      const guardianSection = category === 'general' ? 'world' : category;
      promises.push(
        fetch(`https://content.guardianapis.com/search?section=${guardianSection}&show-fields=thumbnail,trailText,byline&page-size=10&api-key=${GUARDIAN_API_KEY}`)
          .then(res => res.json())
          .then(data => data.response?.results || [])
          .catch(err => {
            console.error('Guardian error:', err);
            return [];
          })
      );
    }

    // Wait for all API calls
    const results = await Promise.all(promises);

    // Normalize and combine articles
    results.forEach((sourceArticles, index) => {
      sourceArticles.forEach(article => {
        const normalized = normalizeArticle(article, index);
        if (normalized) {
          articles.push(normalized);
        }
      });
    });

    // Remove duplicates based on title similarity
    const uniqueArticles = removeDuplicates(articles);

    // Sort by published date (newest first)
    uniqueArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Limit to requested page size
    const limitedArticles = uniqueArticles.slice(0, parseInt(pageSize));

    res.status(200).json({
      status: 'ok',
      totalResults: limitedArticles.length,
      articles: limitedArticles
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
