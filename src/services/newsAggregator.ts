import axios from "axios";
import type { NewsAPIArticle, CategoryType } from "@/types/news";

// Use serverless function for news aggregation in production
// For local dev without Vercel CLI, we'll call APIs directly
const IS_PRODUCTION = import.meta.env.PROD;
const NEWS_API_URL = IS_PRODUCTION ? "/api/news" : null;

// API keys for local development (from .env)
const NEWSDATA_API_KEY = import.meta.env.NEWSDATA_API_KEY;
const CURRENTS_API_KEY = import.meta.env.CURRENTS_API_KEY;
const GNEWS_API_KEY = import.meta.env.GNEWS_API_KEY;
const GUARDIAN_API_KEY = import.meta.env.GUARDIAN_API_KEY;

// New specialized API keys
const ALPHA_VANTAGE_API_KEY = import.meta.env.ALPHA_VANTAGE_API_KEY;
const MARKETAUX_API_KEY = import.meta.env.MARKETAUX_API_KEY;
const FMP_API_KEY = import.meta.env.FMP_API_KEY;
const SPORTSDB_API_KEY = import.meta.env.SPORTSDB_API_KEY;
const API_FOOTBALL_KEY = import.meta.env.API_FOOTBALL_KEY;
const TMDB_API_KEY = import.meta.env.TMDB_API_KEY;
const OMDB_API_KEY = import.meta.env.OMDB_API_KEY;
const RSS2JSON_API_KEY = import.meta.env.RSS2JSON_API_KEY;

// In-memory cache with TTL (2 hours)
interface CacheEntry {
  data: NewsAPIArticle[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours (7200000 ms)
const MAX_ARTICLE_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Persistent fallback data (never expires)
const persistentFallback = new Map<string, NewsAPIArticle[]>();

/**
 * Filter articles to only include those from last 24 hours
 */
function filterRecent24Hours(articles: NewsAPIArticle[]): NewsAPIArticle[] {
  const now = Date.now();
  return articles.filter(article => {
    if (!article.publishedAt) return false;
    
    const publishedTime = new Date(article.publishedAt).getTime();
    const age = now - publishedTime;
    
    return age <= MAX_ARTICLE_AGE;
  });
}

// Initialize cache with fallback data immediately on load
// This ensures the app always has data to show
function initializeCache() {
  // We'll initialize this later after getFallbackNews is defined
  console.log('🚀 Cache initialization deferred until first use');
}

// Helper to get from cache
function getFromCache(key: string): NewsAPIArticle[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    console.log(`⏰ Cache expired for: ${key} (age: ${Math.floor((Date.now() - entry.timestamp) / 1000 / 60)} minutes)`);
    cache.delete(key);
    return null;
  }
  
  const minutesOld = Math.floor((Date.now() - entry.timestamp) / 1000 / 60);
  console.log(`✅ Cache hit for: ${key} (age: ${minutesOld} minutes, fresh for ${120 - minutesOld} more minutes)`);
  return entry.data;
}

// Helper to set cache
function setCache(key: string, data: NewsAPIArticle[]) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  // Also store as persistent fallback (never expires)
  persistentFallback.set(key, data);
  
  console.log(`💾 Cached data for: ${key} (valid for 2 hours)`);
}

// Get persistent fallback (for when all APIs fail)
function getPersistentFallback(key: string): NewsAPIArticle[] | null {
  const fallback = persistentFallback.get(key);
  if (fallback) {
    console.log(`🔄 Using persistent fallback for: ${key}`);
    return fallback;
  }
  return null;
}

/**
 * Fetch news from multiple aggregated sources
 * @param category - The news category to fetch
 * @param pageSize - Number of articles to fetch (default: 20)
 * @returns Promise with news articles
 */
export async function fetchNewsByCategory(
  category: CategoryType = "all",
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  const cacheKey = `news_${category}_${pageSize}`;
  
  try {
    // Check cache first (2-hour TTL)
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`🔄 Fetching fresh news for category: ${category} (cache expired or empty)`);

    let articles: NewsAPIArticle[] = [];
    const errors: string[] = [];

    // In production, use serverless function
    if (NEWS_API_URL) {
      try {
        const response = await axios.get(NEWS_API_URL, {
          params: {
            category: category === "all" ? "general" : category,
            pageSize,
            language: "en",
          },
          timeout: 10000, // 10 second timeout (reduced from 15)
        });

        console.log("✅ Serverless API Response:", {
          status: response.data.status,
          totalResults: response.data.totalResults,
        });

        if (response.data.status === "ok" && response.data.articles) {
          // Filter articles: valid title AND from last 24 hours
          articles = response.data.articles.filter(
            (article: NewsAPIArticle) =>
              article.title && article.title !== "[Removed]"
          );
          
          // Apply 24-hour filter
          const recentArticles = filterRecent24Hours(articles);
          console.log(`📅 Filtered ${articles.length} → ${recentArticles.length} articles (last 24 hours)`);
          articles = recentArticles;
        }
      } catch (serverlessError: unknown) {
        const errorMsg = serverlessError instanceof Error ? serverlessError.message : 'Unknown error';
        errors.push(`Serverless API failed: ${errorMsg}`);
        console.warn("⚠️ Serverless API error (but has 4-layer fallback):", errorMsg);
        // Serverless function has its own sequential fallback, so empty articles means all 4 APIs failed
        articles = []; // Will be handled by the stale cache fallback below
      }
    }
    
    // If serverless failed or not in production, try direct fetch (with timeout)
    if (articles.length === 0) {
      try {
        const fetchPromise = fetchNewsDirectly(category, pageSize);
        const timeoutPromise = new Promise<NewsAPIArticle[]>((_, reject) => 
          setTimeout(() => reject(new Error('Direct fetch timeout')), 8000)
        );
        
        const fetchedArticles = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Apply 24-hour filter
        articles = filterRecent24Hours(fetchedArticles);
        console.log(`📅 Filtered ${fetchedArticles.length} → ${articles.length} articles (last 24 hours)`);
      } catch (directError: unknown) {
        const errorMsg = directError instanceof Error ? directError.message : 'Unknown error';
        errors.push(`Direct fetch failed: ${errorMsg}`);
        console.warn("⚠️ Direct fetch error (all 4 APIs failed):", errorMsg);
        // All APIs exhausted, will use stale cache below
        articles = [];
      }
    }

    // Cache the results if successful
    if (articles.length > 0) {
      setCache(cacheKey, articles);
      console.log(`✅ Successfully fetched ${articles.length} articles for ${category}`);
      return articles;
    }

    // No articles from any source - use fallbacks
    throw new Error("All primary sources failed");
    
  } catch (error) {
    console.error("❌ Error fetching news:", error);
    
    // Fallback chain:
    // 1. Stale cache (even if expired)
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      const ageMinutes = Math.floor((Date.now() - staleCache.timestamp) / 1000 / 60);
      console.log(`⚠️ Using stale cache for: ${cacheKey} (${ageMinutes} minutes old)`);
      return staleCache.data;
    }

    // 2. Persistent fallback (from previous successful fetches)
    const persistent = getPersistentFallback(cacheKey);
    if (persistent) {
      return persistent;
    }

    // 3. Static fallback data
    console.log(`🆘 Using static fallback for: ${category}`);
    const fallback = getFallbackNews(category, pageSize);
    
    // Cache the fallback too (so it's available next time)
    setCache(cacheKey, fallback);
    
    return fallback;
  }
}

