const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const REDDIT_BASE_URL = "https://www.reddit.com";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

function normalizeLimit(value) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric) || numeric <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.max(numeric, 1), MAX_LIMIT);
}

function mapRedditPost(subreddit, data) {
  if (!data?.title || !data?.permalink) {
    return null;
  }

  const hasValidThumb = typeof data.thumbnail === "string" && data.thumbnail.startsWith("http");
  const createdUtc = typeof data.created_utc === "number" ? data.created_utc : Date.now() / 1000;

  return {
    source: { id: `reddit-${subreddit}`, name: `r/${subreddit}` },
    author: data.author || `r/${subreddit}`,
    title: data.title,
    description: data.selftext || data.title,
    url: `${REDDIT_BASE_URL}${data.permalink}`,
    urlToImage: hasValidThumb ? data.thumbnail : null,
    publishedAt: new Date(createdUtc * 1000).toISOString(),
    content: data.selftext || data.title,
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Method not allowed" });
    return;
  }

  const subredditRaw = req.query?.subreddit;
  const subreddit = typeof subredditRaw === "string" && subredditRaw.trim() ? subredditRaw.trim() : "news";
  const limit = normalizeLimit(req.query?.limit);

  const endpoint = `${REDDIT_BASE_URL}/r/${encodeURIComponent(subreddit)}/hot.json?limit=${limit}`;

  try {
    console.log(`[reddit-api] Fetching r/${subreddit} (limit=${limit})`);
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "newsflow-ai/1.0 (+https://newsflow-ai.com)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Reddit responded with ${response.status}`);
    }

    const payload = await response.json();
    const posts = Array.isArray(payload?.data?.children) ? payload.data.children : [];
    const articles = posts
      .map((post) => mapRedditPost(subreddit, post?.data))
      .filter(Boolean)
      .slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.status(200).json({ success: true, subreddit, limit, articles, totalResults: articles.length });
  } catch (error) {
    console.error(`[reddit-api] Failed for r/${subreddit}:`, error.message);
    res.status(502).json({ success: false, error: error.message, articles: [] });
  }
}
