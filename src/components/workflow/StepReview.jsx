import { useState } from "react";
import useMobile from "../../hooks/useMobile";
import Pill from "../ui/Pill";
import { PROPS } from "../../data/properties";

export default function StepReview({ prop, articles, allArticles = [], onDone, onGenerateMore }) {
  const mob = useMobile();
  const [checked, setChecked] = useState({});

  // Merge workflow articles with existing drafts for this property
  const draftArts = allArticles.filter(a => a.p === prop.id && a.status === "in_wix");
  const workflowIds = new Set(articles.map(a => a.id));
  const extraDrafts = draftArts.filter(a => !workflowIds.has(a.id));
  const allReviewArticles = [...articles, ...extraDrafts.map(a => ({ ...a, words: 1200 }))];

  const toggle = (id, item) => {
    setChecked(c => ({ ...c, [`${id}_${item}`]: !c[`${id}_${item}`] }));
  };

  const checklist = ["Read through for factual accuracy (prices, builders, HOA)", "Add 3–5 photos with descriptive alt text", "Verify SEO title & meta description in Wix", "Publish the post live", "Submit URL to Google Search Console"];

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 6px" }}>
          Review & Publish
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#6B7280", margin:0 }}>
          {allReviewArticles.length} article{allReviewArticles.length>1?"s are":" is"} in your Wix draft queue for {prop.short}. Add photos, check copy, and publish.
        </p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
        {allReviewArticles.map((a, idx) => {
          const allDone = checklist.every((_,i) => checked[`${idx}_${i}`]);
          return (
            <div key={idx} style={{ background:"#fff", border:`1px solid ${allDone?prop.accent:"#E5E7EB"}`, borderRadius:14, padding:"20px 22px", transition:"border-color 0.2s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:700, color:"#111827", marginBottom:6, lineHeight:1.3 }}>{a.title}</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:prop.color, background:prop.light, padding:"2px 10px", borderRadius:20 }}>🎯 {a.kw}</span>
                    <span style={{ fontSize:11, color:"#6B7280" }}>✍️ ~{(a.words||1200).toLocaleString()} words</span>
                  </div>
                </div>
                <Pill status={allDone ? "scheduled" : "in_wix"} />
              </div>

              <div style={{ background:"#F9FAFB", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Your Checklist</div>
                {checklist.map((item, i) => (
                  <div key={i} onClick={()=>toggle(idx, i)} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8, cursor:"pointer" }}>
                    <div style={{ width:18, height:18, borderRadius:5, border:`2px solid ${checked[`${idx}_${i}`]?prop.color:"#D1D5DB"}`, background:checked[`${idx}_${i}`]?prop.color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      {checked[`${idx}_${i}`] && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize:12, color:checked[`${idx}_${i}`]?"#9CA3AF":"#374151", textDecoration:checked[`${idx}_${i}`]?"line-through":"none" }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <a href={prop.wixDrafts || prop.wixDash} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", background:prop.color, color:"#fff", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700 }}>
                  Open in Wix Blog Studio
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                {allDone && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:prop.accent, fontWeight:700 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    All steps complete
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", flexDirection: mob ? "column" : "row", justifyContent:"space-between", gap:10, padding:"16px 0" }}>
        <button onClick={onDone} style={{ padding:"11px 28px", background:prop.color, color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", ...(mob ? { width:"100%", textAlign:"center" } : {}) }}>
          Back to Dashboard →
        </button>
        <button onClick={onGenerateMore} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 24px", background:"transparent", color:prop.accent, border:`1.5px solid ${prop.accent}`, borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", ...(mob ? { width:"100%" } : {}) }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Generate More Articles
        </button>
      </div>
    </div>
  );
}
