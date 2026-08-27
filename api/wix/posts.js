// Vercel serverless function: /api/wix/posts
// GET  → Fetch published + draft posts from all 4 Wix sites
// POST → Create a draft post on a specific Wix site

const WIX_API_BASE = "https://www.wixapis.com";

const SITES = {
  lakewood: "4fbabb96-2d6c-4f20-a240-9223153498b5",
  wellen:   "1a8c2755-823e-4882-ae32-e6c108a30e39",
  parrish:  "a704cfe5-dd9b-44ff-a017-9d637d8c6fdc",
  longboat: "8b20e921-5b70-4428-8fcd-8c8ef3bad3ab",
};

function getApiKey() {
  const key = process.env.WIX_API_KEY;
  if (!key) throw new Error("WIX_API_KEY not configured");
  return key;
}

// Fetch published posts for a single site
async function fetchPublishedPosts(siteId, apiKey) {
  const res = await fetch(`${WIX_API_BASE}/blog/v3/posts/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
      "wix-site-id": siteId,
    },
    body: JSON.stringify({
      query: {
        paging: { limit: 100 },
        sort: [{ fieldName: "lastPublishedDate", order: "DESC" }],
      },
      fieldsets: ["URL", "CONTENT_TEXT"],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wix API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.posts || [];
}

// Fetch draft posts for a single site
async function fetchDraftPosts(siteId, apiKey) {
  const res = await fetch(`${WIX_API_BASE}/blog/v3/draft-posts/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": apiKey,
      "wix-site-id": siteId,
    },
    body: JSON.stringify({
      query: {
        paging: { limit: 50 },
        sort: [{ fieldName: "editedDate", order: "DESC" }],
      },
    }),
  });

  if (!res.ok) {
    // Draft query may not be available on all plans — gracefully return empty
    return [];
  }

  const data = await res.json();
  return data.draftPosts || [];
}

// Map a Wix published post to our article format
function mapPublishedPost(wixPost, propertyId) {
  const pubDate = wixPost.lastPublishedDate || wixPost.firstPublishedDate;
  const date = pubDate ? new Date(pubDate) : new Date();

  return {
    id: wixPost.id,
    p: propertyId,
    title: wixPost.title || "Untitled",
    kw: "", // We don't have keyword data from Wix — will be supplemented later
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
    status: "published",
    slug: wixPost.slug || "",
    wixPostId: wixPost.id,
    excerpt: wixPost.excerpt || "",
    url: wixPost.url?.base ? `${wixPost.url.base}${wixPost.url.path || ""}` : "",
  };
}

// Map a Wix draft post to our article format
function mapDraftPost(wixDraft, propertyId) {
  // Detect Wix scheduled posts (drafts with a future publish date)
  const scheduled = wixDraft.scheduledPublishDate;
  const date = scheduled
    ? new Date(scheduled)
    : wixDraft.editedDate ? new Date(wixDraft.editedDate) : new Date();

  return {
    id: `draft_${wixDraft.id}`,
    p: propertyId,
    title: wixDraft.title || "Untitled Draft",
    kw: "",
    day: date.getDate(),
    month: date.getMonth(),
    year: date.getFullYear(),
    status: scheduled ? "scheduled" : "in_wix",
    slug: wixDraft.slug || "",
    wixPostId: wixDraft.id,
    excerpt: wixDraft.excerpt || "",
  };
}

// Build a RICOS IMAGE node from an image uploaded to the Wix Media Manager
// via /api/wix/media ({ wixId, width, height, alt, caption }).
function imageNode(image) {
  const node = {
    type: "IMAGE",
    imageData: {
      containerData: { width: { size: "CONTENT" }, alignment: "CENTER" },
      image: {
        src: { id: image.wixId },
        width: image.width || 1200,
        height: image.height || 800,
      },
      ...(image.alt ? { altText: image.alt } : {}),
    },
  };
  if (image.caption) {
    node.nodes = [{
      type: "CAPTION",
      nodes: [{ type: "TEXT", textData: { text: image.caption, decorations: [] } }],
    }];
  }
  return node;
}

// Convert article sections to Wix rich content (RICOS format)
function sectionsToRichContent(sections) {
  const nodes = [];

  sections.forEach((section) => {
    // Add heading
    if (section.heading) {
      nodes.push({
        type: "HEADING",
        headingData: { level: 2 },
        nodes: [{
          type: "TEXT",
          textData: { text: section.heading },
        }],
      });
    }

    // Section image (already uploaded to the Wix Media Manager) goes between
    // the heading and the body text
    if (section.image && section.image.wixId) {
      nodes.push(imageNode(section.image));
    }

    // Add body paragraphs
    if (section.body) {
      const paragraphs = section.body.split("\n").filter(p => p.trim());
      paragraphs.forEach(para => {
        // Check if it's a bullet point
        if (para.trim().startsWith("•") || para.trim().startsWith("-") || para.trim().startsWith("*")) {
          nodes.push({
            type: "BULLETED_LIST",
            nodes: [{
              type: "LIST_ITEM",
              nodes: [{
                type: "PARAGRAPH",
                nodes: [{
                  type: "TEXT",
                  textData: { text: para.replace(/^[\s•\-*]+/, "").trim() },
                }],
              }],
            }],
          });
        } else {
          nodes.push({
            type: "PARAGRAPH",
            nodes: [{
              type: "TEXT",
              textData: { text: para },
            }],
          });
        }
      });
    }
  });

  return { nodes, metadata: { version: 1, createdTimestamp: new Date().toISOString() } };
}

