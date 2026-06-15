import React from "react";

export function AppPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages === 0) return null; // Only hide if there are exactly 0 pages (no data)

  return (
    <div className="flex items-center justify-between border border-soft bg-white shadow-[var(--brutal-shadow-md)] p-2 mt-8">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-30 hover:bg-neutral-100 transition-colors disabled:hover:bg-transparent"
      >
        ← Prev
      </button>

      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
        Page <span className="text-black">{currentPage}</span> of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-30 hover:bg-neutral-100 transition-colors disabled:hover:bg-transparent"
      >
        Next →
      </button>
    </div>
  );
}
