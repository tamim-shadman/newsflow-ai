/**
 * Test URL extraction from Bangladesh news sites
 */

import { cheerioScrape } from './api/utils/cheerioScraper.js';

console.log('🧪 Testing URL Extraction from Bangladesh News Sites\n');

const testSites = [
  'https://www.thedailystar.net/news/bangladesh',
  'https://en.prothomalo.com',
  'https://bdnews24.com/bangladesh',
];

async function testUrlExtraction() {
  for (const site of testSites) {
    console.log(`\n📰 Testing: ${site}`);
    console.log('─'.repeat(80));
    
    try {
      const result = await cheerioScrape(site, {
        extractArticles: true,
        maxArticles: 5, // Only get 5 for testing
      });
      
      if (result.success && result.articles) {
        console.log(`✅ Found ${result.articles.length} articles\n`);
        
        result.articles.forEach((article, idx) => {
          console.log(`${idx + 1}. ${article.title}`);
          console.log(`   URL: ${article.url}`);
          console.log(`   Image: ${article.urlToImage ? '✅' : '❌'}`);
          
          // Check if URL looks like an article URL
          const urlParts = article.url.split('/').filter(Boolean);
          const isLikelyArticle = urlParts.length >= 4;
          const hasCategory = /\/(category|tag|author|page)\//i.test(article.url);
          
          if (hasCategory) {
            console.log(`   ⚠️  WARNING: Looks like a category URL!`);
          } else if (isLikelyArticle) {
            console.log(`   ✅ Looks like an article URL`);
          } else {
            console.log(`   ⚠️  URL might be too short (${urlParts.length} segments)`);
          }
          console.log('');
        });
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Test complete!');
}

testUrlExtraction().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
