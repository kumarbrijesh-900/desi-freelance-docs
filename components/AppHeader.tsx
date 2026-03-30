"use client";

import Link from "next/link";

interface AppHeaderProps {
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

export default function AppHeader({
  rightSlot,
  leftSlot,
}: AppHeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {leftSlot}
          <Link href="/" className="text-xl font-bold text-black">
            DesiFreelanceDocs
          </Link>
        </div>

        <div className="flex items-center gap-3">{rightSlot}</div>
      </div>
    </header>
  );
}