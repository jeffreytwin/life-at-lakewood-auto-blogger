import { useState, useEffect, useRef, useCallback } from "react";
import useMobile from "../../hooks/useMobile";
import { KEYWORD_SUGGESTIONS } from "../../data/mock-keywords";
import { fetchGSCKeywords, fetchSemrushOverview, fetchSemrushIdeas, fetchKeywordIdeas } from "../../services/api";

// How strongly each intent type advances the business goal (selling homes).
const INTENT_PTS = { Transactional: 20, Commercial: 14, Informational: 6, Navigational: 2 };

// Opportunity score 0-100: how much a new article on this keyword is worth.
//   volume (log-scaled, up to 40) + ease (100-difficulty, up to 25)
//   + intent value (up to 20) + ranking position bonus:
//     already top 3 → -10 (little upside), position 4-20 → +15 ("striking
//     distance" — page 1 is reachable), deeper → +8, not ranking → +5.
function opportunityScore(k) {
  const vol = k.vol != null ? k.vol : (k.impressions ? Math.round(k.impressions / 3) : null);
  if (vol == null && k.position == null) return null;
  const volPts = Math.min(40, Math.log10((vol || 0) + 1) * 13);
  const easePts = Math.max(0, 100 - (k.diff != null ? k.diff : 50)) * 0.25;
  const intentPts = INTENT_PTS[k.intent] ?? 6;
  let posPts = 5;
  if (k.position != null) posPts = k.position <= 3 ? -10 : k.position <= 20 ? 15 : 8;
  return Math.max(0, Math.min(100, Math.round(volPts + easePts + intentPts + posPts)));
}

const SEMRUSH_CACHE_TTL = 24 * 60 * 60 * 1000;

