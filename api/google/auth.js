// Vercel serverless function: /api/google/auth
// Handles Google OAuth flow for Search Console access
//
// Flow:
// 1. GET /api/google/auth          → Redirects to Google consent screen
// 2. GET /api/google/auth?code=xxx → Exchanges code for tokens, stores refresh token

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = "https://www.googleapis.com/auth/webmasters.readonly";

function getRedirectUri(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}/api/google/auth`;
}

// Store the refresh token in Supabase via REST API
async function storeRefreshToken(token) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return false;

  try {
    // Upsert into app_settings table
    const res = await fetch(`${supabaseUrl}/rest/v1/app_settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({ key: "google_refresh_token", value: token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Read the refresh token from Supabase or env var
export async function getRefreshToken() {
  // Try env var first (simplest)
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return process.env.GOOGLE_REFRESH_TOKEN;
  }

  // Try Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_settings?key=eq.google_refresh_token&select=value`,
      {
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
      }
    );
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) return rows[0].value;
    }
  } catch {
    // Fall through
  }

  return null;
}

// Exchange refresh token for a fresh access token
export async function getAccessToken(refreshToken) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Google OAuth credentials not configured" });
  }

  const redirectUri = getRedirectUri(req);
  const { code, error: authError } = req.query;

  // --- Error from Google ---
  if (authError) {
    return res.redirect("/?google_auth=error&reason=" + encodeURIComponent(authError));
  }

  // --- Callback: Exchange code for tokens ---
  if (code) {
    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const text = await tokenRes.text();
        console.error("Token exchange failed:", text);
        return res.redirect("/?google_auth=error&reason=token_exchange_failed");
      }

      const tokens = await tokenRes.json();

      if (tokens.refresh_token) {
        const stored = await storeRefreshToken(tokens.refresh_token);
        if (!stored) {
          // If we couldn't store in Supabase, show it to the user
          // so they can add it as an env var
          return res.send(`
            <html>
              <body style="font-family:system-ui;max-width:600px;margin:60px auto;padding:20px">
                <h2>Google Search Console Connected!</h2>
                <p>Add this refresh token to your Vercel environment variables as <code>GOOGLE_REFRESH_TOKEN</code>:</p>
                <pre style="background:#f3f4f6;padding:16px;border-radius:8px;word-break:break-all">${tokens.refresh_token}</pre>
                <p style="color:#6B7280;font-size:14px">
                  After adding it to Vercel, redeploy and the GSC integration will work automatically.
                  You can also create the <code>app_settings</code> table in Supabase for automatic token storage.
                </p>
                <a href="/" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#3B0764;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Back to App</a>
              </body>
            </html>
          `);
        }
      }

      return res.redirect("/?google_auth=success");
    } catch (err) {
      console.error("Google auth error:", err);
      return res.redirect("/?google_auth=error&reason=" + encodeURIComponent(err.message));
    }
  }

  // --- Start: Redirect to Google consent screen ---
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return res.redirect(authUrl.toString());
}
