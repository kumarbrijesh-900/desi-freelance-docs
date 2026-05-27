// Screens for the low-fi prototype. Each screen is a self-contained
// component that renders inside a fixed-size DCArtboard. Style is paper
// + ink wireframe, with handwritten margin notes for design rationale.

/* ----------  SHARED CHROME  ---------- */
const TopNav = ({active}) => (
  <div className="topnav">
    <div className="logo">
      <div className="mark">I</div>
      <div>INVOICE.CO</div>
    </div>
    <div className="row gap-24" style={{marginLeft: 24}}>
      {["Dashboard","Invoices","Clients","Profile","Help"].map(l => (
        <div key={l} className={"navlink " + (active===l ? "active" : "")}>{l}</div>
      ))}
    </div>
    <div className="grow" />
    <div className="row gap-12" style={{alignItems:"center"}}>
      <div className="btn primary sm">+ New invoice</div>
      <div className="box" style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%"}}>
        <span style={{fontSize:11}}>9+</span>
      </div>
      <div className="avatar">RA</div>
    </div>
  </div>
);

/* ----------  1 · LANDING  ---------- */
const Landing = () => (
  <div className="wf paper-butter" style={{width:1280, height:1480}}>
    <TopNav active="" />
    <div style={{padding: "48px 64px 0 64px"}}>
      <div className="row gap-32" style={{alignItems:"flex-start"}}>
        <div style={{flex: "1 1 0", position:"relative"}}>
          <div className="row gap-10" style={{marginBottom: 28, alignItems:"center"}}>
            <div className="sticker" style={{background:"var(--coral)", color:"#fff"}}>
              <span className="spark" style={{color:"#fff"}}/> FREE · INDIAN FREELANCERS
            </div>
            <div className="sticker" style={{background:"var(--sky)", color:"#fff", transform:"rotate(-3deg)"}}>
              v 2.0
            </div>
          </div>
          <h1 className="display chunky" style={{fontSize: 108, margin: 0}}>
            Invoicing,<br/>
            stripped to<br/>
            the <span className="marker rose">essentials</span>.
          </h1>
          <p style={{maxWidth: 480, marginTop: 32, color:"var(--ink-2)", fontSize: 15, lineHeight: 1.55}}>
            GST-compliant, milestone-driven invoices in under two minutes.
            Built for independent designers, devs and studios across India —
            <span className="marker sky"> built to feel like you, not your CA</span>.
          </p>
          <div className="row gap-16" style={{marginTop: 36, alignItems:"center"}}>
            <div className="btn primary" style={{padding:"14px 22px", fontSize:12, boxShadow:"4px 4px 0 var(--rule)"}}>Create first invoice →</div>
            <div className="btn" style={{padding:"14px 22px", fontSize:12, background:"#fff"}}>▶ Watch demo · 90s</div>
          </div>
          <div className="row gap-24" style={{marginTop: 56, color:"var(--ink-2)", fontSize:11, letterSpacing:".14em", textTransform:"uppercase"}}>
            <div>✶ no signup to start</div>
            <div>✶ no credit card</div>
            <div>✶ exports as pdf</div>
          </div>

          {/* Floating sticker */}
          <div className="sticker" style={{position:"absolute", top:-12, right:60, background:"var(--lav)", color:"#fff", transform:"rotate(-8deg)"}}>
            ✦ 12,400 invoices shipped
          </div>
        </div>

        {/* Right hero placeholder */}
        <div style={{flex: "0 0 540px"}}>
          <div className="box shadow shadow-coral" style={{height:500, padding: 24, position:"relative", background:"#fff"}}>
            <div className="row between" style={{marginBottom: 14}}>
              <div className="cap cap-strong">↳ INVOICE PREVIEW</div>
              <div className="pill ok">PAID · 3 MIN AGO</div>
            </div>
            <div className="box" style={{padding: 18, background:"var(--paper-2)"}}>
              <div className="row between" style={{marginBottom:14}}>
                <div className="cap cap-strong">INVOICE</div>
                <div className="cap">INV-2026-0312</div>
              </div>
              <div className="hr soft" style={{margin:"10px 0"}} />
              <div className="row gap-24" style={{marginTop:14}}>
                <div className="col gap-4" style={{flex:1}}>
                  <div className="cap">FROM</div>
                  <div style={{height:8, background:"var(--ink)", width:"60%", borderRadius:2}}/>
                  <div style={{height:6, background:"var(--soft)", width:"80%", borderRadius:2}}/>
                  <div style={{height:6, background:"var(--soft)", width:"70%", borderRadius:2}}/>
                </div>
                <div className="col gap-4" style={{flex:1}}>
                  <div className="cap">BILL TO</div>
                  <div style={{height:8, background:"var(--ink)", width:"50%", borderRadius:2}}/>
                  <div style={{height:6, background:"var(--soft)", width:"75%", borderRadius:2}}/>
                  <div style={{height:6, background:"var(--soft)", width:"55%", borderRadius:2}}/>
                </div>
              </div>
              <div style={{height:14}}/>
              <div className="box" style={{padding:10, background:"#fff"}}>
                {[
                  ["Discovery sprint", 1, "var(--sky)"],
                  ["UI / UX design", 24, "var(--lav)"],
                  ["Brand consult", 8, "var(--coral)"],
                ].map(([d,q,c],i)=>(
                  <div key={i} className="row between" style={{padding:"8px 0", borderBottom: i<2?"1px dashed var(--soft)":"none", alignItems:"center"}}>
                    <div className="row gap-8" style={{alignItems:"center"}}>
                      <div style={{width:8,height:8,background:c, borderRadius:"50%"}}/>
                      <div style={{fontSize:11}}>{d}</div>
                    </div>
                    <div className="money" style={{fontSize:11}}>×{q}</div>
                  </div>
                ))}
              </div>
              <div className="row between" style={{marginTop:14, alignItems:"center"}}>
                <div className="cap">M1 / 3 · DISCOVERY</div>
                <div className="pill hi">TOTAL ₹1,24,500</div>
              </div>
            </div>

            {/* Floating sticker on hero */}
            <div className="sticker" style={{position:"absolute", right:-18, top:32, background:"var(--hi)", transform:"rotate(8deg)", zIndex:2}}>
              ✦ 8 templates
            </div>
            <div className="sticker" style={{position:"absolute", left:-22, bottom:36, background:"var(--rose)", transform:"rotate(-6deg)", zIndex:2}}>
              ⌁ paid in 11 days avg
            </div>
          </div>
        </div>
      </div>

      {/* Striped divider */}
      <div className="stripes coral" style={{margin:"60px -64px 28px"}}/>

      {/* Value bar */}
      <div className="row between" style={{padding:"0 8px"}}>
        {[
          ["GST compliant","var(--grass)"],
          ["Milestone billing","var(--sky)"],
          ["MSA enforced","var(--lav)"],
          ["Private by default","var(--coral)"],
          ["RCM / LUT aware","var(--butter)"],
        ].map(([v,c])=>(
          <div key={v} className="row gap-8" style={{alignItems:"center"}}>
            <div style={{width:14,height:14,background:c, border:"2px solid var(--rule)", borderRadius:"50%"}}/>
            <div className="cap cap-strong">{v}</div>
          </div>
        ))}
      </div>
      <div className="stripes sky" style={{margin:"28px -64px 56px"}}/>

      {/* How it works */}
      <div className="row between" style={{alignItems:"flex-end", marginBottom: 32}}>
        <div>
          <div className="cap" style={{marginBottom:10}}>HOW IT WORKS · 4 STEPS</div>
          <h2 className="display chunky" style={{fontSize:62, margin:0, maxWidth:720}}>
            Built for <span className="marker">freelancers</span>,<br/>not accountants.
          </h2>
        </div>
        <div className="sticker" style={{transform:"rotate(-4deg)", background:"var(--butter)"}}>
          ✦ avg setup · 2 min
        </div>
      </div>

      <div className="col gap-16">
        {[
          ["01","Create invoice, set milestones","Add your client, define milestones, set line items with quantities and rates. SAC codes auto-assigned.","✎","var(--hi)"],
          ["02","Tax math, handled","IGST / CGST / SGST computed from your GSTIN and client location. LUT validated for exports. You just fill in the amount.","∑","var(--rose)"],
          ["03","Share link, get paid","Generate a secure link. Client signs MSA, accepts terms and pays. You're notified the moment they open it.","→","var(--sky)"],
          ["04","Contracts, enforced","Every invoice ships with a Master Services Agreement. Payment terms, late fees, IP rights — all locked in upfront.","§","var(--lav)"],
        ].map(([n,t,d,ic,col])=>(
          <div key={n} className="box shadow row gap-20" style={{padding:"22px 26px", alignItems:"center", background:"#fff"}}>
            <div className="box center" style={{width:54,height:54,fontWeight:700,fontSize:22, background:col, color: col==="var(--hi)"||col==="var(--rose)"||col==="var(--butter)" ? "var(--ink)" : "#fff", borderColor:"var(--rule)", borderRadius: 12}}>{n}</div>
            <div style={{flex:1}}>
              <div className="row gap-8" style={{alignItems:"center", marginBottom:6}}>
                <div className="display chunky" style={{fontSize:22}}>{t}</div>
              </div>
              <div style={{fontSize:12, color:"var(--ink-2)", lineHeight:1.5, maxWidth: 720}}>{d}</div>
            </div>
            <div style={{fontSize:44, fontFamily:"Fraunces, serif", color:col, fontWeight:700}}>{ic}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="stripes hi" style={{margin:"80px -64px 24px"}}/>
      <div className="row between" style={{paddingBottom: 32}}>
        <div className="col gap-8">
          <div className="logo"><div className="mark">I</div><div>INVOICE.CO</div></div>
          <div style={{fontSize:11, color:"var(--ink-2)", maxWidth: 280}}>
            GST-compliant invoicing for Indian freelancers and agencies.
          </div>
          <div className="row gap-6" style={{marginTop:8}}>
            <div className="pill rose">made in india</div>
            <div className="pill sky">v 2.0</div>
          </div>
        </div>
        <div className="row gap-48">
          {[
            ["PRODUCT", ["Create invoice","Templates","FAQ"]],
            ["LEGAL", ["Terms","Privacy"]],
            ["CONTACT", ["hello@invoice.co","Made in India"]],
          ].map(([h,items])=>(
            <div key={h} className="col gap-8">
              <div className="cap cap-strong">{h}</div>
              {items.map(i=> <div key={i} style={{fontSize:12, color:"var(--ink-2)"}}>{i}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

window.Landing = Landing;
window.TopNav = TopNav;
