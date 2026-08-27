import { useState } from "react";
import { PROPS } from "../data/properties";
import { LOGOS } from "../data/logos";
import { supabase } from "../lib/supabase";

const GOAL_PLACEHOLDER = "e.g. Generate seller-ready buyer leads for new-construction homes. Prioritize transactional and commercial keywords. Audience: out-of-state relocators and 55+ buyers. Every article should funnel readers toward a community tour or a call with the team.";

export default function AccountModal({ user, onUpdate, goals, setGoals, writingStyle, bizGoals = {}, onSaveStrategy, darkMode, setDarkMode, onClose, onSignOut }) {
  const [tab, setTab]           = useState("profile"); // "profile" | "goals" | "strategy" | "writing" | "display"
  const [name, setName]         = useState(user.name);
  const [email, setEmail]       = useState(user.email);
  const [preview, setPreview]   = useState(user.avatar);
  const [saved, setSaved]       = useState(false);
  const [localGoals, setLocalGoals] = useState({...goals});
  const [localStyle, setLocalStyle] = useState(writingStyle || "");
  const [localBizGoals, setLocalBizGoals] = useState({ ...bizGoals });
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg]       = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Dark mode palette
  const dm       = darkMode;
  const cardBg   = dm ? "#1E293B" : "#fff";
  const panelBg  = dm ? "#0F172A" : "#F9FAFB";
  const borderC  = dm ? "#334155" : "#F3F4F6";
  const borderInp = dm ? "#475569" : "#E5E7EB";
  const textPri  = dm ? "#F1F5F9" : "#111827";
  const textSec  = dm ? "#CBD5E1" : "#374151";
  const textMut  = dm ? "#94A3B8" : "#6B7280";
  const textDim  = dm ? "#64748B" : "#9CA3AF";
  const accentTab = dm ? "#C084FC" : "#3B0764";
  const tabInactive = dm ? "#94A3B8" : "#6B7280";
  const inpBg    = dm ? "#0F172A" : "#fff";

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
    if (onSaveStrategy) onSaveStrategy(localBizGoals, localStyle);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const inp = { width:"100%", padding:"9px 12px", border:`1.5px solid ${borderInp}`, borderRadius:9, fontSize:16, outline:"none", color:textPri, background:inpBg };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ background:cardBg, borderRadius:18, width:660, maxWidth:"93vw", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:"22px 28px 0", borderBottom:`1px solid ${borderC}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:17, fontWeight:800, color:textPri, fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>Account</div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:textDim }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", gap:0, flexWrap:"wrap" }}>
            {[["profile","Profile"],["goals","Monthly Goals"],["strategy","Business Goals"],["writing","Writing Style"],["display","Display"]].map(([t,label]) => (
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 12px", border:"none", borderBottom:`2px solid ${tab===t?accentTab:"transparent"}`, background:"none", fontSize:12.5, fontWeight:tab===t?700:500, color:tab===t?accentTab:tabInactive, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap" }}>
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
              <div style={{ display:"flex", alignItems:"center", gap:18, marginBottom:22, padding:"16px", background:panelBg, borderRadius:12 }}>
                <div style={{ width:70, height:70, borderRadius:"50%", overflow:"hidden", background:borderInp, border:`3px solid ${cardBg}`, boxShadow:"0 2px 8px rgba(0,0,0,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {preview
                    ? <img src={preview} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <span style={{ fontSize:24, color:textDim }}>👤</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:textPri, marginBottom:6 }}>{name || "Your Name"}</div>
                  <label style={{ fontSize:12, fontWeight:700, color:accentTab, cursor:"pointer", padding:"6px 14px", border:"1.5px solid #A855F7", borderRadius:8, background:dm?"#2E1065":"#F3E8FF", display:"inline-block" }}>
                    📷 Change Photo
                    <input type="file" accept="image/*" onChange={handleImage} style={{ display:"none" }} />
                  </label>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[["Full Name", name, setName, "text", "Your name"],
                  ["Email", email, setEmail, "email", "you@example.com"]].map(([label, val, setter, type, ph]) => (
                  <div key={label}>
                    <label style={{ fontSize:11, fontWeight:700, color:textSec, display:"block", marginBottom:5 }}>{label}</label>
                    <input value={val} onChange={e=>setter(e.target.value)} type={type} placeholder={ph}
                      style={inp}
                      onFocus={e=>e.target.style.borderColor="#A855F7"}
                      onBlur={e=>e.target.style.borderColor=borderInp} />
                  </div>
                ))}
              </div>

              {/* Password change */}
              <div style={{ marginTop:20, padding:"16px", background:panelBg, borderRadius:12, border:`1px solid ${borderC}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:textSec, marginBottom:12 }}>Change Password</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <input value={newPassword} onChange={e=>{ setNewPassword(e.target.value); setPwMsg(""); }} type="password" placeholder="New password"
                    style={inp} onFocus={e=>e.target.style.borderColor="#A855F7"} onBlur={e=>e.target.style.borderColor=borderInp} />
                  <input value={confirmPassword} onChange={e=>{ setConfirmPassword(e.target.value); setPwMsg(""); }} type="password" placeholder="Confirm new password"
                    style={inp} onFocus={e=>e.target.style.borderColor="#A855F7"} onBlur={e=>e.target.style.borderColor=borderInp}
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
              <p style={{ fontSize:13, color:textMut, marginBottom:20, margin:"0 0 20px" }}>
                Set how many articles you want to publish each month per website. Your progress will be tracked in the Content Calendar.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {Object.values(PROPS).map(pr => (
                  <div key={pr.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", background:panelBg, borderRadius:12, border:`1px solid ${borderC}` }}>
                    <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:36, height:36, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:textPri, marginBottom:2 }}>{pr.name}</div>
                      <div style={{ fontSize:11, color:textDim }}>{pr.url}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <button onClick={()=>setLocalGoals(g=>({...g,[pr.id]:Math.max(1,g[pr.id]-1)}))}
                        style={{ width:28, height:28, borderRadius:8, border:`1px solid ${borderInp}`, background:cardBg, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:textSec, fontWeight:700 }}>−</button>
                      <div style={{ width:36, textAlign:"center", fontSize:18, fontWeight:800, color:pr.color }}>{localGoals[pr.id]}</div>
                      <button onClick={()=>setLocalGoals(g=>({...g,[pr.id]:Math.min(20,g[pr.id]+1)}))}
                        style={{ width:28, height:28, borderRadius:8, border:`1px solid ${borderInp}`, background:cardBg, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:textSec, fontWeight:700 }}>+</button>
                      <span style={{ fontSize:11, color:textDim, width:60 }}>/ month</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "strategy" && (
            <div>
              <p style={{ fontSize:13, color:textMut, margin:"0 0 6px" }}>
                What is each website's blog actually <strong>for</strong>? These goals steer everything: which keywords score as opportunities, which article angles Claude suggests, and what call to action every article drives toward.
              </p>
              <p style={{ fontSize:11.5, color:textDim, margin:"0 0 16px" }}>
                Saved to your shared workspace (Supabase), so they apply on every device.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {Object.values(PROPS).map(pr => (
                  <div key={pr.id} style={{ padding:"14px 16px", background:panelBg, borderRadius:12, border:`1px solid ${borderC}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                      <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      <div style={{ fontSize:13, fontWeight:700, color:textPri }}>{pr.name}</div>
                    </div>
                    <textarea
                      value={localBizGoals[pr.id] || ""}
                      onChange={e => setLocalBizGoals(g => ({ ...g, [pr.id]: e.target.value }))}
                      placeholder={GOAL_PLACEHOLDER}
                      rows={3}
                      style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${borderInp}`, borderRadius:9, fontSize:12.5, color:textPri, outline:"none", resize:"vertical", fontFamily:"inherit", lineHeight:1.5, background:inpBg }}
                      onFocus={e=>e.target.style.borderColor="#A855F7"}
                      onBlur={e=>e.target.style.borderColor=borderInp}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "writing" && (
            <div>
              <p style={{ fontSize:13, color:textMut, margin:"0 0 16px" }}>
                Guide how Claude writes your articles. Describe your preferred tone, audience, formatting, or any specific instructions.
              </p>
              <textarea
                value={localStyle}
                onChange={e => setLocalStyle(e.target.value)}
                placeholder={"Example:\n- Tone: Conversational and trustworthy, like a knowledgeable friend\n- Audience: Home buyers aged 30-65, relocating from out of state\n- Always mention CDD fees and HOA costs\n- End with a soft CTA to contact the team\n- Use bullet points for key facts\n- Avoid salesy language"}
                rows={10}
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${borderInp}`, borderRadius:10, fontSize:13, color:textPri, outline:"none", resize:"vertical", fontFamily:"inherit", lineHeight:1.6, background:panelBg }}
                onFocus={e=>e.target.style.borderColor="#A855F7"}
                onBlur={e=>e.target.style.borderColor=borderInp}
              />
              <div style={{ fontSize:11, color:textDim, marginTop:8 }}>
                These preferences will be included in every article generation prompt sent to Claude.
              </div>
            </div>
          )}

          {tab === "display" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px", background:panelBg, borderRadius:12, border:`1px solid ${borderC}` }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:textPri, marginBottom:3 }}>Dark Mode</div>
                  <div style={{ fontSize:12, color:textDim }}>Switch to a dark interface theme</div>
                </div>
                <div onClick={()=>setDarkMode(d=>!d)} style={{ width:44, height:24, borderRadius:12, background:darkMode?"#3B0764":borderInp, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:darkMode?23:3, transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 28px", borderTop:`1px solid ${borderC}`, display:"flex", flexDirection:"column", gap:8 }}>
          <button onClick={handleSave} style={{ width:"100%", padding:"11px", background:saved?"#22C55E":"#3B0764", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", transition:"background 0.2s" }}>
            {saved ? "✓ Saved!" : "Save Changes"}
          </button>
          <button onClick={()=>{ onClose(); onSignOut(); }} style={{ width:"100%", padding:"10px", background:dm?"#3B1111":"#FEF2F2", color:"#EF4444", border:`1px solid ${dm?"#7F1D1D":"#FECACA"}`, borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
