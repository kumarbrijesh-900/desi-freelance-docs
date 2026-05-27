/* ----------  6 · INVOICE PREVIEW & SHARE  ---------- */
const InvoicePreview = () => {
  const templates = [
    {n:"Classic",   sw:["#14110d","#f5f0e6","#14110d"], on:true},
    {n:"Editorial", sw:["#1a2434","#ece5d5","#14110d"]},
    {n:"Studio Pro",sw:["#2c4ad9","#f0eee9","#14110d"]},
    {n:"Midnight",  sw:["#7e6df7","#1a1428","#dde2f5"]},
    {n:"Terracotta",sw:["#c5582b","#f5eadc","#3a1a08"]},
    {n:"Swiss Grid",sw:["#d4444f","#eef5ee","#1a3a5a"]},
    {n:"Mono",      sw:["#14110d","#f5f0e6","#3acc7a"]},
    {n:"Sakura",    sw:["#d63a5e","#f5f0e6","#14110d"]},
  ];

  return (
    <div className="wf" style={{width:1480, height:1280}}>
      <TopNav active="Invoices" />

      <div style={{padding: "28px 56px"}}>
        <div className="row between" style={{alignItems:"center", marginBottom: 20}}>
          <div className="row gap-12" style={{alignItems:"center"}}>
            <div className="pill" style={{background:"#fdf6cc", borderColor:"#c5a93b"}}>⚐ AWAITING CLIENT</div>
            <div className="display" style={{fontSize: 36}}>INV-2026-9998</div>
            <div className="cap">⎘ COPY LINK</div>
          </div>
          <div className="row gap-10">
            <div className="btn ghost sm">← EDIT INVOICE</div>
            <div className="btn ghost sm">⎙ PRINT</div>
            <div className="btn ghost sm">⤓ EXPORT PDF</div>
            <div className="btn primary sm">SHARE INVOICE ↗</div>
          </div>
        </div>

        {/* Lock banner */}
        <div className="box shadow row" style={{padding: "18px 22px", marginBottom: 24, background:"#fdf6cc", borderColor:"#c5a93b", alignItems:"center"}}>
          <div style={{fontSize:24, marginRight:16}}>🔒</div>
          <div style={{flex:1}}>
            <div className="cap cap-strong" style={{fontSize:13, letterSpacing:".08em", marginBottom: 4}}>INVOICE LOCKED · READ ONLY</div>
            <div style={{fontSize:12, color:"#5a4a10"}}>
              Awaiting client response — sharing again would duplicate the email. Last sent 25 May 2026 · 09:22.
            </div>
          </div>
          <div className="btn sm" style={{background:"var(--ink)", color:"var(--paper)", boxShadow:"3px 3px 0 #c5a93b"}}>RESEND EMAIL</div>
        </div>

        <div className="row gap-24" style={{alignItems:"flex-start"}}>
          {/* Left: invoice document */}
          <div style={{flex:1}}>
            <div className="row gap-8" style={{marginBottom: 14, alignItems:"center"}}>
              <div className="cap">ZOOM</div>
              <div className="box center" style={{width:28,height:24}}>−</div>
              <div className="box" style={{padding:"4px 10px", fontSize:11}}>70%</div>
              <div className="box center" style={{width:28,height:24}}>+</div>
              <div className="grow"/>
              <div className="cap">PAGE 1 / 2</div>
            </div>

            <div className="box shadow" style={{padding: 36, background:"var(--paper)", minHeight: 820}}>
              {/* Doc header */}
              <div style={{borderTop:"3px solid var(--alert)", marginBottom: 22}}/>
              <div className="row between" style={{marginBottom: 28}}>
                <div>
                  <div className="cap" style={{color:"var(--alert)", marginBottom: 8}}>INVOICE FROM</div>
                  <div className="display" style={{fontSize: 28}}>BKB Kumar</div>
                  <div style={{fontSize:11, color:"var(--ink-2)", marginTop:6, lineHeight:1.55}}>
                    D-207, Tower D2, 2nd floor<br/>
                    Godrej e-city, Bangalore<br/>
                    Karnataka · 560100
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="cap" style={{color:"var(--alert)", marginBottom: 8}}>NUMBER</div>
                  <div className="display" style={{fontSize: 24}}>INV-2026-9998</div>
                  <div className="row gap-24" style={{marginTop: 14, fontSize:11}}>
                    <div className="col gap-2"><div className="cap">DATE</div><div>25 May 2026</div></div>
                    <div className="col gap-2"><div className="cap">DUE</div><div>22 Jul 2026</div></div>
                    <div className="col gap-2"><div className="cap">TERMS</div><div>Net 58</div></div>
                  </div>
                </div>
              </div>

              <div className="hr" style={{background:"var(--alert)", height:1}}/>

              <div className="row gap-32" style={{marginTop: 20, marginBottom: 26}}>
                <div style={{flex:1}}>
                  <div className="cap" style={{color:"var(--alert)", marginBottom: 6}}>SENDER</div>
                  <div style={{fontWeight:700, fontSize:13}}>BKB Kumar</div>
                  <div style={{fontSize:11, color:"var(--ink-2)", marginTop: 4, lineHeight:1.55}}>
                    D-207, Tower D2 · Godrej e-city<br/>Bangalore, Karnataka · 560100
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div className="cap" style={{color:"var(--alert)", marginBottom: 6}}>RECIPIENT</div>
                  <div style={{fontWeight:700, fontSize:13}}>Alehandro Studios</div>
                  <div style={{fontSize:11, color:"var(--ink-2)", marginTop: 4, lineHeight:1.55}}>
                    207, Tower D2 · Godrej e-city<br/>Bangalore, Karnataka<br/>
                    <span className="cap" style={{color:"var(--ink-3)"}}>GSTIN · 6 6 5 7 7 5 7 7 4 8 4 8 4 7 8</span>
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div className="cap cap-strong" style={{marginBottom: 8}}>LINE ITEMS · 2</div>
              <table className="t" style={{borderTop:"2px solid var(--alert)", borderBottom:"2px solid var(--alert)"}}>
                <thead>
                  <tr style={{background:"#f7d0bd"}}>
                    <th style={{color:"var(--alert)"}}>Description</th>
                    <th style={{width:80, color:"var(--alert)"}}>Qty</th>
                    <th style={{width:90, color:"var(--alert)"}}>Rate</th>
                    <th style={{width:90, color:"var(--alert)"}}>Unit</th>
                    <th style={{width:110, textAlign:"right", color:"var(--alert)"}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div style={{fontWeight:600, fontSize:12}}>Explainer video editing + voice-over sync</div>
                      <div className="cap" style={{color:"var(--ink-3)", marginTop:4}}>Video editing · HSN 999613</div>
                    </td>
                    <td className="money">52</td>
                    <td className="money">₹14</td>
                    <td><span className="cap">Per hour</span></td>
                    <td className="money" style={{textAlign:"right"}}>₹728</td>
                  </tr>
                  <tr>
                    <td>
                      <div style={{fontWeight:600, fontSize:12}}>Storyboard frames · revisions included</div>
                      <div className="cap" style={{color:"var(--ink-3)", marginTop:4}}>Illustration · HSN 998391</div>
                    </td>
                    <td className="money">8</td>
                    <td className="money">₹2,000</td>
                    <td><span className="cap">Per frame</span></td>
                    <td className="money" style={{textAlign:"right"}}>₹16,000</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer split */}
              <div className="row gap-32" style={{marginTop: 22}}>
                <div style={{flex:1}}>
                  <div className="cap" style={{color:"var(--alert)", marginBottom: 6}}>LICENSE</div>
                  <div style={{fontSize:12, fontWeight:600}}>Full assignment on settlement</div>

                  <div className="cap" style={{color:"var(--alert)", marginTop: 16, marginBottom: 6}}>BANK</div>
                  <div style={{fontSize:11, lineHeight:1.6}}>
                    HDFC · A/C 5535 5355 5366 36<br/>IFSC · HDFC0001234
                  </div>

                  <div className="cap" style={{color:"var(--alert)", marginTop: 16, marginBottom: 6}}>AMOUNT IN WORDS</div>
                  <div style={{fontSize:11, fontStyle:"italic", color:"var(--ink-2)"}}>
                    Sixteen thousand seven hundred twenty-eight only
                  </div>
                </div>

                <div style={{flex:1}}>
                  <div className="row between" style={{padding:"6px 0", borderBottom:"1px dashed var(--soft)"}}>
                    <div className="cap">SUBTOTAL</div><div className="money">₹16,728</div>
                  </div>
                  <div className="row between" style={{padding:"6px 0", borderBottom:"1px dashed var(--soft)"}}>
                    <div className="cap">CGST 9%</div><div className="money">₹1,506</div>
                  </div>
                  <div className="row between" style={{padding:"6px 0", borderBottom:"1px dashed var(--soft)"}}>
                    <div className="cap">SGST 9%</div><div className="money">₹1,506</div>
                  </div>
                  <div className="row between" style={{padding:"6px 0", borderBottom:"1px dashed var(--soft)"}}>
                    <div className="cap" style={{color:"var(--alert)"}}>TAX (18%)</div><div className="money" style={{color:"var(--alert)"}}>₹3,012</div>
                  </div>
                  <div className="row between" style={{padding:"14px 0 6px", alignItems:"center"}}>
                    <div className="cap cap-strong">TOTAL DUE</div>
                    <div className="money" style={{fontSize:30, color:"var(--alert)"}}>₹19,740</div>
                  </div>
                  <div className="cap" style={{color:"var(--ink-3)", marginTop:8, textAlign:"right"}}>
                    M3 of 5 · part of project ₹14,68,856
                  </div>
                </div>
              </div>

              <div className="hr soft" style={{margin: "22px 0"}}/>
              <div className="row between" style={{alignItems:"flex-end"}}>
                <div style={{fontSize:10, color:"var(--ink-3)", maxWidth: 360, lineHeight:1.5}}>
                  This is a computer-generated document. By paying, the client accepts the MSA dated 12 Apr 2026 and project addendum INV-2026-9998-A.
                </div>
                <div style={{textAlign:"center"}}>
                  <div className="ph" style={{width: 160, height: 50, background:"transparent", border:"none", borderBottom:"1.5px solid var(--ink)"}}>
                    <span style={{fontFamily:"Caveat, cursive", fontSize:24, color:"var(--ink)"}}>bkb kumar</span>
                  </div>
                  <div className="cap" style={{marginTop:6}}>AUTHORIZED SIGNATORY</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: template picker */}
          <div className="col gap-16" style={{width: 280}}>
            <div className="cap cap-strong">CHOOSE TEMPLATE</div>
            <div className="col gap-12">
              {templates.map(t=>(
                <div key={t.n} className="box" style={{
                  padding: "10px 12px",
                  borderColor: t.on ? "var(--ink)" : "var(--rule)",
                  borderWidth: t.on ? 2.5 : 1.5,
                  background: t.on ? "var(--paper-2)" : "var(--paper)"
                }}>
                  <div className="row gap-6" style={{marginBottom: 8}}>
                    {t.sw.map((c,i)=>(
                      <div key={i} style={{
                        flex: i===1? 2 : 1, height: 22,
                        background: c, border:"1.5px solid var(--rule)"
                      }}/>
                    ))}
                  </div>
                  <div className="row between" style={{alignItems:"center"}}>
                    <div className="cap cap-strong" style={{fontSize:11}}>{t.n}</div>
                    {t.on && <div style={{width:7, height:7, borderRadius:"50%", background:"var(--ink)"}}/>}
                  </div>
                </div>
              ))}
            </div>

            <div className="box dashed" style={{padding:"12px 14px"}}>
              <div className="cap cap-strong" style={{marginBottom:4}}>+ Custom brand kit</div>
              <div style={{fontSize:11, color:"var(--ink-2)", lineHeight:1.5}}>Upload your logo, set ink + paper colors.</div>
            </div>
          </div>
        </div>

        <div className="note" style={{position:"absolute", top:330, left:30, transform:"rotate(-6deg)", width:140}}>
          locked state ↓<br/>prevents accidental<br/>re-send loops
        </div>
      </div>
    </div>
  );
};

window.InvoicePreview = InvoicePreview;
