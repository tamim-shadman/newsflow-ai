import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Atom,
  BookOpen,
  BookMarked,
  CircuitBoard,
  Clock,
  FileSearch,
  FileText,
  Filter,
  GraduationCap,
  Globe,
  Globe2,
  LayoutGrid,
  Layers,
  Library,
  Loader2,
  Network,
  RefreshCcw,
  ScrollText,
  Search,
  FlaskConical,
  Sparkles,
  Star,
  UserRound,
  View,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchResearchPapers, groupPapersBySource } from "@/services/researchService";
import type { ResearchPaper, ResearchSource } from "@/types/news";

const SOURCE_ORDER: ResearchSource[] = [
  "arxiv",
  "semantic_scholar",
  "hugging_face",
  "core",
  "doaj",
  "zenodo",
  "plos_one",
  "ssrn",
  "openalex",
  "europe_pmc",
  "ieee_open_access",
  "openml",
  "citeseerx",
];

const SOURCE_DETAILS: Record<ResearchSource, { label: string; accent: string; stroke: string; icon: LucideIcon }> = {
  arxiv: {
    label: "arXiv",
    accent: "from-rose-500 via-orange-500 to-amber-400",
    stroke: "border-rose-400/50",
    icon: Library,
  },
  semantic_scholar: {
    label: "Semantic Scholar",
    accent: "from-sky-500 via-indigo-500 to-blue-500",
    stroke: "border-sky-400/60",
    icon: GraduationCap,
  },
  hugging_face: {
    label: "Hugging Face Daily",
    accent: "from-amber-400 via-pink-500 to-rose-500",
    stroke: "border-amber-400/50",
    icon: Sparkles,
  },
  core: {
    label: "CORE",
    accent: "from-violet-500 via-purple-500 to-indigo-500",
    stroke: "border-violet-400/50",
    icon: Layers,
  },
  doaj: {
    label: "DOAJ",
    accent: "from-amber-400 via-orange-500 to-yellow-400",
    stroke: "border-amber-400/60",
    icon: BookMarked,
  },
  zenodo: {
    label: "Zenodo",
    accent: "from-cyan-500 via-sky-500 to-blue-500",
    stroke: "border-cyan-400/60",
    icon: Atom,
  },
  plos_one: {
    label: "PLOS ONE",
    accent: "from-rose-400 via-pink-500 to-purple-500",
    stroke: "border-rose-400/60",
    icon: FlaskConical,
  },
  ssrn: {
    label: "SSRN CSRN",
    accent: "from-slate-500 via-blue-500 to-cyan-400",
    stroke: "border-slate-400/60",
    icon: ScrollText,
  },
  openalex: {
    label: "OpenAlex",
    accent: "from-emerald-500 via-cyan-500 to-blue-500",
    stroke: "border-emerald-400/60",
    icon: Globe,
  },
  europe_pmc: {
    label: "Europe PMC",
    accent: "from-sky-500 via-indigo-500 to-blue-600",
    stroke: "border-sky-400/60",
    icon: Globe2,
  },
  ieee_open_access: {
    label: "IEEE Open Access",
    accent: "from-blue-600 via-cyan-500 to-emerald-400",
    stroke: "border-blue-400/60",
    icon: CircuitBoard,
  },
  openml: {
    label: "OpenML",
    accent: "from-lime-500 via-emerald-500 to-teal-500",
    stroke: "border-lime-400/60",
    icon: Network,
  },
  citeseerx: {
    label: "CiteSeerX",
    accent: "from-slate-500 via-indigo-500 to-slate-400",
    stroke: "border-slate-400/60",
    icon: FileSearch,
  },
};

const SOURCE_OPTIONS: Array<{ value: ResearchSource | "all" | "trending"; label: string }> = [
  { value: "all", label: "All sources" },
  { value: "trending", label: "Trending" },
  ...SOURCE_ORDER.map((source) => ({ value: source, label: SOURCE_DETAILS[source].label })),
];

type TextSizeOption = "compact" | "standard" | "comfortable";

const TEXT_SIZE_OPTIONS: Array<{ value: TextSizeOption; label: string }> = [
  { value: "compact", label: "S" },
  { value: "standard", label: "M" },
  { value: "comfortable", label: "L" },
];

