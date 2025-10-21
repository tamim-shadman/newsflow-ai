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
  try {
    console.log(`Fetching aggregated news for category: ${category}`);

    // In production, use serverless function
    if (NEWS_API_URL) {
      const response = await axios.get(NEWS_API_URL, {
        params: {
          category: category === "all" ? "general" : category,
          pageSize,
          language: "en",
        },
      });

      console.log("News API Response:", {
        status: response.data.status,
        totalResults: response.data.totalResults,
      });

      if (response.data.status === "ok") {
        return response.data.articles.filter(
          (article: NewsAPIArticle) =>
            article.title && article.title !== "[Removed]"
        );
      }
    } else {
      // In local dev, fetch directly from APIs
      return await fetchNewsDirectly(category, pageSize);
    }

    throw new Error("Failed to fetch news");
  } catch (error) {
    console.error("Error fetching aggregated news:", error);
    if (axios.isAxiosError(error)) {
      console.error("API error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }

    // Return fallback data if API fails
    return getFallbackNews(category);
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
  try {
    if (NEWS_API_URL) {
      const response = await axios.get(NEWS_API_URL, {
        params: {
          category: "general",
          pageSize,
          language: "en",
        },
      });

      if (response.data.status === "ok") {
        return response.data.articles.filter(
          (article: NewsAPIArticle) =>
            article.title && article.title !== "[Removed]"
        );
      }
    } else {
      return await fetchNewsDirectly("trending", pageSize);
    }

    throw new Error("Failed to fetch trending news");
  } catch (error) {
    console.error("Error fetching trending news:", error);
    return getFallbackNews("trending");
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
 */
async function fetchNewsDirectly(
  category: CategoryType,
  pageSize: number
): Promise<NewsAPIArticle[]> {
  const articles: NewsAPIArticle[] = [];
  const cat = category === "all" ? "general" : category;

  try {
    // Fetch from The Guardian (best free API)
    if (GUARDIAN_API_KEY) {
      const guardianSection = cat === "general" ? "world" : cat;
      const response = await axios.get(
        `https://content.guardianapis.com/search?section=${guardianSection}&show-fields=thumbnail,trailText,byline&page-size=${pageSize}&api-key=${GUARDIAN_API_KEY}`
      );

      const guardianArticles = response.data.response?.results || [];
      guardianArticles.forEach((article: { fields?: { byline?: string; trailText?: string; thumbnail?: string }; webTitle: string; webUrl: string; webPublicationDate: string }) => {
        articles.push({
          source: { id: "guardian", name: "The Guardian" },
          author: article.fields?.byline || "The Guardian",
          title: article.webTitle,
          description: article.fields?.trailText || article.webTitle,
          url: article.webUrl,
          urlToImage: article.fields?.thumbnail,
          publishedAt: article.webPublicationDate,
          content: article.fields?.trailText,
        });
      });
    }

    // Fetch from GNews if we need more articles
    if (articles.length < pageSize && GNEWS_API_KEY) {
      const gnewsCategory = cat === "general" ? "world" : cat;
      const response = await axios.get(
        `https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=en&apikey=${GNEWS_API_KEY}`
      );

      const gnewsArticles = response.data.articles || [];
      gnewsArticles.forEach((article: { source?: { name?: string }; title: string; description: string; url: string; image: string; publishedAt: string; content: string }) => {
        articles.push({
          source: { id: "gnews", name: article.source?.name || "GNews" },
          author: article.source?.name || "GNews",
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.image,
          publishedAt: article.publishedAt,
          content: article.content,
        });
      });
    }

    console.log(`Fetched ${articles.length} articles directly from APIs`);
    return articles.slice(0, pageSize);
  } catch (error) {
    console.error("Error fetching news directly:", error);
    return getFallbackNews(category);
  }
}

/**
 * Fallback data when API fails
 */
function getFallbackNews(category: CategoryType): NewsAPIArticle[] {
  const baseArticles: NewsAPIArticle[] = [
    {
      source: { id: "demo", name: "Tech News Daily" },
      author: "Sarah Johnson",
      title: "Revolutionary AI Breakthrough Changes Everything",
      description:
        "Scientists announce groundbreaking discovery in artificial intelligence that could reshape the future of technology.",
      url: "https://example.com/ai",
      urlToImage:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      content: "Full AI breakthrough story...",
    },
    {
      source: { id: "demo", name: "Business Insider" },
      author: "Michael Chen",
      title: "Global Markets Surge to Record Highs",
      description:
        "Stock markets worldwide experience unprecedented growth amid economic recovery.",
      url: "https://example.com/markets",
      urlToImage:
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      content: "Full market story...",
    },
    {
      source: { id: "demo", name: "Health Tribune" },
      author: "Dr. Emily Roberts",
      title: "New Medical Discovery Promises Hope for Millions",
      description:
        "Researchers unveil promising new treatment that could transform healthcare.",
      url: "https://example.com/health",
      urlToImage:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      content: "Full health story...",
    },
  ];

  return baseArticles;
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
