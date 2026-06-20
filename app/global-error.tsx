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
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#988e7c",
              marginBottom: "12px",
            }}
          >
            Lance
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "15px", lineHeight: 1.55, color: "#5f574a", margin: "0 0 24px" }}>
            An unexpected error interrupted the app. Your saved work is safe — please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              display: "inline-block",
              background: "#1e3d33",
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
