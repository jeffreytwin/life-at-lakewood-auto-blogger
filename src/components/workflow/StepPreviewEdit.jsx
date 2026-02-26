import { useState } from "react";
import useMobile from "../../hooks/useMobile";

export default function StepPreviewEdit({ prop, articles, initialContents, onApprove, onBack }) {
  const mob = useMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [articleContents, setArticleContents] = useState(() => initialContents || []);
  const [revisionInput, setRevisionInput] = useState("");
  const [revising, setRevising] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState(() => articles.map(() => []));
  const [approvedSet, setApprovedSet] = useState(new Set());
  const [pushingToWix, setPushingToWix] = useState(false);

  const content = articleContents[activeIndex];
  const article = articles[activeIndex];

  const handleSectionEdit = (secIdx, field, value) => {
    setArticleContents(prev => {
      const updated = [...prev];
      const c = { ...updated[activeIndex] };
      const secs = [...c.sections];
      secs[secIdx] = { ...secs[secIdx], [field]: value };
      c.sections = secs;
      updated[activeIndex] = c;
      return updated;
    });
  };

  const handleMetaEdit = (field, value) => {
    setArticleContents(prev => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], [field]: value };
      return updated;
    });
  };

  const handleRequestRevision = async () => {
    if (!revisionInput.trim() || revising) return;
    setRevising(true);
    const newHistory = [...revisionHistory];
    newHistory[activeIndex] = [...(newHistory[activeIndex] || []), revisionInput.trim()];
    setRevisionHistory(newHistory);

    try {
      const res = await fetch("/api/claude/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleContent: articleContents[activeIndex],
          revisionRequest: revisionInput.trim(),
          property: prop.short,
        }),
      });
      if (res.ok) {
        const revised = await res.json();
        setArticleContents(prev => {
          const updated = [...prev];
          updated[activeIndex] = revised;
          return updated;
        });
      } else {
        throw new Error("Revision failed");
      }
    } catch (e) {
      // Fallback: append a note so user knows revision was requested
      setArticleContents(prev => {
        const updated = [...prev];
        const c = { ...updated[activeIndex] };
        const secs = [...c.sections];
        const lastSec = { ...secs[secs.length - 1] };
        lastSec.body = lastSec.body + `\n\n[Revision requested: "${revisionInput.trim()}" — API unavailable, please edit manually]`;
        secs[secs.length - 1] = lastSec;
        c.sections = secs;
        updated[activeIndex] = c;
        return updated;
      });
    }

    setRevisionInput("");
    setRevising(false);
  };

  const handleApproveArticle = () => {
    setApprovedSet(prev => new Set([...prev, activeIndex]));
  };

  const allApproved = approvedSet.size === articles.length;

  const handleSendToWix = async () => {
    setPushingToWix(true);
    try {
      // Push each article to Wix as a draft
      await Promise.all(
        articles.map((article, i) => {
          const content = articleContents[i];
          return fetch("/api/wix/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              propertyId: prop.id,
              title: article.title,
              sections: content.sections,
              seoTitle: content.seoTitle,
              metaDescription: content.metaDescription,
              slug: content.slug,
            }),
          });
        })
      );
    } catch (err) {
      console.warn("Wix push error (proceeding anyway):", err.message);
    }
    setPushingToWix(false);
    onApprove(articleContents);
  };

  if (pushingToWix) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:350, textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:prop.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:20, animation:"pulse 2s ease-in-out infinite" }}>🚀</div>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 8px" }}>
          Pushing to Wix Drafts…
        </h2>
        <p style={{ fontSize:13, color:"#6B7280" }}>Formatting and sending {articles.length} article{articles.length>1?"s":""} to your Wix blog draft queue.</p>
        <div style={{ width:200, height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden", marginTop:20 }}>
          <div style={{ width:"70%", height:"100%", background:`linear-gradient(90deg,${prop.color},${prop.accent})`, borderRadius:3, animation:"indeterminate 1.5s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes indeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} } @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 6px" }}>
          Preview & Edit
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#6B7280", margin:0 }}>
          Review each article before sending to Wix. Edit directly, or request AI-powered revisions.
        </p>
      </div>

      {/* Article tabs */}
      {articles.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
          {articles.map((a, i) => (
            <button key={i} onClick={() => setActiveIndex(i)}
              style={{
                padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: i === activeIndex ? prop.color : "#F3F4F6",
                color: i === activeIndex ? "#fff" : "#6B7280",
                position:"relative"
              }}>
              {approvedSet.has(i) && <span style={{ position:"absolute", top:-4, right:-4, fontSize:10, background:"#22C55E", color:"#fff", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✓</span>}
              Article {i+1}
            </button>
          ))}
        </div>
      )}

      {/* Article header */}
      <div style={{ background:"#fff", border:`1px solid ${approvedSet.has(activeIndex)?prop.accent:"#E5E7EB"}`, borderRadius:14, padding:"24px 26px", marginBottom:16 }}>
        <div style={{ display:"flex", flexDirection: mob ? "column" : "row", justifyContent:"space-between", alignItems: mob ? "stretch" : "flex-start", gap: mob ? 12 : 0, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#111827", marginBottom:6, lineHeight:1.3 }}>{article.title}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, color:prop.color, background:prop.light, padding:"2px 10px", borderRadius:20 }}>🎯 {article.kw}</span>
              <span style={{ fontSize:11, color:"#6B7280" }}>✍️ ~{(article.words||1200).toLocaleString()} words</span>
            </div>
          </div>
          {approvedSet.has(activeIndex)
            ? <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#22C55E", background:"#F0FDF4", padding:"6px 14px", borderRadius:8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Approved
              </div>
            : <button onClick={handleApproveArticle}
                style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#fff", background:"#22C55E", padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Approve Article
              </button>
          }
        </div>

        {/* SEO Meta */}
        <div style={{ background:"#F9FAFB", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>SEO Settings</div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>SEO Title</label>
            <input value={content.seoTitle} onChange={e => handleMetaEdit("seoTitle", e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:16, color:"#111827", outline:"none", background:"#fff" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
            <div style={{ fontSize:10, color:content.seoTitle.length > 60 ? "#EF4444" : "#9CA3AF", marginTop:3 }}>{content.seoTitle.length}/60 characters</div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>Meta Description</label>
            <textarea value={content.metaDescription} onChange={e => handleMetaEdit("metaDescription", e.target.value)}
              rows={2} style={{ width:"100%", padding:"8px 12px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:16, color:"#111827", outline:"none", resize:"vertical", background:"#fff", fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
            <div style={{ fontSize:10, color:content.metaDescription.length > 160 ? "#EF4444" : "#9CA3AF", marginTop:3 }}>{content.metaDescription.length}/160 characters</div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>URL Slug</label>
            <div style={{ display:"flex", alignItems:"center", gap:0, fontSize:12, color:"#9CA3AF", overflow:"hidden" }}>
              <span style={{ padding:"8px 8px 8px 12px", background:"#F3F4F6", border:"1px solid #E5E7EB", borderRight:"none", borderRadius:"8px 0 0 8px", whiteSpace:"nowrap", flexShrink:0, fontSize:11, maxWidth: mob ? 110 : "none", overflow:"hidden", textOverflow:"ellipsis" }}>{prop.blog}/</span>
              <input value={content.slug} onChange={e => handleMetaEdit("slug", e.target.value)}
                style={{ flex:1, minWidth:0, padding:"8px 10px", border:"1px solid #E5E7EB", borderRadius:"0 8px 8px 0", fontSize:16, color:"#111827", outline:"none", background:"#fff" }}
                onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
            </div>
          </div>
        </div>

        {/* Article body sections */}
        <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Article Content</div>
        {content.sections.map((sec, si) => (
          <div key={si} style={{ marginBottom:16, borderLeft:`3px solid ${prop.light}`, paddingLeft:16 }}>
            <input value={sec.heading} onChange={e => handleSectionEdit(si, "heading", e.target.value)}
              style={{ width:"100%", padding:"6px 0", border:"none", borderBottom:"1px solid #F3F4F6", fontSize:14, fontWeight:700, color:"#111827", outline:"none", background:"transparent", marginBottom:8 }}
              onFocus={e=>e.target.style.borderBottomColor=prop.accent} onBlur={e=>e.target.style.borderBottomColor="#F3F4F6"} />
            <textarea value={sec.body} onChange={e => handleSectionEdit(si, "body", e.target.value)}
              rows={Math.max(4, Math.ceil(sec.body.length / 90))}
              style={{ width:"100%", padding:"8px 0", border:"none", fontSize:13, color:"#374151", outline:"none", resize:"vertical", lineHeight:1.7, background:"transparent", fontFamily:"inherit" }} />
          </div>
        ))}

        {/* Revision request */}
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"14px 16px", marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:14 }}>💬</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>Request AI Revision</span>
          </div>
          <p style={{ fontSize:11, color:"#92400E", margin:"0 0 10px", opacity:0.8 }}>
            Describe what you'd like changed — tone, length, specific sections, added details, etc.
          </p>
          <div style={{ display:"flex", gap:8 }}>
            <textarea value={revisionInput} onChange={e => setRevisionInput(e.target.value)}
              placeholder='e.g. "Make the intro more conversational" or "Add a section about school zoning"'
              rows={2}
              style={{ flex:1, padding:"8px 12px", border:"1px solid #FDE68A", borderRadius:8, fontSize:12, color:"#111827", outline:"none", resize:"vertical", background:"#fff", fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#FDE68A"} />
            <button onClick={handleRequestRevision} disabled={!revisionInput.trim() || revising}
              style={{ padding:"8px 18px", background:revising ? "#E5E7EB" : prop.color, color:revising ? "#9CA3AF" : "#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:revising?"not-allowed":"pointer", whiteSpace:"nowrap", alignSelf:"flex-end" }}>
              {revising ? "Revising…" : "Revise ✨"}
            </button>
          </div>
          {revisionHistory[activeIndex] && revisionHistory[activeIndex].length > 0 && (
            <div style={{ marginTop:10, borderTop:"1px solid #FDE68A", paddingTop:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#B45309", marginBottom:4 }}>Revision History</div>
              {revisionHistory[activeIndex].map((r, ri) => (
                <div key={ri} style={{ fontSize:11, color:"#92400E", padding:"3px 0", display:"flex", gap:6 }}>
                  <span style={{ color:"#B45309", fontWeight:700 }}>#{ri+1}</span> {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display:"flex", flexDirection: mob ? "column-reverse" : "row", justifyContent:"space-between", alignItems:"center", gap: mob ? 10 : 0, padding:"16px 0" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 18px", background:"transparent", border:"1px solid #E5E7EB", borderRadius:10, fontSize:13, fontWeight:700, color:"#6B7280", cursor:"pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Regenerate Articles
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:allApproved ? "#22C55E" : "#9CA3AF", fontWeight:600 }}>
            {approvedSet.size}/{articles.length} approved
          </span>
          <button onClick={handleSendToWix} disabled={!allApproved}
            style={{ padding:"11px 28px", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:allApproved?"pointer":"not-allowed",
              background:allApproved?prop.color:"#E5E7EB", color:allApproved?"#fff":"#9CA3AF" }}>
            Send to Wix Drafts →
          </button>
        </div>
      </div>
    </div>
  );
}

