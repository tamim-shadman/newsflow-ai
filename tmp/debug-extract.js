import fetch from 'node-fetch';

const CATEGORY_KEYWORDS = new Set([
  'news','world','politics','bangladesh','business','sports','economy','opinion','editorial','national','international','latest','top-news','topnews','todays-paper','todayspaper','photo','photos','video','videos','lifestyle','entertainment','tech','technology','education','health','science','crime','law','archives','all','more','asia','city'
]);
const CATEGORY_SUBSTRINGS = [
  'news','latest','breaking','headlines','update','updates','live','videos','video','photos','stories','story','analysis','opinion','world','politics','business','sports','health','entertainment','lifestyle','economy','finance'
];

function extractArticlesFromHTML(html, sourceUrl) {
  const articles = [];
  const seenUrls = new Set();
  if (!html) return articles;
  const sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, '');
  const articlePatterns = [
    /<(?:article|div)[^>]*class=["'][^"']*(?:article|post|story|news|item|card)[^"']*["'][^>]*>([\s\S]{50,2000}?)<\/(?:article|div)>/gi,
    /<(?:h2|h3)[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>[\s\S]*?<\/(?:h2|h3)>/gi
  ];

  for (const pattern of articlePatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const block = match[0];
      const urlMatch = block.match(/href=["']([^"']+)["']/);
      if (!urlMatch) continue;
      let articleUrl = urlMatch[1];
      if (articleUrl.startsWith('/')) {
        const base = new URL(sourceUrl);
        articleUrl = `${base.protocol}//${base.hostname}${articleUrl}`;
      }
      try {
        const articleLocation = new URL(articleUrl);
        const articleDomain = articleLocation.hostname.replace(/^www\./, '');
        if (articleDomain !== sourceDomain) { console.log('skip domain', articleUrl); continue; }
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
        if (looksLikeCategorySlug) { console.log('looksLikeCategory', articleUrl, pathSegments); continue; }
        if (normalizedSegments.some(seg => ['category','categories','tag','tags','topic','topics','section','sections'].includes(seg))) {
          console.log('seg keyword skip', articleUrl, pathSegments);
          continue;
        }
        const containsCategorySubstr = CATEGORY_SUBSTRINGS.some(substr => lastSegment.toLowerCase().includes(substr));
        if (containsCategorySubstr && pathSegments.length <= 2 && !/[0-9]/.test(lastSegment)) {
          console.log('substr skip', articleUrl, pathSegments);
          continue;
        }
      } catch (err) {
        console.log('url parse fail', articleUrl, err.message);
        continue;
      }
      console.log('PASS', articleUrl);
      seenUrls.add(articleUrl);
      articles.push(articleUrl);
    }
  }
  return articles;
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: node debug-extract.js <url>');
  process.exit(1);
}

const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
const res = await fetch(jinaUrl, { headers: { Accept: 'application/json', 'X-Return-Format': 'html', 'X-With-Images-Summary': 'true' }});
const data = await res.json();
const html = data?.data?.content || data?.data?.html || '';
const results = extractArticlesFromHTML(html, url);
console.log('total', results.length);
console.log(results.slice(0, 10));
