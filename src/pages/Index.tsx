import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Newspaper,
  Flame,
  TrendingUp,
  Globe,
  Briefcase,
  Cpu,
  Heart,
  Trophy,
  Film,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Eye,
  Clock,
  ArrowRight,
  Search,
  Bookmark,
  Share2,
  Bell,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NewsGridSkeleton, FeaturedSkeleton } from "@/components/NewsSkeletons";
import { ErrorState, EmptyState } from "@/components/ErrorState";
import {
  fetchNewsByCategory,
  fetchTrendingNews,
  fetchFeaturedFromAllCategories,
  fetchBreakingNews,
  searchNews,
  calculateReadTime,
  getTimeAgo,
  generateViewCount,
} from "@/services/newsAggregator";
import {
  enhanceArticlesBatch,
  enhanceArticleWithLLM,
} from "@/services/llmService";
import type {
  NewsArticle,
  CategoryType,
  CategoryTheme,
  NewsAPIArticle,
  EnhancedArticle,
} from "@/types/news";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [email, setEmail] = useState("");
  const [enhancedArticles, setEnhancedArticles] = useState<
    Map<string, EnhancedArticle>
  >(new Map());
  const [viewCounts] = useState<Map<string, string>>(new Map());
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Map<string, string>>(new Map());
  
  // Lazy loading state
  const [displayCount, setDisplayCount] = useState(6); // Show 1/5th initially (30 articles / 5 = 6)
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const categoryThemes: Record<string, CategoryTheme> = {
    all: {
      gradient: "from-purple-600 via-pink-600 to-blue-600",
      bg: "bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-blue-900/30",
      accent: "from-purple-500 via-pink-500 to-blue-500",
      text: "text-purple-300",
      glow: "shadow-purple-500/50",
    },
    trending: {
      gradient: "from-orange-500 via-red-500 to-pink-600",
      bg: "bg-gradient-to-br from-orange-900/30 via-red-900/30 to-pink-900/30",
      accent: "from-orange-500 via-red-500 to-pink-500",
      text: "text-orange-300",
      glow: "shadow-orange-500/50",
    },
    business: {
      gradient: "from-emerald-500 via-teal-500 to-cyan-600",
      bg: "bg-gradient-to-br from-emerald-900/30 via-teal-900/30 to-cyan-900/30",
      accent: "from-emerald-500 via-teal-500 to-cyan-500",
      text: "text-emerald-300",
      glow: "shadow-emerald-500/50",
    },
    technology: {
      gradient: "from-blue-500 via-indigo-500 to-purple-600",
      bg: "bg-gradient-to-br from-blue-900/30 via-indigo-900/30 to-purple-900/30",
      accent: "from-blue-500 via-indigo-500 to-purple-500",
      text: "text-blue-300",
      glow: "shadow-blue-500/50",
    },
    health: {
      gradient: "from-green-500 via-emerald-500 to-teal-600",
      bg: "bg-gradient-to-br from-green-900/30 via-emerald-900/30 to-teal-900/30",
      accent: "from-green-500 via-emerald-500 to-teal-500",
      text: "text-green-300",
      glow: "shadow-green-500/50",
    },
    sports: {
      gradient: "from-yellow-500 via-amber-500 to-orange-600",
      bg: "bg-gradient-to-br from-yellow-900/30 via-amber-900/30 to-orange-900/30",
      accent: "from-yellow-500 via-amber-500 to-orange-500",
      text: "text-yellow-300",
      glow: "shadow-yellow-500/50",
    },
    entertainment: {
      gradient: "from-fuchsia-500 via-purple-500 to-pink-600",
      bg: "bg-gradient-to-br from-fuchsia-900/30 via-purple-900/30 to-pink-900/30",
      accent: "from-fuchsia-500 via-purple-500 to-pink-500",
      text: "text-fuchsia-300",
      glow: "shadow-fuchsia-500/50",
    },
    world: {
      gradient: "from-cyan-500 via-sky-500 to-blue-600",
      bg: "bg-gradient-to-br from-cyan-900/30 via-sky-900/30 to-blue-900/30",
      accent: "from-cyan-500 via-sky-500 to-blue-500",
      text: "text-cyan-300",
      glow: "shadow-cyan-500/50",
    },
  };

  const categories = [
    { id: "all" as CategoryType, name: "All News", icon: Newspaper },
    { id: "trending" as CategoryType, name: "Trending", icon: Flame },
    { id: "technology" as CategoryType, name: "Technology", icon: Cpu },
    { id: "sports" as CategoryType, name: "Sports", icon: Trophy },
    { id: "business" as CategoryType, name: "Business", icon: Briefcase },
    { id: "health" as CategoryType, name: "Health", icon: Heart },
    { id: "entertainment" as CategoryType, name: "Entertainment", icon: Film },
    { id: "world" as CategoryType, name: "World", icon: Globe },
  ];

  // Helper to get category icon
  const getCategoryIcon = (category: CategoryType | string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : Newspaper;
  };

  // Fetch news based on active category or search query
  const {
    data: newsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["news", activeCategory, debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch) {
        return await searchNews(debouncedSearch);
      }
      // Fetch more articles for lazy loading (50 instead of 30)
      return await fetchNewsByCategory(activeCategory, 50);
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours (match cache TTL)
    refetchInterval: 2 * 60 * 60 * 1000, // Refetch every 2 hours (7200000 ms)
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  // Fetch trending articles (2 from each category)
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending-from-categories"],
    queryFn: async (): Promise<Array<NewsAPIArticle & { _category: CategoryType }>> => {
      const categories: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world"];
      const promises = categories.map(cat => fetchNewsByCategory(cat, 2));
      const results = await Promise.all(promises);
      
      // Flatten and return all articles
      const allTrending: Array<NewsAPIArticle & { _category: CategoryType }> = [];
      results.forEach((articles, index) => {
        if (articles && articles.length > 0) {
          // Take first 2 from each category
          const categoryArticles = articles.slice(0, 2).map(article => ({
            ...article,
            // Store the category for proper display
            _category: categories[index]
          }));
          allTrending.push(...categoryArticles);
        }
      });
      
      return allTrending;
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000, // Refetch every 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: activeCategory === "trending", // Only fetch when trending is active
  });

  // Fetch featured news from all categories (1 from each)
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ["featured-all-categories"],
    queryFn: () => fetchFeaturedFromAllCategories(),
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000, // Refetch every 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch breaking news for ticker
  const { data: breakingNewsData } = useQuery({
    queryKey: ["breaking-news"],
    queryFn: () => fetchBreakingNews(15),
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000, // Refetch every 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearInterval(timer);
  }, [searchQuery]);

  // Convert API articles to our NewsArticle format
  const convertToNewsArticle = useCallback(
    (article: NewsAPIArticle, category: CategoryType): NewsArticle => {
      const enhanced = enhancedArticles.get(article.url);

      // Generate stable view count for this article
      if (!viewCounts.has(article.url)) {
        viewCounts.set(article.url, generateViewCount());
      }

      return {
        id: article.url,
        title: enhanced?.enhancedTitle || article.title,
        category: category,
        image:
          article.urlToImage ||
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
        time: getTimeAgo(article.publishedAt),
        views: viewCounts.get(article.url)!,
        excerpt:
          enhanced?.enhancedExcerpt ||
          article.description ||
          "Read more about this story...",
        readTime: calculateReadTime(article.content),
        isTrending: category === "trending",
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        content: article.content || undefined,
        author: article.author || undefined,
      };
    },
    [enhancedArticles, viewCounts]
  );

  const featuredNews: NewsArticle[] = featuredData
    ? featuredData.map((article, index) => {
        // Determine category from the article or use index-based mapping
        const categoryMap: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world"];
        const category = categoryMap[index % categoryMap.length];
        return convertToNewsArticle(article, category);
      })
    : [];

  // Use trending data when in trending category, otherwise use regular news data
  const currentNewsData = activeCategory === "trending" ? trendingData : newsData;
  
  const newsArticles: NewsArticle[] = useMemo(() => {
    if (!currentNewsData) return [];
    
    return currentNewsData.map((article: NewsAPIArticle & { _category?: CategoryType }) => {
      // For trending, use the stored category
      const category = article._category || activeCategory;
      return convertToNewsArticle(article, category);
    });
  }, [currentNewsData, activeCategory, convertToNewsArticle]);

  // Lazy loaded articles (only show displayCount articles)
  const displayedArticles = useMemo(() => {
    return newsArticles.slice(0, displayCount);
  }, [newsArticles, displayCount]);
  
  const hasMore = displayCount < newsArticles.length;

  const tickerNews = breakingNewsData || [
    "Loading latest breaking news from around the world...",
    "Stay tuned for real-time updates...",
  ];

  // Enhance articles with LLM when data loads (optimized - only enhance first 3)
  useEffect(() => {
    const enhanceNews = async () => {
      if (currentNewsData && currentNewsData.length > 0) {
        const enhanced = await enhanceArticlesBatch(currentNewsData.slice(0, 3), 3);
        setEnhancedArticles(enhanced);
      }
    };
    enhanceNews();
  }, [currentNewsData]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMore(true);
          // Simulate loading delay for smooth UX
          setTimeout(() => {
            setDisplayCount(prev => Math.min(prev + 6, newsArticles.length));
            setIsLoadingMore(false);
          }, 500);
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, newsArticles.length]);

  // Reset display count when category changes
  useEffect(() => {
    setDisplayCount(6);
  }, [activeCategory, debouncedSearch]);

  // Auto-rotate featured carousel
  useEffect(() => {
    if (featuredNews.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredNews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredNews.length]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleCategoryChange = (categoryId: CategoryType) => {
    setIsTransitioning(true);
    setSearchQuery(""); // Clear search when changing category
    setTimeout(() => {
      setActiveCategory(categoryId);
      setIsTransitioning(false);
    }, 300);
  };

  const nextSlide = () => {
    if (featuredNews.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % featuredNews.length);
  };

  const prevSlide = () => {
    if (featuredNews.length === 0) return;
    setCurrentSlide(
      (prev) => (prev - 1 + featuredNews.length) % featuredNews.length
    );
  };

  const handleArticleClick = (url?: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleSubscribe = () => {
    if (email && email.includes("@")) {
      alert(`Thank you for subscribing! We'll send news updates to ${email}`);
      setEmail("");
    } else {
      alert("Please enter a valid email address");
    }
  };

  const handleSummarize = async (articleUrl: string) => {
    // If summary already exists, just return (popover will display it)
    if (summaries.has(articleUrl)) {
      return;
    }

    // Check if this article was already enhanced (first 4-5 articles)
    const alreadyEnhanced = enhancedArticles.get(articleUrl);
    if (alreadyEnhanced && alreadyEnhanced.summary) {
      // Use the existing summary from the enhanced articles
      setSummaries((prev) =>
        new Map(prev).set(articleUrl, alreadyEnhanced.summary)
      );
      return;
    }

    // Start loading
    setLoadingSummary(articleUrl);

    try {
      // Find the article in the news data
      const article = newsData?.find((a) => a.url === articleUrl);
      if (!article) return;

      // Get enhanced article with summary
      const enhanced = await enhanceArticleWithLLM(article);

      // Store the summary
      setSummaries((prev) => new Map(prev).set(articleUrl, enhanced.summary));
    } catch (error) {
      console.error("Failed to generate summary:", error);
      setSummaries((prev) =>
        new Map(prev).set(
          articleUrl,
          "Failed to generate summary. Please try again."
        )
      );
    } finally {
      setLoadingSummary(null);
    }
  };

  const theme = categoryThemes[activeCategory];

  return (
    <div
      className={`min-h-screen transition-all duration-700 ${theme.bg} bg-black relative overflow-hidden font-sans`}
    >
      {/* Animated Background with Parallax */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-20`}
          style={{
            transform: `translate(${mousePosition.x * 0.02}px, ${
              mousePosition.y * 0.02
            }px)`,
          }}
        />

        <div
          className={`absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br ${theme.accent} rounded-full filter blur-3xl opacity-30 animate-pulse-slow`}
        />
        <div
          className={`absolute top-1/4 -right-40 w-80 h-80 bg-gradient-to-br ${theme.accent} rounded-full filter blur-3xl opacity-25 animate-float`}
        />
        <div
          className={`absolute -bottom-40 left-1/3 w-96 h-96 bg-gradient-to-br ${theme.accent} rounded-full filter blur-3xl opacity-30 animate-float-delayed`}
        />

        <div className="absolute inset-0 opacity-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute h-px bg-gradient-to-r ${theme.accent} animate-shimmer`}
              style={{
                top: `${i * 5}%`,
                left: "-100%",
                right: "-100%",
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Live News Ticker - Responsive */}
      <div className="relative z-10 bg-black/80 border-b border-white/10 overflow-hidden">
        <div className="flex items-center">
          <div
            className={`px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r ${theme.accent} flex items-center space-x-1 sm:space-x-2 shrink-0`}
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            <span className="text-white font-bold text-xs sm:text-sm whitespace-nowrap">
              BREAKING
            </span>
          </div>
          <div className="flex-1 overflow-hidden py-2 sm:py-3">
            <div className="flex animate-scroll">
              {[...tickerNews, ...tickerNews].map((news, idx) => (
                <span
                  key={idx}
                  className="text-gray-200 text-xs sm:text-sm mx-4 sm:mx-8 whitespace-nowrap font-medium"
                >
                  <span className="text-red-400 mr-2">●</span>
                  {news}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glassmorphic Header */}
      <header className="sticky z-10 top-0 backdrop-blur-2xl bg-black/50 border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-4 lg:gap-6">
            {/* Logo Section - Responsive */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div
                className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br ${theme.accent} shadow-2xl ${theme.glow} animate-pulse-glow`}
              >
                <Newspaper className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-display bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent tracking-tight">
                  NewsFlow AI
                </h1>
                <p
                  className={`text-[10px] sm:text-xs ${theme.text} font-semibold tracking-wider`}
                >
                  LIVE 24/7
                </p>
              </div>
            </div>

            {/* Search Bar - Desktop Only, Mobile: Separate Row */}
            <div className="hidden lg:flex flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search news..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/40 rounded-full"
                />
              </div>
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button className="p-1.5 sm:p-2 rounded-full bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 transition-all border border-white/20">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div
                className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r ${theme.accent} text-white text-xs sm:text-sm font-bold shadow-xl ${theme.glow} animate-pulse-slow flex items-center space-x-1 sm:space-x-2`}
              >
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-ping" />
                <span>LIVE</span>
              </div>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="lg:hidden mt-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/40 rounded-full text-sm"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Category Navigation - Responsive & Touch-Friendly */}
      <nav className="sticky z-10 top-[120px] sm:top-[89px] backdrop-blur-2xl bg-black/40 border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex space-x-2 sm:space-x-3 overflow-x-auto py-3 sm:py-5 scrollbar-hide scroll-smooth">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold whitespace-nowrap transition-all duration-300 transform hover:scale-105 sm:hover:scale-110 active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${categoryThemes[cat.id].accent} text-white shadow-2xl ${categoryThemes[cat.id].glow} scale-105`
                      : "bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      isActive ? "animate-bounce-subtle" : ""
                    }`}
                  />
                  <span className="text-xs sm:text-sm">{cat.name}</span>
                  {isActive && <Zap className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content - Responsive Padding */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-10">
        {/* Featured Carousel - Responsive */}
        <div className="mb-10 sm:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h2
                className={`text-2xl sm:text-3xl lg:text-4xl font-black font-display bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent flex items-center`}
              >
                <div
                  className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br ${theme.accent} mr-2 sm:mr-4 animate-pulse-glow`}
                >
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
                </div>
                <span className="text-xl sm:text-3xl lg:text-4xl">Top Stories</span>
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-2 ml-8 sm:ml-12 lg:ml-16">
                <span className="hidden sm:inline">Featured: </span>Tech • Business • Sports • Health • Entertainment • World
              </p>
            </div>
            {featuredNews.length > 0 && (
              <div className="flex items-center space-x-2 text-gray-400">
                <Eye className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  {featuredNews[currentSlide]?.views} views
                </span>
              </div>
            )}
          </div>

          {featuredLoading ? (
            <FeaturedSkeleton />
          ) : featuredNews.length > 0 ? (
            <div className="relative group">
              <div className="relative h-[400px] sm:h-[500px] lg:h-[550px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/10">
                {featuredNews.map((news, index) => (
                  <div
                    key={news.id}
                    onClick={() => handleArticleClick(news.url)}
                    className={`absolute inset-0 transition-all duration-1000 transform cursor-pointer ${
                      index === currentSlide
                        ? "opacity-100 scale-100 rotate-0"
                        : index ===
                          (currentSlide - 1 + featuredNews.length) %
                            featuredNews.length
                        ? "opacity-0 scale-95 -rotate-2"
                        : "opacity-0 scale-105 rotate-2"
                    }`}
                  >
                    <img
                      src={news.image}
                      alt={news.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

                    <div className="absolute inset-0 opacity-30">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`absolute w-2 h-2 bg-gradient-to-r ${theme.accent} rounded-full animate-float-particle`}
                          style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${3 + Math.random() * 2}s`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-10">
                      <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-5">
                        {news.isTrending && (
                          <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/50 animate-pulse-glow flex items-center space-x-1">
                            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>TRENDING</span>
                          </span>
                        )}
                        <span
                          className={`px-3 sm:px-5 py-1 sm:py-2 rounded-full text-xs sm:text-base font-black bg-gradient-to-r ${
                            categoryThemes[news.category].accent
                          } text-white shadow-2xl ${
                            categoryThemes[news.category].glow
                          } animate-pulse-glow uppercase tracking-wide flex items-center gap-1 sm:gap-2`}
                        >
                          {(() => {
                            const CategoryIcon = getCategoryIcon(news.category);
                            return <CategoryIcon className="w-3 h-3 sm:w-5 sm:h-5" />;
                          })()}
                          <span className="hidden sm:inline">{news.category}</span>
                        </span>
                        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-200 bg-black/60 backdrop-blur-xl px-2 sm:px-4 py-1 sm:py-2 rounded-full">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="text-xs sm:text-sm font-semibold">
                            {news.time}
                          </span>
                        </div>
                        <div className="hidden sm:flex items-center space-x-2 text-gray-200 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full">
                          <span className="text-sm font-semibold">
                            {news.readTime}
                          </span>
                        </div>
                        {news.source && (
                          <div className="hidden md:flex items-center space-x-2 text-gray-200 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full">
                            <span className="text-sm font-semibold">
                              {news.source}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-2xl sm:text-3xl lg:text-5xl font-black font-display text-white mb-2 sm:mb-4 leading-tight drop-shadow-2xl line-clamp-2 sm:line-clamp-none">
                        {news.title}
                      </h3>
                      <p className="text-gray-200 text-xl mb-6 max-w-3xl">
                        {news.excerpt}
                      </p>
                      <div className="flex items-center space-x-4">
                        <button
                          className={`px-6 py-3 rounded-full bg-gradient-to-r ${theme.accent} text-white font-bold shadow-xl ${theme.glow} hover:scale-105 transition-transform flex items-center space-x-2`}
                        >
                          <span>Read Full Story</span>
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Article bookmarked!");
                          }}
                          className="p-3 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-all"
                        >
                          <Bookmark className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigator.share && news.url) {
                              navigator.share({
                                url: news.url,
                                title: news.title,
                              });
                            } else {
                              alert("Share link copied!");
                            }
                          }}
                          className="p-3 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/20 transition-all"
                        >
                          <Share2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {featuredNews.length > 1 && (
                <>
                  {/* Navigation Buttons - Responsive */}
                  <button
                    onClick={prevSlide}
                    className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-4 rounded-full bg-gradient-to-r ${theme.accent} text-white opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-2xl ${theme.glow}`}
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-4 rounded-full bg-gradient-to-r ${theme.accent} text-white opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-2xl ${theme.glow}`}
                  >
                    <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>

                  {/* Carousel Indicators - Responsive */}
                  <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 sm:space-x-3">
                    {featuredNews.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`transition-all duration-300 rounded-full ${
                          index === currentSlide
                            ? `bg-gradient-to-r ${theme.accent} w-8 sm:w-12 h-2 sm:h-3 shadow-xl ${theme.glow}`
                            : "bg-white/40 w-2 sm:w-3 h-2 sm:h-3 hover:bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <EmptyState message="No featured stories available" />
          )}
        </div>

        {/* News Grid - Responsive */}
        <div
          className={`transition-all duration-500 ${
            isTransitioning
              ? "opacity-0 transform scale-95"
              : "opacity-100 transform scale-100"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3">
            <h2
              className={`text-2xl sm:text-3xl lg:text-4xl font-black font-display bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}
            >
              {debouncedSearch
                ? `Search: "${debouncedSearch}"`
                : categories.find((c) => c.id === activeCategory)?.name}
            </h2>
            {newsArticles.length > 0 && (
              <div
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r ${theme.accent} bg-opacity-20 text-white text-sm sm:text-base font-semibold`}
              >
                {displayedArticles.length} / {newsArticles.length} Articles
              </div>
            )}
          </div>

          {(isLoading || (activeCategory === "trending" && trendingLoading)) ? (
            <NewsGridSkeleton count={6} />
          ) : error ? (
            <ErrorState
              message="Failed to load news articles. Please check your API configuration or try again later."
              onRetry={() => refetch()}
            />
          ) : newsArticles.length === 0 ? (
            <EmptyState
              message={
                debouncedSearch
                  ? "No articles found for your search."
                  : "No articles available."
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {displayedArticles.map((article, idx) => (
                <div
                  key={article.id}
                  onMouseEnter={() => setHoveredCard(article.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  onClick={() => handleArticleClick(article.url)}
                  className="group cursor-pointer"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div
                    className={`relative overflow-hidden rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/5 border-2 transition-all duration-500 transform hover:scale-105 active:scale-95 sm:hover:-translate-y-2 shadow-xl hover:shadow-2xl ${
                      hoveredCard === article.id
                        ? `border-white/40 ${theme.glow}`
                        : "border-white/10"
                    }`}
                  >
                    <div className="relative h-48 sm:h-56 overflow-hidden">
                      <img
                        src={article.image}
                        alt={article.title}
                        className={`w-full h-full object-cover transition-all duration-700 ${
                          hoveredCard === article.id
                            ? "scale-110 rotate-2"
                            : "scale-100"
                        }`}
                        loading="lazy"
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${
                          hoveredCard === article.id
                            ? "from-black/80 to-transparent opacity-100"
                            : "from-black/60 to-transparent"
                        }`}
                      />

                      <div
                        className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${
                          categoryThemes[article.category].accent
                        } opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-2xl`}
                      />

                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col space-y-1 sm:space-y-2">
                        {(article.isTrending || activeCategory === "trending") && (
                          <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/50 flex items-center space-x-1 animate-pulse-glow">
                            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>HOT</span>
                          </span>
                        )}
                        <span
                          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r ${
                            categoryThemes[article.category].accent
                          } text-white shadow-xl ${
                            categoryThemes[article.category].glow
                          } backdrop-blur-xl transform group-hover:scale-110 transition-transform flex items-center space-x-1`}
                        >
                          {(() => {
                            const CategoryIcon = getCategoryIcon(article.category);
                            return <CategoryIcon className="w-3 h-3 sm:w-4 sm:h-4" />;
                          })()}
                          <span className="hidden sm:inline">{article.category.toUpperCase()}</span>
                        </span>
                      </div>

                      <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex items-center space-x-1.5 sm:space-x-3">
                        <div className="flex items-center space-x-1 sm:space-x-2 bg-black/70 backdrop-blur-xl px-2 sm:px-3 py-1 sm:py-2 rounded-full">
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          <span className="text-white text-[10px] sm:text-xs font-bold">
                            {article.views}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Article bookmarked!");
                          }}
                          className="hidden sm:block p-2 rounded-full bg-black/70 backdrop-blur-xl hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Bookmark className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigator.share && article.url) {
                              navigator.share({
                                url: article.url,
                                title: article.title,
                              });
                            } else {
                              alert("Share link copied!");
                            }
                          }}
                          className="p-1.5 sm:p-2 rounded-full bg-black/70 backdrop-blur-xl hover:bg-white/20 transition-all sm:opacity-0 group-hover:opacity-100"
                        >
                          <Share2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </button>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSummarize(article.url);
                              }}
                              className="hidden sm:block p-2 rounded-full bg-black/70 backdrop-blur-xl hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                              {loadingSummary === article.url ? (
                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                              ) : (
                                <FileText className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-72 sm:w-80 bg-black/95 backdrop-blur-xl border border-white/20 text-white p-3 sm:p-4 z-50"
                            onClick={(e) => e.stopPropagation()}
                            side="top"
                            align="end"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                <h4 className="font-bold text-base sm:text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                  AI Summary
                                </h4>
                              </div>
                              {loadingSummary === article.url ? (
                                <div className="flex items-center justify-center py-6 sm:py-8">
                                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 animate-spin" />
                                </div>
                              ) : summaries.has(article.url) ? (
                                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                                  {summaries.get(article.url)}
                                </p>
                              ) : (
                                <p className="text-gray-400 text-xs sm:text-sm italic">
                                  Generating summary...
                                </p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6">
                      <h3
                        className={`text-base sm:text-xl font-bold font-display text-white mb-2 sm:mb-3 leading-tight transition-all duration-300 line-clamp-2 ${
                          hoveredCard === article.id
                            ? `bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`
                            : ""
                        }`}
                      >
                        {article.title}
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                        {article.excerpt}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3 text-[10px] sm:text-xs">
                          <div className="flex items-center space-x-1">
                            <Clock className={`w-3 h-3 sm:w-4 sm:h-4 ${theme.text}`} />
                            <span className={`font-semibold ${theme.text}`}>
                              {article.time}
                            </span>
                          </div>
                          {article.readTime && (
                            <span className="text-gray-500">•</span>
                          )}
                          {article.readTime && (
                            <span className="text-gray-400 font-semibold">
                              {article.readTime}
                            </span>
                          )}
                        </div>
                        {article.source && (
                          <span className="hidden sm:inline text-gray-500 text-xs">
                            Source: {article.source}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${theme.accent} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-3xl pointer-events-none`}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Lazy Loading Trigger & Load More Button */}
            {hasMore && (
              <div ref={loadMoreRef} className="mt-8 sm:mt-12 flex justify-center">
                {isLoadingMore ? (
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                    <Loader2 className={`w-6 h-6 sm:w-8 sm:h-8 animate-spin bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`} />
                    <p className="text-gray-400 text-xs sm:text-sm">Loading more articles...</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsLoadingMore(true);
                      setTimeout(() => {
                        setDisplayCount(prev => Math.min(prev + 6, newsArticles.length));
                        setIsLoadingMore(false);
                      }, 300);
                    }}
                    className={`group px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-gradient-to-r ${theme.accent} text-white font-bold text-base sm:text-lg shadow-xl ${theme.glow} hover:shadow-2xl transform active:scale-95 hover:scale-105 transition-all duration-300 flex items-center space-x-2 sm:space-x-3`}
                  >
                    <span>Load More Articles</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}
            
            {/* Show total loaded */}
            {!hasMore && newsArticles.length > 6 && (
              <div className="mt-8 sm:mt-12 text-center">
                <div className={`inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r ${theme.accent} bg-opacity-20 text-white`}>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold text-xs sm:text-base">You've reached the end! All {newsArticles.length} articles loaded.</span>
                </div>
              </div>
            )}
          </>
          )}
        </div>

        {/* Newsletter Section */}
        <div className="mt-12 sm:mt-16 lg:mt-20">
          <div
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r ${theme.accent} p-6 sm:p-10 lg:p-12 shadow-2xl ${theme.glow}`}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-xl mb-4 sm:mb-6">
                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-white mb-3 sm:mb-4">
                Never Miss a Story
              </h3>
              <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 px-4">
                Get AI-enhanced news and exclusive updates delivered straight to
                your inbox
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto px-4 sm:px-0">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSubscribe()}
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30 focus:border-white rounded-full backdrop-blur-xl text-base sm:text-lg"
                />
                <Button
                  onClick={handleSubscribe}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-full text-base sm:text-lg shadow-xl active:scale-95 transition-transform"
                >
                  Subscribe
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-white/70 mt-3 sm:mt-4">
                Join 100,000+ readers. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-2xl bg-black/50 border-t border-white/20 mt-12 sm:mt-16 lg:mt-20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="text-center">
            <div
              className={`inline-flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-gradient-to-r ${theme.accent} shadow-2xl ${theme.glow}`}
            >
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span className="text-white text-sm sm:text-base font-bold font-display">
                NewsFlow AI
              </span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">Stay informed. Stay ahead.</p>
            <p className="text-gray-500 text-[10px] sm:text-xs mt-1.5 sm:mt-2">
              © 2025 NewsFlow AI. All rights reserved.
            </p>
            <p className="text-gray-600 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
              Developed by Tamim Shadman
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