/**
 * Fetch trending news from aggregated sources
 * @param pageSize - Number of articles to fetch
 * @returns Promise with trending articles
 */
export async function fetchTrendingNews(
  pageSize: number = 10
): Promise<NewsAPIArticle[]> {
  const cacheKey = `trending_${pageSize}`;
  
  try {
    // Check cache first (2-hour TTL)
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log('🔄 Fetching trending news...');

    let articles: NewsAPIArticle[] = [];

    if (NEWS_API_URL) {
      try {
        const response = await axios.get(NEWS_API_URL, {
          params: {
            category: "general",
            pageSize,
            language: "en",
          },
          timeout: 10000,
        });

        if (response.data.status === "ok") {
          articles = response.data.articles.filter(
            (article: NewsAPIArticle) =>
              article.title && article.title !== "[Removed]"
          );
        }
      } catch (apiError) {
        console.warn("⚠️ Trending API failed, trying direct fetch...");
      }
    }
    
    // If serverless failed, try direct fetch
    if (articles.length === 0) {
      articles = await fetchNewsDirectly("all", pageSize);
    }

    // Cache if successful
    if (articles.length > 0) {
      setCache(cacheKey, articles);
      console.log(`✅ Successfully fetched ${articles.length} trending articles`);
      return articles;
    }

    throw new Error("Failed to fetch trending news from all sources");
  } catch (error) {
    console.error("❌ Error fetching trending news:", error);
    
    // Fallback chain:
    // 1. Stale cache
    const staleCache = cache.get(cacheKey);
    if (staleCache) {
      console.log('⚠️ Using stale cache for trending news');
      return staleCache.data;
    }

    // 2. Persistent fallback
    const persistent = getPersistentFallback(cacheKey);
    if (persistent) {
      console.log('⚠️ Using persistent fallback for trending news');
      return persistent;
    }

    // 3. Static fallback
    console.log('🆘 Using static fallback for trending news');
    const fallback = getFallbackNews("all", pageSize);
    setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Fetch one hot topic from each category for carousel
 * @returns Promise with featured articles from each category
 */
export async function fetchFeaturedFromAllCategories(): Promise<NewsAPIArticle[]> {
  try {
    // Check cache first
    const cacheKey = 'featured_all_categories';
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('✅ Using cached featured articles');
      return cached;
    }

    console.log('🔄 Fetching featured articles from all categories...');

    const categories: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world"];
    const featuredArticles: NewsAPIArticle[] = [];

    // Fetch 2 articles from each category in parallel
    // Each fetchNewsByCategory already has sequential API fallback (Guardian→Currents→GNews→NewsData)
    // Plus stale cache fallback, so this should almost always return real articles
    const promises = categories.map(cat => 
      fetchNewsByCategory(cat, 2).catch(err => {
        console.warn(`⚠️ Failed to fetch featured for ${cat} (this should be rare):`, err.message);
        // Return empty array, will be filtered out
        return [];
      })
    );
    
    const results = await Promise.all(promises);

    // Take the first (most recent/relevant) article from each category
    // Each category should return different articles with their own unique URLs
    results.forEach((articles, index) => {
      if (articles && articles.length > 0) {
        const article = articles[0];
        // Ensure the article has required fields
        if (article.title && article.url) {
          console.log(`🔗 Carousel item ${index}: ${article.title.substring(0, 40)}... → ${article.url}`);
          featuredArticles.push(article);
        }
      }
    });

    console.log(`✅ Fetched ${featuredArticles.length} featured articles from different categories`);
    console.log('📋 Carousel URLs:', featuredArticles.map((a, i) => `[${i}] ${a.url}`));
    
    // If we have no articles, use static fallback (each category has unique articles)
    if (featuredArticles.length === 0) {
      console.log('🆘 Using complete static fallback for featured articles');
      const fallbackArticles = categories.flatMap(cat => getFallbackNews(cat, 1));
      setCache(cacheKey, fallbackArticles.slice(0, 6));
      return fallbackArticles.slice(0, 6);
    }
    
    // Cache the results
    setCache(cacheKey, featuredArticles);
    
    return featuredArticles;
  } catch (error) {
    console.error("❌ Error fetching featured from all categories:", error);
    
    // Try to get from stale cache
    const staleCache = cache.get('featured_all_categories');
    if (staleCache) {
      console.log('⚠️ Using stale cache for featured articles');
      return staleCache.data;
    }
    
    // Last resort: static fallback (each category has different articles with unique URLs)
    console.log('🆘 Using static fallback for featured articles');
    const categories: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world"];
    return categories.flatMap(cat => getFallbackNews(cat, 1)).slice(0, 6);
  }
}

/**
 * Fetch breaking news for ticker (more articles)
 * @param limit - Number of breaking news items
 * @returns Promise with breaking news titles
 */
export async function fetchBreakingNews(limit: number = 15): Promise<string[]> {
  try {
    // Check cache first
    const cacheKey = `breaking_news_${limit}`;
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached.map(a => a.title);
    }

    // Fetch recent articles from multiple categories with error handling
    const [general, tech, business] = await Promise.all([
      fetchNewsByCategory("all", 5).catch(() => []),
      fetchNewsByCategory("technology", 5).catch(() => []),
      fetchNewsByCategory("business", 5).catch(() => []),
    ]);

    const allArticles = [...general, ...tech, ...business];
    
    // Cache the articles
    if (allArticles.length > 0) {
      setCache(cacheKey, allArticles);
    }
    
    // Remove duplicates and get titles
    const uniqueTitles = Array.from(
      new Set(allArticles.map(a => a.title))
    ).slice(0, limit);

    return uniqueTitles;
  } catch (error) {
    console.error("Error fetching breaking news:", error);
    return [
      "Loading latest breaking news...",
      "Stay tuned for more updates...",
      "News from around the world coming soon...",
    ];
  }
}

/**
 * Search news articles by query
 * Note: Search might be limited on free tiers of aggregated APIs
 * @param query - Search query
 * @param pageSize - Number of results
 * @returns Promise with search results
 */
export async function searchNews(
  query: string,
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  try {
    if (!query.trim()) return [];

    if (NEWS_API_URL) {
      // For search, we'll fetch general news and filter client-side
      // since not all free APIs support search
      const response = await axios.get(NEWS_API_URL, {
        params: {
          category: "general",
          pageSize: 50, // Get more to filter
          language: "en",
        },
      });

      if (response.data.status === "ok") {
        const articles = response.data.articles.filter(
          (article: NewsAPIArticle) =>
            article.title && article.title !== "[Removed]"
        );

        // Client-side search filtering
        const searchLower = query.toLowerCase();
        return articles
          .filter(
            (article: NewsAPIArticle) =>
              article.title?.toLowerCase().includes(searchLower) ||
              article.description?.toLowerCase().includes(searchLower)
          )
          .slice(0, pageSize);
      }
    } else {
      const articles = await fetchNewsDirectly("all", 50);
      const searchLower = query.toLowerCase();
      return articles
        .filter(
          (article: NewsAPIArticle) =>
            article.title?.toLowerCase().includes(searchLower) ||
            article.description?.toLowerCase().includes(searchLower)
        )
        .slice(0, pageSize);
    }

    return [];
  } catch (error) {
    console.error("Error searching news:", error);
    return [];
  }
}

