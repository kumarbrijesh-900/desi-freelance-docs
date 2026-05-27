"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { appPageContainerClass } from "@/lib/layout-foundation";
import { cn } from "@/lib/ui-foundation";
import { getClientSessionUser, supabase } from "@/lib/supabase/client";
import FeedbackModal from "./feedback/FeedbackModal";
import NotificationBell from "./NotificationBell";
import InstallPwaButton from "./ui/InstallPwaButton";

interface AppHeaderProps {
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

/* ─── Nav Link ─── */

function isNavActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname.startsWith("/projects") || pathname.startsWith("/project/");
  }
  return pathname === href;
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = isNavActive(pathname, href);

  return (
    <Link
      href={href}
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-100 font-syne antialiased",
        isActive
          ? "text-[color:var(--color-lime-warm)]"
          : "text-[#9999A8] hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

/* ─── User Menu ─── */

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
        className="flex h-8 w-8 items-center justify-center border-2 border-[color:var(--color-lime-warm)] bg-[#1A1A24] overflow-hidden transition-all hover:bg-[#2A2A34]"
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-[color:var(--color-lime-warm)]">
            {initials}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right border-2 border-[#111118] bg-white p-1 shadow-[var(--brutal-shadow-md)] z-50">
          <div className="px-3 py-2 border-b-2 border-[#111118] mb-1">
            <p className="text-[10px] font-bold text-[#6E6E7A] uppercase tracking-[0.08em]">
              Account
            </p>
            <p className="text-[13px] font-bold text-[#111118] truncate">
              {email}
            </p>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              if (window.location.pathname === "/profile") {
                window.location.reload();
              } else {
                router.push("/profile");
              }
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-bold text-[#111118] hover:bg-[color:var(--color-lime-warm)] transition-colors"
          >
            Profile Settings
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onFeedbackClick();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-bold text-[#111118] hover:bg-[color:var(--color-lime-warm)] transition-colors"
          >
            Provide Feedback
          </button>

          <div className="h-[2px] bg-[#111118] my-1" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-bold text-[#FF5C00] hover:bg-[#FFF0EC] transition-colors"
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
  const router = useRouter();

  const handleNewInvoice = () => {
    const targetPath = user ? "/invoice/new?fresh=1" : "/invoice/new?guest=1&fresh=1";
    setIsMobileMenuOpen(false);

    if (window.location.pathname === "/invoice/new") {
      window.location.href = targetPath;
      return;
    }

    router.push(targetPath);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function checkAuth() {
      const authUser = await getClientSessionUser();
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
      <header className="sticky top-0 z-50 border-b-2 border-[color:var(--color-lime-warm)] bg-[#111118] print:hidden">
        <div
          className={`${appPageContainerClass} flex items-center justify-between py-3`}
        >
          <div className="flex items-center gap-3">
            {leftSlot}
            <Link href="/" className="group flex items-center gap-2 mr-2">
              <span className="flex h-7 w-7 items-center justify-center border-2 border-[color:var(--color-lime-warm)] bg-[color:var(--color-lime-warm)] text-[12px] font-black text-[#111118]">
                L
              </span>
              <span className="text-[16px] font-black tracking-[0.1em] uppercase text-white font-syne antialiased">
                Lance
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden flex h-8 w-8 items-center justify-center border-2 border-[#333] hover:border-[color:var(--color-lime-warm)] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <nav className="ml-4 hidden items-center gap-5 border-l-2 border-[#333] pl-5 sm:flex">
              {user && <NavLink href="/dashboard" label="Dashboard" />}
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
            <button
              type="button"
              onClick={handleNewInvoice}
              className="hidden sm:inline-flex items-center gap-1.5 border-2 border-[color:var(--color-lime-warm)] bg-[color:var(--color-lime-warm)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#111118] shadow-[var(--brutal-shadow-sm)] hover:shadow-[var(--brutal-shadow-md)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
            >
              + New Invoice
            </button>
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
                className="text-[12px] font-bold uppercase tracking-[0.06em] text-[color:var(--color-lime-warm)] hover:text-white transition-colors border-2 border-[color:var(--color-lime-warm)] px-3 py-1.5 hover:bg-[color:var(--color-lime-warm)] hover:text-[#111118]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden border-t-2 border-[#333] bg-[#111118]">
            <div className={`${appPageContainerClass} py-3`}>
              <nav className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={handleNewInvoice}
                  className="flex items-center justify-center px-3 py-3 text-[13px] font-bold uppercase tracking-[0.04em] bg-[color:var(--color-lime-warm)] text-[#111118] border-b-2 border-[#333] mb-1"
                >
                  + New Invoice
                </button>
                {user && (
                  <Link
                    href="/dashboard"
                    className={cn(
                      "flex items-center px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors",
                      pathname === "/dashboard"
                        ? "bg-[color:var(--color-lime-warm)] text-[#111118]"
                        : "text-[#9999A8] hover:text-white hover:bg-[#1A1A24]"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                {user && (
                  <>
                    <Link
                      href="/invoices"
                      className={cn(
                        "flex items-center px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors",
                        pathname === "/invoices"
                          ? "bg-[color:var(--color-lime-warm)] text-[#111118]"
                          : "text-[#9999A8] hover:text-white hover:bg-[#1A1A24]"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Invoices
                    </Link>
                    <Link
                      href="/clients"
                      className={cn(
                        "flex items-center px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors",
                        pathname === "/clients"
                          ? "bg-[color:var(--color-lime-warm)] text-[#111118]"
                          : "text-[#9999A8] hover:text-white hover:bg-[#1A1A24]"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Clients
                    </Link>
                    <Link
                      href="/profile"
                      className={cn(
                        "flex items-center px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors",
                        pathname === "/profile"
                          ? "bg-[color:var(--color-lime-warm)] text-[#111118]"
                          : "text-[#9999A8] hover:text-white hover:bg-[#1A1A24]"
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
                    "flex items-center px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors",
                    pathname === "/support"
                      ? "bg-[color:var(--color-lime-warm)] text-[#111118]"
                      : "text-[#9999A8] hover:text-white hover:bg-[#1A1A24]"
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
