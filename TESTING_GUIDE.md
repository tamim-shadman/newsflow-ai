# 🧪 NewsFlow AI - Testing Guide

## 🎯 Testing the New 20+ API System

### ✅ Pre-Testing Checklist

1. **Server Running**: Development server at `http://localhost:8080`
2. **API Keys Configured**: Check `.env` file has all keys
3. **Browser Console Open**: Press F12 to see API routing logs

---

## 📋 Test Scenarios

### 1️⃣ Technology Category Test

**Expected Fallback Chain:**
```
Guardian → Hacker News → Dev.to → GitHub Trending → Currents → GNews → NewsData
```

**How to Test:**
1. Navigate to Technology category
2. Open browser console (F12)
3. Look for logs showing API attempts:
   ```
   🎯 Using optimized routing for technology: guardian → hackernews → devto → ...
   🔄 Trying Guardian API (5000/day quota)...
   ✅ Guardian API SUCCESS: 20 articles
   ```

**Expected Results:**
- Guardian should succeed (5000/day quota)
- If Guardian fails, should try Hacker News next
- Console shows clear routing strategy
- Articles display with technology focus

---

### 2️⃣ Sports Category Test

**Expected Fallback Chain:**
```
Guardian → ESPN → SportsDB → Currents → NewsData
```

**How to Test:**
1. Click Sports category
2. Monitor console for API sequence
3. Verify sports-specific content

**Expected Results:**
- Guardian sports section first
- ESPN as strong fallback (unlimited)
- Sports-focused articles and imagery

---

### 3️⃣ Business Category Test

**Expected Fallback Chain:**
```
Guardian → Alpha Vantage → Marketaux → Currents → GNews → NewsData
```

**How to Test:**
1. Navigate to Business category
2. Check console logs
3. Verify financial/market news content

**Expected Results:**
- Guardian business section first
- Alpha Vantage financial news (25/day limit)
- Marketaux market analysis (100/day limit)
- Business-focused articles

---

### 4️⃣ Health Category Test

**Expected Fallback Chain:**
```
Guardian → PubMed → CDC RSS → Currents → NewsData
```

**How to Test:**
1. Click Health category
2. Monitor API routing
3. Check for medical/health content

**Expected Results:**
- Guardian society section (health focus)
- PubMed medical research articles
- CDC health alerts if Guardian fails
- Health-related imagery and content

---

### 5️⃣ Entertainment Category Test

**Expected Fallback Chain:**
```
Guardian → TMDB → TVMaze → Currents → GNews → NewsData
```

**How to Test:**
1. Go to Entertainment category
2. Check console for API routing
3. Verify movies/TV/entertainment content

**Expected Results:**
- Guardian culture section first
- TMDB trending movies/shows (1M/month limit!)
- TVMaze TV schedules
- Entertainment-focused imagery

---

### 6️⃣ World Category Test

**Expected Fallback Chain:**
```
Guardian → BBC RSS → Reuters RSS → Currents → GNews → NewsData
```

**How to Test:**
1. Select World/All category
2. Monitor console logs
3. Check for international news

**Expected Results:**
- Guardian world section first
- BBC RSS international news
- Reuters breaking news
- Global news coverage

---

## 🔍 What to Look For in Console

### Success Indicators:
```
🎯 Using optimized routing for [category]: [api1] → [api2] → [api3] → ...
🔄 Trying [API Name] ([quota info])...
✅ [API Name] SUCCESS: X articles
💾 Cached data for: news_[category]_20 (valid for 2 hours)
```

### Fallback Indicators:
```
⚠️ [API Name] failed, trying next...
🔄 Trying [Next API Name] ...
```

### Error Handling:
```
❌ [API Name] failed: [error message]
❌ All APIs failed for this category
🔄 Using persistent fallback for: news_[category]_20
```

---

## 🧪 Edge Case Testing

### Test 1: API Failure Simulation
**Purpose**: Verify fallback chain works

**Method**:
1. Temporarily disable Guardian API key in `.env`
2. Reload app
3. Select Technology category
4. Should see: Guardian fails → Hacker News succeeds

**Expected Console:**
```
⚠️ Guardian failed, trying next...
🔄 Trying Hacker News API (Unlimited, no quota)...
✅ Hacker News API SUCCESS: 20 articles
```

---

### Test 2: Cache Performance
**Purpose**: Verify caching reduces API calls

**Method**:
1. Navigate to Technology category (fresh)
2. Note console shows API call
3. Navigate to different category
4. Return to Technology category
5. Should see cache hit (no new API call)

**Expected Console:**
```
First visit:
🔄 Trying Guardian API...
✅ Guardian API SUCCESS: 20 articles
💾 Cached data for: news_technology_20

Second visit (within 2 hours):
✅ Cache hit for: news_technology_20 (age: 5 minutes, fresh for 115 more minutes)
```

---

### Test 3: 24-Hour Content Filter
**Purpose**: Ensure old articles are filtered

**Method**:
1. Load any category
2. Check article dates
3. All should be within last 24 hours

**Verification**:
- All `publishedAt` dates are recent
- No articles older than 24 hours displayed

---

