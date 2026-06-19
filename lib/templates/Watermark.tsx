"use client";

import React from "react";

export function InvoiceWatermark() {
  return null;
}

/**
 * ─── Offline Copy Mark ─────────────────────────────────────
 *
 * Rendered by the template renderer (over a relative wrapper) only when
 * the invoice is managed offline / not tracked by Lance. Marks the copy
 * without altering the document layout. Prints on the PDF — the preview's
 * print stylesheet sets print-color-adjust: exact on the body.
 */
export function OfflineCopyMark() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 40 }}>
      <span
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "#fbf6e8",
          border: "1px solid #c8943b",
          color: "#a5772a",
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "5px 10px",
          borderRadius: "9999px",
        }}
      >
        Offline copy
      </span>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#f6ecd6",
          borderTop: "1px solid #ecd9b0",
          color: "#a5772a",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
          fontSize: "9px",
          textAlign: "center",
          letterSpacing: "0.02em",
          padding: "7px 10px",
        }}
      >
        Self-managed copy · not tracked by Lance
      </div>
    </div>
  );
}
