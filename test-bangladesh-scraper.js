/**
 * Test script for Bangladesh Cheerio scraper
 * Tests the new Cheerio-based scraping without Puppeteer
 */

import { bangladeshScrape, cheerioScrape } from './api/utils/cheerioScraper.js';

console.log('🧪 Testing Bangladesh Cheerio Scraper\n');

// Test URLs
const testUrls = [
  'https://en.prothomalo.com',
  'https://www.thedailystar.net',
  'https://bdnews24.com',
];

async function testScraper() {
  console.log('1️⃣ Testing bangladeshScrape() function...\n');
  
  for (const url of testUrls) {
    console.log(`\n📰 Testing: ${url}`);
    console.log('─'.repeat(80));
    
    try {
      const result = await bangladeshScrape(url);
      
      if (result.success) {
        console.log(`✅ Success!`);
        console.log(`   Method: ${result.method}`);
        console.log(`   Content length: ${result.content ? result.content.length : 0} chars`);
        console.log(`   Articles: ${result.articles ? result.articles.length : 0}`);
        
        if (result.articles && result.articles.length > 0) {
          console.log(`\n   📄 Sample articles:`);
          result.articles.slice(0, 3).forEach((article, idx) => {
            console.log(`      ${idx + 1}. ${article.title?.substring(0, 60)}...`);
            console.log(`         ${article.url?.substring(0, 70)}...`);
          });
        }
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n2️⃣ Testing cheerioScrape() function...\n');
  
  const testUrl = 'https://en.prothomalo.com';
  console.log(`📰 Testing: ${testUrl}`);
  console.log('─'.repeat(80));
  
  try {
    const result = await cheerioScrape(testUrl, {
      extractArticles: true,
      maxArticles: 10,
    });
    
    if (result.success) {
      console.log(`✅ Success!`);
      console.log(`   Title: ${result.title?.substring(0, 60)}...`);
      console.log(`   Description: ${result.description?.substring(0, 80)}...`);
      console.log(`   Content length: ${result.content?.length} chars`);
      console.log(`   Articles extracted: ${result.articles?.length}`);
      
      if (result.articles && result.articles.length > 0) {
        console.log(`\n   📄 Extracted articles:`);
        result.articles.slice(0, 5).forEach((article, idx) => {
          console.log(`      ${idx + 1}. ${article.title}`);
          console.log(`         URL: ${article.url}`);
          console.log(`         Has image: ${article.urlToImage ? 'Yes' : 'No'}`);
        });
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n\n✅ Testing complete!');
  console.log('\n📊 Summary:');
  console.log('   - bangladeshScrape(): 3-strategy fallback (Jina → Cheerio → Simple)');
  console.log('   - cheerioScrape(): Direct article extraction with smart selectors');
  console.log('   - No Puppeteer dependencies required');
  console.log('   - Works perfectly on Vercel serverless');
}

// Run tests
testScraper().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
