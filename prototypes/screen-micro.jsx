/* ────────────────────────────────────────────────────────────────
   MICRO-INTERACTIONS · 6 working demos
   Each demo is a self-contained component that lives inside a small
   DCArtboard. All animation is real (state + CSS transitions). No
   external libs.
   ──────────────────────────────────────────────────────────────── */

const {useState, useEffect, useRef, useCallback} = React;

/* CSS for the micro demos — injected once */
if (typeof document !== 'undefined' && !document.getElementById('mi-styles')) {
  const s = document.createElement('style');
  s.id = 'mi-styles';
  s.textContent = `
  .mi-stage{
    width:100%; height:100%;
    background: var(--paper);
    border: 2px solid var(--rule);
    border-radius: 6px;
    position:relative;
    overflow:hidden;
    font-family: "JetBrains Mono", monospace;
    color: var(--ink);
    box-shadow: 6px 6px 0 var(--rule);
  }
  .mi-stage.tone-rose{background:#fff0f5}
  .mi-stage.tone-sky{background:#e9f4ff}
  .mi-stage.tone-mint{background:#eaf9ee}
  .mi-stage.tone-butter{background:#fff5cc}
  .mi-stage.tone-lav{background:#f0ebff}

  .mi-head{
    display:flex;justify-content:space-between;align-items:center;
    padding:14px 18px;
    border-bottom: 1.5px solid var(--rule);
    background: var(--paper);
  }
  .mi-title{
    font-family:"Fraunces",serif; font-weight:700; letter-spacing:-.02em;
    font-size:20px;
  }
  .mi-tag{
    font-size:9px; letter-spacing:.18em; text-transform:uppercase;
    background: var(--ink); color: var(--paper);
    padding: 3px 8px; border-radius: 999px;
  }
  .mi-body{ padding: 18px; height: calc(100% - 50px); display:flex; flex-direction:column; }

  /* Generic button */
  .mi-btn{
    display:inline-flex; align-items:center; gap:8px;
    border: 2px solid var(--rule);
    padding: 9px 14px;
    border-radius: 8px;
    background: #fff;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    cursor: pointer;
    box-shadow: 3px 3px 0 var(--rule);
    transition: transform .08s, box-shadow .08s, background .15s;
    user-select:none;
  }
  .mi-btn:hover{ transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--rule); }
  .mi-btn:active{ transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--rule); }
  .mi-btn.primary{ background: var(--hi); }
  .mi-btn.coral{   background: var(--coral); color:#fff; }
  .mi-btn.sky{     background: var(--sky); color:#fff; }
  .mi-btn.lav{     background: var(--lav); color:#fff; }
  .mi-btn.ghost{ box-shadow:none; background:transparent; }

  /* ===== Toast ===== */
  .mi-toast-stack{
    position:absolute; right:14px; bottom:14px; left:14px;
    display:flex; flex-direction:column; gap:8px;
    pointer-events:none;
  }
  .mi-toast{
    pointer-events:auto;
    display:flex; align-items:flex-start; gap:10px;
    padding: 12px 14px;
    border: 2px solid var(--rule);
    border-radius: 10px;
    box-shadow: 4px 4px 0 var(--rule);
    background: #fff;
    transform: translateX(120%);
    opacity: 0;
    animation: toast-in .42s cubic-bezier(.22,1.4,.36,1) forwards;
    position: relative; overflow:hidden;
  }
  .mi-toast.leaving{ animation: toast-out .25s ease-in forwards; }
  @keyframes toast-in{
    0%{ transform: translateX(120%) rotate(8deg); opacity:0; }
    60%{ transform: translateX(-6px) rotate(-1deg); opacity:1; }
    100%{ transform: translateX(0) rotate(0); opacity:1; }
  }
  @keyframes toast-out{
    to{ transform: translateX(120%); opacity:0; }
  }
  .mi-toast .ic{
    width: 26px; height:26px; border-radius:50%;
    border:2px solid var(--rule);
    display:flex;align-items:center;justify-content:center;
    font-weight:700; font-size:13px; flex:0 0 auto;
  }
  .mi-toast .body{ flex:1; }
  .mi-toast .ttl{ font-size:12px; font-weight:700; }
  .mi-toast .sub{ font-size:11px; color: var(--ink-2); margin-top:2px; }
  .mi-toast .prog{
    position:absolute; left:0; bottom:0; height:3px;
    background: var(--ink);
    animation: prog 3.4s linear forwards;
  }
  @keyframes prog{ to{ width: 0%; } }
  .mi-toast.success .ic{ background: var(--grass); color:#fff; }
  .mi-toast.error   .ic{ background: var(--coral); color:#fff; }
  .mi-toast.info    .ic{ background: var(--sky);   color:#fff; }
  .mi-toast.success .prog{ background: var(--grass); }
  .mi-toast.error   .prog{ background: var(--coral); }
  .mi-toast.info    .prog{ background: var(--sky); }

  /* ===== Tooltip ===== */
  .mi-tt-row{ display:flex; flex-direction:column; gap: 14px; }
  .mi-tt-line{
    display:flex; align-items:center; gap:10px;
    padding: 10px 12px;
    border: 1.75px solid var(--rule);
    border-radius: 8px;
    background:#fff;
    font-size: 12px;
  }
  .mi-tt-line .lbl{ flex:1; color: var(--ink-2); }
  .mi-tt-line .val{ font-weight:600; }
  .mi-tt-trigger{
    position:relative;
    width:20px; height:20px; border-radius:50%;
    border:1.75px solid var(--rule);
    background:#fff;
    display:flex; align-items:center; justify-content:center;
    font-size: 11px; font-weight:700;
    cursor:help;
  }
  .mi-tt-bubble{
    position:absolute; bottom: calc(100% + 10px); left: 50%;
    transform: translateX(-50%) translateY(6px);
    background: var(--ink); color:var(--paper);
    padding: 8px 12px; border-radius:8px;
    font-size: 11px; line-height:1.4;
    white-space: normal; width: 190px;
    box-shadow: 3px 3px 0 var(--rule);
    pointer-events:none;
    opacity:0;
    transition: opacity .18s, transform .22s cubic-bezier(.22,1.5,.36,1);
    z-index: 5;
    font-weight: 500; letter-spacing: 0; text-transform:none;
  }
  .mi-tt-bubble::after{
    content:""; position:absolute; top:100%; left:50%;
    transform: translateX(-50%);
    border: 6px solid transparent; border-top-color: var(--ink);
  }
  .mi-tt-trigger:hover .mi-tt-bubble{
    opacity:1; transform: translateX(-50%) translateY(0);
    transition-delay: .35s;
  }

  /* ===== Status morph ===== */
  .mi-statpill{
    display:inline-flex; align-items:center; gap:8px;
    padding: 8px 16px;
    border: 2px solid var(--rule);
    border-radius: 999px;
    font-size: 11px; font-weight:700;
    letter-spacing: .14em; text-transform: uppercase;
    transition: background .45s ease, color .45s ease, transform .25s cubic-bezier(.22,1.4,.36,1);
    will-change: transform;
    box-shadow: 3px 3px 0 var(--rule);
  }
  .mi-statpill .dot{
    width:8px; height:8px; border-radius:50%; background:currentColor;
    box-shadow: 0 0 0 0 currentColor;
    animation: dot-pulse 1.6s ease-out infinite;
  }
  @keyframes dot-pulse{
    0%{ box-shadow: 0 0 0 0 currentColor; }
    70%{ box-shadow: 0 0 0 8px transparent; }
    100%{ box-shadow: 0 0 0 0 transparent; }
  }
  .mi-statpill.s-draft  { background: #e8e2d3; color: #5b554a; }
  .mi-statpill.s-sent   { background: var(--sky); color:#fff; }
  .mi-statpill.s-viewed { background: var(--lav); color:#fff; }
  .mi-statpill.s-paid   { background: var(--grass); color:#fff; }
  .mi-statpill.bump{ transform: scale(1.15); }

  .mi-track{
    display:flex; align-items:center; gap: 0;
    margin-top: 18px;
  }
  .mi-track .step{
    flex:1; height: 6px; background:#e8e2d3; position:relative;
    border-top:1.5px solid var(--rule); border-bottom:1.5px solid var(--rule);
  }
  .mi-track .step:first-child{ border-left:1.5px solid var(--rule); border-radius: 999px 0 0 999px; }
  .mi-track .step:last-child{ border-right:1.5px solid var(--rule); border-radius: 0 999px 999px 0; }
  .mi-track .step.done{ background: var(--ink); }
  .mi-track .step.live{ background: var(--hi); }
  .mi-track .step .knob{
    position:absolute; right:-7px; top:50%;
    width:14px; height:14px; border-radius:50%;
    background: var(--ink); border: 1.5px solid var(--rule);
    transform: translateY(-50%);
  }

  /* ===== Submit morph ===== */
  .mi-submit{
    position:relative;
    width: 180px; height: 48px;
    border: 2px solid var(--rule);
    border-radius: 999px;
    background: var(--hi);
    cursor: pointer;
    overflow:hidden;
    box-shadow: 4px 4px 0 var(--rule);
    transition: width .35s cubic-bezier(.7,0,.3,1), background .35s, box-shadow .12s;
    font-family: inherit;
    color: var(--ink);
    font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
    font-size: 12px;
  }
  .mi-submit:hover{ transform: translate(-1px,-1px); box-shadow: 5px 5px 0 var(--rule); }
  .mi-submit:active{ transform: translate(2px,2px); box-shadow: 1px 1px 0 var(--rule); }
  .mi-submit.loading{ width: 56px; background:#fff; }
  .mi-submit.success{ width: 56px; background: var(--grass); color:#fff; }
  .mi-submit .label{
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    transition: opacity .18s;
  }
  .mi-submit.loading .label, .mi-submit.success .label{ opacity: 0; }
  .mi-submit .spinner{
    position:absolute; left:50%; top:50%;
    width: 22px; height:22px;
    margin: -11px 0 0 -11px;
    border-radius: 50%;
    border: 2.5px solid var(--soft);
    border-top-color: var(--ink);
    animation: spin .7s linear infinite;
    opacity: 0;
    transition: opacity .18s;
  }
  .mi-submit.loading .spinner{ opacity:1; }
  @keyframes spin{ to{ transform: rotate(360deg); } }
  .mi-submit .check{
    position:absolute; left:50%; top:50%;
    width: 22px; height: 22px; margin: -11px 0 0 -11px;
    opacity: 0; transform: scale(.3);
    transition: opacity .22s, transform .35s cubic-bezier(.22,1.6,.36,1);
  }
  .mi-submit.success .check{ opacity:1; transform: scale(1); }

  /* ===== Confetti + count-up ===== */
  .mi-fireworks{ position:absolute; inset:0; pointer-events:none; overflow:hidden; }
  .mi-confetti{
    position:absolute; left:50%; top:50%;
    width:8px; height:14px;
    border-radius:2px;
    transform-origin: center;
    opacity:0;
    animation: confetti 1.4s cubic-bezier(.22,.7,.4,1) forwards;
  }
  @keyframes confetti{
    0%{ opacity:0; transform: translate(-50%,-50%) rotate(0) scale(.6); }
    10%{opacity:1;}
    100%{
      opacity:0;
      transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--tr)) scale(1);
    }
  }
  .mi-bignum{
    font-family:"Fraunces",serif; font-weight:700; letter-spacing:-.04em;
    font-size: 64px;
    color: var(--ink);
    line-height:1;
    font-variant-numeric: tabular-nums;
  }

  /* ===== Drag reorder ===== */
  .mi-drag-list{ display:flex; flex-direction:column; gap:8px; }
  .mi-drag-item{
    display:flex; align-items:center; gap:10px;
    padding: 10px 12px;
    border: 1.75px solid var(--rule);
    border-radius: 8px;
    background: #fff;
    cursor: grab;
    transition: transform .22s cubic-bezier(.22,1.3,.36,1), box-shadow .15s, background .15s;
  }
  .mi-drag-item.dragging{
    cursor: grabbing;
    background: var(--hi);
    box-shadow: 5px 8px 0 var(--rule);
    transform: scale(1.03) rotate(-1deg);
    z-index: 5;
    position: relative;
  }
  .mi-drag-item .grip{
    font-family: monospace; color: var(--ink-3); font-size: 14px;
  }
  .mi-drag-placeholder{
    height: 42px; background: repeating-linear-gradient(135deg, var(--soft) 0 4px, transparent 4px 8px);
    border: 1.5px dashed var(--ink-3); border-radius: 8px;
  }
  `;
  document.head.appendChild(s);
}

