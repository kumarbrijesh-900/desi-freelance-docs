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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-ink-2 mb-3">Something broke</div>
      <h1 className="font-display text-[34px] font-bold tracking-[-0.02em] text-ink mb-2.5">This page hit a snag</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-ink-2 mb-7">
        An unexpected error interrupted this page. Your saved work is safe — try again, or head back to your dashboard.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-acid text-acc-ink font-bold text-[15px] px-6 py-2.5 rounded-[12px] transition-transform active:scale-[0.96]"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="border border-strong text-ink font-bold text-[15px] px-6 py-2.5 rounded-[12px] hover:bg-paper-2 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
