"use client";

import { supabase } from "@/lib/supabase/client";

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
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center gap-10 text-center">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            DesiFreelanceDocs
          </p>

          <h1 className="mt-4 text-5xl font-bold tracking-tight text-black">
            Turn messy client briefs into clean freelance documents.
          </h1>

          <p className="mt-4 text-lg text-gray-600">
            Create invoices, scope documents, and structured project details in
            one guided workflow.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-black">Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with Google to continue.
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-6 w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </main>
  );
}