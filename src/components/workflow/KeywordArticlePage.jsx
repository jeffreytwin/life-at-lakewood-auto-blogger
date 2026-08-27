import { useState } from "react";
import SuggestionCard from "./SuggestionCard";
import { fetchSuggestionsForKeyword } from "../../services/api";

export default function KeywordArticlePage({ keyword, location, prop, kwIndex, totalKws, businessGoals = "", publishedTitles = [], onConfirm, onBack, onSkip, existingChoice }) {
  const BATCH = 4;
  // keyword is an object: { kw, vol, diff, cpc, intent, position, opp, sources }
  const kwObj = typeof keyword === "string" ? { kw: keyword } : keyword;

  const [suggestions, setSuggestions]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [generated, setGenerated]       = useState(false);
  const [loadErr, setLoadErr]           = useState("");
  const [selected, setSelected]         = useState(existingChoice || null);
  const [shownTitles, setShownTitles]   = useState([]);
  const [extraKw, setExtraKw]           = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [additionalKws, setAdditionalKws] = useState([]);
  const allKws = [kwObj.kw, ...additionalKws];

  const loadSuggestions = async (existing = [], append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setLoadErr("");
    try {
      const combinedKw = allKws.join(" + ");
      const batch = await fetchSuggestionsForKeyword({
        keyword: combinedKw,
        kwData: additionalKws.length === 0 ? kwObj : null,
        location,
        propertyUrl: prop.url,
        count: BATCH,
        existingTitles: existing,
        publishedTitles,
        businessGoals,
      });
      setSuggestions(prev => append ? [...prev, ...batch] : batch);
      setShownTitles(prev => [...prev, ...batch.map(s => s.title)]);
      if (!append) setGenerated(true);
    } catch (e) {
      setLoadErr(e.message);
    }
    if (append) setLoadingMore(false); else setLoading(false);
  };

  const handleAddKw = () => {
    const kw = extraKw.trim();
    if (kw && !allKws.includes(kw)) {
      setAdditionalKws(prev => [...prev, kw]);
      setExtraKw("");
      setSuggestions([]);
      setGenerated(false);
      setSelected(null);
      setShownTitles([]);
    }
  };

  const removeAdditionalKw = (kw) => {
    setAdditionalKws(prev => prev.filter(k => k !== kw));
    setSuggestions([]);
    setGenerated(false);
    setSelected(null);
    setShownTitles([]);
  };

  const isLast = kwIndex === totalKws - 1;
  const canConfirm = !!selected;

  const statChips = [
    kwObj.vol != null && { label: `${kwObj.vol.toLocaleString()}/mo searches`, title: "Monthly search volume (SEMrush)" },
    kwObj.diff != null && { label: `Difficulty ${kwObj.diff}`, title: "Keyword difficulty 0-100 (SEMrush)" },
    kwObj.position != null && { label: `You rank #${Math.round(kwObj.position)}`, title: "Current Google position (GSC)" },
    kwObj.intent && { label: kwObj.intent, title: "Search intent" },
  ].filter(Boolean);

  return (
    <div>
      {/* Keyword header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Array.from({ length: totalKws }).map((_, i) => (
              <div key={i} style={{ width: i === kwIndex ? 22 : 8, height: 8, borderRadius: 4, background: i < kwIndex ? prop.accent : i === kwIndex ? prop.color : "#E5E7EB", transition: "all 0.3s" }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600 }}>Keyword {kwIndex + 1} of {totalKws}</span>
        </div>

        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize: 16, color: prop.accent, margin: "0 0 10px" }}>
          Pick an Article
        </h2>

        {/* Keywords for this slot */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: prop.color, background: prop.light, padding: "5px 14px", borderRadius: 20 }}>
            🎯 {kwObj.kw}
          </span>
          {additionalKws.map(kw => (
            <span key={kw} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize: 12, fontWeight: 700, color: prop.color, background: prop.light+"CC", padding: "4px 10px 4px 14px", borderRadius: 20 }}>
              + {kw}
              <button onClick={() => removeAdditionalKw(kw)} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", opacity:0.6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={prop.color} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </span>
          ))}
        </div>

        {/* Real keyword stats */}
        {statChips.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {statChips.map((c) => (
              <span key={c.label} title={c.title} style={{ fontSize:10.5, fontWeight:700, color:"#374151", background:"#F3F4F6", padding:"3px 10px", borderRadius:12 }}>
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Add another keyword */}
        <div style={{ background:"#F9FAFB", borderRadius:10, padding:"12px 14px", marginBottom: generated ? 20 : 0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", marginBottom:8 }}>
            Optional: Target multiple keywords in one article — add more keywords to combine them:
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, borderRadius:8, overflow:"hidden", border:`1.5px solid ${inputFocused?prop.accent:"#E5E7EB"}`, background:"#fff", display:"flex", transition:"border-color 0.15s", maxWidth:400 }}>
              <input
                value={extraKw}
                onChange={e => setExtraKw(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={e => e.key === "Enter" && handleAddKw()}
                placeholder="e.g. best schools, family neighborhoods…"
                style={{ flex: 1, padding: "8px 12px", border: "none", outline: "none", fontSize: 12, background: "transparent", color: "#111827" }}
              />
            </div>
            <button onClick={handleAddKw} disabled={!extraKw.trim()}
              style={{ padding: "8px 16px", background: extraKw.trim() ? prop.color : "#F3F4F6", color: extraKw.trim() ? "#fff" : "#9CA3AF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: extraKw.trim() ? "pointer" : "default", transition: "all 0.15s" }}>
              + Add Keyword
            </button>
          </div>
          {additionalKws.length > 0 && (
            <div style={{ fontSize:11, color:prop.accent, marginTop:8, fontWeight:600 }}>
              ✓ Article ideas will target all {allKws.length} keywords together.
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {loadErr && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"12px 16px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12, marginBottom:16 }}>
          <div style={{ fontSize:12, color:"#B91C1C", fontWeight:600 }}>⚠ Could not load suggestions: {loadErr}</div>
          <button onClick={() => loadSuggestions(shownTitles, generated)} style={{ padding:"7px 14px", background:"#B91C1C", color:"#fff", border:"none", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
            Try Again
          </button>
        </div>
      )}

      {/* Not yet generated */}
      {!generated && !loading && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"32px 24px", background:"#fff", border:"1.5px dashed #E5E7EB", borderRadius:14, marginBottom:20, textAlign:"center" }}>
          <div style={{ fontSize:32 }}>✨</div>
          <div>
            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#111827", marginBottom:6 }}>
              Ready to generate article ideas for{allKws.length > 1 ? ` ${allKws.length} keywords` : ` "${kwObj.kw}"`}?
            </div>
            <div style={{ fontSize:12, color:"#9CA3AF" }}>
              Claude will suggest {BATCH} angles based on your business goals{publishedTitles.length ? `, ${publishedTitles.length} published articles,` : ""} and real keyword data.
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => loadSuggestions([])}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 24px", background:prop.color, color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Generate Ideas
            </button>
            <button onClick={onSkip}
              style={{ padding:"11px 20px", background:"#F3F4F6", color:"#6B7280", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Skip This Keyword →
            </button>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {[...Array(BATCH)].map((_, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "22px 20px", display: "flex", alignItems: "center", gap: 12, opacity: 1 - i * 0.18 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${prop.accent}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: "#F3F4F6", borderRadius: 4, width: `${70 + i * 7}%`, marginBottom: 8 }} />
                <div style={{ height: 10, background: "#F9FAFB", borderRadius: 4, width: "50%" }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginTop: 4 }}>
            Claude is weighing angles against your business goals for {allKws.length > 1 ? `"${allKws[0]}" + ${allKws.length-1} more` : `"${kwObj.kw}"`}…
          </div>
        </div>
      )}

      {/* Suggestion cards */}
      {generated && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {suggestions.map(s => (
            <SuggestionCard key={s.id} s={s} isSelected={selected?.id === s.id} onSelect={() => setSelected(selected?.id === s.id ? null : s)} prop={prop} />
          ))}
          <button onClick={() => loadSuggestions(shownTitles, true)} disabled={loadingMore}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: "#fff", border: `1.5px dashed ${loadingMore ? "#E5E7EB" : prop.accent}`, borderRadius: 14, cursor: loadingMore ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: loadingMore ? "#9CA3AF" : prop.color, transition: "all 0.15s" }}>
            {loadingMore
              ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${prop.accent}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />Generating {BATCH} more ideas…</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Load {BATCH} More Ideas</>
            }
          </button>
        </div>
      )}

      {/* Footer nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#6B7280", cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {kwIndex === 0 ? "Back to Keywords" : "← Previous Keyword"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!generated && (
            <button onClick={onSkip} style={{ padding: "10px 18px", background: "transparent", color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Skip →
            </button>
          )}
          {generated && (
            <>
              {selected && <span style={{ fontSize: 12, color: prop.accent, fontWeight: 700 }}>✓ "{selected.title.slice(0, 38)}{selected.title.length > 38 ? "…" : ""}"</span>}
              <button onClick={() => onConfirm(selected, kwObj)} disabled={!canConfirm}
                style={{ padding: "11px 28px", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, background: canConfirm ? prop.color : "#E5E7EB", color: canConfirm ? "#fff" : "#9CA3AF", cursor: canConfirm ? "pointer" : "not-allowed" }}>
                {isLast ? "Confirm & Write Articles →" : "Next Keyword →"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
