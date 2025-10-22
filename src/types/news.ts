export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  image: string;
  time: string;
  views: string;
  excerpt: string;
  readTime?: string;
  isTrending?: boolean;
  url?: string;
  source?: string;
  publishedAt?: string;
  content?: string;
  author?: string;
}

export interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

export interface EnhancedArticle {
  originalTitle: string;
  enhancedTitle: string;
  originalExcerpt: string;
  enhancedExcerpt: string;
  summary: string;
  keyPoints: string[];
}

export type CategoryType =
  | "all"
  | "trending"
  | "business"
  | "technology"
  | "health"
  | "sports"
  | "entertainment"
  | "world";

export interface CategoryTheme {
  gradient: string;
  bg: string;
  accent: string;
  text: string;
  glow: string;
}

// Live Scores interfaces
export interface LiveScore {
  id: string;
  sport: 'football' | 'cricket';
  status: 'live' | 'scheduled' | 'finished';
  league: string;
  homeTeam: {
    name: string;
    logo?: string;
    score?: number | string;
  };
  awayTeam: {
    name: string;
    logo?: string;
    score?: number | string;
  };
  matchTime: string;
  venue?: string;
  startTime?: string;
  url?: string;
  source: string;
  lastUpdated: string;
}

export interface CricketScore extends LiveScore {
  sport: 'cricket';
  homeTeam: {
    name: string;
    logo?: string;
    score?: string; // "250/5 (45.3 overs)"
    innings?: string;
  };
  awayTeam: {
    name: string;
    logo?: string;
    score?: string;
    innings?: string;
  };
  currentOver?: string;
  runRate?: string;
  target?: string;
}
