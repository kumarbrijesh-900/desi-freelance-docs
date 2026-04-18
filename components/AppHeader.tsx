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
    <header className="border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)]">
      <div className={`${appPageContainerClass} flex items-center justify-between py-4`}>
        <div className="flex items-center gap-3">
          {leftSlot}
          <Link href="/" className="text-xl font-bold text-[color:var(--text-primary)]">
            DesiFreelanceDocs
          </Link>
        </div>

        <div className="flex items-center gap-3">{rightSlot}</div>
      </div>
    </header>
  );
}
