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
    const prompt = `You are a professional news editor. Enhance the following news article to make it more engaging, concise, and beautiful while maintaining accuracy.

Original Title: ${article.title}
Original Description: ${article.description || "No description available"}
Content Preview: ${
      article.content ? article.content.substring(0, 500) : "Limited content"
    }

Please provide a JSON response with the following structure:
{
  "enhancedTitle": "A compelling, concise title (max 100 characters)",
  "enhancedExcerpt": "An engaging 2-sentence summary that hooks the reader (max 200 characters)",
  "summary": "A detailed 3-4 sentence summary of the article",
  "keyPoints": ["3-5 key takeaway points as an array"]
}

Make the language vivid, engaging, and professional. Focus on what makes this news important and interesting.`;

    const messages: GroqMessage[] = [
      {
        role: "system",
        content:
          "You are a professional news editor who creates engaging, accurate, and beautiful news summaries. Always respond with valid JSON only.",
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
        max_tokens: 1000,
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
    const enhanced = JSON.parse(content);

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
  limit: number = 5
): Promise<Map<string, EnhancedArticle>> {
  const enhancedMap = new Map<string, EnhancedArticle>();

  // Enhance only the first few articles to avoid rate limits
  const articlesToEnhance = articles.slice(0, limit);

  // Process sequentially to avoid rate limiting
  for (const article of articlesToEnhance) {
    try {
      const enhanced = await enhanceArticleWithLLM(article);
      enhancedMap.set(article.url, enhanced);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to enhance article: ${article.title}`, error);
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
      .slice(0, 10)
      .map((a, i) => `${i + 1}. ${a.title}`)
      .join("\n");

    const prompt = `Create an engaging news digest summary for the ${category} category based on these headlines:

${articleTitles}

Write a compelling 2-3 paragraph overview that:
1. Highlights the most important stories
2. Identifies common themes or trends
3. Uses engaging, professional language
4. Is concise but informative (max 300 words)`;

    const messages: GroqMessage[] = [
      {
        role: "system",
        content:
          "You are a professional news anchor creating engaging news summaries.",
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
        max_tokens: 500,
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
