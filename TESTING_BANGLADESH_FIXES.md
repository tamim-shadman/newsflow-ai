# Testing the Bangladesh News Fixes

## Quick Test (30 seconds)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser console:**
   - Navigate to http://localhost:5173
   - Press `F12` to open DevTools
   - Go to Console tab

3. **Clear cache and test:**
   - Copy contents of `clear-news-cache.js` into console and press Enter
   - Wait for automatic page reload
   - Click on "Bangladesh" category
   - Watch console for logs

## What You Should See

### ✅ Successful Output

**Console logs should show:**
```
[scrape-direct] 🔍 Scraping bangladesh from 50 sites
[scrape-direct] 🌐 Fetching: https://www.thedailystar.net
[scrape-direct] ✅ https://www.thedailystar.net: 8 recent articles
[scrape-direct] 🌐 Fetching: https://www.prothomalo.com
[scrape-direct] ✅ https://www.prothomalo.com: 12 recent articles
[scrape-direct] 🌐 Fetching: https://bdnews24.com
[scrape-direct] ✅ https://bdnews24.com: 5 recent articles
[scrape-direct] ⏰ Skipping old article: Title (25.3 hours old)
[scrape-direct] 📊 Total articles from scraping: 45
```

**Frontend should display:**
- 20-30 news cards in Bangladesh section
- All articles show dates/times within last 24 hours
- No articles from October 24th or earlier
- News cards are clickable and open original articles

### ❌ Issues to Watch For

#### Problem 1: No articles showing
**Console shows:**
```
[scrape-direct] 🔍 Scraping bangladesh from 50 sites
[scrape-direct] ⏰ Skipping old article: ... (27.5 hours old)
[scrape-direct] ⏰ Skipping old article: ... (28.2 hours old)
[scrape-direct] 📊 Total articles from scraping: 0
```

**Diagnosis:** Newspapers haven't published in last 24 hours
**Solution:** Wait for new articles OR temporarily increase `MAX_ARTICLE_AGE` to 48 hours in `newsAggregator.ts` line 248

#### Problem 2: Still seeing old articles
**Old articles from Oct 24 still visible**

**Diagnosis:** Cache not cleared
**Solutions:**
1. Run `clear-news-cache.js` again
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Clear browser cache manually: DevTools → Application → Clear storage
4. Try incognito/private window

#### Problem 3: API errors
**Console shows:**
```
[scrape-direct] ❌ Failed to scrape https://www.thedailystar.net: Network error
```

**Diagnosis:** Jina Reader API or network issue
**Solutions:**
1. Check internet connection
2. Verify Jina Reader is accessible
3. Check for CORS errors in Network tab
4. Try different newspaper site

## Detailed Testing Steps

### Step 1: Verify Server Restart
```bash
# Stop any running dev server (Ctrl+C)
npm run dev
```
Wait for:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 2: Clear All Caches
Open browser console and run:
```javascript
// Clear localStorage
localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

// Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});

// Hard reload
location.reload(true);
```

### Step 3: Monitor Network Requests
1. Open DevTools → Network tab
2. Filter by "scrape-site"
3. Click Bangladesh category
4. Check for successful API calls (status 200)

### Step 4: Inspect Article Ages
Open console and run:
```javascript
// Get all visible articles
const articles = document.querySelectorAll('[data-article-date]');
articles.forEach(article => {
  const date = new Date(article.dataset.articleDate);
  const hoursAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  console.log(`📰 ${article.querySelector('h3').textContent}: ${hoursAgo.toFixed(1)} hours old`);
});
```

All should be < 24 hours.

## Advanced Debugging

### Check Scraper API Directly
Test the API endpoint directly:
```bash
curl "http://localhost:5173/api/scrape-site?url=https://www.thedailystar.net"
```

Should return JSON with:
```json
{
  "articles": [
    {
      "title": "...",
      "publishedAt": "2024-10-28T...",
      "url": "...",
      "image": "..."
    }
  ]
}
```

### Check Article Ages in Code
Add this to browser console:
```javascript
// Monitor article filtering
const originalLog = console.log;
console.log = function(...args) {
  if (args[0]?.includes?.('Skipping old article')) {
    console.warn('⚠️ OLD ARTICLE FILTERED:', ...args);
  }
  originalLog.apply(console, args);
};
```

### Verify Date Filtering Constants
Check current values:
```javascript
// In browser console (after page loads)
fetch('http://localhost:5173/src/services/newsAggregator.ts')
  .then(r => r.text())
  .then(code => {
    const maxAge = code.match(/MAX_ARTICLE_AGE\s*=\s*(\d+)/);
    console.log('MAX_ARTICLE_AGE:', maxAge?.[1], 'ms');
    console.log('Hours:', maxAge?.[1] / (1000 * 60 * 60));
  });
```

Should show 24 hours (86400000 ms).

## Success Criteria

✅ **All checks must pass:**

1. **No old articles**: All visible articles < 24 hours old
2. **Scraper working**: Console shows successful scrapes (✅)
3. **Multiple sources**: Articles from 5+ different newspapers
4. **Clickable cards**: Clicking opens original article in new tab
5. **Fresh data**: Each page refresh may show different articles
6. **No errors**: Console shows no red errors

## If All Else Fails

### Nuclear Option: Full Reset
```bash
# Stop server
Ctrl+C

# Clear node modules and reinstall
rm -rf node_modules
npm install

# Clear Vercel cache (if deployed)
rm -rf .vercel

# Restart dev server
npm run dev
```

### Temporary Workaround: Increase Age Limit
If newspapers really haven't published recently:

**File: `src/services/newsAggregator.ts`**
```typescript
// Line 248 - Temporarily increase from 24h to 48h
const MAX_ARTICLE_AGE = 48 * HOUR_MS; // 48 hours in milliseconds
```

Then restart server and retest.

## Expected Timeline

- **Immediate (0-5 min)**: Cache clear, see new logging in console
- **Short (5-15 min)**: Articles start appearing as scrapes complete
- **Normal (15-30 min)**: Full Bangladesh section populated with fresh articles

## Getting Help

If issues persist after following this guide:

1. **Capture console logs**: Copy entire console output
2. **Check API response**: Copy `/api/scrape-site` response
3. **Note symptoms**: What exactly isn't working?
4. **Share timestamp**: When did issue occur?

Then provide these details for further debugging.

---

## Quick Reference: Key Files Modified

- `src/services/newsAggregator.ts` (Lines 248, 249, 1001-1047, 1367-1373)
- `api/scrape-site.js` (Multiple sections)
- Both files enforce 24-hour article age limit
- Triple-layer protection: constants, scraper filter, age windows
