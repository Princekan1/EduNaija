import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, parts } = req.body;
  const requestParts = parts || (prompt ? [{ text: prompt }] : null);
  if (!requestParts) return res.status(400).json({ error: "Prompt or parts required." });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: requestParts }] }),
    }
  );

  const data = await response.json();
  if (!response.ok) return res.status(500).json({ error: data.error?.message || "Gemini error" });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return res.status(200).json({ text });
}
