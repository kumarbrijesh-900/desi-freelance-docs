"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/ui-foundation";

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

interface ChoiceCardsProps<T extends string> {
  name: string;
  value: T | "";
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  variant?: "segmented" | "cards" | "inline" | "minimal-segmented";
  columns?: 1 | 2;
}

export default function ChoiceCards<T extends string>({
  name,
  value,
  options,
  onChange,
  variant = "cards",
  columns = 1,
}: ChoiceCardsProps<T>) {
  const reducedMotion = useReducedMotion();
  const wrapperClass =
    variant === "segmented"
      ? `app-soft-choice-track grid min-w-0 auto-rows-fr gap-1 rounded-[8px] p-1 ${columns === 2 ? "grid-cols-2" : ""}`
      : variant === "minimal-segmented"
        ? cn(
            "flex items-center gap-1 border border-[color:var(--border-default)] rounded-[var(--app-radius-control)] p-1 h-11 bg-transparent",
            columns === 2 ? "grid grid-cols-2" : "",
          )
        : variant === "inline"
          ? "flex flex-wrap gap-1.5"
          : `grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`;

  const getCardClass = (isSelected: boolean) => {
    if (variant === "segmented") {
      return `flex min-h-[40px] min-w-0 items-center gap-2 rounded-[6px] border px-3 py-2 text-left text-[13px] font-medium transition-all duration-150 ${
        isSelected
          ? "app-soft-choice-option-active text-[color:var(--text-primary)]"
          : "app-soft-choice-option text-[color:var(--text-primary)] opacity-65 hover:opacity-100"
      }`;
    }

    if (variant === "minimal-segmented") {
      return `flex h-full min-w-0 items-center justify-center gap-2 rounded-[4px] px-3 py-1 text-center text-[13px] font-medium transition-all duration-200 ${
        isSelected
          ? "bg-white text-[color:var(--text-primary)] shadow-sm ring-1 ring-black/5"
          : "bg-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
      }`;
    }

    if (variant === "inline") {
      return `inline-flex min-h-9 min-w-fit items-center justify-center rounded-full border px-3 py-1.5 text-left text-[13px] font-medium whitespace-nowrap transition-all duration-150 ${
        isSelected
          ? "app-soft-choice-option-active text-[color:var(--text-primary)]"
          : "app-soft-choice-option text-[color:var(--text-primary)] opacity-65 hover:opacity-100"
      }`;
    }

    return `block rounded-[var(--app-radius-card)] border px-4 py-3 transition ${
      isSelected
        ? "app-soft-choice-option-active text-[color:var(--text-primary)]"
        : "app-soft-choice-option text-[color:var(--text-primary)] opacity-65 hover:opacity-100"
    }`;
  };

  return (
    <div className={wrapperClass}>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const descriptionId = option.description
          ? `${id}-description`
          : undefined;
        const isSelected = value === option.value;

        return (
          <motion.label
            key={option.value}
            htmlFor={id}
            className="block h-full min-w-0 cursor-pointer"
            whileHover={
              reducedMotion || variant === "minimal-segmented"
                ? undefined
                : { y: -1 }
            }
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: 0.15,
                    ease: [0.16, 1, 0.3, 1],
                  }
            }
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              aria-label={option.label}
              aria-describedby={descriptionId}
              className="peer sr-only"
            />

            <motion.span
              layout={variant !== "minimal-segmented"}
              className={cn(
                getCardClass(isSelected),
                "peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--focus-ring)] peer-focus-visible:ring-offset-1",
                isSelected && variant !== "minimal-segmented"
                  ? "ring-1 ring-[color:var(--color-lime-300)]"
                  : "",
              )}
              data-selected={isSelected ? "true" : "false"}
              transition={{
                duration: 0.2,
                ease: "easeInOut",
              }}
            >
              <span
                className={cn(
                  "block min-w-0",
                  variant === "segmented" || variant === "minimal-segmented"
                    ? "flex-1 pr-1"
                    : "",
                )}
              >
                <span
                  className={cn(
                    "block text-[13px] font-medium",
                    variant === "segmented" || variant === "minimal-segmented"
                      ? "break-words leading-[1.35]"
                      : "leading-5",
                  )}
                >
                  {option.label}
                </span>
                {option.description ? (
                  <span
                    id={descriptionId}
                    className={cn(
                      "mt-1 block text-[11px] leading-5",
                      isSelected
                        ? "text-[color:var(--text-secondary)]"
                        : "text-[color:var(--text-muted)]",
                    )}
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
              {(variant === "segmented" || variant === "minimal-segmented") &&
              isSelected ? (
                <motion.span
                  layoutId={
                    variant === "minimal-segmented" ? undefined : `${name}-dot`
                  }
                  aria-hidden="true"
                  className={`ml-auto h-1.5 w-1.5 shrink-0 rounded-full ${
                    isSelected
                      ? "bg-[color:var(--color-lime-500)]"
                      : "bg-[color:var(--border-strong)]"
                  }`}
                  animate={
                    reducedMotion ? undefined : { scale: isSelected ? 1.15 : 1 }
                  }
                  transition={{
                    duration: 0.15,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                />
              ) : null}
            </motion.span>
          </motion.label>
        );
      })}
    </div>
  );
}
