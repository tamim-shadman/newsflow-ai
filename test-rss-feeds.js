/**
 * Test RSS Feed Fetching
 * Tests the RSS feeds directly to verify they work
 */

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

// RSS feeds to test
const RSS_FEEDS = {
  'CDC Health': 'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
  'NIH News': 'https://www.nih.gov/news-events/news-releases/rss.xml',
  'WebMD': 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC',
  'Healthline': 'https://www.healthline.com/rss',
  'Mayo Clinic': 'https://www.mayoclinic.org/rss/all-news',
  'BBC News': 'http://feeds.bbci.co.uk/news/world/rss.xml',
  'Reuters': 'https://www.reutersagency.com/feed/',
  'IMDb': 'https://www.imdb.com/news/rss',
  'Variety': 'https://variety.com/feed/',
};

async function testRSSFeed(name, url) {
  console.log(`\n🔄 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const feed = await parser.parseURL(url);
    const itemCount = feed.items?.length || 0;
    
    if (itemCount > 0) {
      console.log(`✅ SUCCESS: Fetched ${itemCount} items`);
      console.log(`   Latest: ${feed.items[0]?.title || 'No title'}`);
      console.log(`   Published: ${feed.items[0]?.pubDate || 'No date'}`);
      return { success: true, count: itemCount, feed: name };
    } else {
      console.log(`⚠️  WARNING: Feed returned 0 items`);
      return { success: false, count: 0, feed: name, error: 'No items' };
    }
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    return { success: false, count: 0, feed: name, error: error.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('            RSS FEED TEST SUITE');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = [];
  
  for (const [name, url] of Object.entries(RSS_FEEDS)) {
    const result = await testRSSFeed(name, url);
    results.push(result);
  }
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('                  SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.feed}: ${r.count} items`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.feed}: ${r.error}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  process.exit(failed.length > 0 ? 1 : 0);
}

runTests();