### Test 4: AI Summary with BART
**Purpose**: Test BART summarization on real articles

**Method**:
1. Load Technology articles
2. Click "Summarize" on an article
3. Check summary window appears
4. Verify 6-8 sentence summary
5. Check 7 key bullet points

**Expected Console:**
```
🤖 [PRIMARY] Summarizing with BART-large-CNN...
✅ BART Summary generated successfully
```

**Expected UI:**
- Smooth popup animation (zoom, fade, slide)
- Full summary text (6-8 sentences)
- 7 key insight bullet points
- Purple scrollbar visible
- Blur background effect

---

### Test 5: AI Fallback Chain
**Purpose**: Test Gemini and Groq fallbacks

**Method**:
1. Temporarily break BART API key
2. Try to summarize an article
3. Should fall back to Gemini

**Expected Console:**
```
🤖 [PRIMARY] Summarizing with BART-large-CNN...
❌ BART failed: [error]
⚠️ BART failed, falling back to Gemini...
🤖 [FALLBACK 1] Using Gemini 1.5 Flash...
✅ Gemini Summary generated successfully
```

---

## 📊 Performance Metrics

### Key Metrics to Monitor:

1. **API Response Time**
   - Guardian: Usually < 2 seconds
   - Hacker News: < 3 seconds (fetches individual stories)
   - Dev.to: < 1 second
   - ESPN: < 2 seconds
   - TMDB: < 1 second

2. **Success Rates**
   - Guardian: ~99% (5000/day rarely exceeded)
   - Unlimited APIs: 100% (no quota limits)
   - Aggregators: ~95% (subject to their uptime)

3. **Cache Hit Rate**
   - First 2 hours: High cache hit rate
   - Reduces API calls by ~80%

4. **Fallback Usage**
   - Primary APIs: Should handle 80%+ of requests
   - Fallback level 2-3: Rare (< 10%)
   - Fallback level 4+: Very rare (< 1%)

---

## 🐛 Common Issues & Solutions

### Issue 1: "All APIs failed"
**Symptoms**: No articles loading, console shows all APIs failed

**Solutions**:
- Check internet connection
- Verify API keys in `.env` file
- Check API quota limits (Guardian 5000/day)
- Wait and retry (temporary API outages)

---

### Issue 2: Same API used for all categories
**Symptoms**: Console doesn't show category-specific routing

**Solutions**:
- Clear browser cache
- Restart dev server
- Check `getCategoryAPIsPriority()` function
- Verify category types match

---

### Issue 3: Articles are old (> 24 hours)
**Symptoms**: Seeing dated articles

**Solutions**:
- Check `filterRecent24Hours()` function
- Verify `MAX_ARTICLE_AGE` constant (24 hours)
- Check article `publishedAt` format

---

### Issue 4: Images not loading
**Symptoms**: Placeholder images instead of article images

**Solutions**:
- Check API response `urlToImage` field
- Verify Unsplash fallback URLs working
- Check CORS headers

---

### Issue 5: BART summarization fails
**Symptoms**: AI summary not generating

**Solutions**:
- Check `VITE_BYTEZ_API_KEY` in `.env`
- Verify Bytez API quota (should be unlimited)
- Check console for specific error
- Should fall back to Gemini automatically

---

## ✅ Success Criteria

### All Tests Passing Means:
✅ All 6 categories load articles successfully
✅ Category-specific API routing works correctly
✅ Fallback chains activate when primary fails
✅ Caching reduces API calls (2-hour TTL)
✅ 24-hour content filter working
✅ AI summarization with BART working
✅ Gemini/Groq fallbacks working
✅ Console logs show clear routing strategy
✅ No TypeScript errors
✅ Performance is fast (< 3s load times)

---

## 📈 Next Steps After Testing

1. **Deploy to Vercel**
   - Add all API keys to Vercel environment variables
   - Test production build
   - Verify all APIs work in production

2. **Monitor API Usage**
   - Track which APIs are used most
   - Monitor quota consumption
   - Adjust routing if needed

3. **Optimize Further**
   - Add more specialized APIs if needed
   - Fine-tune fallback order based on performance data
   - Implement rate limiting if needed

4. **User Feedback**
   - Collect data on content quality per API
   - Adjust routing based on user preferences
   - Add more categories if requested

---

## 🎯 Test Checklist

- [ ] Technology category: Guardian → HN → Dev.to routing works
- [ ] Sports category: Guardian → ESPN fallback works
- [ ] Business category: Guardian → Alpha Vantage works
- [ ] Health category: Guardian → PubMed works
- [ ] Entertainment category: Guardian → TMDB works
- [ ] World category: Guardian → BBC RSS works
- [ ] Cache working (2-hour TTL verified)
- [ ] 24-hour content filter working
- [ ] BART AI summarization working
- [ ] Gemini fallback working
- [ ] Groq fallback working
- [ ] Console logs clear and informative
- [ ] No TypeScript errors
- [ ] Performance acceptable (< 3s)
- [ ] All images loading correctly
- [ ] Responsive design working on mobile

---

*Happy Testing! 🚀*
*NewsFlow AI - Powered by 20+ News Sources*