const TEXT_CLASS_MAP: Record<TextSizeOption, { heading: string; summary: string; meta: string; spacing: string }> = {
  compact: {
    heading: "text-[2.35rem]",
    summary: "text-[15px] leading-[1.75]",
    meta: "text-[13px]",
    spacing: "space-y-3",
  },
  standard: {
    heading: "text-[2.75rem]",
    summary: "text-[17px] leading-[1.85]",
    meta: "text-sm",
    spacing: "space-y-4",
  },
  comfortable: {
    heading: "text-[3rem]",
    summary: "text-[19px] leading-[1.95]",
    meta: "text-base",
    spacing: "space-y-5",
  },
};

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

function paperIdentifier(paper: ResearchPaper): string {
  const fallback = `${paper.source}-${paper.title ?? "untitled"}`;
  return (paper.id ?? paper.url ?? fallback).toLowerCase();
}

function getPublishedTimestamp(paper: ResearchPaper): number {
  if (!paper.publishedAt) return 0;
  const time = new Date(paper.publishedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareByMomentum(a: ResearchPaper, b: ResearchPaper): number {
  const bCitations = typeof b.citations === "number" ? b.citations : 0;
  const aCitations = typeof a.citations === "number" ? a.citations : 0;
  if (bCitations !== aCitations) {
    return bCitations - aCitations;
  }
  return getPublishedTimestamp(b) - getPublishedTimestamp(a);
}

function buildTrendingSelection(papers: ResearchPaper[], limit = 6): ResearchPaper[] {
  if (!papers || papers.length === 0) return [];
  const sorted = papers.slice().sort(compareByMomentum);
  const perSource = new Map<ResearchSource, ResearchPaper>();

  sorted.forEach((paper) => {
    if (!perSource.has(paper.source)) {
      perSource.set(paper.source, paper);
    }
  });

  const prioritizedSources: ResearchSource[] = [
    ...SOURCE_ORDER.filter((source) => perSource.has(source)),
    ...Array.from(perSource.keys()).filter((source) => !SOURCE_ORDER.includes(source)),
  ];

  const selection: ResearchPaper[] = [];
  const used = new Set<string>();

  prioritizedSources.forEach((source) => {
    const candidate = perSource.get(source);
    if (!candidate) return;
    const key = paperIdentifier(candidate);
    if (used.has(key)) return;
    selection.push(candidate);
    used.add(key);
  });

  for (const paper of sorted) {
    if (selection.length >= limit) break;
    const key = paperIdentifier(paper);
    if (used.has(key)) continue;
    selection.push(paper);
    used.add(key);
  }

  return selection.slice(0, limit);
}

function interleaveBySource(papers: ResearchPaper[]): ResearchPaper[] {
  if (!papers || papers.length < 3) return papers;

  const groups = new Map<ResearchSource, ResearchPaper[]>();
  papers.forEach((paper) => {
    const bucket = groups.get(paper.source) ?? [];
    bucket.push(paper);
    groups.set(paper.source, bucket);
  });

  const orderedSources: ResearchSource[] = [
    ...SOURCE_ORDER.filter((source) => groups.has(source)),
    ...Array.from(groups.keys()).filter((source) => !SOURCE_ORDER.includes(source)),
  ];

  const positions = new Map<ResearchSource, number>();
  const result: ResearchPaper[] = [];
  const used = new Set<string>();
  let added = true;

  while (added) {
    added = false;
    for (const source of orderedSources) {
      const bucket = groups.get(source);
      if (!bucket || bucket.length === 0) continue;
      const index = positions.get(source) ?? 0;
      if (index >= bucket.length) continue;
      const candidate = bucket[index];
      positions.set(source, index + 1);
      const key = paperIdentifier(candidate);
      if (used.has(key)) continue;
      result.push(candidate);
      used.add(key);
      added = true;
    }
  }

  if (result.length < papers.length) {
    papers.forEach((paper) => {
      const key = paperIdentifier(paper);
      if (!used.has(key)) {
        result.push(paper);
        used.add(key);
      }
    });
  }

  return result;
}

function PaperMetadata({
  paper,
  showSource = true,
  showDate = true,
  className,
}: {
  paper: ResearchPaper;
  showSource?: boolean;
  showDate?: boolean;
  className?: string;
}) {
  const hasDate = showDate && !!paper.publishedAt;
  const hasCitations = paper.citations != null && paper.citations > 0;
  const hasVenue = Boolean(paper.venue);
  const hasSource = showSource && Boolean(paper.sourceName);

  if (!hasDate && !hasCitations && !hasVenue && !hasSource) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 text-sm text-slate-400 ${className ?? ""}`}>
      {hasDate && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          <span>{dateFormatter.format(new Date(paper.publishedAt))}</span>
        </div>
      )}
      {hasCitations && (
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4" />
          <span>{paper.citations.toLocaleString()} citations</span>
        </div>
      )}
      {hasVenue && (
        <div className="flex items-center gap-1.5">
          <View className="h-4 w-4" />
          <span>{paper.venue}</span>
        </div>
      )}
      {hasSource && (
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

type ResearchSummary = {
  summary: string;
  keyPoints: string[];
};

function buildSummaryData(paper: ResearchPaper): ResearchSummary {
  const fallback = "Abstract not available for this paper.";
  const rawSummary = (paper.summary ?? "").trim();
  const summary = rawSummary.length > 0 ? rawSummary : fallback;

  const keyPoints = summary
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .slice(0, 6);

  return { summary, keyPoints };
}

function ResearchSummaryPopover({ paper, size = "md" }: { paper: ResearchPaper; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const detail = SOURCE_DETAILS[paper.source];
  const AccentIcon = detail.icon;
  const { summary, keyPoints } = useMemo(() => buildSummaryData(paper), [paper]);

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const padding = size === "sm" ? "p-1.5" : "p-2.5";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className={`group relative flex items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 text-slate-300 backdrop-blur-sm transition-all hover:border-purple-500/50 hover:bg-purple-600/10 hover:text-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${padding}`}
          aria-label="View abstract summary"
        >
          <FileText className={`${iconSize} transition-colors`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={18}
        avoidCollisions
        collisionPadding={24}
        className={`relative w-[min(92vw,420px)] max-w-[420px] rounded-2xl border border-slate-800/60 bg-[#0f1729] text-slate-100 shadow-[0_20px_80px_rgba(2,6,23,0.75)] backdrop-blur-3xl ${detail.stroke}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${detail.accent} opacity-[0.08]`} />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#0a0f1a] text-slate-100 transition-all hover:border-white/30 hover:bg-[#151d2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Close summary"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative z-10 max-h-[70vh] overflow-y-auto space-y-4 p-5 pr-4 scrollbar-elevated">
          <header className="space-y-3 pr-6">
            <div className="flex items-center gap-2.5 text-xs uppercase tracking-[0.35em] text-slate-300">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0a0f1a] text-slate-100 ring-1 ring-white/15">
                <AccentIcon className="h-4 w-4" />
              </span>
              {detail.label}
            </div>
            <h3 className="text-lg font-semibold leading-tight text-slate-50 break-words">
              {paper.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300">
              <UserRound className="h-3.5 w-3.5" />
              <span>{formatAuthors(paper.authors)}</span>
              <span className="hidden sm:inline">•</span>
              <span>{dateFormatter.format(new Date(paper.publishedAt))}</span>
            </div>
          </header>
          <section className="space-y-2.5 text-sm leading-[1.7] text-slate-200">
            {summary.split(/\n+/).map((paragraph, index) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;
              return <p key={index} className="text-slate-200">{trimmed}</p>;
            })}
          </section>
          {keyPoints.length > 1 && (
            <section className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
                Key insights
              </h4>
              <ul className="space-y-2">
                {keyPoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#0a0f1a] p-3 text-sm leading-[1.7] text-slate-200"
                  >
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
                    <span className="leading-[1.7]">{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-300">
            {paper.venue && <span className="text-slate-400">{paper.venue}</span>}
            <div className="flex items-center gap-2">
              {paper.citations != null && paper.citations > 0 && (
                <span className="rounded-full bg-[#0a0f1a] px-3 py-1 font-medium text-slate-200 ring-1 ring-white/10">
                  {paper.citations.toLocaleString()} citations
                </span>
              )}
              <Button size="sm" variant="secondary" className="gap-2" asChild>
                <a href={paper.url} target="_blank" rel="noopener noreferrer">
                  Open paper
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </footer>
        </div>
      </PopoverContent>
    </Popover>
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
  const detail = SOURCE_DETAILS[paper.source];
  const AccentIcon = detail.icon;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(paper)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(paper);
        }
      }}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-800/40 bg-[#0f1729] p-6 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
        isActive
          ? "border-slate-200/70 shadow-[0_30px_90px_rgba(15,23,42,0.45)]"
          : `hover:-translate-y-0.5 hover:border-slate-700/60`
      }`}
    >
      <div className="absolute right-5 top-5 z-20">
        <ResearchSummaryPopover paper={paper} size="sm" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-300">
            <AccentIcon className="h-3 w-3" />
            {detail.label}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <h3 className="pr-8 text-xl font-semibold leading-[1.3] text-slate-50 break-words">
            {paper.title}
          </h3>
          <span className="text-xs text-slate-500">{dateFormatter.format(new Date(paper.publishedAt))}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <UserRound className="h-4 w-4" />
          <span>{formatAuthors(paper.authors)}</span>
        </div>
        
        <p className="line-clamp-3 text-sm leading-[1.7] text-slate-300">
          {paper.summary || "Abstract not available."}
        </p>
        
        <div className="flex items-center gap-3 pt-2">
          <Button 
            size="sm" 
            className="gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white" 
            asChild
          >
            <a href={paper.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              Read paper
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaperGridCard({ paper }: { paper: ResearchPaper }) {
  const detail = SOURCE_DETAILS[paper.source];
  const AccentIcon = detail.icon;
  return (
    <div className="group relative flex h-[380px] flex-col gap-4 overflow-hidden rounded-2xl border border-slate-800/40 bg-[#0f1729] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700/60">
      <div className="absolute right-5 top-5 z-20">
        <ResearchSummaryPopover paper={paper} size="sm" />
      </div>
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-300">
          <AccentIcon className="h-3 w-3" />
          {detail.label}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="pr-8 line-clamp-3 text-xl font-semibold leading-[1.3] text-slate-50 break-words">{paper.title}</h3>
        <span className="text-xs text-slate-500">{dateFormatter.format(new Date(paper.publishedAt))}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <UserRound className="h-4 w-4" />
        <span className="text-xs line-clamp-1">{formatAuthors(paper.authors)}</span>
      </div>
      <p className="line-clamp-3 text-sm leading-[1.7] text-slate-300 flex-1">
        {paper.summary || "Abstract not available."}
      </p>
      <div className="flex items-center gap-3 mt-auto">
        <Button
          size="sm"
          className="gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white"
          asChild
        >
          <a href={paper.url} target="_blank" rel="noopener noreferrer">
            Read paper
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function TrendingCard({ paper }: { paper: ResearchPaper }) {
  const detail = SOURCE_DETAILS[paper.source];
  const AccentIcon = detail.icon;
  return (
    <div className="group relative flex h-[380px] flex-col gap-4 overflow-hidden rounded-2xl border border-slate-800/40 bg-[#0f1729] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700/60">
      <div className="absolute right-5 top-5 z-20">
        <ResearchSummaryPopover paper={paper} size="sm" />
      </div>
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.15em] text-slate-300">
          <AccentIcon className="h-3 w-3" />
          {detail.label}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="pr-8 line-clamp-3 text-xl font-semibold leading-[1.3] text-slate-50 break-words">
          {paper.title}
        </h3>
        <span className="text-xs text-slate-500">{dateFormatter.format(new Date(paper.publishedAt))}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <UserRound className="h-4 w-4" />
        <span className="text-xs line-clamp-1">{formatAuthors(paper.authors)}</span>
      </div>
      <p className="line-clamp-3 text-sm leading-[1.7] text-slate-300 flex-1">
        {paper.summary || "Abstract not available."}
      </p>
      <div className="flex gap-3 mt-auto">
        <Button
          size="sm"
          className="gap-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white"
          asChild
        >
          <a href={paper.url} target="_blank" rel="noopener noreferrer">
            Read paper
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function SourceSpotlight({ source, papers }: { source: ResearchSource; papers: ResearchPaper[] }) {
  if (!papers || papers.length === 0) return null;

  const detail = SOURCE_DETAILS[source];
  const AccentIcon = detail.icon;
  const [lead, ...rest] = papers;
  const supporting = rest.slice(0, 3);

  return (
    <section className={`relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border border-slate-800/50 bg-[#0f1729] p-6 sm:p-8 ${detail.stroke}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${detail.accent} opacity-[0.05]`} />
      <div className="absolute right-6 top-6 z-20">
        <ResearchSummaryPopover paper={lead} />
      </div>
      <header className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-3 rounded-full bg-slate-950/70 px-4 py-2 text-xs uppercase tracking-[0.35em] text-slate-200 ring-1 ring-white/10">
            <AccentIcon className="h-4 w-4" />
            {detail.label}
          </span>
          <span className="text-xs text-slate-300">
            {dateFormatter.format(new Date(lead.publishedAt))}
          </span>
        </div>
        <h3 className="text-2xl font-semibold leading-[1.25] text-slate-50 break-words">
          {lead.title}
        </h3>
      </header>
      <div className="relative z-10 space-y-4 text-sm leading-[1.7] text-slate-200">
        <PaperMetadata paper={lead} showSource={false} />
        <p className="text-base leading-[1.75] text-slate-200">
          {lead.summary || "Abstract not available."}
        </p>
        <PaperTagList tags={lead.tags} />
      </div>
      <div className="relative z-10 flex flex-wrap gap-3">
        {lead.pdfUrl && (
          <Button size="sm" variant="secondary" className="gap-2" asChild>
            <a href={lead.pdfUrl} target="_blank" rel="noopener noreferrer">
              View PDF
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        )}
        <Button size="sm" variant="default" className="gap-2" asChild>
          <a href={lead.url} target="_blank" rel="noopener noreferrer">
            Open source
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
      {supporting.length > 0 && (
        <div className="relative z-10 mt-2 space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">More from {detail.label}</p>
          <ul className="space-y-3">
            {supporting.map((paper) => (
              <li key={paperIdentifier(paper)} className="flex items-start gap-3 text-sm leading-[1.6] text-slate-200">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-200" />
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-slate-100 transition-colors hover:text-white hover:underline"
                >
                  {paper.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const readerBackdrop = "bg-gradient-to-br from-[#0d1420] via-[#0f1729] to-[#0d1420]";

const readerCard = "rounded-3xl border border-slate-800 bg-[#0f1729] shadow-[0px_30px_120px_rgba(2,6,23,0.45)] backdrop-blur-sm";

const shimmer = "bg-gradient-to-r from-transparent via-slate-800/40 to-transparent animate-pulse";

function ReaderSkeleton() {
  return (
    <div className={`${readerCard} animate-pulse p-10 lg:p-12`}>
      <div className="mb-6 h-6 w-32 rounded-full bg-[#1a2332]" />
      <div className="mb-8 h-10 w-full rounded-lg bg-[#1a2332]" />
      <div className="mb-6 h-4 w-48 rounded-full bg-[#1a2332]" />
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
        <div key={index} className="h-32 w-full animate-pulse rounded-2xl bg-[#0f1729]" />
      ))}
    </div>
  );
}

const readerFocusGradient = "absolute inset-0 rounded-3xl bg-gradient-to-br from-[#1a2332]/25 via-[#0f1729]/40 to-[#0a0f1a]/80";

const highlightRing = "ring-1 ring-slate-500/40";

const focusGlow = "shadow-[0px_0px_120px_rgba(76,106,255,0.18)]";

function Research() {
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState<ResearchSource | "all" | "trending">("all");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("reader");
  const [focusPaperId, setFocusPaperId] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<TextSizeOption>("standard");
  const [useSerif, setUseSerif] = useState(false);
  const [expandReaderWidth, setExpandReaderWidth] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const {
    data: papers = [],
    isLoading,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["research-papers", { source: sourceFilter }],
    queryFn: () =>
      fetchResearchPapers({
        limit: 90,
        source: sourceFilter === "trending" ? "all" : sourceFilter,
        windowDays: 1460,
      }),
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const groupedBySource = useMemo(() => groupPapersBySource(papers), [papers]);

  const hasSearch = searchInput.trim().length > 0;

  const filteredPapers = useMemo(() => {
    if (!papers || papers.length === 0) return [];

    // If trending filter is active, show only trending papers
    if (sourceFilter === "trending") {
      const trending = buildTrendingSelection(papers, 12);

      if (!hasSearch) return trending;
      const normalized = searchInput.trim().toLowerCase();
      return trending.filter((paper) => {
        const haystack = `${paper.title ?? ""} ${paper.summary ?? ""} ${(paper.tags ?? []).join(" ")}`.toLowerCase();
        return haystack.includes(normalized);
      });
    }

    if (!hasSearch) return papers;
    const normalized = searchInput.trim().toLowerCase();
    return papers.filter((paper) => {
      const haystack = `${paper.title ?? ""} ${paper.summary ?? ""} ${(paper.tags ?? []).join(" ")}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [papers, hasSearch, searchInput, sourceFilter]);

  const trendingPapers = useMemo(() => buildTrendingSelection(papers, 6), [papers]);
  const trendingSourcesCount = useMemo(
    () => new Set(trendingPapers.map((paper) => paper.source)).size,
    [trendingPapers]
  );
  const quickBrowsePapers = useMemo(() => interleaveBySource(filteredPapers), [filteredPapers]);

  const showHighlights = sourceFilter === "trending" && !hasSearch;

  const spotlightCount = useMemo(
    () => SOURCE_ORDER.filter((source) => (groupedBySource.get(source)?.length ?? 0) > 0).length,
    [groupedBySource]
  );

  const hasSourceSpotlights = spotlightCount > 0;

  const focusPaper = useMemo(() => {
    if (filteredPapers.length === 0) return null;
    if (focusPaperId) {
      return filteredPapers.find((paper) => paperIdentifier(paper) === focusPaperId) ?? filteredPapers[0];
    }
    return filteredPapers[0];
  }, [filteredPapers, focusPaperId]);

  const focusPaperKey = focusPaper ? paperIdentifier(focusPaper) : null;
  const focusDetail = focusPaper ? SOURCE_DETAILS[focusPaper.source] : null;
  const focusSummary = useMemo(() => (focusPaper ? buildSummaryData(focusPaper) : null), [focusPaper]);
  const FocusAccentIcon = focusDetail?.icon ?? Sparkles;

  const typography = useMemo(() => {
    const base = TEXT_CLASS_MAP[textSize];
    const fontFamily = useSerif ? "font-serif" : "font-sans";
    return {
      heading: `${base.heading} ${fontFamily}`,
      summary: `${base.summary} ${fontFamily}`,
      meta: `${base.meta} ${fontFamily}`,
      spacing: base.spacing,
    };
  }, [textSize, useSerif]);

  const readerWidthClass = expandReaderWidth ? "max-w-6xl" : "max-w-5xl";

  useEffect(() => {
    if (filteredPapers.length === 0) return;
    const hasFocus = focusPaperId
      ? filteredPapers.some((paper) => paperIdentifier(paper) === focusPaperId)
      : false;
    if (!hasFocus) {
      setFocusPaperId(paperIdentifier(filteredPapers[0]));
    }
  }, [filteredPapers, focusPaperId]);

  const handleSourceChange = (value: ResearchSource | "all" | "trending") => {
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
              Curated AI & ML research from the last 4 years
            </h1>
            <p className="max-w-3xl text-base leading-[1.7] text-slate-400">
              Deep-dive into arXiv and Semantic Scholar releases alongside CORE, DOAJ, Zenodo, PLOS ONE, OpenAlex, Hugging Face, IEEE Open Access, and more — all sourced from the last 4 years. The layout focuses on reading comfort with typography tuned for long-form abstracts.
            </p>
            {papers.length > 0 && (
              <p className="text-sm text-slate-500">
                Showing {filteredPapers.length} papers · Updated {dateFormatter.format(new Date())}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-800/50 bg-[#0f1729] p-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search titles, abstracts, or tags"
                className="w-full rounded-full border-slate-700 bg-[#0a0f1a] pl-11 text-slate-100 placeholder:text-slate-500"
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
                    className={`rounded-full border-slate-700 ${sourceFilter === option.value ? "bg-slate-200 text-slate-900" : "bg-[#0a0f1a] text-slate-200"}`}
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
                className={`rounded-full border-slate-700 ${viewMode === "reader" ? "bg-slate-200 text-slate-900" : "bg-[#0a0f1a] text-slate-200"}`}
                onClick={() => setViewMode("reader")}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Reader
              </Button>
              <Button
                size="sm"
                variant={viewMode === "grid" ? "default" : "outline"}
                className={`rounded-full border-slate-700 ${viewMode === "grid" ? "bg-slate-200 text-slate-900" : "bg-[#0a0f1a] text-slate-200"}`}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Grid
              </Button>
            </div>
          </div>
        </header>

        {showHighlights && !isLoading && trendingPapers.length > 0 && (
          <section className="mt-12 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Trending across sources</h2>
                <p className="text-sm text-slate-400">
                  Most cited submissions and fastest-moving abstracts from the past year.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-500">
                {trendingSourcesCount} sources · {trendingPapers.length} highlighted
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trendingPapers.map((paper) => (
                <TrendingCard key={paperIdentifier(paper)} paper={paper} />
              ))}
            </div>
          </section>
        )}

        {showHighlights && !isLoading && hasSourceSpotlights && (
          <section className="mt-14 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Spotlight by source</h2>
                <p className="text-sm text-slate-400">
                  Compare leading venues across arXiv, Semantic Scholar, Hugging Face, and CORE.
                </p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-500">
                {spotlightCount} {spotlightCount === 1 ? "feed" : "feeds"}
              </span>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {SOURCE_ORDER.map((source) => (
                <SourceSpotlight key={source} source={source} papers={groupedBySource.get(source) ?? []} />
              ))}
            </div>
          </section>
        )}

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
          <div className={`mt-10 mx-auto ${readerWidthClass}`}>
            <div className={`grid gap-8 ${showSidebar ? "lg:grid-cols-[2fr_1fr]" : "lg:grid-cols-1"}`}>
              <article className={`${readerCard} relative overflow-y-auto max-h-[calc(100vh-240px)] p-6 lg:p-8 scrollbar-elevated`}>
                {focusDetail && (
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${focusDetail.accent} opacity-[0.05]`} />
                )}
                <div className={`relative z-10 flex flex-col gap-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 ring-1 ring-white/10">
                          <FocusAccentIcon className="h-3 w-3" />
                          {focusDetail?.label ?? focusPaper?.sourceName ?? "Research"}
                        </span>
                      </div>
                      {focusPaper?.publishedAt && (
                        <span className="text-xs text-slate-500">
                          {dateFormatter.format(new Date(focusPaper.publishedAt))}
                        </span>
                      )}
                    </div>
                    {focusPaper && <ResearchSummaryPopover paper={focusPaper} size="sm" />}
                  </div>

                  <h2 className="text-xl lg:text-2xl font-bold leading-[1.3] text-slate-50 break-words">
                    {focusPaper?.title}
                  </h2>

                  {focusPaper && (
                    <>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5" />
                          <span className="text-xs">{formatAuthors(focusPaper.authors)}</span>
                        </div>
                        {focusPaper.citations != null && focusPaper.citations > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5" />
                            <span className="text-xs">{focusPaper.citations.toLocaleString()} citations</span>
                          </div>
                        )}
                        {focusPaper.venue && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="text-xs">{focusPaper.venue}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 text-sm leading-relaxed text-slate-200">
                        {(focusSummary?.summary || "Abstract not available for this paper.")
                          .split(/\n+/)
                          .map((paragraph, index) => {
                            const trimmed = paragraph.trim();
                            if (!trimmed) return null;
                            return (
                              <p key={index} className="leading-relaxed">{trimmed}</p>
                            );
                          })}
                      </div>

                      <PaperTagList tags={focusPaper.tags} />

                      <div className="flex flex-wrap gap-2 pt-2">
                        {focusPaper.pdfUrl && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-2 rounded-full border-slate-700 bg-[#0a0f1a] text-slate-100 hover:bg-slate-900"
                            asChild
                          >
                            <a href={focusPaper.pdfUrl} target="_blank" rel="noopener noreferrer">
                              View PDF
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="gap-2 rounded-full bg-purple-600 text-white hover:bg-purple-700"
                          asChild
                        >
                          <a href={focusPaper.url} target="_blank" rel="noopener noreferrer">
                            Read paper
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </article>

              {showSidebar && (
                <aside className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100">Quick browse</h3>
                  <div className="rounded-2xl border border-slate-800/40 bg-[#0f1729] p-4">
                    <div className="space-y-4 overflow-y-auto pr-1 scrollbar-elevated max-h-[60vh] sm:max-h-[68vh] lg:max-h-[calc(100vh-340px)]">
                      {quickBrowsePapers.map((paper) => (
                        <PaperCard
                          key={paperIdentifier(paper)}
                          paper={paper}
                          isActive={paperIdentifier(paper) === focusPaperKey}
                          onSelect={(selected) => setFocusPaperId(paperIdentifier(selected))}
                        />
                      ))}
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredPapers.map((paper) => (
              <PaperGridCard key={paperIdentifier(paper)} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Research;
