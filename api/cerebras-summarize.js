import Cerebras from "@cerebras/cerebras_cloud_sdk";

const CEREBRAS_API_KEY =
  process.env.CEREBRAS_API_KEY ||
  process.env.VITE_CEREBRAS_API_KEY ||
  process.env.NEXT_PUBLIC_CEREBRAS_API_KEY;

const MODEL_ID = "llama-3.3-70b";

let client = null;

function getClient() {
  if (client) {
    return client;
  }

  if (!CEREBRAS_API_KEY) {
    throw new Error("Cerebras API key is not configured");
  }

  client = new Cerebras({ apiKey: CEREBRAS_API_KEY });
  return client;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt } = req.body ?? {};

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    const sdk = getClient();

    const completion = await sdk.chat.completions.create({
      model: MODEL_ID,
      messages: [
        {
          role: "system",
          content: "You are an expert news editor who writes concise, factually accurate summaries in 6-8 sentences.",
        },
        {
          role: "user",
          content: `Summarize the following article with complete coverage of the key facts, quotes, and implications. Provide 6-8 full sentences.\n\n${prompt.trim()}`,
        },
      ],
      max_completion_tokens: 800,
      temperature: 0.2,
      top_p: 1,
      stream: false,
    });

    const summary = completion?.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      res.status(502).json({ error: "Cerebras returned an empty summary" });
      return;
    }

    res.status(200).json({
      summary,
      model: MODEL_ID,
      provider: "cerebras",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Cerebras error";
    console.error("Cerebras summarization error:", message);
    res.status(500).json({ error: message });
  }
}
