"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/ui/app-icons";
import { cn, getAppFieldClass } from "@/lib/ui-foundation";

type AppSelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  children: ReactNode;
  hasError?: string;
  hasValue?: boolean;
};

export default function AppSelectField({
  children,
  className,
  hasError,
  hasValue,
  ...props
}: AppSelectFieldProps) {
  return (
    <div className="group relative flex w-full min-w-0">
      <select
        {...props}
        className={cn(
          getAppFieldClass({
            hasError,
            hasValue,
            isSelect: true,
          }),
          "max-w-full cursor-pointer",
          className,
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 flex w-4 shrink-0 items-center justify-center text-[color:var(--color-ink-3)] transition-[color] duration-[var(--app-duration-fast)] group-hover:text-[color:var(--color-ink)] group-focus-within:text-[color:var(--focus-ring)]">
        <ChevronDownIcon className="h-4 w-4 translate-y-[0.5px] transition-transform duration-[var(--app-duration-fast)] group-focus-within:rotate-180" />
      </span>
    </div>
  );
}
