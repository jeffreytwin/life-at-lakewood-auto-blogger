// Vercel serverless function: POST /api/claude/generate
// Writes a full publish-ready article, aligned with the property's business
// goals, real keyword data, and the site's existing content.

import { getClient, callClaudeJSON, sendClaudeError, MODEL } from "./_lib.js";

const SCHEMA = {
  type: "object",
  properties: {
    seoTitle: { type: "string" },
    metaDescription: { type: "string" },
    slug: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          body: { type: "string" },
        },
        required: ["heading", "body"],
        additionalProperties: false,
      },
    },
  },
  required: ["seoTitle", "metaDescription", "slug", "sections"],
  additionalProperties: false,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    title,
    keyword,
    kwData = null,
    property,
    propertyUrl,
    blogUrl,
    writingStyle,
    businessGoals = "",
    funnelStage = "",
    cta = "",
    publishedTitles = [],
  } = req.body || {};

  if (!title || !keyword || !property) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const styleBlock = writingStyle
    ? `\nThe user has provided these writing style preferences — follow them closely:\n${writingStyle}\n`
    : "";

  const goalsBlock = businessGoals
    ? `\nBusiness goal for this site — the article should move readers toward it:\n${businessGoals}\n`
    : "";

  const funnelBlock = funnelStage
    ? `\nThis article targets the ${funnelStage} stage of the buyer funnel.${cta ? ` End with this call to action (in natural language): ${cta}` : ""}\n`
    : "";

  const kwBlock = kwData
    ? `\nKeyword data: ${[
        kwData.vol != null ? `~${kwData.vol} monthly searches` : null,
        kwData.diff != null ? `difficulty ${kwData.diff}/100` : null,
        kwData.position != null ? `site currently ranks at position ${kwData.position} for this query` : null,
        kwData.intent ? `searcher intent: ${kwData.intent}` : null,
      ]
        .filter(Boolean)
        .join("; ")}\n`
    : "";

  const internalLinksBlock = publishedTitles.length
    ? `\nThe site already has these published articles. Where genuinely relevant, mention 1-3 of them by their topic in the body (e.g. "our guide to X covers this in depth") so the editor can add internal links in Wix. Never invent URLs:\n${publishedTitles
        .slice(0, 30)
        .map((t) => `- ${t}`)
        .join("\n")}\n`
    : "";

  const prompt = `You are an expert SEO blog writer for a real estate website about ${property}, Florida (${propertyUrl}).

Write a complete, publish-ready blog article with the following requirements:
- Title: "${title}"
- Primary keyword: "${keyword}"
- Target audience: Home buyers and people relocating to ${property}, Florida
- Tone: Informative, conversational, trustworthy — like a knowledgeable local friend
- Length: 800–1,000 words total. Be concise and helpful — every sentence should provide value. No filler, no fluff, no generic padding.
${kwBlock}${goalsBlock}${funnelBlock}${styleBlock}${internalLinksBlock}
Structure: an Introduction section, 2-4 focused body sections with specific H2 headings, and a closing recommendation section with the call to action.

Content rules:
- Include the primary keyword naturally 3-5 times throughout.
- Use specific data points, neighborhood names, and local details relevant to ${property}. If you are not confident a specific number (price, fee, date) is accurate, describe it in ranges or qualitative terms rather than fabricating precision.
- seoTitle must be under 60 characters; metaDescription under 160 characters; slug must be lowercase-hyphenated.`;

  try {
    const client = getClient();
    const article = await callClaudeJSON({
      client,
      prompt,
      schema: SCHEMA,
      maxTokens: 16000,
    });

    res.status(200).json({ ...article, model: MODEL });
  } catch (error) {
    sendClaudeError(res, error, "Claude generate");
  }
}
