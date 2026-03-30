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
      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:border-black"
    >
      Logout
    </button>
  );
}