/**
 * Find and Test Alternative RSS Feeds
 * Comprehensive search for working RSS feeds across all categories
 */

import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

// Comprehensive list of RSS feeds to test
const RSS_FEEDS = {
  // HEALTH FEEDS
  health: {
    'CDC Health (Current)': 'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
    'WHO News': 'https://www.who.int/rss-feeds/news-english.xml',
    'Medical News Today': 'https://www.medicalnewstoday.com/rss',
    'ScienceDaily Health': 'https://www.sciencedaily.com/rss/health_medicine.xml',
    'Health.gov': 'https://health.gov/news/rss',
    'FDA News': 'https://www.fda.gov/about-fda/contact-fda/stay-connected/rss-feeds/news-events/rss.xml',
    'Johns Hopkins Medicine': 'https://www.hopkinsmedicine.org/news/rss',
    'Harvard Health': 'https://www.health.harvard.edu/rss',
    'Cleveland Clinic': 'https://health.clevelandclinic.org/feed/',
    'WebMD (Current)': 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC',
    'Healthline (Current)': 'https://www.healthline.com/rss',
    'NIH News (Current)': 'https://www.nih.gov/news-events/news-releases/rss.xml',
    'Mayo Clinic (Current)': 'https://www.mayoclinic.org/rss/all-news',
  },
  
  // ENTERTAINMENT FEEDS
  entertainment: {
    'Variety (Current)': 'https://variety.com/feed/',
    'Hollywood Reporter': 'https://www.hollywoodreporter.com/feed/',
    'Deadline Hollywood': 'https://deadline.com/feed/',
    'Entertainment Weekly': 'https://ew.com/feed/',
    'Collider': 'https://collider.com/feed/',
    'Screen Rant': 'https://screenrant.com/feed/',
    'Comic Book': 'https://comicbook.com/rss.xml',
    'IGN Entertainment': 'https://feeds.feedburner.com/ign/all',
    'GameSpot News': 'https://www.gamespot.com/feeds/news/',
    'Polygon': 'https://www.polygon.com/rss/index.xml',
    'The Verge Entertainment': 'https://www.theverge.com/rss/entertainment/index.xml',
    'Rolling Stone': 'https://www.rollingstone.com/feed/',
    'Billboard': 'https://www.billboard.com/feed/',
    'Pitchfork': 'https://pitchfork.com/rss/news/',
    'IMDb (Current)': 'https://www.imdb.com/news/rss',
  },
  
  // TECHNOLOGY FEEDS
  technology: {
    'TechCrunch': 'https://techcrunch.com/feed/',
    'The Verge': 'https://www.theverge.com/rss/index.xml',
    'Wired': 'https://www.wired.com/feed/rss',
    'Ars Technica': 'https://feeds.arstechnica.com/arstechnica/index',
    'Engadget': 'https://www.engadget.com/rss.xml',
    'CNET': 'https://www.cnet.com/rss/news/',
    'ZDNet': 'https://www.zdnet.com/news/rss.xml',
    'MIT Technology Review': 'https://www.technologyreview.com/feed/',
    'Hacker News': 'https://news.ycombinator.com/rss',
    'Slashdot': 'http://rss.slashdot.org/Slashdot/slashdotMain',
    'TechRadar': 'https://www.techradar.com/rss',
    'PCWorld': 'https://www.pcworld.com/feed',
    'Android Authority': 'https://www.androidauthority.com/feed/',
    'MacRumors': 'https://www.macrumors.com/feed/',
  },
  
  // SPORTS FEEDS
  sports: {
    'ESPN': 'https://www.espn.com/espn/rss/news',
    'BBC Sport': 'http://feeds.bbci.co.uk/sport/rss.xml',
    'Sky Sports': 'https://www.skysports.com/rss/12040',
    'Sports Illustrated': 'https://www.si.com/rss/si_topstories.rss',
    'Bleacher Report': 'https://bleacherreport.com/articles/feed',
    'The Athletic': 'https://theathletic.com/feeds/rss/',
    'Yahoo Sports': 'https://sports.yahoo.com/rss/',
    'Goal.com': 'https://www.goal.com/feeds/en/news',
    'NFL News': 'https://www.nfl.com/feeds/rss/news',
    'NBA News': 'https://www.nba.com/news/rss.xml',
    'MLB News': 'https://www.mlb.com/feeds/news/rss.xml',
  },
  
  // BUSINESS FEEDS
  business: {
    'Bloomberg': 'https://feeds.bloomberg.com/markets/news.rss',
    'Reuters Business': 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best',
    'Financial Times': 'https://www.ft.com/?format=rss',
    'WSJ': 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
    'CNBC': 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    'MarketWatch': 'https://www.marketwatch.com/rss/',
    'Forbes': 'https://www.forbes.com/real-time/feed2/',
    'Business Insider': 'https://markets.businessinsider.com/rss/news',
    'The Economist': 'https://www.economist.com/finance-and-economics/rss.xml',
    'Fortune': 'https://fortune.com/feed/',
    'Fast Company': 'https://www.fastcompany.com/latest/rss',
  },
  
  // WORLD NEWS FEEDS
  world: {
    'BBC News (Current)': 'http://feeds.bbci.co.uk/news/world/rss.xml',
    'Reuters (Current)': 'https://www.reutersagency.com/feed/',
    'Al Jazeera': 'https://www.aljazeera.com/xml/rss/all.xml',
    'The Guardian': 'https://www.theguardian.com/world/rss',
    'CNN World': 'http://rss.cnn.com/rss/edition_world.rss',
    'NPR News': 'https://feeds.npr.org/1001/rss.xml',
    'Associated Press': 'https://feedx.net/rss/ap.xml',
    'DW News': 'https://rss.dw.com/rdf/rss-en-all',
    'France 24': 'https://www.france24.com/en/rss',
    'ABC News': 'https://abcnews.go.com/abcnews/internationalheadlines',
    'The Independent': 'https://www.independent.co.uk/news/world/rss',
    'NY Times World': 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  },
  
  // BANGLADESH FEEDS
  bangladesh: {
    'BBC News (Current)': 'http://feeds.bbci.co.uk/news/world/rss.xml',
    'The Daily Star': 'https://www.thedailystar.net/feed',
    'Dhaka Tribune': 'https://www.dhakatribune.com/feed',
    'New Age Bangladesh': 'https://www.newagebd.net/feed',
    'Prothom Alo': 'https://en.prothomalo.com/feed',
    'bdnews24': 'https://bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true',
    'Bangladesh Post': 'https://bangladeshpost.net/feed',
  },
};

