"use client";

import Link from "next/link";
import { appPageContainerClass } from "@/lib/layout-foundation";

interface AppHeaderProps {
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

export default function AppHeader({
  rightSlot,
  leftSlot,
}: AppHeaderProps) {
  return (
    <header className="border-b border-[color:var(--border-subtle)] bg-white/90 backdrop-blur-md">
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
        </div>

        <div className="flex items-center gap-3">{rightSlot}</div>
      </div>
    </header>
  );
}
