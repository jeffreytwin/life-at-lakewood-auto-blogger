// Vercel serverless function: POST /api/claude/revise
// Revises an existing article based on user feedback

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { articleContent, revisionRequest, property } = req.body;
  if (!articleContent || !revisionRequest) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const prompt = `You are an expert SEO blog editor for a real estate website about ${property}, Florida.

Here is the current article content as JSON:
${JSON.stringify(articleContent, null, 2)}

The user has requested the following revision:
"${revisionRequest}"

Apply the requested changes while maintaining:
- SEO best practices
- Natural keyword placement
- Professional, conversational tone
- Factual accuracy

Respond ONLY with the complete revised article as valid JSON (same structure as input, no markdown, no backticks):
{
  "seoTitle": "...",
  "metaDescription": "...",
  "slug": "...",
  "sections": [...]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const revised = JSON.parse(clean);

    res.status(200).json(revised);
  } catch (error) {
    console.error("Claude revise error:", error);
    res.status(500).json({ error: "Failed to revise article" });
  }
}
