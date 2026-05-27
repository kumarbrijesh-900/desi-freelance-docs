/* ----------  3 · INVOICES LIST  ---------- */
const InvoicesList = () => {
  const rows = [
    {n:"INV-2026-3838", t:"MASTER", p:"Ruhnika Project", c:"Ruhnika", amt:"₹4,54,356", s:"DRAFT",    side:"butter", k:"butter"},
    {n:"INV-2026-9998", t:"M3 BILLING", p:"Mega project for Alehandro", c:"Alehandro", amt:"₹728", s:"LOCKED", side:"grass", k:"ok"},
    {n:"INV-2026-1230", t:"MASTER", p:"Ruhnika Project", c:"Ruhnika", amt:"₹4,54,356", s:"DRAFT",   side:"butter", k:"butter"},
    {n:"INV-2026-9997", t:"M2 BILLING", p:"Mega project for Alehandro", c:"Alehandro", amt:"₹0",     s:"SENT",    side:"sky", k:"sky"},
    {n:"INV-2026-9996", t:"MASTER", p:"Mega project for Alehandro", c:"Alehandro", amt:"₹4,49,666", s:"PARTIAL", side:"lav", k:"lav"},
    {n:"INV-2026-9446", t:"MASTER", p:"CKCCC project", c:"CKCCC", amt:"₹4,31,692",     s:"LOCKED",  side:"grass", k:"ok"},
    {n:"INV-2026-1238", t:"MASTER", p:"CKCCC project", c:"CKCCC", amt:"₹4,31,692",     s:"REVISION", side:"coral", k:"alert"},
    {n:"INV-2026-6551", t:"MASTER", p:"BKB project", c:"CKCCC", amt:"₹17,872",         s:"LOCKED",  side:"grass", k:"ok"},
    {n:"INV-2026-4078", t:"MASTER", p:"Lazypanda project", c:"Lazypanda", amt:"₹10,288", s:"AWAITING", side:"butter", k:"butter"},
  ];

  const sideMap = {
    hi:"var(--hi)", sky:"var(--sky)", coral:"var(--coral)",
    butter:"var(--butter)", grass:"var(--grass)", lav:"var(--lav)"
  };

  return (
    <div className="wf paper-lav" style={{width:1480, height:1080}}>
      <TopNav active="Invoices" />
      <div style={{padding: "32px 56px", position:"relative"}}>
        {/* Floating sticker */}
        <div className="sticker" style={{position:"absolute", top:80, right:240, background:"var(--coral)", color:"#fff", transform:"rotate(-6deg)", zIndex:3}}>
          ✦ ₹14.02L outstanding
        </div>

        <div className="row between" style={{alignItems:"flex-end", marginBottom: 28}}>
          <div>
            <div className="row gap-8" style={{marginBottom: 12, alignItems:"center"}}>
              <div className="pill lav">ALL TIME</div>
              <div className="pill" style={{background:"#fff"}}>10 RESULTS</div>
            </div>
            <h1 className="display chunky" style={{fontSize: 80, margin:0}}>
              <span className="marker">Invoices</span>
            </h1>
            <div className="cap" style={{marginTop: 10, color:"var(--ink-2)"}}>Every invoice you've ever sent. Or drafted, and never sent.</div>
          </div>
          <div className="row gap-12" style={{alignItems:"center"}}>
            <div className="field" style={{width:320, borderWidth:2, boxShadow:"3px 3px 0 var(--rule)"}}>
              <span className="lbl">⌕ Search · #, client, project…</span>
            </div>
            <div className="btn primary" style={{boxShadow:"4px 4px 0 var(--rule)"}}>+ New invoice</div>
          </div>
        </div>

        {/* Stat strip — full color */}
        <div className="row gap-12" style={{marginBottom: 24}}>
          {[
            ["Outstanding","₹14,02,372","6 invoices","var(--coral)","#fff"],
            ["Settled · 90d","₹4,08,500","2 invoices","var(--grass)","#fff"],
            ["Avg paid in","11 days","vs 18 industry","var(--hi)","var(--ink)"],
            ["GST collected","₹2,14,580","FY 25-26","var(--lav)","#fff"],
          ].map(([l,v,s,bg,fg],i)=>(
            <div key={i} className="box" style={{flex:1, padding:"16px 18px", background: bg, color: fg, boxShadow:"4px 4px 0 var(--rule)"}}>
              <div className="cap" style={{marginBottom: 6, color: fg, opacity:.85}}>{l}</div>
              <div className="money" style={{fontSize: 26, fontWeight:700}}>{v}</div>
              <div className="cap" style={{color: fg, marginTop:4, opacity:.75}}>{s}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="row gap-8" style={{marginBottom: 22, alignItems:"center", flexWrap:"wrap"}}>
          {[
            ["All", 10, "hi"],
            ["Draft", 3, "butter"],
            ["Sent", 1, "sky"],
            ["MSA proposed", 0, ""],
            ["Revision", 1, "alert"],
            ["Live", 2, "lav"],
            ["Settled", 2, "ok"],
            ["Complete", 1, ""],
          ].map(([t,c,tone])=>(
            <div key={t} className={"pill "+ (tone || "")} style={{padding:"6px 12px", fontSize:10, boxShadow: tone ? "2px 2px 0 var(--rule)" : "none"}}>
              {t} · {c}
            </div>
          ))}
          <div className="grow"/>
          <div className="cap">SORT · NEWEST FIRST  ▼</div>
        </div>

        {/* List */}
        <div className="col gap-10">
          {rows.map((r,i)=>(
            <div key={i} className="box row" style={{padding: "0", alignItems:"stretch", overflow:"hidden", boxShadow:"3px 3px 0 var(--rule)"}}>
              {/* Color stripe */}
              <div style={{width: 10, background: sideMap[r.side], borderRight:"1.5px solid var(--rule)"}}/>

              <div className="row" style={{flex:1, padding:"18px 24px", alignItems:"center"}}>
                <div style={{width: 200}}>
                  <div className="cap cap-strong" style={{fontSize:13, marginBottom:4}}>{r.n}</div>
                  <div className="cap">{r.t}</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:600, marginBottom:4}}>{r.p}</div>
                  <div className="row gap-8" style={{alignItems:"center"}}>
                    <div className="avatar" style={{width:18, height:18, fontSize:8, background:sideMap[r.side], borderWidth:1.5, color: r.side==="butter"||r.side==="hi"?"var(--ink)":"#fff"}}>{r.c.slice(0,2).toUpperCase()}</div>
                    <div className="cap">{r.c.toUpperCase()}</div>
                  </div>
                </div>
                <div className="money" style={{width: 140, textAlign:"right", fontSize:18, marginRight: 24, fontWeight:700}}>{r.amt}</div>
                <div style={{width: 130, textAlign:"center"}}>
                  <span className={"pill " + (r.k==="ok"?"ok": r.k==="alert"?"alert": r.k==="sky"?"sky": r.k==="lav"?"lav": r.k==="butter"?"butter":"")} style={{boxShadow:"2px 2px 0 var(--rule)"}}>{r.s}</span>
                </div>
                <div className="btn ghost sm" style={{marginLeft: 16}}>VIEW →</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ----------  4 · CLIENTS  ---------- */
const Clients = () => {
  const clients = [
    {n:"LazyPanda",      e:"kumar.brijesh900@…",    c:"Bangalore",      g:"66577…8475",     t:"India",       i:1, color:"coral"},
    {n:"CKCCC",          e:"brijesh.balab@…",       c:"Bangalore",      g:"66577…8478",     t:"India",       i:4, color:"sky"},
    {n:"Ruhnika",        e:"rryry@…",               c:"Bangalore",      g:"66577…8478",     t:"India",       i:1, color:"lav"},
    {n:"Alehandro Studios", e:"populasen@…",        c:"Bangalore",      g:"66577…8478",     t:"India",       i:1, color:"rose"},
    {n:"Acme Studios",   e:"hello@acme.com",         c:"Bengaluru",      g:"24AAAGM0289C1ZP", t:"India",      i:0, color:"butter"},
    {n:"Drift & Co.",    e:"hello@drift.co",         c:"Mumbai",         g:"—",              t:"India",       i:0, color:"hi"},
    {n:"Northstar BV",   e:"finance@northstar.nl",   c:"Amsterdam",      g:"NL · VAT",       t:"Intl · LUT",  i:3, color:"sky"},
    {n:"Halftone Inc.",  e:"ops@halftone.us",        c:"San Francisco",  g:"US · EIN",       t:"Intl · LUT",  i:5, color:"coral"},
  ];

  return (
    <div className="wf paper-mint" style={{width:1480, height:1080}}>
      <TopNav active="Clients" />
      <div style={{padding: "32px 56px", position:"relative"}}>
        <div className="sticker" style={{position:"absolute", top:80, right:240, background:"var(--lav)", color:"#fff", transform:"rotate(-5deg)", zIndex:3}}>
          ✦ 2 new this month
        </div>

        <div className="row between" style={{alignItems:"flex-end", marginBottom: 28}}>
          <div>
            <div className="row gap-8" style={{marginBottom: 12, alignItems:"center"}}>
              <div className="pill ok">8 ACTIVE</div>
              <div className="pill sky">2 INTERNATIONAL</div>
              <div className="pill butter">3 NO GSTIN</div>
            </div>
            <h1 className="display chunky" style={{fontSize: 80, margin:0}}>
              Your <span className="marker rose">roster</span>
            </h1>
            <div className="cap" style={{marginTop: 10, color:"var(--ink-2)"}}>Every client, their MSA, their tax setup. One place.</div>
          </div>
          <div className="row gap-12">
            <div className="btn ghost">↑ IMPORT CSV</div>
            <div className="btn primary" style={{boxShadow:"4px 4px 0 var(--rule)"}}>+ Add client</div>
          </div>
        </div>

        {/* Stat strip */}
        <div className="row gap-12" style={{marginBottom: 24}}>
          {[
            ["Lifetime billed","₹38.4L","across 8 clients","var(--grass)","#fff"],
            ["Avg invoice","₹1.84L","↑12% QoQ","var(--hi)","var(--ink)"],
            ["MSAs signed","6 of 8","2 pending","var(--lav)","#fff"],
            ["Repeat clients","75%","5 of 8 active","var(--rose)","var(--ink)"],
          ].map(([l,v,s,bg,fg],i)=>(
            <div key={i} className="box" style={{flex:1, padding:"16px 18px", background: bg, color: fg, boxShadow:"4px 4px 0 var(--rule)"}}>
              <div className="cap" style={{marginBottom: 6, color: fg, opacity:.85}}>{l}</div>
              <div className="money" style={{fontSize: 26, fontWeight:700}}>{v}</div>
              <div className="cap" style={{color: fg, marginTop:4, opacity:.75}}>{s}</div>
            </div>
          ))}
        </div>

        <div className="row gap-12" style={{marginBottom: 18}}>
          <div className="field grow" style={{borderWidth:2, boxShadow:"3px 3px 0 var(--rule)"}}><span className="lbl">⌕ Search clients by name, email or GSTIN…</span></div>
          <div className="field" style={{width: 180}}><span className="lbl">Location · all  ▼</span></div>
          <div className="field" style={{width: 180}}><span className="lbl">Type · all  ▼</span></div>
        </div>

        <div className="box" style={{padding: 0, overflow:"hidden", boxShadow:"4px 4px 0 var(--rule)"}}>
          <table className="t">
            <thead>
              <tr style={{background:"var(--paper-2)"}}>
                <th style={{width: 240}}>Client</th>
                <th>Email</th>
                <th>City</th>
                <th>GSTIN</th>
                <th>Type</th>
                <th style={{width:80, textAlign:"right"}}>Invoices</th>
                <th style={{width:120, textAlign:"right"}}>MSA</th>
                <th style={{width:80}}></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c,i)=>(
                <tr key={i}>
                  <td>
                    <div className="row gap-10" style={{alignItems:"center"}}>
                      <div className={"avatar "+c.color} style={{boxShadow:"2px 2px 0 var(--rule)", width:32, height:32, fontSize:11}}>{c.n.slice(0,2).toUpperCase()}</div>
                      <div style={{fontWeight:700, fontSize:13}}>{c.n}</div>
                    </div>
                  </td>
                  <td><span className="cap">{c.e}</span></td>
                  <td><span className="cap">{c.c}</span></td>
                  <td><span className="pill ghost" style={{fontSize:9}}>{c.g}</span></td>
                  <td><span className={"pill " + (c.t.startsWith("Intl")?"sky":"")} style={{fontSize:9}}>{c.t}</span></td>
                  <td style={{textAlign:"right"}} className="money"><b>{c.i}</b></td>
                  <td style={{textAlign:"right"}}>
                    {c.i>0 ? <span className="pill ok" style={{fontSize:9, boxShadow:"2px 2px 0 var(--rule)"}}>✓ SIGNED</span>
                      : <span className="pill butter" style={{fontSize:9}}>PENDING</span>}
                  </td>
                  <td><div className="btn ghost sm">EDIT</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail preview */}
        <div className="row gap-20" style={{marginTop: 24}}>
          <div className="box" style={{flex: 2, padding: "22px 26px", boxShadow:"4px 4px 0 var(--rose)"}}>
            <div className="row between" style={{marginBottom: 14, alignItems:"flex-start"}}>
              <div>
                <div className="row gap-8" style={{marginBottom: 8}}>
                  <div className="pill ok">✓ MSA SIGNED</div>
                  <div className="pill sky">GST · 18%</div>
                  <div className="pill rose">5× REPEAT</div>
                </div>
                <div className="display chunky" style={{fontSize: 32}}>
                  <span className="row gap-12" style={{alignItems:"center"}}>
                    <div className="avatar rose" style={{width:44, height:44, fontSize:16, boxShadow:"3px 3px 0 var(--rule)"}}>AL</div>
                    Alehandro Studios
                  </span>
                </div>
              </div>
              <div className="cap cap-strong">CLIENT DETAIL · PREVIEW</div>
            </div>
            <div className="row gap-32" style={{marginBottom: 16, marginTop: 14}}>
              <div className="col gap-4"><div className="cap">EMAIL</div><div style={{fontSize:12, fontWeight:600}}>populasen@gmail.com</div></div>
              <div className="col gap-4"><div className="cap">GSTIN</div><div style={{fontSize:12, fontWeight:600}}>665775774848478</div></div>
              <div className="col gap-4"><div className="cap">CITY · STATE</div><div style={{fontSize:12, fontWeight:600}}>Bangalore, Karnataka</div></div>
              <div className="col gap-4"><div className="cap">LIFETIME</div><div style={{fontSize:14, fontWeight:700}} className="money">₹14.6L</div></div>
            </div>
            <div className="hr soft" style={{margin:"8px 0 14px"}}/>
            <div className="cap" style={{marginBottom: 8}}>RECENT INVOICES</div>
            {[
              ["INV-2026-9998 · M3","₹728","sky"],
              ["INV-2026-9997 · M2","₹0","grass"],
              ["INV-2026-9996 · MASTER","₹4,49,666","lav"],
            ].map(([t,v,c],i)=>(
              <div key={i} className="row between" style={{padding:"10px 0", borderBottom: i<2?"1px dashed var(--soft)":"none", alignItems:"center"}}>
                <div className="row gap-10" style={{alignItems:"center"}}>
                  <div style={{width:10, height:10, borderRadius:"50%", background:`var(--${c})`, border:"1.5px solid var(--rule)"}}/>
                  <div className="cap cap-strong">{t}</div>
                </div>
                <div className="money" style={{fontSize:13, fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div className="box" style={{flex: 1, padding: "22px 24px", background:"var(--paper)"}}>
            <div className="row between" style={{marginBottom: 12, alignItems:"center"}}>
              <div className="cap cap-strong">MSA STATUS</div>
              <div className="ast">✱</div>
            </div>
            <div className="box fill-grass" style={{padding: 14, marginBottom: 14, color:"#fff"}}>
              <div className="cap cap-strong" style={{color:"#fff", marginBottom:6}}>SIGNED · 12 APR 2026</div>
              <div style={{fontSize: 11, lineHeight:1.5}}>
                "The quoted fee includes up to 2 rounds of revisions per deliverable. Each additional round incurs 15% surcharge…"
              </div>
            </div>
            <div className="btn ghost sm" style={{width:"100%", justifyContent:"center", boxShadow:"3px 3px 0 var(--rule)", background:"var(--paper)"}}>VIEW FULL MSA</div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.InvoicesList = InvoicesList;
window.Clients = Clients;
