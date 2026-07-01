"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2ebd8",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          color: "#211c16",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: "440px",
            width: "100%",
            textAlign: "center",
            background: "#fbf6e8",
            border: "1px solid #ddd3bd",
            borderRadius: "18px",
            padding: "56px 32px",
            boxShadow: "0 14px 30px -16px rgba(30,61,51,0.48)",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#c2502f",
              background: "rgba(194,80,47,0.10)",
              border: "1px solid rgba(194,80,47,0.22)",
              borderRadius: "999px",
              padding: "6px 14px",
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 4.3 2.5 18a1.7 1.7 0 0 0 1.5 2.5h16a1.7 1.7 0 0 0 1.5-2.5L13.7 4.3a1.7 1.7 0 0 0-3 0z" />
            </svg>
            Something went wrong
          </span>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", margin: "18px 0 10px" }}>
            Something broke on our end
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.55, color: "#5f574a", margin: "0 0 26px" }}>
            This one&apos;s on us, not you. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              display: "inline-block",
              background: "#3a6e59",
              color: "#f0e9d6",
              fontSize: "15px",
              fontWeight: 700,
              padding: "12px 26px",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              letterSpacing: "-0.01em",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
