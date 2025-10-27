import { useEffect, useState } from "react";
import { X, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { fetchArticleContent } from "@/services/articleService";
import type { ArticleContent } from "@/types/news";
import { Button } from "@/components/ui/button";

interface ArticleModalProps {
  articleUrl: string;
  onClose: () => void;
}

export function ArticleModal({ articleUrl, onClose }: ArticleModalProps) {
  const [article, setArticle] = useState<ArticleContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        const content = await fetchArticleContent(articleUrl);
        setArticle(content);
      } catch (err) {
        console.error("Failed to load article:", err);
        setError(err instanceof Error ? err.message : "Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [articleUrl]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
            ) : article?.title ? (
              <h2 className="text-xl font-bold truncate">{article.title}</h2>
            ) : (
              <h2 className="text-xl font-bold text-muted-foreground">Article</h2>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 ml-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading article content...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div>
                <p className="text-lg font-semibold mb-2">Failed to Load Article</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => window.open(articleUrl, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Read Original Article
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && article && (
            <div className="space-y-6">
              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-4 border-b border-border">
                {article.author && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">By</span> {article.author}
                  </span>
                )}
                {article.source && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium">Source:</span> {article.source}
                  </span>
                )}
                {article.publishedDate && (
                  <span>
                    {new Date(article.publishedDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                {article.wordCount && (
                  <span>{article.wordCount.toLocaleString()} words</span>
                )}
                <span className="ml-auto px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {article.provider === "jina-reader" ? "Jina Reader" : "Mercury Parser"}
                </span>
              </div>

              {/* Featured Image */}
              {article.imageUrl && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={article.imageUrl}
                    alt={article.title || "Article image"}
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Excerpt */}
              {article.excerpt && (
                <div className="text-lg text-muted-foreground italic border-l-4 border-primary pl-4">
                  {article.excerpt}
                </div>
              )}

              {/* Main Content */}
              <div
                className="prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-foreground
                  prose-p:text-foreground/90 prose-p:leading-relaxed
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-ul:text-foreground/90 prose-ol:text-foreground/90
                  prose-li:marker:text-primary
                  prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                  prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border
                  prose-img:rounded-lg prose-img:shadow-md"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && article && (
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Fetched via {article.provider === "jina-reader" ? "Jina Reader API" : "Mercury Parser"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(articleUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Read Original
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
