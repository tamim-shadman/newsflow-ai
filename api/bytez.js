import Bytez from "bytez.js";

const BYTEZ_API_KEY =
  process.env.BYTEZ_API_KEY ||
  process.env.VITE_BYTEZ_API_KEY ||
  process.env.NEXT_PUBLIC_BYTEZ_API_KEY;

const BYTEZ_MODEL_ID = "facebook/bart-large-cnn";

let cachedModel = null;

function getBytezModel() {
  if (cachedModel) {
    return cachedModel;
  }

  if (!BYTEZ_API_KEY) {
    throw new Error("Bytez API key is not configured");
  }

  const client = new Bytez(BYTEZ_API_KEY);
  cachedModel = client.model(BYTEZ_MODEL_ID);
  return cachedModel;
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
    const model = getBytezModel();
    const result = await model.run(prompt.trim());

    if (!result) {
      res.status(502).json({ error: "Bytez returned an empty response" });
      return;
    }

    const { error, output } = result;

    if (error) {
      const message = typeof error === "string" ? error : "Bytez returned an error";
      console.error("Bytez runtime error:", message);
      res.status(502).json({ error: message });
      return;
    }

    const summary = (output || "").trim();

    if (!summary) {
      res.status(502).json({ error: "Bytez returned an empty summary" });
      return;
    }

    res.status(200).json({
      summary,
      model: BYTEZ_MODEL_ID,
      provider: "bytez",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Bytez error";
    console.error("Bytez handler failure:", message);
    res.status(500).json({ error: message });
  }
}
