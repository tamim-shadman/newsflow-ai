import { XMLParser } from "fast-xml-parser";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 365;
const HARD_LIMIT = 90;

const ARXIV_API_BASE = process.env.ARXIV_API_BASE || "https://export.arxiv.org/api/query";
const SEMANTIC_SCHOLAR_API_BASE = process.env.SEMANTIC_SCHOLAR_API_BASE || "https://api.semanticscholar.org/graph/v1";
const SEMANTIC_SCHOLAR_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || "";
const HUGGING_FACE_PAPERS_API = process.env.HUGGING_FACE_PAPERS_API || "https://huggingface.co/api/daily_papers";
const OPENREVIEW_API_BASE = process.env.OPENREVIEW_API_BASE || "https://api2.openreview.net";
const OPENREVIEW_CONFERENCES = [
  {
    venue: "NeurIPS.cc/2024/Conference",
    name: "NeurIPS 2024",
  },
  {
    venue: "ICLR.cc/2024/Conference",
    name: "ICLR 2024",
  },
  {
    venue: "ICML.cc/2024/Conference",
    name: "ICML 2024",
  },
  {
    venue: "ICLR.cc/2025/Conference",
    name: "ICLR 2025",
  },
];

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "text",
  removeNSPrefix: true,
  trimValues: true,
});

function toISODate(input) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function withinWindow(publishedAt, since) {
  const iso = toISODate(publishedAt);
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= since.getTime();
}

function normalizeAuthors(authors) {
  if (!authors) return [];
  if (Array.isArray(authors)) {
    return authors
      .map((author) => {
        if (!author) return null;
        if (typeof author === "string") return author.trim();
        if (author.name) return String(author.name).trim();
        if (author.full_name) return String(author.full_name).trim();
        return null;
      })
      .filter((name) => Boolean(name));
  }
  if (typeof authors === "string") return [authors.trim()];
  if (typeof authors === "object" && authors.name) return [String(authors.name).trim()];
  return [];
}

function dedupeByUrl(papers) {
  const seen = new Set();
  const deduped = [];

  for (const paper of papers) {
    const key = paper.url || paper.id;
    if (!key) continue;
    const normalized = key.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(paper);
  }

  return deduped;
}

function filterByQuery(papers, query) {
  if (!query) return papers;
  const needle = query.trim().toLowerCase();
  if (!needle) return papers;
  return papers.filter((paper) => {
    const haystack = `${paper.title ?? ""} ${paper.summary ?? ""} ${(paper.tags ?? []).join(" ")}`.toLowerCase();
    return haystack.includes(needle);
  });
}

