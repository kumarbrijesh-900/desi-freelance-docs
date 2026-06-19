"use client";

import React from "react";

/**
 * ─── Legal Disclaimer ─────────────────────────────────────
 *
 * Standard legal text required for digital invoices to ensure
 * compliance without requiring a physical signature.
 */
export function LegalDisclaimer() {
  return (
    <div className="mt-8 px-4 max-w-2xl mx-auto text-center">
      <p className="text-[9px] md:text-[10px] text-[color:var(--color-ink-2)] leading-tight">
        This is a computer-generated document and does not require a physical
        signature. We declare that this invoice shows the actual price of the
        services described and that all particulars are true and correct.
      </p>
    </div>
  );
}
