# 🚀 Quick Fix Guide - Get Bangladesh & Health News Working

## The Problem
RSS feeds for Bangladesh and Health categories are failing because the RSS2JSON API has rate limits on free tier.

## ✅ Solution: Add RSS2JSON API Key

### Step 1: Get Free API Key (2 minutes)
1. Visit: https://rss2json.com/
2. Click **"Sign Up"** or **"Get API Key"**
3. Create free account (no credit card required)
4. Copy your API key

### Step 2: Add to Your Project
Create a `.env` file in your project root:

```bash
# /path/to/your/newsflow-ai/.env

# RSS2JSON API Key (Free - 10,000 requests/day)
# Get yours at: https://rss2json.com/
RSS2JSON_API_KEY=your_api_key_here

# Other API keys...
GROQ_API_KEY=your_groq_api_key_here
GUARDIAN_API_KEY=your_guardian_key_here
CURRENTS_API_KEY=your_currents_key_here
GNEWS_API_KEY=your_gnews_key_here
NEWSDATA_API_KEY=your_newsdata_key_here
```

### Step 3: Restart Dev Server
```powershell
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test
1. Open browser console (F12)
2. Navigate to **Bangladesh** or **Health** category
3. Look for success messages:
   ```
   ✅ RSS fetched: 15 items from The Daily Star
   ✅ RSS fetched: 12 items from WHO News
   ```

---

## 📊 What You'll Get

### Without API Key (Current State)
- ❌ Rate limited after ~10 requests
- ❌ Bangladesh & Health show fallback articles only
- ❌ Limited variety

### With API Key (After Fix)
- ✅ 10,000 requests/day
- ✅ Bangladesh: 11 live RSS feeds working
- ✅ Health: 14 live RSS feeds working
- ✅ Fresh news every 30 minutes
- ✅ Unlimited variety

---

## 🆓 Free API Key Benefits

**RSS2JSON Free Tier:**
- ✅ 10,000 requests per day
- ✅ No credit card required
- ✅ Instant activation
- ✅ No expiration
- ✅ Perfect for development

**Calculation:**
- 128 news sources in app
- Most categories use 2-6 RSS feeds
- Average: 3 RSS feeds per page load
- = **3,300+ page loads per day** before hitting limit
- = **More than enough for development and testing!**

---

## Alternative: Use Fallback Articles

If you can't get an API key right now, the app already has **fallback articles** for every category:

**Current Fallback System:**
- ✅ 6 high-quality static articles per category
- ✅ Cover latest trends in each domain
- ✅ Professional sources and images
- ✅ Work offline
- ✅ No API calls needed

**To rely on fallbacks:**
Just use the app as-is. It will automatically show fallback articles when RSS feeds fail.

---

## 🔧 Troubleshooting

### Problem: Still not working after adding API key

**Check 1: Restart Required**
- API keys are loaded at server startup
- Must restart dev server after adding to .env

**Check 2: Correct File Location**
```
/path/to/your/newsflow-ai/.env  ✅ Correct
/path/to/your/newsflow-ai/src/.env  ❌ Wrong
```

**Check 3: No Quotes**
```bash
RSS2JSON_API_KEY=abc123def456  ✅ Correct
RSS2JSON_API_KEY="abc123def456"  ❌ Wrong (remove quotes)
```

**Check 4: Check Console Logs**
Open browser console and look for:
```
✅ RSS fetched: 15 items from...
```
NOT
```
❌ RSS fetch failed: 401 Unauthorized
```

### Problem: "401 Unauthorized" error

**Solution:** Invalid API key
1. Double-check key copied correctly
2. No extra spaces before/after key
3. Get new key from RSS2JSON if needed

### Problem: "429 Too Many Requests"

**Solution:** Rate limit exceeded
1. Wait 1 hour for limit reset
2. Upgrade to paid plan (optional)
3. Or use fallback articles

---

## 📈 Performance with API Key

### Request Distribution (typical usage)

**Home Page Load:**
- Featured: 1 API call (mixed sources)
- Category view: 2-3 RSS feeds = 3 API calls
- **Total: ~4 API calls per page load**

**Heavy Usage Scenario:**
- Browse all 8 categories: 8 × 3 = 24 API calls
- Refresh every 5 minutes for 1 hour: 12 × 4 = 48 calls
- **Total: 72 API calls per hour**
- **Daily total: ~1,728 calls** (well under 10,000 limit)

**Conclusion:** Free tier is perfect for development! 🎉

---

## 🎯 Summary

| Action | Time | Result |
|--------|------|--------|
| Get API key | 2 min | Free account at rss2json.com |
| Add to `.env` | 1 min | Create/edit `.env` file |
| Restart server | 30 sec | `npm run dev` |
| **Total** | **3.5 min** | **Bangladesh & Health working!** ✅ |

---

## 🚀 Quick Commands

```powershell
# 1. Navigate to project
cd "/path/to/your/newsflow-ai"

# 2. Create .env file (if doesn't exist)
New-Item -ItemType File -Path ".env" -Force

# 3. Open in editor
notepad .env

# 4. Add this line (with your actual key):
# RSS2JSON_API_KEY=your_key_here

# 5. Save and close notepad

# 6. Restart dev server
npm run dev
```

---

**That's it! Bangladesh and Health categories will now fetch live RSS feeds! 🎉**

---

*Pro Tip: The scrolling fix is already applied and working. This guide focuses on getting RSS feeds operational.*
