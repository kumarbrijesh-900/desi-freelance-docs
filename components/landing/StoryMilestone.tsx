export default function StoryMilestone() {
  return (
    <div className="lst lst-milestone">
      <div className="device">
        <div className="bezel">
          <div className="screen">

            {/* S1 · settle M1 */}
            <div className="shot s1">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · Client · Brand refresh</span></div>
                <div className="appbody">
                  <div className="mpanel">
                    <div className="mttl">Milestones · Brand refresh</div>
                    <div className="spine">
                      <div className="mtrack"><div className="mfill" /></div>
                      <div className="mnode n1"><span className="num1">1</span><span className="chk">✓</span></div>
                      <div className="mnode n2">2</div>
                      <div className="mnode n3">3</div>
                    </div>
                    <div className="mlabels"><span>M1 · Design</span><span>M2 · Build</span><span>M3 · Handoff</span></div>
                    <button className="msettlebtn">Mark M1 settled</button>
                  </div>
                  <div className="cback" />
                  <div className="confirm">
                    <div className="cq">Settle milestone 1?</div>
                    <div className="csub">Lance will generate &amp; send the next invoice.</div>
                    <div className="cbtns"><span className="cy">Confirm</span><span className="cn">Cancel</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* S2 · auto-generate */}
            <div className="shot s2">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · generating…</span></div>
                <div className="appbody">
                  <div className="gen"><span className="spin">⟳</span> Lance is writing milestone 2&rsquo;s invoice…</div>
                  <span className="sparkle sp1">✨</span><span className="sparkle sp2">✦</span>
                  <div className="newinv">
                    <div className="nitop">
                      <div><div className="nino">INV-043</div><div className="nisub">Milestone 2 · Build</div></div>
                      <span className="newpill">New</span>
                    </div>
                    <div className="niline" />
                    <div className="nirow"><span>Auto-generated from M2</span><span className="num">₹1,20,000</span></div>
                    <span className="autotag">✨ auto-generated, in sequence</span>
                  </div>
                </div>
              </div>
            </div>

            {/* S3 · auto-send (transit out) */}
            <div className="shot s3">
              <div className="env">
                <div className="sky" /><div className="ground" />
                <div className="enotice">Sending INV-043 to Client…</div>
                <div className="dev you"><div className="mini-mon" /><span className="devlab">You</span></div>
                <div className="dev cli"><div className="mini-phone" /><span className="devlab">Client</span></div>
                <svg className="flightsvg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet">
                  <path id="lm-arc" className="arcline" d="M24,68 C62,20 102,20 140,68" />
                  <g className="plane">
                    <path className="planedart" d="M-3,-1.7 L3.6,0 L-3,1.7 L-1,0 Z" />
                    <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" calcMode="spline" keyTimes="0;0.57;0.72;1" keyPoints="0;0;1;1" keySplines="0 0 1 1;.42 0 .58 1;0 0 1 1"><mpath href="#lm-arc" /></animateMotion>
                  </g>
                </svg>
              </div>
            </div>

            {/* S4 · sent automatically */}
            <div className="shot s4">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · Client · Brand refresh</span></div>
                <div className="appbody mdash">
                  <div className="mpanel">
                    <div className="mttl">Milestones · Brand refresh</div>
                    <div className="spine">
                      <div className="mtrack"><div className="mfill" style={{ width: "52%" }} /></div>
                      <div className="mnode n1 done"><span className="num1">1</span><span className="chk">✓</span></div>
                      <div className="mnode n2 active">2</div>
                      <div className="mnode n3">3</div>
                    </div>
                    <div className="mlabels"><span>M1 · Design</span><span>M2 · Build</span><span>M3 · Handoff</span></div>
                  </div>
                  <div className="senttoast"><span className="stick">✓</span> INV-043 sent to Client · automatically</div>
                </div>
              </div>
            </div>

            <div className="seam" />
          </div>
        </div>
        <div className="neck" />
        <div className="base" />
      </div>

      <div className="lstm-cap">
        <span className="ac" />
        <div className="ti">Auto milestone invoicing</div>
        <div className="de">Working in milestones? Mark one settled and Lance generates the next milestone invoice and sends it to your client automatically — strictly in sequence, fully auditable, zero re-keying.</div>
      </div>
    </div>
  );
}
