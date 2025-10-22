/**
 * Bangladesh News Usage Examples
 * 
 * This file shows different ways to integrate Bangladesh news
 * into your NewsFlow AI application.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchBangladeshNews } from "./src/services/newsAggregator";
import type { NewsAPIArticle } from "./src/types/news";

// ============================================================================
// EXAMPLE 1: Standalone Bangladesh News Section
// ============================================================================

export function BangladeshNewsSection() {
  const { data: bdNews, isLoading, error } = useQuery<NewsAPIArticle[]>({
    queryKey: ["bangladesh-news"],
    queryFn: () => fetchBangladeshNews(10),
    staleTime: 2 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="text-white">Loading Bangladesh news...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading news</div>;
  }

  return (
    <section className="bg-gradient-to-br from-green-900/30 to-red-900/30 rounded-3xl p-6">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
        <span className="text-3xl mr-3">🇧🇩</span>
        Bangladesh News
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bdNews?.map((article: NewsAPIArticle) => (
          <article
            key={article.url}
            onClick={() => window.open(article.url, "_blank", "noopener,noreferrer")}
            className="bg-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all"
          >
            <img
              src={
                article.urlToImage ??
                "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop"
              }
              alt={article.title}
              className="w-full h-48 object-cover rounded-lg mb-3"
              loading="lazy"
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
          </article>
        ))}
      </div>
    </section>
  );
}

/*
Use in any component:

import { BangladeshNewsSection } from "./BangladeshNewsUsageExample";

function HomePage() {
  return (
    <main>
      <BangladeshNewsSection />
    </main>
  );
}
*/
