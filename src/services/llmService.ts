import Bytez from "bytez.js";
import axios from "axios";
import type { NewsAPIArticle, EnhancedArticle } from "@/types/news";

const IS_PRODUCTION = import.meta.env.PROD;

// Initialize Bytez SDK only when a key is configured
const BYTEZ_API_KEY = import.meta.env.VITE_BYTEZ_API_KEY || import.meta.env.BYTEZ_API_KEY;
const sdk = BYTEZ_API_KEY ? new Bytez(BYTEZ_API_KEY) : null;
const bartModel = sdk ? sdk.model("facebook/bart-large-cnn") : null;

const GROQ_DIRECT_URL = "https://api.groq.com/openai/v1/chat/completions";
const SERVER_LLM_ENDPOINT = IS_PRODUCTION
  ? "/api/chat"
  : import.meta.env.VITE_LLM_PROXY_URL || "/api/chat";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || "";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

type LLMContentPart = { text?: string; content?: string };
type LLMMessage = { content?: string | LLMContentPart[] };
type LLMChoice = { message?: LLMMessage | string; delta?: LLMMessage | string };
type LLMResponsePayload = {
  choices?: LLMChoice[];
  text?: string;
  output_text?: string;
};

function coerceMessageToString(message?: LLMMessage | string): string | null {
  if (!message) return null;
  if (typeof message === "string") return message;
  const { content } = message;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const combined = content
      .map((part) => part?.text ?? part?.content ?? "")
      .join(" ")
      .trim();
    return combined || null;
  }
  return null;
}

function extractMessageContent(data: unknown): string {
  const payload = data as LLMResponsePayload | undefined;

  if (payload?.choices && payload.choices.length > 0) {
    const [firstChoice] = payload.choices;
    const fromMessage = coerceMessageToString(firstChoice?.message);
    if (fromMessage) {
      return fromMessage;
    }
    const fromDelta = coerceMessageToString(firstChoice?.delta);
    if (fromDelta) {
      return fromDelta;
    }
  }

  if (payload?.text && typeof payload.text === "string") {
    return payload.text;
  }

  if (payload?.output_text && typeof payload.output_text === "string") {
    return payload.output_text;
  }

  throw new Error("No message content returned from LLM provider");
}

/**
 * SERVER FALLBACK: Enhance article using the serverless LLM pipeline
 * (Groq → Gemini → OpenRouter handled server-side)
 */
