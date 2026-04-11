import type { InputHTMLAttributes } from "react";
import AppFieldShell from "@/components/ui/AppFieldShell";
import {
  type AppFieldSemanticWidth,
  getAppFieldWidthClass,
} from "@/lib/form-foundation";
import { cn, getAppFieldClass } from "@/lib/ui-foundation";

type AppTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  hasValue?: boolean;
  width?: AppFieldSemanticWidth;
  shellClassName?: string;
};

export default function AppTextField({
  label,
  helperText,
  errorText,
  hasValue,
  width = "full",
  className,
  shellClassName,
  ...props
}: AppTextFieldProps) {
  return (
    <AppFieldShell
      label={label}
      helperText={helperText}
      errorText={errorText}
      width={width}
      className={shellClassName}
    >
      <input
        {...props}
        className={cn(
          getAppFieldClass({
            hasError: errorText,
            hasValue,
          }),
          getAppFieldWidthClass(width),
          className
        )}
      />
    </AppFieldShell>
  );
}
