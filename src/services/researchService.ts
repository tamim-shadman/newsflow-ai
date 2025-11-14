import type { ResearchPaper, ResearchSource } from "@/types/news";

export interface ResearchQueryOptions {
  limit?: number;
  source?: ResearchSource | "all";
  query?: string;
  signal?: AbortSignal;
  windowDays?: number;
}

type ResearchApiResponse = {
  status: "ok" | "error";
  totalResults: number;
  papers: ResearchPaper[];
};

type SemanticScholarAuthor = { name?: string | null } | string | null | undefined;

type SemanticScholarItem = {
  paperId?: string;
  paper_id?: string;
  url?: string;
  title?: string;
  abstract?: string | null;
  tldr?: { text?: string | null } | null;
  authors?: SemanticScholarAuthor[];
  publicationDate?: string | null;
  year?: number | null;
  venue?: string | null;
  citationCount?: number | null;
  openAccessPdf?: { url?: string | null } | null;
};

type HuggingFaceAuthor = { name?: string | null } | string | null | undefined;

type HuggingFacePaper = {
  id?: string;
  arxiv_id?: string;
  url?: string;
  title?: string;
  summary?: string | null;
  highlights?: string | null;
  short_summary?: string | null;
  authors?: HuggingFaceAuthor[];
  tags?: string[];
  venue?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  pdf_url?: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_DAYS = 1460; // 4 years
const HARD_CAP = 90;

const CLIENT_ARXIV_API_BASE = import.meta.env.VITE_ARXIV_API_BASE?.trim() || "https://export.arxiv.org/api/query";
const CLIENT_SEMANTIC_SCHOLAR_API_BASE =
  import.meta.env.VITE_SEMANTIC_SCHOLAR_API_BASE?.trim() || "https://api.semanticscholar.org/graph/v1";
const CLIENT_SEMANTIC_SCHOLAR_API_KEY = import.meta.env.VITE_SEMANTIC_SCHOLAR_API_KEY?.trim() || "";
const CLIENT_HF_PAPERS_API =
  import.meta.env.VITE_HUGGING_FACE_PAPERS_API?.trim() || "https://huggingface.co/api/daily_papers";

function toISODate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function withinWindow(publishedAt: string | null, since: Date): boolean {
  if (!publishedAt) return false;
  const time = new Date(publishedAt).getTime();
  if (Number.isNaN(time)) return false;
  return time >= since.getTime();
}

function normalizeAuthors(authors?: string[] | string | null): string[] {
  if (!authors) return [];
  if (Array.isArray(authors)) {
    return authors
      .map((author) => (author ? author.trim() : ""))
      .filter((name) => Boolean(name))
      .slice(0, 12);
  }
  return authors.split(",").map((value) => value.trim()).filter(Boolean);
}

function dedupeByUrl(papers: ResearchPaper[]): ResearchPaper[] {
  const seen = new Set<string>();
  const deduped: ResearchPaper[] = [];

  papers.forEach((paper) => {
    const key = (paper.url || paper.id || "").toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(paper);
  });

  return deduped;
}

function filterByQuery(papers: ResearchPaper[], query?: string | null): ResearchPaper[] {
  if (!query) return papers;
  const needle = query.trim().toLowerCase();
  if (!needle) return papers;
  return papers.filter((paper) => {
    const haystack = `${paper.title ?? ""} ${paper.summary ?? ""} ${(paper.tags ?? []).join(" ")}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function sortPapers(papers: ResearchPaper[]): ResearchPaper[] {
  return papers.slice().sort((a, b) => {
    const aTime = new Date(a.publishedAt ?? 0).getTime();
    const bTime = new Date(b.publishedAt ?? 0).getTime();
    if (bTime === aTime) {
      const aCitations = typeof a.citations === "number" ? a.citations : -1;
      const bCitations = typeof b.citations === "number" ? b.citations : -1;
      return bCitations - aCitations;
    }
    return bTime - aTime;
  });
}

async function fetchArxivClientSide(limit: number, query: string | undefined, since: Date): Promise<ResearchPaper[]> {
  const domParser = new DOMParser();
  const baseQuery = "(cat:cs.AI OR cat:cs.LG OR cat:cs.CV OR cat:cs.CL OR cat:cs.NE)";
  const searchTokens = [baseQuery];

  if (query) {
    const sanitized = query.replace(/"/g, "");
    if (sanitized.trim()) {
      searchTokens.push(`all:"${sanitized.trim()}"`);
    }
  }

  const params = new URLSearchParams({
    search_query: searchTokens.join(" AND "),
    sortBy: "submittedDate",
    sortOrder: "descending",
    start: "0",
    max_results: String(Math.min(limit, HARD_CAP)),
  });

  const response = await fetch(`${CLIENT_ARXIV_API_BASE}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/atom+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`arXiv request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const doc = domParser.parseFromString(xml, "application/xml");
  const entryNodes = Array.from(doc.querySelectorAll("entry"));

  return entryNodes
    .map((entry) => {
      const title = entry.querySelector("title")?.textContent?.trim() ?? "Untitled arXiv submission";
      const summary = entry.querySelector("summary")?.textContent?.trim() ?? null;
      const published =
        entry.querySelector("published")?.textContent?.trim() ||
        entry.querySelector("updated")?.textContent?.trim() ||
        null;

      const authorNames = Array.from(entry.querySelectorAll("author > name")).map((node) => node.textContent?.trim() ?? "");

      const links = Array.from(entry.querySelectorAll("link"));
      const pdfLink = links.find(
        (link) => link.getAttribute("title") === "pdf" || link.getAttribute("type") === "application/pdf"
      );
      const primaryLink =
        links.find((link) => link.getAttribute("rel") === "alternate") || links[0] || null;

      const categories = Array.from(entry.querySelectorAll("category"));
      const tags = categories
        .map((cat) => cat.getAttribute("term"))
        .filter((value): value is string => Boolean(value));

      return {
        id: entry.querySelector("id")?.textContent?.trim() ?? primaryLink?.getAttribute("href") ?? title,
        title,
        summary,
        authors: normalizeAuthors(authorNames),
        publishedAt: toISODate(published) ?? new Date().toISOString(),
        url: primaryLink?.getAttribute("href") ?? entry.querySelector("id")?.textContent?.trim() ?? "",
        pdfUrl: pdfLink?.getAttribute("href") ?? null,
        source: "arxiv" as const,
        sourceName: "arXiv",
        venue: null,
        citations: null,
        tags,
        primaryCategory: tags[0] ?? null,
      } satisfies ResearchPaper;
    })
    .filter((paper) => withinWindow(paper.publishedAt, since));
}

async function fetchSemanticScholarClientSide(
  limit: number,
  query: string | undefined,
  since: Date
): Promise<ResearchPaper[]> {
  const params = new URLSearchParams({
    query:
      query?.trim() ||
      "artificial intelligence OR machine learning OR deep learning OR computer vision OR natural language processing",
    limit: String(Math.min(limit, HARD_CAP)),
    fields: "title,abstract,authors,url,venue,publicationDate,year,citationCount,tldr,openAccessPdf",
    sort: "publicationDate:desc",
  });

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (CLIENT_SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = CLIENT_SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetch(`${CLIENT_SEMANTIC_SCHOLAR_API_BASE.replace(/\/$/, "")}/paper/search?${params}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Semantic Scholar request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? (payload.data as SemanticScholarItem[]) : [];

  return data
    .map((item) => {
      const authorNames = Array.isArray(item?.authors)
        ? item.authors
            .map((author) => {
              if (!author) return null;
              if (typeof author === "string") return author;
              if (author.name) return author.name;
              return null;
            })
            .filter(Boolean)
        : [];

      const publishedAt = item?.publicationDate || (item?.year ? `${item.year}-01-01` : null);

      return {
        id: item?.paperId || item?.paper_id || item?.url || Math.random().toString(36).slice(2),
        title: item?.title || "Untitled paper",
        summary: item?.tldr?.text || item?.abstract || null,
        authors: normalizeAuthors(authorNames),
        publishedAt: toISODate(publishedAt) ?? new Date().toISOString(),
        url: item?.url || (item?.paperId ? `https://www.semanticscholar.org/paper/${item.paperId}` : ""),
        source: "semantic_scholar" as const,
        sourceName: "Semantic Scholar",
        venue: item?.venue || null,
        citations: typeof item?.citationCount === "number" ? item.citationCount : null,
        tags: item?.venue ? [item.venue] : [],
        pdfUrl: item?.openAccessPdf?.url || null,
        primaryCategory: null,
      } satisfies ResearchPaper;
    })
    .filter((paper) => withinWindow(paper.publishedAt, since));
}

async function fetchHuggingFaceClientSide(limit: number, since: Date): Promise<ResearchPaper[]> {
  const response = await fetch(`${CLIENT_HF_PAPERS_API}?limit=${Math.min(limit, HARD_CAP)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Hugging Face request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const items: HuggingFacePaper[] = Array.isArray(payload)
    ? (payload as HuggingFacePaper[])
    : Array.isArray(payload?.papers)
      ? (payload.papers as HuggingFacePaper[])
      : [];

  return items
    .map((item) => {
      const publishedAt = item?.published_at || item?.created_at || item?.updated_at || null;
      const summary = item?.summary || item?.highlights || item?.short_summary;
      const tags = Array.isArray(item?.tags) ? item.tags : [];
      const authors = Array.isArray(item?.authors)
        ? item.authors
            .map((author) => {
              if (!author) return null;
              if (typeof author === "string") return author;
              return author.name ?? null;
            })
            .filter((name): name is string => Boolean(name))
        : [];

      return {
        id: item?.id || item?.arxiv_id || item?.url || Math.random().toString(36).slice(2),
        title: item?.title || "Trending AI paper",
        summary: typeof summary === "string" ? summary : null,
        authors: normalizeAuthors(authors),
        publishedAt: toISODate(publishedAt) ?? new Date().toISOString(),
        url: item?.url || (item?.arxiv_id ? `https://huggingface.co/papers/${item.arxiv_id}` : ""),
        source: "hugging_face" as const,
        sourceName: "Hugging Face Daily Papers",
        venue: item?.venue || null,
        citations: null,
        tags,
        pdfUrl: item?.pdf_url || null,
        primaryCategory: tags[0] ?? null,
      } satisfies ResearchPaper;
    })
    .filter((paper) => withinWindow(paper.publishedAt, since));
}

async function fetchClientSideFallback(options: ResearchQueryOptions = {}): Promise<ResearchPaper[]> {
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, HARD_CAP));
  const windowDays = Math.max(30, Math.min(options.windowDays ?? DEFAULT_WINDOW_DAYS, 730));
  const since = new Date(Date.now() - windowDays * ONE_DAY_MS);
  const source = options.source ?? "all";

  const tasks: Array<Promise<ResearchPaper[]>> = [];

  if (source === "all" || source === "arxiv") {
    tasks.push(
      fetchArxivClientSide(limit, options.query, since).catch((error) => {
        console.warn("[research] arXiv fallback failed", error);
        return [];
      })
    );
  }

  if (source === "all" || source === "semantic_scholar") {
    // Semantic Scholar requires API key and doesn't allow CORS from browser
    // Skip client-side fallback for Semantic Scholar
    console.warn("[research] Semantic Scholar requires server-side API calls (CORS blocked)");
  }

  if (source === "all" || source === "hugging_face") {
    tasks.push(
      fetchHuggingFaceClientSide(limit, since).catch((error) => {
        console.warn("[research] Hugging Face fallback failed", error);
        return [];
      })
    );
  }


  const results = await Promise.all(tasks);
  const merged = results.flat();
  const deduped = dedupeByUrl(merged);
  const filtered = filterByQuery(deduped, options.query);
  const sorted = sortPapers(filtered);

  return sorted.slice(0, limit);
}

