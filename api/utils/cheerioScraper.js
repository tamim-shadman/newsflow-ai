/**
 * Pure Cheerio Scraper - No Puppeteer/Browser Dependencies
 * Works perfectly on Vercel serverless environment
 * Optimized for Bangladesh news sites
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_MAX_CONTENT_LENGTH = 10000;
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Get a random user agent
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Direct Cheerio scraper - works perfectly on Vercel
 * No browser dependencies needed
 */
export async function cheerioScrape(url, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxContentLength = DEFAULT_MAX_CONTENT_LENGTH,
    extractArticles = true,
    maxArticles = 30,
  } = options;

  try {
    console.log(`[cheerioScraper] 🔧 Scraping: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8', // Support Bengali
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500, // Accept 4xx responses
      responseType: 'text',
    });

    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const $ = cheerio.load(response.data);
    const domain = new URL(url).hostname;

    // Remove noise
    $('script, style, nav, header, footer, aside, iframe, noscript').remove();
    $('.advertisement, .ad, .ads, .social-share, .comments, .sidebar').remove();
    $('[class*="ad-"], [id*="ad-"], [class*="banner"], [class*="popup"]').remove();

    // Extract metadata
    const title = $('title').text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('h1').first().text().trim() ||
                  '';

    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       '';

    // Extract main content
    let content = '';
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.story-content',
      '#content',
      'main',
    ];

    for (const selector of contentSelectors) {
      const elem = $(selector).first();
      if (elem.length && elem.text().trim().length > 200) {
        content = elem.text().trim();
        break;
      }
    }

    // Fallback to body if no content found
    if (!content) {
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();
    if (maxContentLength && content.length > maxContentLength) {
      content = content.slice(0, maxContentLength) + '...';
    }

    // Extract articles if requested
    const articles = [];
    if (extractArticles) {
      const articleSelectors = [
        // Standard article containers
        { container: 'article', title: 'h1, h2, h3, .title, [class*="title"], [class*="headline"]', link: 'a[href]' },
        { container: '.article, .news-item, .post, .story', title: 'h1, h2, h3, .title', link: 'a[href]' },
        { container: '[class*="article"], [class*="news"], [class*="post"]', title: 'h2, h3, .title', link: 'a[href]' },
        { container: '.card, .item, [class*="card"]', title: 'h2, h3, h4, .title', link: 'a[href]' },
        // Bangladesh-specific patterns
        { container: '.news-box, .news-list, .latest-news', title: 'h2, h3, h4', link: 'a[href]' },
        { container: '[class*="headline"], [class*="featured"]', title: 'h1, h2, h3', link: 'a[href]' },
      ];

      const seenUrls = new Set();

      for (const { container, title: titleSel, link: linkSel } of articleSelectors) {
        $(container).each((i, elem) => {
          if (articles.length >= maxArticles) return false;

          const $elem = $(elem);
          
          // Find title element first
          const $titleElem = $elem.find(titleSel).first();
          const articleTitle = $titleElem.text().trim();
          
          if (!articleTitle) return;
          
          // Try to find the link associated with the title
          // Priority: 1) Link wrapping title, 2) Link inside title, 3) Closest link to title, 4) First link in container
          let $link = $titleElem.closest('a[href]');
          if (!$link.length) {
            $link = $titleElem.find('a[href]').first();
          }
          if (!$link.length) {
            $link = $titleElem.parent().find('a[href]').first();
          }
          if (!$link.length) {
            $link = $elem.find(linkSel).first();
          }
          
          let articleUrl = $link.attr('href');
          
          if (!articleUrl) return;

          // Make URL absolute
          if (articleUrl && !articleUrl.startsWith('http')) {
            try {
              articleUrl = new URL(articleUrl, url).href;
            } catch (e) {
              return;
            }
          }

          // Skip duplicates
          if (seenUrls.has(articleUrl)) return;

          // Skip navigation/category links (common patterns)
          const urlPath = articleUrl.toLowerCase();
          if (
            articleUrl.includes('/category/') ||
            articleUrl.includes('/tag/') ||
            articleUrl.includes('/tags/') ||
            articleUrl.includes('/author/') ||
            articleUrl.includes('/page/') ||
            urlPath.endsWith('/bangladesh') ||
            urlPath.endsWith('/news') ||
            urlPath.endsWith('/latest') ||
            urlPath.endsWith('/asia') ||
            urlPath.endsWith('/world') ||
            (articleUrl.endsWith('/') && articleUrl.split('/').filter(Boolean).length <= 3)
          ) {
            return;
          }
          
          // Additional check: Article URLs typically have more path segments or date patterns
          const pathSegments = articleUrl.split('/').filter(Boolean);
          const hasDatePattern = /\d{4}\/\d{2}\/\d{2}|\d{8}/.test(articleUrl);
          const hasArticleIndicator = /article|story|news|post|read/.test(urlPath);
          const isLikelyArticle = pathSegments.length >= 4 || hasDatePattern || hasArticleIndicator;
          
          if (!isLikelyArticle) {
            console.log(`[cheerioScraper] ⚠️ Skipping likely category URL: ${articleUrl}`);
            return;
          }

          seenUrls.add(articleUrl);

          // Extract excerpt
          let excerpt = $elem.find('p, .excerpt, .description, [class*="excerpt"], [class*="summary"]')
            .first()
            .text()
            .trim()
            .slice(0, 300);

          if (!excerpt) {
            // Try to extract from link text or element text
            const elemText = $elem.text().trim();
            if (elemText.length > articleTitle.length + 20) {
              excerpt = elemText.slice(0, 300);
            }
          }

          // Extract image
          let imageUrl = null;
          const $img = $elem.find('img').first();
          if ($img.length) {
            imageUrl = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
            if (imageUrl && !imageUrl.startsWith('http')) {
              try {
                imageUrl = new URL(imageUrl, url).href;
              } catch (e) {
                imageUrl = null;
              }
            }
          }

          // Extract publish date
          let publishedAt = new Date().toISOString();
          const $time = $elem.find('time').first();
          if ($time.length) {
            const datetime = $time.attr('datetime') || $time.text();
            if (datetime) {
              try {
                const parsed = new Date(datetime);
                if (!isNaN(parsed.getTime())) {
                  publishedAt = parsed.toISOString();
                }
              } catch (e) {
                // Keep default
              }
            }
          }

          articles.push({
            title: articleTitle,
            url: articleUrl,
            excerpt: excerpt || articleTitle,
            description: excerpt || articleTitle,
            source: domain,
            urlToImage: imageUrl,
            publishedAt,
          });
        });

        if (articles.length >= maxArticles) break;
      }

      // If no articles found with structured selectors, try finding links in content
      if (articles.length === 0) {
        console.log('[cheerioScraper] No articles found with structured selectors, trying link extraction...');
        
        $('a[href]').each((i, elem) => {
          if (articles.length >= maxArticles) return false;

          const $link = $(elem);
          const linkText = $link.text().trim();
          let href = $link.attr('href');

          // Skip empty text or short links
          if (!linkText || linkText.length < 20) return;

          // Make URL absolute
          if (href && !href.startsWith('http')) {
            try {
              href = new URL(href, url).href;
            } catch (e) {
              return;
            }
          }

          // Skip duplicates
          if (seenUrls.has(href)) return;
          seenUrls.add(href);

          // Skip navigation/category links
          if (
            href.includes('/category/') ||
            href.includes('/tag/') ||
            href.includes('/author/') ||
            href.endsWith('/') && href.split('/').filter(Boolean).length <= 3
          ) {
            return;
          }

          // Look for associated image
          let imageUrl = null;
          const $parent = $link.closest('article, div, li, section');
          if ($parent.length) {
            const $img = $parent.find('img').first();
            if ($img.length) {
              imageUrl = $img.attr('src') || $img.attr('data-src');
              if (imageUrl && !imageUrl.startsWith('http')) {
                try {
                  imageUrl = new URL(imageUrl, url).href;
                } catch (e) {
                  imageUrl = null;
                }
              }
            }
          }

          articles.push({
            title: linkText,
            url: href,
            excerpt: linkText,
            description: linkText,
            source: domain,
            urlToImage: imageUrl,
            publishedAt: new Date().toISOString(),
          });
        });
      }
    }

    console.log(`[cheerioScraper] ✅ Scraped ${url}: ${content.length} chars, ${articles.length} articles`);

    return {
      success: true,
      url,
      title,
      description,
      content,
      articles,
      source: domain,
      scrapedAt: new Date().toISOString(),
      method: 'cheerio',
    };

  } catch (error) {
    console.error(`[cheerioScraper] ❌ Failed for ${url}:`, error.message);
    
    return {
      success: false,
      url,
      error: error.message,
      method: 'cheerio',
    };
  }
}

/**
 * Bangladesh-specific scraping with fallback cascade
 * Works perfectly on Vercel without browser dependencies
 */
export async function bangladeshScrape(url) {
  console.log('[bangladeshScrape] 🇧🇩 Starting Bangladesh-optimized scrape...');

  // Strategy 1: Try Jina Reader (fast, clean content)
  try {
    console.log('[bangladeshScrape] 📖 Trying Jina Reader...');
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await axios.get(jinaUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Timeout': '15',
        'X-Return-Format': 'html',
      },
      timeout: 15000,
    });

    if (response.data?.data?.content || response.data?.content) {
      const content = response.data?.data?.content || response.data?.content;
      console.log('[bangladeshScrape] ✅ Jina Reader success');
      
      return {
        success: true,
        url,
        content,
        method: 'jina',
        scrapedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn('[bangladeshScrape] ⚠️ Jina Reader failed:', error.message);
  }

  // Strategy 2: Direct Cheerio scrape (reliable fallback)
  console.log('[bangladeshScrape] 🔧 Falling back to Cheerio scraper...');
  const result = await cheerioScrape(url, {
    extractArticles: true,
    maxContentLength: 10000,
    maxArticles: 30,
  });

  if (result.success) {
    return result;
  }

  // Strategy 3: Simple fetch (last resort)
  try {
    console.log('[bangladeshScrape] 🌐 Trying simple fetch...');
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    const $ = cheerio.load(response.data);
    
    return {
      success: true,
      url,
      content: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000),
      method: 'simple-fetch',
      scrapedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[bangladeshScrape] ❌ All strategies failed:', error.message);
    
    return {
      success: false,
      url,
      error: 'All scraping strategies failed',
      methods_tried: ['jina', 'cheerio', 'simple-fetch'],
    };
  }
}

// Export for use in your existing code
export default {
  cheerioScrape,
  bangladeshScrape,
};
