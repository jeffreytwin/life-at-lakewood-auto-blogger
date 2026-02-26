export default function Kpi({ label, value, sub, accent, dm=false, card="#fff", border="#E5E7EB", text="#111827", muted="#6B7280" }) {
  return (
    <div style={{ background:card, border:`1px solid ${border}`, borderRadius:12, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, width:3, bottom:0, background:accent, borderRadius:"12px 0 0 12px" }} />
      <div style={{ fontSize:24, fontWeight:800, color:text, lineHeight:1, marginBottom:3 }}>{value}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:700, color:muted, letterSpacing:"0.04em" }}>{label}</div>
      {sub && <div style={{ fontSize:10, color:muted, marginTop:1, opacity:0.7 }}>{sub}</div>}
    </div>
  );
}
