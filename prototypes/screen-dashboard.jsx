/* ----------  2 · DASHBOARD  ---------- */
const Dashboard = () => {
  const projects = [
    {n:"Ruhnika · Bangalore", t:"RUHNIKA PROJECT", s:"DRAFT", side:"butter"},
    {n:"CKCCC · Bangalore", t:"CKCCC PROJECT", s:"COMPLETE", side:"grass"},
    {n:"CKCCC · Bangalore", t:"CKCCC PROJECT", s:"REVISION", side:"coral"},
    {n:"Alehandro · Bangalore", t:"MEGA PROJECT", s:"LIVE · M3", side:"hi", active:true},
    {n:"CKCCC · Bangalore", t:"BKB PROJECT", s:"ACTIVE", side:"sky"},
    {n:"Lazypanda · Mumbai", t:"LAZYPANDA PROJECT", s:"AWAITING", side:"lav"},
  ];

  const milestones = [
    {n:"M1", t:"Discovery phase", s:"settled", amt:"₹1,84,000", c:"var(--ink)"},
    {n:"M2", t:"IA & wireframes", s:"settled", amt:"₹2,24,500", c:"var(--ink)"},
    {n:"M3", t:"Prototyping", s:"live", amt:"₹4,54,356", c:"var(--hi)"},
    {n:"M4", t:"Delivery", s:"pending", amt:"₹3,12,000", c:"var(--paper)"},
    {n:"M5", t:"Project close", s:"pending", amt:"—", c:"var(--paper)"},
  ];

  const sideMap = {
    hi:"var(--hi)", sky:"var(--sky)", coral:"var(--coral)",
    butter:"var(--butter)", grass:"var(--grass)", lav:"var(--lav)"
  };

  return (
    <div className="wf paper-sky" style={{width:1480, height:1080}}>
      <TopNav active="Dashboard" />
      <div className="row" style={{height: "calc(100% - 65px)"}}>
        {/* Left rail: project list */}
        <div className="col" style={{width:340, borderRight:"2px solid var(--rule)", padding:"22px", background:"var(--paper)"}}>
          <div className="row between" style={{marginBottom: 14, alignItems:"center"}}>
            <div className="display chunky" style={{fontSize: 22}}>Projects <span style={{color:"var(--ink-3)"}}>10</span></div>
            <div className="cap">⌃F</div>
          </div>
          <div className="btn primary" style={{width:"100%", justifyContent:"center", padding:"14px", marginBottom: 18, boxShadow:"4px 4px 0 var(--rule)"}}>+ New invoice</div>

          <div className="row gap-6" style={{marginBottom: 14, flexWrap:"wrap"}}>
            <div className="pill hi" style={{fontSize:9, padding:"4px 10px"}}>All · 10</div>
            <div className="pill sky" style={{fontSize:9, padding:"4px 10px"}}>Active · 3</div>
            <div className="pill alert" style={{fontSize:9, padding:"4px 10px"}}>At risk · 1</div>
            <div className="pill butter" style={{fontSize:9, padding:"4px 10px"}}>Awaiting · 2</div>
          </div>

          <div className="field" style={{marginBottom: 14}}>
            <span className="lbl">⌕ Search projects…</span>
          </div>

          <div className="col gap-10" style={{overflow:"hidden", flex:1}}>
            {projects.map((p,i)=>(
              <div key={i} className="box" style={{
                padding:"14px 16px 14px 18px",
                position:"relative",
                background: p.active ? "var(--paper-2)" : "var(--paper)",
                borderColor: "var(--rule)",
                boxShadow: p.active ? "4px 4px 0 var(--rule)" : "none",
                overflow:"hidden",
              }}>
                <div style={{
                  position:"absolute", left:0, top:0, bottom:0, width: 8,
                  background: sideMap[p.side],
                  borderRight:"1.5px solid var(--rule)"
                }}/>
                <div style={{paddingLeft: 4}}>
                  <div className="cap cap-strong" style={{fontSize:12, marginBottom:6}}>{p.t}</div>
                  <div className="cap" style={{marginBottom:8}}>{p.n}</div>
                  <div className="row between" style={{alignItems:"center"}}>
                    <div className={"pill " + (p.side==="coral"?"alert":p.side==="grass"?"ok":p.side==="hi"?"hi":p.side==="butter"?"butter":p.side==="lav"?"lav":"sky")}
                      style={{fontSize:8, padding:"3px 8px"}}>{p.s}</div>
                    {p.active && <div className="cap cap-strong" style={{color:"var(--ok)"}}>→</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main: project detail */}
        <div className="col grow" style={{padding:"32px 40px", overflow:"hidden", position:"relative"}}>
          {/* Floating sticker */}
          <div className="sticker" style={{position:"absolute", top:20, right:40, background:"var(--rose)", transform:"rotate(6deg)", zIndex:3}}>
            ✦ 11-day avg payment
          </div>

          <div className="row between" style={{alignItems:"flex-start", marginBottom: 24}}>
            <div>
              <div className="row gap-6" style={{marginBottom: 12, alignItems:"center"}}>
                <div className="pill ok"><span className="spark"/> LIVE</div>
                <div className="pill sky">M3 OF 5</div>
                <div className="pill" style={{background:"#fff"}}>MEGA-2026-014</div>
              </div>
              <h1 className="display chunky" style={{fontSize: 56, margin:"4px 0 6px 0"}}>
                Mega project for<br/><span className="marker rose">Alehandro</span>
              </h1>
              <div className="cap" style={{marginTop: 6}}>CLIENT · ALEHANDRO STUDIOS · BANGALORE</div>
            </div>
            <div className="row gap-8" style={{marginTop: 8}}>
              <div className="btn ghost sm">⤓ EXPORT</div>
              <div className="btn ghost sm">⋯</div>
              <div className="btn primary sm" style={{boxShadow:"3px 3px 0 var(--rule)"}}>FINALIZE M3 →</div>
            </div>
          </div>

          {/* Stat row — full color */}
          <div className="row gap-12" style={{marginBottom: 28}}>
            {[
              ["Project total","₹14,68,856","5 milestones","var(--paper)","var(--ink)","none"],
              ["Collected","₹4,08,500","2 settled","var(--grass)","#fff","4px 4px 0 var(--rule)"],
              ["In flight","₹4,54,356","M3 · sent","var(--hi)","var(--ink)","4px 4px 0 var(--rule)"],
              ["At risk","₹0","—","var(--paper)","var(--ink)","none"],
            ].map(([l,v,s,bg,fg,sh],i)=>(
              <div key={i} className="box" style={{flex:1, padding:"16px 18px", background: bg, color: fg, boxShadow: sh}}>
                <div className="cap" style={{marginBottom: 6, color: fg, opacity: .85}}>{l}</div>
                <div className="money" style={{fontSize: 26, marginBottom: 4, fontWeight:700}}>{v}</div>
                <div className="cap" style={{color: fg, opacity:.75}}>{s}</div>
              </div>
            ))}
          </div>

          {/* Milestone timeline */}
          <div className="row between" style={{marginBottom: 14, alignItems:"center"}}>
            <div className="cap cap-strong">MILESTONE TIMELINE</div>
            <div className="row gap-8">
              <div className="row gap-6" style={{alignItems:"center"}}>
                <div style={{width:10,height:10,background:"var(--ink)",border:"1.5px solid var(--rule)"}}/>
                <div className="cap">SETTLED</div>
              </div>
              <div className="row gap-6" style={{alignItems:"center"}}>
                <div style={{width:10,height:10,background:"var(--hi)",border:"1.5px solid var(--rule)"}}/>
                <div className="cap">LIVE</div>
              </div>
              <div className="row gap-6" style={{alignItems:"center"}}>
                <div style={{width:10,height:10,background:"var(--paper)",border:"1.5px dashed var(--ink-3)"}}/>
                <div className="cap">PENDING</div>
              </div>
            </div>
          </div>
          <div className="box" style={{padding: "24px 26px", marginBottom: 24, boxShadow:"4px 4px 0 var(--rule)"}}>
            <div className="row" style={{alignItems:"flex-start"}}>
              {milestones.map((m,i)=>(
                <div key={i} style={{flex:1, position:"relative"}}>
                  <div className="row" style={{alignItems:"center"}}>
                    <div className="box center" style={{
                      width:38, height:38, borderRadius:"50%",
                      background: m.c,
                      color: m.s==="settled" ? "var(--paper)" : "var(--ink)",
                      fontWeight:800, fontSize:12,
                      borderColor:"var(--rule)",
                      borderWidth: 2,
                      boxShadow: m.s==="live" ? "3px 3px 0 var(--rule)" : "none",
                      borderStyle: m.s==="pending"?"dashed":"solid",
                    }}>
                      {m.s==="settled" ? "✓" : m.n}
                    </div>
                    {i<milestones.length-1 && (
                      <div style={{
                        flex:1, height:0,
                        borderTop: m.s==="settled" ? "2.5px solid var(--ink)" : "2px dashed var(--ink-3)"
                      }}/>
                    )}
                  </div>
                  <div style={{paddingTop: 14, paddingRight: 16}}>
                    <div className="cap cap-strong" style={{fontSize:11, marginBottom: 4}}>{m.n} · {m.t}</div>
                    <div className="money" style={{fontSize: 16, fontWeight:700}}>{m.amt}</div>
                    <div className="cap" style={{marginTop:6, color: m.s==="live"?"var(--ok)":"var(--ink-3)"}}>
                      {m.s.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active milestone detail */}
          <div className="row gap-20" style={{flex:1, minHeight:0}}>
            <div className="box grow" style={{padding: "22px 26px", background:"var(--paper)", boxShadow:"4px 4px 0 var(--hi)"}}>
              <div className="row between" style={{marginBottom: 18, alignItems:"flex-start"}}>
                <div>
                  <div className="row gap-6" style={{marginBottom: 8}}>
                    <div className="pill hi"><span className="spark"/> ACTIVE NOW</div>
                  </div>
                  <div className="display chunky" style={{fontSize: 28}}>M3 · Prototyping</div>
                  <div className="cap" style={{marginTop: 6}}>INV-2026-1230 · DUE 13 / 06 / 2026</div>
                </div>
                <div className="row gap-8">
                  <div className="btn primary sm">FINALIZE & SEND</div>
                  <div className="btn ghost sm">EDIT</div>
                </div>
              </div>
              <div className="hr soft" style={{margin:"4px 0 14px"}}/>
              <div className="cap" style={{marginBottom: 10}}>LINE ITEMS · 3</div>
              {[
                ["MEP coordination drawings","163 × ₹84","₹13,692","var(--sky)"],
                ["Pool & water feature design","38 × ₹11,000","₹4,18,000","var(--lav)"],
                ["Infographic with data viz","73 × ₹66","₹4,818","var(--coral)"],
              ].map(([d,q,t,c],i)=>(
                <div key={i} className="row between" style={{padding:"10px 0", borderBottom: i<2?"1px dashed var(--soft)":"none", alignItems:"center"}}>
                  <div className="row gap-10" style={{alignItems:"center"}}>
                    <div style={{width:12, height:12, borderRadius:"50%", background:c, border:"1.5px solid var(--rule)"}}/>
                    <div style={{fontSize:13, fontWeight:600}}>{d}</div>
                  </div>
                  <div className="row gap-32" style={{alignItems:"center"}}>
                    <div className="cap">{q}</div>
                    <div className="money" style={{fontSize:14, minWidth:90, textAlign:"right", fontWeight:700}}>{t}</div>
                  </div>
                </div>
              ))}
              <div className="hr" style={{margin:"14px 0"}}/>
              <div className="row between" style={{alignItems:"center"}}>
                <div className="cap">M3 SUBTOTAL · GST 18%</div>
                <div className="money" style={{fontSize: 24, fontWeight:700}}>₹4,54,356</div>
              </div>
            </div>

            {/* Right: activity */}
            <div className="col gap-12" style={{width: 280}}>
              <div className="cap cap-strong">ACTIVITY</div>
              {[
                ["✎","M3 line item edited","2h ago","sky"],
                ["✓","M2 marked settled","yesterday","grass"],
                ["✉","Client opened M2 invoice","2 days","lav"],
                ["⚠","Revision requested on M1","5 days","coral"],
                ["§","MSA accepted by client","12 days","butter"],
              ].map(([ic,t,when,k],i)=>(
                <div key={i} className="row gap-10" style={{alignItems:"flex-start"}}>
                  <div className="box center" style={{
                    width:28, height:28, fontSize:13,
                    background: k==="grass"?"var(--grass)": k==="coral"?"var(--coral)": k==="sky"?"var(--sky)": k==="lav"?"var(--lav)": k==="butter"?"var(--butter)":"var(--paper)",
                    color: (k==="grass"||k==="coral"||k==="sky"||k==="lav")?"#fff":"var(--ink)",
                    fontWeight:700,
                  }}>{ic}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12, fontWeight:500}}>{t}</div>
                    <div className="cap" style={{color:"var(--ink-3)", marginTop:2}}>{when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
