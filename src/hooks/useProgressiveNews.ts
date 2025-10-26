import { useQuery, useQueries } from "@tanstack/react-query";
import type { NewsAPIArticle, CategoryType } from "@/types/news";
import { fetchNewsByCategory } from "@/services/newsAggregator";

/**
 * Progressive loading hook that fetches articles in multiple batches
 * Shows early results immediately while continuing to fetch more
 */
export function useProgressiveNews(
  category: CategoryType,
  totalSize: number = 50
) {
  const batchSize = 10; // Fetch 10 articles at a time
  const numBatches = Math.ceil(totalSize / batchSize);

  // Create queries for each batch
  const queries = Array.from({ length: numBatches }, (_, index) => ({
    queryKey: ["news-progressive", category, index],
    queryFn: async () => {
      // Simulate progressive loading by adding small delay between batches
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, index * 200));
      }
      
      // Fetch a batch of articles
      const allArticles = await fetchNewsByCategory(category, totalSize);
      const start = index * batchSize;
      const end = start + batchSize;
      
      return {
        batch: index,
        articles: allArticles.slice(start, end),
        hasMore: end < allArticles.length,
      };
    },
    staleTime: 2 * 60 * 60 * 1000,
    refetchInterval: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: index === 0 || queries[index - 1]?.data !== undefined, // Wait for previous batch
  }));

  const results = useQueries({ queries });

  // Combine all loaded batches
  const allArticles: NewsAPIArticle[] = [];
  let isLoading = false;
  let isFetching = false;
  let error = null;

  for (const result of results) {
    const batchData = result.data as { batch: number; articles: NewsAPIArticle[]; hasMore: boolean } | undefined;
    if (batchData?.articles) {
      allArticles.push(...batchData.articles);
    }
    if (result.isLoading && allArticles.length === 0) {
      isLoading = true;
    }
    if (result.isFetching) {
      isFetching = true;
    }
    if (result.error && allArticles.length === 0) {
      error = result.error;
    }
  }

  const loadedBatches = results.filter(r => r.data).length;
  const progress = (loadedBatches / numBatches) * 100;

  return {
    data: allArticles,
    isLoading, // Only true if first batch is loading
    isFetching, // True if any batch is fetching
    error,
    progress,
    loadedBatches,
    totalBatches: numBatches,
  };
}

/**
 * Simple progressive loader - loads in chunks of increasing size
 * Uses shorter cache for RSS-heavy categories (Bangladesh, Health)
 */
export function useChunkedNews(category: CategoryType) {
  // Use 30 min staleTime for RSS-heavy categories, 2 hours for others
  const isRSSHeavy = category === 'bangladesh' || category === 'health';
  const staleTime = isRSSHeavy ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
  
  // First load: 6 articles (fast)
  const firstQuery = useQuery({
    queryKey: ["news-chunk-1", category],
    queryFn: () => fetchNewsByCategory(category, 6),
    staleTime,
    refetchOnWindowFocus: false,
  });

  // Second load: next 12 articles (medium)
  const secondQuery = useQuery({
    queryKey: ["news-chunk-2", category],
    queryFn: () => fetchNewsByCategory(category, 18).then(articles => articles.slice(6, 18)),
    staleTime,
    refetchOnWindowFocus: false,
    enabled: !!firstQuery.data, // Only fetch after first completes
  });

  // Third load: remaining articles (slower)
  const thirdQuery = useQuery({
    queryKey: ["news-chunk-3", category],
    queryFn: () => fetchNewsByCategory(category, 50).then(articles => articles.slice(18)),
    staleTime,
    refetchOnWindowFocus: false,
    enabled: !!secondQuery.data, // Only fetch after second completes
  });

  const allArticles = [
    ...(firstQuery.data || []),
    ...(secondQuery.data || []),
    ...(thirdQuery.data || []),
  ];

  return {
    data: allArticles,
    isLoading: firstQuery.isLoading,
    isFetching: firstQuery.isFetching || secondQuery.isFetching || thirdQuery.isFetching,
    error: firstQuery.error || secondQuery.error || thirdQuery.error,
    progress: {
      first: !!firstQuery.data,
      second: !!secondQuery.data,
      third: !!thirdQuery.data,
    },
  };
}
