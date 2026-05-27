import * as React from "react";
import { getAppFieldClass, cn } from "@/lib/ui-foundation";

export interface AppInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        className={cn(getAppFieldClass({ hasError: hasError ? "true" : undefined }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
AppInput.displayName = "AppInput";
