/* ----------  5 · NEW INVOICE EDITOR  ---------- */
const NewInvoice = () => {
  const steps = [
    {n:"1", t:"Agency", s:"3 fields", on:false, done:false},
    {n:"2", t:"Client", s:"2 fields", on:false, done:false},
    {n:"3", t:"Items", s:"2 fields", on:true,  done:false},
    {n:"4", t:"Payment", s:"3 fields", on:false, done:false},
  ];

  return (
    <div className="wf paper-rose" style={{width:1480, height:1280}}>
      <TopNav active="" />
      <div style={{padding: "32px 56px 96px 56px"}}>
        <div className="row between" style={{alignItems:"flex-end", marginBottom: 28}}>
          <div>
            <div className="cap" style={{marginBottom: 10}}>STEP 3 OF 4 · ALEHANDRO STUDIOS</div>
            <h1 className="display chunky" style={{fontSize: 64, margin:0}}>
              New <span className="marker sky">invoice</span>
            </h1>
            <div className="cap" style={{marginTop: 8, color:"var(--ink-2)"}}>Create a GST-compliant invoice in minutes.</div>
          </div>
          <div className="row gap-12">
            <div className="btn ghost sm">⌫ CLOSE</div>
            <div className="btn ghost sm">⤓ SAVE DRAFT</div>
            <div className="btn primary sm">REVIEW & SEND →</div>
          </div>
        </div>

        <div className="row gap-24" style={{alignItems:"flex-start"}}>
          {/* Left rail */}
          <div className="col gap-16" style={{width: 260}}>
            <div className="box" style={{padding: "18px 20px"}}>
              <div className="cap" style={{marginBottom: 4}}>EDITOR PROGRESS</div>
              <div className="display" style={{fontSize: 22, marginBottom: 12}}>2 of 4 ready</div>
              <div style={{height: 6, background: "var(--paper-2)", border:"1.5px solid var(--rule)"}}>
                <div style={{width: "55%", height:"100%", background: "var(--hi)"}}/>
              </div>
            </div>

            <div className="col gap-8">
              {steps.map(st=>(
                <div key={st.n} className="box row gap-12" style={{
                  padding: "14px 16px",
                  alignItems:"center",
                  background: st.on ? "var(--hi)" : "var(--paper)",
                  borderColor: st.on ? "var(--ink)" : "var(--rule)",
                  boxShadow: st.on ? "3px 3px 0 var(--rule)" : "none",
                }}>
                  <div className="box center" style={{width:24, height:24, fontWeight:700, fontSize:11, background: st.on?"var(--ink)":"var(--paper)", color: st.on?"var(--paper)":"var(--ink)"}}>{st.n}</div>
                  <div style={{flex:1}}>
                    <div className="cap cap-strong" style={{fontSize:12}}>{st.t}</div>
                    <div className="cap" style={{color:"var(--ink-2)", marginTop:2}}>{st.s}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="box" style={{padding:"14px 16px", background:"#f7d0bd", borderColor:"var(--alert)"}}>
              <div className="cap cap-strong" style={{color:"var(--alert)", marginBottom: 4}}>⚠ NEXT BLOCKER</div>
              <div style={{fontSize: 11, color:"#7a2a10", lineHeight:1.5}}>
                Business / trade name, address line 1, agency state.
              </div>
            </div>

            <div className="box" style={{padding:"14px 16px"}}>
              <div className="cap" style={{marginBottom: 6}}>STATUS</div>
              <div className="display" style={{fontSize:22}}>10 left</div>
              <div className="cap" style={{color:"var(--ink-3)", marginTop:2}}>17% complete</div>
            </div>
          </div>

          {/* Center: form */}
          <div className="grow">
            <div className="box shadow" style={{padding: "28px 32px"}}>
              <div className="row between" style={{marginBottom: 6}}>
                <div className="row gap-12" style={{alignItems:"center"}}>
                  <div className="box fill-hi center" style={{width:38, height:38, fontSize:18}}>☰</div>
                  <div>
                    <div className="cap">STEP 3 · ITEMS</div>
                    <div className="display" style={{fontSize:30}}>Deliverables & rates</div>
                  </div>
                </div>
                <div className="pill alert">2 REQUIRED</div>
              </div>
              <div className="cap" style={{color:"var(--ink-2)", marginBottom: 22}}>Deliverables, quantities, and commercial rates.</div>

              <div className="cap cap-strong" style={{marginBottom: 8}}>PROJECT *</div>
              <div className="box" style={{padding: "14px 16px", marginBottom: 24, borderWidth:2, borderColor:"var(--ink)"}}>
                <span style={{fontSize: 13, color:"var(--ink-3)"}}>e.g. Villa renovation · phase 2</span>
              </div>

              <div className="box" style={{padding:"12px 16px", background:"#fdf6cc", borderColor:"#c5a93b", marginBottom: 22}}>
                <div className="row gap-8" style={{alignItems:"center"}}>
                  <div style={{fontSize:14}}>⚑</div>
                  <div style={{fontSize:11, color:"#5a4a10"}}>
                    <b>Revision policy</b> · 2 free rounds per deliverable. Extra rounds at 15% of item total.
                  </div>
                </div>
              </div>

              {/* Line item card */}
              <div className="box" style={{padding:"20px 22px", marginBottom: 16, position:"relative"}}>
                <div className="row between" style={{marginBottom: 12, alignItems:"center"}}>
                  <div className="cap cap-strong">LINE ITEM 1 · M1 · DISCOVERY</div>
                  <div className="row gap-8">
                    <div className="pill ghost" style={{fontSize:9}}>SAC · 998391</div>
                    <div className="cap" style={{cursor:"pointer", color:"var(--alert)"}}>✕ REMOVE</div>
                  </div>
                </div>

                <div className="row gap-12" style={{marginBottom: 12}}>
                  <div style={{flex: 1.4}}>
                    <div className="cap" style={{marginBottom:6}}>ITEM TYPE</div>
                    <div className="field"><span>UI / UX Design  ▼</span></div>
                  </div>
                  <div style={{flex: 2}}>
                    <div className="cap" style={{marginBottom:6}}>DESCRIPTION</div>
                    <div className="field"><span className="lbl">Product UI / UX design work</span></div>
                  </div>
                </div>
                <div className="row gap-12" style={{alignItems:"flex-end"}}>
                  <div style={{flex:1}}>
                    <div className="cap" style={{marginBottom:6}}>UNIT</div>
                    <div className="field"><span>Per screen  ▼</span></div>
                  </div>
                  <div style={{flex:1}}>
                    <div className="cap" style={{marginBottom:6}}>RATE / SCREEN</div>
                    <div className="field"><span className="money">₹ 12,500</span></div>
                  </div>
                  <div style={{flex:0.8}}>
                    <div className="cap" style={{marginBottom:6}}>SCREENS</div>
                    <div className="field"><span className="money">24</span></div>
                  </div>
                  <div style={{flex:1, textAlign:"right"}}>
                    <div className="cap" style={{marginBottom:6}}>TOTAL</div>
                    <div className="money" style={{fontSize:18}}>₹ 3,00,000</div>
                  </div>
                </div>

                <div className="note" style={{position:"absolute", right:-12, bottom:-6, transform:"rotate(6deg)"}}>
                  ← SAC auto-fills
                </div>
              </div>

              {/* Line item 2 */}
              <div className="box" style={{padding:"20px 22px", marginBottom: 16}}>
                <div className="row between" style={{marginBottom: 12, alignItems:"center"}}>
                  <div className="cap cap-strong">LINE ITEM 2 · M1 · DISCOVERY</div>
                  <div className="row gap-8">
                    <div className="pill ghost" style={{fontSize:9}}>SAC · 998313</div>
                  </div>
                </div>
                <div className="row gap-12" style={{alignItems:"flex-end"}}>
                  <div style={{flex:1.4}}><div className="cap" style={{marginBottom:6}}>ITEM TYPE</div><div className="field"><span>Brand consulting  ▼</span></div></div>
                  <div style={{flex:2}}><div className="cap" style={{marginBottom:6}}>DESCRIPTION</div><div className="field"><span>Stakeholder workshops + IA audit</span></div></div>
                  <div style={{flex:1}}><div className="cap" style={{marginBottom:6}}>HOURS</div><div className="field"><span className="money">28</span></div></div>
                  <div style={{flex:1, textAlign:"right"}}><div className="cap" style={{marginBottom:6}}>TOTAL</div><div className="money" style={{fontSize:18}}>₹ 1,12,000</div></div>
                </div>
              </div>

              <div className="box dashed center" style={{padding: 22, cursor:"pointer", marginBottom: 22}}>
                <div className="cap" style={{color:"var(--ink-2)"}}>+ Add line item</div>
              </div>

              <div className="box dashed center" style={{padding: 28, marginBottom: 24}}>
                <div className="col gap-4 center">
                  <div className="cap cap-strong">+ Add project milestone</div>
                  <div className="cap" style={{color:"var(--ink-3)"}}>4 of 5 milestones available</div>
                </div>
              </div>

              <div className="hr soft" style={{margin: "8px 0 18px"}}/>
              <div className="row between" style={{alignItems:"center"}}>
                <div className="cap">M1 SUBTOTAL · BEFORE TAX</div>
                <div className="money" style={{fontSize: 26}}>₹ 4,12,000</div>
              </div>

              <div className="row" style={{marginTop: 22, justifyContent:"space-between", alignItems:"center"}}>
                <div className="cap" style={{color:"var(--ink-3)"}}>← BACK TO CLIENT</div>
                <div className="btn primary">Continue to payment →</div>
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="col gap-16" style={{width: 320}}>
            <div className="box" style={{padding: "18px 20px"}}>
              <div className="row between" style={{marginBottom: 14}}>
                <div className="cap cap-strong">INVOICE DETAILS</div>
                <div className="cap" style={{color:"var(--ink-3)"}}>EDIT ▢</div>
              </div>
              {[
                ["INV #","INV-2026-8501"],
                ["DATE","2026-05-26"],
                ["DUE","2026-06-10"],
                ["PO #","—"],
                ["MILESTONE","M1 OF 5"],
              ].map(([l,v],i)=>(
                <div key={i} className="row between" style={{padding:"8px 0", borderBottom: i<4?"1px dashed var(--soft)":"none"}}>
                  <div className="cap">{l}</div>
                  <div style={{fontSize:11, fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>

            <div className="box" style={{padding: "18px 20px"}}>
              <div className="cap cap-strong" style={{marginBottom: 12}}>TOTALS</div>
              <div className="row between" style={{padding:"6px 0"}}>
                <div className="cap">SUBTOTAL</div><div className="money">₹ 4,12,000</div>
              </div>
              <div className="row between" style={{padding:"6px 0"}}>
                <div className="cap">CGST 9%</div><div className="money">₹ 37,080</div>
              </div>
              <div className="row between" style={{padding:"6px 0"}}>
                <div className="cap">SGST 9%</div><div className="money">₹ 37,080</div>
              </div>
              <div className="hr soft" style={{margin:"8px 0"}}/>
              <div className="row between" style={{padding:"10px 0", alignItems:"center"}}>
                <div className="cap cap-strong">GRAND TOTAL</div>
                <div className="money" style={{fontSize:22}}>₹ 4,86,160</div>
              </div>
              <div className="box fill-hi" style={{padding:"10px 12px", marginTop: 12}}>
                <div className="cap cap-strong" style={{fontSize:10}}>RCM · INACTIVE</div>
                <div className="cap" style={{marginTop:4}}>Domestic same-state → CGST + SGST</div>
              </div>
            </div>

            <div className="box dashed" style={{padding: "14px 16px"}}>
              <div className="cap cap-strong" style={{marginBottom:6}}>↗ ADVANCED TAX</div>
              <div style={{fontSize:11, color:"var(--ink-2)", lineHeight:1.5}}>
                Switch to IGST · enable LUT · toggle RCM for B2B reverse charge.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.NewInvoice = NewInvoice;