/* ----- shared wrapper ----- */
const Stage = ({title, tag, tone, children}) => (
  <div className={"mi-stage tone-"+(tone||"rose")}>
    <div className="mi-head">
      <div className="mi-title">{title}</div>
      <div className="mi-tag">{tag}</div>
    </div>
    <div className="mi-body">{children}</div>
  </div>
);

/* ============ 1. TOAST STACK ============ */
const MIToasts = () => {
  const [toasts, setToasts] = useState([
    {id: 0, kind:"success", ttl:"Invoice sent", sub:"Alehandro Studios will be notified."}
  ]);
  const counter = useRef(1);
  const push = (kind, ttl, sub) => {
    const id = counter.current++;
    setToasts(t => [...t, {id, kind, ttl, sub}]);
    setTimeout(()=>{
      setToasts(t => t.map(x=> x.id===id ? {...x, leaving:true} : x));
      setTimeout(()=>setToasts(t => t.filter(x=>x.id!==id)), 250);
    }, 3400);
  };
  return (
    <Stage title="Toast stack" tag="DELIGHT" tone="rose">
      <div style={{fontSize:11, color:"var(--ink-2)", marginBottom: 14, lineHeight:1.5}}>
        Spring-in from the right, hard-shadow chunk, auto-progress bar, stack of three before oldest pops.
      </div>
      <div className="row gap-8" style={{flexWrap:"wrap"}}>
        <div className="mi-btn primary" onClick={()=>push("success","Invoice paid","Alehandro · ₹4,54,356 received.")}>+ paid</div>
        <div className="mi-btn coral" onClick={()=>push("error","MSA rejected","Client proposed new terms.")}>+ error</div>
        <div className="mi-btn sky" onClick={()=>push("info","Reminder queued","Client nudge scheduled for 13/06.")}>+ info</div>
      </div>
      <div className="mi-toast-stack">
        {toasts.slice(-3).map(t=>(
          <div key={t.id} className={"mi-toast "+t.kind+(t.leaving?" leaving":"")}>
            <div className="ic">{t.kind==="success"?"✓":t.kind==="error"?"✕":"i"}</div>
            <div className="body">
              <div className="ttl">{t.ttl}</div>
              <div className="sub">{t.sub}</div>
            </div>
            {!t.leaving && <div className="prog"/>}
          </div>
        ))}
      </div>
    </Stage>
  );
};

