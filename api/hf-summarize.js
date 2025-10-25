import { InferenceClient } from "@huggingface/inference";

const HF_TOKEN =
  process.env.HF_TOKEN ||
  process.env.VITE_HF_TOKEN ||
  process.env.NEXT_PUBLIC_HF_TOKEN;

const MODEL_ID = "facebook/bart-large-cnn";

let client = null;

function getClient() {
  if (client) {
    return client;
  }

  if (!HF_TOKEN) {
    throw new Error("Hugging Face token is not configured");
  }

  client = new InferenceClient(HF_TOKEN);
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
    const output = await sdk.summarization({
      model: MODEL_ID,
      inputs: prompt.trim(),
      parameters: {
        max_length: 512,
        min_length: 120,
      },
    });

    const summary = Array.isArray(output)
      ? output.map((item) => item.summary_text).join(" ")
      : output.summary_text;

    if (!summary) {
      res.status(502).json({ error: "Hugging Face returned an empty summary" });
      return;
    }

    res.status(200).json({
      summary: summary.trim(),
      model: MODEL_ID,
      provider: "huggingface",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Hugging Face error";
    console.error("Hugging Face summarization error:", message);
    res.status(500).json({ error: message });
  }
}