async function testFeed(name, url) {
  try {
    const feed = await parser.parseURL(url);
    const itemCount = feed.items?.length || 0;
    
    if (itemCount > 0) {
      return {
        success: true,
        name,
        url,
        count: itemCount,
        title: feed.title,
        latest: feed.items[0]?.title,
        date: feed.items[0]?.pubDate,
      };
    }
    return { success: false, name, url, error: 'No items' };
  } catch (error) {
    return { success: false, name, url, error: error.message };
  }
}

async function testCategory(categoryName, feeds) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${categoryName.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const results = [];
  for (const [name, url] of Object.entries(feeds)) {
    process.stdout.write(`Testing ${name}...`);
    const result = await testFeed(name, url);
    
    if (result.success) {
      console.log(` ✅ ${result.count} items`);
      results.push(result);
    } else {
      console.log(` ❌ ${result.error}`);
    }
  }
  
  return results;
}

async function runTests() {
  console.log('═'.repeat(60));
  console.log('        RSS FEED DISCOVERY & TESTING');
  console.log('═'.repeat(60));
  
  const allResults = {};
  
  for (const [category, feeds] of Object.entries(RSS_FEEDS)) {
    const results = await testCategory(category, feeds);
    allResults[category] = results;
  }
  
  // Final Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('                WORKING FEEDS SUMMARY');
  console.log('═'.repeat(60));
  
  for (const [category, results] of Object.entries(allResults)) {
    const successful = results.filter(r => r.success);
    console.log(`\n${category.toUpperCase()}: ${successful.length} working feeds`);
    successful.forEach(r => {
      console.log(`  ✅ ${r.name} (${r.count} items)`);
      console.log(`     ${r.url}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
}

runTests();
