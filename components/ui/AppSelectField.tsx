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
    <div className="group relative w-full">
      <select
        {...props}
        className={cn(
          getAppFieldClass({
            hasError,
            hasValue,
            isSelect: true,
          }),
          "cursor-pointer",
          className
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 flex w-4 items-center justify-center text-slate-400 transition-[color] duration-[var(--app-duration-fast)] group-hover:text-slate-600 group-focus-within:text-indigo-600">
        <ChevronDownIcon className="h-4 w-4 translate-y-[0.5px] transition-transform duration-[var(--app-duration-fast)] group-focus-within:rotate-180" />
      </span>
    </div>
  );
}