function readSemrushCache(propId) {
  try {
    const raw = localStorage.getItem(`lal_semrush_${propId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > SEMRUSH_CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function writeSemrushCache(propId, data) {
  try {
    const prev = readSemrushCache(propId);
    const merged = { ...(prev?.data || {}), ...data };
    localStorage.setItem(`lal_semrush_${propId}`, JSON.stringify({ ts: Date.now(), data: merged }));
  } catch {}
}

function applySemrushData(list, srMap) {
  return list.map((k) => {
    const sr = srMap[k.kw.toLowerCase()];
    if (!sr) return k;
    return {
      ...k,
      vol: sr.vol != null ? sr.vol : k.vol,
      diff: sr.diff != null ? sr.diff : k.diff,
      cpc: sr.cpc != null ? sr.cpc : k.cpc,
      intent: sr.intent || k.intent,
      sources: [...new Set([...(k.sources || []), "semrush"])],
    };
  });
}

const SOURCE_BADGE = {
  gsc:     { label: "GSC",     bg: "#DBEAFE", tx: "#1D4ED8", title: "Ranking data from Google Search Console" },
  semrush: { label: "SEMrush", bg: "#FFEDD5", tx: "#C2410C", title: "Volume, difficulty & CPC from SEMrush" },
  ai:      { label: "AI",      bg: "#F3E8FF", tx: "#7E22CE", title: "Suggested by Claude — metrics from SEMrush when available" },
  est:     { label: "Est.",    bg: "#F3F4F6", tx: "#6B7280", title: "Sample data — connect GSC or SEMrush for real numbers" },
};

export default function StepKeywords({ prop, onNext, businessGoals = "" }) {
  const mob = useMobile();
  const [scanning, setScanning]     = useState(true);
  const [progress, setProgress]     = useState(0);
  const [selected, setSelected]     = useState(new Set());
  const [keywords, setKeywords]     = useState([]);
  const [seedInput, setSeedInput]   = useState("");
  const [ideaSource, setIdeaSource] = useState("semrush_related");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError]   = useState("");
  const [seedFocused, setSeedFocused] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);
  const [semrush, setSemrush]       = useState({ configured: null, syncing: false, error: "", lastSync: null });
  const fetchedRef = useRef(false);
  const keywordsRef = useRef([]);
  keywordsRef.current = keywords;

  // Sort & filter state
  const [sortBy, setSortBy] = useState("opp");
  const [sortDir, setSortDir] = useState("desc");
  const [intentFilter, setIntentFilter] = useState("all");
  const [kwSearch, setKwSearch] = useState("");

  // Enrich the given keywords with real SEMrush volume/difficulty/CPC.
  const enrichWithSemrush = useCallback(async (kwList, { force = false } = {}) => {
    const cache = force ? null : readSemrushCache(prop.id);
    const cachedMap = cache?.data || {};
    const missing = kwList.filter((k) => !cachedMap[k.kw.toLowerCase()]).map((k) => k.kw);

    if (Object.keys(cachedMap).length) {
      setKeywords((prev) => applySemrushData(prev, cachedMap));
      setSemrush((s) => ({ ...s, configured: true, lastSync: cache?.ts || s.lastSync }));
    }
    if (!missing.length && !force) return;

    setSemrush((s) => ({ ...s, syncing: true, error: "" }));
    try {
      const toFetch = force ? kwList.map((k) => k.kw) : missing;
      const data = await fetchSemrushOverview(toFetch);
      if (data.configured === false) {
        setSemrush({ configured: false, syncing: false, error: "", lastSync: null });
        return;
      }
      const srMap = {};
      (data.keywords || []).forEach((r) => { srMap[r.kw.toLowerCase()] = r; });
      // Keywords SEMrush has no data for: mark as looked-up so we don't refetch
      toFetch.forEach((kw) => { if (!srMap[kw.toLowerCase()]) srMap[kw.toLowerCase()] = {}; });
      writeSemrushCache(prop.id, srMap);
      setKeywords((prev) => applySemrushData(prev, srMap));
      setSemrush({ configured: true, syncing: false, error: "", lastSync: Date.now() });
    } catch (e) {
      setSemrush((s) => ({ ...s, syncing: false, error: e.message }));
    }
  }, [prop.id]);

  // Initial load: GSC ranking data, then SEMrush enrichment.
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      let list = [];
      let gscOk = false;
      try {
        const data = await fetchGSCKeywords(prop.id);
        if (data.connected) { setGscConnected(true); gscOk = true; }
        if (data.keywords?.length) {
          list = data.keywords.map((k) => ({
            ...k,
            vol: null, // GSC "vol" was an impressions guess — real volume comes from SEMrush
            diff: null,
            sources: ["gsc"],
          }));
        }
      } catch { /* GSC optional — shown as not connected */ }

      // Demo fallback only when no real source is available
      if (!list.length) {
        list = (KEYWORD_SUGGESTIONS[prop.id] || []).slice(0, 30).map((k) => ({ ...k, sources: ["est"] }));
      }
      setKeywords(list);
      if (gscOk || list.some((k) => k.sources.includes("gsc"))) {
        enrichWithSemrush(list);
      } else {
        // Still find out whether SEMrush is configured (cheap call with 1 seed)
        enrichWithSemrush(list.slice(0, 30));
      }
    })();
  }, [prop.id, enrichWithSemrush]);

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

  const addKeywords = (incoming) => {
    setKeywords((prev) => {
      const seen = new Set(prev.map((k) => k.kw.toLowerCase()));
      const fresh = incoming.filter((k) => k.kw && !seen.has(k.kw.toLowerCase()));
      return [...prev, ...fresh];
    });
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setLoadError("");
    const seed = seedInput.trim() || `${prop.short} homes`;
    try {
      if (ideaSource === "ai") {
        const seeds = seedInput.trim()
          ? seedInput.split(",").map(s => s.trim()).filter(Boolean)
          : [`${prop.short} real estate`, `${prop.short} homes`, `${prop.short} living`];
        const ideas = await fetchKeywordIdeas({
          location: prop.short,
          seeds,
          existing: keywordsRef.current.map(k => k.kw),
          count: 8,
          businessGoals,
        });
        const rows = ideas.map((k) => ({ ...k, sources: ["ai"] }));
        addKeywords(rows);
        // Validate AI ideas with real SEMrush numbers
        if (semrush.configured) enrichWithSemrush(rows);
      } else {
        const action = ideaSource === "semrush_questions" ? "questions" : "related";
        const data = await fetchSemrushIdeas(seed, action, 20);
        if (data.configured === false) {
          throw new Error(data.message || "SEMrush is not configured");
        }
        if (!data.keywords?.length) {
          throw new Error(`SEMrush found no ${action === "questions" ? "question" : "related"} keywords for "${seed}" — try a broader seed phrase.`);
        }
        addKeywords(data.keywords.map((k) => ({ ...k, sources: ["semrush"] })));
      }
    } catch (e) {
      setLoadError(e.message);
    }
    setLoadingMore(false);
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir(col === "kw" ? "asc" : "desc"); }
  };

  const scored = keywords.map((k) => ({ ...k, opp: opportunityScore(k) }));

  const filtered = scored.filter(k => {
    if (intentFilter !== "all" && k.intent !== intentFilter) return false;
    if (kwSearch.trim() && !k.kw.toLowerCase().includes(kwSearch.toLowerCase())) return false;
    return true;
  });

  const cmp = (a, b, key) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;  // nulls always sort last
    if (bv == null) return -1;
    return av - bv;
  };

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortBy === "kw") return dir * a.kw.localeCompare(b.kw);
    if (sortBy === "vol") { const c = cmp(a, b, "vol"); return c === 0 ? 0 : (a.vol == null || b.vol == null) ? c : dir * c; }
    if (sortBy === "diff") { const c = cmp(a, b, "diff"); return c === 0 ? 0 : (a.diff == null || b.diff == null) ? c : dir * c; }
    if (sortBy === "pos") { const c = cmp(a, b, "position"); return c === 0 ? 0 : (a.position == null || b.position == null) ? c : dir * c; }
    if (sortBy === "opp") { const c = cmp(a, b, "opp"); return c === 0 ? 0 : (a.opp == null || b.opp == null) ? c : dir * c; }
    return 0;
  });

  const selectAllFiltered = () => setSelected(new Set([...selected, ...sorted.map(k=>k.kw)]));
  const clearAll = () => setSelected(new Set());
  const allFilteredSelected = sorted.length > 0 && sorted.every(k => selected.has(k.kw));

  const handleNext = () => {
    const byKw = new Map(scored.map((k) => [k.kw, k]));
    const chosen = Array.from(selected).map((kw) => {
      const k = byKw.get(kw) || { kw };
      return { kw: k.kw, vol: k.vol ?? null, diff: k.diff ?? null, cpc: k.cpc ?? null, intent: k.intent || null, position: k.position ?? null, opp: k.opp ?? null, sources: k.sources || [] };
    });
    onNext(chosen);
  };

  const intentColor = { Commercial:{ bg:"#DBEAFE",tx:"#1E40AF" }, Transactional:{ bg:"#FEF3C7",tx:"#92400E" }, Informational:{ bg:"#F3F4F6",tx:"#374151" }, Navigational:{ bg:"#E0E7FF",tx:"#3730A3" } };
  const sortArrow = (col) => sortBy === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";
  const oppColor = (v) => v == null ? "#9CA3AF" : v >= 60 ? "#16A34A" : v >= 40 ? "#F59E0B" : "#9CA3AF";

  const syncAge = semrush.lastSync ? Math.round((Date.now() - semrush.lastSync) / 3600000) : null;

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 6px" }}>
          Keyword Opportunities
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#6B7280", margin:"0 0 8px" }}>
          Live ranking data from Google Search Console + real volume &amp; difficulty from SEMrush for <strong>{prop.short}</strong>. Sorted by <strong>Opportunity</strong> — how much a new article is worth to your business goals.
        </p>
        {!scanning && (
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6, background:gscConnected?"#DCFCE7":"#FEF3C7", color:gscConnected?"#16A34A":"#92400E" }}>
              {gscConnected ? "GSC Connected" : "GSC: Not connected"}
            </span>
            <span
              title={semrush.configured === false ? "Add SEMRUSH_API_KEY in Vercel environment variables" : semrush.error || ""}
              style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6,
                background: semrush.configured ? "#FFEDD5" : semrush.configured === false ? "#FEF3C7" : "#F3F4F6",
                color: semrush.configured ? "#C2410C" : semrush.configured === false ? "#92400E" : "#6B7280" }}>
              {semrush.syncing ? "SEMrush: syncing…"
                : semrush.configured ? `SEMrush ✓${syncAge != null ? (syncAge < 1 ? " (just synced)" : ` (synced ${syncAge}h ago)`) : ""}`
                : semrush.configured === false ? "SEMrush: not configured"
                : "SEMrush: checking…"}
            </span>
            {semrush.configured && !semrush.syncing && (
              <button onClick={() => enrichWithSemrush(keywordsRef.current, { force: true })}
                style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:6, background:"none", border:"1px solid #E5E7EB", color:"#6B7280", cursor:"pointer" }}>
                ↻ Refresh metrics
              </button>
            )}
            {semrush.error && (
              <span style={{ fontSize:10, fontWeight:600, color:"#DC2626" }}>⚠ {semrush.error}</span>
            )}
          </div>
        )}
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
          <div style={{ fontSize:12, color:"#9CA3AF" }}>Pulling GSC rankings · Fetching SEMrush metrics · Scoring opportunities…</div>
        </div>
      ) : (
        <div style={{ position:"relative" }}>
          {/* Find keywords panel */}
          <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"14px 20px", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", marginBottom:8 }}>
              💡 Find more keywords — enter a topic to explore, or leave blank to use the property name:
            </div>
            <div style={{ display:"flex", gap:8, flexWrap: mob ? "wrap" : "nowrap" }}>
              <div style={{ flex:1, minWidth:180, borderRadius:8, overflow:"hidden", border:`1.5px solid ${seedFocused?prop.accent:"#E5E7EB"}`, background:"#fff", display:"flex", transition:"border-color 0.15s" }}>
                <input
                  value={seedInput}
                  onChange={e=>setSeedInput(e.target.value)}
                  onFocus={()=>setSeedFocused(true)}
                  onBlur={()=>setSeedFocused(false)}
                  onKeyDown={e=>e.key==="Enter" && handleLoadMore()}
                  placeholder={`e.g. "new construction ${prop.short}" or "55 plus communities"`}
                  style={{ flex:1, padding:"8px 12px", border:"none", outline:"none", fontSize:12, background:"transparent", color:"#111827" }}
                />
              </div>
              <select value={ideaSource} onChange={e=>setIdeaSource(e.target.value)}
                style={{ padding:"8px 10px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:12, fontWeight:700, color:"#374151", background:"#fff", cursor:"pointer", outline:"none" }}>
                <option value="semrush_related">SEMrush: Related</option>
                <option value="semrush_questions">SEMrush: Questions</option>
                <option value="ai">Claude: Brainstorm</option>
              </select>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:loadingMore?"#F3F4F6":prop.color, color:loadingMore?"#9CA3AF":"#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:800, cursor:loadingMore?"not-allowed":"pointer", flexShrink:0, transition:"all 0.15s" }}
              >
                {loadingMore
                  ? <><div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid #D1D5DB", borderTopColor:"transparent", animation:"spin 0.7s linear infinite" }} /> Finding…</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Find Keywords</>
                }
              </button>
            </div>
            {loadError && (
              <div style={{ marginTop:10, padding:"8px 12px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, fontSize:11.5, color:"#B91C1C", fontWeight:600 }}>
                ⚠ {loadError}
              </div>
            )}
          </div>

          {/* Filter bar */}
          <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
            <div style={{ flex:1, minWidth:160, maxWidth:300, borderRadius:8, overflow:"hidden", border:"1.5px solid #E5E7EB", background:"#fff", display:"flex" }}>
              <svg style={{ margin:"8px 0 8px 10px", flexShrink:0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                value={kwSearch}
                onChange={e=>setKwSearch(e.target.value)}
                placeholder="Filter keywords…"
                style={{ flex:1, padding:"8px 10px", border:"none", outline:"none", fontSize:12, background:"transparent", color:"#111827" }}
              />
            </div>
            <select value={intentFilter} onChange={e=>setIntentFilter(e.target.value)}
              style={{ padding:"8px 12px", border:"1.5px solid #E5E7EB", borderRadius:8, fontSize:12, fontWeight:700, color:"#374151", background:"#fff", cursor:"pointer", outline:"none" }}>
              <option value="all">All Intents</option>
              <option value="Informational">Informational</option>
              <option value="Commercial">Commercial</option>
              <option value="Transactional">Transactional</option>
              <option value="Navigational">Navigational</option>
            </select>
            <div style={{ fontSize:11, color:"#9CA3AF", fontWeight:600 }}>
              {sorted.length} keyword{sorted.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Keyword table */}
          <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, marginBottom: mob ? 80 : 12, overflowX:"auto" }}>
            <div style={{ minWidth: 780 }}>
            <div style={{ display:"grid", gridTemplateColumns:"36px 2.2fr 0.9fr 1fr 0.7fr 0.9fr 1fr", padding:"10px 20px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB", fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", textTransform:"uppercase", alignItems:"center", borderRadius:"14px 14px 0 0" }}>
              <div>
                <input type="checkbox" checked={allFilteredSelected && sorted.length > 0} onChange={e=>e.target.checked?selectAllFiltered():clearAll()}
                  style={{ cursor:"pointer", accentColor:prop.color, width:14, height:14 }} />
              </div>
              <div onClick={()=>handleSort("kw")} style={{ cursor:"pointer" }}>Keyword{sortArrow("kw")}</div>
              <div onClick={()=>handleSort("vol")} style={{ cursor:"pointer" }} title="Monthly searches (SEMrush)">Volume{sortArrow("vol")}</div>
              <div onClick={()=>handleSort("diff")} style={{ cursor:"pointer" }} title="Keyword difficulty 0-100 (SEMrush)">Difficulty{sortArrow("diff")}</div>
              <div onClick={()=>handleSort("pos")} style={{ cursor:"pointer" }} title="Your current Google position (GSC)">Pos.{sortArrow("pos")}</div>
              <div onClick={()=>handleSort("opp")} style={{ cursor:"pointer" }} title="Opportunity: volume + ease + intent + striking-distance bonus">Opportunity{sortArrow("opp")}</div>
              <div>Intent</div>
            </div>
            {sorted.map((k,i) => {
              const ic = intentColor[k.intent]||intentColor.Informational;
              const diffColor = k.diff == null ? "#9CA3AF" : k.diff < 30 ? "#22C55E" : k.diff < 60 ? "#F59E0B" : "#EF4444";
              const isSel = selected.has(k.kw);
              return (
                <div key={k.kw} onClick={()=>toggle(k.kw)} style={{ display:"grid", gridTemplateColumns:"36px 2.2fr 0.9fr 1fr 0.7fr 0.9fr 1fr", padding:"12px 20px", alignItems:"center", borderBottom:i<sorted.length-1?"1px solid #F9FAFB":"none", background:isSel?prop.light+"80":"transparent", cursor:"pointer", transition:"background 0.12s" }}
                  onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background="#F9FAFB"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=isSel?prop.light+"80":"transparent"; }}
                >
                  <div>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${isSel?prop.color:"#D1D5DB"}`, background:isSel?prop.color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", paddingRight:8 }}>
                    <span style={{ fontSize:13, fontWeight:isSel?700:600, color:"#111827" }} title={k.rationale || ""}>{k.kw}</span>
                    {(k.sources||[]).map(s => SOURCE_BADGE[s] && (
                      <span key={s} title={SOURCE_BADGE[s].title} style={{ fontSize:8.5, fontWeight:800, padding:"1px 5px", borderRadius:4, background:SOURCE_BADGE[s].bg, color:SOURCE_BADGE[s].tx, letterSpacing:"0.03em" }}>{SOURCE_BADGE[s].label}</span>
                    ))}
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:k.vol==null?"#D1D5DB":"#111827", fontFamily:"monospace" }} title={k.cpc != null ? `CPC $${k.cpc.toFixed(2)}` : ""}>
                    {k.vol == null ? "—" : k.vol.toLocaleString()}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    {k.diff == null ? <span style={{ fontSize:12, color:"#D1D5DB", fontWeight:700 }}>—</span> : <>
                      <div style={{ width:52, height:5, background:"#E5E7EB", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${k.diff}%`, height:"100%", background:diffColor, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:diffColor }}>{k.diff}</span>
                    </>}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:k.position==null?"#D1D5DB":k.position<=10?"#16A34A":k.position<=20?"#F59E0B":"#6B7280" }} title={k.clicks != null ? `${k.clicks} clicks / ${k.impressions} impressions in the last 90 days` : ""}>
                    {k.position == null ? "—" : `#${Math.round(k.position)}`}
                  </div>
                  <div>
                    {k.opp == null
                      ? <span style={{ fontSize:12, color:"#D1D5DB", fontWeight:700 }}>—</span>
                      : <span style={{ fontSize:12, fontWeight:800, color:oppColor(k.opp), background:k.opp>=60?"#F0FDF4":k.opp>=40?"#FFFBEB":"#F9FAFB", padding:"2px 9px", borderRadius:12 }}
                          title="Opportunity = volume + ease (100-difficulty) + intent value + striking-distance bonus (ranking #4-20)">
                          {k.opp}
                        </span>
                    }
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:ic.bg, color:ic.tx, display:"inline-block", justifySelf:"start" }}>{k.intent || "—"}</span>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <div style={{ padding:"24px", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
                No keywords match your filters
              </div>
            )}
            </div>
          </div>

          {/* Floating action bar */}
          <div style={{
            position: mob ? "fixed" : "sticky",
            bottom: 0,
            left: mob ? 0 : "auto",
            right: mob ? 0 : "auto",
            background:"#fff",
            borderTop:"1px solid #E5E7EB",
            padding: mob ? "12px 16px" : "12px 20px",
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center",
            zIndex:100,
            ...(mob ? { boxShadow:"0 -4px 16px rgba(0,0,0,0.1)" } : {}),
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {selected.size > 0 && (
                <span style={{ fontSize:12, fontWeight:700, color:prop.accent }}>{selected.size} keyword{selected.size>1?"s":""} selected</span>
              )}
            </div>
            <button onClick={handleNext} disabled={selected.size===0}
              style={{ padding:"11px 28px", background:selected.size>0?prop.color:"#E5E7EB", color:selected.size>0?"#fff":"#9CA3AF", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:selected.size>0?"pointer":"not-allowed" }}>
              {selected.size>0 ? `Generate Articles for ${selected.size} Keyword${selected.size>1?"s":""}` : "Select Keywords to Continue"} →
            </button>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
