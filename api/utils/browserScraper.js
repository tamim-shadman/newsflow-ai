import { chromium } from 'playwright-core';

let browserInstance = null;
let browserContext = null;

/**
 * Get or create a browser instance (reused across requests)
 */
async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  try {
    // Use chromium-browserless if available in Vercel, otherwise local chromium
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
      ],
      executablePath,
    });

    // Create a persistent context
    browserContext = await browserInstance.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    console.log('[BrowserScraper] ✅ Browser instance created');
    return browserInstance;
  } catch (error) {
    console.error('[BrowserScraper] ❌ Failed to launch browser:', error);
    throw error;
  }
}

/**
 * Fetch URL with headless browser
 * @param {string} url - Target URL
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} HTML content
 */
export async function fetchWithBrowser(url, timeout = 15000) {
  let page = null;

  try {
    console.log(`[BrowserScraper] 🌐 Fetching with browser: ${url}`);
    
    await getBrowser();
    
    if (!browserContext) {
      throw new Error('Browser context not available');
    }

    page = await browserContext.newPage();

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    });

    // Navigate with retry logic
    let attempts = 0;
    let lastError = null;
    
    while (attempts < 2) {
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: timeout,
        });
        break;
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts < 2) {
          console.log(`[BrowserScraper] ⚠️ Attempt ${attempts} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (attempts === 2) {
      throw lastError;
    }

    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');

    // Get the HTML
    const html = await page.content();

    console.log(`[BrowserScraper] ✅ Successfully fetched ${html.length} chars from ${url}`);
    
    return html;
  } catch (error) {
    console.error(`[BrowserScraper] ❌ Failed to fetch ${url}:`, error.message);
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Clean up browser resources
 */
export async function closeBrowser() {
  if (browserContext) {
    try {
      await browserContext.close();
      browserContext = null;
    } catch (e) {
      console.error('[BrowserScraper] Error closing context:', e);
    }
  }

  if (browserInstance) {
    try {
      await browserInstance.close();
      browserInstance = null;
      console.log('[BrowserScraper] 🔒 Browser instance closed');
    } catch (e) {
      console.error('[BrowserScraper] Error closing browser:', e);
    }
  }
}

// Clean up on process exit
process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);
