import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/invoices";

  if (code) {
    const supabase = await createClient();
    
    // 1. Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("OAuth Exchange Error:", error.message);
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // 2. FORCE cookie flush by fetching user. 
    // This works around a regression in supabase-js v2.91.0+ where 
    // auth state changes are deferred, sometimes missing the response window.
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // 3. Check profile completeness to decide redirect destination
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
    }
  }

  // Fallback to designated next destination
  return NextResponse.redirect(new URL(next, request.url));
}
