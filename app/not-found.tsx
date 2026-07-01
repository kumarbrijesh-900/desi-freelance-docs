import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[18px] border border-soft bg-paper-2 px-8 py-14 text-center"
        style={{ boxShadow: "var(--shadow-chunk)" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-ochre/25"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ochre/30 bg-ochre/15 px-3.5 py-1.5 text-[13px] font-semibold text-ochre-deep">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m14.5 9.5-5 5m0-5 5 5" />
            </svg>
            Page not found
          </span>
          <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-ink mt-[18px] mb-2.5">
            This page wandered off
          </h1>
          <p className="mx-auto max-w-[34ch] text-[15px] leading-relaxed text-ink-2 mb-7">
            The link might be broken, or the page may have moved. Let&apos;s get you back on track.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-[12px] bg-acid px-6 py-2.5 text-[15px] font-bold text-acc-ink transition hover:bg-acid-2 active:scale-[0.96]"
          >
            Back to dashboard
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
