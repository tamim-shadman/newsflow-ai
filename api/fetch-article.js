import Parser from "@postlight/parser";

const JINA_ENDPOINT = "https://r.jina.ai/";
const CACHE_CONTROL_HEADER = "s-maxage=900, stale-while-revalidate=3600";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

function normalizeQueryUrl(value) {
  if (!value) return null;
  const urlCandidate = Array.isArray(value) ? value[0] : value;
  if (typeof urlCandidate !== "string" || urlCandidate.trim() === "") {
    return null;
  }

  try {
    const parsed = new URL(urlCandidate);
    if (!parsed.protocol.startsWith("http")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function fetchFromJina(targetUrl) {
  const requestUrl = `${JINA_ENDPOINT}${encodeURIComponent(targetUrl)}`;
  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
      "X-Return-Format": "html",
      "X-With-Generated-Alt": "true",
    },
  });

  if (!response.ok) {
    throw new Error(`Jina Reader responded with ${response.status}`);
  }

  const payload = await response.json();
  const data = payload?.data;
  if (!data || !data.content) {
    throw new Error("Jina Reader payload missing article content");
  }

  return {
    title: data.title ?? null,
    content: data.content,
    author: data.author ?? (Array.isArray(data.authors) ? data.authors.join(", ") : null),
    publishedDate: data.publishedTime ?? data.publishedAt ?? null,
    imageUrl: data.image ?? null,
    excerpt: data.description ?? data.excerpt ?? null,
    source: data.siteName ?? null,
    url: targetUrl,
    provider: "jina-reader",
    wordCount: data.wordCount ?? null,
    language: data.language ?? null,
  };
}

async function fetchFromMercury(targetUrl) {
  const article = await Parser.parse(targetUrl, { contentType: "html" });

  if (!article?.content) {
    throw new Error("Mercury Parser returned no content");
  }

  return {
    title: article.title ?? null,
    content: article.content,
    author: article.author ?? null,
    publishedDate: article.date_published ?? article.published_date ?? null,
    imageUrl: article.lead_image_url ?? null,
    excerpt: article.dek ?? article.excerpt ?? null,
    source: article.domain ?? article.siteName ?? null,
    url: article.url ?? targetUrl,
    provider: "mercury-parser",
    wordCount: article.word_count ?? null,
    language: article.lang ?? null,
  };
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const targetUrl = normalizeQueryUrl(req.query?.url);
  if (!targetUrl) {
    res.status(400).json({ error: "URL required" });
    return;
  }

  res.setHeader("Cache-Control", CACHE_CONTROL_HEADER);

  try {
    const article = await fetchFromJina(targetUrl);
    res.status(200).json(article);
  } catch (jinaError) {
    console.warn(`[fetch-article] Jina Reader failed for ${targetUrl}:`, jinaError);

    try {
      const article = await fetchFromMercury(targetUrl);
      res.status(200).json(article);
    } catch (mercuryError) {
      console.error(`[fetch-article] Mercury Parser failed for ${targetUrl}:`, mercuryError);
      res.status(502).json({ error: "Failed to retrieve article content" });
    }
  }
}
