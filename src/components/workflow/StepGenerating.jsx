import { useState, useEffect, useRef } from "react";

export default function StepGenerating({ prop, count, articles, onDone }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [genError, setGenError] = useState(null);
  const fetchedRef = useRef(false);
  const stages = [
    "Fetching top-ranking competitors for each keyword…",
    "Outlining article structure & H2 headings…",
    "Writing introduction and body sections…",
    "Weaving in primary & secondary keywords naturally…",
    "Adding internal links & calls to action…",
    "Writing SEO title, meta description & slug…",
    "Final quality checks & formatting…",
    "✅ Done! Articles ready for your review.",
  ];

  // Animate the progress bar independently
  useEffect(() => {
    if (genError) return;
    const t = setInterval(() => {
      setProgress(p => {
        // Cap at 90% until the real API calls finish
        if (p >= 90) { clearInterval(t); return 90; }
        return p + 0.8;
      });
    }, 70);
    return () => clearInterval(t);
  }, [genError]);

  // Fetch real article content from Claude
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const generateAll = async () => {
      try {
        const results = await Promise.all(
          articles.map(async (article) => {
            const res = await fetch("/api/claude/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: article.title,
                keyword: article.kw,
                property: prop.short,
                propertyUrl: prop.url,
                blogUrl: prop.blog,
              }),
            });
            if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
            return res.json();
          })
        );

        // All articles generated — animate to 100% then call onDone
        setProgress(100);
        setTimeout(() => onDone(results), 1200);
      } catch (err) {
        console.error("Article generation error:", err);
        setGenError(err.message);
        // Fall back to mock content so the user can still proceed
        const mockResults = articles.map((article) => {
          const kw = article.kw;
          const location = prop.short;
          return {
            seoTitle: `${article.title} | ${location} Real Estate Guide`,
            metaDescription: `Discover everything you need to know about ${kw}. This comprehensive guide covers key facts, comparisons, and insider tips for ${location}, Florida home buyers.`,
            slug: article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            sections: [
              { heading: "Introduction", body: `If you've been researching ${kw}, you're not alone — it's one of the most searched topics among buyers exploring ${location}, Florida. Whether you're relocating from out of state, upgrading from a nearby area, or looking at investment opportunities, this guide will walk you through what you actually need to know.\n\nWe've pulled together data from Google Search Console, local MLS listings, and on-the-ground experience to give you an honest, up-to-date picture.` },
              { heading: "Key Facts & Overview", body: `${location} has seen significant growth in the past two years, with new master-planned communities, expanding commercial corridors, and improved infrastructure drawing families and retirees alike.\n\nHere are the essential numbers:\n• Median home price: $385,000 – $520,000 depending on the community\n• Average days on market: 32 days\n• Property tax rate: approximately 1.1% of assessed value\n• Top school ratings: Several A-rated elementary and middle schools in the district` },
              { heading: "What Buyers Should Know", body: `Before making a move, there are a few things specific to ${location} that most online guides skip. CDD fees can add $150–$300/month on top of your HOA, and they're often not included in the mortgage estimate you see online.\n\nNew construction timelines have improved — most builders are quoting 8–12 months for completion — but lot premiums on lakefront and preserve-view properties have climbed 15–20% since last year.\n\nIf you're comparing with other Southwest Florida communities, the main advantages here are newer infrastructure, walkability in the town center areas, and access to both Gulf beaches and I-75 for commuters.` },
              { heading: "Our Recommendation", body: `For buyers seriously considering ${kw}, we recommend starting with a visit to the community welcome centers, where you can walk model homes and speak directly with builder reps. Pair that with a drive through the established neighborhoods during evening hours to get a feel for the day-to-day community vibe.\n\nReady to explore your options? Contact our team for a personalized neighborhood match based on your budget, timeline, and lifestyle preferences.` },
            ],
          };
        });
        setProgress(100);
        setTimeout(() => onDone(mockResults), 1200);
      }
    };

    generateAll();
  }, []);

  useEffect(() => {
    setStage(Math.min(Math.floor(progress / (100 / stages.length)), stages.length - 1));
  }, [progress]);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:420, textAlign:"center" }}>
      <div style={{ width:72, height:72, borderRadius:"50%", background:prop.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, marginBottom:24, animation:"pulse 2s ease-in-out infinite" }}>✍️</div>
      <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 8px" }}>
        Writing {count} Article{count>1?"s":""}…
      </h2>
      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#6B7280", marginBottom:36 }}>Claude is researching and writing. You'll be able to review and edit before anything goes to Wix.</p>

      <div style={{ width:"100%", maxWidth:480, marginBottom:20 }}>
        <div style={{ height:8, background:"#E5E7EB", borderRadius:4, overflow:"hidden", marginBottom:10 }}>
          <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${prop.color},${prop.accent})`, borderRadius:4, transition:"width 0.1s linear" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:prop.color, fontWeight:600 }}>{stages[stage]}</span>
          <span style={{ fontSize:12, color:"#9CA3AF" }}>{Math.round(progress)}%</span>
        </div>
      </div>

      {genError && (
        <div style={{ fontSize:12, color:"#F59E0B", background:"#FFFBEB", padding:"8px 14px", borderRadius:8, marginBottom:12, maxWidth:480 }}>
          API unavailable — using sample content. You can edit it in the next step.
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:5, width:"100%", maxWidth:480, textAlign:"left" }}>
        {stages.slice(0, stage+1).map((s,i) => (
          <div key={i} style={{ display:"flex", gap:8, alignItems:"center", opacity:i<stage?0.4:1, transition:"opacity 0.3s" }}>
            <span style={{ fontSize:11 }}>{i<stage?"✅":"⏳"}</span>
            <span style={{ fontSize:12, color:"#6B7280" }}>{s}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
    </div>
  );
}
