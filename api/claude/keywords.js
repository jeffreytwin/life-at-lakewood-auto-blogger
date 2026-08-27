// Vercel serverless function: POST /api/claude/keywords
// Brainstorms new keyword ideas with Claude. Returns keywords WITHOUT invented
// volume/difficulty numbers — the frontend enriches them with real SEMrush data.

import { getClient, callClaudeJSON, sendClaudeError, MODEL } from "./_lib.js";

const SCHEMA = {
  type: "object",
  properties: {
    keywords: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kw: { type: "string" },
          intent: { type: "string", enum: ["Informational", "Commercial", "Transactional"] },
          rationale: { type: "string" },
        },
        required: ["kw", "intent", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["keywords"],
  additionalProperties: false,
};

export default async function handler(req, res) {
  // GET /api/claude/keywords?health → verify the Anthropic key + model with a
  // minimal request, so "are our APIs online?" has a one-click answer.
  if (req.method === "GET" && req.query?.health !== undefined) {
    try {
      const client = getClient();
      const ping = await client.messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: "user", content: "Reply with the single word: ok" }],
      });
      return res.status(200).json({ ok: true, model: ping.model });
    } catch (error) {
      return sendClaudeError(res, error, "Claude health check");
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { location, seeds = [], existing = [], count = 8, businessGoals = "" } = req.body || {};
  if (!location) {
    return res.status(400).json({ error: "Missing location" });
  }

  const goalsBlock = businessGoals
    ? `\nBusiness goal for this site — keywords must plausibly move it forward:\n${businessGoals}\n`
    : "";

  const prompt = `You are an SEO strategist for a real estate website about ${location}, Florida.
${goalsBlock}
Seed topics to explore: ${seeds.length ? seeds.join(", ") : `${location} real estate, ${location} homes, living in ${location}`}

Suggest exactly ${count} NEW keyword phrases a home buyer or person relocating to ${location} might actually type into Google. Rules:
- Do NOT repeat any of these already-shown keywords: ${existing.slice(0, 150).join("; ") || "(none)"}
- Prefer specific long-tail phrases a small local site can realistically rank for over broad head terms.
- Mix intents: informational research queries, commercial comparison queries, and transactional buying queries.
- Do NOT invent search volume or difficulty numbers — real data comes from SEMrush.
- For each keyword give a one-sentence rationale tying it to the business goal.`;

  try {
    const client = getClient();
    const data = await callClaudeJSON({
      client,
      prompt,
      schema: SCHEMA,
      maxTokens: 6000,
      effort: "medium",
    });

    const keywords = (data.keywords || []).map((k) => ({
      kw: k.kw,
      vol: null,
      diff: null,
      intent: k.intent,
      rationale: k.rationale,
      source: "ai",
    }));

    res.status(200).json({ keywords, model: MODEL });
  } catch (error) {
    sendClaudeError(res, error, "Claude keywords");
  }
}