/**
 * Fetch news directly from APIs (for local development)
 * Uses OPTIMIZED category-specific routing + fallback chain
 * Each category uses the best API for that content type
 */
async function fetchNewsDirectly(
  category: CategoryType,
  pageSize: number
): Promise<NewsAPIArticle[]> {
  const cat = category === "all" ? "general" : category;
  
  // OPTIMIZED: Route categories to their best APIs first
  const apiPriority = getCategoryAPIsPriority(category);
  
  console.log(`🎯 Using optimized routing for ${category}: ${apiPriority.join(' → ')}`);
  
  // Try APIs in priority order for this category
  for (const apiName of apiPriority) {
    try {
      const articles = await tryAPI(apiName, cat, pageSize);
      if (articles.length > 0) {
        return articles;
      }
    } catch (error) {
      console.warn(`⚠️ ${apiName} failed, trying next...`);
    }
  }
  
  console.error("❌ All APIs failed for this category");
  return [];
}

/**
 * Get optimized API priority order for each category
 * Based on each API's strengths and content quality
 * Using 20+ specialized APIs with proper fallback chains
 */
function getCategoryAPIsPriority(category: CategoryType): string[] {
  const priorities: Partial<Record<CategoryType, string[]>> = {
    // TECHNOLOGY: Guardian → HackerNews → Dev.to → GitHub Trending → Currents → GNews → NewsData
    technology: ['guardian', 'hackernews', 'devto', 'github-trending', 'currents', 'gnews', 'newsdata'],
    
    // SPORTS: Guardian → ESPN → SportsDB → Currents → NewsData
    sports: ['guardian', 'espn', 'sportsdb', 'currents', 'newsdata'],
    
    // LIVE SCORES: Handled separately in liveScores.ts service
    scores: [],
    
    // BUSINESS: Guardian → Alpha Vantage → Marketaux → Currents → GNews → NewsData
    business: ['guardian', 'alphavantage', 'marketaux', 'currents', 'gnews', 'newsdata'],
    
    // HEALTH: Guardian → PubMed → CDC RSS → Currents → NewsData
    health: ['guardian', 'pubmed', 'cdc-rss', 'currents', 'newsdata'],
    
    // ENTERTAINMENT: Guardian → TMDB → TVMaze → Currents → GNews → NewsData
    entertainment: ['guardian', 'tmdb', 'tvmaze', 'currents', 'gnews', 'newsdata'],
    
    // WORLD: Guardian → BBC RSS → Reuters RSS → Currents → GNews → NewsData
    world: ['guardian', 'bbc-rss', 'reuters-rss', 'currents', 'gnews', 'newsdata'],
    
    // ALL/GENERAL: Guardian → Currents → GNews → NewsData → Saurav
    all: ['guardian', 'currents', 'gnews', 'newsdata', 'saurav'],
    
    // TRENDING: Mix of all for diverse trending topics
    trending: ['guardian', 'currents', 'gnews', 'newsdata', 'saurav'],
  };
  
  return priorities[category] || priorities.all || ['guardian', 'currents', 'gnews', 'newsdata'];
}

/**
 * Try a specific API and return articles
 * Router function to dispatch to specialized API handlers
 */
async function tryAPI(apiName: string, cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  switch (apiName) {
    // Existing aggregator APIs
    case 'guardian':
      return await tryGuardianAPI(cat, pageSize);
    case 'currents':
      return await tryCurrentsAPI(cat, pageSize);
    case 'gnews':
      return await tryGNewsAPI(cat, pageSize);
    case 'newsdata':
      return await tryNewsDataAPI(cat, pageSize);
    case 'saurav':
      return await trySauravAPI(cat, pageSize);
    
    // Technology APIs
    case 'hackernews':
      return await tryHackerNewsAPI(pageSize);
    case 'devto':
      return await tryDevToAPI(pageSize);
    case 'github-trending':
      return await tryGitHubTrendingAPI(pageSize);
    
    // Sports APIs
    case 'espn':
      return await tryESPNAPI(cat, pageSize);
    case 'sportsdb':
      return await trySportsDBAPI(pageSize);
    
    // Business APIs
    case 'alphavantage':
      return await tryAlphaVantageAPI(pageSize);
    case 'marketaux':
      return await tryMarketauxAPI(pageSize);
    
    // Health APIs
    case 'pubmed':
      return await tryPubMedAPI(pageSize);
    case 'cdc-rss':
      return await tryCDCRSSAPI(pageSize);
    
    // Entertainment APIs
    case 'tmdb':
      return await tryTMDBAPI(pageSize);
    case 'tvmaze':
      return await tryTVMazeAPI(pageSize);
    
    // World News RSS APIs
    case 'bbc-rss':
      return await tryBBCRSSAPI(pageSize);
    case 'reuters-rss':
      return await tryReutersRSSAPI(pageSize);
    
    default:
      console.warn(`⚠️ Unknown API: ${apiName}`);
      return [];
  }
}

/**
 * Try Guardian API
 */
