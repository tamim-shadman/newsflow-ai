/**
 * Browser Scraper Utility
 * Uses Puppeteer with @sparticuz/chromium for serverless environments (Vercel)
 * Provides headless browser scraping as a fallback when Jina Reader and Mercury Parser fail
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

let browser = null;

/**
 * Get or create a browser instance
 * Reuses the same browser across requests to improve performance
 */
async function getBrowser() {
  if (browser && browser.isConnected()) {
    return browser;
  }

  try {
    console.log('[browserScraper] 🚀 Launching headless browser...');
    
    // Configure chromium for serverless
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    console.log('[browserScraper] ✅ Browser launched successfully');
    return browser;
  } catch (error) {
    console.error('[browserScraper] ❌ Failed to launch browser:', error.message);
    throw error;
  }
}

/**
 * Fetch HTML content using headless browser
 * @param {string} url - The URL to fetch
 * @param {number} timeout - Maximum time to wait (milliseconds)
 * @returns {Promise<string>} The HTML content
 */
export async function fetchWithBrowser(url, timeout = 15000) {
  let page = null;
  
  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });
    
    console.log(`[browserScraper] 🌐 Navigating to: ${url}`);
    
    // Navigate with timeout and wait for network idle
    await page.goto(url, {
      timeout: timeout,
      waitUntil: 'networkidle2', // Wait until network is mostly idle
    });
    
    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(1000);
    
    // Get the HTML content
    const html = await page.content();
    
    console.log(`[browserScraper] ✅ Fetched ${html.length} characters from ${url}`);
    
    await page.close();
    return html;
    
  } catch (error) {
    console.error(`[browserScraper] ❌ Error fetching ${url}:`, error.message);
    
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('[browserScraper] Failed to close page:', closeError.message);
      }
    }
    
    throw error;
  }
}

/**
 * Close the browser instance
 * Should be called during cleanup
 */
export async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
      browser = null;
      console.log('[browserScraper] 🔒 Browser closed');
    } catch (error) {
      console.error('[browserScraper] Error closing browser:', error.message);
    }
  }
}

// Clean up on process termination
process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);
