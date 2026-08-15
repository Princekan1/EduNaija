import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";
const MAX_ATTEMPTS = 2; // bounded so a stubborn prompt can't burn the whole daily free budget

async function callCloudflare(accountId, apiToken, model, body) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudflare Workers AI error (${model}): ${errText}`);
  }

  return response.json();
}

// Asks a vision model whether the generated image contains readable text.
// Returns true if it looks like it does (so we know to retry).
async function containsText(accountId, apiToken, base64Image) {
  try {
    const data = await callCloudflare(accountId, apiToken, VISION_MODEL, {
      image: Array.from(Buffer.from(base64Image, "base64")),
      prompt: "Does this image contain any readable text, words, letters, or numbers? Answer with only one word: yes or no.",
      max_tokens: 5,
    });
    const answer = (data.result?.description || data.result?.response || "").toLowerCase();
    return answer.includes("yes");
  } catch (err) {
    // If the text-check itself fails, don't block the whole flow on it —
    // just treat it as "unknown" and accept the image as-is.
    console.error("Text-check failed, skipping:", err.message);
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "A text prompt is required." });
  }

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return res.status(500).json({ error: "Cloudflare Workers AI is not configured." });
  }

  try {
    let lastImage = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const data = await callCloudflare(accountId, apiToken, IMAGE_MODEL, { prompt });
      const base64Image = data.result?.image;

      if (!base64Image) {
        continue; // no image at all this attempt, try again if we have attempts left
      }

      lastImage = base64Image;

      const hasText = await containsText(accountId, apiToken, base64Image);
      if (!hasText) {
        // Clean image, no need to burn another attempt.
        return res.status(200).json({ image: `data:image/png;base64,${base64Image}` });
      }
      // Otherwise loop and try again (if attempts remain).
    }

    // Exhausted attempts — show the best-effort last image rather than nothing.
    if (lastImage) {
      return res.status(200).json({ image: `data:image/png;base64,${lastImage}` });
    }

    return res.status(500).json({ error: "No image returned by Workers AI." });
  } catch (err) {
    console.error("Image generation error:", err);
    return res.status(500).json({ error: err.message || "Image generation failed." });
  }
}
