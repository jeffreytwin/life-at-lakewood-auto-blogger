// Vercel serverless function: /api/google/keywords
// Fetches keyword data from Google Search Console
// Phase 4 will implement this fully

export default async function handler(req, res) {
  return res.status(200).json({ keywords: [], message: "GSC keyword fetch coming in Phase 4" });
}
