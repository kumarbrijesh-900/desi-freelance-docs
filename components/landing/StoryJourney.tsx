import StoryStage from "./StoryStage";
import SkyScene from "./SkyScene";

export default function StoryJourney() {
  return (
    <div className="lst lst-journey">
      <StoryStage>
        <div className="device">
        <div className="bezel">
          <div className="screen">

            {/* S1 · your app, send */}
            <div className="shot s1">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · new invoice</span></div>
                <div className="appbody">
                  <div className="inv">
                    <div className="invtop">
                      <div><div className="invno">INV-042</div><div className="invsub">Client · Brand refresh</div></div>
                      <span className="msa">🔒 MSA attached</span>
                    </div>
                    <div className="invline" />
                    <div className="invrow"><span>Design + build</span><span className="num">₹2,05,000</span></div>
                    <button className="sendbtn">Send invoice →</button>
                  </div>
                </div>
              </div>
            </div>

            {/* S2 · environment, transit out */}
            <div className="shot s2">
              <div className="env">
                <div className="sky" /><div className="ground" />
                <SkyScene />
                <div className="enotice">Sending to Client…</div>
                <div className="dev you"><div className="mini-mon" /><span className="devlab">You</span></div>
                <div className="dev cli"><div className="mini-phone" /><span className="devlab">Client</span></div>
                <svg className="flightsvg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet">
                  <path id="lj-arc" className="arcline" d="M24,68 C62,20 102,20 140,68" />
                  <g className="plane">
                    <path className="planedart" d="M-3,-1.7 L3.6,0 L-3,1.7 L-1,0 Z" />
                    <animateMotion dur="19s" repeatCount="indefinite" rotate="auto" calcMode="spline" keyTimes="0;0.21;0.37;1" keyPoints="0;0;1;1" keySplines="0 0 1 1;.42 0 .58 1;0 0 1 1"><mpath href="#lj-arc" /></animateMotion>
                  </g>
                </svg>
              </div>
            </div>

            {/* S3 · client phone */}
            <div className="shot s3">
              <div className="phonewrap">
                <div className="phone">
                  <div className="pscreen">
                    <div className="pinv">
                      <div className="h">INV-042</div>
                      <div className="l" /><div className="l s" /><div className="l" /><div className="l s" />
                    </div>
                    <div className="viewed">✓ Viewed</div>
                    <div className="gate">
                      <div className="gicon">🔒</div>
                      <div className="gt">Accept terms to view</div>
                      <div className="gsub">Master Service Agreement</div>
                      <button className="acceptbtn">Accept &amp; continue</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* S4 · environment, read-receipt back */}
            <div className="shot s4">
              <div className="env">
                <div className="sky" /><div className="ground" />
                <SkyScene />
                <div className="enotice">Read receipt →</div>
                <div className="dev you"><div className="mini-mon" /><span className="devlab">You</span></div>
                <div className="dev cli"><div className="mini-phone" /><span className="devlab">Client</span></div>
                <svg className="flightsvg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet">
                  <path id="lj-arc2" d="M24,68 C62,20 102,20 140,68" fill="none" />
                  <circle className="rdot" r="3">
                    <animate attributeName="r" values="3;3.9;3" dur="1.1s" repeatCount="indefinite" />
                    <animateMotion dur="19s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.63;0.73;1" keyPoints="1;1;0;0" keySplines="0 0 1 1;.42 0 .58 1;0 0 1 1"><mpath href="#lj-arc2" /></animateMotion>
                  </circle>
                </svg>
              </div>
            </div>

            {/* S5 · your app, activity */}
            <div className="shot s5">
              <div className="app">
                <div className="topbar"><span className="dots"><i /><i /><i /></span><span className="topttl">Lance · dashboard</span><span className="bell">🔔</span></div>
                <div className="appbody dash">
                  <div className="activity">
                    <div className="acttitle">Activity</div>
                    <div className="actrow r1"><span className="ck">✓</span><div><div className="actmain">Client accepted your MSA</div><div className="actmeta">just now</div></div></div>
                    <div className="actrow r2"><span className="eye">👁</span><div><div className="actmain">Client viewed INV-042</div><div className="actmeta">just now</div></div></div>
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
        <span className="seg"><i className="fill" /></span>
      </div>

      <div className="lstm-cap">
        <span className="ac" />
        <div className="ti">Read receipts + MSA gating</div>
        <div className="de">Send once and the contract leads — your client must accept the MSA before the invoice unlocks. The moment they accept or open it, you&rsquo;re notified. Every send carries a live read receipt.</div>
      </div>
    </div>
  );
}
