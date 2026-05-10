"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { appPageContainerClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { supabase } from "@/lib/supabase/client";
import FeedbackModal from "./feedback/FeedbackModal";
import NotificationBell from "./NotificationBell";
import InstallPwaButton from "./ui/InstallPwaButton";

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
          : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
      )}
    >
      {label}
    </Link>
  );
}

/* ─── User Menu ───────────────────────────────────── */

function UserMenu({
  email,
  avatar,
  onFeedbackClick,
}: {
  email: string;
  avatar?: string;
  onFeedbackClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initials = email.split("@")[0].slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface-muted)] overflow-hidden transition-all hover:ring-2 hover:ring-[color:var(--interactive-primary)]/20"
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-[color:var(--text-secondary)]">
            {initials}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-[color:var(--border-subtle)] bg-white p-1 shadow-xl ring-1 ring-black/5 z-50">
          <div className="px-3 py-2 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
              Account
            </p>
            <p className="text-[13px] font-semibold text-gray-900 truncate">
              {email}
            </p>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              router.push("/profile");
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Profile Settings
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onFeedbackClick();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Provide Feedback
          </button>

          <div className="h-px bg-gray-100 my-1" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppHeader({ rightSlot, leftSlot }: AppHeaderProps) {
  const [user, setUser] = useState<{ email: string; avatar?: string } | null>(
    null,
  );
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          email: authUser.email || "",
          avatar: authUser.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
    }
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[color:var(--border-subtle)] bg-white/90 backdrop-blur-md print:hidden">
        <div
          className={`${appPageContainerClass} flex items-center justify-between py-3.5`}
        >
          <div className="flex items-center gap-3">
            {leftSlot}
            <Link href="/" className="group flex items-center gap-2 mr-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-lime-300)] text-[12px] font-extrabold text-[#111118]">
                L
              </span>
              <span className="text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text-primary)]">
                Lance
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5 text-[color:var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-[color:var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <nav className="ml-4 hidden items-center gap-5 border-l border-[color:var(--border-subtle)] pl-5 sm:flex">
              <NavLink
                href={user ? "/invoice/new" : "/sandbox?guest=1"}
                label="New Invoice"
              />
              {user && (
                <>
                  <NavLink href="/invoices" label="Invoices" />
                  <NavLink href="/clients" label="Clients" />
                </>
              )}
              <NavLink href="/support" label="FAQ" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {rightSlot}
            {user ? (
              <div className="flex items-center gap-3">
                <InstallPwaButton />
                <NotificationBell />
                <UserMenu
                  email={user.email}
                  avatar={user.avatar}
                  onFeedbackClick={() => setIsFeedbackModalOpen(true)}
                />
              </div>
            ) : (
              <Link
                href="/login"
                className="text-[13px] font-semibold text-[color:var(--text-primary)] hover:text-[color:var(--interactive-primary)] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-[color:var(--border-subtle)] bg-white">
            <div className={`${appPageContainerClass} py-3`}>
              <nav className="flex flex-col gap-1">
                <Link
                  href={user ? "/invoice/new" : "/sandbox?guest=1"}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors",
                    pathname === "/invoice/new" || pathname === "/sandbox"
                      ? "bg-gray-100 text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-secondary)] hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  + New Invoice
                </Link>
                {user && (
                  <>
                    <Link
                      href="/invoices"
                      className={cn(
                        "flex items-center px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors",
                        pathname === "/invoices"
                          ? "bg-gray-100 text-[color:var(--text-primary)]"
                          : "text-[color:var(--text-secondary)] hover:bg-gray-50"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Invoices
                    </Link>
                    <Link
                      href="/clients"
                      className={cn(
                        "flex items-center px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors",
                        pathname === "/clients"
                          ? "bg-gray-100 text-[color:var(--text-primary)]"
                          : "text-[color:var(--text-secondary)] hover:bg-gray-50"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Clients
                    </Link>
                    <Link
                      href="/profile"
                      className={cn(
                        "flex items-center px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors",
                        pathname === "/profile"
                          ? "bg-gray-100 text-[color:var(--text-primary)]"
                          : "text-[color:var(--text-secondary)] hover:bg-gray-50"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </>
                )}
                <Link
                  href="/support"
                  className={cn(
                    "flex items-center px-3 py-2.5 text-[14px] font-medium rounded-lg transition-colors",
                    pathname === "/support"
                      ? "bg-gray-100 text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-secondary)] hover:bg-gray-50"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  FAQ
                </Link>
              </nav>
            </div>
          </div>
        )}
      </header>

      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </>
  );
}