/* ============ 2. TOOLTIPS ============ */
const MITooltips = () => (
  <Stage title="Smart tooltips" tag="LEARN" tone="sky">
    <div style={{fontSize:11, color:"var(--ink-2)", marginBottom: 14, lineHeight:1.5}}>
      Hover the (?) — bubble springs in after 350ms so it never spams the user. Arrow auto-points.
    </div>
    <div className="mi-tt-row">
      <div className="mi-tt-line">
        <span className="lbl">GST registration status</span>
        <span className="val">Not registered</span>
        <div className="mi-tt-trigger">?
          <div className="mi-tt-bubble">
            Required for B2B in India. Toggle off to use a PAN-only invoice for clients below the ₹20L threshold.
          </div>
        </div>
      </div>
      <div className="mi-tt-line">
        <span className="lbl">SAC code · auto-fill</span>
        <span className="val">998391</span>
        <div className="mi-tt-trigger">?
          <div className="mi-tt-bubble">
            SAC stands for Service Accounting Code. We match yours by item type so you don't need to memorise 6-digit numbers.
          </div>
        </div>
      </div>
      <div className="mi-tt-line">
        <span className="lbl">Reverse charge (RCM)</span>
        <span className="val">Off</span>
        <div className="mi-tt-trigger">?
          <div className="mi-tt-bubble">
            Tax handled by the client instead of you. We flip this on automatically for unregistered domestic clients.
          </div>
        </div>
      </div>
      <div className="mi-tt-line">
        <span className="lbl">Late fee rate</span>
        <span className="val">1% / month</span>
        <div className="mi-tt-trigger">?
          <div className="mi-tt-bubble">
            Compounded monthly after the due date. Override per-invoice from the MSA addendum panel.
          </div>
        </div>
      </div>
    </div>
  </Stage>
);

