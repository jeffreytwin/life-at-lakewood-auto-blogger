// Vercel serverless function: POST /api/claude/generate
// Generates a full blog article using the Anthropic API

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, keyword, property, propertyUrl, blogUrl, writingStyle } = req.body;
  if (!title || !keyword || !property) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const styleBlock = writingStyle
    ? `\n\nThe user has provided these writing style preferences — follow them closely:\n${writingStyle}\n`
    : "";

  const prompt = `You are an expert SEO blog writer for a real estate website about ${property}, Florida (${propertyUrl}).

Write a complete, publish-ready blog article with the following requirements:
- Title: "${title}"
- Primary keyword: "${keyword}"
- Target audience: Home buyers and people relocating to ${property}, Florida
- Tone: Informative, conversational, trustworthy — like a knowledgeable local friend
- Length: 800–1,000 words total. Be concise and helpful — every sentence should provide value. No filler, no fluff, no generic padding. Get straight to the point.
${styleBlock}
Respond ONLY with valid JSON (no markdown, no backticks):
{
  "seoTitle": "SEO-optimized title tag (under 60 characters)",
  "metaDescription": "Compelling meta description (under 160 characters)",
  "slug": "url-friendly-slug",
  "sections": [
    { "heading": "Introduction", "body": "1-2 tight paragraphs..." },
    { "heading": "Section Title", "body": "1-2 focused paragraphs with specifics..." },
    { "heading": "Section Title", "body": "1-2 focused paragraphs with specifics..." },
    { "heading": "Our Recommendation", "body": "1 paragraph with CTA..." }
  ]
}

Include the primary keyword naturally 3-5 times throughout. Use specific data points, neighborhood names, and local details relevant to ${property}. End with a clear call to action.`;

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
    const article = JSON.parse(clean);

    res.status(200).json(article);
  } catch (error) {
    console.error("Claude generate error:", error);
    res.status(500).json({ error: "Failed to generate article" });
  }
}