async function tryGuardianAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!GUARDIAN_API_KEY) return [];
  
  console.log('🔄 Trying Guardian API (5000/day quota)...');
  const guardianSection = cat === "general" ? "world" : cat;
  const response = await axios.get(
    `https://content.guardianapis.com/search?section=${guardianSection}&show-fields=thumbnail,trailText,byline&page-size=${pageSize}&api-key=${GUARDIAN_API_KEY}`,
    { timeout: 8000 }
  );

  const guardianArticles = response.data.response?.results || [];
  if (guardianArticles.length > 0) {
    const articles = guardianArticles.map((article: { 
      fields?: { byline?: string; trailText?: string; thumbnail?: string }; 
      webTitle: string; 
      webUrl: string; 
      webPublicationDate: string 
    }) => ({
      source: { id: "guardian", name: "The Guardian" },
      author: article.fields?.byline || "The Guardian",
      title: article.webTitle,
      description: article.fields?.trailText || article.webTitle,
      url: article.webUrl,
      urlToImage: article.fields?.thumbnail || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.webPublicationDate,
      content: article.fields?.trailText,
    }));
    
    console.log(`✅ Guardian API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try Currents API
 */
async function tryCurrentsAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!CURRENTS_API_KEY) return [];
  
  console.log('🔄 Trying Currents API (600/day quota)...');
  const response = await axios.get(
    `https://api.currentsapi.services/v1/latest-news?apiKey=${CURRENTS_API_KEY}&category=${cat}&language=en`,
    { timeout: 8000 }
  );

  const currentsArticles = response.data.news || [];
  if (currentsArticles.length > 0) {
    const articles = currentsArticles.slice(0, pageSize).map((article: {
      author?: string;
      title: string;
      description: string;
      url: string;
      image?: string;
      published: string;
    }) => ({
      source: { id: "currents", name: "Currents API" },
      author: article.author || "Currents",
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.image || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.published,
      content: article.description,
    }));
    
    console.log(`✅ Currents API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try GNews API
 */
async function tryGNewsAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!GNEWS_API_KEY) return [];
  
  console.log('🔄 Trying GNews API (100/day quota)...');
  const gnewsCategory = cat === "general" ? "world" : cat;
  const response = await axios.get(
    `https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=en&max=${pageSize}&apikey=${GNEWS_API_KEY}`,
    { timeout: 8000 }
  );

  const gnewsArticles = response.data.articles || [];
  if (gnewsArticles.length > 0) {
    const articles = gnewsArticles.map((article: { 
      source?: { name?: string }; 
      title: string; 
      description: string; 
      url: string; 
      image: string; 
      publishedAt: string; 
      content: string 
    }) => ({
      source: { id: "gnews", name: article.source?.name || "GNews" },
      author: article.source?.name || "GNews",
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.image || "https://images.unsplash.com/photo-504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.publishedAt,
      content: article.content,
    }));
    
    console.log(`✅ GNews API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try NewsData.io API
 */
async function tryNewsDataAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  if (!NEWSDATA_API_KEY) return [];
  
  console.log('🔄 Trying NewsData.io API (200/day quota)...');
  const response = await axios.get(
    `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&category=${cat}&language=en`,
    { timeout: 8000 }
  );

  const newsdataArticles = response.data.results || [];
  if (newsdataArticles.length > 0) {
    const articles = newsdataArticles.slice(0, pageSize).map((article: {
      creator?: string[];
      title: string;
      description?: string;
      link: string;
      image_url?: string;
      pubDate: string;
      content?: string;
      source_id?: string;
    }) => ({
      source: { id: "newsdata", name: article.source_id || "NewsData" },
      author: article.creator?.[0] || "NewsData",
      title: article.title,
      description: article.description || article.title,
      url: article.link,
      urlToImage: article.image_url || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.pubDate,
      content: article.content || article.description,
    }));
    
    console.log(`✅ NewsData.io API SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

/**
 * Try Saurav Tech NewsAPI
 */
async function trySauravAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  console.log('🔄 Trying Saurav Tech NewsAPI (Free, no quota)...');
  const sauravCategory = cat === 'general' ? 'general' : cat;
  const response = await axios.get(
    `https://saurav.tech/NewsAPI/top-headlines/category/${sauravCategory}/in.json`,
    { timeout: 8000 }
  );

  const sauravArticles = response.data.articles || [];
  if (sauravArticles.length > 0) {
    const articles = sauravArticles.slice(0, pageSize).map((article: {
      source?: { id?: string; name?: string };
      author?: string;
      title: string;
      description?: string;
      url: string;
      urlToImage?: string;
      publishedAt: string;
      content?: string;
    }) => ({
      source: { id: article.source?.id || "saurav-tech", name: article.source?.name || "News API" },
      author: article.author || "NewsAPI",
      title: article.title,
      description: article.description || article.title,
      url: article.url,
      urlToImage: article.urlToImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
      publishedAt: article.publishedAt,
      content: article.content || article.description,
    }));
    
    console.log(`✅ Saurav Tech NewsAPI SUCCESS: ${articles.length} articles`);
    return articles;
  }
  return [];
}

// ============================================================================
// TECHNOLOGY APIs
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
// External API responses use any for flexibility with varying response structures

/**
 * Try Hacker News API (Unlimited, no key needed)
 * Best for: Tech news, startups, programming
 */
async function tryHackerNewsAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying Hacker News API (Unlimited, no quota)...');
    
    // Get top stories IDs
    const topStoriesResponse = await axios.get(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
      { timeout: 8000 }
    );
    
    const storyIds = topStoriesResponse.data.slice(0, pageSize * 2); // Get extra in case some fail
    const articles: NewsAPIArticle[] = [];
    
    // Fetch individual stories in parallel (but limit to pageSize)
    const storyPromises = storyIds.slice(0, pageSize).map(async (id: number) => {
      try {
        const response = await axios.get(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
          { timeout: 5000 }
        );
        return response.data;
      } catch {
        return null;
      }
    });
    
    const stories = await Promise.all(storyPromises);
    
    for (const story of stories) {
      if (story && story.title && story.url) {
        articles.push({
          source: { id: "hacker-news", name: "Hacker News" },
          author: story.by || "HN User",
          title: story.title,
          description: story.text || story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          urlToImage: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&h=600&fit=crop",
          publishedAt: new Date(story.time * 1000).toISOString(),
          content: story.text || story.title,
        });
      }
    }
    
    console.log(`✅ Hacker News API SUCCESS: ${articles.length} articles`);
    return articles.slice(0, pageSize);
  } catch (error) {
    console.error('❌ Hacker News API failed:', error);
    return [];
  }
}

/**
 * Try Dev.to API (Unlimited, no key needed)
 * Best for: Developer tutorials, tech articles
 */
async function tryDevToAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying Dev.to API (Unlimited, no quota)...');
    
    const response = await axios.get(
      `https://dev.to/api/articles?per_page=${pageSize}&top=7`,
      { timeout: 8000 }
    );
    
    const articles = response.data.map((article: any) => ({
      source: { id: "dev-to", name: "DEV Community" },
      author: article.user?.name || "DEV User",
      title: article.title,
      description: article.description || article.title,
      url: article.url,
      urlToImage: article.cover_image || article.social_image || "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
      publishedAt: article.published_at || new Date().toISOString(),
      content: article.description || article.title,
    }));
    
    console.log(`✅ Dev.to API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Dev.to API failed:', error);
    return [];
  }
}

/**
 * Try GitHub Trending API (Unofficial, unlimited)
 * Best for: Trending repositories, open source news
 */
async function tryGitHubTrendingAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying GitHub Trending API (Unlimited)...');
    
    const response = await axios.get(
      'https://api.gitterHYPE.com/repositories?since=daily',
      { timeout: 8000 }
    );
    
    const articles = response.data.slice(0, pageSize).map((repo: any) => ({
      source: { id: "github-trending", name: "GitHub Trending" },
      author: repo.author || repo.username || "GitHub User",
      title: `${repo.name || repo.repository}: ${repo.description || 'Trending Repository'}`,
      description: repo.description || `Trending repository with ${repo.stars || 0} stars`,
      url: repo.url || `https://github.com/${repo.author}/${repo.name}`,
      urlToImage: repo.avatar || "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&h=600&fit=crop",
      publishedAt: new Date().toISOString(),
      content: repo.description || `${repo.name} - ${repo.stars || 0} stars today`,
    }));
    
    console.log(`✅ GitHub Trending API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ GitHub Trending API failed:', error);
    return [];
  }
}

// ============================================================================
// SPORTS APIs
// ============================================================================

/**
 * Try ESPN API (Unofficial, unlimited)
 * Best for: Sports news, scores, updates
 */
async function tryESPNAPI(cat: string, pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying ESPN API (Unlimited)...');
    
    // ESPN API provides various sports news
    const response = await axios.get(
      'http://site.api.espn.com/apis/site/v2/sports/news',
      { timeout: 8000 }
    );
    
    const articles = response.data.articles?.slice(0, pageSize).map((article: any) => ({
      source: { id: "espn", name: "ESPN" },
      author: article.byline || "ESPN Staff",
      title: article.headline,
      description: article.description || article.headline,
      url: article.links?.web?.href || "https://espn.com",
      urlToImage: article.images?.[0]?.url || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
      publishedAt: article.published || new Date().toISOString(),
      content: article.story || article.description,
    })) || [];
    
    console.log(`✅ ESPN API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ ESPN API failed:', error);
    return [];
  }
}

