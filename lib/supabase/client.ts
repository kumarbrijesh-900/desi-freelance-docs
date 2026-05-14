import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function getClientSessionUser(): Promise<User | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to read browser session:", error);
    return null;
  }

  return session?.user ?? null;
}

export function withTimeoutFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = globalThis.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(fallback);
    }, timeoutMs);

    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        globalThis.clearTimeout(timeoutId);
        resolve(fallback);
      });
  });
}
