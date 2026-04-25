import type { TextareaHTMLAttributes } from "react";
import AppFieldShell from "@/components/ui/AppFieldShell";
import {
  type AppFieldSemanticWidth,
  getAppFieldWidthClass,
} from "@/lib/form-foundation";
import { cn, getAppFieldClass } from "@/lib/ui-foundation";

type AppTextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  errorText?: string;
  hasValue?: boolean;
  width?: AppFieldSemanticWidth;
  shellClassName?: string;
};

export default function AppTextareaField({
  label,
  helperText,
  errorText,
  hasValue,
  width = "full",
  className,
  shellClassName,
  rows = 5,
  ...props
}: AppTextareaFieldProps) {
  return (
    <AppFieldShell
      label={label}
      helperText={helperText}
      errorText={errorText}
      width={width}
      className={shellClassName}
    >
      <textarea
        {...props}
        rows={rows}
        className={cn(
          getAppFieldClass({
            hasError: errorText,
            hasValue,
            multiline: true,
          }),
          getAppFieldWidthClass(width),
          className,
        )}
      />
    </AppFieldShell>
  );
}
