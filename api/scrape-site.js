const JINA_READER_BASE = "https://r.jina.ai/";
const CATEGORY_KEYWORDS = new Set([
  "news",
  "world",
  "politics",
  "bangladesh",
  "business",
  "sports",
  "economy",
  "opinion",
  "editorial",
  "national",
  "international",
  "latest",
  "top-news",
  "topnews",
  "todays-paper",
  "todayspaper",
  "photo",
  "photos",
  "video",
  "videos",
  "lifestyle",
  "entertainment",
  "tech",
  "technology",
  "education",
  "health",
  "science",
  "crime",
  "law",
  "archives",
  "all",
  "more",
  "asia",
  "city",
]);
const CATEGORY_SUBSTRINGS = [
  "news",
  "latest",
  "breaking",
  "headlines",
  "update",
  "updates",
  "live",
  "videos",
  "video",
  "photos",
  "stories",
  "story",
  "analysis",
  "opinion",
  "world",
  "politics",
  "business",
  "sports",
  "health",
  "entertainment",
  "lifestyle",
  "economy",
  "finance",
];

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

function extractArticlesFromHTML(html, sourceUrl) {
  const articles = [];
  const seenUrls = new Set();
  
  if (!html) return articles;
  
  const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const sourceName = sourceDomain.split('.')[0]
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Match article containers with title, link, and optional image/description
  // Pattern 1: <article> or <div class="article/post/story/news">
  const articlePatterns = [
    // Match complete article blocks with various HTML structures
    /<(?:article|div)[^>]*class=["'][^"']*(?:article|post|story|news|item|card)[^"']*["'][^>]*>([\s\S]{50,2000}?)<\/(?:article|div)>/gi,
    // Match h2/h3 with links (common in news sites)
    /<(?:h2|h3)[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>[\s\S]*?<\/(?:h2|h3)>/gi,
  ];

  for (const pattern of articlePatterns) {
    const matches = html.matchAll(pattern);
    
    for (const match of matches) {
      if (articles.length >= 20) break;
      
      const block = match[0];
      
      // Extract article URL
      const urlMatch = block.match(/href=["']([^"']+)["']/);
      if (!urlMatch) continue;
      
      let articleUrl = urlMatch[1];
      
      // Skip non-article links
      if (!articleUrl || articleUrl.includes('#') || articleUrl.includes('javascript:')) continue;
      if (/\/(tag|category|author|search|page|login|signup|subscribe|about|contact|privacy|terms)/i.test(articleUrl)) continue;
      
      // Make URL absolute
      if (articleUrl.startsWith('/')) {
        const base = new URL(sourceUrl);
        articleUrl = `${base.protocol}//${base.hostname}${articleUrl}`;
      } else if (!articleUrl.startsWith('http')) {
        continue;
      }
      
      // Verify same domain and basic article-like path
      try {
        const articleLocation = new URL(articleUrl);
        const articleDomain = articleLocation.hostname.replace(/^www\./, "");
        if (articleDomain !== sourceDomain) continue;

        const pathSegments = articleLocation.pathname.split('/').filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || '';
        const normalizedSegments = pathSegments.map(seg => seg.toLowerCase());
        const looksLikeCategorySlug = (
          pathSegments.length === 0 ||
          (pathSegments.length === 1 && (
            CATEGORY_KEYWORDS.has(lastSegment.toLowerCase()) ||
            (!/[0-9]/.test(lastSegment) && !lastSegment.includes('-') && lastSegment.length <= 24)
          )) ||
          (pathSegments.length === 2 && (
            CATEGORY_KEYWORDS.has(lastSegment.toLowerCase()) ||
            (!/[0-9]/.test(lastSegment) && !lastSegment.includes('-') && !/[0-9]/.test(pathSegments[0]))
          ))
        );

        if (looksLikeCategorySlug) continue;

        if (normalizedSegments.some(seg => ["category", "categories", "tag", "tags", "topic", "topics", "section", "sections"].includes(seg))) {
          continue;
        }

        const containsCategorySubstr = CATEGORY_SUBSTRINGS.some(substr => lastSegment.toLowerCase().includes(substr));
        if (containsCategorySubstr && pathSegments.length <= 2 && !/[0-9]/.test(lastSegment)) {
          continue;
        }
      } catch {
        continue;
      }

      if (seenUrls.has(articleUrl)) continue;
      
      // Extract title (from link text or heading)
      const titleMatch = block.match(/<(?:a|h2|h3)[^>]*>([^<]+)<\/(?:a|h2|h3)>/i) ||
                        block.match(/title=["']([^"']+)["']/i) ||
                        block.match(/alt=["']([^"']+)["']/i);
      
      const title = titleMatch ? titleMatch[1].trim() : null;
      if (!title || title.length < 10 || title.length > 200) continue;
      if (/^(home|read more|click here|view all|about|contact)/i.test(title)) continue;
      
      // Extract image
      const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
      let imageUrl = imgMatch ? imgMatch[1] : null;
      
      if (imageUrl && imageUrl.startsWith('/')) {
        const base = new URL(sourceUrl);
        imageUrl = `${base.protocol}//${base.hostname}${imageUrl}`;
      }
      
      // Extract description/excerpt
      const descMatch = block.match(/<p[^>]*>([^<]{20,300})<\/p>/i) ||
                       block.match(/class=["'][^"']*(?:excerpt|summary|description)[^"']*["'][^>]*>([^<]+)</i);
      
      const description = descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : `Latest from ${sourceName}`;
      
      // Extract time if available
      const timeMatch = block.match(/<time[^>]*datetime=["']([^"']+)["']/i) ||
                       block.match(/(\d{1,2}\s+(?:minute|hour|day)s?\s+ago)/i);
      
      const publishedAt = timeMatch ? (timeMatch[1].includes('ago') ? new Date().toISOString() : timeMatch[1]) : new Date().toISOString();
      
      articles.push({
        source: { id: sourceDomain, name: sourceName },
        author: sourceName,
        title: title,
        description: description.substring(0, 200),
        url: articleUrl,
        urlToImage: imageUrl,
        publishedAt: publishedAt,
        content: description
      });

      seenUrls.add(articleUrl);
    }
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
        "X-With-Images-Summary": "true",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Jina Reader responded with ${response.status}`);
    }

    const data = await response.json();
    const html = data?.data?.content || data?.data?.html || "";
    
    if (!html) {
      throw new Error("No HTML content received from Jina Reader");
    }
    
    const articles = extractArticlesFromHTML(html, targetUrl);
    
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
