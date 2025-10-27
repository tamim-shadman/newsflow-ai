import type { ArticleContent } from "@/types/news";

const API_ROUTE = "/api/fetch-article";

export async function fetchArticleContent(articleUrl: string): Promise<ArticleContent> {
  if (!articleUrl) {
    throw new Error("Article URL is required");
  }

  const response = await fetch(`${API_ROUTE}?url=${encodeURIComponent(articleUrl)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch article (status ${response.status})`);
  }

  const article = (await response.json()) as ArticleContent;

  if (!article?.content) {
    throw new Error("Article content is missing in the response");
  }

  return article;
}
