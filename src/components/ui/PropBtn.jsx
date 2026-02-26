import { useState } from "react";
import { LOGOS } from "../../data/logos";

export default function PropBtn({ prop, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:8, border:"none", background:active?"#1C2E3E":hov?"#141E28":"transparent", color:active?"#F0F4F8":hov?"#8BA5BE":"#5A7A94", fontSize:12, fontWeight:700, cursor:"pointer", textAlign:"left", marginBottom:2 }}>
      <img src={LOGOS[prop.id]} alt={prop.short} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover", flexShrink:0, opacity: active||hov ? 1 : 0.7 }} />
      <span style={{ flex:1 }}>{prop.short}</span>
    </button>
  );
}
