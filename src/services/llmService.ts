import axios from "axios";
import type { NewsAPIArticle, EnhancedArticle } from "@/types/news";

// Use serverless function instead of direct API call (secure for production)
const IS_PRODUCTION = import.meta.env.PROD;
const GROQ_API_URL = IS_PRODUCTION ? "/api/chat" : "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.GROQ_API_KEY;

// Using Groq's free tier with llama-3.3-70b-versatile model (fast and free)
const MODEL = "llama-3.3-70b-versatile";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Enhance a news article using LLM to make it more engaging and beautiful
 * @param article - Original news article from NewsAPI
 * @returns Enhanced article with improved title, excerpt, and summary
 */
export async function enhanceArticleWithLLM(
  article: NewsAPIArticle
): Promise<EnhancedArticle> {
  try {
    // Simplified prompt to reduce tokens
    const prompt = `Enhance this news article:

Title: ${article.title}
Description: ${article.description || "No description"}

Respond with JSON only:
{
  "enhancedTitle": "compelling title max 80 chars",
  "enhancedExcerpt": "2-sentence summary max 150 chars",
  "summary": "3-4 sentence detailed summary",
  "keyPoints": ["3-5 key points"]
}`;

    const messages: GroqMessage[] = [
      {
        role: "system",
        content: "You are a news editor. Respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await axios.post<GroqResponse>(
      GROQ_API_URL,
      {
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 500, // Reduced from 1000 to save quota
      },
      IS_PRODUCTION
        ? {}
        : {
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
    );

    const content = response.data.choices[0].message.content;
    
    // Try to parse JSON, handle if it fails
    let enhanced;
    try {
      enhanced = JSON.parse(content);
    } catch (parseError) {
      console.warn('Failed to parse LLM response as JSON, using original content');
      return {
        originalTitle: article.title,
        enhancedTitle: article.title,
        originalExcerpt: article.description || "",
        enhancedExcerpt: article.description || "",
        summary: article.description || "",
        keyPoints: [],
      };
    }

    return {
      originalTitle: article.title,
      enhancedTitle: enhanced.enhancedTitle || article.title,
      originalExcerpt: article.description || "",
      enhancedExcerpt: enhanced.enhancedExcerpt || article.description || "",
      summary: enhanced.summary || article.description || "",
      keyPoints: enhanced.keyPoints || [],
    };
  } catch (error) {
    console.error("Error enhancing article with LLM:", error);

    // Return original content if LLM fails
    return {
      originalTitle: article.title,
      enhancedTitle: article.title,
      originalExcerpt: article.description || "",
      enhancedExcerpt: article.description || "",
      summary: article.description || "",
      keyPoints: [],
    };
  }
}

/**
 * Enhance multiple articles in batch
 * @param articles - Array of news articles
 * @param limit - Maximum number to enhance (to avoid rate limits)
 * @returns Array of enhanced articles
 */
export async function enhanceArticlesBatch(
  articles: NewsAPIArticle[],
  limit: number = 3 // Reduced from 5 to 3
): Promise<Map<string, EnhancedArticle>> {
  const enhancedMap = new Map<string, EnhancedArticle>();

  // Enhance only the first few articles to avoid rate limits
  const articlesToEnhance = articles.slice(0, limit);

  // Process sequentially to avoid rate limiting
  for (const article of articlesToEnhance) {
    try {
      const enhanced = await enhanceArticleWithLLM(article);
      enhancedMap.set(article.url, enhanced);

      // Longer delay to avoid rate limiting (1 second instead of 500ms)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to enhance article: ${article.title}`, error);
      // Continue with next article instead of stopping
    }
  }

  return enhancedMap;
}

/**
 * Generate a beautiful summary of multiple articles for a news digest
 * @param articles - Array of news articles
 * @param category - Category of news
 * @returns Formatted digest summary
 */
export async function generateNewsDigest(
  articles: NewsAPIArticle[],
  category: string
): Promise<string> {
  try {
    const articleTitles = articles
      .slice(0, 5) // Reduced from 10 to 5
      .map((a, i) => `${i + 1}. ${a.title}`)
      .join("\n");

    // Simplified prompt
    const prompt = `Summarize these ${category} headlines in 2-3 sentences (max 200 words):

${articleTitles}`;

    const messages: GroqMessage[] = [
      {
        role: "system",
        content: "You are a news anchor. Be concise.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const response = await axios.post<GroqResponse>(
      GROQ_API_URL,
      {
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 300, // Reduced from 500
      },
      IS_PRODUCTION
        ? {}
        : {
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating news digest:", error);
    return `Explore the latest ${category} news covering a wide range of topics and breaking stories from around the world.`;
  }
}
