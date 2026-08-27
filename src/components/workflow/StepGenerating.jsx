import { useState, useEffect, useRef } from "react";
import { generateArticleContent } from "../../services/api";

export default function StepGenerating({ prop, count, articles, onDone, onCancel, writingStyle, businessGoals = "", publishedTitles = [] }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  // Per-article status: "pending" | "done" | error message string
  const [statuses, setStatuses] = useState(() => articles.map(() => "pending"));
  const [failed, setFailed] = useState(false);
  const doneRef = useRef(false);
  const fetchedRef = useRef(false);
  const resultsRef = useRef(articles.map(() => null));
  const stages = [
    "Reviewing your business goals & published articles…",
    "Outlining article structure & H2 headings…",
    "Writing introduction and body sections…",
    "Weaving in primary & secondary keywords naturally…",
    "Adding internal link mentions & calls to action…",
    "Writing SEO title, meta description & slug…",
    "Final quality checks & formatting…",
    "So close! Adding polish and the finishing touches…",
  ];

  // Animate the progress bar — ramps to 85% quickly, then slows asymptotically
  useEffect(() => {
    if (failed || doneRef.current) return;
    const t = setInterval(() => {
      setProgress(p => {
        if (doneRef.current) { clearInterval(t); return 100; }
        if (p < 85) return p + 0.8;
        const remaining = 99 - p;
        return p + remaining * 0.008;
      });
    }, 70);
    return () => clearInterval(t);
  }, [failed]);

  const generateAll = async (onlyFailed = false) => {
    setFailed(false);
    const targets = articles
      .map((a, i) => ({ a, i }))
      .filter(({ i }) => !onlyFailed || resultsRef.current[i] == null);

    setStatuses((prev) => prev.map((s, i) => (targets.some(t => t.i === i) ? "pending" : s)));

    await Promise.all(
      targets.map(async ({ a, i }) => {
        try {
          const content = await generateArticleContent(a, prop, { writingStyle: writingStyle || "", businessGoals, publishedTitles });
          resultsRef.current[i] = content;
          setStatuses((prev) => { const n = [...prev]; n[i] = "done"; return n; });
        } catch (e) {
          setStatuses((prev) => { const n = [...prev]; n[i] = e.message || "Generation failed"; return n; });
        }
      })
    );

    if (resultsRef.current.every((r) => r != null)) {
      doneRef.current = true;
      setProgress(100);
      setTimeout(() => onDone(resultsRef.current), 1200);
    } else {
      setFailed(true);
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    generateAll();
  }, []);

  useEffect(() => {
    setStage(Math.min(Math.floor(progress / (100 / stages.length)), stages.length - 1));
  }, [progress]);

  const errorList = statuses
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s !== "pending" && s !== "done");

  if (failed) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:420, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, marginBottom:24 }}>⚠️</div>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:"#B91C1C", margin:"0 0 8px" }}>
          {errorList.length === articles.length ? "Article generation failed" : `${errorList.length} of ${articles.length} articles failed`}
        </h2>
        <div style={{ maxWidth:520, width:"100%", margin:"8px 0 20px", display:"flex", flexDirection:"column", gap:8 }}>
          {articles.map((a, i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 14px", background:statuses[i]==="done"?"#F0FDF4":"#FEF2F2", border:`1px solid ${statuses[i]==="done"?"#BBF7D0":"#FECACA"}`, borderRadius:10, textAlign:"left" }}>
              <span style={{ fontSize:13 }}>{statuses[i]==="done" ? "✅" : "❌"}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{a.title}</div>
                {statuses[i] !== "done" && <div style={{ fontSize:11, color:"#B91C1C", marginTop:2 }}>{statuses[i]}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => generateAll(true)}
            style={{ padding:"11px 24px", background:prop.color, color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer" }}>
            ↻ Retry Failed Article{errorList.length>1?"s":""}
          </button>
          {onCancel && (
            <button onClick={onCancel}
              style={{ padding:"11px 20px", background:"#F3F4F6", color:"#6B7280", border:"none", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              Back to Keywords
            </button>
          )}
        </div>
      </div>
    );
  }

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

      {count > 1 && (
        <div style={{ fontSize:11, color:"#9CA3AF", marginBottom:14 }}>
          {statuses.filter(s => s === "done").length}/{count} finished
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