async function enhanceWithServerLLM(
  article: NewsAPIArticle,
  contentToSummarize: string
): Promise<EnhancedArticle> {
  console.log(`🔄 [FALLBACK] Summarizing via server LLM pipeline: ${article.title.substring(0, 50)}...`);

  const messages: GroqMessage[] = [
    {
      role: "system",
      content: "You are an expert news editor who creates comprehensive, accurate summaries. Always respond with valid JSON only.",
    },
    {
      role: "user",
      content: `Create a comprehensive summary of this news article.

${contentToSummarize}

Provide JSON response:
{
  "summary": "Complete, detailed summary with 6-8 sentences covering ALL key information, facts, quotes, and implications.",
  "keyPoints": ["5-7 specific key takeaways with concrete details"]
}`,
    },
  ];

  const payload = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.5,
    max_tokens: 800,
  };

  const endpoints: Array<{ url: string; headers?: Record<string, string> }> = [];

  if (SERVER_LLM_ENDPOINT) {
    endpoints.push({ url: SERVER_LLM_ENDPOINT });
  }

  const canUseDirectGroq = !IS_PRODUCTION && GROQ_API_KEY;
  const shouldFallbackToDirect =
    canUseDirectGroq &&
    (!SERVER_LLM_ENDPOINT || SERVER_LLM_ENDPOINT === "/api/chat" || SERVER_LLM_ENDPOINT.startsWith("http://localhost"));

  if (shouldFallbackToDirect) {
    endpoints.push({
      url: GROQ_DIRECT_URL,
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
  }

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await axios.post(endpoint.url, payload, endpoint.headers ? { headers: endpoint.headers } : undefined);
      const content = extractMessageContent(response.data);

      // Extract JSON from response
      let jsonContent = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const enhanced = JSON.parse(jsonContent.trim());

      console.log(`✅ LLM summary generated via ${endpoint.url.includes("api/chat") ? "server" : "direct Groq"}: ${
        (enhanced.summary || "").substring(0, 60)
      }...`);

      return {
        originalTitle: article.title,
        enhancedTitle: article.title,
        originalExcerpt: article.description || "",
        enhancedExcerpt: article.description || enhanced.summary?.substring(0, 150) || "",
        summary: enhanced.summary || article.content || article.description || "Summary unavailable.",
        keyPoints: enhanced.keyPoints || [],
      };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ LLM endpoint failed (${endpoint.url}): ${message}`);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All LLM endpoints failed to produce a summary");
}

/**
 * Enhance a news article using BART-large-CNN for professional summarization
 * BART is specifically trained for news summarization - much better than general LLMs
 * @param article - Original news article from NewsAPI
 * @returns Enhanced article with AI-generated summary
 */
export async function enhanceArticleWithLLM(
  article: NewsAPIArticle
): Promise<EnhancedArticle> {
  try {
    // Build comprehensive content for summarization
    const contentToSummarize = [
      article.title,
      article.description || "",
      article.content || "",
    ]
      .filter(Boolean)
      .join(". ")
      .trim();

    // If no content available, return original
    if (!contentToSummarize || contentToSummarize.length < 50) {
      console.warn("Article too short to summarize:", article.title);
      return {
        originalTitle: article.title,
        enhancedTitle: article.title,
        originalExcerpt: article.description || "",
        enhancedExcerpt: article.description || "",
        summary: article.content || article.description || "Summary unavailable.",
        keyPoints: [],
      };
    }

    if (!bartModel) {
      console.warn("⚠️ BART model not configured, using server LLM fallback.");
      return await enhanceWithServerLLM(article, contentToSummarize);
    }

    console.log(`🤖 [PRIMARY] Summarizing with BART: ${article.title.substring(0, 50)}...`);

    // Try BART first (PRIMARY MODEL - unlimited API)
    const prompt = `Provide a comprehensive, detailed summary of this news article. Include all key facts, quotes, context, and implications. Write 6-8 complete, well-structured sentences that fully capture the entire story. Use proper paragraph formatting:\n\n${contentToSummarize}`;
    
    const { error, output } = await bartModel.run(prompt);

    if (error) {
      console.warn("⚠️ BART failed, invoking server LLM pipeline...", error);
      return await enhanceWithServerLLM(article, contentToSummarize);
    }

    // BART returns a clean summary string - format it nicely
    let summary = output || article.content || article.description || "Summary unavailable.";
    
    // Clean up and format the summary
    summary = summary
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\.(?=[A-Z])/g, '. ') // Add space after periods
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2'); // Ensure proper spacing between sentences

    console.log(`✅ BART summary generated (${summary.length} chars, ${summary.split(/[.!?]+/).length - 1} sentences): ${summary.substring(0, 60)}...`);

    // Extract key points from the summary (simple sentence splitting)
    const keyPoints = summary
      .split(/[.!?]+/)
      .filter(sentence => sentence.trim().length > 20)
      .slice(0, 5)
      .map(s => s.trim());

    return {
      originalTitle: article.title,
      enhancedTitle: article.title, // Keep original title
      originalExcerpt: article.description || "",
      enhancedExcerpt: article.description || summary.substring(0, 150), // Use summary as excerpt
      summary: summary,
      keyPoints: keyPoints,
    };
  } catch (error) {
    console.error("❌ BART runtime error, invoking server LLM fallback:", error);

    // Build content for fallback
    const contentToSummarize = [
      article.title,
      article.description || "",
      article.content || "",
    ]
      .filter(Boolean)
      .join(". ")
      .trim();

    try {
      return await enhanceWithServerLLM(article, contentToSummarize);
    } catch (fallbackError) {
      console.error("❌ All AI pipelines failed, returning original content:", fallbackError);
      return {
        originalTitle: article.title,
        enhancedTitle: article.title,
        originalExcerpt: article.description || "",
        enhancedExcerpt: article.description || "",
        summary: article.content || article.description || "Summary unavailable.",
        keyPoints: [],
      };
    }
  }
}

/**
 * Enhance multiple articles in batch
 * With unlimited API, we can process more articles!
 * @param articles - Array of news articles
 * @param limit - Maximum number to enhance
 * @returns Array of enhanced articles
 */
export async function enhanceArticlesBatch(
  articles: NewsAPIArticle[],
  limit: number = 5 // Increased from 3 since API is unlimited
): Promise<Map<string, EnhancedArticle>> {
  const enhancedMap = new Map<string, EnhancedArticle>();

  // Enhance articles
  const articlesToEnhance = articles.slice(0, limit);

  console.log(`🚀 BART batch processing: ${articlesToEnhance.length} articles`);

  // Process in parallel since we have unlimited API access
  const promises = articlesToEnhance.map(async (article) => {
    try {
      const enhanced = await enhanceArticleWithLLM(article);
      return { url: article.url, enhanced };
    } catch (error) {
      console.error(`Failed to enhance article: ${article.title}`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);

  // Add successful enhancements to map
  results.forEach((result) => {
    if (result) {
      enhancedMap.set(result.url, result.enhanced);
    }
  });

  console.log(`✅ BART enhanced ${enhancedMap.size}/${articlesToEnhance.length} articles`);

  return enhancedMap;
}

/**
 * Generate a digest summary of multiple article titles
 * @param articles - Array of news articles
 * @param category - Category of news
 * @returns Formatted digest summary
 */
export async function generateNewsDigest(
  articles: NewsAPIArticle[],
  category: string
): Promise<string> {
  try {
    // Combine top article titles for digest
    const combinedText = articles
      .slice(0, 10)
      .map((a) => a.title)
      .join(". ");

    console.log(`📰 Generating ${category} digest with BART...`);

    const { error, output } = await bartModel.run(
      `Provide a comprehensive overview of these ${category} news headlines. Write 4-5 detailed sentences covering the major themes and stories: ${combinedText}`
    );

    if (error) {
      throw new Error(error);
    }

    console.log(`✅ Digest generated for ${category}`);
    return output || `Latest updates in ${category} news.`;
  } catch (error) {
    console.error("Error generating news digest:", error);
    return `Explore the latest ${category} news covering a wide range of topics and breaking stories from around the world.`;
  }
}
