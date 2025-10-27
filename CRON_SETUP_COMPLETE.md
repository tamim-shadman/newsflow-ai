# Vercel Cron Job Setup Guide

## Overview
Keep your news caches warm and articles pre-fetched with automated Vercel cron jobs.

## 🎯 Why Use Cron Jobs?

### Benefits
- **Faster Load Times**: Articles pre-cached = instant loading
- **Reduced API Calls**: Warm caches mean fewer requests
- **Better UX**: Users see content immediately
- **Proactive Updates**: News refreshes automatically

## 📋 Setup Instructions

### Step 1: Create Cron Secret
```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to Vercel environment variables:
1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Add: `CRON_SECRET` = `{your-generated-secret}`

### Step 2: Create Warm Cache Endpoint

Create `api/warm-cache.js`:

```javascript
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  
  // Verify this is from Vercel Cron
  const cronSecret = req.headers['x-vercel-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    console.warn('[warm-cache] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[warm-cache] Starting cache warming...');
  
  try {
    const categories = [
      'all', 'technology', 'sports', 'business', 
      'health', 'entertainment', 'world', 'bangladesh'
    ];
    
    const results = {
      timestamp: new Date().toISOString(),
      categories: {},
      totalWarmed: 0,
      errors: []
    };

    // Warm news cache for each category
    for (const category of categories) {
      try {
        const response = await fetch(
          `${req.headers.origin || 'https://newsflow-ai-dusky.vercel.app'}/api/news?category=${category}&pageSize=20`,
          { 
            headers: { 'x-internal-request': 'true' },
            signal: AbortSignal.timeout(8000) // 8s timeout
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          results.categories[category] = {
            articles: data.articles?.length || 0,
            status: 'warmed'
          };
          results.totalWarmed += data.articles?.length || 0;
          console.log(`[warm-cache] ✓ ${category}: ${data.articles?.length || 0} articles`);
        } else {
          results.categories[category] = { status: 'failed', code: response.status };
          results.errors.push(`${category} returned ${response.status}`);
        }
      } catch (err) {
        results.categories[category] = { status: 'error', message: err.message };
        results.errors.push(`${category}: ${err.message}`);
        console.error(`[warm-cache] ✗ ${category}:`, err.message);
      }
    }

    // Warm featured articles
    try {
      const featuredResponse = await fetch(
        `${req.headers.origin || 'https://newsflow-ai-dusky.vercel.app'}/api/news?category=featured`,
        { 
          headers: { 'x-internal-request': 'true' },
          signal: AbortSignal.timeout(8000)
        }
      );
      
      if (featuredResponse.ok) {
        const data = await featuredResponse.json();
        results.featured = {
          articles: data.articles?.length || 0,
          status: 'warmed'
        };
        results.totalWarmed += data.articles?.length || 0;
        console.log(`[warm-cache] ✓ featured: ${data.articles?.length || 0} articles`);
      }
    } catch (err) {
      results.featured = { status: 'error', message: err.message };
      console.error(`[warm-cache] ✗ featured:`, err.message);
    }

    console.log(`[warm-cache] Complete! Warmed ${results.totalWarmed} articles`);
    
    res.status(200).json({
      success: true,
      ...results
    });
    
  } catch (error) {
    console.error('[warm-cache] Fatal error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Step 3: Create vercel.json Configuration

Create/update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/warm-cache",
      "schedule": "*/15 * * * *"
    }
  ],
  "functions": {
    "api/warm-cache.js": {
      "maxDuration": 30
    },
    "api/news.js": {
      "maxDuration": 10
    },
    "api/fetch-article.js": {
      "maxDuration": 15
    }
  }
}
```

### Step 4: Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "Add cron job for cache warming"
git push

# Deploy (automatic if connected to GitHub)
# Or manually:
vercel --prod
```

### Step 5: Verify Cron Job

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Cron Jobs**
3. You should see:
   - **Path**: `/api/warm-cache`
   - **Schedule**: `*/15 * * * *`
   - **Status**: Active ✅

## 📅 Cron Schedule Examples

```bash
# Every 15 minutes (recommended for news)
*/15 * * * *

# Every 30 minutes (moderate traffic)
*/30 * * * *

# Every hour
0 * * * *

# Every 6 hours
0 */6 * * *

# Every day at midnight
0 0 * * *

# Every weekday at 9 AM
0 9 * * 1-5
```

## 🔍 Monitoring

### Check Logs
```bash
# View cron execution logs
vercel logs --follow
```

### Test Manually
```bash
# Test the endpoint
curl -X GET "https://your-app.vercel.app/api/warm-cache" \
  -H "x-vercel-cron-secret: your-secret-here"
```

### Expected Response
```json
{
  "success": true,
  "timestamp": "2025-10-27T12:00:00.000Z",
  "categories": {
    "all": { "articles": 20, "status": "warmed" },
    "technology": { "articles": 20, "status": "warmed" },
    "sports": { "articles": 20, "status": "warmed" },
    "business": { "articles": 20, "status": "warmed" },
    "health": { "articles": 20, "status": "warmed" },
    "entertainment": { "articles": 20, "status": "warmed" },
    "world": { "articles": 20, "status": "warmed" },
    "bangladesh": { "articles": 20, "status": "warmed" }
  },
  "featured": { "articles": 7, "status": "warmed" },
  "totalWarmed": 167,
  "errors": []
}
```

## 🎯 Advanced Options

### Option 1: Article Pre-fetching
Pre-fetch article content for trending stories:

```javascript
// In warm-cache.js, after warming news cache:

// Get top 5 articles from each category
const topArticles = categories.flatMap(cat => 
  results.categories[cat]?.articles?.slice(0, 5) || []
);

// Pre-fetch their full content
results.prefetched = {
  articles: 0,
  success: 0,
  failed: 0
};

for (const article of topArticles) {
  try {
    const response = await fetch(
      `${baseUrl}/api/fetch-article?url=${encodeURIComponent(article.url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (response.ok) {
      results.prefetched.success++;
    } else {
      results.prefetched.failed++;
    }
    results.prefetched.articles++;
  } catch (err) {
    results.prefetched.failed++;
  }
}
```

### Option 2: Selective Warming
Only warm high-traffic categories:

```javascript
const highTrafficCategories = ['all', 'technology', 'sports', 'business'];
```

### Option 3: Time-based Warming
More frequent updates during peak hours:

```json
{
  "crons": [
    {
      "path": "/api/warm-cache",
      "schedule": "*/10 * * * *",
      "description": "Every 10 minutes during business hours (9am-9pm)"
    },
    {
      "path": "/api/warm-cache",
      "schedule": "0 */2 * * *",
      "description": "Every 2 hours during off-peak (9pm-9am)"
    }
  ]
}
```

## 💰 Cost Considerations

### Vercel Free Tier
- 100 GB-Hours per month
- Typical cron execution: ~2-5s
- Cost per execution: negligible
- ***/15 schedule** = ~2,880 executions/month = well within limits

### Pro Tier
- 1000 GB-Hours per month
- More than enough for aggressive caching

### Optimization Tips
1. Use conditional warming (check cache age first)
2. Batch requests efficiently
3. Set appropriate timeouts
4. Monitor function duration

## 🐛 Troubleshooting

### Cron Not Running
1. Check `vercel.json` syntax
2. Verify deployment succeeded
3. Check Vercel dashboard for errors
4. Ensure `CRON_SECRET` is set

### Timeouts
Increase `maxDuration` in `vercel.json`:
```json
{
  "functions": {
    "api/warm-cache.js": {
      "maxDuration": 60
    }
  }
}
```

### High Error Rate
1. Check API rate limits
2. Reduce pageSize
3. Add retry logic
4. Increase timeouts

### Logs Not Showing
```bash
# Stream logs in real-time
vercel logs --follow

# Filter by function
vercel logs --follow | grep "warm-cache"
```

## 📊 Metrics to Track

### Key Performance Indicators
- **Cache Hit Rate**: % of requests served from cache
- **Average Warm Time**: How long warming takes
- **Error Rate**: % of failed warming attempts
- **Coverage**: % of categories successfully warmed

### Sample Dashboard Query
```javascript
// Add to warm-cache endpoint
const metrics = {
  duration: Date.now() - startTime,
  successRate: (totalSuccess / totalAttempts * 100).toFixed(2),
  articlesPerSecond: (totalWarmed / (duration / 1000)).toFixed(2)
};
```

## ✅ Best Practices

1. **Set Appropriate Schedule**: Balance freshness vs. cost
2. **Monitor Execution**: Check logs regularly
3. **Handle Errors Gracefully**: Don't fail entire run if one category fails
4. **Use Timeouts**: Prevent hanging functions
5. **Log Everything**: Make debugging easier
6. **Test Locally First**: Use curl to test endpoint
7. **Set Up Alerts**: Get notified of failures

## 🎉 Result

With cron jobs enabled:
- ✅ News always fresh (15-min updates)
- ✅ Instant loading (cached)
- ✅ Lower API usage (pre-warmed)
- ✅ Better UX (no loading spinners)
- ✅ Automatic (hands-off)

Your app will feel **blazingly fast** with pre-warmed caches! 🚀
