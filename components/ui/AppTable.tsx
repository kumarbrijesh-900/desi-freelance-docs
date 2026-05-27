import * as React from "react";
import { cn } from "@/lib/ui-foundation";

export const AppTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto rounded-none border-2 border-[#111118]">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
);
AppTable.displayName = "AppTable";

export const AppTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b-2 [&_tr]:border-[#111118] bg-[color:var(--bg-surface-muted)]", className)} {...props} />
  )
);
AppTableHeader.displayName = "AppTableHeader";

export const AppTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0 bg-white", className)} {...props} />
  )
);
AppTableBody.displayName = "AppTableBody";

export const AppTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[#111118] transition-colors hover:bg-[color:var(--bg-surface-soft)] data-[state=selected]:bg-[color:var(--bg-surface-muted)]",
        className
      )}
      {...props}
    />
  )
);
AppTableRow.displayName = "AppTableRow";

export const AppTableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-bold uppercase tracking-wider text-[color:var(--text-secondary)] [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
);
AppTableHead.displayName = "AppTableHead";

export const AppTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 font-normal", className)}
      {...props}
    />
  )
);
AppTableCell.displayName = "AppTableCell";