async function fetchArxivPapers({ limit, query, since }) {
  const interestQuery = "(cat:cs.AI OR cat:cs.LG OR cat:cs.CV OR cat:cs.CL OR cat:cs.NE)";
  const searchTokens = [interestQuery];
  if (query) {
    const sanitized = query.replace(/"/g, "");
    searchTokens.push(`all:"${sanitized}"`);
  }
  const searchQuery = searchTokens.join(" AND ");

  const params = new URLSearchParams({
    search_query: searchQuery,
    sortBy: "submittedDate",
    sortOrder: "descending",
    start: "0",
    max_results: String(Math.min(limit, HARD_LIMIT)),
  });

  const response = await fetch(`${ARXIV_API_BASE}?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/atom+xml",
      "User-Agent": "NewsFlow-AI-Research/1.0 (https://newsflow.ai)",
    },
  });

  if (!response.ok) {
    throw new Error(`arXiv request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const entries = parsed?.feed?.entry;
  if (!entries) return [];

  const entryList = Array.isArray(entries) ? entries : [entries];

  return entryList
    .map((entry) => {
      const publishedAt = entry?.published || entry?.updated;
      const categories = entry?.category;
      const tags = Array.isArray(categories)
        ? categories.map((cat) => cat?.term).filter(Boolean)
        : categories?.term
          ? [categories.term]
          : [];

      const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : [];
      const pdfLink = links.find((link) => link.title === "pdf" || link.type === "application/pdf");
      const primaryLink = links.find((link) => link.rel === "alternate") || links[0];

      return {
        id: entry?.id || primaryLink?.href || publishedAt || Math.random().toString(36).slice(2),
        title: entry?.title ? String(entry.title).trim() : "Untitled arXiv submission",
        summary: entry?.summary ? String(entry.summary).trim() : null,
        authors: normalizeAuthors(entry?.author),
        publishedAt: toISODate(publishedAt) ?? new Date().toISOString(),
        url: primaryLink?.href || entry?.id || "",
        pdfUrl: pdfLink?.href || null,
        source: "arxiv",
        sourceName: "arXiv",
        venue: null,
        citations: null,
        tags,
        primaryCategory: tags?.[0] ?? null,
      };
    })
    .filter((paper) => withinWindow(paper.publishedAt, since));
}

async function fetchSemanticScholarPapers({ limit, query, since }) {
  const base = SEMANTIC_SCHOLAR_API_BASE.replace(/\/$/, "");
  const params = new URLSearchParams({
    query:
      query?.trim() ||
      "artificial intelligence OR machine learning OR deep learning OR computer vision OR natural language processing",
    limit: String(Math.min(limit, HARD_LIMIT)),
  fields: "title,abstract,authors,url,venue,publicationDate,year,citationCount,tldr,openAccessPdf",
    sort: "publicationDate:desc",
  });

  const headers = {
    Accept: "application/json",
    "User-Agent": "NewsFlow-AI-Research/1.0 (https://newsflow.ai)",
  };

  if (SEMANTIC_SCHOLAR_API_KEY) {
    headers["x-api-key"] = SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetch(`${base}/paper/search?${params.toString()}`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Semantic Scholar request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const data = Array.isArray(payload?.data) ? payload.data : [];

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
        source: "semantic_scholar",
        sourceName: "Semantic Scholar",
        venue: item?.venue || null,
        citations: typeof item?.citationCount === "number" ? item.citationCount : null,
        tags: item?.venue ? [item.venue] : [],
        pdfUrl: item?.openAccessPdf?.url || null,
        primaryCategory: null,
      };
    })
    .filter((paper) => withinWindow(paper.publishedAt, since));
}

async function fetchHuggingFacePapers({ limit, since }) {
  const response = await fetch(`${HUGGING_FACE_PAPERS_API}?limit=${Math.min(limit, HARD_LIMIT)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "NewsFlow-AI-Research/1.0 (https://newsflow.ai)",
    },
  });

  if (!response.ok) {
    throw new Error(`Hugging Face request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload) ? payload : Array.isArray(payload?.papers) ? payload.papers : [];

  return items
    .map((item) => {
      const publishedAt = item?.published_at || item?.created_at || item?.updated_at || null;
      const summary = item?.summary || item?.highlights || item?.short_summary;
      const url = item?.url || (item?.arxiv_id ? `https://huggingface.co/papers/${item.arxiv_id}` : "");
      const tags = Array.isArray(item?.tags) ? item.tags : [];
      return {
        id: item?.id || item?.arxiv_id || url || Math.random().toString(36).slice(2),
        title: item?.title || "Trending AI paper",
        summary: typeof summary === "string" ? summary : null,
        authors: normalizeAuthors(item?.authors),
        publishedAt: toISODate(publishedAt) ?? new Date().toISOString(),
        url,
        source: "hugging_face",
        sourceName: "Hugging Face Daily Papers",
        venue: item?.venue || null,
        citations: null,
        tags,
        pdfUrl: item?.pdf_url || null,
        primaryCategory: tags?.[0] ?? null,
      };
    })
    .filter((paper) => withinWindow(paper.publishedAt, since));
}

function ensureAbsolutePdfUrl(pdf) {
  if (!pdf) return null;
  if (pdf.startsWith("http")) return pdf;
  if (pdf.startsWith("/")) return `https://openreview.net${pdf}`;
  return pdf;
}

async function fetchOpenReviewPapers({ limit, since }) {
  const base = OPENREVIEW_API_BASE.replace(/\/$/, "");
  const perConferenceLimit = Math.max(1, Math.ceil(limit / OPENREVIEW_CONFERENCES.length));
  const results = [];
  
  console.log(`[openreview] Fetching papers from ${OPENREVIEW_CONFERENCES.length} conferences, limit per conference: ${perConferenceLimit}`);

  for (const conf of OPENREVIEW_CONFERENCES) {
    // Use content.venue parameter which is more reliable
    const params = new URLSearchParams({
      "content.venue": conf.venue,
      limit: String(Math.min(perConferenceLimit, HARD_LIMIT)),
      sort: "tmdate",
    });

    try {
      const url = `${base}/notes?${params.toString()}`;
      console.log(`[openreview] Fetching from ${conf.name}: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "NewsFlow-AI-Research/1.0 (https://newsflow.ai)",
        },
      });

      if (!response.ok) {
        console.warn(`[openreview] ${conf.name} request failed with status ${response.status}`);
        continue;
      }

      const payload = await response.json();
      const notes = Array.isArray(payload?.notes) ? payload.notes : [];
      
      console.log(`[openreview] Fetched ${notes.length} papers from ${conf.name}`);

      notes.forEach((note) => {
        const content = note?.content || {};
        
        // Handle both old and new API formats for content fields
        const getContentValue = (field) => {
          if (!field) return null;
          return field?.value !== undefined ? field.value : field;
        };
        
        const title = getContentValue(content.title) || "OpenReview submission";
        const abstract = getContentValue(content.abstract) || null;
        const authorsField = getContentValue(content.authors);
        const authors = Array.isArray(authorsField) 
          ? authorsField.filter((author) => typeof author === "string")
          : [];
        const keywordsField = getContentValue(content.keywords);
        const keywords = Array.isArray(keywordsField)
          ? keywordsField.filter((kw) => typeof kw === "string")
          : [];
        
        // Use mdate (modified date) for sorting, fallback to cdate (creation date)
        const publishedAt = typeof note?.mdate === "number" 
          ? new Date(note.mdate).toISOString()
          : typeof note?.cdate === "number"
          ? new Date(note.cdate).toISOString() 
          : new Date().toISOString();
        
        const forumId = note?.forum || note?.id;
        const pdfField = getContentValue(content.pdf);
        const pdfUrl = pdfField 
          ? (pdfField.startsWith("/") ? `https://openreview.net${pdfField}` : pdfField)
          : null;

        results.push({
          id: note?.id || forumId || Math.random().toString(36).slice(2),
          title,
          summary: abstract,
          authors,
          publishedAt,
          url: forumId ? `https://openreview.net/forum?id=${forumId}` : "",
          source: "openreview",
          sourceName: "OpenReview",
          venue: getContentValue(content.venue) || conf.name,
          citations: null,
          tags: keywords,
          pdfUrl,
          primaryCategory: keywords?.[0] ?? null,
        });
      });
      
      // Wait between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.warn(`[openreview] Failed to fetch conference ${conf.name}:`, error.message || error);
    }
  }

  const filtered = results.filter((paper) => withinWindow(paper.publishedAt, since));
  console.log(`[openreview] Total papers fetched: ${results.length}, after date filter: ${filtered.length}`);
  return filtered;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ status: "error", error: "Method not allowed" });
    return;
  }

  const limit = Math.max(1, Math.min(Number.parseInt(req.query.limit ?? "60", 10) || 60, HARD_LIMIT));
  const windowDays = Math.max(30, Math.min(Number.parseInt(req.query.window ?? `${DEFAULT_WINDOW_DAYS}`, 10) || DEFAULT_WINDOW_DAYS, 730));
  const source = typeof req.query.source === "string" ? req.query.source : "all";
  const query = typeof req.query.query === "string" ? req.query.query : "";

  const since = new Date(Date.now() - windowDays * ONE_DAY_MS);

  const tasks = [];

  if (source === "all" || source === "arxiv") {
    tasks.push(fetchArxivPapers({ limit, query, since }));
  }
  if (source === "all" || source === "semantic_scholar") {
    tasks.push(fetchSemanticScholarPapers({ limit, query, since }));
  }
  if (source === "all" || source === "hugging_face") {
    tasks.push(fetchHuggingFacePapers({ limit, query, since }));
  }
  // Disabled OpenReview in development due to CORS
  // Only works in production (Vercel serverless)
  if (source === "openreview" && process.env.NODE_ENV === "production") {
    tasks.push(fetchOpenReviewPapers({ limit, query, since }));
  }

  try {
    const results = await Promise.allSettled(tasks);
    const papers = results
      .flatMap((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        }
        console.warn("[research] Source fetch failed", result.reason);
        return [];
      })
      .filter(Boolean);

    const deduped = dedupeByUrl(papers);
    const queried = filterByQuery(deduped, query);
    const sorted = queried.sort((a, b) => {
      const aTime = new Date(a.publishedAt ?? 0).getTime();
      const bTime = new Date(b.publishedAt ?? 0).getTime();
      if (bTime === aTime) {
        const aCitations = typeof a.citations === "number" ? a.citations : -1;
        const bCitations = typeof b.citations === "number" ? b.citations : -1;
        return bCitations - aCitations;
      }
      return bTime - aTime;
    });

    res.status(200).json({
      status: "ok",
      totalResults: sorted.length,
      papers: sorted.slice(0, limit),
    });
  } catch (error) {
    console.error("[research] Aggregation failed", error);
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      papers: [],
    });
  }
}
