export default function StepBar({ step, prop, kwIndex, totalKws, mob=false }) {
  const steps = [
    "Keywords",
    totalKws > 1 ? `Articles (${Math.min((kwIndex||0)+1, totalKws)}/${totalKws})` : "Select Article",
    "Generating",
    "Preview & Edit",
    "Review & Publish"
  ];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:32, flexWrap:"wrap" }}>
      {steps.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i < steps.length-1 ? 1 : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:done?prop.accent:active?prop.color:"#E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                {done
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontSize:11, fontWeight:800, color:active?"#fff":"#9CA3AF" }}>{i+1}</span>
                }
              </div>
              <span style={{ fontSize: mob ? 9 : 12, fontWeight:700, color:active?prop.accent:done?prop.accent:"#9CA3AF", whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i < steps.length-1 && <div style={{ flex:1, height:2, background:done?prop.accent:"#E5E7EB", margin: mob ? "0 4px" : "0 12px", minWidth: mob ? 8 : 20 }} />}
          </div>
        );
      })}
    </div>
  );
}
