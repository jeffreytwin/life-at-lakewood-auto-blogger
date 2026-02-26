import { useState } from "react";
import { PROPS } from "../data/properties";
import { LOGOS } from "../data/logos";
import { SM, TODAY, MONTH_DATA, CURRENT_MONTH_IDX } from "../data/constants";
import Pill from "./ui/Pill";

export default function CalendarView({ articles: ARTICLES = [], dm, bg, card, border, text, muted, goals = {}, onReviewChecklist, mob=false, onRefresh, refreshing=false }) {
  const [selDay, setSelDay]     = useState(null);
  const [filter, setFilter]     = useState("all");
  const [monthIdx, setMonthIdx] = useState(CURRENT_MONTH_IDX);

  const [mName, mYear, mDays, mStartDow, mMonth] = MONTH_DATA[monthIdx];
  const isCurrentMonth = monthIdx === CURRENT_MONTH_IDX;
  const todayNum = isCurrentMonth ? TODAY : -1;

  const filtered = filter === "all" ? ARTICLES : ARTICLES.filter(a => a.p === filter);
  // Filter to articles matching the displayed month/year, excluding drafts from the calendar
  const monthArts = filtered.filter(a => a.status !== "in_wix" && a.month === mMonth && a.year === mYear);
  const dayMap = {};
  monthArts.forEach(a => { if(!dayMap[a.day]) dayMap[a.day]=[]; dayMap[a.day].push(a); });

  const cells = [];
  for(let i=0;i<mStartDow;i++) cells.push(null);
  for(let d=1;d<=mDays;d++) cells.push(d);
  const weeks = [];
  for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));

  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const DOW_SHORT = ["S","M","T","W","T","F","S"];
  const selArts = selDay ? (dayMap[selDay]||[]) : [];

  const base = filtered.filter(a => a.status !== "in_wix" && a.month === mMonth && a.year === mYear);
  const pub   = base.filter(a=>a.status==="published").length;
  const sched = base.filter(a=>a.status==="scheduled").length;
  const total = base.length;

  // --- Mobile agenda: articles for displayed month sorted by day (excluding drafts) ---
  const agendaArts = filtered.filter(a => a.status !== "in_wix" && a.month === mMonth && a.year === mYear).sort((a,b)=>a.day-b.day);

  return (
    <div style={{ padding: mob ? "16px 12px" : "36px 44px", maxWidth:1400 }}>
      {/* Header row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: mob ? 16 : 20, flexWrap:"wrap", gap: mob ? 10 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap: mob ? 10 : 16 }}>
          <div style={{ display:"flex", alignItems:"center", gap: mob ? 6 : 8 }}>
            <button onClick={()=>{ setMonthIdx(i=>Math.max(0,i-1)); setSelDay(null); }} disabled={monthIdx===0}
              style={{ width: mob ? 32 : 30, height: mob ? 32 : 30, borderRadius:8, border:"1px solid #E5E7EB", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#374151", opacity:monthIdx===0?0.3:1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div style={{ textAlign:"center", minWidth: mob ? 110 : 140 }}>
              <p style={{ fontSize: mob ? 9 : 11, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#9CA3AF", margin:"0 0 2px" }}>Content Calendar</p>
              <h1 style={{ fontSize: mob ? 20 : 26, fontWeight:800, color:dm?"#F3F4F6":"#111827", fontFamily:"'Inter','DM Sans',system-ui,sans-serif", margin:0, lineHeight:1 }}>{mName} {mYear}</h1>
            </div>
            <button onClick={()=>{ setMonthIdx(i=>Math.min(MONTH_DATA.length-1,i+1)); setSelDay(null); }} disabled={monthIdx===MONTH_DATA.length-1}
              style={{ width: mob ? 32 : 30, height: mob ? 32 : 30, borderRadius:8, border:"1px solid #E5E7EB", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#374151", opacity:monthIdx===MONTH_DATA.length-1?0.3:1 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
        <div style={{ display:"flex", gap: mob ? 4 : 6, flexWrap:"wrap" }}>
          {[{id:"all",label:"All Sites",color:"#374151"}, ...Object.values(PROPS).map(p=>({id:p.id,label: mob ? p.short.split(" ")[0] : p.short,color:p.accent}))].map(f=>(
            <button key={f.id} onClick={()=>{ setFilter(f.id); setSelDay(null); }}
              style={{ padding: mob ? "5px 8px" : "6px 12px", borderRadius:20, fontSize: mob ? 10 : 11, fontWeight:700, cursor:"pointer", border:"none", background:filter===f.id?f.color:"#F3F4F6", color:filter===f.id?"#fff":"#6B7280" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display:"flex", gap: mob ? 6 : 10, marginBottom: mob ? 14 : 22, flexWrap:"wrap" }}>
        {[
          { label:`${pub} Published`,      ...SM.published },
          { label:`${sched} Scheduled`,    ...SM.scheduled  },
          { label:`${total} Total`,        dot:"#8B5CF6", bg:"#F5F3FF", tx:"#6D28D9" },
        ].map(item=>(
          <div key={item.label} style={{ display:"flex", alignItems:"center", gap:6, padding: mob ? "4px 10px" : "5px 12px", background:item.bg, borderRadius:20, fontSize: mob ? 11 : 12, fontWeight:700, color:item.tx }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:item.dot }} />
            {item.label}
          </div>
        ))}
        {total === 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, padding: mob ? "4px 10px" : "5px 12px", background:"#F3F4F6", borderRadius:20, fontSize: mob ? 11 : 12, color:"#9CA3AF" }}>
            No article data for {mName} {mYear}
          </div>
        )}
      </div>

      {mob ? (
        /* ====== MOBILE: Compact calendar + agenda list ====== */
        <div>
          {/* Compact mini-calendar */}
          <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"14px 10px", marginBottom:16 }}>
            {/* Day of week headers */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:6 }}>
              {DOW_SHORT.map((d,i)=><div key={d+i} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#9CA3AF", padding:"2px 0" }}>{d}</div>)}
            </div>
            {/* Week rows */}
            {weeks.map((week,wi)=>(
              <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
                {week.map((day,di)=>{
                  if(!day) return <div key={"e"+wi+di} style={{ minHeight:40 }} />;
                  const arts = dayMap[day]||[];
                  const isToday = day===todayNum;
                  const isSel   = selDay===day;
                  const isPast  = isCurrentMonth ? day < TODAY : false;
                  return (
                    <div key={day} onClick={()=>setSelDay(isSel?null:day)}
                      style={{
                        minHeight:40, borderRadius:8, padding:"4px 2px",
                        border: isSel ? "2px solid #111827" : isToday ? "2px solid #374151" : "2px solid transparent",
                        background: isSel ? "#111827" : "#FAFAFA",
                        cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                        opacity: isPast && !isToday ? 0.5 : 1
                      }}>
                      <div style={{ fontSize:13, fontWeight:700, color: isSel ? "#fff" : isToday ? "#111827" : isPast ? "#9CA3AF" : "#374151", lineHeight:1, marginBottom: arts.length > 0 ? 3 : 0 }}>
                        {day}
                      </div>
                      {arts.length > 0 && (
                        <div style={{ display:"flex", gap:2, justifyContent:"center", flexWrap:"wrap" }}>
                          {arts.slice(0,3).map(a => {
                            const sm = SM[a.status];
                            return <span key={a.id} style={{ width:5, height:5, borderRadius:"50%", background: isSel ? "#fff" : sm.dot }} />;
                          })}
                          {arts.length > 3 && <span style={{ fontSize:7, color: isSel ? "rgba(255,255,255,0.5)" : "#9CA3AF", fontWeight:700 }}>+</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected day detail or agenda */}
          {selDay ? (
            <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, overflow:"hidden", marginBottom:16 }}>
              <div style={{ padding:"14px 16px", background:"#F9FAFB", borderBottom:"1px solid #F3F4F6" }}>
                <div style={{ fontSize:17, fontWeight:800, color:"#111827" }}>{mName} {selDay}</div>
                <div style={{ fontSize:12, color:"#6B7280" }}>{selArts.length} article{selArts.length!==1?"s":""}</div>
              </div>
              {selArts.length > 0 ? selArts.map((a,i)=>{
                const pr=PROPS[a.p];
                return (
                  <div key={a.id} style={{ padding:"14px 16px", borderBottom:i<selArts.length-1?"1px solid #F3F4F6":"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                      <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:18, height:18, borderRadius:"50%", objectFit:"cover" }} />
                      <span style={{ fontSize:12, fontWeight:700, color:pr.color }}>{pr.short}</span>
                      <Pill status={a.status} />
                    </div>
                    <div style={{ fontSize:14, fontWeight:700, color:"#111827", lineHeight:1.4, marginBottom:4 }}>{a.title}</div>
                    <div style={{ fontSize:12, color:"#9CA3AF", marginBottom:10 }}>{a.kw}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {a.status === "published" && (
                        <a href={"https://"+pr.blog+"/"+a.title.toLowerCase().replace(/\s+/g,"-")} target="_blank" rel="noreferrer"
                          style={{ fontSize:12, fontWeight:700, color:pr.accent, textDecoration:"none" }}>
                          View Article
                        </a>
                      )}
                      {a.status === "scheduled" && (
                        <a href={pr.wixDash} target="_blank" rel="noreferrer"
                          style={{ fontSize:12, fontWeight:700, color:pr.accent, textDecoration:"none" }}>
                          View Scheduled
                        </a>
                      )}
                      {a.status === "in_wix" && (
                        <>
                          <a href={pr.wixDash} target="_blank" rel="noreferrer"
                            style={{ fontSize:12, fontWeight:700, color:pr.accent, textDecoration:"none" }}>
                            Open in Wix
                          </a>
                          <button onClick={()=>onReviewChecklist && onReviewChecklist(a.id)}
                            style={{ fontSize:12, fontWeight:700, color:"#22C55E", background:"none", border:"none", cursor:"pointer", padding:0 }}>
                            Review Checklist
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ padding:"24px 16px", textAlign:"center" }}>
                  <div style={{ fontSize:13, color:"#9CA3AF" }}>No articles on this day</div>
                </div>
              )}
            </div>
          ) : (
            /* Agenda list - all articles this month */
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10, paddingLeft:4 }}>
                {agendaArts.length > 0 ? `${mName} Articles` : `No articles in ${mName} ${mYear}`}
              </div>
              {agendaArts.length > 0 ? agendaArts.map(a => {
                const pr = PROPS[a.p];
                return (
                  <div key={a.id} onClick={()=>setSelDay(a.day)} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", background:"#fff", border:"1px solid #E5E7EB", borderRadius:12, marginBottom:8, cursor:"pointer" }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:pr.light, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontSize:14, fontWeight:800, color:pr.color }}>{a.day}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:pr.color }}>{pr.short}</span>
                        <Pill status={a.status} />
                      </div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#111827", lineHeight:1.35, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.title}</div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ padding:"20px", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
                  Tap a day above to see details, or navigate to a month with data.
                </div>
              )}
            </div>
          )}

          {/* Goals progress - mobile */}
          <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"16px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
              Monthly Goals
            </div>
            {Object.values(PROPS).map(pr=>{
              const done = ARTICLES.filter(a=>a.p===pr.id && (a.status==="published"||a.status==="scheduled") && a.month === mMonth && a.year === mYear).length;
              const goal = goals[pr.id] || 4;
              const pct  = Math.min(100, Math.round((done/goal)*100));
              const over = done >= goal;
              return (
                <div key={pr.id} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                    <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:20, height:20, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                    <span style={{ fontSize:12, fontWeight:700, color:"#111827", flex:1 }}>{pr.short}</span>
                    <span style={{ fontSize:12, fontWeight:800, color: over ? "#22C55E" : pr.color }}>{done}/{goal}</span>
                  </div>
                  <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background: over ? "#22C55E" : pr.accent, borderRadius:3, transition:"width 0.3s" }} />
                  </div>
                  {over && <div style={{ fontSize:10, color:"#22C55E", fontWeight:700, marginTop:3 }}>Goal reached!</div>}
                </div>
              );
            })}
          </div>
          {/* Sync Wix - mobile */}
          {onRefresh && (
            <button onClick={onRefresh} disabled={refreshing}
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"10px", marginTop:12, background:"#fff", border:"1px solid #E5E7EB", borderRadius:10, fontSize:12, fontWeight:700, color:refreshing?"#9CA3AF":"#374151", cursor:refreshing?"not-allowed":"pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:refreshing?"spin 0.7s linear infinite":"none" }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
              {refreshing ? "Syncing…" : "Sync Wix Data"}
            </button>
          )}
        </div>
      ) : (
        /* ====== DESKTOP: Full calendar grid + right panel ====== */
        <div style={{ display:"flex", gap:24 }}>
          {/* Calendar grid */}
          <div style={{ flex:1 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:6 }}>
              {DOW.map(d=><div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:"#9CA3AF", padding:"4px 0" }}>{d}</div>)}
            </div>
            {weeks.map((week,wi)=>(
              <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:6 }}>
                {week.map((day,di)=>{
                  if(!day) return <div key={"e"+wi+di} style={{ minHeight:110 }} />;
                  const arts = dayMap[day]||[];
                  const isToday = day===todayNum;
                  const isPast  = isCurrentMonth ? day < TODAY : false;
                  const isSel   = selDay===day;
                  return (
                    <div key={day} onClick={()=>setSelDay(isSel?null:day)}
                      style={{ minHeight:110, borderRadius:10, padding:"10px 9px 8px", border:`2px solid ${isSel?(dm?"#60A5FA":"#111827"):isToday?(dm?"#64748B":"#374151"):(dm?"#334155":"#E5E7EB")}`, background:isSel?(dm?"#1E3A5F":"#111827"):(dm?"#1E293B":"#fff"), cursor:"pointer", opacity:isPast&&!isToday?0.72:1, transition:"border-color 0.13s" }}
                      onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.borderColor=dm?"#64748B":"#9CA3AF"; }}
                      onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.borderColor=isToday?(dm?"#64748B":"#374151"):(dm?"#334155":"#E5E7EB"); }}
                    >
                      <div style={{ fontSize:14, fontWeight:800, marginBottom:6, display:"flex", alignItems:"center", gap:4, color:isSel?"#fff":isToday?(dm?"#F1F5F9":"#111827"):isPast?(dm?"#64748B":"#9CA3AF"):(dm?"#CBD5E1":"#374151") }}>
                        {isToday && !isSel && <span style={{ width:7, height:7, borderRadius:"50%", background:"#EF4444", display:"inline-block" }} />}
                        {day}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {arts.slice(0,3).map(a=>{ const pr=PROPS[a.p]; const sm=SM[a.status];
                          return (
                            <div key={a.id} style={{ borderRadius:6, padding:"4px 6px", background:isSel?"rgba(255,255,255,0.18)":(dm?"rgba(255,255,255,0.08)":pr.light), display:"flex", alignItems:"center", gap:5 }}>
                              <span style={{ width:6, height:6, borderRadius:"50%", background:isSel?"#fff":sm.dot, flexShrink:0 }} />
                              <span style={{ fontSize:10, fontWeight:700, color:isSel?"#fff":pr.color, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{pr.short}</span>
                            </div>
                          );
                        })}
                        {arts.length>3 && <div style={{ fontSize:10, color:isSel?"rgba(255,255,255,0.5)":"#9CA3AF", fontWeight:700, paddingLeft:2 }}>+{arts.length-3} more</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right panel */}
          <div style={{ width:320, flexShrink:0, display:"flex", flexDirection:"column", gap:14 }}>
            {/* Day detail card */}
            <div style={{ background:dm?"#1E293B":"#fff", border:`1px solid ${dm?"#334155":"#E5E7EB"}`, borderRadius:14, overflow:"hidden", minHeight:200 }}>
              {selDay && selArts.length > 0 ? (
                <>
                  <div style={{ padding:"16px 20px", background:dm?"#1E293B":"#F9FAFB", borderBottom:`1px solid ${dm?"#334155":"#F3F4F6"}` }}>
                    <div style={{ fontSize:20, fontWeight:800, color:dm?"#F1F5F9":"#111827", fontFamily:"'Inter','DM Sans',system-ui,sans-serif" }}>{mName} {selDay}</div>
                    <div style={{ fontSize:12, color:"#6B7280" }}>{selArts.length} article{selArts.length>1?"s":""}</div>
                  </div>
                  {selArts.map((a,i)=>{
                    const pr=PROPS[a.p];
                    return (
                      <div key={a.id} style={{ padding:"14px 20px", borderBottom:i<selArts.length-1?`1px solid ${dm?"#334155":"#F3F4F6"}`:"none" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                          <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:18, height:18, borderRadius:"50%", objectFit:"cover" }} />
                          <span style={{ fontSize:12, fontWeight:700, color:pr.color }}>{pr.short}</span>
                          <Pill status={a.status} />
                        </div>
                        <div style={{ fontSize:14, fontWeight:700, color:dm?"#F1F5F9":"#111827", lineHeight:1.4, marginBottom:4 }}>{a.title}</div>
                        <div style={{ fontSize:11, color:dm?"#94A3B8":"#9CA3AF", marginBottom:8 }}>{a.kw}</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {a.status === "published" && (
                            <a href={"https://"+pr.blog+"/"+a.title.toLowerCase().replace(/\s+/g,"-")} target="_blank" rel="noreferrer"
                              style={{ fontSize:11, fontWeight:700, color:pr.accent, textDecoration:"none", padding:"5px 12px", background:pr.light, borderRadius:6 }}>
                              View Article
                            </a>
                          )}
                          {a.status === "scheduled" && (
                            <a href={pr.wixDash} target="_blank" rel="noreferrer"
                              style={{ fontSize:11, fontWeight:700, color:pr.accent, textDecoration:"none", padding:"5px 12px", background:pr.light, borderRadius:6 }}>
                              View Scheduled
                            </a>
                          )}
                          {a.status === "in_wix" && (
                            <>
                              <a href={pr.wixDash} target="_blank" rel="noreferrer"
                                style={{ fontSize:11, fontWeight:700, color:pr.accent, textDecoration:"none", padding:"5px 12px", background:pr.light, borderRadius:6 }}>
                                Open in Wix
                              </a>
                              <button onClick={()=>onReviewChecklist && onReviewChecklist(a.id)}
                                style={{ fontSize:11, fontWeight:700, color:"#22C55E", background:"#F0FDF4", border:"none", cursor:"pointer", padding:"5px 12px", borderRadius:6 }}>
                                Review Checklist
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div style={{ padding:"36px 24px", textAlign:"center" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>📅</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#6B7280", marginBottom:6 }}>
                    {selDay ? "No articles this day" : "Click any day to see details"}
                  </div>
                  <div style={{ fontSize:12, color:"#9CA3AF", lineHeight:1.5 }}>
                    {total > 0 ? "Select a highlighted day to view scheduled content" : `No published or scheduled articles in ${mName} ${mYear}.`}
                  </div>
                </div>
              )}
            </div>

            {/* Status legend */}
            <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"16px 20px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Status Legend</div>
              {Object.entries(SM).filter(([k])=>k!=="in_wix").map(([k,m])=>(
                <div key={k} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:m.dot, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:"#374151", fontWeight:600 }}>{m.label}</span>
                </div>
              ))}
            </div>

            {/* Articles goal progress */}
            <div style={{ background:"#fff", border:"1px solid #E5E7EB", borderRadius:14, padding:"16px 20px" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
                Monthly Goals
              </div>
              {Object.values(PROPS).map(pr=>{
                const done = ARTICLES.filter(a=>a.p===pr.id && (a.status==="published"||a.status==="scheduled") && a.month === mMonth && a.year === mYear).length;
                const goal = goals[pr.id] || 4;
                const pct  = Math.min(100, Math.round((done/goal)*100));
                const over = done >= goal;
                return (
                  <div key={pr.id} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                      <img src={LOGOS[pr.id]} alt={pr.short} style={{ width:20, height:20, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      <span style={{ fontSize:12, fontWeight:700, color:"#111827", flex:1 }}>{pr.short}</span>
                      <span style={{ fontSize:12, fontWeight:800, color: over ? "#22C55E" : pr.color }}>{done}/{goal}</span>
                    </div>
                    <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background: over ? "#22C55E" : pr.accent, borderRadius:3, transition:"width 0.3s" }} />
                    </div>
                    {over && <div style={{ fontSize:10, color:"#22C55E", fontWeight:700, marginTop:3 }}>Goal reached!</div>}
                  </div>
                );
              })}
              <div style={{ fontSize:10, color:"#D1D5DB", marginTop:4 }}>Goals set in Account → Monthly Goals</div>
            </div>

            {/* Sync Wix - desktop */}
            {onRefresh && (
              <button onClick={onRefresh} disabled={refreshing}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"10px 16px", background:"#fff", border:"1px solid #E5E7EB", borderRadius:10, fontSize:12, fontWeight:700, color:refreshing?"#9CA3AF":"#374151", cursor:refreshing?"not-allowed":"pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:refreshing?"spin 0.7s linear infinite":"none" }}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                {refreshing ? "Syncing…" : "Sync Wix Data"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
