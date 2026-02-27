// Vercel serverless function: /api/google/keywords
// Fetches keyword performance data from Google Search Console
//
// GET /api/google/keywords?site=lifeatlakewood.com&days=90
// Returns: { keywords: [{ kw, clicks, impressions, ctr, position }], connected: bool }

import { getRefreshToken, getAccessToken } from "./auth.js";

const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

// Map our property URLs to the GSC site URLs
const SITE_URLS = {
  lakewood:  "sc-domain:lifeatlakewood.com",
  wellen:    "sc-domain:lifeinwellenpark.com",
  parrish:   "sc-domain:lifeatparrish.com",
  longboat:  "sc-domain:lifeinlongboatkey.com",
};

// Also support raw domain lookups
const DOMAIN_TO_PROP = {
  "lifeatlakewood.com": "lakewood",
  "lifeinwellenpark.com": "wellen",
  "lifeatparrish.com": "parrish",
  "lifeinlongboatkey.com": "longboat",
};

function getDateRange(days = 90) {
  const end = new Date();
  end.setDate(end.getDate() - 3); // GSC data has ~3 day delay
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function categorizeIntent(keyword) {
  const kw = keyword.toLowerCase();
  if (/buy|for sale|price|cost|under \d|over \d|listing|homes near/.test(kw)) return "Transactional";
  if (/vs|compare|best|top|review|rating|pros and cons/.test(kw)) return "Commercial";
  return "Informational";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { site, property, days = "90" } = req.query;

  // Determine the GSC site URL
  let gscSiteUrl;
  if (property && SITE_URLS[property]) {
    gscSiteUrl = SITE_URLS[property];
  } else if (site && DOMAIN_TO_PROP[site]) {
    gscSiteUrl = SITE_URLS[DOMAIN_TO_PROP[site]];
  } else if (site) {
    gscSiteUrl = `sc-domain:${site}`;
  }

  // Check if we have Google auth
  let refreshToken;
  try {
    refreshToken = await getRefreshToken();
  } catch {
    // No token available
  }

  if (!refreshToken) {
    return res.status(200).json({
      keywords: [],
      connected: false,
      message: "Google Search Console not connected. Connect via Account settings.",
    });
  }

  if (!gscSiteUrl) {
    return res.status(400).json({ error: "Missing site or property parameter" });
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const { startDate, endDate } = getDateRange(parseInt(days));

    // Fetch search analytics from GSC
    const gscRes = await fetch(
      `${GSC_API_BASE}/sites/${encodeURIComponent(gscSiteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query"],
          rowLimit: 100,
          dataState: "all",
        }),
      }
    );

    if (!gscRes.ok) {
      const text = await gscRes.text();
      console.error("GSC API error:", text);

      if (gscRes.status === 403) {
        return res.status(200).json({
          keywords: [],
          connected: true,
          message: "No access to this property in Google Search Console. Make sure the account has access.",
        });
      }

      throw new Error(`GSC API error (${gscRes.status}): ${text}`);
    }

    const data = await gscRes.json();
    const rows = data.rows || [];

    // Map GSC data to our keyword format
    const keywords = rows.map(row => ({
      kw: row.keys[0],
      vol: Math.round(row.impressions / (parseInt(days) / 30)), // Estimate monthly volume from impressions
      diff: Math.min(50, Math.max(5, Math.round(row.position * 1.5))), // Estimate difficulty from position
      intent: categorizeIntent(row.keys[0]),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: Math.round(row.ctr * 10000) / 100, // Convert to percentage
      position: Math.round(row.position * 10) / 10,
      source: "gsc",
    }));

    // Sort by impressions (highest first)
    keywords.sort((a, b) => b.impressions - a.impressions);

    return res.status(200).json({
      keywords,
      connected: true,
      dateRange: { startDate, endDate },
      total: keywords.length,
    });
  } catch (err) {
    console.error("GSC fetch error:", err);
    return res.status(500).json({
      keywords: [],
      connected: false,
      error: err.message,
    });
  }
}
