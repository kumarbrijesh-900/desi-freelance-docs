export default function StoryMilestone() {
  return (
    <div className="lst lst-milestone">
      <div className="frame">
        <div className="viewport">
          <div className="film">

            {/* SHOT 1 · settle M1 */}
            <div className="shot s1">
              <div className="scene">
                <div className="loc"><span className="ld" />You · Acme · Brand refresh</div>
                <div className="proj">Milestones</div>
                <div className="card btn btnp">Mark M1 settled</div>
                <div className="spine">
                  <div className="fill" />
                  <div className="node n1">✓</div>
                  <div className="ring" />
                  <div className="node n2">2</div>
                  <div className="node n3">3</div>
                  <div className="nlab l1">M1 · Design</div>
                  <div className="nlab l2">M2 · Build</div>
                  <div className="nlab l3">M3 · Handoff</div>
                </div>
                <div className="card confirm">
                  <div className="ct">Settle milestone 1?</div>
                  <div className="cb"><span className="cy">Confirm</span><span className="cn">Cancel</span></div>
                </div>
              </div>
            </div>

            {/* SHOT 2 · auto-generate */}
            <div className="shot s2">
              <div className="scene">
                <div className="loc"><span className="ld" style={{ background: "var(--color-gold)" }} />Lance · automatic</div>
                <span className="sparkle" style={{ left: "30%", top: "96px" }}>✨</span>
                <span className="sparkle" style={{ right: "28%", top: "104px", animationDelay: ".1s" }}>✦</span>
                <div className="gen"><span className="spin">⟳</span> Generating next invoice…</div>
                <div className="card">
                  <div className="ch">
                    <div>
                      <div className="ct num">INV-043</div>
                      <div className="cs">Milestone 2 · Build</div>
                    </div>
                    <span className="pill" style={{ background: "var(--color-acc-soft)", color: "var(--color-acid)" }}>New</span>
                  </div>
                  <div className="ln" style={{ width: "78%" }} />
                  <div className="camt num">₹1,20,000</div>
                  <span className="auto">✨ auto-generated</span>
                </div>
              </div>
            </div>

            {/* SHOT 3 · sent */}
            <div className="shot s3">
              <div className="scene">
                <div className="loc"><span className="ld" />→ Acme Corp</div>
                <div className="card">
                  <div className="ct num">INV-043 · M2</div>
                  <div className="cs">₹1,20,000</div>
                </div>
                <div className="path"><svg viewBox="0 0 300 70"><path className="dash" d="M4,55 C90,55 120,14 200,16 C250,17 280,26 296,26" /></svg></div>
                <div className="mring" />
                <div className="mail">✉</div>
                <div className="plane">✈</div>
                <div className="done">✓ Sent to Acme · automatically</div>
              </div>
            </div>

          </div>
          <div className="seam" />
        </div>

        <div className="cap">
          <span className="accent" style={{ background: "var(--color-acid)" }} />
          <div className="t">Auto milestone invoicing</div>
          <div className="d">Working in milestones? Mark one settled — Lance generates the next milestone invoice and sends it to your client automatically. Strictly in sequence, fully auditable, zero re-keying.</div>
        </div>
      </div>
    </div>
  );
}
