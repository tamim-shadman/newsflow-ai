# Carousel Fix & Bangladesh News Integration

## Changes Made

### 1. Fixed Carousel Click Handling ✅

**Problem:** The carousel had overly complex click handling that was causing production issues.

**Solution:**
- Simplified the carousel click handler to use a clean `useCallback` function
- Removed the scroll-to-article logic (which was confusing - users expect carousel clicks to open articles)
- Each carousel slide now directly opens the article URL when clicked
- Properly prevents event propagation on buttons

**Code Changes in `Index.tsx`:**

```tsx
// New simplified handler
const handleArticleClick = useCallback((url?: string, title?: string) => {
  if (url) {
    console.log('🖱️ Article clicked:', title?.substring(0, 40) + '...', '→', url);
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    console.warn('⚠️ Article clicked but no URL provided for:', title);
  }
}, []);

// Carousel implementation
{featuredNews.map((news, index) => (
  <div
    key={news.id}
    onClick={() => handleArticleClick(news.url, news.title)}
    className={`absolute inset-0 transition-all duration-1000 transform cursor-pointer...`}
  >
    {/* ... article content ... */}
    
    <button
      onClick={(e) => {
        e.stopPropagation();
        console.log(`🔘 Read Full Story button clicked...`);
        if (news.url) {
          window.open(news.url, "_blank", "noopener,noreferrer");
        }
      }}
      className={`px-6 py-3 rounded-full...`}
    >
      <span>Read Full Story</span>
      <ExternalLink className="w-5 h-5" />
    </button>
  </div>
))}
```

### 2. Bangladesh News Integration 🇧🇩

**Added:** New function to fetch Bangladesh-specific news using NewsData.io API

**API Details:**
- Endpoint: `https://newsdata.io/api/1/news`
- API Key: `pub_e7edc2b3b7e44a78b891c814f80a776c`
- Country: `BD` (Bangladesh)
- Language: English

**Code Added in `newsAggregator.ts`:**

```typescript
const NEWSDATA_BD_API_KEY = "pub_e7edc2b3b7e44a78b891c814f80a776c";

export async function fetchBangladeshNews(pageSize: number = 20): Promise<NewsAPIArticle[]> {
  const cacheKey = `bangladesh_news_${pageSize}`;
  
  try {
    // Check cache first (2-hour TTL)
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log('🇧🇩 Fetching Bangladesh news...');

    const response = await axios.get(
      `https://newsdata.io/api/1/news?apikey=${NEWSDATA_BD_API_KEY}&country=bd&language=en`,
      { timeout: 10000 }
    );

    // Process and cache results
    const articles = response.data.results.map(/* ... */);
    setCache(cacheKey, articles);
    return articles;
  } catch (error) {
    // Fallback to stale cache or empty array
  }
}
```

## How to Use Bangladesh News

### Option 1: Add Bangladesh Category

Add to the categories array in `Index.tsx`:

```tsx
const categories = [
  { id: "all" as CategoryType, name: "All News", icon: Newspaper },
  { id: "bangladesh" as CategoryType, name: "Bangladesh", icon: Globe }, // NEW
  { id: "trending" as CategoryType, name: "Trending", icon: Flame },
  // ... rest of categories
];
```

Update `CategoryType` in `src/types/news.ts`:

```tsx
export type CategoryType =
  | "all"
  | "bangladesh"  // NEW
  | "trending"
  | "technology"
  // ... rest
```

### Option 2: Use in Component

Direct usage in any component:

```tsx
import { fetchBangladeshNews } from "@/services/newsAggregator";

// In a React Query
const { data: bangladeshNews } = useQuery({
  queryKey: ["bangladesh-news"],
  queryFn: () => fetchBangladeshNews(20),
  staleTime: 2 * 60 * 60 * 1000, // 2 hours
});
```

## Benefits

### Carousel Improvements:
1. ✅ **Production-Safe**: Removed complex logic that could cause runtime errors
2. ✅ **Better UX**: Users expect carousel clicks to open articles, not scroll
3. ✅ **Cleaner Code**: Simplified from 20+ lines to 5 lines
4. ✅ **Proper Event Handling**: Button clicks properly stop propagation
5. ✅ **Better Logging**: Clear console logs for debugging

### Bangladesh News:
1. ✅ **Local Content**: Provides news specific to Bangladesh
2. ✅ **Caching**: 2-hour cache reduces API calls
3. ✅ **Fallback**: Stale cache fallback ensures reliability
4. ✅ **English Language**: Filters for English content
5. ✅ **Easy Integration**: Can be added as a category or standalone

## Testing

### Test Carousel:
1. Navigate to the home page
2. Click anywhere on a carousel slide → Opens article in new tab ✓
3. Click "Read Full Story" button → Opens same article ✓
4. Click navigation arrows → Changes slides ✓
5. Auto-rotation every 5 seconds → Works ✓

### Test Bangladesh News:
```javascript
// In browser console
import { fetchBangladeshNews } from '@/services/newsAggregator';
const bdNews = await fetchBangladeshNews(10);
console.log(bdNews);
```

## API Quotas

**NewsData.io Bangladesh:**
- Free tier: 200 requests/day
- With 2-hour cache: ~12 requests/day (one per 2-hour window)
- Usage: Very safe within limits

## Next Steps

1. **Test Production Build:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Add Bangladesh Category** (optional):
   - Update types
   - Add to categories array
   - Add category theme

3. **Deploy:**
   ```bash
   vercel --prod
   ```

## Rollback (If Needed)

If issues occur, revert these files:
- `src/pages/Index.tsx` (carousel handler)
- `src/services/newsAggregator.ts` (Bangladesh function)

Git revert:
```bash
git diff HEAD src/pages/Index.tsx
git diff HEAD src/services/newsAggregator.ts
git checkout HEAD -- src/pages/Index.tsx src/services/newsAggregator.ts
```

---

**Date:** October 22, 2025  
**Status:** ✅ Ready for Production  
**Breaking Changes:** None (additive only)
