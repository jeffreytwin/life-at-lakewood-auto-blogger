// Vercel serverless function: POST /api/claude/articles
// Suggests article angles for a keyword, grounded in the property's business
// goals, real keyword metrics, and what the site has already published.

import { getClient, callClaudeJSON, sendClaudeError, MODEL } from "./_lib.js";

const SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          angle: { type: "string" },
          why: { type: "string" },
          funnelStage: { type: "string", enum: ["Awareness", "Consideration", "Decision"] },
          cta: { type: "string" },
        },
        required: ["title", "angle", "why", "funnelStage", "cta"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
};

function kwDataBlock(kwData) {
  if (!kwData) return "";
  const parts = [];
  if (kwData.vol != null) parts.push(`monthly search volume ~${kwData.vol}`);
  if (kwData.diff != null) parts.push(`keyword difficulty ${kwData.diff}/100`);
  if (kwData.cpc != null) parts.push(`CPC $${kwData.cpc}`);
  if (kwData.intent) parts.push(`intent: ${kwData.intent}`);
  if (kwData.position != null) {
    parts.push(
      `the site ALREADY ranks at Google position ${kwData.position} for this query — ` +
        (kwData.position <= 10
          ? "an article that strengthens this topic can push it higher"
          : "this is a striking-distance keyword; a focused article can reach page 1")
    );
  }
  return parts.length ? `\nReal keyword data: ${parts.join("; ")}.` : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    keyword,
    kwData = null,
    location,
    propertyUrl = "",
    count = 4,
    existingTitles = [],
    publishedTitles = [],
    businessGoals = "",
    // Legacy shape support: an old client sending a raw prompt still works.
    prompt: legacyPrompt,
  } = req.body || {};

  if (!keyword && !legacyPrompt) {
    return res.status(400).json({ error: "Missing keyword" });
  }

  const goalsBlock = businessGoals
    ? `\nBusiness goal for this site (every suggestion must serve it):\n${businessGoals}\n`
    : "";

  const publishedBlock = publishedTitles.length
    ? `\nAlready published on the site (do NOT duplicate these topics — suggest angles that complement them and could link to them):\n${publishedTitles
        .slice(0, 40)
        .map((t) => `- ${t}`)
        .join("\n")}\n`
    : "";

  const avoidBlock = existingTitles.length
    ? `Do NOT suggest any of these titles (already shown): ${existingTitles.join("; ")}.`
    : "";

  const builtPrompt = `You are an SEO content strategist for a real estate team focused on ${location}, Florida${propertyUrl ? ` (${propertyUrl})` : ""}.
${goalsBlock}${publishedBlock}
Generate exactly ${count} DIFFERENT blog article ideas targeting the keyword: "${keyword}"${kwDataBlock(kwData)}
${avoidBlock}

For each idea:
- Give it a meaningfully different angle — vary the format (guide, comparison, listicle, local insider, Q&A, myth-busting, data deep-dive).
- Match the content to the searcher's intent AND the business goal — an idea that ranks but attracts the wrong audience is a bad idea.
- Assign the funnel stage (Awareness / Consideration / Decision) and a concrete call to action that fits that stage (e.g. Awareness → newsletter/neighborhood guide download; Decision → schedule a tour / talk to the team).
- In "why", say specifically why THIS site can win this query and how it converts readers toward the business goal.`;

  try {
    const client = getClient();
    const data = await callClaudeJSON({
      client,
      prompt: legacyPrompt || builtPrompt,
      schema: SCHEMA,
      maxTokens: 6000,
      effort: "medium",
    });

    res.status(200).json({ suggestions: data.suggestions || [], model: MODEL });
  } catch (error) {
    sendClaudeError(res, error, "Claude articles");
  }
}
