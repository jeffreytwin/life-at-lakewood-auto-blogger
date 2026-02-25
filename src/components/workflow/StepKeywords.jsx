import { useState, useEffect } from "react";
import useMobile from "../../hooks/useMobile";
import { KEYWORD_SUGGESTIONS } from "../../data/mock-keywords";

async function fetchMoreKeywords(location, seedKeywords, existingKws) {
  const prompt = `You are an SEO strategist for a real estate team in ${location}, Florida.
The user wants more keyword ideas based on these seed topics: ${seedKeywords.join(", ")}
Do NOT repeat any of these already-shown keywords: ${existingKws.join("; ")}

Generate exactly 6 new keyword ideas that a home buyer or relocating person might search.
Vary the intent: mix informational, commercial, and comparison queries.

Respond ONLY with a JSON array (no markdown, no backticks):
[
  { "kw": "keyword phrase", "vol": 1200, "diff": 28, "intent": "Informational" }
]
Use realistic estimated volume (500–3000) and difficulty (15–45). Intent must be one of: Informational, Commercial, Transactional.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export default function StepKeywords({ prop, onNext }) {
  const mob = useMobile();
  const [scanning, setScanning]     = useState(true);
  const [progress, setProgress]     = useState(0);
  const [selected, setSelected]     = useState(new Set());
  const [keywords, setKeywords]     = useState(KEYWORD_SUGGESTIONS[prop.id]);
  const [seedInput, setSeedInput]   = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [seedFocused, setSeedFocused] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setScanning(false); return 100; }
        return p + 4;
      });
    }, 60);
    return () => clearInterval(t);
  }, []);

  const toggle = (kw) => {
    const n = new Set(selected);
    n.has(kw) ? n.delete(kw) : n.add(kw);
    setSelected(n);
  };
  const selectAll = () => setSelected(new Set(keywords.map(k=>k.kw)));
  const clearAll  = () => setSelected(new Set());

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const seeds = seedInput.trim()
      ? seedInput.split(",").map(s => s.trim()).filter(Boolean)
      : [prop.short + " real estate", prop.short + " homes", prop.short + " living"];
    try {
      const more = await fetchMoreKeywords(prop.short, seeds, keywords.map(k => k.kw));
      setKeywords(prev => [...prev, ...more]);
    } catch(e) { /* silent fail */ }
    setLoadingMore(false);
  };

  const intentColor = { Commercial:{ bg:"#DBEAFE",tx:"#1E40AF" }, Transactional:{ bg:"#FEF3C7",tx:"#92400E" }, Informational:{ bg:"#F3F4F6",tx:"#374151" } };

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 6px" }}>
          Keyword Opportunities
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#6B7280", margin:0 }}>
          Scanning Google Search Console + competitor rankings for <strong>{prop.short}</strong> buyer queries. Select the keywords you want to target.
        </p>
      </div>

      {scanning ? (
        <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"40px 32px", textAlign:"center" }}>
          <div style={{ fontSize:32, marginBottom:16 }}>🔍</div>
          <div style={{ fontSize:15, fontWeight:700, color:"#111827", marginBottom:20 }}>Analyzing keyword landscape…</div>
          <div style={{ width:"100%", maxWidth:400, margin:"0 auto 12px" }}>
            <div style={{ height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
              <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg,${prop.color},${prop.accent})`, borderRadius:3, transition:"width 0.1s" }} />
            </div>
          </div>
          <div style={{ fontSize:12, color:"#9CA3AF" }}>Checking GSC data · Analyzing SERPs · Scoring difficulty…</div>
        </div>
      ) : (
        <>
          <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, overflow:"hidden", marginBottom:12, overflowX:"auto" }}>
            <div style={{ display:"grid", gridTemplateColumns:"36px 2fr 1fr 1fr 1fr", padding:"10px 20px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB", fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", textTransform:"uppercase", alignItems:"center" }}>
              <div>
                <input type="checkbox" checked={selected.size===keywords.length && keywords.length > 0} onChange={e=>e.target.checked?selectAll():clearAll()}
                  style={{ cursor:"pointer", accentColor:prop.color, width:14, height:14 }} />
              </div>
              <div>Keyword</div><div>Monthly Searches</div><div>Difficulty</div><div>Intent</div>
            </div>
            {keywords.map((k,i) => {
              const ic = intentColor[k.intent]||intentColor.Informational;
              const diffColor = k.diff < 25 ? "#22C55E" : k.diff < 35 ? "#F59E0B" : "#EF4444";
              const isSel = selected.has(k.kw);
              return (
                <div key={i} onClick={()=>toggle(k.kw)} style={{ display:"grid", gridTemplateColumns:"36px 2fr 1fr 1fr 1fr", padding:"12px 20px", alignItems:"center", borderBottom:i<keywords.length-1?"1px solid #F9FAFB":"none", background:isSel?prop.light+"80":"transparent", cursor:"pointer", transition:"background 0.12s" }}
                  onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="#F9FAFB"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=isSel?prop.light+"80":"transparent"; }}
                >
                  <div>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${isSel?prop.color:"#D1D5DB"}`, background:isSel?prop.color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:isSel?700:600, color:"#111827" }}>{k.kw}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#111827", fontFamily:"monospace" }}>{k.vol.toLocaleString()}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:60, height:5, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:`${k.diff}%`, height:"100%", background:diffColor, borderRadius:3 }} />
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:diffColor }}>{k.diff}</span>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:ic.bg, color:ic.tx, display:"inline-block" }}>{k.intent}</span>
                </div>
              );
            })}

            {/* Load more row */}
            <div style={{ padding:"14px 20px", borderTop:"1px solid #F3F4F6", background:"#FAFAFA" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", marginBottom:8 }}>
                💡 Load more keyword ideas — enter topics or themes to explore (comma-separated), or leave blank to auto-generate:
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, borderRadius:8, overflow:"hidden", border:`1.5px solid ${seedFocused?prop.accent:"#E5E7EB"}`, background:"#fff", display:"flex", transition:"border-color 0.15s" }}>
                  <input
                    value={seedInput}
                    onChange={e=>setSeedInput(e.target.value)}
                    onFocus={()=>setSeedFocused(true)}
                    onBlur={()=>setSeedFocused(false)}
                    onKeyDown={e=>e.key==="Enter" && handleLoadMore()}
                    placeholder={`e.g. "new construction, retirement, schools, cost of living"`}
                    style={{ flex:1, padding:"8px 12px", border:"none", outline:"none", fontSize:12, background:"transparent", color:"#111827" }}
                  />
                </div>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:loadingMore?"#F3F4F6":prop.color, color:loadingMore?"#9CA3AF":"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:800, cursor:loadingMore?"not-allowed":"pointer", flexShrink:0, transition:"all 0.15s" }}
                >
                  {loadingMore
                    ? <><div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #D1D5DB", borderTopColor:"transparent", animation:"spin 0.7s linear infinite" }} /> Generating…</>
                    : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Load More Keywords</>
                  }
                </button>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {selected.size > 0 && (
                <span style={{ fontSize:12, fontWeight:700, color:prop.accent }}>{selected.size} keyword{selected.size>1?"s":""} selected</span>
              )}
            </div>
            <button onClick={()=>onNext(Array.from(selected))} disabled={selected.size===0}
              style={{ padding:"11px 28px", background:selected.size>0?prop.color:"#E5E7EB", color:selected.size>0?"#fff":"#9CA3AF", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:selected.size>0?"pointer":"not-allowed" }}>
              {selected.size>0 ? `Generate Articles for ${selected.size} Keyword${selected.size>1?"s":""}` : "Select Keywords to Continue"} →
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}