/**
 * Try TheSportsDB API (30/min free)
 * Best for: Sports events, team info
 */
async function trySportsDBAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!SPORTSDB_API_KEY) return [];
    
    console.log('🔄 Trying TheSportsDB API (30/min)...');
    
    // Get latest events (can be converted to news format)
    const response = await axios.get(
      `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_API_KEY}/eventslast.php?id=4328`,
      { timeout: 8000 }
    );
    
    const events = response.data.results?.slice(0, pageSize) || [];
    const articles = events.map((event: any) => ({
      source: { id: "sportsdb", name: "TheSportsDB" },
      author: "TheSportsDB",
      title: `${event.strEvent}: ${event.strHomeTeam} vs ${event.strAwayTeam}`,
      description: event.strEventDescription || `${event.strSport} match`,
      url: event.strVideo || "https://www.thesportsdb.com/",
      urlToImage: event.strThumb || event.strSquare || "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop",
      publishedAt: event.dateEvent ? new Date(event.dateEvent).toISOString() : new Date().toISOString(),
      content: `${event.strHomeTeam} ${event.intHomeScore || 0} - ${event.intAwayScore || 0} ${event.strAwayTeam}`,
    }));
    
    console.log(`✅ TheSportsDB API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ TheSportsDB API failed:', error);
    return [];
  }
}

// ============================================================================
// BUSINESS APIs
// ============================================================================

/**
 * Try Alpha Vantage API (25/day for news)
 * Best for: Financial news, market updates
 */
async function tryAlphaVantageAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!ALPHA_VANTAGE_API_KEY) return [];
    
    console.log('🔄 Trying Alpha Vantage API (25/day)...');
    
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${ALPHA_VANTAGE_API_KEY}`,
      { timeout: 8000 }
    );
    
    const feed = response.data.feed?.slice(0, pageSize) || [];
    const articles = feed.map((item: any) => ({
      source: { id: "alpha-vantage", name: item.source || "Alpha Vantage" },
      author: item.authors?.[0] || item.source || "Alpha Vantage",
      title: item.title,
      description: item.summary || item.title,
      url: item.url,
      urlToImage: item.banner_image || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
      publishedAt: item.time_published ? new Date(item.time_published).toISOString() : new Date().toISOString(),
      content: item.summary || item.title,
    }));
    
    console.log(`✅ Alpha Vantage API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Alpha Vantage API failed:', error);
    return [];
  }
}

/**
 * Try Marketaux API (100/day free)
 * Best for: Market news, financial analysis
 */
async function tryMarketauxAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!MARKETAUX_API_KEY) return [];
    
    console.log('🔄 Trying Marketaux API (100/day)...');
    
    const response = await axios.get(
      `https://api.marketaux.com/v1/news/all?api_token=${MARKETAUX_API_KEY}&limit=${pageSize}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.data?.map((article: any) => ({
      source: { id: "marketaux", name: article.source || "Marketaux" },
      author: article.source || "Marketaux",
      title: article.title,
      description: article.description || article.snippet || article.title,
      url: article.url,
      urlToImage: article.image_url || "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
      publishedAt: article.published_at,
      content: article.description || article.snippet,
    })) || [];
    
    console.log(`✅ Marketaux API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Marketaux API failed:', error);
    return [];
  }
}

// ============================================================================
// HEALTH APIs
// ============================================================================

/**
 * Try PubMed API (Unlimited, no key needed)
 * Best for: Medical research, health studies
 */
async function tryPubMedAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying PubMed API (Unlimited, no quota)...');
    
    // Search for recent health articles
    const searchResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=health+news&retmax=${pageSize}&retmode=json&sort=date`,
      { timeout: 8000 }
    );
    
    const ids = searchResponse.data.esearchresult?.idlist || [];
    if (ids.length === 0) return [];
    
    // Fetch article details
    const summaryResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`,
      { timeout: 8000 }
    );
    
    const articles: NewsAPIArticle[] = [];
    const result = summaryResponse.data.result;
    
    for (const id of ids) {
      const article = result[id];
      if (article && article.title) {
        articles.push({
          source: { id: "pubmed", name: "PubMed" },
          author: article.authors?.[0]?.name || "PubMed",
          title: article.title,
          description: article.source || article.title,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          urlToImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
          publishedAt: article.pubdate ? new Date(article.pubdate).toISOString() : new Date().toISOString(),
          content: article.source || article.title,
        });
      }
    }
    
    console.log(`✅ PubMed API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ PubMed API failed:', error);
    return [];
  }
}

/**
 * Try CDC RSS Feed (Unlimited via RSS2JSON)
 * Best for: Health alerts, CDC updates
 */
