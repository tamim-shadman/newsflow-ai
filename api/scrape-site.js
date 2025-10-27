import { load } from "cheerio";

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

const PATH_BLOCKLIST = new Set([
  "category",
  "categories",
  "tag",
  "tags",
  "topic",
  "topics",
  "section",
  "sections",
  "author",
  "authors",
  "people",
  "about",
  "contact",
  "privacy",
  "terms",
  "subscribe",
  "subscription",
  "signup",
  "login",
  "register",
  "videos",
  "video",
  "photos",
  "photo",
]);

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function buildSourceName(sourceDomain) {
  return sourceDomain
    .split('.')[0]
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toAbsoluteUrl(baseUrl, href) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (trimmed.toLowerCase().startsWith('javascript:')) return null;

  if (/^https?:/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const base = new URL(baseUrl);
    if (trimmed.startsWith('//')) {
      return `${base.protocol}${trimmed}`;
    }
    if (trimmed.startsWith('/')) {
      return `${base.protocol}//${base.hostname}${trimmed}`;
    }
  } catch {
    return null;
  }

  return null;
}

function toAbsoluteImageUrl(baseUrl, src) {
  if (!src || src.startsWith('data:')) return null;
  return toAbsoluteUrl(baseUrl, src);
}

function isLikelyCategoryPath(pathSegments) {
  if (pathSegments.length === 0) {
    return true;
  }

  const normalized = pathSegments.map(seg => seg.toLowerCase());
  if (normalized.some(seg => PATH_BLOCKLIST.has(seg))) {
    return true;
  }

  const last = normalized[normalized.length - 1];
  const hasDigits = /\d/.test(last);
  const hasHyphen = last.includes('-');

  if (CATEGORY_KEYWORDS.has(last)) {
    return true;
  }

  if (normalized.length === 1) {
    if (!hasDigits && !hasHyphen && last.length <= 24) {
      return true;
    }
  } else if (normalized.length === 2) {
    const prev = normalized[0];
    if (CATEGORY_KEYWORDS.has(prev) || PATH_BLOCKLIST.has(prev)) {
      return true;
    }
    if (!hasDigits && !hasHyphen && !/\d/.test(prev) && last.length <= 24) {
      return true;
    }
  }

  if (!hasDigits && normalized.length <= 2) {
    const matched = CATEGORY_SUBSTRINGS.some(substr => last.includes(substr));
    if (matched) {
      return true;
    }
  }

  return false;
}

