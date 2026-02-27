import { useState, useEffect } from "react";
import { LOGOS } from "../data/logos";
import { SM, SHORT_MONTH_NAMES } from "../data/constants";
import Pill from "./ui/Pill";
import Kpi from "./ui/Kpi";

export default function PropertyDashboard({ prop, articles: ARTICLES = [], onStartWorkflow, goals={}, dm=false, bg="#F2F1ED", card="#fff", border="#E5E7EB", text="#111827", muted="#6B7280", mob=false, onRefresh, refreshing=false }) {
  const arts = ARTICLES.filter(a => a.p === prop.id);
  const draftArts = arts.filter(a => a.status === "in_wix");
  const [artSearch, setArtSearch] = useState("");
  const [showAllArticles, setShowAllArticles] = useState(false);
  const [showAllScheduled, setShowAllScheduled] = useState(false);
  const [showAllDrafts, setShowAllDrafts] = useState(false);
  const filteredArts = artSearch.trim()
    ? arts.filter(a => a.title.toLowerCase().includes(artSearch.toLowerCase()) || a.kw.toLowerCase().includes(artSearch.toLowerCase()))
    : arts;

  // Current month for KPI and goal counting
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  // Fetch real GSC data for this property
  const [gscData, setGscData] = useState(null);
  const [gscConnected, setGscConnected] = useState(false);
  const [gscLoaded, setGscLoaded] = useState(false);
  useEffect(() => {
    fetch(`/api/google/keywords?property=${prop.id}`)
      .then(r => r.json())
      .then(data => {
        setGscConnected(!!data.connected);
        if (data.connected && data.keywords?.length > 0) setGscData(data.keywords);
        setGscLoaded(true);
      })
      .catch(() => { setGscLoaded(true); });
  }, [prop.id]);

  // Build top articles from real GSC data when available
  const publishedArts = arts.filter(a => a.status === "published");
  const publishedThisMonth = publishedArts.filter(a => a.month === curMonth && a.year === curYear);

  // Match GSC keyword data to published articles (only when GSC is truly connected)
  const allTopArticles = (() => {
    if (gscConnected && gscData) {
      // Build a map of keyword -> GSC data (take best clicks per keyword)
      const gscMap = {};
      gscData.forEach(g => { const k = (g.kw || "").toLowerCase().trim(); if (k && (!gscMap[k] || g.clicks > gscMap[k].clicks)) gscMap[k] = g; });
      // Match articles to GSC data by keyword or title words
      const usedGscIds = new Set();
      return publishedArts.map(a => {
        const artKw = (a.kw || "").toLowerCase().trim();
        // Only match by keyword if the article has a non-empty keyword
        const exactMatch = artKw ? gscMap[artKw] : null;
        const fuzzyMatch = !exactMatch && artKw ? gscData.find(g => {
          const q = (g.kw || "").toLowerCase().trim();
          return q && !usedGscIds.has(q) && (a.title.toLowerCase().includes(q) || q.includes(artKw));
        }) : null;
        const match = exactMatch || fuzzyMatch;
        if (match) usedGscIds.add((match.kw || "").toLowerCase().trim());
        return match ? { t: a.title, c: match.clicks || 0, p: Math.round((match.position || 0) * 10) / 10 } : null;
      }).filter(Boolean).sort((a, b) => b.c - a.c);
    }
    return [];
  })();

  const recentActivity = arts.slice().sort((a, b) => {
    const dateA = a.year != null ? new Date(a.year, a.month || 0, a.day || 1) : new Date(0);
    const dateB = b.year != null ? new Date(b.year, b.month || 0, b.day || 1) : new Date(0);
    return dateB - dateA;
  }).slice(0, 3).map(a => ({
    l: a.status === "published" ? "Published" : a.status === "scheduled" ? "Scheduled" : "In Wix",
    v: a.title.length > 40 ? a.title.slice(0, 37) + "…" : a.title,
    t: a.status === "published" || a.status === "scheduled"
      ? `${SHORT_MONTH_NAMES[a.month] || "—"} ${a.day}, ${a.year || ""}`
      : "Draft",
  }));

  // Article link: use Wix URL if available, otherwise build /post/ path
  const getArticleUrl = (a) => {
    if (a.url) return a.url;
    const slug = a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `https://${prop.url}/post/${slug}`;
  };

  // Scheduled + published articles for display (with 4-item limit)
  const schedPubArts = filteredArts.filter(a => a.status === "published" || a.status === "scheduled");
  const visibleSchedPub = showAllScheduled ? schedPubArts : schedPubArts.slice(0, 4);

  // Drafts for display (with 4-item limit)
  const visibleDrafts = showAllDrafts ? draftArts : draftArts.slice(0, 4);

  return (
    <div style={{ padding: mob ? "20px 16px" : "36px 44px", maxWidth:1100, background:bg, transition:"background 0.3s" }}>

      {/* Header */}
      <div style={{ marginBottom: mob ? 20 : 26 }}>
        <div style={{ display:"flex", alignItems:"center", gap: mob ? 10 : 12, marginBottom:12 }}>
          <img src={LOGOS[prop.id]} alt={prop.name} style={{ width: mob ? 40 : 52, height: mob ? 40 : 52, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
          <div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:prop.accent, margin:0 }}>Property Dashboard</p>
            <h1 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:18, color:text, margin:0, lineHeight:1.3 }}>{prop.name}</h1>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          <a href={"https://"+prop.url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:muted, textDecoration:"none", background:dm?"#1E293B":"#F3F4F6", padding:"4px 10px", borderRadius:6, fontWeight:600 }}>🌐 {prop.url}</a>
          <a href={"https://"+prop.blog} target="_blank" rel="noreferrer" style={{ fontSize:12, color:prop.color, textDecoration:"none", background:prop.light, padding:"4px 10px", borderRadius:6, fontWeight:600 }}>✍️ {prop.blog}</a>
          {onRefresh && (
            <button onClick={onRefresh} disabled={refreshing}
              style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", background:dm?"#1E293B":"#F3F4F6", border:"none", borderRadius:6, fontSize:12, fontWeight:600, color:refreshing?"#9CA3AF":muted, cursor:refreshing?"not-allowed":"pointer" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:refreshing?"spin 0.7s linear infinite":"none" }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              {refreshing ? "Syncing…" : "Sync"}
            </button>
          )}
        </div>
        <button onClick={() => onStartWorkflow("new")}
          style={{ display:"inline-flex", alignItems:"center", gap:10, padding: mob ? "14px 18px" : "12px 20px", background:prop.color, color:"#fff", border:"none", borderRadius:12, cursor:"pointer", width: mob ? "100%" : "auto" }}>
          <div style={{ width:28, height:28, borderRadius:7, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✨</div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, lineHeight:1 }}>Start New Article</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", marginTop:2 }}>Keywords → Write → Publish</div>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap: mob ? 8 : 10, marginBottom: mob ? 16 : 22, maxWidth: mob ? "100%" : 360 }}>
        {[
          { label:"Total Posts", value:arts.length, sub:"All time" },
          { label:"Published", value:publishedThisMonth.length, sub:"This month" },
        ].map(k=><Kpi key={k.label} {...k} accent={prop.accent} dm={dm} card={card} border={border} text={text} muted={muted} />)}
      </div>

      {/* Top Articles + Recent Activity — ABOVE scheduled/published */}
      <div style={{ display:"grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:14, padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:text, letterSpacing:"0.04em" }}>🏆 Top Articles (All Time)</div>
            {allTopArticles.length > 3 && !showAllArticles && <button onClick={()=>setShowAllArticles(true)} style={{ fontSize:11, fontWeight:700, color:prop.accent, background:"none", border:"none", cursor:"pointer", padding:0 }}>See More →</button>}
            {showAllArticles && <button onClick={()=>setShowAllArticles(false)} style={{ fontSize:11, fontWeight:700, color:muted, background:"none", border:"none", cursor:"pointer", padding:0 }}>Show Less</button>}
          </div>
          {allTopArticles.length === 0 ? (
            <div style={{ padding:"24px 10px", textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:10 }}>📊</div>
              <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:4 }}>N/A</div>
              <div style={{ fontSize:12, color:muted, marginBottom:12 }}>
                {gscConnected ? "No matching data found for published articles yet." : "Connect Google Search Console to see real click and ranking data."}
              </div>
              {!gscConnected && (
                <a href="/api/google/auth" target="_blank" rel="noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#4285F4", color:"#fff", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700 }}>
                  Connect Google Search Console
                </a>
              )}
            </div>
          ) : (showAllArticles ? allTopArticles : allTopArticles.slice(0, 3)).map((a,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<(showAllArticles?allTopArticles.length:3)-1?`1px solid ${border}`:"none" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:text, marginBottom:2 }}>{a.t}</div>
                <div style={{ fontSize:11, color:muted }}>Avg. Position: {a.p}</div>
              </div>
              <div style={{ textAlign:"right", marginLeft:14 }}>
                <div style={{ fontSize:20, fontWeight:800, color:dm?prop.accent:prop.color }}>{a.c}</div>
                <div style={{ fontSize:10, color:muted }}>clicks</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:14, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, color:text, marginBottom:14, letterSpacing:"0.04em" }}>🕐 Recent Activity</div>
          {recentActivity.map((item,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 0", borderBottom:i<recentActivity.length-1?`1px solid ${border}`:"none" }}>
              <div style={{ width:28, height:28, borderRadius:8, background:prop.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>
                {item.l==="Published"?"✓":item.l==="Scheduled"?"⏰":"📝"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:prop.accent, fontWeight:700 }}>{item.l}</div>
                <div style={{ fontSize:13, fontWeight:700, color:text }}>{item.v}</div>
              </div>
              <div style={{ fontSize:11, color:muted, whiteSpace:"nowrap" }}>{item.t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled & Published Articles + Needs Attention */}
      <div style={{ display:"grid", gridTemplateColumns: mob ? "1fr" : "1fr 340px", gap:16, marginBottom:16 }}>

        {/* Scheduled and Published articles with search */}
        <div style={{ background:card, border:`1px solid ${border}`, borderRadius:14, padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:14, fontWeight:700, color:text, letterSpacing:"0.01em" }}>📅 Scheduled & Published Articles</div>
            <div style={{ fontSize:12, color:muted }}>{arts.filter(a=>a.status==="published").length} of {arts.length} published</div>
          </div>
          <div style={{ position:"relative", marginBottom:14 }}>
            <svg style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input value={artSearch} onChange={e=>setArtSearch(e.target.value)} placeholder="Search by title or keyword…"
              style={{ width:"100%", padding:"8px 12px 8px 32px", border:`1px solid ${border}`, borderRadius:8, fontSize:12, outline:"none", color:text, background:dm?"#0F172A":"#FAFAFA" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor=border} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns: mob ? "1fr" : "repeat(auto-fill,minmax(240px,1fr))", gap: mob ? 8 : 10 }}>
            {schedPubArts.length === 0 ? (
              <div style={{ gridColumn:"1/-1", padding:"24px", textAlign:"center", color:muted, fontSize:13 }}>
                {artSearch ? `No articles match "${artSearch}"` : "No scheduled or published articles yet"}
              </div>
            ) : visibleSchedPub.map(a=>(
              <div key={a.id} style={{ border:`1px solid ${border}`, borderRadius:10, padding:"12px 14px", background:a.status==="published"?(dm?"#1a2535":"#FAFAFA"):card }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:muted }}>{SHORT_MONTH_NAMES[a.month] || "—"} {a.day}{a.year ? `, ${a.year}` : ""}</div>
                  <Pill status={a.status} />
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:text, lineHeight:1.4, marginBottom:4 }}>{a.title}</div>
                <div style={{ fontSize:11, color:muted, marginBottom:8 }}>🎯 {a.kw}</div>
                {a.status === "published" && (
                  <a href={getArticleUrl(a)} target="_blank" rel="noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:prop.color, background:prop.light, padding:"5px 10px", borderRadius:6, textDecoration:"none" }}>
                    View Article ↗
                  </a>
                )}
                {a.status === "scheduled" && (
                  <a href={prop.wixScheduled || prop.wixDash} target="_blank" rel="noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:700, color:"#92400E", background:"#FFFBEB", padding:"5px 10px", borderRadius:6, textDecoration:"none", border:"1px solid #FDE68A" }}>
                    View Scheduled →
                  </a>
                )}
              </div>
            ))}
          </div>
          {schedPubArts.length > 4 && (
            <button onClick={() => setShowAllScheduled(s => !s)}
              style={{ display:"block", width:"100%", marginTop:12, padding:"8px", background:"none", border:`1px solid ${border}`, borderRadius:8, fontSize:12, fontWeight:700, color:prop.accent, cursor:"pointer" }}>
              {showAllScheduled ? "Show Less" : "See More →"}
            </button>
          )}
        </div>

        {/* Needs Attention + Monthly Goal */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, ...(mob ? { order:-1 } : {}) }}>
          <div style={{ background:card, border:`1px solid ${draftArts.length > 0 ? "#FDE68A" : border}`, borderRadius:14, padding:"20px 22px", display:"flex", flexDirection:"column", flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ fontSize:16 }}>{draftArts.length > 0 ? "⚠️" : "✅"}</span>
              <div style={{ fontSize:14, fontWeight:700, color:text }}>Needs Your Attention</div>
              {draftArts.length > 0 && (
                <span style={{ fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:10, background:"#FEF3C7", color:"#92400E" }}>{draftArts.length}</span>
              )}
            </div>
            <div style={{ fontSize:12, color:muted, marginBottom:16 }}>
              {draftArts.length === 0 ? "All articles are published or scheduled. Great work!" : "These drafts are in Wix but not yet scheduled or published."}
            </div>

            {draftArts.length === 0 ? (
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🎉</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#22C55E" }}>Nothing pending!</div>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10, flex:1 }}>
                {visibleDrafts.map(a => (
                  <div key={a.id} style={{ border:"1px solid #FDE68A", borderRadius:10, padding:"12px 14px", background:dm?"#1c1a0a":"#FFFBEB" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:muted }}>{SHORT_MONTH_NAMES[a.month] || "—"} {a.day}{a.year ? `, ${a.year}` : ""}</div>
                      <Pill status={a.status} />
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:text, lineHeight:1.4, marginBottom:6 }}>{a.title}</div>
                    <div style={{ fontSize:11, color:muted, marginBottom:10 }}>🎯 {a.kw}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      <a href={prop.wixDrafts || prop.wixDash} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 11px", background:prop.color, color:"#fff", borderRadius:7, textDecoration:"none", fontSize:11, fontWeight:800 }}>
                        Open in Wix
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                      <button onClick={() => onStartWorkflow("review", a)}
                        style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 11px", background:dm?"#1E293B":"#F3F4F6", color:dm?"#94A3B8":"#374151", borderRadius:7, border:"none", fontSize:11, fontWeight:800, cursor:"pointer" }}>
                        ✅ Review Checklist
                      </button>
                    </div>
                  </div>
                ))}
                {draftArts.length > 4 && (
                  <button onClick={() => setShowAllDrafts(s => !s)}
                    style={{ padding:"8px", background:"none", border:`1px solid #FDE68A`, borderRadius:8, fontSize:12, fontWeight:700, color:"#92400E", cursor:"pointer" }}>
                    {showAllDrafts ? "Show Less" : "See More →"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Monthly Goal Progress for this property — THIS MONTH ONLY */}
          <div style={{ background:card, border:`1px solid ${border}`, borderRadius:14, padding:"16px 18px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
              Monthly Goal — {prop.short}
            </div>
            {(() => {
              const thisMonthArts = arts.filter(a =>
                (a.status === "published" || a.status === "scheduled") &&
                a.month === curMonth && a.year === curYear
              );
              const done = thisMonthArts.length;
              const goal = goals[prop.id] || 4;
              const pct  = Math.min(100, Math.round((done/goal)*100));
              const over = done >= goal;
              return (
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                    <img src={LOGOS[prop.id]} alt={prop.short} style={{ width:24, height:24, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                    <span style={{ fontSize:13, fontWeight:700, color:text, flex:1 }}>Scheduled + Published</span>
                    <span style={{ fontSize:16, fontWeight:900, color: over ? (dm?"#4ADE80":"#22C55E") : (dm?prop.accent:prop.color) }}>{done}</span>
                    <span style={{ fontSize:12, color:muted }}>/ {goal}</span>
                  </div>
                  <div style={{ height:8, background:dm?"#1E293B":"#F3F4F6", borderRadius:4, overflow:"hidden", marginBottom:6 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background: over ? "#22C55E" : prop.accent, borderRadius:4, transition:"width 0.3s" }} />
                  </div>
                  {over
                    ? <div style={{ fontSize:11, color:dm?"#4ADE80":"#22C55E", fontWeight:700 }}>✓ Goal reached this month!</div>
                    : <div style={{ fontSize:11, color:muted }}>{goal - done} more to hit your monthly goal</div>
                  }
                  <div style={{ fontSize:10, color:dm?"#475569":"#D1D5DB", marginTop:6 }}>Update your goals in Account → Monthly Goals</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

    </div>
  );
}
