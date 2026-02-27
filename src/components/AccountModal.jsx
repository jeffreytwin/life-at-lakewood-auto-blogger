import { useState, useEffect } from "react";
import { PROPS } from "../data/properties";
import { LOGOS } from "../data/logos";
import { supabase } from "../lib/supabase";

export default function AccountModal({ user, onUpdate, goals, setGoals, writingStyle, setWritingStyle, darkMode, setDarkMode, onClose, onSignOut }) {
  const [tab, setTab]           = useState("profile"); // "profile" | "goals" | "writing" | "display" | "connections"
  const [name, setName]         = useState(user.name);
  const [email, setEmail]       = useState(user.email);
  const [preview, setPreview]   = useState(user.avatar);
  const [saved, setSaved]       = useState(false);
  const [localGoals, setLocalGoals] = useState({...goals});
  const [localStyle, setLocalStyle] = useState(writingStyle || "");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg]       = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);

  // Check GSC connection status — validate the token actually works
  useEffect(() => {
    fetch("/api/google/auth?check")
      .then(r => r.ok ? r.json() : null)
      .then(data => setGscConnected(!!data?.connected))
      .catch(() => setGscConnected(false));
  }, []);

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) { setPwMsg("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPwMsg("Passwords don't match"); return; }
    setPwLoading(true);
    setPwMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPwLoading(false); setPwMsg(error.message); return; }
      // Verify the password was actually changed by re-authenticating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: newPassword,
      });
      setPwLoading(false);
      if (signInError) {
        setPwMsg("Password change may require email confirmation. Check your inbox.");
        return;
      }
      setPwMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPwLoading(false);
      setPwMsg(e.message || "Failed to update password");
    }
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress and resize to small avatar (200x200, JPEG 0.7) to avoid localStorage quota issues
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // Center-crop to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setPreview(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onUpdate({ name, email, avatar: preview });
    setGoals(localGoals);
    if (setWritingStyle) setWritingStyle(localStyle);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const inp = { width:"100%", padding:"9px 12px", border:"1.5px solid #E5E7EB", borderRadius:9, fontSize:16, outline:"none", color:"#111827" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:18, width:580, maxWidth:"93vw", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>

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
            {[["profile","Profile"],["goals","Monthly Goals"],["writing","Writing Style"],["connections","Connections"],["display","Display"]].map(([t,label]) => (
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

              {/* Password change */}
              <div style={{ marginTop:20, padding:"16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:12 }}>Change Password</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <input value={newPassword} onChange={e=>{ setNewPassword(e.target.value); setPwMsg(""); }} type="password" placeholder="New password"
                    style={inp} onFocus={e=>e.target.style.borderColor="#A855F7"} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
                  <input value={confirmPassword} onChange={e=>{ setConfirmPassword(e.target.value); setPwMsg(""); }} type="password" placeholder="Confirm new password"
                    style={inp} onFocus={e=>e.target.style.borderColor="#A855F7"} onBlur={e=>e.target.style.borderColor="#E5E7EB"}
                    onKeyDown={e=>{ if(e.key==="Enter") handlePasswordChange(); }} />
                </div>
                {pwMsg && <div style={{ fontSize:11, color:pwMsg.includes("updated successfully")?"#22C55E":"#EF4444", marginTop:6 }}>{pwMsg}</div>}
                <button onClick={handlePasswordChange} disabled={pwLoading}
                  style={{ marginTop:8, padding:"7px 16px", background:"#3B0764", color:"#fff", border:"none", borderRadius:7, fontSize:11, fontWeight:700, cursor:pwLoading?"not-allowed":"pointer" }}>
                  {pwLoading ? "Updating…" : "Update Password"}
                </button>
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

          {tab === "writing" && (
            <div>
              <p style={{ fontSize:13, color:"#6B7280", margin:"0 0 16px" }}>
                Guide how Claude writes your articles. Describe your preferred tone, audience, formatting, or any specific instructions.
              </p>
              <textarea
                value={localStyle}
                onChange={e => setLocalStyle(e.target.value)}
                placeholder={"Example:\n- Tone: Conversational and trustworthy, like a knowledgeable friend\n- Audience: Home buyers aged 30-65, relocating from out of state\n- Always mention CDD fees and HOA costs\n- End with a soft CTA to contact the team\n- Use bullet points for key facts\n- Avoid salesy language"}
                rows={10}
                style={{ width:"100%", padding:"12px 14px", border:"1.5px solid #E5E7EB", borderRadius:10, fontSize:13, color:"#111827", outline:"none", resize:"vertical", fontFamily:"inherit", lineHeight:1.6, background:"#FAFAFA" }}
                onFocus={e=>e.target.style.borderColor="#A855F7"}
                onBlur={e=>e.target.style.borderColor="#E5E7EB"}
              />
              <div style={{ fontSize:11, color:"#9CA3AF", marginTop:8 }}>
                These preferences will be included in every article generation prompt sent to Claude.
              </div>
            </div>
          )}

          {tab === "connections" && (
            <div>
              <p style={{ fontSize:13, color:"#6B7280", margin:"0 0 20px" }}>
                Connect external services to unlock real data for keyword research and blog management.
              </p>

              {/* Connector card style — consistent for all three */}
              {[
                {
                  name: "Google Search Console",
                  desc: "Real keyword data, clicks, impressions, and rankings",
                  connected: gscConnected,
                  logoBg: "#fff",
                  logoBorder: "1px solid #E5E7EB",
                  logo: (
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.0 24.0 0 000 21.56l7.98-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  ),
                  connectUrl: "/api/google/auth",
                  connectLabel: "Connect Google Account",
                  connectColor: "#4285F4",
                },
                {
                  name: "Wix Blog",
                  desc: "Push articles directly to your Wix blog as drafts",
                  connected: true,
                  logoBg: "#0C6EFC",
                  logoBorder: "none",
                  logo: (
                    <svg width="24" height="12" viewBox="0 0 40 16" fill="none">
                      <path d="M9.2 0.5l-1.5 9.3L5.5 3 3.3 9.8 1.1 0.5H0L3.3 15.5l2.2-6.8 2.2 6.8L11 0.5H9.2z" fill="#fff"/>
                      <path d="M13.3 3.5c0-.8.6-1.4 1.4-1.4.8 0 1.4.6 1.4 1.4v-3h1.2V12h-1.2V3.5c0-.1-.1-.2-.2-.2-.1 0-.2.1-.2.2V12h-1.2V3.5c0-.1-.1-.2-.2-.2-.1 0-.2.1-.2.2V12h-1.2V3.5z" fill="#fff"/>
                      <path d="M22.5 12l-2.8-5.5L22.5 1h-1.4l-2.1 4.3V1h-1.2v11h1.2V7l2.1 5h1.4z" fill="#fff"/>
                    </svg>
                  ),
                },
                {
                  name: "Claude AI",
                  desc: "Article generation, keyword ideas, and revisions",
                  connected: true,
                  logoBg: "#D97757",
                  logoBorder: "none",
                  logo: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M13.74 3.6L19.6 12l-5.86 8.4h-3.48L16.12 12 10.26 3.6h3.48z" fill="#fff"/>
                      <path d="M7.74 3.6L4.26 3.6 10.12 12l-5.86 8.4h3.48L13.6 12 7.74 3.6z" fill="#fff"/>
                    </svg>
                  ),
                },
              ].map((svc, idx) => (
                <div key={idx} style={{ padding:"16px 18px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6", marginBottom:idx < 2 ? 12 : 0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:svc.logoBg, border:svc.logoBorder, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {svc.logo}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{svc.name}</div>
                      <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>{svc.desc}</div>
                    </div>
                    {svc.connected ? (
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <span style={{ fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:6, background:"#DCFCE7", color:"#16A34A" }}>Connected</span>
                        {svc.connectUrl && <a href={svc.connectUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:svc.connectColor || "#6B7280", textDecoration:"none", fontWeight:600 }}>Reconnect</a>}
                      </div>
                    ) : (
                      <a href={svc.connectUrl} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:svc.connectColor, color:"#fff", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {svc.connectLabel || "Connect"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
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
