import { useState } from "react";

export default function NavBtn({ label, icon, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"9px 10px", borderRadius:8, border:"none", background:active?"#1C2E3E":hov?"#141E28":"transparent", color:active?"#F0F4F8":hov?"#8BA5BE":"#5A7A94", fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"left", marginBottom:2 }}>
      <span style={{ fontSize:14, flexShrink:0 }}>{icon}</span>
      <span style={{ flex:1 }}>{label}</span>
    </button>
  );
}
