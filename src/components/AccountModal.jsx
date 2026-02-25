import { useState } from "react";
import { PROPS } from "../data/properties";
import { LOGOS } from "../data/logos";

export default function AccountModal({ user, onUpdate, goals, setGoals, darkMode, setDarkMode, onClose, onSignOut }) {
  const [tab, setTab]           = useState("profile"); // "profile" | "goals" | "display"
  const [name, setName]         = useState(user.name);
  const [email, setEmail]       = useState(user.email);
  const [preview, setPreview]   = useState(user.avatar);
  const [saved, setSaved]       = useState(false);
  const [localGoals, setLocalGoals] = useState({...goals});

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onUpdate({ name, email, avatar: preview });
    setGoals(localGoals);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1.5px solid #E5E7EB", borderRadius:9, fontSize:16, outline:"none", color:"#111827" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:18, width:460, maxWidth:"93vw", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"22px 28px 0", borderBottom:"1px solid #F3F4F6" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:17, fontWeight:800, color:"#111827", fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>Account</div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"#9CA3AF" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:0 }}>
            {[["profile","Profile"],["goals","Monthly Goals"],["display","Display"]].map(([t,label]) => (
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 16px", border:"none", borderBottom:`2px solid ${tab===t?"#3B0764":"transparent"}`, background:"none", fontSize:13, fontWeight:tab===t?700:500, color:tab===t?"#3B0764":"#6B7280", cursor:"pointer", transition:"all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>

          {tab === "profile" && (
            <div>
              {/* Avatar */}
              <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:22, padding:"16px", background:"#F9FAFB", borderRadius:12 }}>
                <div style={{ width:70, height:70, borderRadius:"50%", overflow:"hidden", background:"#E5E7EB", border:"3px solid #fff", boxShadow:"0 2px 8px rgba(0,0,0,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {preview
                    ? <img src={preview} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize:24, color:"#9CA3AF" }}>👤</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#111827", marginBottom:6 }}>{name || "Your Name"}</div>
                  <label style={{ fontSize:12, fontWeight:700, color:"#3B0764", cursor:"pointer", padding:"6px 14px", border:"1.5px solid #A855F7", borderRadius:8, background:"#F3E8FF", display:"inline-block" }}>
                    📷 Change Photo
                    <input type="file" accept="image/*" onChange={handleImage} style={{ display:"none" }} />
                  </label>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[["Full Name", name, setName, "text", "Your name"],
                  ["Email", email, setEmail, "email", "you@example.com"]].map(([label, val, setter, type, ph]) => (
                  <div key={label}>
                    <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>{label}</label>
                    <input value={val} onChange={e=>setter(e.target.value)} type={type} placeholder={ph}
                      style={inp}
                      onFocus={e=>e.target.style.borderColor="#A855F7"}
                      onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "goals" && (
            <div>
              <p style={{ fontSize:13, color:"#6B7280", marginBottom:20, margin:"0 0 20px" }}>
                Set how many articles you want to publish each month per website. Your progress will be tracked in the Content Calendar.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {Object.values(PROPS).map(pr => (
                  <div key={pr.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6" }}>
                    <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#111827", marginBottom:2 }}>{pr.name}</div>
                      <div style={{ fontSize:11, color:"#9CA3AF" }}>{pr.url}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <button onClick={()=>setLocalGoals(g=>({...g,[pr.id]:Math.max(1,g[pr.id]-1)}))}
                        style={{ width:28, height:28, borderRadius:8, border:"1px solid #E5E7EB", background:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#374151", fontWeight:700 }}>−</button>
                      <div style={{ width:36, textAlign:"center", fontSize:18, fontWeight:800, color:pr.color }}>{localGoals[pr.id]}</div>
                      <button onClick={()=>setLocalGoals(g=>({...g,[pr.id]:Math.min(20,g[pr.id]+1)}))}
                        style={{ width:28, height:28, borderRadius:8, border:"1px solid #E5E7EB", background:"#fff", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#374151", fontWeight:700 }}>+</button>
                      <span style={{ fontSize:11, color:"#9CA3AF", width:60 }}>/ month</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "display" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#111827", marginBottom:3 }}>Dark Mode</div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>Switch to a dark interface theme</div>
                </div>
                <div onClick={()=>setDarkMode(d=>!d)} style={{ width:44, height:24, borderRadius:12, background:darkMode?"#3B0764":"#E5E7EB", cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:darkMode?23:3, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 28px", borderTop:"1px solid #F3F4F6", display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={handleSave} style={{ width:"100%", padding:"11px", background:saved?"#22C55E":"#3B0764", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", transition:"background 0.2s" }}>
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
          <button onClick={()=>{ onClose(); onSignOut(); }} style={{ width:"100%", padding:"10px", background:"#FEF2F2", color:"#EF4444", border:"1px solid #FECACA", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
