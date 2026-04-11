import type { ReactNode } from "react";
import {
  appFieldErrorTextClass,
  appFieldHelperTextClass,
  appFieldLabelClass,
  cn,
} from "@/lib/ui-foundation";
import {
  type AppFieldSemanticWidth,
  getAppFieldStackClass,
  getAppFieldWidthClass,
} from "@/lib/form-foundation";

interface AppFieldShellProps {
  label?: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  width?: AppFieldSemanticWidth;
  density?: "compact" | "comfortable" | "relaxed";
  className?: string;
  labelClassName?: string;
  children: ReactNode;
}

export default function AppFieldShell({
  label,
  helperText,
  errorText,
  width = "full",
  density = "comfortable",
  className,
  labelClassName,
  children,
}: AppFieldShellProps) {
  return (
    <div
      className={cn(
        getAppFieldStackClass({ density }),
        getAppFieldWidthClass(width),
        className
      )}
    >
      {label ? (
        <div className={cn(appFieldLabelClass, "mb-0", labelClassName)}>{label}</div>
      ) : null}
      {children}
      {errorText ? (
        <p className={appFieldErrorTextClass}>{errorText}</p>
      ) : helperText ? (
        <p className={appFieldHelperTextClass}>{helperText}</p>
      ) : null}
    </div>
  );
}
