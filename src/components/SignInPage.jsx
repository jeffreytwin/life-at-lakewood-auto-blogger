import { useState } from "react";
import { LAKEWOOD_LOGO_B64 } from "../data/logos";
import { supabase } from "../lib/supabase";

export default function SignInPage({ onSignIn }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setLoading(true);
    setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }
    const user = data.user;
    setLoading(false);
    onSignIn({
      id: user.id,
      name: user.user_metadata?.full_name || email.split("@")[0],
      email: user.email,
      avatar: user.user_metadata?.avatar_url || null,
    });
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0E1A24", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ width:"100%", maxWidth:420, padding:"0 16px" }}>
        {/* Brand */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <img src={LAKEWOOD_LOGO_B64} alt="Life at Lakewood" style={{ width:88, height:88, borderRadius:"50%", objectFit:"cover", marginBottom:16, boxShadow:"0 4px 24px rgba(168,85,247,0.4)", display:"block", margin:"0 auto 16px" }} />
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.22em", textTransform:"uppercase", color:"#2E4155", marginBottom:6 }}>SEO Blog Builder</div>
          <div style={{ fontSize:26, fontWeight:900, color:"#ECF2F8", fontFamily:"'Inter','DM Sans',system-ui,sans-serif", lineHeight:1.2, marginBottom:4, letterSpacing:"-0.02em" }}>
            Life At Lakewood
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#A855F7", letterSpacing:"0.04em" }}>Auto-Blogger</div>
        </div>

        <div style={{ background:"#fff", borderRadius:20, padding:"28px 24px", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize:18, fontWeight:800, color:"#111827", marginBottom:4 }}>Sign In</div>
          <div style={{ fontSize:13, color:"#6B7280", marginBottom:24 }}>Welcome back. Sign in to manage your blogs.</div>

          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Email</label>
                  <input value={email} onChange={e=>{ setEmail(e.target.value); setError(""); }} placeholder="you@example.com" type="email"
                    style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #E5E7EB", borderRadius:9, fontSize:16, outline:"none", color:"#111827" }}
                    onFocus={e=>e.target.style.borderColor="#A855F7"}
                    onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
                </div>
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:5 }}>Password</label>
                  <input value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }} placeholder="••••••••" type="password"
                    style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #E5E7EB", borderRadius:9, fontSize:16, outline:"none", color:"#111827" }}
                    onFocus={e=>e.target.style.borderColor="#A855F7"}
                    onBlur={e=>e.target.style.borderColor="#E5E7EB"}
                    onKeyDown={e=>{ if(e.key==="Enter") handleSubmit(); }} />
                </div>
              </div>

              {error && <div style={{ fontSize:12, color:"#EF4444", marginBottom:14, padding:"8px 12px", background:"#FEF2F2", borderRadius:7 }}>{error}</div>}

              <button onClick={handleSubmit} disabled={loading}
                style={{ width:"100%", padding:"12px", background:"#3B0764", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:800, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {loading
                  ? <><div style={{ width:16, height:16, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"spin 0.7s linear infinite" }} /> Please wait…</>
                  : "Sign In →"
                }
              </button>
        </div>
      </div>
    </div>
  );
}
