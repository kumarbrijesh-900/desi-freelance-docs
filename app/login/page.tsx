"use client";

import { supabase } from "@/lib/supabase/client";
import { MotionReveal, motion } from "@/components/ui/motion-primitives";
import { getAppButtonClass, getAppPanelClass } from "@/lib/ui-foundation";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Subtle gradient accent */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 right-0 h-[500px] w-[600px]"
          style={{
            background: "radial-gradient(ellipse at 80% 10%, rgba(190,255,0,0.06), transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-[400px] w-[500px]"
          style={{
            background: "radial-gradient(ellipse at 20% 90%, rgba(0,212,160,0.04), transparent 60%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 text-center">
        <MotionReveal preset="fade-up" delay={0}>
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Create invoices
              <br />
              <span className="text-[color:var(--color-lime-500)]">
                that get paid.
              </span>
            </h1>

            <p className="mt-5 text-[15px] leading-7 text-[color:var(--text-muted)]">
              Fast GST invoicing for Indian freelancers.
              <br className="hidden sm:block" />
              Paste a brief, get an invoice in seconds.
            </p>
          </div>
        </MotionReveal>

        <MotionReveal preset="fade-up" delay={200}>
          <div className={`w-full max-w-sm ${getAppPanelClass()}`}>
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
              Get started
            </h2>
            <p className="mt-1.5 text-[13px] text-[color:var(--text-muted)]">
              Sign in to create your first invoice.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className={`mt-6 ${getAppButtonClass({
                variant: "secondary",
                size: "lg",
                fullWidth: true,
              })} hover:!border-[color:var(--border-strong)] hover:!shadow-[0_4px_16px_rgba(17,17,24,0.06)]`}
            >
              <GoogleIcon className="h-5 w-5" />
              Continue with Google
            </button>

            <p className="mt-4 text-[11px] leading-4 text-[color:var(--text-soft)]">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </MotionReveal>
      </div>
    </main>
  );
}
