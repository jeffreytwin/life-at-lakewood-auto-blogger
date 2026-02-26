// API service — routes requests through serverless functions in /api/
// In development, these call the Vite dev server proxy
// In production on Vercel, they hit the serverless functions directly

const API_BASE = "";

export async function fetchMoreKeywords(location, seedKeywords, existingKws) {
  const prompt = `You are an SEO strategist for a real estate team in ${location}, Florida.
The user wants more keyword ideas based on these seed topics: ${seedKeywords.join(", ")}
Do NOT repeat any of these already-shown keywords: ${existingKws.join("; ")}

Generate exactly 6 new keyword ideas that a home buyer or relocating person might search.
Vary the intent: mix informational, commercial, and comparison queries.

Respond ONLY with a JSON array (no markdown, no backticks):
[
  { "kw": "keyword phrase", "vol": 1200, "diff": 28, "intent": "Informational" }
]
Use realistic estimated volume (500–3000) and difficulty (15–45). Intent must be one of: Informational, Commercial, Transactional.`;

  const res = await fetch(`${API_BASE}/api/claude/keywords`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  return data.keywords;
}

export async function fetchSuggestionsForKeyword(keyword, location, count = 4, existingTitles = []) {
  const avoid = existingTitles.length > 0
    ? `Do NOT suggest any of these titles (already shown): ${existingTitles.join("; ")}.`
    : "";
  const prompt = `You are an SEO content strategist for a real estate team focused on ${location}, Florida.
Generate exactly ${count} DIFFERENT blog article ideas targeting the keyword: "${keyword}"
${avoid}
Each article should help prospective home buyers or people relocating to ${location} find the site.
Give each idea a meaningfully different angle — vary the format (guide, comparison, listicle, local insider, Q&A, myth-busting, etc).

Respond ONLY with a JSON array (no markdown, no backticks, no explanation):
[
  {
    "title": "compelling SEO article title",
    "angle": "one sentence — the specific hook or format that makes this distinct",
    "why": "2 sentences — why this will rank and convert for ${location} real estate buyers",
    "words": 1200
  }
]`;

  const res = await fetch(`${API_BASE}/api/claude/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, keyword })
  });
  const data = await res.json();
  return data.suggestions.map((s, i) => ({ ...s, kw: keyword, id: `${keyword}_${Date.now()}_${i}` }));
}

export async function generateArticleContent(article, prop) {
  const res = await fetch(`${API_BASE}/api/claude/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: article.title,
      keyword: article.kw,
      property: prop.short,
      propertyUrl: prop.url,
      blogUrl: prop.blog,
    })
  });
  return res.json();
}

export async function requestRevision(articleContent, revisionRequest, prop) {
  const res = await fetch(`${API_BASE}/api/claude/revise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articleContent,
      revisionRequest,
      property: prop.short,
    })
  });
  return res.json();
}

// --- Wix API ---

export async function fetchWixPosts(site) {
  const url = site
    ? `${API_BASE}/api/wix/posts?site=${site}`
    : `${API_BASE}/api/wix/posts`;
  const res = await fetch(url);
  const data = await res.json();
  return data.posts || [];
}

export async function createWixDraft({ propertyId, title, sections, seoTitle, metaDescription, slug }) {
  const res = await fetch(`${API_BASE}/api/wix/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, title, sections, seoTitle, metaDescription, slug }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || `Failed to create Wix draft (${res.status})`);
  }
  return res.json();
}
