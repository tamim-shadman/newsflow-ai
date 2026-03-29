# Production Deployment Guide - NewsFlow AI

## ✅ What Was Fixed

### 1. **Security Issues Resolved**
- ❌ **Before:** API keys exposed in browser (VITE_ prefix made them public)
- ✅ **After:** API keys stored securely on backend only

### 2. **CORS Issues Resolved**
- ❌ **Before:** Browser blocked Groq API calls
- ✅ **After:** Serverless functions handle API calls server-side

### 3. **News API Upgraded**
- ❌ **Before:** Single API (NewsAPI) with 100 requests/day limit
- ✅ **After:** 4 aggregated APIs with combined 6000+ requests/day!

## 📦 New Architecture

```
Frontend (React/Vite)
    ↓
Serverless Functions (Vercel)
    ↓
External APIs (NewsData, Currents, GNews, Guardian, Groq)
```

## 🔑 Get Your API Keys

### 1. The Guardian (BEST - 5000 requests/day)
1. Visit: https://open-platform.theguardian.com/access/
2. Register for free API key
3. Add to Vercel: `GUARDIAN_API_KEY`

### 2. Currents API (600 requests/day)
1. Visit: https://currentsapi.services/en/register
2. Free tier available
3. Add to Vercel: `CURRENTS_API_KEY`

### 3. GNews (100 requests/day)
1. Visit: https://gnews.io/register
2. Get free API key
3. Add to Vercel: `GNEWS_API_KEY`

### 4. NewsData.io (200 requests/day)
1. Visit: https://newsdata.io/register
2. Get free API key
3. Add to Vercel: `NEWSDATA_API_KEY`

### 5. Groq (You already have this)
- Key: `your_groq_api_key_here`
- Add to Vercel: `GROQ_API_KEY`

## 🚀 Vercel Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Production ready with secure serverless functions"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 3: Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables:

```
GROQ_API_KEY=your_groq_api_key_here
GUARDIAN_API_KEY=your_guardian_key
CURRENTS_API_KEY=your_currents_key
GNEWS_API_KEY=your_gnews_key
NEWSDATA_API_KEY=your_newsdata_key
```

**Important:** No `VITE_` prefix! These are backend-only.

### Step 4: Deploy
Click "Deploy" and wait 2-3 minutes.

## 📁 Project Structure

```
newsflow-ai/
├── api/                          # Serverless functions (Vercel)
│   ├── chat.js                   # Groq API proxy (secure)
│   └── news.js                   # News aggregation
├── src/
│   ├── services/
│   │   ├── newsAggregator.ts     # New aggregated news service
│   │   ├── llmService.ts         # Updated to use /api/chat
│   │   └── newsApi.ts            # Old (keep for reference)
│   └── pages/
│       └── Index.tsx             # Updated imports
├── .env                          # Local dev only
├── vercel.json                   # Vercel configuration
└── package.json
```

## 🔒 Security Features

### ✅ API Keys Protection
- All keys stored server-side only
- Never exposed to browser
- Can't be stolen from frontend code

### ✅ CORS Handled
- Serverless functions have CORS enabled
- No browser blocking issues

### ✅ Rate Limiting
- Combined 6000+ requests/day across 4 APIs
- Automatic fallback if one API fails

## 🧪 Local Development

### Run Development Server:
```bash
npm run dev
```

### Test Serverless Functions Locally:
Install Vercel CLI:
```bash
npm i -g vercel
vercel dev
```

This runs serverless functions at `http://localhost:3000`

## 📊 API Usage Monitoring

### Check Console for Logs:
```javascript
// Good response
News API Response: { status: "ok", totalResults: 50 }

// API error
API error details: { status: 429, message: "Rate limited" }
```

### Monitor in Vercel Dashboard:
- Go to your project
- Click "Functions" tab
- See request counts and errors

## 🎯 API Request Limits (Combined)

| API | Free Tier | Purpose |
|-----|-----------|---------|
| The Guardian | 5000/day | Primary source |
| Currents API | 600/day | Backup source |
| NewsData.io | 200/day | Additional coverage |
| GNews | 100/day | Extra articles |
| **TOTAL** | **5900/day** | 🎉 |

That's **246 requests per hour** - plenty for production!

## ⚡ Performance Tips

### 1. Caching
React Query already caches for 5 minutes:
```typescript
staleTime: 5 * 60 * 1000,  // Don't refetch for 5 min
```

### 2. Reduce Requests
```typescript
refetchInterval: false,           // Disable auto-refresh
refetchOnWindowFocus: false,      // Don't refetch on focus
```

### 3. Use Fallback Data
If APIs fail, app shows demo articles automatically.

## 🐛 Troubleshooting

### Issue: Serverless functions not working
**Solution:** Make sure `api/` folder is in project root, not in `src/`

### Issue: API keys not found
**Solution:** 
1. Check Vercel environment variables (no `VITE_` prefix)
2. Redeploy after adding variables

### Issue: CORS errors
**Solution:** The serverless functions have CORS enabled. Clear browser cache.

### Issue: Build fails
**Solution:** Run `npm install` and ensure all dependencies are in `package.json`

## ✅ Checklist Before Deploy

- [ ] All API keys obtained
- [ ] API keys added to Vercel (no `VITE_` prefix)
- [ ] Code pushed to GitHub
- [ ] `vercel.json` properly configured
- [ ] Build command works locally (`npm run build`)
- [ ] Environment variables set in Vercel dashboard

## 🎉 Success!

Your app is now:
- ✅ Production-ready
- ✅ Secure (no exposed API keys)
- ✅ Scalable (6000+ requests/day)
- ✅ Fast (serverless functions)
- ✅ Reliable (4 API sources with fallback)

Deploy URL: `https://your-app.vercel.app`

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Check browser console
3. Verify environment variables
4. Test API keys individually

Happy deploying! 🚀