/* ============ 3. STATUS MORPH ============ */
const STATUSES = ["draft","sent","viewed","paid"];
const STATUS_LABEL = {draft:"DRAFT",sent:"SENT",viewed:"VIEWED",paid:"PAID ✓"};
const MIStatusMorph = () => {
  const [idx, setIdx] = useState(0);
  const [bump, setBump] = useState(false);
  const advance = useCallback(()=>{
    setIdx(i => (i+1) % STATUSES.length);
    setBump(true);
    setTimeout(()=>setBump(false), 260);
  },[]);
  // Auto-cycle every 2.4s, but pause when user clicks (handled by reset effect)
  const lastInteract = useRef(0);
  useEffect(()=>{
    const t = setInterval(()=>{
      if (Date.now() - lastInteract.current > 4000) advance();
    }, 2400);
    return ()=>clearInterval(t);
  }, [advance]);
  const onClick = ()=>{ lastInteract.current = Date.now(); advance(); };
  return (
    <Stage title="Status, alive" tag="STATE" tone="mint">
      <div style={{fontSize:11, color:"var(--ink-2)", marginBottom: 14, lineHeight:1.5}}>
        Pill cross-fades through lifecycle stages — colour swaps over 450ms, scale bumps on change. Click to advance.
      </div>
      <div className="center" style={{flex:1, flexDirection:"column", gap: 22}}>
        <div className={"mi-statpill s-"+STATUSES[idx]+(bump?" bump":"")} onClick={onClick}>
          <span className="dot"/>
          {STATUS_LABEL[STATUSES[idx]]}
        </div>
        <div className="mi-track" style={{width: "100%"}}>
          {STATUSES.map((s,i)=>(
            <div key={s} className={"step "+ (i<idx?"done":i===idx?"live":"")}>
              {i===idx && <div className="knob"/>}
            </div>
          ))}
        </div>
        <div className="row between" style={{width:"100%", fontSize:10, letterSpacing:".18em", textTransform:"uppercase", color:"var(--ink-2)"}}>
          {STATUSES.map(s=> <div key={s}>{s}</div>)}
        </div>
      </div>
    </Stage>
  );
};

