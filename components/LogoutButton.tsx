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
      className="app-focus-ring rounded-xl border border-[color:var(--border-default)] px-4 py-2 text-sm font-medium text-[color:var(--text-primary)] transition-[border-color,color,background-color] duration-[var(--app-duration-fast)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-soft)]"
    >
      Logout
    </button>
  );
}
