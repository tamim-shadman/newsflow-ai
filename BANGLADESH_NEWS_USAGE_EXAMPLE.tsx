/**
 * Bangladesh News Usage Examples
 * 
 * This file shows different ways to integrate Bangladesh news
 * into your NewsFlow AI application.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBangladeshNews, fetchNewsByCategory } from "./src/services/newsAggregator";
import type { NewsAPIArticle } from "./src/types/news";

// ============================================================================
// EXAMPLE 1: Standalone Bangladesh News Section
// ============================================================================

export function BangladeshNewsSection() {
  const { data: bdNews, isLoading, error } = useQuery<NewsAPIArticle[]>({
    queryKey: ["bangladesh-news"],
    queryFn: () => fetchBangladeshNews(10),
    staleTime: 2 * 60 * 60 * 1000, // 2 hours cache
    refetchInterval: 2 * 60 * 60 * 1000, // Refetch every 2 hours
  });

  if (isLoading) {
    return <div className="text-white">Loading Bangladesh news...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading news</div>;
  }

  return (
    <div className="bg-gradient-to-br from-green-900/30 to-red-900/30 rounded-3xl p-6">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
        <span className="text-3xl mr-3">🇧🇩</span>
        Bangladesh News
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {bdNews?.map((article: NewsAPIArticle) => (
          <div
            key={article.url}
            onClick={() => window.open(article.url, "_blank")}
            className="bg-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all"
          >
            <img
              src={article.urlToImage ?? "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop"}
              alt={article.title}
              className="w-full h-48 object-cover rounded-lg mb-3"
            />
            <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
              {article.title}
            </h3>
            <p className="text-gray-300 text-sm line-clamp-3">
              {article.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
              <span>{article.source.name}</span>
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Add Bangladesh as a Category
// ============================================================================

/*
// 1. Update src/types/news.ts
export type CategoryType =
  | "all"
  | "bangladesh"  // ADD THIS
  | "trending"
  | "technology"
  | "business"
  | "health"
  | "sports"
  | "entertainment"
  | "world";

// 2. Update Index.tsx categoryThemes
const categoryThemes: Record<string, CategoryTheme> = {
  // ... existing themes ...
  bangladesh: {
    gradient: "from-green-500 via-red-500 to-green-600",
    bg: "bg-gradient-to-br from-green-900/30 via-red-900/30 to-green-900/30",
    accent: "from-green-500 via-red-500 to-green-500",
    text: "text-green-300",
    glow: "shadow-green-500/50",
  },
};

// 3. Update Index.tsx categories
const categories = [
  { id: "all" as CategoryType, name: "All News", icon: Newspaper },
  { id: "bangladesh" as CategoryType, name: "Bangladesh 🇧🇩", icon: Globe },
  { id: "trending" as CategoryType, name: "Trending", icon: Flame },
  // ... rest
];

// 4. Update fetchNewsByCategory in newsAggregator.ts
export async function fetchNewsByCategory(
  category: CategoryType = "all",
  pageSize: number = 20
): Promise<NewsAPIArticle[]> {
  // Add special handling for Bangladesh
  if (category === "bangladesh") {
    const articles = await fetchBangladeshNews(pageSize);
    return articles.length > 0 ? articles : getFallbackNews("bangladesh", pageSize);
  }
  
  // ... rest of the function
}
*/

// ============================================================================
// EXAMPLE 3: Mixed News Feed (Bangladesh + World)
// ============================================================================

export function MixedNewsFeed() {
  const { data: bdNews } = useQuery<NewsAPIArticle[]>({
    queryKey: ["bangladesh-news"],
    queryFn: () => fetchBangladeshNews(5),
  });

  const { data: worldNews } = useQuery<NewsAPIArticle[]>({
    queryKey: ["world-news"],
    queryFn: () => fetchNewsByCategory("world", 5),
  });

  const dedupedArticles = useMemo(() => {
    const combined = [...(bdNews || []), ...(worldNews || [])];
    const map = new Map<string, NewsAPIArticle>();
    combined.forEach((article) => {
      if (!map.has(article.url)) {
        map.set(article.url, article);
      }
    });
    return Array.from(map.values());
  }, [bdNews, worldNews]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">
        Global & Bangladesh News
      </h2>
      {dedupedArticles.length === 0 ? (
        <div className="text-gray-300">Loading combined feed...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dedupedArticles.map((article: NewsAPIArticle) => (
            <article
              key={article.url}
              onClick={() => window.open(article.url, "_blank")}
              className="bg-white/10 rounded-xl p-4 hover:bg-white/20 transition cursor-pointer"
            >
              <img
                src={article.urlToImage || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=400&fit=crop"}
                alt={article.title}
                className="w-full h-48 object-cover rounded-lg mb-3"
              />
              <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2">
                {article.title}
              </h3>
              <p className="text-gray-300 text-sm line-clamp-3">
                {article.description}
              </p>
              <div className="mt-3 text-xs text-gray-400 flex justify-between">
                <span>{article.source?.name}</span>
                <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Bangladesh News Ticker
// ============================================================================

export function BangladeshNewsTicker() {
  const { data: bdNews } = useQuery<NewsAPIArticle[]>({
    queryKey: ["bangladesh-ticker"],
    queryFn: () => fetchBangladeshNews(10),
  });

  return (
    <div className="bg-gradient-to-r from-green-600 to-red-600 text-white py-2 overflow-hidden">
      <div className="flex animate-scroll">
        {bdNews?.map((news: NewsAPIArticle, idx: number) => (
          <span key={news.url ?? idx} className="mx-8 whitespace-nowrap">
            🇧🇩 {news.title}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Direct API Call (for testing)
// ============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export async function testBangladeshNewsAPI() {
  try {
    console.log("🇧🇩 Testing Bangladesh News API...");
    
    const news = await fetchBangladeshNews(10);
    
    console.log("✅ Success! Fetched", news.length, "articles");
    console.log("📰 First article:", {
      title: news[0]?.title,
      source: news[0]?.source.name,
      url: news[0]?.url,
    });
    
    return news;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: Bangladesh News with Custom Filtering
// ============================================================================

export function FilteredBangladeshNews() {
  const { data: bdNews } = useQuery<NewsAPIArticle[]>({
    queryKey: ["bangladesh-news-filtered"],
    queryFn: async () => {
      const allNews = await fetchBangladeshNews(50);
      
      // Filter for specific topics (example: tech and business)
  return allNews.filter((article: NewsAPIArticle) => {
        const text = `${article.title} ${article.description}`.toLowerCase();
        return (
          text.includes('technology') ||
          text.includes('business') ||
          text.includes('economy') ||
          text.includes('startup')
        );
      }).slice(0, 10);
    },
  });

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        Bangladesh Tech & Business News
      </h2>
      {/* Render filtered news */}
    </div>
  );
}

// ============================================================================
// HOW TO USE IN YOUR APP
// ============================================================================

/*
Example usage (Index.tsx):

import { BangladeshNewsSection } from "./BangladeshNewsUsageExample";

function App() {
  return (
    <div>
      // Existing news sections
      <BangladeshNewsSection />
    </div>
  );
}

// OR test in browser console:
import { testBangladeshNewsAPI } from "./BangladeshNewsUsageExample";
await testBangladeshNewsAPI();
*/
