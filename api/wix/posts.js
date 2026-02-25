// Vercel serverless function: /api/wix/posts
// Fetch and create blog posts via the Wix REST API
// Phase 3 will implement this fully

export default async function handler(req, res) {
  if (req.method === "GET") {
    // TODO: Fetch posts from Wix for a given site
    return res.status(200).json({ posts: [], message: "Wix integration coming in Phase 3" });
  }

  if (req.method === "POST") {
    // TODO: Create a draft post in Wix
    return res.status(200).json({ success: true, message: "Wix draft creation coming in Phase 3" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
