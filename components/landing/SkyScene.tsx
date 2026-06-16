import type { CSSProperties } from "react";

// Deterministic fine-mote set for the screen's own air (SSR-safe).
const INNER_MOTES: { l: number; t: number; s: number; mo: number; mx: number; d: number; dl: number }[] = [
  { l: 14, t: 60, s: 2.5, mo: 0.6, mx: 6, d: 2.6, dl: -0.8 },
  { l: 30, t: 78, s: 2, mo: 0.5, mx: -5, d: 3.2, dl: -1.5 },
  { l: 46, t: 50, s: 3, mo: 0.65, mx: 8, d: 2.2, dl: -0.4 },
  { l: 58, t: 72, s: 2, mo: 0.55, mx: -8, d: 3.6, dl: -2.0 },
  { l: 70, t: 56, s: 2.5, mo: 0.6, mx: 6, d: 2.8, dl: -1.0 },
  { l: 84, t: 68, s: 2, mo: 0.5, mx: -6, d: 3.4, dl: -1.8 },
  { l: 38, t: 64, s: 2.5, mo: 0.6, mx: 10, d: 2.4, dl: -0.6 },
];

export default function SkyScene() {
  return (
    <>
      <div className="sun" />
      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />
      <div className="hills">
        <span className="hill h1" />
        <span className="hill h2" />
        <span className="hill h3" />
      </div>
      <div className="birds">
        <span className="bird b1" />
        <span className="bird b2" />
      </div>
      <div className="imotes">
        {INNER_MOTES.map((m, i) => (
          <i
            key={i}
            style={
              {
                left: `${m.l}%`,
                top: `${m.t}%`,
                width: m.s,
                height: m.s,
                "--mo": m.mo,
                "--mx": `${m.mx}px`,
                animationDuration: `${m.d}s`,
                animationDelay: `${m.dl}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </>
  );
}
