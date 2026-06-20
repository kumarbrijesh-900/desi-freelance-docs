import StoryStage from "./StoryStage";

export default function StoryCreate() {
  return (
    <div className="lst lst-create">
      <StoryStage>
        <div className="device">
        <div className="bezel">
          <div className="screen">

            {/* S1 · attach contract (MSA) */}
            <div className="shot s1">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · new invoice · Brand refresh</span></div>
                <div className="appbody">
                  <div className="ccard">
                    <div className="cch"><div className="t">Contract terms (MSA)</div><div className="sw"><span className="knob" /></div></div>
                    <div className="msa">
                      <div className="mt"><span className="ok">✓</span> Master Service Agreement attached</div>
                      <div className="ms">Scope · revisions · IP · payment · termination — 6 standard clauses</div>
                      <div className="mnote">Client reviews &amp; accepts before work begins.</div>
                    </div>
                    <div className="cplain">shown to your client as <b>“contract terms”</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* S2 · add milestones */}
            <div className="shot s2">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · new invoice · Brand refresh</span></div>
                <div className="appbody">
                  <div className="cpanel">
                    <div className="cttl">Split into milestones</div>
                    <div className="crow now r1"><span className="ci">1</span><span className="cl"><span className="cn">M1 · Design</span><span className="cs">due on delivery</span></span><span className="camt">₹85,000</span><span className="cpill">Bills now</span></div>
                    <div className="crow wait r2"><span className="ci">2</span><span className="cl"><span className="cn">M2 · Build</span><span className="cs">unlocks on delivery</span></span><span className="camt">₹1,20,000</span><span className="cpill">Waits</span></div>
                    <div className="crow wait r3"><span className="ci">3</span><span className="cl"><span className="cn">M3 · Handoff</span><span className="cs">unlocks on delivery</span></span><span className="camt">₹40,000</span><span className="cpill">Waits</span></div>
                    <div className="cfoot">Only M1 bills now — M2 &amp; M3 unlock as you deliver.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* S3 · choose a template */}
            <div className="shot s3">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · new invoice · template</span></div>
                <div className="appbody">
                  <div className="twrap">
                    <div className="ttl">Choose a template</div>
                    <div className="tgrid">
                      <div className="tcard t-classic tc1"><div className="chk">✓</div><div className="th" /><div className="tb"><div className="ln" /><div className="ln s" /></div><div className="tn">Classic</div></div>
                      <div className="tcard t-edi tc2"><div className="th" /><div className="tb"><div className="ln" /><div className="ln s" /></div><div className="tn">Editorial</div></div>
                      <div className="tcard t-mid tc3"><div className="th" /><div className="tb"><div className="ln" /><div className="ln s" /></div><div className="tn">Midnight</div></div>
                      <div className="tcard t-sak tc4"><div className="th" /><div className="tb"><div className="ln" /><div className="ln s" /></div><div className="tn">Sakura</div></div>
                    </div>
                    <div className="tfoot">Pick how it looks — <b>11 templates</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* S4 · save offline or share online */}
            <div className="shot s4">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · INV-043 ready</span></div>
                <div className="appbody">
                  <div className="forkwrap">
                    <div className="forkh">Invoice ready — save it or send it</div>
                    <div className="fork">
                      <div className="fc off fc1"><div className="ic">↓</div><div className="ft">Save offline</div><div className="fs">Self-managed PDF, not tracked by Lance</div><span className="fbadge">Offline copy</span></div>
                      <div className="fc on fc2"><div className="ic">↗</div><div className="ft">Share online</div><div className="fs">Live link · client accepts, you see receipts</div><span className="fbadge">MSA gate live</span></div>
                    </div>
                    <div className="forkor">your call — every time</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="seam" />
          </div>
        </div>
        <div className="neck" />
        <div className="base" />
        </div>
      </StoryStage>

      <div className="storynav">
        <span className="seg"><i className="fill" /></span>
        <span className="seg"><i className="fill" /></span>
        <span className="seg"><i className="fill" /></span>
        <span className="seg"><i className="fill" /></span>
      </div>

      <div className="lstm-cap">
        <span className="ac" />
        <div className="ti">Build the invoice your way</div>
        <div className="de">Attach a contract, split it into milestones, pick a template — then keep a clean offline copy or share a live link your client accepts online. One flow, your choice at the end.</div>
      </div>
    </div>
  );
}
