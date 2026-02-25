import { useState, useEffect } from "react";

export default function StepGenerating({ prop, count, onDone }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
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

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setTimeout(onDone, 1200); return 100; }
        return p + 1.2;
      });
    }, 70);
    return () => clearInterval(t);
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
