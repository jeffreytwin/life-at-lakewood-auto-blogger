// Vercel serverless function: GET /api/semrush/keywords
// Real keyword analytics from the SEMrush Analytics API (requires SEMRUSH_API_KEY).
//
//   ?action=overview&keywords=kw1;kw2;...   → volume/CPC/competition + difficulty for up to 100 keywords
//   ?action=related&phrase=seed&limit=20    → related keyword ideas with metrics
//   ?action=questions&phrase=seed&limit=20  → question keywords with metrics
//
// SEMrush responds with semicolon-separated CSV, or a plain-text "ERROR N :: MSG" line.

const SEMRUSH_BASE = "https://api.semrush.com/";
const DATABASE = "us";

// SEMrush "In" intent codes
const INTENT_MAP = { 0: "Commercial", 1: "Informational", 2: "Navigational", 3: "Transactional" };

function categorizeIntent(keyword) {
  const kw = keyword.toLowerCase();
  if (/buy|for sale|price|cost|under \d|over \d|listing|homes near/.test(kw)) return "Transactional";
  if (/vs|compare|best|top|review|rating|pros and cons/.test(kw)) return "Commercial";
  return "Informational";
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i] !== undefined ? values[i].trim() : ""));
    return row;
  });
}

class SemrushError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// Fetch one report. "In" (intent) isn't supported by every report type, so on an
// error we retry once with the In column removed before giving up.
async function semrushReport(key, type, params, columns) {
  const attempt = async (cols) => {
    const url = new URL(SEMRUSH_BASE);
    url.searchParams.set("type", type);
    url.searchParams.set("key", key);
    url.searchParams.set("database", DATABASE);
    url.searchParams.set("export_columns", cols.join(","));
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString());
    const text = await res.text();

    const errMatch = text.trim().match(/^ERROR\s+(\d+)\s*::\s*(.*)$/i);
    if (errMatch) throw new SemrushError(errMatch[2].trim() || "Unknown SEMrush error", parseInt(errMatch[1]));
    if (!res.ok) throw new SemrushError(`SEMrush HTTP ${res.status}`, res.status);
    return parseCsv(text);
  };

  try {
    return await attempt(columns);
  } catch (e) {
    // "NOTHING FOUND" is an empty result, not a failure
    if (e instanceof SemrushError && e.code === 50) return [];
    if (e instanceof SemrushError && columns.includes("In")) {
      return attempt(columns.filter((c) => c !== "In"));
    }
    throw e;
  }
}

function mapRow(row) {
  const kw = row.Keyword || row.Ph || "";
  const vol = row["Search Volume"] ?? row.Nq;
  const cpc = row.CPC ?? row.Cp;
  const comp = row.Competition ?? row.Co;
  const kd = row["Keyword Difficulty Index"] ?? row["Keyword Difficulty"] ?? row.Kd;
  const intentCode = row.Intent ?? row.In;

  let intent = null;
  if (intentCode !== undefined && intentCode !== "" && INTENT_MAP[parseInt(intentCode)]) {
    intent = INTENT_MAP[parseInt(intentCode)];
  }

  return {
    kw,
    vol: vol !== undefined && vol !== "" ? parseInt(vol) : null,
    cpc: cpc !== undefined && cpc !== "" ? parseFloat(cpc) : null,
    competition: comp !== undefined && comp !== "" ? parseFloat(comp) : null,
    diff: kd !== undefined && kd !== "" ? Math.round(parseFloat(kd)) : null,
    intent: intent || categorizeIntent(kw),
    source: "semrush",
  };
}

// Merge phrase_kdi difficulty into rows keyed by keyword.
async function attachDifficulty(key, rows) {
  const missing = rows.filter((r) => r.diff == null && r.kw);
  if (!missing.length) return rows;
  const byKw = new Map();
  // phrase_kdi accepts up to 100 phrases per call
  for (let i = 0; i < missing.length; i += 100) {
    const batch = missing.slice(i, i + 100);
    const kdiRows = await semrushReport(
      key,
      "phrase_kdi",
      { phrase: batch.map((r) => r.kw).join(";") },
      ["Ph", "Kd"]
    );
    kdiRows.forEach((r) => {
      const kw = r.Keyword || r.Ph || "";
      const kd = r["Keyword Difficulty Index"] ?? r["Keyword Difficulty"] ?? r.Kd;
      if (kw && kd !== undefined && kd !== "") byKw.set(kw.toLowerCase(), Math.round(parseFloat(kd)));
    });
  }
  return rows.map((r) => (r.diff == null && byKw.has(r.kw.toLowerCase()) ? { ...r, diff: byKw.get(r.kw.toLowerCase()) } : r));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.SEMRUSH_API_KEY;
  if (!key) {
    return res.status(200).json({
      configured: false,
      keywords: [],
      message: "SEMRUSH_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables.",
    });
  }

  const { action = "overview", keywords = "", phrase = "", limit = "20" } = req.query;
  const displayLimit = Math.min(parseInt(limit) || 20, 50);

  try {
    let rows = [];

    if (action === "overview") {
      const list = keywords
        .split(";")
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 100);
      if (!list.length) return res.status(400).json({ error: "Missing keywords parameter" });

      rows = (
        await semrushReport(key, "phrase_these", { phrase: list.join(";") }, ["Ph", "Nq", "Cp", "Co", "In"])
      ).map(mapRow);
      rows = await attachDifficulty(key, rows);
    } else if (action === "related" || action === "questions") {
      if (!phrase) return res.status(400).json({ error: "Missing phrase parameter" });
      const type = action === "related" ? "phrase_related" : "phrase_questions";
      rows = (
        await semrushReport(
          key,
          type,
          { phrase, display_limit: String(displayLimit), display_sort: "nq_desc" },
          ["Ph", "Nq", "Cp", "Co", "In"]
        )
      ).map(mapRow);
      rows = await attachDifficulty(key, rows);
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json({ configured: true, keywords: rows, total: rows.length });
  } catch (err) {
    console.error("SEMrush error:", err);
    let hint = "";
    if (err instanceof SemrushError) {
      if (/wrong key/i.test(err.message)) hint = " Check that SEMRUSH_API_KEY in Vercel matches the key at semrush.com/api-documentation.";
      else if (/limit|balance|units/i.test(err.message)) hint = " Your SEMrush account may be out of API units — the Analytics API requires an API-enabled plan (Business) or purchased API units.";
      else if (/disabled|denied|access/i.test(err.message)) hint = " Your SEMrush subscription may not include Analytics API access.";
    }
    return res.status(502).json({ error: `SEMrush: ${err.message}.${hint}` });
  }
}
