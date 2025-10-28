import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Clock,
  Filter,
  LayoutGrid,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Star,
  UserRound,
  View,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fetchResearchPapers } from "@/services/researchService";
import type { ResearchPaper, ResearchSource } from "@/types/news";

const SOURCE_OPTIONS: Array<{ value: ResearchSource | "all"; label: string }> = [
  { value: "all", label: "All sources" },
  { value: "arxiv", label: "arXiv" },
  { value: "semantic_scholar", label: "Semantic Scholar" },
  { value: "hugging_face", label: "Hugging Face Daily" },
];

type ViewMode = "reader" | "grid";

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const MAX_AUTHORS_IN_COMPACT_VIEW = 3;

function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) {
    return "Unknown authors";
  }
  if (authors.length <= MAX_AUTHORS_IN_COMPACT_VIEW) {
    return authors.join(", ");
  }
  const primary = authors.slice(0, MAX_AUTHORS_IN_COMPACT_VIEW).join(", ");
  return `${primary} +${authors.length - MAX_AUTHORS_IN_COMPACT_VIEW} more`;
}

function PaperMetadata({
  paper,
  showSource = true,
}: {
  paper: ResearchPaper;
  showSource?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
      <div className="flex items-center gap-1.5">
        <Clock className="h-4 w-4" />
        <span>{dateFormatter.format(new Date(paper.publishedAt))}</span>
      </div>
      {paper.citations != null && paper.citations > 0 && (
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4" />
          <span>{paper.citations.toLocaleString()} citations</span>
        </div>
      )}
      {paper.venue && (
        <div className="flex items-center gap-1.5">
          <View className="h-4 w-4" />
          <span>{paper.venue}</span>
        </div>
      )}
      {showSource && (
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" />
          <span>{paper.sourceName}</span>
        </div>
      )}
    </div>
  );
}

function PaperTagList({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 6).map((tag) => (
        <Badge key={tag} variant="secondary" className="bg-slate-800 text-slate-200">
          {tag}
        </Badge>
      ))}
    </div>
  );
}

function PaperCard({
  paper,
  isActive,
  onSelect,
}: {
  paper: ResearchPaper;
  isActive: boolean;
  onSelect: (paper: ResearchPaper) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(paper)}
      className={`group w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-left transition-all hover:border-slate-600 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
        isActive ? "border-slate-500 bg-slate-900" : ""
      }`}
    >
      <div className="flex flex-col gap-3">
        <PaperMetadata paper={paper} />
        <h3 className="text-lg font-semibold text-slate-50 group-hover:text-slate-100">
          {paper.title}
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <UserRound className="h-4 w-4" />
          <span>{formatAuthors(paper.authors)}</span>
        </div>
        <p className="line-clamp-3 text-sm text-slate-300">
          {paper.summary || "Abstract not available."}
        </p>
        <PaperTagList tags={paper.tags} />
      </div>
    </button>
  );
}

function PaperGridCard({ paper }: { paper: ResearchPaper }) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg shadow-black/30 transition-transform hover:-translate-y-1 hover:border-slate-600">
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
        <span>{paper.sourceName}</span>
        <span>{dateFormatter.format(new Date(paper.publishedAt))}</span>
      </div>
      <h3 className="text-xl font-semibold text-slate-50">{paper.title}</h3>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <UserRound className="h-4 w-4" />
        <span>{formatAuthors(paper.authors)}</span>
      </div>
      <p className="line-clamp-4 text-sm leading-relaxed text-slate-300">
        {paper.summary || "Abstract not available."}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <PaperTagList tags={paper.tags} />
        <Button size="sm" variant="secondary" className="gap-2" asChild>
          <a href={paper.url} target="_blank" rel="noopener noreferrer">
            Read paper
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

const readerBackdrop = "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950";

const readerCard = "rounded-3xl border border-slate-800 bg-slate-900/60 shadow-[0px_30px_120px_rgba(2,6,23,0.45)]";

const shimmer = "bg-gradient-to-r from-transparent via-slate-800/40 to-transparent";

function ReaderSkeleton() {
  return (
    <div className={`${readerCard} animate-pulse p-8`}>
      <div className="mb-6 h-4 w-24 rounded-full bg-slate-700" />
      <div className="mb-4 h-10 w-3/4 rounded-full bg-slate-700" />
      <div className="mb-6 h-4 w-48 rounded-full bg-slate-700" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`h-3 rounded-full ${shimmer}`} />
        ))}
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-32 w-full animate-pulse rounded-2xl bg-slate-900/60" />
      ))}
    </div>
  );
}

const readerFocusGradient = "absolute inset-0 rounded-3xl bg-gradient-to-br from-slate-800/25 via-slate-900/40 to-slate-950/80";

const highlightRing = "ring-1 ring-slate-500/40";

const focusGlow = "shadow-[0px_0px_120px_rgba(76,106,255,0.18)]";

