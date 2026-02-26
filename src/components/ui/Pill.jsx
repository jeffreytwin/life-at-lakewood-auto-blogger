import { SM } from "../../data/constants";

export default function Pill({ status }) {
  const m = SM[status] || SM.scheduled;
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:m.bg, color:m.tx, display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:m.dot }} />
      {m.label}
    </span>
  );
}
