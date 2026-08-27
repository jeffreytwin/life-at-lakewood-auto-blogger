// Vercel serverless function: /api/settings
// GET  → read shared app settings (business goals, writing style)
// POST → save shared app settings
//
// Backed by the Supabase app_settings table via the service role key, so
// settings are shared across devices/browsers instead of living in one
// browser's localStorage. Only allowlisted keys are exposed — secrets like
// google_refresh_token are never readable through this endpoint.

const ALLOWED_KEYS = ["business_goals", "writing_style"];

function supabaseHeaders() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    "Content-Type": "application/json",
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };
}

function getSupabaseUrl() {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}

export default async function handler(req, res) {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ configured: false, settings: {} });
  }

  if (req.method === "GET") {
    try {
      const keysFilter = ALLOWED_KEYS.map((k) => `"${k}"`).join(",");
      const r = await fetch(
        `${supabaseUrl}/rest/v1/app_settings?key=in.(${keysFilter})&select=key,value`,
        { headers: supabaseHeaders() }
      );
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
      const rows = await r.json();
      const settings = {};
      rows.forEach((row) => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      });
      return res.status(200).json({ configured: true, settings });
    } catch (err) {
      console.error("Settings read error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const updates = ALLOWED_KEYS.filter((k) => body[k] !== undefined).map((k) => ({
      key: k,
      value: JSON.stringify(body[k]),
      updated_at: new Date().toISOString(),
    }));
    if (!updates.length) return res.status(400).json({ error: "No valid settings in request" });

    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/app_settings`, {
        method: "POST",
        headers: { ...supabaseHeaders(), Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
      return res.status(200).json({ saved: updates.map((u) => u.key) });
    } catch (err) {
      console.error("Settings save error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
