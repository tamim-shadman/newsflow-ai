const JINA_READER_BASE = "https://r.jina.ai/";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractArticlesFromJinaResponse(data, sourceUrl) {
  const articles = [];
  
  if (!data?.data) return articles;
  
  const content = data.data.content || data.data.html || "";
  const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const sourceName = sourceDomain.split('.')[0]
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Parse links from content - Jina returns structured data with links
  const linkMatches = content.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi);
  
  let count = 0;
  for (const match of linkMatches) {
    if (count >= 20) break; // Limit to 20 articles per site
    
    const href = match[1];
    const title = match[2]?.trim();
    
    // Skip navigation, footer, social links
    if (!href || !title) continue;
    if (href.includes('#') || href.includes('javascript:')) continue;
    if (title.length < 10 || title.length > 200) continue;
    if (/^(home|about|contact|privacy|terms|subscribe|login|signup)/i.test(title)) continue;
    
    // Construct absolute URL
    let articleUrl = href;
    if (href.startsWith('/')) {
      const base = new URL(sourceUrl);
      articleUrl = `${base.protocol}//${base.hostname}${href}`;
    } else if (!href.startsWith('http')) {
      continue; // Skip relative paths that aren't root-relative
    }
    
    // Only include articles from the same domain
    try {
      const articleDomain = new URL(articleUrl).hostname.replace(/^www\./, "");
      if (articleDomain !== sourceDomain) continue;
    } catch {
      continue;
    }
    
    articles.push({
      source: { id: sourceDomain, name: sourceName },
      author: sourceName,
      title: title,
      description: `Latest from ${sourceName}`,
      url: articleUrl,
      urlToImage: data.data.image || null,
      publishedAt: new Date().toISOString(),
      content: null
    });
    
    count++;
  }
  
  return articles;
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

  const targetUrl = normalizeUrl(req.query?.url);
  if (!targetUrl) {
    res.status(400).json({ error: "URL required" });
    return;
  }

  // Cache for 30 minutes
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");

  try {
    console.log(`[scrape-site] Scraping: ${targetUrl}`);
    
    const jinaUrl = `${JINA_READER_BASE}${encodeURIComponent(targetUrl)}`;
    const response = await fetch(jinaUrl, {
      headers: {
        Accept: "application/json",
        "X-Return-Format": "html",
        "X-With-Links-Summary": "true",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Jina Reader responded with ${response.status}`);
    }

    const data = await response.json();
    const articles = extractArticlesFromJinaResponse(data, targetUrl);
    
    console.log(`[scrape-site] Extracted ${articles.length} articles from ${targetUrl}`);
    
    res.status(200).json({
      success: true,
      source: targetUrl,
      articles: articles,
      totalResults: articles.length,
    });
    
  } catch (error) {
    console.error(`[scrape-site] Failed for ${targetUrl}:`, error.message);
    res.status(502).json({ 
      success: false,
      error: error.message,
      articles: []
    });
  }
}
