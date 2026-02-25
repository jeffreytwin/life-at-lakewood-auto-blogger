import { useState, useEffect } from "react";
import useMobile from "./hooks/useMobile";
import { supabase } from "./lib/supabase";
import { PROPS } from "./data/properties";
import { ARTICLES } from "./data/mock-articles";
import NavBtn from "./components/ui/NavBtn";
import PropBtn from "./components/ui/PropBtn";
import CalendarView from "./components/CalendarView";
import PropertyDashboard from "./components/PropertyDashboard";
import WorkflowView from "./components/workflow/WorkflowView";
import SignInPage from "./components/SignInPage";
import AccountModal from "./components/AccountModal";

export default function App() {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);
  const [darkMode, setDarkMode]       = useState(() => { try { return localStorage.getItem("lal_darkMode") === "true"; } catch { return false; } });
  const [goals, setGoals]             = useState(() => { try { const s = localStorage.getItem("lal_goals"); return s ? JSON.parse(s) : { lakewood: 4, wellen: 4, parrish: 4, longboat: 4 }; } catch { return { lakewood: 4, wellen: 4, parrish: 4, longboat: 4 }; } });

  // Check for existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          name: u.user_metadata?.full_name || u.email.split("@")[0],
          email: u.email,
          avatar: u.user_metadata?.avatar_url || null,
        });
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          name: u.user_metadata?.full_name || u.email.split("@")[0],
          email: u.email,
          avatar: u.user_metadata?.avatar_url || null,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { localStorage.setItem("lal_darkMode", String(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem("lal_goals", JSON.stringify(goals)); }, [goals]);
  const [view, setView]               = useState("calendar");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mob = useMobile();

  const isWorkflow = view.includes("_workflow");
  const propId     = isWorkflow ? view.replace(/_workflow.*/, "") : (PROPS[view] ? view : null);
  const activeProp = propId ? PROPS[propId] : null;

  const goToProp     = id => { setView(id); setSidebarOpen(false); };
  const goToWorkflow = id => { setView(id+"_workflow"); setSidebarOpen(false); };
  const goBack       = ()  => { setView(propId); setSidebarOpen(false); };

  // Dark mode palette
  const dm = darkMode;
  const bg     = dm ? "#0F172A" : "#F2F1ED";
  const card   = dm ? "#1E293B" : "#fff";
  const border = dm ? "#334155" : "#E5E7EB";
  const text   = dm ? "#F1F5F9" : "#111827";
  const muted  = dm ? "#94A3B8" : "#6B7280";
  const sidebarBg = dm ? "#060F1A" : "#0E1A24";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:"#0E1A24", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid rgba(168,85,247,0.3)", borderTopColor:"#A855F7", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!user) return <SignInPage onSignIn={u => setUser(u)} />;

  return (
    <div style={{ height:"100vh", background:bg, fontFamily:"'Inter','DM Sans',system-ui,sans-serif", display:"flex", transition:"background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:#2D3748; border-radius:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        @media(max-width:767px){
          .mob-hide { display:none!important; }
        }
      `}</style>

      {showAccount && <AccountModal user={user} onUpdate={u=>setUser(u)} goals={goals} setGoals={setGoals} darkMode={darkMode} setDarkMode={setDarkMode} onClose={()=>setShowAccount(false)} onSignOut={handleSignOut} />}

      {/* Sidebar overlay */}
      {mob && sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000
        }} />
      )}

      {/* Sidebar */}
      <div style={{
        width:232, background:sidebarBg, flexShrink:0, display: mob && !sidebarOpen ? "none" : "flex",
        flexDirection:"column", overflowY:"auto", transition:"background 0.3s",
        ...(mob ? { position:"fixed", top:0, left:0, height:"100vh", zIndex:1050 } : { position:"sticky", top:0, height:"100vh" })
      }}>
        <div style={{ padding:"20px 18px 14px", borderBottom:"1px solid #182431" }}>
          <div style={{ fontSize:7, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:"#2E4155", marginBottom:5 }}>SEO Blog Builder</div>
          <div style={{ fontSize:12, fontWeight:800, color:"#ECF2F8", fontFamily:"'Inter','DM Sans',system-ui,sans-serif", lineHeight:1.3 }}>
            Life At Lakewood<br/>
            <span style={{ fontSize:10, fontWeight:700, color:"#A855F7" }}>Auto-Blogger</span>
          </div>
        </div>

        <nav style={{ padding:"12px 8px", flex:1 }}>
          <NavBtn label="Content Calendar" icon="📅" active={view==="calendar"} onClick={()=>setView("calendar")} />
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#1E3245", padding:"13px 10px 5px" }}>Properties</div>
          {Object.values(PROPS).map(p=>(
            <PropBtn key={p.id} prop={p} active={propId===p.id} onClick={()=>goToProp(p.id)} />
          ))}
        </nav>

        {/* Bottom bar */}
        <div style={{ padding:"12px 16px", borderTop:"1px solid #182431" }}>
          <button onClick={()=>setShowAccount(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, border:"none", background:"transparent", cursor:"pointer", marginBottom:8, textAlign:"left" }}
            onMouseEnter={e=>e.currentTarget.style.background="#141E28"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div style={{ width:30, height:30, borderRadius:"50%", overflow:"hidden", border:"2px solid #2E4155", background:"#1C2E3E", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {user.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:12, fontWeight:800, color:"#ECF2F8" }}>{user.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#5A7A94" }}>Account</div>
              {darkMode && <div style={{ fontSize:9, color:"#A855F7", fontWeight:700 }}>Dark Mode On</div>}
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E4155" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>

          <div style={{ fontSize:9, color:"#1E3245", fontWeight:700, marginBottom:5 }}>Connected APIs</div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
            {["Claude AI","GSC","Wix"].map(t=>(
              <span key={t} style={{ fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:4, background:"#0D3326", color:"#52B788" }}>{t} ✓</span>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minHeight:0 }}>
        {mob && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:sidebarBg, borderBottom:"1px solid #182431", flexShrink:0, zIndex:50, position:"sticky", top:0 }}>
            <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ width:36, height:36, borderRadius:8, background:"transparent", border:"1px solid #182431", color:"#ECF2F8", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:18 }}>
              {sidebarOpen ? "✕" : "☰"}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:11, fontWeight:800, color:"#ECF2F8" }}>{user.name}</span>
              <div style={{ width:28, height:28, borderRadius:"50%", overflow:"hidden", border:"2px solid #2E4155", background:"#1C2E3E", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} onClick={()=>setShowAccount(true)}>
                {user.avatar ? <img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:10, fontWeight:800, color:"#ECF2F8" }}>{user.name.charAt(0)}</span>}
              </div>
            </div>
          </div>
        )}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
        {activeProp && <div style={{ height:3, background:`linear-gradient(90deg,${activeProp.color},${activeProp.accent})` }} />}
        {view === "calendar" && <CalendarView dm={dm} bg={bg} card={card} border={border} text={text} muted={muted} goals={goals} mob={mob} onReviewChecklist={(articleId) => { const a = ARTICLES.find(x=>x.id===articleId); if(a) { setView(a.p+"_workflow__review__"+a.id); } }} />}
        {activeProp && !isWorkflow && <PropertyDashboard prop={activeProp} onStartWorkflow={(mode, article) => { if(mode==="review") setView(propId+"_workflow__review__"+article.id); else goToWorkflow(propId); }} goals={goals} dm={dm} bg={bg} card={card} border={border} text={text} muted={muted} mob={mob} />}
        {activeProp && isWorkflow  && <WorkflowView prop={activeProp} onBack={goBack} dm={dm} bg={bg} viewStr={view} mob={mob} />}
        </div>
      </div>
    </div>
  );
}
