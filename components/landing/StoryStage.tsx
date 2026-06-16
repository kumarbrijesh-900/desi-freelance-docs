import type { CSSProperties, ReactNode } from "react";

// Deterministic mote set (fixed, not random — safe for SSR/hydration).
const OUTER_MOTES: { l: number; t: number; s: number; mo: number; mx: number; d: number; dl: number }[] = [
  { l: 6, t: 30, s: 3, mo: 0.6, mx: 8, d: 3.4, dl: -1.0 },
  { l: 14, t: 62, s: 2.5, mo: 0.5, mx: -6, d: 4.2, dl: -2.5 },
  { l: 22, t: 44, s: 4, mo: 0.7, mx: 12, d: 3.0, dl: -0.5 },
  { l: 30, t: 78, s: 2, mo: 0.45, mx: -10, d: 4.8, dl: -3.0 },
  { l: 38, t: 24, s: 3.5, mo: 0.65, mx: 6, d: 3.6, dl: -1.6 },
  { l: 46, t: 84, s: 2.5, mo: 0.55, mx: 14, d: 4.0, dl: -2.0 },
  { l: 54, t: 54, s: 3, mo: 0.6, mx: -8, d: 3.2, dl: -0.8 },
  { l: 62, t: 34, s: 4.5, mo: 0.5, mx: 10, d: 4.6, dl: -3.5 },
  { l: 70, t: 70, s: 2, mo: 0.7, mx: -12, d: 3.8, dl: -1.2 },
  { l: 78, t: 48, s: 3, mo: 0.45, mx: 8, d: 4.4, dl: -2.8 },
  { l: 86, t: 26, s: 3.5, mo: 0.6, mx: -6, d: 3.0, dl: -0.4 },
  { l: 92, t: 66, s: 2.5, mo: 0.55, mx: 12, d: 4.2, dl: -2.2 },
  { l: 10, t: 50, s: 2, mo: 0.5, mx: 6, d: 3.5, dl: -1.8 },
  { l: 50, t: 38, s: 3, mo: 0.65, mx: -10, d: 4.0, dl: -3.2 },
  { l: 66, t: 58, s: 2.5, mo: 0.5, mx: 8, d: 3.3, dl: -0.6 },
  { l: 34, t: 60, s: 3.5, mo: 0.6, mx: -14, d: 4.7, dl: -2.6 },
];

export default function StoryStage({ children }: { children: ReactNode }) {
  return (
    <div className="stage3d">
      <div className="atmo" />
      <div className="deco-grid" />
      <div className="motes">
        {OUTER_MOTES.map((m, i) => (
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
      <div className="deco-rail">
        <i className="spark" />
      </div>
      <div className="bokeh bk1" />
      <div className="bokeh bk2" />
      <div className="bokeh bk3" />
      <div className="deviceframe">
        <div className="contact" />
        {children}
      </div>
    </div>
  );
}
