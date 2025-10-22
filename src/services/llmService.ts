import Bytez from "bytez.js";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import type { NewsAPIArticle, EnhancedArticle } from "@/types/news";

// Initialize Bytez SDK with your unlimited API key from environment
const BYTEZ_API_KEY = import.meta.env.VITE_BYTEZ_API_KEY || "35bd52b6cfe7361a4be07c52686dac28";
const sdk = new Bytez(BYTEZ_API_KEY);

// Use BART-large-CNN - specialized for news summarization (PRIMARY)
const bartModel = sdk.model("facebook/bart-large-cnn");

// Groq as FALLBACK when BART fails
const IS_PRODUCTION = import.meta.env.PROD;
const GROQ_API_URL = IS_PRODUCTION ? "/api/chat" : "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || "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";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// NVIDIA as SECOND FALLBACK when Groq fails
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || import.meta.env.NVIDIA_API_KEY || "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";
const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "speakleash/bielik-11b-v2.6-instruct";

// Gemini as THIRD FALLBACK when NVIDIA fails (using official Google GenAI SDK)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || "AIzaSyB19UMtCWDyKky4mBiIWHyRXWXUCMQ4ed4";
const GEMINI_MODEL = "gemini-2.0-flash-exp";
let geminiClient: GoogleGenAI | null = null;

// Initialize Gemini client only if API key is available
try {
  if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY") {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("✅ Gemini AI initialized");
  } else {
    console.warn("⚠️ Gemini API key not configured - will use other providers");
  }
} catch (error) {
  console.warn("⚠️ Failed to initialize Gemini:", error);
  geminiClient = null;
}

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
 * SECOND FALLBACK: Enhance article using NVIDIA (Bielik 11B) when Groq fails
 */
async function enhanceWithNVIDIA(
  article: NewsAPIArticle,
  contentToSummarize: string
): Promise<EnhancedArticle> {
  console.log(`🔄 [FALLBACK 2] Summarizing with NVIDIA: ${article.title.substring(0, 50)}...`);

  try {
    const messages = [
      {
        role: "user",
        content: `You are an expert news editor. Create a comprehensive summary of this news article.

${contentToSummarize}

Provide your response as JSON:
{
  "summary": "Complete, detailed summary with 6-8 sentences covering ALL key information, facts, quotes, and implications.",
  "keyPoints": ["5-7 specific key takeaways with concrete details"]
}`
      }
    ];

    const response = await axios.post(
      `${NVIDIA_API_URL}/chat/completions`,
      {
        model: NVIDIA_MODEL,
        messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.choices?.[0]?.message?.content) {
      throw new Error("Invalid NVIDIA response structure");
    }

    const content = response.data.choices[0].message.content;

    // Extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const enhanced = JSON.parse(jsonContent.trim());

    console.log(`✅ NVIDIA summary generated: ${enhanced.summary.substring(0, 60)}...`);

    return {
      originalTitle: article.title,
      enhancedTitle: article.title,
      originalExcerpt: article.description || "",
      enhancedExcerpt: article.description || enhanced.summary?.substring(0, 150) || "",
      summary: enhanced.summary || article.content || article.description || "Summary unavailable.",
      keyPoints: enhanced.keyPoints || [],
    };
  } catch (nvidiaError) {
    console.warn("⚠️ NVIDIA failed, falling back to Gemini...", nvidiaError);
    // THIRD FALLBACK: Try Gemini if NVIDIA also fails
    return await enhanceWithGemini(article, contentToSummarize);
  }
}

/**
 * THIRD FALLBACK: Enhance article using Gemini (1.5 Flash) when BART and NVIDIA fail
 */
async function enhanceWithGemini(
  article: NewsAPIArticle,
  contentToSummarize: string
): Promise<EnhancedArticle> {
  console.log(`🔄 [FALLBACK 3] Summarizing with Gemini: ${article.title.substring(0, 50)}...`);

  try {
    // Check if Gemini client is available
    if (!geminiClient) {
      throw new Error("Gemini client not initialized - API key missing");
    }

    // Use the new Google GenAI SDK
    const response = await geminiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: `You are an expert news editor. Create a comprehensive summary of this news article.

${contentToSummarize}

Provide your response as JSON:
{
  "summary": "Complete, detailed summary with 6-8 sentences covering ALL key information, facts, quotes, and implications.",
  "keyPoints": ["5-7 specific key takeaways with concrete details"]
}`,
      config: {
        temperature: 0.5,
        maxOutputTokens: 800,
      }
    });

    if (!response.text) {
      throw new Error("Invalid Gemini response structure");
    }

    const content = response.text;

    // Extract JSON from response
    let jsonContent = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const enhanced = JSON.parse(jsonContent.trim());

    console.log(`✅ Gemini summary generated: ${enhanced.summary.substring(0, 60)}...`);

    return {
      originalTitle: article.title,
      enhancedTitle: article.title,
      originalExcerpt: article.description || "",
      enhancedExcerpt: article.description || enhanced.summary?.substring(0, 150) || "",
      summary: enhanced.summary || article.content || article.description || "Summary unavailable.",
      keyPoints: enhanced.keyPoints || [],
    };
  } catch (geminiError) {
    console.warn("⚠️ Gemini failed, falling back to Groq...", geminiError);
    // FOURTH FALLBACK: Try Groq if Gemini also fails
    return await enhanceWithGroq(article, contentToSummarize);
  }
}

