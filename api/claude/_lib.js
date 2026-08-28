// Shared helpers for the Claude serverless functions.
// Files prefixed with "_" in /api are importable but not deployed as endpoints.

import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5";

export function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error("ANTHROPIC_API_KEY is not configured in Vercel environment variables");
    err.status = 500;
    throw err;
  }
  // Leave headroom below the function's maxDuration so we return a real error
  // instead of the platform killing the invocation.
  return new Anthropic({ timeout: 240 * 1000, maxRetries: 2 });
}

// Run one request with structured output and return the parsed JSON object.
export async function callClaudeJSON({ client, system, prompt, schema, maxTokens = 8000, effort }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: prompt }],
    output_config: {
      ...(effort ? { effort } : {}),
      format: { type: "json_schema", schema },
    },
  });

  if (response.stop_reason === "refusal") {
    const err = new Error("The model declined to generate this content. Try rephrasing the request.");
    err.status = 422;
    throw err;
  }
  if (response.stop_reason === "max_tokens") {
    const err = new Error("Generation ran out of tokens before finishing. Try again or shorten the request.");
    err.status = 502;
    throw err;
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return JSON.parse(text);
}

// Translate any failure into a clear HTTP response the frontend can display.
export function sendClaudeError(res, error, label) {
  console.error(`${label} error:`, error);

  let status = error.status || 500;
  let message = error.message || "Unknown error";

  if (error instanceof Anthropic.APIError) {
    status = error.status || 502;
    const apiMsg = error.error?.error?.message || error.message;
    if (status === 401) {
      message = "Anthropic API key is invalid or revoked. Update ANTHROPIC_API_KEY in Vercel.";
    } else if (status === 400 && /credit|billing/i.test(apiMsg)) {
      message = `Anthropic account billing issue: ${apiMsg}`;
    } else if (status === 404 && /model/i.test(apiMsg)) {
      message = `Model unavailable: ${apiMsg}`;
    } else if (status === 429) {
      message = "Anthropic rate limit reached — wait a moment and try again.";
    } else if (status === 529) {
      message = "Anthropic API is overloaded — try again shortly.";
    } else {
      message = apiMsg;
    }
  }

  return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
}