/* ============ 4. SUBMIT MORPH ============ */
const MISubmit = () => {
  const [state, setState] = useState("idle"); // idle | loading | success
  const click = () => {
    if (state !== "idle") { setState("idle"); return; }
    setState("loading");
    setTimeout(()=>setState("success"), 1200);
    setTimeout(()=>setState("idle"), 2600);
  };
  return (
    <Stage title="Submit, satisfying" tag="ACTION" tone="butter">
      <div style={{fontSize:11, color:"var(--ink-2)", marginBottom: 14, lineHeight:1.5}}>
        Button collapses to a pill on submit, hands off to a spinner, then morphs to a check.
        No layout shift, no spinner overlay sadness.
      </div>
      <div className="center" style={{flex:1, flexDirection:"column", gap: 18}}>
        <button className={"mi-submit "+state} onClick={click}>
          <span className="label">FINALIZE & SEND</span>
          <span className="spinner"/>
          <svg className="check" viewBox="0 0 22 22" fill="none">
            <path d="M5 11.5 L9.5 16 L17 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="cap" style={{color:"var(--ink-3)"}}>
          state · <b style={{color:"var(--ink)"}}>{state}</b>
        </div>
      </div>
    </Stage>
  );
};

/* ============ 5. PAID! CONFETTI + COUNT-UP ============ */
const useCountUp = (target, dur=900, trigger=0) => {
  const [v, setV] = useState(0);
  useEffect(()=>{
    if (!trigger) { setV(0); return; }
    let raf, start;
    const step = (ts)=>{
      if (!start) start = ts;
      const p = Math.min(1, (ts-start)/dur);
      const eased = 1 - Math.pow(1-p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
  }, [target, dur, trigger]);
  return v;
};

const MIPaid = () => {
  const [burst, setBurst] = useState(0);
  const count = useCountUp(454356, 1100, burst);
  const fire = () => setBurst(b => b+1);
  const colors = ["#cbff3f","#ff5a4d","#4cb4ff","#b29bff","#ff9ec7","#ffd84d","#3acc7a"];
  // Pre-compute confetti positions
  const pieces = Array.from({length:24}, (_,i)=>{
    const ang = (Math.PI * 2 * i) / 24 + Math.random()*0.4;
    const dist = 80 + Math.random()*80;
    return {
      tx: Math.cos(ang)*dist + "px",
      ty: Math.sin(ang)*dist + "px",
      tr: (Math.random()*720-360)+"deg",
      color: colors[i%colors.length],
      delay: (Math.random()*120)+"ms",
    };
  });
  return (
    <Stage title="Paid! · celebration" tag="DELIGHT" tone="lav">
      <div style={{fontSize:11, color:"var(--ink-2)", marginBottom: 10, lineHeight:1.5}}>
        Number rolls up with ease-out cubic. 24-particle confetti burst with randomised vector + spin.
      </div>
      <div className="center" style={{flex:1, flexDirection:"column", gap: 18, position:"relative"}}>
        <div className="cap">M3 · DISCOVERY · ALEHANDRO</div>
        <div className="mi-bignum">₹{count.toLocaleString('en-IN')}</div>
        <div className="row gap-8">
          <div className="pill ok">paid</div>
          <div className="pill" style={{background:"#fff"}}>11 days · vs 18 industry</div>
        </div>
        <div className="mi-btn primary" onClick={fire}>★ trigger payment ★</div>
        <div className="mi-fireworks">
          {burst > 0 && pieces.map((p,i)=>(
            <div
              key={burst+"-"+i}
              className="mi-confetti"
              style={{
                background: p.color,
                animationDelay: p.delay,
                ['--tx']: p.tx, ['--ty']: p.ty, ['--tr']: p.tr,
              }}
            />
          ))}
        </div>
      </div>
    </Stage>
  );
};

/* ============ 6. DRAG-TO-REORDER ============ */
const MIDrag = () => {
  const [items, setItems] = useState([
    {id:"a", t:"Discovery sprint", a:"₹84,000", c:"var(--sky)"},
    {id:"b", t:"UI / UX design",   a:"₹3,00,000", c:"var(--lav)"},
    {id:"c", t:"Brand consulting", a:"₹1,12,000", c:"var(--coral)"},
    {id:"d", t:"Storyboard frames", a:"₹16,000", c:"var(--rose)"},
  ]);
  const [dragId, setDragId] = useState(null);
  const onDragStart = (id, e) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (id, e) => {
    e.preventDefault();
    if (!dragId || dragId===id) return;
    setItems(arr=>{
      const from = arr.findIndex(x=>x.id===dragId);
      const to   = arr.findIndex(x=>x.id===id);
      if (from<0||to<0) return arr;
      const next = arr.slice();
      const [moved] = next.splice(from,1);
      next.splice(to, 0, moved);
      return next;
    });
  };
  const onDragEnd = ()=> setDragId(null);
  return (
    <Stage title="Reorder · drag" tag="MOTION" tone="rose">
      <div style={{fontSize:11, color:"var(--ink-2)", marginBottom: 14, lineHeight:1.5}}>
        Grab the bars. Sibling rows spring into place; the dragged row tilts and shadows.
      </div>
      <div className="mi-drag-list">
        {items.map(it=>(
          <div
            key={it.id}
            className={"mi-drag-item "+(dragId===it.id?"dragging":"")}
            draggable
            onDragStart={(e)=>onDragStart(it.id,e)}
            onDragOver={(e)=>onDragOver(it.id,e)}
            onDragEnd={onDragEnd}
          >
            <span className="grip">⋮⋮</span>
            <div style={{width:10, height:10, borderRadius:"50%", background: it.c, border:"1.5px solid var(--rule)"}}/>
            <div style={{flex:1, fontSize:12, fontWeight:600}}>{it.t}</div>
            <div className="money" style={{fontSize:12}}>{it.a}</div>
          </div>
        ))}
      </div>
      <div style={{flex:1}}/>
      <div className="cap" style={{color:"var(--ink-3)", marginTop:10}}>tip · order maps to milestone sequence</div>
    </Stage>
  );
};

/* ============ Exports ============ */
window.MIToasts = MIToasts;
window.MITooltips = MITooltips;
window.MIStatusMorph = MIStatusMorph;
window.MISubmit = MISubmit;
window.MIPaid = MIPaid;
window.MIDrag = MIDrag;
