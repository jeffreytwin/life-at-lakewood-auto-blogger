import { useState } from "react";
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

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) { setPwMsg("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { setPwMsg("Passwords don't match"); return; }
    setPwLoading(true);
    setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { setPwMsg(error.message); return; }
    setPwMsg("Password updated!");
    setNewPassword("");
    setConfirmPassword("");
  };

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
    if (setWritingStyle) setWritingStyle(localStyle);
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
                {pwMsg && <div style={{ fontSize:11, color:pwMsg==="Password updated!"?"#22C55E":"#EF4444", marginTop:6 }}>{pwMsg}</div>}
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

              {/* Google Search Console */}
              <div style={{ padding:"16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:"#fff", border:"1px solid #E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#4285F4"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>Google Search Console</div>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>Real keyword data, clicks, impressions, and rankings</div>
                  </div>
                </div>
                <a
                  href="/api/google/auth"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#4285F4", color:"#fff", borderRadius:8, textDecoration:"none", fontSize:12, fontWeight:700, cursor:"pointer" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Connect Google Account
                </a>
                <div style={{ fontSize:10, color:"#9CA3AF", marginTop:8 }}>
                  Grants read-only access to Search Console data for your blog properties.
                </div>
              </div>

              {/* Wix */}
              <div style={{ padding:"16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:"#fff", border:"1px solid #E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.5 4.5l-3 15-4.5-9-4.5 9-3-15-4.5 15h-3L6 1.5l4.5 9L15 1.5l4.5 9L22.5 4.5z" fill="#0C6EFC"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>Wix Blog</div>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>Push articles to your Wix blog drafts</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6, background:"#DCFCE7", color:"#16A34A" }}>API Key</span>
                </div>
                <div style={{ fontSize:11, color:"#6B7280" }}>
                  Set <code style={{ background:"#F3F4F6", padding:"1px 4px", borderRadius:3 }}>WIX_API_KEY</code> in your Vercel environment variables to enable.
                </div>
              </div>

              {/* Claude AI */}
              <div style={{ padding:"16px", background:"#F9FAFB", borderRadius:12, border:"1px solid #F3F4F6" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:8, background:"#fff", border:"1px solid #E5E7EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>Claude AI</div>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>Article generation, keyword ideas, and revisions</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:6, background:"#DCFCE7", color:"#16A34A" }}>Connected</span>
                </div>
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