async function tryCDCRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying CDC RSS Feed (Unlimited)...');
    
    const rssUrl = 'https://tools.cdc.gov/api/v2/resources/media/132608.rss';
    const response = await axios.get(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=${RSS2JSON_API_KEY || ''}&count=${pageSize}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.items?.map((item: any) => ({
      source: { id: "cdc", name: "CDC" },
      author: "Centers for Disease Control",
      title: item.title,
      description: item.description || item.title,
      url: item.link,
      urlToImage: item.thumbnail || "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop",
      publishedAt: item.pubDate,
      content: item.content || item.description,
    })) || [];
    
    console.log(`✅ CDC RSS API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ CDC RSS API failed:', error);
    return [];
  }
}

// ============================================================================
// ENTERTAINMENT APIs
// ============================================================================

/**
 * Try TMDB API (1M/month - excellent limit)
 * Best for: Movies, TV shows news
 */
async function tryTMDBAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    if (!TMDB_API_KEY) return [];
    
    console.log('🔄 Trying TMDB API (1M/month)...');
    
    // Get trending movies/shows
    const response = await axios.get(
      `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.results?.slice(0, pageSize).map((item: any) => ({
      source: { id: "tmdb", name: "The Movie Database" },
      author: "TMDB",
      title: item.title || item.name || "Trending Entertainment",
      description: item.overview || item.title || item.name,
      url: `https://www.themoviedb.org/${item.media_type}/${item.id}`,
      urlToImage: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 
                  item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` :
                  "https://images.unsplash.com/photo-1574267432644-f5810a9ae4e4?w=800&h=600&fit=crop",
      publishedAt: item.release_date || item.first_air_date || new Date().toISOString(),
      content: item.overview || `${item.media_type} with ${item.vote_average} rating`,
    })) || [];
    
    console.log(`✅ TMDB API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ TMDB API failed:', error);
    return [];
  }
}

/**
 * Try TVMaze API (Unlimited, no key needed)
 * Best for: TV show schedules, updates
 */
async function tryTVMazeAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying TVMaze API (Unlimited, no quota)...');
    
    const response = await axios.get(
      'https://api.tvmaze.com/schedule',
      { timeout: 8000 }
    );
    
    const articles = response.data.slice(0, pageSize).map((episode: any) => ({
      source: { id: "tvmaze", name: "TVMaze" },
      author: "TVMaze",
      title: `${episode.show?.name}: ${episode.name}`,
      description: episode.summary?.replace(/<[^>]*>/g, '') || `New episode of ${episode.show?.name}`,
      url: episode.url || episode.show?.url || "https://www.tvmaze.com/",
      urlToImage: episode.image?.original || episode.show?.image?.original || "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
      publishedAt: episode.airstamp || new Date().toISOString(),
      content: episode.summary?.replace(/<[^>]*>/g, '') || episode.name,
    }));
    
    console.log(`✅ TVMaze API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ TVMaze API failed:', error);
    return [];
  }
}

// ============================================================================
// WORLD NEWS RSS APIs
// ============================================================================

/**
 * Try BBC RSS Feed (Unlimited via RSS2JSON)
 * Best for: International news, world events
 */
async function tryBBCRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying BBC RSS Feed (Unlimited)...');
    
    const rssUrl = 'http://feeds.bbci.co.uk/news/world/rss.xml';
    const response = await axios.get(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=${RSS2JSON_API_KEY || ''}&count=${pageSize}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.items?.map((item: any) => ({
      source: { id: "bbc", name: "BBC News" },
      author: "BBC News",
      title: item.title,
      description: item.description || item.title,
      url: item.link,
      urlToImage: item.thumbnail || "https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?w=800&h=600&fit=crop",
      publishedAt: item.pubDate,
      content: item.content || item.description,
    })) || [];
    
    console.log(`✅ BBC RSS API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ BBC RSS API failed:', error);
    return [];
  }
}

/**
 * Try Reuters RSS Feed (Unlimited via RSS2JSON)
 * Best for: Breaking news, world coverage
 */
async function tryReutersRSSAPI(pageSize: number): Promise<NewsAPIArticle[]> {
  try {
    console.log('🔄 Trying Reuters RSS Feed (Unlimited)...');
    
    const rssUrl = 'https://www.reutersagency.com/feed/';
    const response = await axios.get(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&api_key=${RSS2JSON_API_KEY || ''}&count=${pageSize}`,
      { timeout: 8000 }
    );
    
    const articles = response.data.items?.map((item: any) => ({
      source: { id: "reuters", name: "Reuters" },
      author: "Reuters",
      title: item.title,
      description: item.description || item.title,
      url: item.link,
      urlToImage: item.thumbnail || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&h=600&fit=crop",
      publishedAt: item.pubDate,
      content: item.content || item.description,
    })) || [];
    
    console.log(`✅ Reuters RSS API SUCCESS: ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ Reuters RSS API failed:', error);
    return [];
  }
}

// OLD sequential fallback code removed - replaced with optimized routing above

/**
 * Comprehensive fallback data when all APIs fail
 * Organized by category with rich, realistic content
 */
function getFallbackNews(category: CategoryType, pageSize: number = 20): NewsAPIArticle[] {
  const fallbackDatabase: Record<CategoryType, NewsAPIArticle[]> = {
    all: [
      {
        source: { id: "reuters", name: "Reuters" },
        author: "Sarah Johnson",
        title: "Global Summit Addresses Climate Change Initiatives",
        description: "World leaders convene to discuss unprecedented climate action plans and sustainable development goals for the next decade.",
        url: "https://example.com/climate",
        urlToImage: "https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        content: "World leaders gathered today to address pressing climate concerns and outline actionable strategies for reducing global carbon emissions.",
      },
      {
        source: { id: "bbc", name: "BBC News" },
        author: "James Wilson",
        title: "International Trade Agreements Reshape Global Economy",
        description: "New trade partnerships emerge as nations seek to strengthen economic ties and promote sustainable growth.",
        url: "https://example.com/trade",
        urlToImage: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        content: "Major economies announced new trade frameworks aimed at fostering international cooperation and economic stability.",
      },
      {
        source: { id: "cnn", name: "CNN" },
        author: "Maria Garcia",
        title: "Space Exploration Enters New Era with Private Missions",
        description: "Commercial spaceflight companies announce ambitious plans for lunar and Mars exploration programs.",
        url: "https://example.com/space",
        urlToImage: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        content: "The space industry witnesses unprecedented growth as private companies unveil revolutionary spacecraft and mission plans.",
      },
      {
        source: { id: "aljazeera", name: "Al Jazeera" },
        author: "Ahmed Hassan",
        title: "Renewable Energy Projects Transform Developing Nations",
        description: "Sustainable power initiatives bring electricity and economic opportunities to underserved communities.",
        url: "https://example.com/renewable",
        urlToImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        content: "Clean energy projects provide sustainable solutions for communities in developing regions, improving quality of life.",
      },
      {
        source: { id: "guardian", name: "The Guardian" },
        author: "Sophie Dubois",
        title: "Historic Peace Talks Bring Hope to Conflict Zones",
        description: "Diplomatic efforts yield promising results as warring factions agree to ceasefire negotiations.",
        url: "https://example.com/peace",
        urlToImage: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        content: "International mediators successfully brought together representatives from conflicting parties for groundbreaking peace discussions.",
      },
      {
        source: { id: "nyt", name: "New York Times" },
        author: "David Park",
        title: "Education Reform Initiatives Transform Learning Worldwide",
        description: "Innovative teaching methods and technology integration revolutionize classrooms across the globe.",
        url: "https://example.com/education",
        urlToImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
        content: "Educational institutions embrace new pedagogical approaches combining digital tools with personalized learning strategies.",
      },
    ],
    technology: [
      {
        source: { id: "techcrunch", name: "TechCrunch" },
        author: "Alex Rivera",
        title: "Revolutionary AI System Transforms Industry Standards",
        description: "Breakthrough artificial intelligence technology demonstrates unprecedented capabilities in solving complex problems.",
        url: "https://example.com/ai-breakthrough",
        urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        content: "Scientists unveiled a groundbreaking AI system that surpasses previous benchmarks in machine learning and neural network efficiency.",
      },
      {
        source: { id: "wired", name: "Wired" },
        author: "Emma Thompson",
        title: "Quantum Computing Reaches New Milestone",
        description: "Researchers achieve quantum supremacy breakthrough, opening doors to revolutionary computing applications.",
        url: "https://example.com/quantum",
        urlToImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "A team of quantum physicists successfully demonstrated a 1000-qubit quantum computer capable of solving previously impossible calculations.",
      },
      {
        source: { id: "verge", name: "The Verge" },
        author: "Sam Martinez",
        title: "Next-Gen Smartphones Feature Holographic Displays",
        description: "Major tech companies unveil revolutionary devices with 3D holographic projection capabilities.",
        url: "https://example.com/holographic",
        urlToImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "The smartphone industry takes a giant leap forward with holographic display technology becoming commercially available.",
      },
      {
        source: { id: "cnet", name: "CNET" },
        author: "Rachel Kim",
        title: "Cybersecurity Advances Combat Rising Threat Landscape",
        description: "New AI-powered security systems detect and prevent cyber attacks with unprecedented accuracy.",
        url: "https://example.com/cybersecurity",
        urlToImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Advanced machine learning algorithms now provide real-time threat detection and automated response to cyber attacks.",
      },
      {
        source: { id: "ars", name: "Ars Technica" },
        author: "Lisa Wong",
        title: "Breakthrough in Battery Technology Promises Week-Long Charge",
        description: "Scientists develop revolutionary solid-state batteries with 10x capacity of current lithium-ion technology.",
        url: "https://example.com/battery",
        urlToImage: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        content: "New battery technology could revolutionize electric vehicles and consumer electronics with unprecedented energy density.",
      },
    ],
    business: [
      {
        source: { id: "bloomberg", name: "Bloomberg" },
        author: "Michael Chen",
        title: "Stock Markets Hit Record Highs Amid Economic Recovery",
        description: "Global financial markets experience unprecedented growth as economic indicators show strong recovery signals.",
        url: "https://example.com/markets",
        urlToImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        content: "Major stock indices reached all-time highs today as investors responded positively to strong corporate earnings and economic data.",
      },
      {
        source: { id: "wsj", name: "Wall Street Journal" },
        author: "Jennifer Martinez",
        title: "Startups Raise Billions in Record Funding Round",
        description: "Venture capital investments surge as innovative companies attract unprecedented investor interest.",
        url: "https://example.com/funding",
        urlToImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        content: "Tech startups secured over $50 billion in funding this quarter, marking the highest investment period in history.",
      },
      {
        source: { id: "forbes", name: "Forbes" },
        author: "Thomas Anderson",
        title: "Cryptocurrency Market Stabilizes After Regulatory Clarity",
        description: "Digital assets gain mainstream acceptance as governments establish clear regulatory frameworks.",
        url: "https://example.com/crypto",
        urlToImage: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        content: "Major economies announce comprehensive cryptocurrency regulations, providing much-needed clarity for investors and businesses.",
      },
      {
        source: { id: "ft", name: "Financial Times" },
        author: "Sophie Turner",
        title: "Green Bonds Surge as ESG Investing Dominates Markets",
        description: "Environmental, social, and governance investments reach record levels as companies prioritize sustainability.",
        url: "https://example.com/esg",
        urlToImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        content: "Sustainable investing becomes mainstream as trillions of dollars flow into ESG-focused funds and green bonds.",
      },
    ],
    health: [
      {
        source: { id: "healthline", name: "Health Tribune" },
        author: "Dr. Emily Roberts",
        title: "Breakthrough Treatment Shows Promise for Chronic Diseases",
        description: "Medical researchers unveil innovative therapy that could revolutionize treatment for millions of patients worldwide.",
        url: "https://example.com/medical",
        urlToImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        content: "A groundbreaking medical treatment demonstrated remarkable efficacy in clinical trials, offering new hope for chronic disease patients.",
      },
      {
        source: { id: "medicalnews", name: "Medical News Today" },
        author: "Dr. Robert Kim",
        title: "Revolutionary Gene Therapy Advances Healthcare",
        description: "Scientists achieve major breakthrough in genetic medicine with successful human trials.",
        url: "https://example.com/gene-therapy",
        urlToImage: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "Gene therapy trials show unprecedented success rates, potentially curing previously untreatable genetic disorders.",
      },
      {
        source: { id: "healthnews", name: "Health News" },
        author: "Dr. Amanda Foster",
        title: "Mental Health Apps Show Remarkable Effectiveness",
        description: "Digital therapy platforms demonstrate significant positive impact on mental wellness outcomes.",
        url: "https://example.com/mental-health",
        urlToImage: "https://images.unsplash.com/photo-1576765607924-3f7b8410a787?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Studies show that AI-powered mental health applications provide accessible and effective support for millions of users worldwide.",
      },
      {
        source: { id: "wellness", name: "Wellness Today" },
        author: "Dr. Jessica Wong",
        title: "Immunotherapy Breakthroughs Transform Cancer Treatment",
        description: "Novel approaches harness immune system to fight cancer with unprecedented success rates.",
        url: "https://example.com/immunotherapy",
        urlToImage: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        content: "Revolutionary immunotherapy treatments achieve remarkable results in previously untreatable cancers, offering new hope to patients.",
      },
    ],
    sports: [
      {
        source: { id: "espn", name: "ESPN" },
        author: "David Martinez",
        title: "Championship Finals Break Viewership Records",
        description: "Historic sporting event captivates global audience with thrilling competition and outstanding performances.",
        url: "https://example.com/championship",
        urlToImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "The championship finals shattered viewing records as millions tuned in to watch the most anticipated matchup of the season.",
      },
      {
        source: { id: "sports", name: "Sports Illustrated" },
        author: "Lisa Anderson",
        title: "Athletes Set New World Records at International Games",
        description: "Outstanding performances mark historic competition as multiple world records fall.",
        url: "https://example.com/records",
        urlToImage: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        content: "Athletes from around the world achieved remarkable feats, breaking long-standing records in multiple disciplines.",
      },
      {
        source: { id: "athletic", name: "The Athletic" },
        author: "Marcus Johnson",
        title: "Olympic Preparations Reach Final Stages",
        description: "Host city completes state-of-the-art facilities as world's best athletes prepare for competition.",
        url: "https://example.com/olympics",
        urlToImage: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        content: "Anticipation builds as the Olympic Games approach, with athletes and facilities ready for the world's premier sporting event.",
      },
      {
        source: { id: "bleacher", name: "Bleacher Report" },
        author: "Tony Williams",
        title: "Underdog Team Stuns Favorites in Historic Upset",
        description: "Long-shot contenders defy odds with spectacular performance against championship favorites.",
        url: "https://example.com/upset",
        urlToImage: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        content: "In one of the greatest upsets in sports history, the underdog team delivered a stunning victory that shocked the world.",
      },
    ],
    entertainment: [
      {
        source: { id: "variety", name: "Variety" },
        author: "Rachel Green",
        title: "Blockbuster Film Breaks Box Office Records Worldwide",
        description: "Latest cinematic release achieves unprecedented success, captivating audiences across all markets.",
        url: "https://example.com/blockbuster",
        urlToImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        content: "The highly anticipated film exceeded all expectations, earning record-breaking revenues in its opening weekend globally.",
      },
      {
        source: { id: "hollywood", name: "Hollywood Reporter" },
        author: "Tom Stevens",
        title: "Streaming Platform Announces Major Content Expansion",
        description: "Leading entertainment service unveils ambitious plans for original programming and global reach.",
        url: "https://example.com/streaming",
        urlToImage: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Major streaming platform announced investment of billions in original content, targeting international markets with diverse programming.",
      },
      {
        source: { id: "entertainment", name: "Entertainment Weekly" },
        author: "Nina Patel",
        title: "Music Festival Sets Attendance Records with Global Lineup",
        description: "Legendary artists and emerging stars unite for unprecedented musical celebration.",
        url: "https://example.com/music-festival",
        urlToImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
        content: "The festival drew record crowds as music fans from around the world gathered for an unforgettable weekend of performances.",
      },
      {
        source: { id: "billboard", name: "Billboard" },
        author: "Jordan Hayes",
        title: "Chart-Topping Album Breaks Streaming Records",
        description: "New release dominates music charts worldwide, setting new standards for digital consumption.",
        url: "https://example.com/album",
        urlToImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        content: "The album shattered streaming records within hours of release, marking a historic moment in music industry history.",
      },
    ],
    world: [
      {
        source: { id: "ap", name: "Associated Press" },
        author: "Maria Garcia",
        title: "International Cooperation Strengthens Global Relations",
        description: "Nations collaborate on crucial initiatives addressing worldwide challenges and promoting peace.",
        url: "https://example.com/cooperation",
        urlToImage: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "World leaders demonstrated unprecedented unity in addressing global challenges through coordinated diplomatic efforts.",
      },
      {
        source: { id: "guardian", name: "The Guardian" },
        author: "John Parker",
        title: "Humanitarian Efforts Bring Relief to Crisis Regions",
        description: "International aid organizations mobilize resources to support communities affected by natural disasters.",
        url: "https://example.com/humanitarian",
        urlToImage: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        content: "Global relief efforts provide critical assistance to regions affected by natural disasters and humanitarian crises.",
      },
      {
        source: { id: "bbc", name: "BBC World" },
        author: "Elena Volkov",
        title: "Historic Cultural Exchange Programs Unite Nations",
        description: "Countries launch ambitious initiatives to promote mutual understanding and cultural appreciation.",
        url: "https://example.com/cultural",
        urlToImage: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        content: "Innovative cultural exchange programs foster international friendship and understanding across diverse societies.",
      },
      {
        source: { id: "ap", name: "Associated Press" },
        author: "Carlos Silva",
        title: "Global Education Initiative Reaches Millions of Students",
        description: "International partnership provides free quality education to underserved populations worldwide.",
        url: "https://example.com/global-education",
        urlToImage: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        content: "Groundbreaking education programs leverage technology to deliver world-class learning opportunities to remote areas.",
      },
    ],
    trending: [
      {
        source: { id: "trending", name: "Trending Now" },
        author: "Social Media Team",
        title: "Viral Story Captures Hearts Around the World",
        description: "Heartwarming story spreads rapidly across social media platforms, inspiring millions globally.",
        url: "https://example.com/viral",
        urlToImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        content: "A touching story of human kindness went viral, reaching over 100 million people worldwide within hours.",
      },
      {
        source: { id: "buzzfeed", name: "BuzzFeed News" },
        author: "Viral Content Team",
        title: "Unexpected Collaboration Surprises and Delights Fans",
        description: "Unlikely partnership between celebrities creates internet sensation and trending phenomenon.",
        url: "https://example.com/collab",
        urlToImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        content: "Fans celebrate unexpected collaboration that brings together talents from different fields in creative new project.",
      },
      {
        source: { id: "mashable", name: "Mashable" },
        author: "Trends Reporter",
        title: "Social Media Challenge Unites Internet in Positive Movement",
        description: "Wholesome online challenge inspires millions to participate in acts of kindness worldwide.",
        url: "https://example.com/challenge",
        urlToImage: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        content: "Uplifting social media challenge spreads positivity globally as millions share their participation and inspire others.",
      },
      {
        source: { id: "reddit", name: "Reddit Today" },
        author: "Community Highlights",
        title: "Internet Phenomenon Breaks All-Time Engagement Records",
        description: "Unprecedented online event captures attention of billions, setting new social media milestones.",
        url: "https://example.com/phenomenon",
        urlToImage: "https://images.unsplash.com/photo-1551292831-023188e78222?w=800&h=600&fit=crop",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        content: "Global online event generated record-breaking engagement across all major social media platforms simultaneously.",
      },
    ],
    scores: [
      // Live scores are handled by liveScores.ts, this is just for fallback
      {
        source: { id: "espn", name: "ESPN" },
        author: "Sports Desk",
        title: "Live Scores Available in Dedicated Scores Section",
        description: "Real-time football and cricket scores are fetched from specialized sports APIs. Switch to Live Scores tab for real-time updates.",
        url: "https://www.espn.com",
        urlToImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
        publishedAt: new Date().toISOString(),
        content: "This is a placeholder. Live scores are handled by a dedicated service with 60-second updates.",
      },
    ],
  };

  const categoryArticles = fallbackDatabase[category] || fallbackDatabase.all;
  
  // Create unique articles without excessive duplication
  const result: NewsAPIArticle[] = [];
  const articlesCount = categoryArticles.length;
  
  for (let i = 0; i < Math.min(pageSize, articlesCount * 10); i++) {
    const sourceArticle = categoryArticles[i % articlesCount];
    result.push({
      ...sourceArticle,
      // Make URL unique for each instance
      url: i < articlesCount ? sourceArticle.url : `${sourceArticle.url}?id=${i}`,
      // Vary timestamps
      publishedAt: new Date(Date.now() - (2 + i) * 60 * 60 * 1000).toISOString(),
    });
  }

  console.log(`🆘 Returning ${result.length} fallback articles for category: ${category} (from ${articlesCount} templates)`);
  return result.slice(0, pageSize);
}

/**
 * Calculate estimated reading time
 * @param content - Article content
 * @returns Reading time string
 */
export function calculateReadTime(content: string | null): string {
  if (!content) return "3 min read";

  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);

  return `${minutes} min read`;
}

/**
 * Calculate time ago from publish date
 * @param publishedAt - ISO date string
 * @returns Human-readable time ago
 */
export function getTimeAgo(publishedAt: string): string {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffInMs = now.getTime() - published.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }
}

/**
 * Generate random view count for demonstration
 */
export function generateViewCount(): string {
  const count = Math.floor(Math.random() * 200) + 10;
  return `${count}K`;
}

// Initialize fallback data in persistent cache on module load
// This ensures we always have data available immediately
(() => {
  const categories: CategoryType[] = ["all", "technology", "business", "sports", "health", "entertainment", "world", "trending"];
  
  categories.forEach(category => {
    const cacheKey = `news_${category}_20`;
    try {
      const fallbackData = getFallbackNews(category, 20);
      persistentFallback.set(cacheKey, fallbackData);
    } catch (e) {
      console.warn(`Failed to initialize fallback for ${category}`);
    }
  });
  
  console.log('🚀 Persistent fallback data initialized for all categories');
})();
