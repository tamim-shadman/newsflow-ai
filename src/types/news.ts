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