function Research() {
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState<ResearchSource | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("reader");
  const [focusPaperId, setFocusPaperId] = useState<string | null>(null);

  const {
    data: papers = [],
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["research-papers", { source: sourceFilter }],
    queryFn: () => fetchResearchPapers({ limit: 60, source: sourceFilter }),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filteredPapers = useMemo(() => {
    if (!papers || papers.length === 0) return [];
    const normalized = searchInput.trim().toLowerCase();
    if (!normalized) return papers;
    return papers.filter((paper) => {
      const haystack = `${paper.title ?? ""} ${paper.summary ?? ""} ${(paper.tags ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [papers, searchInput]);

  const focusPaper = useMemo(() => {
    if (filteredPapers.length === 0) return null;
    if (focusPaperId) {
      return filteredPapers.find((paper) => paper.id === focusPaperId) ?? filteredPapers[0];
    }
    return filteredPapers[0];
  }, [filteredPapers, focusPaperId]);

  useEffect(() => {
    if (filteredPapers.length > 0 && (!focusPaperId || !filteredPapers.some((paper) => paper.id === focusPaperId))) {
      setFocusPaperId(filteredPapers[0].id);
    }
  }, [filteredPapers, focusPaperId]);

  const handleSourceChange = (value: ResearchSource | "all") => {
    setSourceFilter(value);
    setFocusPaperId(null);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div className={`min-h-screen ${readerBackdrop} text-slate-100`}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:px-6">
        <header className="flex flex-col gap-6 border-b border-slate-800 pb-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="gap-2 text-slate-300 hover:bg-slate-900"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Newsflow
            </Button>
            <Button
              variant="outline"
              className="gap-2 border-slate-700 text-slate-200 hover:bg-slate-900"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh feed
            </Button>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1 text-xs uppercase tracking-[0.4em] text-slate-400">
              <Sparkles className="h-3.5 w-3.5" />
              AI Research Reader
            </div>
            <h1 className="text-3xl font-bold leading-tight text-slate-50 sm:text-4xl">
              Curated AI & ML research from the last 12 months
            </h1>
            <p className="max-w-3xl text-base text-slate-400">
              Deep-dive into arXiv preprints, Semantic Scholar publications, and Hugging Face trending papers. The layout focuses on reading comfort with typography tuned for long-form abstracts.
            </p>
            {papers.length > 0 && (
              <p className="text-sm text-slate-500">
                Showing {filteredPapers.length} papers · Updated {dateFormatter.format(new Date())}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search titles, abstracts, or tags"
                className="w-full rounded-full border-slate-700 bg-slate-950/80 pl-11 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Filter className="h-4 w-4" />
                Source
              </div>
              <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={sourceFilter === option.value ? "default" : "outline"}
                    className={`rounded-full border-slate-700 ${sourceFilter === option.value ? "bg-slate-200 text-slate-900" : "bg-slate-950/60 text-slate-200"}`}
                    onClick={() => handleSourceChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={viewMode === "reader" ? "default" : "outline"}
                className={`rounded-full border-slate-700 ${viewMode === "reader" ? "bg-slate-200 text-slate-900" : "bg-slate-950/60 text-slate-200"}`}
                onClick={() => setViewMode("reader")}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Reader
              </Button>
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "outline"}
                className={`rounded-full border-slate-700 ${viewMode === "grid" ? "bg-slate-200 text-slate-900" : "bg-slate-950/60 text-slate-200"}`}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Grid
              </Button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mt-10 rounded-3xl border border-red-900/50 bg-red-900/20 p-6 text-red-200">
            <h2 className="mb-2 text-lg font-semibold">Failed to load research feed</h2>
            <p className="text-sm opacity-80">
              {(error as Error).message || "An unexpected error occurred while fetching papers."}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
            <ReaderSkeleton />
            <SidebarSkeleton />
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <BookOpen className="h-10 w-10 text-slate-500" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-100">No papers found</h2>
              <p className="text-sm text-slate-400">
                Try broadening your search or clearing the filters to see more AI/ML research from the last year.
              </p>
            </div>
          </div>
        ) : viewMode === "reader" ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
            <article className={`${readerCard} relative overflow-hidden p-10 ${focusGlow}`}>
              <div className={readerFocusGradient} />
              <div className="relative z-10 space-y-6">
                <Badge className="rounded-full bg-slate-200 text-xs font-semibold uppercase tracking-[0.45em] text-slate-900">
                  {focusPaper?.sourceName || "Research"}
                </Badge>
                <h2 className="text-3xl font-bold leading-tight text-slate-50">
                  {focusPaper?.title}
                </h2>
                {focusPaper && (
                  <div className={`rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 ${highlightRing}`}>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                      <UserRound className="h-4 w-4" />
                      <span>{formatAuthors(focusPaper.authors)}</span>
                    </div>
                    <div className="mt-4 space-y-3 text-base leading-relaxed text-slate-200">
                      {focusPaper.summary?.split(/\n+/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      )) || <p>Abstract not available for this paper.</p>}
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <PaperMetadata paper={focusPaper} showSource={false} />
                      <div className="flex gap-3">
                        {focusPaper.pdfUrl && (
                          <Button variant="secondary" className="gap-2" size="sm" asChild>
                            <a href={focusPaper.pdfUrl} target="_blank" rel="noopener noreferrer">
                              View PDF
                              <ArrowUpRight className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="default" className="gap-2" size="sm" asChild>
                          <a href={focusPaper.url} target="_blank" rel="noopener noreferrer">
                            Open source
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-6">
                      <PaperTagList tags={focusPaper.tags} />
                    </div>
                  </div>
                )}
              </div>
            </article>

            <aside className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-100">Quick browse</h3>
              <div className="space-y-4 overflow-y-auto pr-1 lg:max-h-[calc(100vh-320px)]">
                {filteredPapers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    isActive={paper.id === focusPaper?.id}
                    onSelect={(selected) => setFocusPaperId(selected.id)}
                  />
                ))}
              </div>
            </aside>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPapers.map((paper) => (
              <PaperGridCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Research;