export async function fetchResearchPapers(
  options: ResearchQueryOptions = {}
): Promise<ResearchPaper[]> {
  const params = new URLSearchParams();

  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    params.set("limit", Math.max(1, Math.floor(options.limit)).toString());
  }

  if (options.source && options.source !== "all") {
    params.set("source", options.source);
  }

  if (options.query) {
    params.set("query", options.query.trim());
  }

  if (typeof options.windowDays === "number" && Number.isFinite(options.windowDays)) {
    params.set("window", Math.floor(options.windowDays).toString());
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/api/research?${queryString}` : "/api/research";

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: options.signal,
      headers: {
        Accept: "application/json",
      },
      credentials: "same-origin",
    });

    if (!response.ok) {
      console.warn(`[research] Serverless request failed (${response.status}). Falling back client-side.`);
      return fetchClientSideFallback(options);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    if (!contentType.includes("application/json")) {
      console.warn("[research] Unexpected response type, using client-side fallback");
      return fetchClientSideFallback(options);
    }

    let payload: ResearchApiResponse;

    try {
      payload = JSON.parse(text) as ResearchApiResponse;
    } catch (parseError) {
      console.warn("[research] Failed to parse JSON payload, using fallback", parseError);
      return fetchClientSideFallback(options);
    }

    if (!payload || !Array.isArray(payload.papers)) {
      console.warn("[research] Invalid payload shape, using fallback");
      return fetchClientSideFallback(options);
    }

    return payload.papers;
  } catch (networkError) {
    console.warn("[research] Request threw, using client-side fallback", networkError);
    return fetchClientSideFallback(options);
  }
}

export function groupPapersBySource(papers: ResearchPaper[]): Map<ResearchSource, ResearchPaper[]> {
  const groups = new Map<ResearchSource, ResearchPaper[]>();

  papers.forEach((paper) => {
    const current = groups.get(paper.source) ?? [];
    current.push(paper);
    groups.set(paper.source, current);
  });

  return groups;
}
