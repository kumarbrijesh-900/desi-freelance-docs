import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-[64px] font-bold leading-none tracking-[-0.03em] text-acid mb-2">404</div>
      <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink mb-2.5">Page not found</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-ink-2 mb-7">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/dashboard"
        className="bg-acid text-acc-ink font-bold text-[15px] px-6 py-2.5 rounded-[12px] transition-transform active:scale-[0.96]"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
