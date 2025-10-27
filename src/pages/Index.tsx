import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type TouchEvent as ReactTouchEvent,
} from "react";
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
  X,
  Moon,
  Sun,
  Settings,
  CalendarClock,
  Download,
  Smartphone,
  ListChecks,
  Flag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { NewsGridSkeleton, FeaturedSkeleton } from "@/components/NewsSkeletons";
import { ErrorState, EmptyState } from "@/components/ErrorState";
import { useTheme } from "@/contexts/ThemeContext";
import { useChunkedNews } from "@/hooks/useProgressiveNews";
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
import { enhanceArticleWithLLM } from "@/services/llmService";
import type {
  NewsArticle,
  CategoryType,
  NewsAPIArticle,
} from "@/types/news";
import { getCategoryTheme } from "@/lib/categoryThemes";

type QuickActionCard = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action: () => void;
  actionLabel: string;
};

type PersonalStat = {
  id: string;
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
};

const Index = () => {
  const { toast } = useToast();
  const { theme: appTheme } = useTheme();
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);
  const [viewCounts] = useState<Map<string, string>>(new Map());
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Map<string, string>>(new Map());
  const [openSummaryFor, setOpenSummaryFor] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  
  // Lazy loading state
  const [displayCount, setDisplayCount] = useState(6); // Show 1/5th initially (30 articles / 5 = 6)
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const categories = [
    { id: "all" as CategoryType, name: "All News", icon: Newspaper },
    { id: "trending" as CategoryType, name: "Trending", icon: Flame },
    { id: "technology" as CategoryType, name: "Technology", icon: Cpu },
    { id: "sports" as CategoryType, name: "Sports", icon: Trophy },
    { id: "business" as CategoryType, name: "Business", icon: Briefcase },
    { id: "health" as CategoryType, name: "Health", icon: Heart },
    { id: "entertainment" as CategoryType, name: "Entertainment", icon: Film },
    { id: "world" as CategoryType, name: "World", icon: Globe },
    { id: "bangladesh" as CategoryType, name: "Bangladesh", icon: Flag },
  ];

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled((prev) => {
      const next = !prev;
      toast({
        title: next ? "Notifications enabled" : "Notifications paused",
        description: next
          ? "We'll alert you when major stories break."
          : "You can turn alerts back on anytime from the header.",
        duration: 4000,
      });
      return next;
    });
  }, [toast]);

  const toggleLiveUpdates = useCallback(() => {
    setLiveUpdatesEnabled((prev) => {
      const next = !prev;
      toast({
        title: next ? "Live updates resumed" : "Live updates paused",
        description: next
          ? "Fresh headlines will stream in automatically."
          : "Live ticker paused — re-enable it anytime from the header.",
        duration: 4000,
      });
      return next;
    });
  }, [toast]);

  const handleGenerateBriefing = useCallback(() => {
    toast({
      title: "Daily briefing queued",
      description: "An AI digest will be ready in your summaries within a minute.",
      duration: 3800,
    });
  }, [toast]);

  const handleManageSources = useCallback(() => {
    toast({
      title: "Source manager",
      description: "Open your data sources panel to reprioritize beats and regions.",
      duration: 4200,
      action: (
        <ToastAction
          altText="Open source settings"
          onClick={() => window.open("/settings/sources", "_blank")}
        >
          Open
        </ToastAction>
      ),
    });
  }, [toast]);

  const handleSyncDevices = useCallback(() => {
    toast({
      title: "Syncing readers",
      description: "Queued stories will be mirrored across signed-in devices.",
      duration: 3600,
    });
  }, [toast]);

  const handleDownloadOffline = useCallback(() => {
    toast({
      title: "Offline pack building",
      description: "A fresh offline bundle is being prepared for subway mode.",
      duration: 3600,
    });
  }, [toast]);

  // Helper to get category icon
  const getCategoryIcon = (category: CategoryType | string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? cat.icon : Newspaper;
  };

  // Fetch news based on active category or search query
  // Using progressive loading for better UX
  const {
    data: newsData,
    isLoading,
    isFetching,
    error,
    progress: loadingProgress,
  } = useChunkedNews(debouncedSearch ? "all" : activeCategory);
  
  // Search results query (separate from progressive loading)
  const { data: searchData } = useQuery({
    queryKey: ["news-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return null;
      return await searchNews(debouncedSearch);
    },
    enabled: !!debouncedSearch,
    staleTime: 5 * 60 * 1000, // 5 minutes for search
  });

  // Fetch trending articles (2 from each category)
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending-from-categories"],
    queryFn: async (): Promise<Array<NewsAPIArticle & { _category: CategoryType }>> => {
      const categories: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world", "bangladesh"];
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
  const { data: featuredData, isLoading: featuredLoading, error: featuredError } = useQuery({
    queryKey: ["featured-all-categories"],
    queryFn: () => fetchFeaturedFromAllCategories(),
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000, // Refetch every 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
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
      // Generate stable view count for this article
      if (!viewCounts.has(article.url)) {
        viewCounts.set(article.url, generateViewCount());
      }

      return {
        id: article.url,
        title: article.title,
        category: category,
        image:
          article.urlToImage ||
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop",
        time: getTimeAgo(article.publishedAt),
        views: viewCounts.get(article.url)!,
        excerpt:
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
    [viewCounts]
  );

  const featuredNews: NewsArticle[] = useMemo(() => {
    if (!featuredData || featuredData.length === 0) {
      console.warn('⚠️ No featured data available in Index.tsx');
      return [];
    }
    
    console.log(`✅ Converting ${featuredData.length} featured articles to NewsArticle format`);
    console.log('📋 Featured API data URLs:', featuredData.map((a, i) => `[${i}] ${a.url}`));
    
    const converted = featuredData.map((article, index) => {
      // Determine category from the article or use index-based mapping
      const categoryMap: CategoryType[] = ["technology", "business", "sports", "health", "entertainment", "world", "bangladesh"];
      const category = categoryMap[index % categoryMap.length];
      return convertToNewsArticle(article, category);
    });
    
    const uniqueByUrl = converted.filter((article, idx, arr) =>
      article.url ? arr.findIndex((candidate) => candidate.url === article.url) === idx : true
    );
    
    if (uniqueByUrl.length !== converted.length) {
      console.warn(`♻️ Carousel deduplicated ${converted.length - uniqueByUrl.length} duplicate articles by URL.`);
    }

    console.log('🎠 Final carousel NewsArticle URLs:', uniqueByUrl.map((a, i) => `[${i}] ${a.url}`));
    
    return uniqueByUrl;
  }, [featuredData, convertToNewsArticle]);

  useEffect(() => {
    setCurrentSlide(prev => {
      if (featuredNews.length === 0) {
        return 0;
      }

      const maxIndex = featuredNews.length - 1;

      if (prev > maxIndex) {
        return maxIndex;
      }

      if (prev < 0) {
        return 0;
      }

      return prev;
    });
  }, [featuredNews.length]);

  // Use trending data when in trending category, search data when searching, otherwise use progressive news data
  const currentNewsData = debouncedSearch 
    ? searchData 
    : (activeCategory === "trending" ? trendingData : newsData);
  
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

  const activeCategoryLabel = categories.find((cat) => cat.id === activeCategory)?.name ?? "All News";

  const personalStats = useMemo<PersonalStat[]>(() => {
    const total = newsArticles.length;
    const visible = displayedArticles.length;
    const remaining = Math.max(total - visible, 0);
    const chunkValues = Object.values(loadingProgress ?? {});
    const chunkCount = chunkValues.filter(Boolean).length;
    const chunkTotal = chunkValues.length;
    const syncValue = chunkTotal > 0 ? `${chunkCount}/${chunkTotal}` : liveUpdatesEnabled ? "Live" : "Paused";
    const summariesCount = summaries.size;

    return [
      {
        id: "reading-queue",
        label: "Reading queue",
        value: total > 0 ? `${visible}/${total}` : "0",
        caption:
          remaining > 0
            ? `${remaining} more stories lined up below your current view.`
            : total > 0
              ? "Everything in this category is cached for offline reading."
              : "Fetching a fresh batch of headlines for you now.",
        icon: ListChecks,
      },
      {
        id: "ai-digests",
        label: "AI digests saved",
        value: summariesCount.toString(),
        caption:
          summariesCount > 0
            ? "Access your generated summaries from the article popovers anytime."
            : "Trigger a summary on any headline to keep the key points handy.",
        icon: Sparkles,
      },
      {
        id: "sync-status",
        label: "Sync status",
        value: syncValue,
        caption: liveUpdatesEnabled
          ? `Monitoring ${activeCategoryLabel} updates in the background.`
          : "Live updates are paused — resume from the header when you're ready.",
        icon: Zap,
      },
    ];
  }, [
    newsArticles.length,
    displayedArticles.length,
    summaries.size,
    loadingProgress,
    liveUpdatesEnabled,
    activeCategoryLabel,
  ]);

  const quickActions = useMemo<QuickActionCard[]>(
    () => [
      {
        id: "briefing",
        title: "Run daily briefing",
        description: "Generate a five-minute digest across your pinned beats.",
        icon: CalendarClock,
        action: handleGenerateBriefing,
        actionLabel: "Generate now",
      },
      {
        id: "sources",
        title: "Triage sources",
        description: "Rebalance newsletters, RSS feeds, and local outlets.",
        icon: Settings,
        action: handleManageSources,
        actionLabel: "Open manager",
      },
      {
        id: "sync",
        title: "Sync devices",
        description: "Mirror your reading queue to phone and tablet instantly.",
        icon: Smartphone,
        action: handleSyncDevices,
        actionLabel: "Sync now",
      },
      {
        id: "offline",
        title: "Build offline pack",
        description: "Download the latest headlines for flights or offline stretches.",
        icon: Download,
        action: handleDownloadOffline,
        actionLabel: "Build pack",
      },
    ],
    [
      handleGenerateBriefing,
      handleManageSources,
      handleSyncDevices,
      handleDownloadOffline,
    ],
  );

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
    if (featuredNews.length <= 1) return;
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

  const handleArticleClick = useCallback((url?: string, title?: string) => {
    if (url) {
      console.log('🖱️ Article clicked:', title?.substring(0, 40) + '...', '→', url);
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      console.warn('⚠️ Article clicked but no URL provided for:', title);
    }
  }, []);

  const handleSummarize = useCallback(async (articleUrl: string) => {
    // If summary already exists, just return (popover will display it)
    if (summaries.has(articleUrl)) {
      return;
    }

    // Start loading
    setLoadingSummary(articleUrl);

    try {
      const sourceArticle =
        currentNewsData?.find((a) => a.url === articleUrl) ||
        newsData?.find((a) => a.url === articleUrl) ||
        featuredData?.find((a) => a.url === articleUrl);

      if (!sourceArticle) {
        return;
      }

      const enhanced = await enhanceArticleWithLLM(sourceArticle);
      const summaryText = (enhanced.summary || "").trim();

      // Store the summary
      setSummaries((prev) =>
        new Map(prev).set(
          articleUrl,
          summaryText || "Summary unavailable."
        )
      );
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
  }, [summaries, currentNewsData, newsData, featuredData]);

  const theme = getCategoryTheme(activeCategory);
  const activeSlideTheme = featuredNews[currentSlide]
    ? getCategoryTheme(featuredNews[currentSlide].category)
    : theme;

  const cancelSummaryLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartPosRef.current = null;
  }, []);

  const startSummaryLongPress = useCallback(
  (event: ReactTouchEvent, article: NewsArticle) => {
      const touch = event.touches[0];
      if (touch) {
        longPressStartPosRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
      cancelSummaryLongPress();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        longPressTimerRef.current = null;
        longPressStartPosRef.current = null;
        if (article.url) {
          setOpenSummaryFor(article.url);
          handleSummarize(article.url);
        }
      }, 2000);
    },
    [cancelSummaryLongPress, handleSummarize]
  );

  const handleSummaryTouchMove = useCallback(
    (event: ReactTouchEvent) => {
      if (longPressTimerRef.current === null || !longPressStartPosRef.current) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = Math.abs(touch.clientX - longPressStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - longPressStartPosRef.current.y);

      if (deltaX > 10 || deltaY > 10) {
        cancelSummaryLongPress();
      }
    },
    [cancelSummaryLongPress]
  );

  const handleCardClick = useCallback(
    (article: NewsArticle) => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        cancelSummaryLongPress();
        return;
      }

      handleArticleClick(article.url, article.title);
    },
    [cancelSummaryLongPress, handleArticleClick]
  );

  useEffect(() => {
    return () => {
      cancelSummaryLongPress();
      longPressTriggeredRef.current = false;
    };
  }, [cancelSummaryLongPress]);

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
                  className="w-full pl-11 pr-4 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/40 rounded-full transition-all"
                />
              </div>
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={toggleNotifications}
                aria-pressed={notificationsEnabled}
                aria-label={`${notificationsEnabled ? "Disable" : "Enable"} breaking alerts`}
                className={`relative p-1.5 sm:p-2 rounded-full backdrop-blur-xl transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  notificationsEnabled
                    ? "bg-white/20 border border-white/40 text-amber-300 shadow-lg"
                    : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
                }`}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {notificationsEnabled && (
                  <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_4px_rgba(0,0,0,0.6)]" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleLiveUpdates}
                aria-pressed={liveUpdatesEnabled}
                aria-label={liveUpdatesEnabled ? "Pause live updates" : "Resume live updates"}
                className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  liveUpdatesEnabled
                    ? `bg-gradient-to-r ${theme.accent} text-white shadow-xl ${theme.glow} animate-pulse-slow`
                    : "bg-white/10 text-gray-300 border border-white/20 shadow-inner"
                }`}
              >
                {liveUpdatesEnabled ? (
                  <>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-ping" />
                    <span>LIVE</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-300" />
                    <span>LIVE PAUSED</span>
                  </>
                )}
              </button>
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
                className="w-full pl-10 pr-4 py-2 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/40 rounded-full text-sm transition-all"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Category Navigation - Responsive & Touch-Friendly */}
      <nav className="sticky z-10 top-[120px] sm:top-[89px] backdrop-blur-2xl bg-black/40 border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-nowrap lg:flex-wrap gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible py-3 sm:py-5 scrollbar-hide scroll-smooth justify-start lg:justify-center">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              const catTheme = getCategoryTheme(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold whitespace-nowrap transition-all duration-300 transform hover:scale-105 sm:hover:scale-110 active:scale-95 ${
                    isActive
                      ? `bg-gradient-to-r ${catTheme.accent} text-white shadow-2xl ${catTheme.glow} scale-105`
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
                <span className="hidden sm:inline">Featured: </span>Tech • Business • Sports • Health • Entertainment • World • Bangladesh
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
          ) : featuredError ? (
            <div className="relative h-[400px] sm:h-[500px] lg:h-[550px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-black/30 backdrop-blur-2xl flex items-center justify-center">
              <div className="text-center p-6 sm:p-12">
                <div className={`inline-flex items-center justify-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${theme.accent} bg-opacity-20 mb-4 sm:mb-6`}>
                  <TrendingUp className="w-10 h-10 sm:w-16 sm:h-16 text-white opacity-50" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">Loading Featured Stories</h3>
                <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">
                  Fetching the latest stories from all categories. This may take a moment...
                </p>
              </div>
            </div>
          ) : featuredNews.length > 0 ? (
            <div className="relative group">
              {/* Dynamic background glow based on active slide */}
              <div
                className={`absolute inset-0 -z-10 blur-3xl opacity-30 transition-all duration-1000 bg-gradient-to-r ${activeSlideTheme.accent}`}
                style={{ transform: "scale(1.1)" }}
              />
              <div
                className={`relative h-[400px] sm:h-[500px] lg:h-[550px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-2 transition-all duration-1000 ${activeSlideTheme.ring} ${activeSlideTheme.glow}`}
              >
                {featuredNews.map((news, index) => {
                  const isActive = index === currentSlide;
                  const isPrev = index === (currentSlide - 1 + featuredNews.length) % featuredNews.length;
                  const slideTheme = getCategoryTheme(news.category);
                  return (
                    <div
                      key={`${news.id}-${index}`}
                      onClick={() => handleArticleClick(news.url, news.title)}
                      className={`absolute inset-0 transition-all duration-1000 transform cursor-pointer ${
                        isActive
                          ? "opacity-100 scale-100 rotate-0 z-30"
                          : isPrev
                            ? "opacity-0 scale-95 -rotate-2 z-10"
                            : "opacity-0 scale-105 rotate-2 z-10"
                      }`}
                      style={{ pointerEvents: isActive ? "auto" : "none" }}
                    >
                      <div className="relative h-full w-full">
                        <img
                          src={news.image}
                          alt={news.title}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />

                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                          {[...Array(10)].map((_, i) => (
                            <div
                              key={i}
                              className={`absolute w-2 h-2 bg-gradient-to-r ${slideTheme.accent} rounded-full animate-float-particle`}
                              style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${i * 0.5}s`,
                                animationDuration: `${3 + Math.random() * 2}s`,
                              }}
                            />
                          ))}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-10 pointer-events-auto">
                          <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-5">
                            {news.isTrending && (
                              <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/50 animate-pulse-glow flex items-center space-x-1">
                                <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span>TRENDING</span>
                              </span>
                            )}
                            <span
                              className={`px-3 sm:px-5 py-1 sm:py-2 rounded-full text-xs sm:text-base font-black bg-gradient-to-r ${
                                slideTheme.accent
                              } text-white shadow-2xl ${
                                slideTheme.glow
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
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log(`🔘 Read Full Story button clicked for: ${news.title.substring(0, 40)}...`);
                                if (news.url) {
                                  window.open(news.url, "_blank", "noopener,noreferrer");
                                }
                              }}
                              className={`px-6 py-3 rounded-full bg-gradient-to-r ${slideTheme.accent} text-white font-bold shadow-xl ${slideTheme.glow} hover:scale-105 transition-transform flex items-center space-x-2`}
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
                    </div>
                  );
                })}
              </div>

              {featuredNews.length > 1 && (
                <>
                  {/* Navigation Buttons - Responsive with dynamic theme */}
                  <button
                    onClick={prevSlide}
                    className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 flex items-center justify-center p-2 sm:p-3 rounded-full bg-black/70 backdrop-blur-xl text-white hover:bg-gradient-to-r ${
                      activeSlideTheme.accent
                    } transition-all hover:scale-110 active:scale-95 shadow-xl border border-white/30 z-40`}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 flex items-center justify-center p-2 sm:p-3 rounded-full bg-black/70 backdrop-blur-xl text-white hover:bg-gradient-to-r ${
                      activeSlideTheme.accent
                    } transition-all hover:scale-110 active:scale-95 shadow-xl border border-white/30 z-40`}
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Carousel Indicators - Responsive with dynamic theme */}
                  <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 sm:space-x-3 z-40">
                    {featuredNews.map((news, index) => {
                      const indicatorTheme = getCategoryTheme(news.category);
                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentSlide(index)}
                          className={`transition-all duration-300 rounded-full ${
                            index === currentSlide
                              ? `bg-gradient-to-r ${indicatorTheme.accent} w-8 sm:w-12 h-2 sm:h-3 shadow-xl ${indicatorTheme.glow}`
                              : "bg-white/40 w-2 sm:w-3 h-2 sm:h-3 hover:bg-white/60"
                          }`}
                          aria-label={`Go to slide ${index + 1}: ${news.category}`}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative h-[400px] sm:h-[500px] lg:h-[550px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl ring-2 ring-white/10 bg-black/30 backdrop-blur-2xl flex items-center justify-center">
              <div className="text-center p-6 sm:p-12">
                <div className={`inline-flex items-center justify-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${theme.accent} bg-opacity-20 mb-4 sm:mb-6`}>
                  <Sparkles className="w-10 h-10 sm:w-16 sm:h-16 text-white opacity-50" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">No Featured Stories Yet</h3>
                <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">
                  We're gathering the best stories for you. Check back in a moment!
                </p>
              </div>
            </div>
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
              onRetry={() => window.location.reload()}
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
              {/* Progressive Loading Indicator */}
              {isFetching && newsArticles.length > 0 && (
                <div className={`mb-6 p-5 rounded-2xl bg-gradient-to-r ${theme.accent} bg-opacity-10 border-2 border-white/20 backdrop-blur-xl animate-pulse`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      <span className="text-sm font-bold text-white">
                        Loading more articles...
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {loadingProgress.first && (
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${theme.accent} shadow-lg animate-pulse`} />
                      )}
                      {loadingProgress.second && (
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${theme.accent} shadow-lg animate-pulse`} />
                      )}
                      {loadingProgress.third && (
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${theme.accent} shadow-lg animate-pulse`} />
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {displayedArticles.map((article, idx) => {
                  // Determine if card is on the left or right edge to adjust hover position
                  const isFirstColumn = idx % 3 === 0; // First column in 3-col grid
                  const isLastColumn = idx % 3 === 2; // Last column in 3-col grid
                  const articleTheme = getCategoryTheme(article.category);
                  const rawSummary = summaries.get(article.url);
                  const summaryPoints = rawSummary
                    ? rawSummary
                        .split(/[.!?]+/)
                        .map((point) => point.trim())
                        .filter((point) => point.length > 20)
                        .slice(0, 6)
                    : [];
                  
                  return (
                  <div
                    key={article.id}
                    id={`article-${article.id}`}
                    onMouseEnter={() => setHoveredCard(article.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleCardClick(article)}
                    onTouchStart={(event) => startSummaryLongPress(event, article)}
                    onTouchEnd={cancelSummaryLongPress}
                    onTouchCancel={cancelSummaryLongPress}
                    onTouchMove={handleSummaryTouchMove}
                    className={`group cursor-pointer scroll-mt-24 ${hoveredCard === article.id ? 'z-[150]' : 'z-10'} relative`}
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
                    }}
                  >
                  <div className="relative">
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
                        className="w-full h-full object-cover transition-all duration-700"
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
                        className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${articleTheme.accent} opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-2xl`}
                      />

                      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col space-y-1 sm:space-y-2">
                        {(article.isTrending || activeCategory === "trending") && (
                          <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-xl shadow-orange-500/50 flex items-center space-x-1 animate-pulse-glow">
                            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>HOT</span>
                          </span>
                        )}
                        <span
                          className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold bg-gradient-to-r ${articleTheme.accent} text-white shadow-xl ${articleTheme.glow} backdrop-blur-xl transform group-hover:scale-110 transition-transform flex items-center space-x-1`}
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
                        <Popover
                          open={openSummaryFor === article.url}
                          onOpenChange={(isOpen) => {
                            if (isOpen) {
                              setOpenSummaryFor(article.url);
                              handleSummarize(article.url);
                            } else {
                              setOpenSummaryFor(prev => (prev === article.url ? null : prev));
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className={`flex items-center justify-center p-1.5 sm:p-2 rounded-full bg-black/70 backdrop-blur-xl text-white transition-all sm:opacity-0 group-hover:opacity-100 hover:bg-gradient-to-r ${articleTheme.accent} hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-95`}
                              title="AI Summary"
                              aria-label="Open AI summary"
                            >
                              {loadingSummary === article.url ? (
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-spin" />
                              ) : (
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className={`relative w-[min(90vw,420px)] h-[70vh] rounded-3xl border ${articleTheme.ring} bg-black/80 text-white backdrop-blur-2xl z-[110] animate-slide-in shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden`}
                            onClick={(e) => e.stopPropagation()}
                            side="bottom"
                            align="center"
                            sideOffset={18}
                            avoidCollisions={true}
                            collisionPadding={16}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${articleTheme.accent} opacity-25 pointer-events-none`} />
                            <div className="absolute inset-0 bg-black/80 pointer-events-none" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenSummaryFor((prev) => (prev === article.url ? null : prev));
                                setLoadingSummary((prev) => (prev === article.url ? null : prev));
                                cancelSummaryLongPress();
                              }}
                              className="absolute top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition-all hover:bg-white/10 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer"
                              aria-label="Close summary"
                            >
                              <X className="w-4 h-4 pointer-events-none" />
                            </button>
                            {/* Header - Fixed */}
                            <div className="relative z-10 flex-shrink-0 p-5 sm:p-6 border-b border-white/10">
                              <div className="flex items-start justify-between gap-3">
                                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${articleTheme.accent} text-white`}>
                                  <Sparkles className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
                                    AI Summary
                                  </p>
                                  <p className="text-sm text-white/60">
                                    Quick take generated for {article.source ?? "this article"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {/* Scrollable Content */}
                            <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-6 py-4 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-white/5 hover:scrollbar-thumb-white/40">
                              {loadingSummary === article.url ? (
                                <div className="flex h-full min-h-[180px] flex-col items-center justify-center space-y-4 text-white/70">
                                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                                  <p className="text-sm font-medium">Generating AI summary...</p>
                                </div>
                              ) : rawSummary ? (
                                <div className="space-y-5">
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 text-sm sm:text-base leading-relaxed text-white/80 shadow-lg shadow-black/30">
                                    {rawSummary}
                                  </div>
                                  {summaryPoints.length > 0 && (
                                    <div className="space-y-3">
                                      <h5 className={`text-xs font-semibold uppercase tracking-[0.35em] ${articleTheme.text}`}>
                                        Key insights
                                      </h5>
                                      <ul className="space-y-3">
                                        {summaryPoints.map((point, insightIndex) => (
                                          <li
                                            key={insightIndex}
                                            className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/45 p-3 text-sm sm:text-base text-white/75 transition duration-200 hover:border-white/20 hover:bg-black/55"
                                          >
                                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-white/70" />
                                            <span className="leading-relaxed">{point}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="py-8 text-center text-sm text-white/60">
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
                  </div>
                );
              })}
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

        {/* Personal Command Center */}
        <div className="mt-12 sm:mt-16 lg:mt-20">
          <div
            className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r ${theme.accent} p-6 sm:p-10 lg:p-12 shadow-2xl ${theme.glow}`}
          >
            <div className="absolute inset-0 bg-black/25" />
            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center justify-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-xl mb-4 sm:mb-6">
                <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-white mb-3 sm:mb-4">
                Personal Command Center
              </h3>
              <p className="text-base sm:text-lg lg:text-xl text-white/90 px-4">
                Dial in the controls you actually rely on while running NewsFlow day to day.
              </p>
            </div>

            <div className="relative z-10 mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {personalStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.id}
                    className="rounded-2xl border border-white/20 bg-black/30 p-5 sm:p-6 text-left shadow-lg shadow-black/30 backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:bg-black/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-white/75 leading-relaxed">
                      {stat.caption}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="relative z-10 mt-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <h4 className="text-center sm:text-left text-xs sm:text-sm font-semibold uppercase tracking-[0.4em] text-white/70">
                  Quick actions
                </h4>
                <p className="text-center sm:text-right text-sm text-white/70">
                  Automations tailored for a personal workflow — launch what you need in a tap.
                </p>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {quickActions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-5 sm:p-6 shadow-lg shadow-black/30 backdrop-blur-xl transition-all duration-300 hover:border-white/25 hover:bg-white/10"
                    >
                      <div>
                        <div className="flex items-start gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${theme.accent} text-white shadow-lg shadow-black/30`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h5 className="text-lg font-semibold text-white">
                              {item.title}
                            </h5>
                            <p className="mt-2 text-sm text-white/70">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={item.action}
                        className="mt-6 w-full justify-center rounded-full bg-white text-gray-900 font-semibold shadow-lg shadow-black/20 transition-all hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        {item.actionLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 mt-8 flex flex-col items-center gap-2 text-center text-white/70 text-sm sm:text-base">
              <span>
                Tip: Install this PWA from your browser menu to keep the control center one tap away.
              </span>
              <span>
                Data refresh respects your live toggle and personal source weighting.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 backdrop-blur-2xl ${
        appTheme === "dark" ? "bg-black/50" : "bg-white/50"
      } border-t ${
        appTheme === "dark" ? "border-white/20" : "border-gray-200"
      } mt-12 sm:mt-16 lg:mt-20 shadow-2xl`}>
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
