"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { MotionReveal } from "@/components/ui/motion-primitives";
import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";
import Link from "next/link";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ─── Inner component reads search params ─── */
function SignupCard() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const handleGoogleSignup = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://lanceinvoice.xyz/auth/callback",
      },
    });
  };

  return (
    <div className={`w-full max-w-sm ${getAppPanelClass()}`}>
      <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
        Create account
      </h2>
      <p className="mt-1.5 text-[13px] text-[color:var(--text-muted)]">
        Join Lance to create and manage professional GST invoices.
      </p>

      <button
        type="button"
        onClick={handleGoogleSignup}
        className={`mt-6 ${getAppButtonClass({
          variant: "secondary",
          size: "lg",
          fullWidth: true,
        })} hover:!border-[color:var(--border-strong)] hover:!shadow-[0_4px_16px_rgba(17,17,24,0.06)]`}
      >
        <GoogleIcon className="h-5 w-5" />
        Sign up with Google
      </button>

      <p className="mt-6 text-center text-[13px] text-[color:var(--text-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[color:var(--brand-indigo)] hover:underline">
          Log in
        </Link>
      </p>

      <p className="mt-6 text-[11px] leading-4 text-[color:var(--text-soft)]">
        By signing up, you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}

/* ─── Page ─── */
export default function SignupPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Subtle gradient accent */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 right-0 h-[500px] w-[600px]"
          style={{
            background:
              "radial-gradient(ellipse at 80% 10%, rgba(190,255,0,0.06), transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-[400px] w-[500px]"
          style={{
            background:
              "radial-gradient(ellipse at 20% 90%, rgba(0,212,160,0.04), transparent 60%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 text-center">
        <MotionReveal preset="fade-up" delay={0}>
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Professional invoicing,
              <br />
              <span className="text-[color:var(--color-lime-500)]">
                simplified for you.
              </span>
            </h1>

            <p className="mt-5 text-[15px] leading-7 text-[color:var(--text-muted)]">
              The fastest way for Indian freelancers to bill clients.
              <br className="hidden sm:block" />
              Join thousands of creatives getting paid on time.
            </p>
          </div>
        </MotionReveal>

        <MotionReveal preset="fade-up" delay={200}>
          <Suspense
            fallback={
              <div className={`w-full max-w-sm ${getAppPanelClass()}`}>
                <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
                  Creating account...
                </h2>
                <div className="mt-6 h-11 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface-soft)] animate-pulse" />
              </div>
            }
          >
            <SignupCard />
          </Suspense>
        </MotionReveal>
      </div>
    </main>
  );
}
