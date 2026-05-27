import * as React from "react";
import { appFieldLabelClass, appFieldHelperTextClass, appFieldErrorTextClass, cn } from "@/lib/ui-foundation";

export interface AppFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
}

export function AppFieldGroup({ label, htmlFor, error, helperText, className, children, ...props }: AppFieldGroupProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {label && (
        <label htmlFor={htmlFor} className={appFieldLabelClass}>
          {label}
        </label>
      )}
      {children}
      {error && <p className={appFieldErrorTextClass}>{error}</p>}
      {!error && helperText && <p className={appFieldHelperTextClass}>{helperText}</p>}
    </div>
  );
}
