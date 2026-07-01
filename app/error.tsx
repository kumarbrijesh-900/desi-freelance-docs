"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[18px] border border-soft bg-paper-2 px-8 py-14 text-center"
        style={{ boxShadow: "var(--shadow-chunk)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-60 w-60 rounded-full bg-ink-3/15"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-coral/25 bg-coral/10 px-3.5 py-1.5 text-[13px] font-semibold text-coral">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 4.3 2.5 18a1.7 1.7 0 0 0 1.5 2.5h16a1.7 1.7 0 0 0 1.5-2.5L13.7 4.3a1.7 1.7 0 0 0-3 0z" />
            </svg>
            Something went wrong
          </span>
          <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink mt-[18px] mb-2.5">
            Something broke on our end
          </h1>
          <p className="mx-auto max-w-[34ch] text-[15px] leading-relaxed text-ink-2 mb-7">
            This one&apos;s on us, not you. Give it another try &mdash; if it keeps happening, we&apos;re here to help.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-[12px] bg-acid px-6 py-2.5 text-[15px] font-bold text-acc-ink transition hover:bg-acid-2 active:scale-[0.96]"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
              </svg>
              Try again
            </button>
            <Link
              href="/dashboard"
              className="rounded-[12px] border border-strong px-6 py-2.5 text-[15px] font-bold text-acid transition hover:bg-acc-soft"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
