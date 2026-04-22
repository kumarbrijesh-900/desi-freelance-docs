/**
 * ─── AppHeader ─────────────────────────────────────
 *
 * Global header with Lance logomark, navigation links
 * for authenticated users (Profile, Clients), and
 * right-slot for contextual actions.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { appPageContainerClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { supabase } from "@/lib/supabase/client";

interface AppHeaderProps {
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

/* ─── Nav Link ────────────────────────────────────── */

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "text-[13px] font-medium transition-colors duration-150",
        isActive
          ? "text-[color:var(--text-primary)]"
          : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
      )}
    >
      {label}
    </Link>
  );
}

/* ─── User Avatar ─────────────────────────────────── */

function UserAvatar({ email, avatar }: { email: string; avatar?: string }) {
  const initials = email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  if (avatar) {
    return (
      <img
        src={avatar}
        alt="Profile"
        className="h-7 w-7 rounded-full border border-[color:var(--border-subtle)] object-cover"
      />
    );
  }

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--bg-surface-muted)] border border-[color:var(--border-subtle)] text-[10px] font-bold text-[color:var(--text-secondary)]">
      {initials}
    </div>
  );
}

export default function AppHeader({
  rightSlot,
  leftSlot,
}: AppHeaderProps) {
  const [user, setUser] = useState<{ email: string; avatar?: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email || "",
          avatar: authUser.user_metadata?.avatar_url,
        });
      }
    }
    checkAuth();
  }, []);

  return (
    <header className="border-b border-[color:var(--border-subtle)] bg-white/90 backdrop-blur-md print:hidden">
      <div className={`${appPageContainerClass} flex items-center justify-between py-3.5`}>
        <div className="flex items-center gap-3">
          {leftSlot}
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
              L
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Lance
            </span>
          </Link>

          {/* Nav links — only for authenticated users */}
          {user && (
            <nav className="ml-4 hidden items-center gap-4 border-l border-[color:var(--border-subtle)] pl-4 sm:flex">
              <NavLink href="/invoice/new" label="New Invoice" />
              <NavLink href="/invoices" label="Invoices" />
              <NavLink href="/clients" label="Clients" />
              <NavLink href="/profile" label="Profile" />
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {rightSlot}
          {user && (
            <Link href="/profile" title="Profile">
              <UserAvatar email={user.email} avatar={user.avatar} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