export default async function handler(req, res) {
  // --- GET: Fetch all posts from all sites ---
  if (req.method === "GET") {
    let apiKey;
    try {
      apiKey = getApiKey();
    } catch (e) {
      // No API key configured — return empty so client falls back to mock data
      return res.status(200).json({ posts: [], message: "WIX_API_KEY not configured" });
    }

    const { site } = req.query; // Optional: fetch for one site only

    try {
      const sitesToFetch = site ? { [site]: SITES[site] } : SITES;
      const allPosts = [];

      await Promise.all(
        Object.entries(sitesToFetch).map(async ([propId, siteId]) => {
          if (!siteId) return;

          try {
            const [published, drafts] = await Promise.all([
              fetchPublishedPosts(siteId, apiKey),
              fetchDraftPosts(siteId, apiKey),
            ]);

            published.forEach(p => allPosts.push(mapPublishedPost(p, propId)));

            // Deduplicate: skip drafts that correspond to already-published posts.
            // Wix keeps draft copies of published posts when they're edited,
            // which causes every published post to also appear as "in_wix".
            const publishedTitles = new Set(published.map(p => (p.title || "").toLowerCase().trim()));
            drafts.forEach(d => {
              const draftTitle = (d.title || "").toLowerCase().trim();
              if (draftTitle && publishedTitles.has(draftTitle)) return;
              allPosts.push(mapDraftPost(d, propId));
            });
          } catch (siteErr) {
            console.error(`Error fetching posts for ${propId}:`, siteErr.message);
            // Continue with other sites
          }
        })
      );

      // Sort by date (most recent first)
      allPosts.sort((a, b) => {
        const dateA = new Date(a.year, a.month, a.day);
        const dateB = new Date(b.year, b.month, b.day);
        return dateB - dateA;
      });

      return res.status(200).json({ posts: allPosts });
    } catch (err) {
      console.error("Wix fetch error:", err);
      return res.status(500).json({ error: err.message, posts: [] });
    }
  }

  // --- POST: Create a draft post on a specific Wix site ---
  if (req.method === "POST") {
    let apiKey;
    try {
      apiKey = getApiKey();
    } catch (e) {
      return res.status(500).json({ error: "WIX_API_KEY not configured" });
    }

    const { propertyId, title, sections, seoTitle, metaDescription, slug, coverImage } = req.body;

    if (!propertyId || !SITES[propertyId]) {
      return res.status(400).json({ error: "Invalid propertyId" });
    }
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const siteId = SITES[propertyId];

    try {
      // Wix requires memberId (post owner) when creating drafts via API key auth.
      // Fetch it from an existing post on this site.
      let memberId = null;
      try {
        const existingPosts = await fetchPublishedPosts(siteId, apiKey);
        if (existingPosts.length > 0 && existingPosts[0].memberId) {
          memberId = existingPosts[0].memberId;
        } else {
          const existingDrafts = await fetchDraftPosts(siteId, apiKey);
          if (existingDrafts.length > 0 && existingDrafts[0].memberId) {
            memberId = existingDrafts[0].memberId;
          }
        }
      } catch (e) {
        console.warn("Could not fetch memberId for draft creation:", e.message);
      }

      const richContent = sectionsToRichContent(sections || []);

      const draftPost = {
        title,
        richContent,
        excerpt: metaDescription || "",
        ...(memberId ? { memberId } : {}),
      };

      // Cover image (must already be in the Wix Media Manager)
      if (coverImage && coverImage.wixId) {
        draftPost.media = {
          wixMedia: { image: { id: coverImage.wixId } },
          displayed: true,
          custom: true,
        };
      }

      // Add slug if provided
      if (slug) {
        draftPost.slug = slug;
      }

      // Add SEO data if provided
      if (seoTitle || metaDescription) {
        draftPost.seoData = {
          tags: [],
        };
        if (seoTitle) {
          draftPost.seoData.tags.push({
            type: "title",
            children: seoTitle,
          });
        }
        if (metaDescription) {
          draftPost.seoData.tags.push({
            type: "meta",
            props: { name: "description", content: metaDescription },
          });
        }
      }

      const wixRes = await fetch(`${WIX_API_BASE}/blog/v3/draft-posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey,
          "wix-site-id": siteId,
        },
        body: JSON.stringify({ draftPost }),
      });

      if (!wixRes.ok) {
        const text = await wixRes.text();
        throw new Error(`Wix API error (${wixRes.status}): ${text}`);
      }

      const result = await wixRes.json();

      return res.status(200).json({
        success: true,
        draftPostId: result.draftPost?.id,
        message: `Draft created in Wix for ${propertyId}`,
      });
    } catch (err) {
      console.error("Wix draft creation error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
