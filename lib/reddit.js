const TOKEN_SAFETY_BUFFER_MS = 60_000;
const DEFAULT_RETRIES = 2;
const RETRY_BACKOFF_MS = 1_000;

class RedditAPI {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.tokenExpiry = 0;
  }

  async getToken() {
    if (this.token && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Reddit API credentials are missing");
    }

    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "newsflow-ai/1.0 (+https://newsflow-ai.com)",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit auth failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    const expiresInMs = (typeof data.expires_in === "number" ? data.expires_in : 3600) * 1000;
    this.tokenExpiry = Date.now() + expiresInMs - TOKEN_SAFETY_BUFFER_MS;
    return this.token;
  }

  async fetch(endpoint, options = {}) {
    const token = await this.getToken();

    const response = await fetch(`https://oauth.reddit.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "newsflow-ai/1.0 (+https://newsflow-ai.com)",
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(options.timeout ?? 8000),
    });

    if (response.status === 502) {
      throw new Error("Reddit API unavailable (502)");
    }

    if (response.status === 429) {
      throw new Error("Reddit API rate limit exceeded (429)");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reddit API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async fetchWithRetry(endpoint, retries = DEFAULT_RETRIES) {
    let attempt = 0;
    for (;;) {
      try {
        return await this.fetch(endpoint);
      } catch (error) {
        attempt += 1;
        const isRetryable = /502|unavailable/i.test(error.message);
        if (attempt > retries || !isRetryable) {
          throw error;
        }
        const delay = RETRY_BACKOFF_MS * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async getSubredditPosts(subreddit, limit = 100) {
    const safeSubreddit = encodeURIComponent(subreddit);
    const endpoint = `/r/${safeSubreddit}/hot?limit=${Math.min(Math.max(limit, 1), 100)}`;
    return this.fetchWithRetry(endpoint);
  }
}

let redditInstance = null;

export function getRedditAPI() {
  if (!redditInstance) {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Reddit API credentials not configured");
    }

    redditInstance = new RedditAPI(clientId, clientSecret);
  }

  return redditInstance;
}

export { RedditAPI };