function normalizeArticleUrl(candidateUrl, sourceDomain) {
  if (!candidateUrl) return null;

  try {
    const url = new URL(candidateUrl);
    const articleDomain = url.hostname.replace(/^www\./, "");
    if (articleDomain !== sourceDomain) {
      return null;
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (isLikelyCategoryPath(pathSegments)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function extractTitle($anchor) {
  const candidates = [
    cleanText($anchor.text()),
    cleanText($anchor.attr('aria-label')),
    cleanText($anchor.attr('title')),
    cleanText($anchor.attr('data-title')),
  ];

  return candidates.find(text => text && text.length >= 8) || null;
}

function findContainer($, $anchor) {
  const selectors = [
    'article',
    '[role="article"]',
    '[data-component*="Card"]',
    '[data-testid*="card"]',
    '[class*="card"]',
    '[class*="story"]',
    '[class*="item"]',
    '[class*="article"]',
    'li',
  ];

  for (const selector of selectors) {
    const container = $anchor.closest(selector);
    if (container.length) {
      return container;
    }
  }

  return $anchor.parent();
}

function findDescription($, $anchor, $container, sourceName, title) {
  const collected = [];
  const normalizedTitle = cleanText(title).toLowerCase();

  const collectText = (text) => {
    const cleaned = cleanText(text);
    if (!cleaned || cleaned.length < 20) return;
    if (cleaned.toLowerCase() === normalizedTitle) return;
    if (!collected.includes(cleaned)) {
      collected.push(cleaned);
    }
  };

  if ($container && $container.length) {
    $container.find('p').each((_, el) => {
      collectText($(el).text());
    });

    if (collected.length === 0) {
      const sibling = $container.nextAll('p').first();
      if (sibling.length) {
        collectText(sibling.text());
      }
    }
  }

  if (collected.length === 0) {
    collectText($anchor.attr('data-summary'));
    collectText($anchor.attr('title'));
  }

  return collected[0] || `Latest from ${sourceName}`;
}

function extractImageSource($img) {
  if (!$img || !$img.length) return null;
  const srcset = cleanText($img.attr('data-srcset') || $img.attr('srcset'));
  let src = $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original') || $img.attr('src');
  if (!src && srcset) {
    src = srcset.split(',')[0]?.trim().split(' ')[0];
  }
  return src;
}

function findImage($, $anchor, $container, sourceUrl) {
  const candidates = [];

  if ($container && $container.length) {
    $container.find('img').each((_, el) => {
      candidates.push($(el));
    });
  }

  if (!candidates.length) {
    const nested = $anchor.find('img').first();
    if (nested.length) {
      candidates.push(nested);
    }
  }

  for (const $img of candidates) {
    const rawSource = extractImageSource($img);
    const resolved = toAbsoluteImageUrl(sourceUrl, rawSource);
    if (resolved) {
      return resolved;
    }
    const pictureSource = $img.closest('picture').find('source').first();
    if (pictureSource.length) {
      const pictureSrc = pictureSource.attr('srcset') || pictureSource.attr('data-srcset');
      const absolute = toAbsoluteImageUrl(sourceUrl, pictureSrc?.split(',')[0]?.trim().split(' ')[0]);
      if (absolute) {
        return absolute;
      }
    }
  }

  return null;
}

function parseDateTime(value) {
  if (!value) return null;
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}

function findPublishedAt($, $anchor, $container) {
  const candidates = [];

  if ($container && $container.length) {
    $container.find('time').each((_, el) => {
      candidates.push($(el));
    });
  }

  const closestTime = $anchor.closest('time');
  if (closestTime.length) {
    candidates.push(closestTime);
  }

  for (const $time of candidates) {
    const datetime = $time.attr('datetime') || $time.attr('data-datetime') || $time.attr('data-time');
    if (datetime) {
      return cleanText(datetime);
    }
    const parsed = parseDateTime($time.text());
    if (parsed) {
      return parsed;
    }
  }

  return new Date().toISOString();
}

function buildArticleFromAnchor($, $anchor, sourceUrl, sourceName, sourceDomain) {
  const absoluteUrl = toAbsoluteUrl(sourceUrl, $anchor.attr('href'));
  const normalizedUrl = normalizeArticleUrl(absoluteUrl, sourceDomain);
  if (!normalizedUrl) {
    return null;
  }

  const title = extractTitle($anchor);
  if (!title || title.length < 8 || title.length > 200) {
    return null;
  }
  if (/^(home|read more|click here|view all|watch|listen|video|more)$/i.test(title)) {
    return null;
  }

  const $container = findContainer($, $anchor);
  const description = findDescription($, $anchor, $container, sourceName, title);
  const imageUrl = findImage($, $anchor, $container, sourceUrl);
  const publishedAt = findPublishedAt($, $anchor, $container);

  return {
    source: { id: sourceDomain, name: sourceName },
    author: sourceName,
    title,
    description: description.substring(0, 300),
    url: normalizedUrl,
    urlToImage: imageUrl,
    publishedAt,
    content: description,
  };
}

function extractWithCheerio(html, sourceUrl) {
  if (!html) return [];

  const source = new URL(sourceUrl);
  const sourceDomain = source.hostname.replace(/^www\./, "");
  const sourceName = buildSourceName(sourceDomain);
  const $ = load(html);
  const articles = [];
  const seenUrls = new Set();

  const selectors = [
    'article a[href]',
    '[role="article"] a[href]',
    '[data-component*="Card"] a[href]',
    '[data-testid*="card"] a[href]',
    '[class*="card"] a[href]',
    '[class*="story"] a[href]',
    '[class*="headline"] a[href]',
    '[class*="item"] a[href]',
    'h2 a[href]',
    'h3 a[href]'
  ];

  const collectedAnchors = [];
  const seenKeys = new Set();

  const collectAnchor = (el) => {
    const $anchor = $(el);
    const href = $anchor.attr('href');
    if (!href) return;
    const key = `${href}::${cleanText($anchor.text()).slice(0, 80)}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    collectedAnchors.push(el);
  };

  selectors.forEach(selector => {
    $(selector).each((_, el) => {
      collectAnchor(el);
    });
  });

  if (collectedAnchors.length < 15) {
    $('a[href]').each((_, el) => {
      collectAnchor(el);
    });
  }

  for (const anchorEl of collectedAnchors) {
    const $anchor = $(anchorEl);
    const article = buildArticleFromAnchor($, $anchor, sourceUrl, sourceName, sourceDomain);
    if (!article) continue;
    if (seenUrls.has(article.url)) continue;
    seenUrls.add(article.url);
    articles.push(article);
    if (articles.length >= 30) {
      break;
    }
  }

  return articles;
}

function extractWithRegex(html, sourceUrl, existingUrls = new Set()) {
  const articles = [];
  if (!html) return articles;

  const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const sourceName = buildSourceName(sourceDomain);

  const patterns = [
    /<(?:article|div)[^>]*class=["'][^"']*(?:article|post|story|news|item|card)[^"']*["'][^>]*>([\s\S]{50,3000}?)<\/(?:article|div)>/gi,
    /<(?:h2|h3)[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>[\s\S]*?<\/(?:h2|h3)>/gi,
  ];

  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      if (articles.length >= 20) break;
      const block = match[0];
      const hrefMatch = block.match(/href=["']([^"']+)["']/i);
      if (!hrefMatch) continue;
      const candidateHref = hrefMatch[1];
      const absoluteUrl = toAbsoluteUrl(sourceUrl, candidateHref);
      const normalizedUrl = normalizeArticleUrl(absoluteUrl, sourceDomain);
      if (!normalizedUrl || existingUrls.has(normalizedUrl)) continue;

      const titleMatch = block.match(/<(?:a|h2|h3)[^>]*>([^<]+)<\/(?:a|h2|h3)>/i) ||
        block.match(/title=["']([^"']+)["']/i) ||
        block.match(/alt=["']([^"']+)["']/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : null;
      if (!title || title.length < 8 || title.length > 200) continue;
      if (/^(home|read more|click here|view all|watch|listen|video|more)$/i.test(title)) continue;

      const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imageUrl = toAbsoluteImageUrl(sourceUrl, imgMatch ? imgMatch[1] : null);

      const descMatch = block.match(/<p[^>]*>([^<]{20,350})<\/p>/i) ||
        block.match(/class=["'][^"']*(?:excerpt|summary|description)[^"']*["'][^>]*>([^<]+)/i);
      const description = descMatch ? cleanText(descMatch[1]) : `Latest from ${sourceName}`;

      const timeMatch = block.match(/<time[^>]*datetime=["']([^"']+)["']/i) ||
        block.match(/(\d{1,2}\s+(?:minute|hour|day)s?\s+ago)/i);
      const publishedAt = timeMatch ? (timeMatch[1].includes('ago') ? new Date().toISOString() : cleanText(timeMatch[1])) : new Date().toISOString();

      articles.push({
        source: { id: sourceDomain, name: sourceName },
        author: sourceName,
        title,
        description: description.substring(0, 300),
        url: normalizedUrl,
        urlToImage: imageUrl,
        publishedAt,
        content: description,
      });

      existingUrls.add(normalizedUrl);
    }
  }

  return articles;
}

function extractArticlesFromHTML(html, sourceUrl) {
  const primary = extractWithCheerio(html, sourceUrl);
  const existing = new Set(primary.map(article => article.url));

  if (primary.length >= 18) {
    return primary.slice(0, 20);
  }

  const fallback = extractWithRegex(html, sourceUrl, existing);
  const combined = [...primary, ...fallback];

  const unique = [];
  const seen = new Set();
  for (const article of combined) {
    if (!article || !article.url) continue;
    if (seen.has(article.url)) continue;
    seen.add(article.url);
    unique.push(article);
    if (unique.length >= 20) break;
  }

  return unique;
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
