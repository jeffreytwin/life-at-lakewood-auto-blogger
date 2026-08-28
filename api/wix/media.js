// Vercel serverless function: POST /api/wix/media
// Uploads an image into the Wix Media Manager for a property site, so Wix
// hosts the file. Returns the Wix media id + static URL for use in blog posts.
//
// Flow (Wix Site Media API):
//   1. POST /site-media/v1/files/generate-upload-url  → signed uploadUrl
//   2. PUT  {uploadUrl}?filename=...  with the binary  → file descriptor

const WIX_API_BASE = "https://www.wixapis.com";

const SITES = {
  lakewood: "4fbabb96-2d6c-4f20-a240-9223153498b5",
  wellen:   "1a8c2755-823e-4882-ae32-e6c108a30e39",
  parrish:  "a704cfe5-dd9b-44ff-a017-9d637d8c6fdc",
  longboat: "8b20e921-5b70-4428-8fcd-8c8ef3bad3ab",
};

// Vercel's request body limit is ~4.5MB; the client compresses images before
// sending, but reject anything decoded above 4MB with a clear message.
const MAX_BYTES = 4 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "WIX_API_KEY not configured" });
  }

  const { propertyId, fileName, dataUrl } = req.body || {};
  if (!propertyId || !SITES[propertyId]) {
    return res.status(400).json({ error: "Invalid propertyId" });
  }
  if (!dataUrl || !fileName) {
    return res.status(400).json({ error: "Missing fileName or dataUrl" });
  }

  const match = dataUrl.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (!match) {
    return res.status(400).json({ error: "dataUrl must be a base64 image data URL" });
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ error: `Image is ${(buffer.length / 1024 / 1024).toFixed(1)}MB after compression — keep images under 4MB` });
  }

  const siteId = SITES[propertyId];
  const wixHeaders = {
    "Content-Type": "application/json",
    Authorization: apiKey,
    "wix-site-id": siteId,
  };

  try {
    // 1. Get a signed upload URL
    const genRes = await fetch(`${WIX_API_BASE}/site-media/v1/files/generate-upload-url`, {
      method: "POST",
      headers: wixHeaders,
      body: JSON.stringify({ mimeType, fileName }),
    });
    if (!genRes.ok) {
      throw new Error(`Wix generate-upload-url failed (${genRes.status}): ${await genRes.text()}`);
    }
    const { uploadUrl } = await genRes.json();
    if (!uploadUrl) throw new Error("Wix did not return an uploadUrl");

    // 2. Upload the binary
    const sep = uploadUrl.includes("?") ? "&" : "?";
    const putRes = await fetch(`${uploadUrl}${sep}filename=${encodeURIComponent(fileName)}`, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: buffer,
    });
    const putText = await putRes.text();
    if (!putRes.ok) {
      throw new Error(`Wix upload failed (${putRes.status}): ${putText}`);
    }

    let file = null;
    try {
      const parsed = JSON.parse(putText);
      file = parsed.file || parsed;
    } catch {
      // Some responses can be empty — the upload still succeeded
    }

    return res.status(200).json({
      success: true,
      id: file?.id || null,
      url: file?.url || null,
      fileName: file?.displayName || fileName,
    });
  } catch (err) {
    console.error("Wix media upload error:", err);
    return res.status(502).json({ error: err.message });
  }
}
