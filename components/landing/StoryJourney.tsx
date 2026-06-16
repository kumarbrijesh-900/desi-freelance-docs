export default function StoryJourney() {
  return (
    <div className="lst lst-journey">
      <div className="frame">
        <div className="viewport">
          <div className="film">

            {/* SHOT 1 · you send */}
            <div className="shot s1">
              <div className="scene">
                <div className="loc"><span className="ld" />You · new invoice</div>
                <div className="card inv">
                  <div className="h">
                    <div>
                      <div className="ititle num">INV-042</div>
                      <div className="iwho">Acme Corp · ₹2,41,900</div>
                    </div>
                    <span className="pill" style={{ background: "#e9e0c9", color: "var(--color-ink-2)" }}>Draft</span>
                  </div>
                  <div className="msatag"><span className="pill">🔒 MSA attached</span></div>
                </div>
                <div className="glow sglow" />
                <div className="card send btnp">Send invoice →</div>
              </div>
            </div>

            {/* SHOT 2 · in transit */}
            <div className="shot s2">
              <div className="scene">
                <div className="loc"><span className="ld" />In transit</div>
                <div className="from">Delivering to acme@client.com…</div>
                <div className="path">
                  <svg viewBox="0 0 400 80"><path className="dash" d="M4,70 C120,70 150,12 250,16 C320,18 360,30 396,30" /></svg>
                </div>
                <div className="mailring" />
                <div className="mail">✉</div>
              </div>
            </div>

            {/* SHOT 3 · client view */}
            <div className="shot s3">
              <div className="scene">
                <div className="loc"><span className="ld" style={{ background: "var(--color-sky)" }} />Acme Corp · inbox</div>
                <div className="phone">
                  <div className="bar">Invoice from You</div>
                  <div className="body">
                    <div className="card gate">
                      <div className="lock">🔒</div>
                      <div className="gt">Accept the Master Service Agreement to view this invoice</div>
                      <div className="btnp accept">Accept terms</div>
                    </div>
                    <div className="ok"><span className="ck">✓</span> Terms accepted</div>
                    <div className="card reveal">
                      <div className="rt num">INV-042</div>
                      <div className="rln" style={{ width: "80%" }} />
                      <div className="rln" style={{ width: "60%" }} />
                      <div className="ramt num">₹2,41,900</div>
                      <div className="paid"><span className="pill">Viewed</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SHOT 4 · you're notified */}
            <div className="shot s4">
              <div className="scene">
                <div className="loc"><span className="ld" />You · dashboard</div>
                <div className="topbar">
                  <div className="bell">🔔<span className="badge">2</span><span className="bellring" /></div>
                </div>
                <div className="tray">
                  <div className="th">Activity</div>
                  <div className="ev ev1">
                    <div className="ei">✓</div>
                    <div><div className="et">Acme accepted your MSA</div><div className="es">just now</div></div>
                  </div>
                  <div className="ev ev2">
                    <div className="ei">👁</div>
                    <div><div className="et">Acme viewed INV-042</div><div className="es">just now</div></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <div className="seam" />
        </div>

        <div className="cap">
          <span className="accent" style={{ background: "var(--color-sky)" }} />
          <div className="t">Read receipts + MSA gating</div>
          <div className="d">Send once and your contract leads: the client must accept your MSA before the invoice unlocks. The moment they accept and open it, you’re notified — every send carries a live receipt.</div>
        </div>
      </div>
    </div>
  );
}
