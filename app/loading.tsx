"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-[color:var(--bg-surface)]">
      {/* Skeleton Navbar */}
      <div className="h-16 border-b border-[color:var(--border-subtle)] flex items-center px-8 bg-white">
        <Skeleton className="h-6 w-24 rounded-full bg-zinc-100" />
        <div className="flex-grow" />
        <Skeleton className="h-8 w-8 rounded-full bg-zinc-100" />
      </div>

      <div className="flex-grow p-8 max-w-7xl mx-auto w-full">
        {/* Skeleton Header */}
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 bg-zinc-100" />
            <Skeleton className="h-4 w-48 bg-zinc-50" />
          </div>
          <Skeleton className="h-12 w-32 rounded-lg bg-zinc-100" />
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 border border-[color:var(--border-subtle)] bg-white rounded-xl space-y-4">
              <Skeleton className="h-4 w-1/2 bg-zinc-50" />
              <Skeleton className="h-8 w-full bg-zinc-100" />
              <div className="pt-4 flex justify-between">
                <Skeleton className="h-4 w-24 bg-zinc-50" />
                <Skeleton className="h-4 w-16 bg-zinc-50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
