"use client";

import { supabase } from "@/lib/supabase/client";

export default function LogoutButton() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="app-focus-ring border border-[color:var(--color-ink)] px-4 py-2 text-sm font-bold text-[color:var(--color-ink)] transition-[border-color,color,background-color] duration-[var(--app-duration-fast)] hover:border-[color:var(--color-ink)] hover:bg-[color:var(--color-paper)]"
    >
      Logout
    </button>
  );
}
