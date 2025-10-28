import axios from "axios";
import Parser from "rss-parser";

console.log('[FallbackChain] Module loaded successfully');
console.log('[FallbackChain] axios:', typeof axios);
console.log('[FallbackChain] Parser:', typeof Parser);

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop";

// Smart fallback image system - returns different images based on category and article hash
const FALLBACK_IMAGES = {
  technology: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
  ],
  sports: [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop",
  ],
  health: [
    "https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1574267432644-f610f1f6e6b1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&h=600&fit=crop",
  ],
  world: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1569163139394-de4798aa62b4?w=800&h=600&fit=crop",
  ],
  general: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&h=600&fit=crop",
  ],
};

// Simple hash function to generate consistent index from string
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get a unique fallback image based on category and article title
function getSmartFallbackImage(category, title) {
  const categoryImages = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.general;
  const hash = hashString(title || "");
  const index = hash % categoryImages.length;
  return categoryImages[index];
}

const rssParser = new Parser({
  timeout: 5000, // Reduced from 10000 to prevent Vercel timeout
  headers: {
    "User-Agent": "newsflow-ai/1.0 (+https://newsflow-ai.com)",
  },
});

console.log('[FallbackChain] rssParser initialized:', typeof rssParser);

const API_KEYS = {
  guardian: process.env.GUARDIAN_API_KEY,
  nytimes: process.env.NYTIMES_API_KEY,
  newsdata: process.env.NEWSDATA_API_KEY,
  marketaux: process.env.MARKETAUX_API_KEY,
  alphavantage: process.env.ALPHA_VANTAGE_API_KEY,
  tmdb: process.env.TMDB_API_KEY,
  gnews: process.env.GNEWS_API_KEY,
  currents: process.env.CURRENTS_API_KEY,
  rss2json: process.env.RSS2JSON_API_KEY,
};

// In-memory usage tracking per Vercel instance
const usageTracker = {
  guardian: { count: 0, limit: 5000 },
  nytimes: { count: 0, limit: 500 },
  newsdata: { count: 0, limit: 200 },
  "newsdata-bd": { count: 0, limit: 200 },
  marketaux: { count: 0, limit: 100 },
  alphavantage: { count: 0, limit: 500 },
  currents: { count: 0, limit: 600 },
  gnews: { count: 0, limit: 100 },
};

function usageQuotaAvailable(name) {
  const tracker = usageTracker[name];
  if (!tracker) return true;
  return tracker.count < tracker.limit;
}

function bumpUsage(name) {
  if (usageTracker[name]) {
    usageTracker[name].count += 1;
  }
}

export function resetUsageCounters() {
  Object.keys(usageTracker).forEach((key) => {
    usageTracker[key].count = 0;
  });
}

function createArticle({
  sourceId,
  sourceName,
  author,
  title,
  description,
  url,
  urlToImage,
  publishedAt,
  content,
}) {
  if (!title || !url) {
    return null;
  }

  return {
    source: { id: sourceId || null, name: sourceName || "Unknown" },
    author: author || sourceName || null,
    title: title.trim(),
    description: description || "",
    url,
    urlToImage: urlToImage || DEFAULT_IMAGE,
    publishedAt: publishedAt || new Date().toISOString(),
    content: content || description || "",
  };
}

async function fetchJson(url, params = {}, options = {}) {
  try {
    const response = await axios.get(url, {
      params,
      timeout: options.timeout || 5000, // Reduced from 8000
      headers: options.headers,
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    });
    
    // Return empty data for 4xx errors
    if (response.status >= 400) {
      return null;
    }
    
    return response.data;
  } catch (error) {
    // Silently handle network errors
    return null;
  }
}

async function fetchRssFeed(feedUrl) {
  try {
    const feed = await rssParser.parseURL(feedUrl);
    return Array.isArray(feed?.items) ? feed.items : [];
  } catch (error) {
    // Silently fail for RSS feeds - they're optional unlimited sources
    return [];
  }
}

