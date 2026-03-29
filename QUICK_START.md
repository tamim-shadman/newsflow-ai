# 🚀 Quick Start - Get Your API Keys

## Step-by-Step Setup (5 minutes)

### 1️⃣ The Guardian API (BEST - 5000 req/day) ⭐

1. Go to: https://open-platform.theguardian.com/access/
2. Click "Register for a developer key"
3. Fill in:
   - Name: NewsFlow AI
   - Email: your email
   - What are you building: News aggregation app
4. Copy your API key
5. Add to `.env`: `GUARDIAN_API_KEY=your_key_here`

### 2️⃣ Currents API (600 req/day)

1. Go to: https://currentsapi.services/en/register
2. Sign up with email
3. Verify email
4. Copy API key from dashboard
5. Add to `.env`: `CURRENTS_API_KEY=your_key_here`

### 3️⃣ GNews (100 req/day)

1. Go to: https://gnews.io/register
2. Sign up (email required)
3. Get API key from dashboard
4. Add to `.env`: `GNEWS_API_KEY=your_key_here`

### 4️⃣ NewsData.io (200 req/day)

1. Go to: https://newsdata.io/register
2. Create free account
3. Copy API key
4. Add to `.env`: `NEWSDATA_API_KEY=your_key_here`

### 5️⃣ Groq API (Already have it!)

Already configured:
```
GROQ_API_KEY=your_groq_api_key_here
```

## 📝 Your .env File Should Look Like:

```bash
# Backend API Keys (Secure - only used in serverless functions)
GROQ_API_KEY=your_groq_api_key_here

# News APIs
GUARDIAN_API_KEY=test-key-xxxx
CURRENTS_API_KEY=xxxx
GNEWS_API_KEY=xxxx  
NEWSDATA_API_KEY=xxxx
```

## 🧪 Test Locally

```bash
# Install Vercel CLI (for local serverless functions)
npm i -g vercel

# Run dev server with serverless functions
vercel dev
```

App will run on: http://localhost:3000

## 🚢 Deploy to Vercel

### Quick Deploy:
```bash
# 1. Push to GitHub
git add .
git commit -m "Production ready"
git push

# 2. Deploy via Vercel CLI
vercel --prod
```

### Or via Vercel Dashboard:
1. Go to vercel.com
2. Import your GitHub repo
3. Add all API keys in Settings → Environment Variables
4. Deploy!

## ✅ Verification

After deployment, check:
- [ ] App loads without errors
- [ ] News articles appear
- [ ] AI summaries work (click FileText icon on articles)
- [ ] No CORS errors in console
- [ ] Vercel function logs show successful API calls

## 🎯 Total Daily Capacity

| API | Requests |
|-----|----------|
| Guardian | 5,000 |
| Currents | 600 |
| NewsData | 200 |
| GNews | 100 |
| **Total** | **5,900/day** |

That's **246 requests per hour**! 🎉

## 💡 Tips

1. **Start with Guardian API** - it has the highest limit
2. **You don't need all 4** - Guardian alone gives 5000/day
3. **More APIs = more reliability** - if one fails, others work
4. **Monitor usage** in Vercel Dashboard → Functions tab

## ❓ Troubleshooting

**Issue:** "API key not configured"
- Make sure you added keys to Vercel (not just local .env)
- No `VITE_` prefix in Vercel!

**Issue:** CORS errors
- Clear browser cache
- Make sure using `/api/` endpoints, not direct API calls

**Issue:** No articles showing
- Check Vercel function logs
- Verify at least one API key is valid
- App will show fallback data if all APIs fail

Need help? Check `DEPLOYMENT_PRODUCTION.md` for full guide!
