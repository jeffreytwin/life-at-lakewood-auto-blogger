// API service — the single place the frontend talks to the serverless
// functions in /api/. Every helper throws an Error with the server's real
// message on failure, so components can show users what actually went wrong.

const API_BASE = "";

async function apiFetch(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch (e) {
    throw new Error("Network error — check your connection and try again.");
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

function postJSON(path, body) {
  return apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Claude AI ---

export async function fetchKeywordIdeas({ location, seeds = [], existing = [], count = 8, businessGoals = "" }) {
  const data = await postJSON("/api/claude/keywords", { location, seeds, existing, count, businessGoals });
  return data.keywords || [];
}

export async function fetchSuggestionsForKeyword({ keyword, kwData = null, location, propertyUrl = "", count = 4, existingTitles = [], publishedTitles = [], businessGoals = "" }) {
  const data = await postJSON("/api/claude/articles", {
    keyword, kwData, location, propertyUrl, count, existingTitles, publishedTitles, businessGoals,
  });
  return (data.suggestions || []).map((s, i) => ({ ...s, kw: keyword, id: `${keyword}_${Date.now()}_${i}` }));
}

export async function generateArticleContent(article, prop, { writingStyle = "", businessGoals = "", publishedTitles = [] } = {}) {
  return postJSON("/api/claude/generate", {
    title: article.title,
    keyword: article.kw,
    kwData: article.kwData || null,
    property: prop.short,
    propertyUrl: prop.url,
    blogUrl: prop.blog,
    writingStyle,
    businessGoals,
    funnelStage: article.funnelStage || "",
    cta: article.cta || "",
    publishedTitles,
  });
}

export async function requestRevision(articleContent, revisionRequest, prop, writingStyle = "") {
  return postJSON("/api/claude/revise", {
    articleContent,
    revisionRequest,
    property: prop.short,
    writingStyle,
  });
}

// --- SEMrush keyword analytics ---

export async function fetchSemrushOverview(keywords) {
  const param = encodeURIComponent(keywords.slice(0, 100).join(";"));
  return apiFetch(`/api/semrush/keywords?action=overview&keywords=${param}`);
}

export async function fetchSemrushIdeas(phrase, action = "related", limit = 20) {
  return apiFetch(`/api/semrush/keywords?action=${action}&phrase=${encodeURIComponent(phrase)}&limit=${limit}`);
}

// --- Wix ---

export async function fetchWixPosts(site) {
  const url = site ? `/api/wix/posts?site=${site}` : "/api/wix/posts";
  const data = await apiFetch(url);
  return data.posts || [];
}

export async function createWixDraft({ propertyId, title, sections, seoTitle, metaDescription, slug, coverImage }) {
  return postJSON("/api/wix/posts", { propertyId, title, sections, seoTitle, metaDescription, slug, coverImage });
}

export async function uploadWixMedia({ propertyId, fileName, dataUrl }) {
  return postJSON("/api/wix/media", { propertyId, fileName, dataUrl });
}

// --- Google Search Console ---

export async function fetchGSCKeywords(propertyId, days = 90) {
  return apiFetch(`/api/google/keywords?property=${propertyId}&days=${days}`);
}

// --- Shared settings (Supabase-backed) ---

export async function fetchSettings() {
  const data = await apiFetch("/api/settings");
  return data.settings || {};
}

export async function saveSettings(settings) {
  return postJSON("/api/settings", settings);
}