function dedupeArticles(articles, pageSize) {
  const seen = new Set();
  const result = [];
  const sorted = [...articles].sort((a, b) => {
    const aTime = a?.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b?.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  for (const article of sorted) {
    if (!article || !article.url) continue;
    const key = article.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(article);
    if (result.length >= pageSize) break;
  }
  return result;
}

function blendArticlesBySource(articles, pageSize) {
  const buckets = new Map();

  // Group articles by source
  articles.forEach(article => {
    if (!article) return;
    const sourceName = article.source?.name || 'Unknown';
    if (!buckets.has(sourceName)) {
      buckets.set(sourceName, []);
    }
    buckets.get(sourceName).push(article);
  });

  // Calculate max articles per source to ensure variety
  // Allow up to 50% of pageSize from any single source (increased from 40%)
  const maxPerSource = Math.max(5, Math.ceil(pageSize * 0.5));
  
  // Trim each bucket to maxPerSource
  for (const [source, bucket] of buckets.entries()) {
    if (bucket.length > maxPerSource) {
      buckets.set(source, bucket.slice(0, maxPerSource));
    }
  }

  // Round-robin distribution from all sources
  const queue = Array.from(buckets.values()).filter(b => b.length > 0);
  const result = [];
  let currentIndex = 0;

  while (result.length < pageSize && queue.length > 0) {
    const bucket = queue[currentIndex];
    if (bucket && bucket.length > 0) {
      result.push(bucket.shift());
    }
    
    // Remove empty buckets
    if (!bucket || bucket.length === 0) {
      queue.splice(currentIndex, 1);
    } else {
      currentIndex = (currentIndex + 1) % queue.length;
    }
    
    // Reset index if we've gone through all buckets
    if (currentIndex >= queue.length) {
      currentIndex = 0;
    }
  }

  return result;
}

const GUARDIAN_SECTION_MAP = {
  technology: "technology",
  business: "business",
  sports: "sport",
  health: "society",
  entertainment: "culture",
  world: "world",
  bangladesh: "world",
  trending: "news",
  all: "news",
  general: "news",
};

const CURRENTS_CATEGORY_MAP = {
  technology: "technology",
  business: "business",
  sports: "sports",
  health: "health",
  entertainment: "entertainment",
  world: "world",
  bangladesh: "asia",
  trending: "general",
  all: "general",
};

const REDDIT_SUBREDDIT_MAP = {
  technology: "technology",
  sports: "sports",
  business: "business",
  health: "health",
  entertainment: "movies",
  world: "worldnews",
  trending: "news",
  all: "news",
};

const BBC_FEED_MAP = {
  technology: "https://feeds.bbci.co.uk/news/technology/rss.xml",
  business: "https://feeds.bbci.co.uk/news/business/rss.xml",
  sports: "https://feeds.bbci.co.uk/sport/rss.xml?edition=uk",
  health: "https://feeds.bbci.co.uk/news/health/rss.xml",
  entertainment: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  trending: "https://feeds.bbci.co.uk/news/rss.xml",
  all: "https://feeds.bbci.co.uk/news/rss.xml",
  bangladesh: "https://feeds.bbci.co.uk/news/world/asia/bangladesh/rss.xml",
};

const GUARDIAN_RSS_MAP = {
  bangladesh: "https://www.theguardian.com/world/bangladesh/rss",
};

const ALJAZEERA_RSS = "https://www.aljazeera.com/xml/rss/all.xml";
const YAHOO_FINANCE_RSS = "https://finance.yahoo.com/news/rssindex";
const REUTERS_WORLD_RSS = "https://feeds.reuters.com/reuters/worldNews";

const BANGLADESH_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1586829135343-132950070391?w=800&h=600&fit=crop";
const BANGLADESH_MAX_ARTICLE_AGE_MS = 36 * 60 * 60 * 1000;
const BANGLADESH_KEYWORDS = [
  "bangladesh",
  "bangladeshi",
  "dhaka",
  "chittagong",
  "chattogram",
  "khulna",
  "rajshahi",
  "sylhet",
  "mymensingh",
  "rangpur",
  "barisal",
  "barishal",
  "cox's bazar",
  "coxsbazar",
  "narayanganj",
  "gazipur",
  "padma bridge",
  "sonargaon",
];

const BANGLADESH_HOST_PATTERNS = [
  ".bd",
  "bangladesh",
  "bdnews24",
  "prothomalo",
  "thedailystar",
  "dhakatribune",
  "tbsnews",
  "unb",
  "banglanews24",
  "dhakapost",
  "financialexpress",
  "theindependentbd",
  "daily-sun",
  "ittefaq",
  "kalerkantho",
  "jugantor",
  "samakal",
  "risingbd",
  "somoynews",
  "channel24bd",
  "jamuna.tv",
  "bssnews",
];

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (error) {
    return "";
  }
}

function isBangladeshHost(hostname) {
  if (!hostname) return false;
  return BANGLADESH_HOST_PATTERNS.some((pattern) => hostname.includes(pattern));
}

function isBangladeshRelevant(article) {
  if (!article) return false;
  if (article.url) {
    const host = getHostname(article.url);
    if (isBangladeshHost(host)) {
      return true;
    }
  }

  const text = `${article.title || ""} ${article.description || ""} ${article.content || ""}`.toLowerCase();
  return BANGLADESH_KEYWORDS.some((keyword) => text.includes(keyword));
}

function resolveRssImage(item, fallback = DEFAULT_IMAGE) {
  const candidates = [];

  const enclosure = item?.enclosure;
  if (typeof enclosure === "string") {
    candidates.push(enclosure);
  } else if (enclosure && typeof enclosure === "object") {
    candidates.push(enclosure.url, enclosure.link);
  }

  const mediaContent = item?.["media:content"];
  if (Array.isArray(mediaContent)) {
    mediaContent.forEach((entry) => {
      if (entry && typeof entry.url === "string") {
        candidates.push(entry.url);
      }
    });
  } else if (mediaContent && typeof mediaContent === "object" && typeof mediaContent.url === "string") {
    candidates.push(mediaContent.url);
  }

  const mediaThumbnail = item?.["media:thumbnail"];
  if (Array.isArray(mediaThumbnail)) {
    mediaThumbnail.forEach((entry) => {
      if (entry && typeof entry.url === "string") {
        candidates.push(entry.url);
      }
    });
  } else if (mediaThumbnail && typeof mediaThumbnail === "object" && typeof mediaThumbnail.url === "string") {
    candidates.push(mediaThumbnail.url);
  }

  candidates.push(item?.image, item?.thumbnail);

  const image = candidates.find((url) => typeof url === "string" && url.startsWith("http"));
  return image || fallback;
}

function normalizeBangladeshFeed(items, { sourceId, sourceName }) {
  const now = Date.now();

  return items
    .map((item) => {
      const publishedAt = item?.isoDate || item?.pubDate;
      if (publishedAt) {
        const publishedTime = new Date(publishedAt).getTime();
        if (!Number.isNaN(publishedTime) && now - publishedTime > BANGLADESH_MAX_ARTICLE_AGE_MS) {
          return null;
        }
      }

      const description = item?.contentSnippet || item?.summary || item?.description || item?.title;
      const content = item?.["content:encoded"] || item?.content || description;
      const urlToImage = resolveRssImage(item, BANGLADESH_FALLBACK_IMAGE);

      return createArticle({
        sourceId,
        sourceName,
        author: item?.creator || item?.author || sourceName,
        title: item?.title,
        description,
        url: item?.link,
        urlToImage,
        publishedAt,
        content,
      });
    })
    .filter(Boolean);
}

export class FallbackChain {
  constructor({ category = "general", pageSize = 20, language = "en" } = {}) {
    console.log('[FallbackChain] Constructor called with:', { category, pageSize, language });
    this.category = category;
    this.pageSize = pageSize;
    this.language = language;
    try {
      this.providers = this.defineProvidersForCategory(category);
      console.log('[FallbackChain] Providers defined:', this.providers.length);
    } catch (error) {
      console.error('[FallbackChain] Error defining providers:', error);
      throw error;
    }
  }

  defineProvidersForCategory(category) {
    const defaults = [
      { name: "guardian", tier: "limited", handler: () => this.fetchGuardian() },
      { name: "currents", tier: "limited", handler: () => this.fetchCurrents() },
      { name: "gnews", tier: "limited", handler: () => this.fetchGNews() },
      { name: "newsdata", tier: "limited", handler: () => this.fetchNewsDataGeneral() },
    ];

    const configs = {
      technology: [
        { name: "devto", tier: "unlimited", handler: () => this.fetchDevTo() },
        { name: "hackernews", tier: "unlimited", handler: () => this.fetchHackerNews() },
        { name: "lobsters", tier: "unlimited", handler: () => this.fetchLobsters() },
        { name: "github", tier: "unlimited", handler: () => this.fetchGitHubTrending() },
        { name: "reddit-technology", tier: "unlimited", handler: () => this.fetchReddit("technology") },
        { name: "slashdot", tier: "unlimited", handler: () => this.fetchSlashdot() },
        { name: "techcrunch", tier: "unlimited", handler: () => this.fetchTechCrunch() },
        { name: "verge", tier: "unlimited", handler: () => this.fetchTheVerge() },
        { name: "wired", tier: "unlimited", handler: () => this.fetchWired() },
        ...defaults,
      ],
      sports: [
        { name: "espn", tier: "unlimited", handler: () => this.fetchESPN() },
        { name: "reddit-sports", tier: "unlimited", handler: () => this.fetchRedditMulti(["soccer", "nba", "nfl"]) },
        { name: "bbc", tier: "unlimited", handler: () => this.fetchBBC() },
        { name: "goal", tier: "unlimited", handler: () => this.fetchGoal() },
        { name: "sky", tier: "unlimited", handler: () => this.fetchSkySports() },
        { name: "bleacher", tier: "unlimited", handler: () => this.fetchBleacherReport() },
        { name: "thesportsdb", tier: "limited", handler: () => this.fetchTheSportsDB() },
        ...defaults,
      ],
      business: [
        { name: "yahoo", tier: "unlimited", handler: () => this.fetchYahooFinance() },
        { name: "bloomberg", tier: "unlimited", handler: () => this.fetchBloomberg() },
        { name: "reuters-business", tier: "unlimited", handler: () => this.fetchReutersBusiness() },
        { name: "cnbc", tier: "unlimited", handler: () => this.fetchCNBC() },
        { name: "marketwatch", tier: "unlimited", handler: () => this.fetchMarketWatch() },
        { name: "reddit-business", tier: "unlimited", handler: () => this.fetchRedditMulti(["business", "investing"]) },
        { name: "marketaux", tier: "limited", handler: () => this.fetchMarketaux() },
        { name: "alphavantage", tier: "limited", handler: () => this.fetchAlphaVantage() },
        ...defaults,
      ],
      health: [
        { name: "nih", tier: "unlimited", handler: () => this.fetchNIH() },
        { name: "cdc", tier: "unlimited", handler: () => this.fetchCDCRss() },
        { name: "who", tier: "unlimited", handler: () => this.fetchWHORss() },
        { name: "pubmed", tier: "unlimited", handler: () => this.fetchPubMed() },
        { name: "webmd", tier: "unlimited", handler: () => this.fetchWebMD() },
        { name: "healthline", tier: "unlimited", handler: () => this.fetchHealthline() },
        { name: "mayo", tier: "unlimited", handler: () => this.fetchMayoClinic() },
        { name: "reddit-health", tier: "unlimited", handler: () => this.fetchReddit("health") },
        ...defaults,
      ],
      entertainment: [
        { name: "tmdb", tier: "unlimited", handler: () => this.fetchTMDB() },
        { name: "tvmaze", tier: "unlimited", handler: () => this.fetchTVMaze() },
        { name: "itunes", tier: "unlimited", handler: () => this.fetchITunes() },
        { name: "imdb", tier: "unlimited", handler: () => this.fetchIMDb() },
        { name: "variety", tier: "unlimited", handler: () => this.fetchVariety() },
        { name: "hollywood-reporter", tier: "unlimited", handler: () => this.fetchHollywoodReporter() },
        { name: "entertainment-weekly", tier: "unlimited", handler: () => this.fetchEntertainmentWeekly() },
        { name: "rottentomatoes", tier: "unlimited", handler: () => this.fetchRottenTomatoes() },
        { name: "metacritic", tier: "unlimited", handler: () => this.fetchMetacritic() },
        { name: "reddit-entertainment", tier: "unlimited", handler: () => this.fetchRedditMulti(["movies", "television"]) },
        ...defaults,
      ],
      world: [
        { name: "bbc", tier: "unlimited", handler: () => this.fetchBBC() },
        { name: "reuters", tier: "unlimited", handler: () => this.fetchReuters() },
        { name: "cnn", tier: "unlimited", handler: () => this.fetchCNN() },
        { name: "npr", tier: "unlimited", handler: () => this.fetchNPR() },
        { name: "france24", tier: "unlimited", handler: () => this.fetchFrance24() },
        { name: "dw", tier: "unlimited", handler: () => this.fetchDW() },
        { name: "un-news", tier: "unlimited", handler: () => this.fetchUNNews() },
        { name: "aljazeera", tier: "unlimited", handler: () => this.fetchAlJazeera() },
        { name: "reddit-worldnews", tier: "unlimited", handler: () => this.fetchReddit("worldnews") },
        { name: "nytimes", tier: "limited", handler: () => this.fetchNYTimes() },
        ...defaults,
      ],
      bangladesh: [
        { name: "bangladesh-unb", tier: "unlimited", handler: () => this.fetchBangladeshUNB() },
        { name: "bangladesh-prothomalo", tier: "unlimited", handler: () => this.fetchBangladeshProthomAlo() },
        { name: "bangladesh-financial-express", tier: "unlimited", handler: () => this.fetchBangladeshFinancialExpress() },
        { name: "bangladesh-new-age", tier: "unlimited", handler: () => this.fetchBangladeshNewAge() },
        { name: "bangladesh-banglanews24", tier: "unlimited", handler: () => this.fetchBangladeshBanglaNews24() },
        { name: "bangladesh-dhaka-tribune", tier: "unlimited", handler: () => this.fetchBangladeshDhakaTribune() },
        { name: "google-news-bd", tier: "unlimited", handler: () => this.fetchBangladeshGoogleNews() },
        { name: "bbc-bangladesh", tier: "unlimited", handler: () => this.fetchBBC() },
        { name: "guardian-bd", tier: "unlimited", handler: () => this.fetchGuardianRSS() },
        { name: "aljazeera", tier: "unlimited", handler: () => this.fetchAlJazeera() },
        { name: "newsdata-bd", tier: "limited", handler: () => this.fetchNewsDataBangladesh() },
        ...defaults,
      ],
      trending: [
        { name: "hackernews", tier: "unlimited", handler: () => this.fetchHackerNews() },
        { name: "reddit-news", tier: "unlimited", handler: () => this.fetchReddit("news") },
        { name: "bbc", tier: "unlimited", handler: () => this.fetchBBC() },
        { name: "cnn", tier: "unlimited", handler: () => this.fetchCNN() },
        ...defaults,
      ],
      all: [
        { name: "bbc", tier: "unlimited", handler: () => this.fetchBBC() },
        { name: "cnn", tier: "unlimited", handler: () => this.fetchCNN() },
        { name: "npr", tier: "unlimited", handler: () => this.fetchNPR() },
        { name: "reddit-news", tier: "unlimited", handler: () => this.fetchReddit("news") },
        ...defaults,
      ],
      general: [
        { name: "bbc", tier: "unlimited", handler: () => this.fetchBBC() },
        { name: "cnn", tier: "unlimited", handler: () => this.fetchCNN() },
        { name: "reddit-news", tier: "unlimited", handler: () => this.fetchReddit("news") },
        ...defaults,
      ],
    };

    return configs[category] || configs.general;
  }

  async execute() {
    console.log(`[FallbackChain] Execute started for ${this.category}`);
    const errors = [];
    const collected = [];

    const unlimited = this.providers.filter(provider => provider.tier === "unlimited");
    const limited = this.providers.filter(provider => provider.tier !== "unlimited");

    console.log(`[FallbackChain] Found ${unlimited.length} unlimited, ${limited.length} limited providers`);

    await this.collectProviders(unlimited, collected, errors);

    if (collected.length < this.pageSize) {
      await this.collectProviders(limited, collected, errors);
    }

    console.log(`[FallbackChain] Collected ${collected.length} articles total`);

    if (collected.length === 0) {
      console.error('[FallbackChain] No articles collected, errors:', errors);
      const err = new Error(`All providers failed for category ${this.category}`);
      err.details = errors;
      throw err;
    }

    let deduped = dedupeArticles(collected, this.pageSize * 2);

    if (this.category === "bangladesh") {
      const relevant = deduped.filter(isBangladeshRelevant);
      if (relevant.length > 0) {
        relevant.sort((a, b) => {
          const aLocal = isBangladeshHost(getHostname(a?.url));
          const bLocal = isBangladeshHost(getHostname(b?.url));
          if (aLocal === bLocal) return 0;
          return aLocal ? -1 : 1;
        });
        deduped = relevant;
      }
    }

    const blended = blendArticlesBySource(deduped, this.pageSize);

    // Apply smart fallback images to articles without images
    const withSmartImages = blended.map(article => {
      if (!article.urlToImage || article.urlToImage === DEFAULT_IMAGE) {
        return {
          ...article,
          urlToImage: getSmartFallbackImage(this.category, article.title)
        };
      }
      return article;
    });

    console.log(`[FallbackChain] Returning ${withSmartImages.length} articles after dedup/blend/smart-images`);
    return withSmartImages;
  }

  async collectProviders(steps, collected, errors) {
    let sourcesCollected = 0;
    const minSources = 2; // Reduced from 3 for faster execution
    const targetArticles = this.pageSize * 2; // Reduced from 3x for faster execution

    console.log(`[collectProviders] Starting with ${steps.length} providers, target: ${targetArticles} articles from ${minSources} sources`);

    for (const step of steps) {
      if (step.tier !== "unlimited" && !usageQuotaAvailable(step.name)) {
        continue; // Silently skip quota-exhausted providers
      }

      // Stop only if we have enough articles AND variety
      if (collected.length >= targetArticles && sourcesCollected >= minSources) {
        console.log(`[collectProviders] Stopping early: ${collected.length} articles from ${sourcesCollected} sources`);
        break;
      }

      try {
        console.log(`[collectProviders] Trying ${step.name}...`);
        const startTime = Date.now();
        const items = await step.handler();
        const elapsed = Date.now() - startTime;
        const normalized = dedupeArticles((items || []).filter(Boolean), this.pageSize * 3);
        
        if (normalized.length > 0) {
          console.log(`[collectProviders] ${step.name} returned ${normalized.length} articles in ${elapsed}ms`);
          if (step.tier !== "unlimited") {
            bumpUsage(step.name);
          }
          collected.push(...normalized);
          sourcesCollected++;
        } else {
          console.log(`[collectProviders] ${step.name} returned 0 articles`);
        }
      } catch (error) {
        console.error(`[collectProviders] ${step.name} failed:`, error.message);
        // Silently skip failed providers - we have many fallbacks
        continue;
      }
    }

    console.log(`[collectProviders] Finished: ${collected.length} articles from ${sourcesCollected} sources`);
  }

  async fetchGuardian() {
    if (!API_KEYS.guardian) return [];
    
    const section = GUARDIAN_SECTION_MAP[this.category] || "news";
    const data = await fetchJson("https://content.guardianapis.com/search", {
      section,
      "api-key": API_KEYS.guardian,
      "show-fields": "thumbnail,trailText,byline,body",
      "page-size": 50,
      orderBy: "newest",
    });

    if (!data?.response?.results) return [];

    const results = data.response.results;
    return results
      .map((item) =>
        createArticle({
          sourceId: "guardian",
          sourceName: "The Guardian",
          author: item.fields?.byline,
          title: item.webTitle,
          description: item.fields?.trailText,
          url: item.webUrl,
          urlToImage: item.fields?.thumbnail,
          publishedAt: item.webPublicationDate,
          content: item.fields?.body,
        })
      )
      .filter(Boolean);
  }
  async fetchHackerNews() {
    const ids = await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!Array.isArray(ids)) return [];

    const take = Math.min(40, ids.length);
    const slice = ids.slice(0, take);

    const articles = [];
    for (const id of slice) {
      try {
        const item = await fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (!item) continue;
        const url = item.url || `https://news.ycombinator.com/item?id=${id}`;
        articles.push(
          createArticle({
            sourceId: "hackernews",
            sourceName: "Hacker News",
            author: item.by,
            title: item.title,
            description: item.text,
            url,
            publishedAt: new Date((item.time || Date.now() / 1000) * 1000).toISOString(),
            content: item.text,
          })
        );
        if (articles.length >= this.pageSize) break;
      } catch (error) {
        continue;
      }
    }
    return articles;
  }

  async fetchDevTo() {
    const items = await fetchRssFeed("https://dev.to/feed");
    return items.map((item) =>
      createArticle({
        sourceId: "devto",
        sourceName: "Dev.to",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.thumbnail,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchLobsters() {
    const data = await fetchJson("https://lobste.rs/hottest.json", {}, { timeout: 8000 }).catch(() => []);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) =>
      createArticle({
        sourceId: "lobsters",
        sourceName: "Lobsters",
        author: item.submitter_user?.username,
        title: item.title,
        description: item.description || item.title,
        url: item.url || `https://lobste.rs/s/${item.short_id}`,
        urlToImage: DEFAULT_IMAGE,
        publishedAt: item.created_at,
        content: item.description,
      })
    );
  }

  async fetchGitHubTrending() {
    const data = await fetchJson("https://api.gitterHYPE.com/repositories", { since: "daily" }, { timeout: 8000 }).catch(() => []);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((repo) =>
      createArticle({
        sourceId: "github-trending",
        sourceName: "GitHub Trending",
        author: repo.author || repo.username,
        title: `${repo.name || repo.repository}: ${repo.description || 'Trending Repository'}`,
        description: repo.description || repo.repository,
        url: repo.url || `https://github.com/${repo.author}/${repo.name}`,
        urlToImage: repo.avatar || DEFAULT_IMAGE,
        publishedAt: new Date().toISOString(),
        content: repo.description,
      })
    );
  }

  async fetchSlashdot() {
    const items = await fetchRssFeed("https://rss.slashdot.org/Slashdot/slashdotMain");
    return items.map((item) =>
      createArticle({
        sourceId: "slashdot",
        sourceName: "Slashdot",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchTechCrunch() {
    const items = await fetchRssFeed("https://techcrunch.com/feed/");
    return items.map((item) =>
      createArticle({
        sourceId: "techcrunch",
        sourceName: "TechCrunch",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchTheVerge() {
    const items = await fetchRssFeed("https://www.theverge.com/rss/index.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "the-verge",
        sourceName: "The Verge",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchWired() {
    const items = await fetchRssFeed("https://www.wired.com/feed/rss");
    return items.map((item) =>
      createArticle({
        sourceId: "wired",
        sourceName: "Wired",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchReddit(subreddit) {
    const data = await fetchJson(`https://www.reddit.com/r/${subreddit}/hot.json`, {
      limit: 50,
    });

    const posts = data?.data?.children || [];
    return posts.map((post) =>
      createArticle({
        sourceId: "reddit",
        sourceName: `r/${subreddit}`,
        author: post.data?.author,
        title: post.data?.title,
        description: post.data?.selftext,
        url: `https://www.reddit.com${post.data?.permalink}`,
        urlToImage: post.data?.thumbnail && post.data?.thumbnail.startsWith("http") ? post.data.thumbnail : null,
        publishedAt: new Date((post.data?.created_utc || Date.now() / 1000) * 1000).toISOString(),
        content: post.data?.selftext,
      })
    );
  }

  async fetchRedditMulti(subreddits = []) {
    const lists = await Promise.all(
      subreddits.map((sub) => this.fetchReddit(sub).catch(() => []))
    );
    return lists.flat();
  }

  async fetchTheSportsDB() {
    const data = await fetchJson("https://www.thesportsdb.com/api/v1/json/3/eventsday.php", {
      d: new Date().toISOString().slice(0, 10),
      s: "Soccer",
    });

    const events = data?.events || [];
    return events.map((event) =>
      createArticle({
        sourceId: "thesportsdb",
        sourceName: "TheSportsDB",
        author: event.strLeague,
        title: `${event.strEvent} - ${event.strLeague}`,
        description: event.strDescriptionEN,
        url: `https://www.thesportsdb.com/event/${event.idEvent}`,
        urlToImage: event.strThumb,
        publishedAt: event.dateEvent ? `${event.dateEvent}T${event.strTime || "00:00"}` : null,
        content: event.strDescriptionEN,
      })
    );
  }

  async fetchESPN() {
    const data = await fetchJson("https://site.api.espn.com/apis/site/v2/sports/news", {
      limit: 50,
    });

    if (!data?.articles) return [];

    const articles = data.articles;
    return articles
      .map((item) =>
        createArticle({
          sourceId: "espn",
          sourceName: "ESPN",
          author: item.byline,
          title: item.headline,
          description: item.description,
          url: item.links?.web?.href,
          urlToImage: item.images?.[0]?.url,
          publishedAt: item.published,
          content: item.description,
        })
      )
      .filter(Boolean);
  }

  async fetchGoal() {
    const items = await fetchRssFeed("https://www.goal.com/feeds/en/news");
    return items.map((item) =>
      createArticle({
        sourceId: "goal",
        sourceName: "Goal.com",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchSkySports() {
    const items = await fetchRssFeed("https://www.skysports.com/rss/12040");
    return items.map((item) =>
      createArticle({
        sourceId: "sky-sports",
        sourceName: "Sky Sports",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchBleacherReport() {
    const items = await fetchRssFeed("https://bleacherreport.com/articles/feed");
    return items.map((item) =>
      createArticle({
        sourceId: "bleacher-report",
        sourceName: "Bleacher Report",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchMarketaux() {
    if (!API_KEYS.marketaux) return [];

    const data = await fetchJson("https://api.marketaux.com/v1/news/all", {
      api_token: API_KEYS.marketaux,
      language: "en",
      limit: 50,
    });

    const items = data?.data || [];
    return items.map((item) =>
      createArticle({
        sourceId: "marketaux",
        sourceName: item.source || "Marketaux",
        author: item.authors?.[0] || item.source,
        title: item.title,
        description: item.description,
        url: item.url,
        urlToImage: item.image_url,
        publishedAt: item.published_at,
        content: item.snippet,
      })
    );
  }

  async fetchAlphaVantage() {
    if (!API_KEYS.alphavantage) return [];

    const data = await fetchJson("https://www.alphavantage.co/query", {
      function: "NEWS_SENTIMENT",
      apikey: API_KEYS.alphavantage,
      sort: "LATEST",
    });

    const feed = data?.feed || [];
    return feed.map((item) =>
      createArticle({
        sourceId: "alphavantage",
        sourceName: item.source || "Alpha Vantage",
        author: item.authors?.[0] || item.source,
        title: item.title,
        description: item.summary,
        url: item.url,
        urlToImage: item.banner_image,
        publishedAt: item.time_published ? `${item.time_published.slice(0, 4)}-${item.time_published.slice(4, 6)}-${item.time_published.slice(6, 8)}T${item.time_published.slice(9, 11)}:${item.time_published.slice(11, 13)}:00Z` : null,
        content: item.summary,
      })
    );
  }

  async fetchYahooFinance() {
    const items = await fetchRssFeed(YAHOO_FINANCE_RSS);
    return items.map((item) =>
      createArticle({
        sourceId: "yahoo",
        sourceName: "Yahoo Finance",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.description,
      })
    );
  }

  async fetchBloomberg() {
    const items = await fetchRssFeed("https://www.bloomberg.com/feed/podcast/etf-report.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "bloomberg",
        sourceName: "Bloomberg",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.description,
      })
    );
  }

  async fetchReutersBusiness() {
    const items = await fetchRssFeed("https://feeds.reuters.com/reuters/businessNews");
    return items.map((item) =>
      createArticle({
        sourceId: "reuters-business",
        sourceName: "Reuters Business",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchCNBC() {
    const items = await fetchRssFeed("https://www.cnbc.com/id/100003114/device/rss/rss.html");
    return items.map((item) =>
      createArticle({
        sourceId: "cnbc",
        sourceName: "CNBC",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchMarketWatch() {
    const items = await fetchRssFeed("https://feeds.marketwatch.com/marketwatch/topstories/");
    return items.map((item) =>
      createArticle({
        sourceId: "marketwatch",
        sourceName: "MarketWatch",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchPubMed() {
    const search = await fetchJson("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", {
      db: "pubmed",
      term: "health",
      retmax: 40,
      retmode: "json",
    });

    const ids = search?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summary = await fetchJson("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi", {
      db: "pubmed",
      id: ids.join(","),
      retmode: "json",
    });

    const result = summary?.result || {};
    const items = Object.values(result).filter((item) => item && item.uid);
    return items.map((item) =>
      createArticle({
        sourceId: "pubmed",
        sourceName: "PubMed",
        author: Array.isArray(item.authors) && item.authors[0] ? item.authors[0].name : "PubMed",
        title: item.title,
        description: item.summary || item.title,
        url: item.elocationid || `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
        urlToImage: null,
        publishedAt: item.pubdate,
        content: item.summary,
      })
    );
  }

  async fetchCDCRss() {
    const items = await fetchRssFeed("https://tools.cdc.gov/api/v2/resources/media/132608.rss");
    return items.map((item) =>
      createArticle({
        sourceId: "cdc",
        sourceName: "CDC",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchWHORss() {
    const items = await fetchRssFeed("https://www.who.int/rss-feeds/news-english.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "who",
        sourceName: "WHO",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchNIH() {
    const items = await fetchRssFeed("https://www.nih.gov/news-events/news-releases/rss.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "nih",
        sourceName: "NIH News",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchWebMD() {
    const items = await fetchRssFeed("https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC");
    return items.map((item) =>
      createArticle({
        sourceId: "webmd",
        sourceName: "WebMD",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchHealthline() {
    const items = await fetchRssFeed("https://www.healthline.com/rss");
    return items.map((item) =>
      createArticle({
        sourceId: "healthline",
        sourceName: "Healthline",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchMayoClinic() {
    const items = await fetchRssFeed("https://www.mayoclinic.org/rss/all-news");
    return items.map((item) =>
      createArticle({
        sourceId: "mayo-clinic",
        sourceName: "Mayo Clinic",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchTMDB() {
    if (!API_KEYS.tmdb) return [];

    const data = await fetchJson("https://api.themoviedb.org/3/trending/all/day", {
      api_key: API_KEYS.tmdb,
      language: "en-US",
    });

    const results = data?.results || [];
    return results.map((item) =>
      createArticle({
        sourceId: "tmdb",
        sourceName: "TMDB",
        author: item.media_type,
        title: item.title || item.name,
        description: item.overview,
        url: item.id ? `https://www.themoviedb.org/${item.media_type}/${item.id}` : null,
        urlToImage: item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
        publishedAt: item.release_date || item.first_air_date,
        content: item.overview,
      })
    );
  }

  async fetchTVMaze() {
    const today = new Date().toISOString().slice(0, 10);
    const data = await fetchJson("https://api.tvmaze.com/schedule", {
      country: "US",
      date: today,
    });

    const shows = Array.isArray(data) ? data : [];
    return shows.map((item) =>
      createArticle({
        sourceId: "tvmaze",
        sourceName: "TVMaze",
        author: item.show?.network?.name,
        title: `${item.show?.name} - ${item.name}`,
        description: item.summary ? item.summary.replace(/<[^>]+>/g, "") : item.show?.summary?.replace(/<[^>]+>/g, ""),
        url: item.show?.url,
        urlToImage: item.show?.image?.original,
        publishedAt: item.airdate ? `${item.airdate}T${item.airtime || "00:00"}` : null,
        content: item.summary,
      })
    );
  }

  async fetchITunes() {
    const data = await fetchJson("https://itunes.apple.com/search", {
      term: "entertainment",
      media: "movie",
      limit: 50,
    });

    const results = data?.results || [];
    return results.map((item) =>
      createArticle({
        sourceId: "itunes",
        sourceName: "Apple iTunes",
        author: item.artistName,
        title: item.trackName || item.collectionName,
        description: item.shortDescription || item.collectionName,
        url: item.trackViewUrl || item.collectionViewUrl,
        urlToImage: item.artworkUrl100 || item.artworkUrl600,
        publishedAt: item.releaseDate,
        content: item.primaryGenreName,
      })
    );
  }

  async fetchIMDb() {
    const items = await fetchRssFeed("https://www.imdb.com/news/rss");
    return items.map((item) =>
      createArticle({
        sourceId: "imdb",
        sourceName: "IMDb News",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchVariety() {
    const items = await fetchRssFeed("https://variety.com/feed/");
    return items.map((item) =>
      createArticle({
        sourceId: "variety",
        sourceName: "Variety",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchHollywoodReporter() {
    const items = await fetchRssFeed("https://www.hollywoodreporter.com/t/feed/");
    return items.map((item) =>
      createArticle({
        sourceId: "hollywood-reporter",
        sourceName: "The Hollywood Reporter",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchEntertainmentWeekly() {
    const items = await fetchRssFeed("https://ew.com/feed/");
    return items.map((item) =>
      createArticle({
        sourceId: "entertainment-weekly",
        sourceName: "Entertainment Weekly",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchRottenTomatoes() {
    const items = await fetchRssFeed("https://www.rottentomatoes.com/syndication/rss/top_news.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "rottentomatoes",
        sourceName: "Rotten Tomatoes",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchMetacritic() {
    const items = await fetchRssFeed("https://www.metacritic.com/rss/movies");
    return items.map((item) =>
      createArticle({
        sourceId: "metacritic",
        sourceName: "Metacritic",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchNYTimes() {
    if (!API_KEYS.nytimes) return [];

    const data = await fetchJson("https://api.nytimes.com/svc/topstories/v2/world.json", {
      "api-key": API_KEYS.nytimes,
    });

    const results = data?.results || [];
    return results.map((item) =>
      createArticle({
        sourceId: "nytimes",
        sourceName: "The New York Times",
        author: item.byline,
        title: item.title,
        description: item.abstract,
        url: item.url,
        urlToImage: item.multimedia?.[0]?.url,
        publishedAt: item.published_date,
        content: item.abstract,
      })
    );
  }

  async fetchNewsDataBangladesh() {
    if (!API_KEYS.newsdata) return [];

    const data = await fetchJson("https://newsdata.io/api/1/news", {
      apikey: API_KEYS.newsdata,
      country: "bd",
      language: "en",
      page: 1,
    });

    const results = data?.results || [];
    return results.map((item) =>
      createArticle({
        sourceId: item.source_id || "newsdata",
        sourceName: item.source_id || "NewsData",
        author: item.creator?.[0],
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.image_url,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchNewsDataGeneral() {
    if (!API_KEYS.newsdata) return [];

    const data = await fetchJson("https://newsdata.io/api/1/news", {
      apikey: API_KEYS.newsdata,
      category: this.category === "all" ? undefined : this.category,
      language: this.language,
      page: 1,
    });

    const results = data?.results || [];
    return results.map((item) =>
      createArticle({
        sourceId: item.source_id || "newsdata",
        sourceName: item.source_id || "NewsData",
        author: item.creator?.[0],
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.image_url,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchCurrents() {
    if (!API_KEYS.currents) return [];

    const data = await fetchJson("https://api.currentsapi.services/v1/latest-news", {
      apiKey: API_KEYS.currents,
      language: this.language,
      category: CURRENTS_CATEGORY_MAP[this.category] || undefined,
    });

    const articles = data?.news || [];
    return articles.map((item) =>
      createArticle({
        sourceId: item.id,
        sourceName: item.author || item.source || "Currents",
        author: item.author || item.source,
        title: item.title,
        description: item.description,
        url: item.url,
        urlToImage: item.image,
        publishedAt: item.published,
        content: item.description,
      })
    );
  }

  async fetchGNews() {
    if (!API_KEYS.gnews) return [];

    const category = this.category === "all" || this.category === "general" ? "world" : this.category;
    const data = await fetchJson("https://gnews.io/api/v4/top-headlines", {
      category,
      lang: this.language || "en",
      max: 50,
      apikey: API_KEYS.gnews,
    });

    const articles = data?.articles || [];
    return articles.map((item) =>
      createArticle({
        sourceId: "gnews",
        sourceName: item.source?.name || "GNews",
        author: item.source?.name,
        title: item.title,
        description: item.description,
        url: item.url,
        urlToImage: item.image,
        publishedAt: item.publishedAt,
        content: item.content,
      })
    );
  }

  async fetchBBC() {
    const feed = BBC_FEED_MAP[this.category] || BBC_FEED_MAP.all;
    const items = await fetchRssFeed(feed);
    return items.map((item) =>
      createArticle({
        sourceId: "bbc",
        sourceName: "BBC",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchBangladeshUNB() {
    const items = await fetchRssFeed("https://unb.com.bd/feed");
    return normalizeBangladeshFeed(items, {
      sourceId: "unb-news",
      sourceName: "UNB News",
    });
  }

  async fetchBangladeshProthomAlo() {
    const items = await fetchRssFeed("https://en.prothomalo.com/feed");
    return normalizeBangladeshFeed(items, {
      sourceId: "prothomalo-en",
      sourceName: "Prothom Alo",
    });
  }

  async fetchBangladeshFinancialExpress() {
    const items = await fetchRssFeed("https://thefinancialexpress.com.bd/rss");
    return normalizeBangladeshFeed(items, {
      sourceId: "financial-express-bd",
      sourceName: "Financial Express Bangladesh",
    });
  }

  async fetchBangladeshNewAge() {
    const items = await fetchRssFeed("https://www.newagebd.net/rss.php");
    return normalizeBangladeshFeed(items, {
      sourceId: "newage-bd",
      sourceName: "New Age Bangladesh",
    });
  }

  async fetchBangladeshBanglaNews24() {
    const items = await fetchRssFeed("https://www.banglanews24.com/rss.xml");
    return normalizeBangladeshFeed(items, {
      sourceId: "banglanews24",
      sourceName: "Banglanews24",
    });
  }

  async fetchBangladeshDhakaTribune() {
    const items = await fetchRssFeed("https://www.dhakatribune.com/feed");
    return normalizeBangladeshFeed(items, {
      sourceId: "dhakatribune",
      sourceName: "Dhaka Tribune",
    });
  }

  async fetchBangladeshGoogleNews() {
    const items = await fetchRssFeed("https://news.google.com/rss/search?q=bangladesh&hl=en-BD&gl=BD&ceid=BD:en");
    return normalizeBangladeshFeed(items, {
      sourceId: "google-news-bd",
      sourceName: "Google News Bangladesh",
    });
  }

  async fetchReuters() {
    const items = await fetchRssFeed(REUTERS_WORLD_RSS);
    return items.map((item) =>
      createArticle({
        sourceId: "reuters",
        sourceName: "Reuters",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchCNN() {
    const items = await fetchRssFeed("http://rss.cnn.com/rss/edition_world.rss");
    return items.map((item) =>
      createArticle({
        sourceId: "cnn",
        sourceName: "CNN",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchNPR() {
    const items = await fetchRssFeed("https://feeds.npr.org/1004/rss.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "npr",
        sourceName: "NPR",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchFrance24() {
    const items = await fetchRssFeed("https://www.france24.com/en/rss");
    return items.map((item) =>
      createArticle({
        sourceId: "france24",
        sourceName: "France 24",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchDW() {
    const items = await fetchRssFeed("https://rss.dw.com/rdf/rss-en-all");
    return items.map((item) =>
      createArticle({
        sourceId: "dw",
        sourceName: "Deutsche Welle",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchUNNews() {
    const items = await fetchRssFeed("https://news.un.org/feed/subscribe/en/news/all/rss.xml");
    return items.map((item) =>
      createArticle({
        sourceId: "un-news",
        sourceName: "UN News",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchGuardianRSS() {
    const feed = GUARDIAN_RSS_MAP[this.category];
    if (!feed) return [];
    const items = await fetchRssFeed(feed);
    return items.map((item) =>
      createArticle({
        sourceId: "guardian",
        sourceName: "The Guardian",
        author: item.author,
        title: item.title,
        description: item.description,
        url: item.link,
        urlToImage: item.enclosure?.link,
        publishedAt: item.pubDate,
        content: item.content,
      })
    );
  }

  async fetchAlJazeera() {
    const items = await fetchRssFeed(ALJAZEERA_RSS);
    return items
      .filter((item) => item.title && item.link?.includes("aljazeera.com"))
      .map((item) =>
        createArticle({
          sourceId: "aljazeera",
          sourceName: "Al Jazeera",
          author: item.author,
          title: item.title,
          description: item.description,
          url: item.link,
          publishedAt: item.pubDate,
          content: item.content,
        })
      );
  }
}