/**
 * FOURTH FALLBACK: Enhance article using Groq (LLaMA 3.3 70B) when all else fails
 */
async function enhanceWithGroq(
  article: NewsAPIArticle,
  contentToSummarize: string
): Promise<EnhancedArticle> {
  console.log(`🔄 [FALLBACK 4] Summarizing with Groq/LLaMA: ${article.title.substring(0, 50)}...`);

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

  const response = await axios.post<GroqResponse>(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages,
      temperature: 0.5,
      max_tokens: 800,
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

  // Extract JSON from response
  let jsonContent = content;
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  const enhanced = JSON.parse(jsonContent.trim());

  console.log(`✅ Groq summary generated: ${enhanced.summary.substring(0, 60)}...`);

  return {
    originalTitle: article.title,
    enhancedTitle: article.title,
    originalExcerpt: article.description || "",
    enhancedExcerpt: article.description || enhanced.summary?.substring(0, 150) || "",
    summary: enhanced.summary || article.content || article.description || "Summary unavailable.",
    keyPoints: enhanced.keyPoints || [],
  };
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

    console.log(`🤖 [PRIMARY] Summarizing with BART: ${article.title.substring(0, 50)}...`);

    // Try BART first (PRIMARY MODEL - unlimited API)
    const prompt = `Provide a comprehensive, detailed summary of this news article. Include all key facts, quotes, context, and implications. Write 6-8 complete, well-structured sentences that fully capture the entire story. Use proper paragraph formatting:\n\n${contentToSummarize}`;
    
    const { error, output } = await bartModel.run(prompt);

    if (error) {
      console.warn("⚠️ BART failed, falling back to Groq...", error);
      // FALLBACK 1: Try Groq if BART fails
      try {
        return await enhanceWithGroq(article, contentToSummarize);
      } catch (groqError) {
        console.warn("⚠️ Groq also failed, trying NVIDIA...", groqError);
        // FALLBACK 2: Try NVIDIA if Groq fails
        return await enhanceWithNVIDIA(article, contentToSummarize);
      }
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
    console.error("❌ BART error, trying Gemini fallback:", error);

    // Build content for fallback
    const contentToSummarize = [
      article.title,
      article.description || "",
      article.content || "",
    ]
      .filter(Boolean)
      .join(". ")
      .trim();

    // FALLBACK: Try Gemini if BART throws exception
    try {
      return await enhanceWithGemini(article, contentToSummarize);
    } catch (fallbackError) {
      console.error("❌ All AI models failed, returning original content:", fallbackError);
      
      // Final fallback: Return original content
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
