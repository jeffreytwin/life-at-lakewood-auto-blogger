// Vercel serverless function: POST /api/claude/revise
// Revises an existing article based on user feedback.

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

  const { articleContent, revisionRequest, property, writingStyle = "" } = req.body || {};
  if (!articleContent || !revisionRequest) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Images attached to sections are re-attached client-side after revision —
  // strip them here so the model only sees text.
  const textOnly = {
    ...articleContent,
    sections: (articleContent.sections || []).map(({ heading, body }) => ({ heading, body })),
  };

  const styleBlock = writingStyle
    ? `\nKeep following these writing style preferences:\n${writingStyle}\n`
    : "";

  const prompt = `You are an expert SEO blog editor for a real estate website about ${property}, Florida.

Here is the current article content as JSON:
${JSON.stringify(textOnly, null, 2)}

The user has requested the following revision:
"${revisionRequest}"
${styleBlock}
Apply the requested changes while maintaining:
- SEO best practices and natural keyword placement
- Professional, conversational tone
- Factual accuracy — do not invent precise numbers
- seoTitle under 60 characters, metaDescription under 160 characters

Return the complete revised article. Keep sections the user didn't ask to change as close to the original as possible.`;

  try {
    const client = getClient();
    const revised = await callClaudeJSON({
      client,
      prompt,
      schema: SCHEMA,
      maxTokens: 16000,
    });

    res.status(200).json({ ...revised, model: MODEL });
  } catch (error) {
    sendClaudeError(res, error, "Claude revise");
  }
}
