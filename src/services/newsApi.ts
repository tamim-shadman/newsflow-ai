import axios from "axios";
import type {
  NewsAPIResponse,
  NewsAPIArticle,
  CategoryType,
} from "@/types/news";

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY;
const NEWS_API_BASE_URL = "https://newsapi.org/v2";

// Debug: Log API key status
console.log('NewsAPI Configuration:', {
  hasApiKey: !!NEWS_API_KEY,
  apiKeyLength: NEWS_API_KEY?.length,
  apiKeyPrefix: NEWS_API_KEY?.substring(0, 8)
});

// Category mapping from our app categories to NewsAPI categories
const categoryMapping: Record<string, string> = {
  all: "general",
  trending: "general",
  business: "business",
  technology: "technology",
  health: "health",
  sports: "sports",
  entertainment: "entertainment",
  world: "general",
};

/**
 * Fetch news articles from NewsAPI for a specific category
 * @param category - The news category to fetch
 * @param pageSize - Number of articles to fetch (default: 20)
 * @returns Promise with news articles
 */
export async function fetchNewsByCategory(
  category: CategoryType = "all",
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  try {
    console.log(`Fetching news for category: ${category}`);
    
    // Special handling for sports category - only European football and cricket
    if (category === "sports") {
      return await fetchSportsNews(pageSize);
    }

    const apiCategory = categoryMapping[category] || "general";

    // Calculate date for last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString();

    const requestParams = {
      apiKey: NEWS_API_KEY,
      category: apiCategory,
      language: "en",
      pageSize,
      from: fromDate,
    };
    
    console.log('NewsAPI Request:', {
      url: `${NEWS_API_BASE_URL}/top-headlines`,
      params: { ...requestParams, apiKey: '***' }
    });

    const response = await axios.get<NewsAPIResponse>(
      `${NEWS_API_BASE_URL}/top-headlines`,
      {
        params: requestParams,
      }
    );

    console.log('NewsAPI Response:', {
      status: response.data.status,
      totalResults: response.data.totalResults,
      articlesCount: response.data.articles?.length
    });

    if (response.data.status === "ok") {
      return response.data.articles.filter(
        (article) => article.title && article.title !== "[Removed]"
      );
    }

    throw new Error("Failed to fetch news");
  } catch (error) {
    console.error("Error fetching news:", error);
    if (axios.isAxiosError(error)) {
      console.error("Axios error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }

    // Return fallback data if API fails
    return getFallbackNews(category);
  }
}

/**
 * Fetch sports news - specifically European football and cricket
 * @param pageSize - Number of articles to fetch
 * @returns Promise with sports articles
 */
async function fetchSportsNews(
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  try {
    // Get the date from 7 days ago for better results
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const fromDate = weekAgo.toISOString();

    // Simplified search for European football and cricket
    const sportsQuery =
      'football OR soccer OR cricket OR "Premier League" OR "Champions League"';

    const response = await axios.get<NewsAPIResponse>(
      `${NEWS_API_BASE_URL}/everything`,
      {
        params: {
          apiKey: NEWS_API_KEY,
          q: sportsQuery,
          language: "en",
          pageSize: pageSize * 2, // Get more results to filter
          sortBy: "publishedAt",
          from: fromDate,
        },
      }
    );

    if (response.data.status === "ok") {
      // Filter for football and cricket specific articles
      const filtered = response.data.articles.filter((article) => {
        if (!article.title || article.title === "[Removed]") return false;

        const content = (
          article.title +
          " " +
          (article.description || "")
        ).toLowerCase();

        // Check if it's football/soccer related
        const isFootball =
          content.includes("football") ||
          content.includes("soccer") ||
          content.includes("premier league") ||
          content.includes("la liga") ||
          content.includes("serie a") ||
          content.includes("bundesliga") ||
          content.includes("champions league") ||
          content.includes("europa league") ||
          content.includes("uefa") ||
          content.includes("fifa");

        // Check if it's cricket related
        const isCricket =
          content.includes("cricket") ||
          content.includes("ipl") ||
          content.includes("test match") ||
          content.includes("t20") ||
          content.includes("odi");

        return isFootball || isCricket;
      });

      return filtered.slice(0, pageSize);
    }

    throw new Error("Failed to fetch sports news");
  } catch (error) {
    console.error("Error fetching sports news:", error);
    return [];
  }
}

/**
 * Fetch trending news from multiple categories
 * @param pageSize - Number of articles to fetch
 * @returns Promise with trending articles
 */
export async function fetchTrendingNews(
  pageSize: number = 10
): Promise<NewsAPIArticle[]> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString();

    const response = await axios.get<NewsAPIResponse>(
      `${NEWS_API_BASE_URL}/top-headlines`,
      {
        params: {
          apiKey: NEWS_API_KEY,
          language: "en",
          pageSize,
          sortBy: "popularity",
          from: fromDate,
        },
      }
    );

    if (response.data.status === "ok") {
      return response.data.articles.filter(
        (article) => article.title && article.title !== "[Removed]"
      );
    }

    throw new Error("Failed to fetch trending news");
  } catch (error) {
    console.error("Error fetching trending news:", error);
    return getFallbackNews("trending");
  }
}

/**
 * Search news articles by query
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

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fromDate = yesterday.toISOString();

    const response = await axios.get<NewsAPIResponse>(
      `${NEWS_API_BASE_URL}/everything`,
      {
        params: {
          apiKey: NEWS_API_KEY,
          q: query,
          language: "en",
          pageSize,
          sortBy: "relevancy",
          from: fromDate,
        },
      }
    );

    if (response.data.status === "ok") {
      return response.data.articles.filter(
        (article) => article.title && article.title !== "[Removed]"
      );
    }

    throw new Error("Failed to search news");
  } catch (error) {
    console.error("Error searching news:", error);
    return [];
  }
}

/**
 * Fallback data when API fails or is not configured
 */
function getFallbackNews(category: CategoryType): NewsAPIArticle[] {
  const fallbackArticles: NewsAPIArticle[] = [
    {
      source: { id: "fallback", name: "Demo Source" },
      author: "News Team",
      title: "Revolutionary AI Breakthrough Changes Everything",
      description:
        "Scientists announce groundbreaking discovery in artificial intelligence that could reshape the future of technology.",
      url: "https://example.com",
      urlToImage:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
      publishedAt: new Date().toISOString(),
      content: "Full content would be here...",
    },
    {
      source: { id: "fallback", name: "Demo Source" },
      author: "Business Reporter",
      title: "Global Markets Surge to Record Highs",
      description:
        "Stock markets worldwide experience unprecedented growth amid economic recovery signals.",
      url: "https://example.com",
      urlToImage:
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop",
      publishedAt: new Date().toISOString(),
      content: "Full content would be here...",
    },
  ];

  return fallbackArticles;
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
