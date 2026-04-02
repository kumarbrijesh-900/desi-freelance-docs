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
  variant?: "segmented" | "cards" | "inline";
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
      ? `app-soft-choice-track grid gap-1.5 rounded-[14px] p-1.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`
      : variant === "inline"
      ? "flex flex-wrap gap-2"
      : `grid gap-3.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`;

  const getCardClass = (isSelected: boolean) => {
    if (variant === "segmented") {
      return `flex min-h-[56px] items-center justify-between gap-3 rounded-[12px] border px-4 py-3.5 text-left text-sm font-medium transition-all duration-150 ${
        isSelected
          ? "app-soft-choice-option-active text-slate-950"
          : "app-soft-choice-option text-slate-700 hover:text-slate-950"
      }`;
    }

    if (variant === "inline") {
      return `inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 text-left text-sm font-medium transition-all duration-150 ${
        isSelected
          ? "app-soft-choice-option-active text-slate-950"
          : "app-soft-choice-option text-slate-700 hover:text-slate-950"
      }`;
    }

    return `block rounded-[14px] border px-4 py-3.5 transition ${
      isSelected
        ? "app-soft-choice-option-active text-slate-950 ring-1 ring-indigo-200/70"
        : "app-soft-choice-option text-slate-700 hover:text-slate-950"
    }`;
  };

  return (
    <div className={wrapperClass}>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const descriptionId = option.description ? `${id}-description` : undefined;
        const isSelected = value === option.value;

        return (
          <motion.label
            key={option.value}
            htmlFor={id}
            className="block cursor-pointer"
            whileHover={reducedMotion ? undefined : { y: -1 }}
            whileTap={reducedMotion ? undefined : { scale: 0.992 }}
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: 0.18,
                    ease: [0, 0, 0.2, 1],
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
              layout
              className={`${getCardClass(
                isSelected
              )} peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400/80 peer-focus-visible:ring-offset-2 ${
                isSelected ? "ring-1 ring-slate-950/15" : ""
              }`}
              data-selected={isSelected ? "true" : "false"}
              transition={{
                duration: 0.2,
                ease: [0, 0, 0.2, 1],
              }}
            >
              <span className="block">
                <span className="block text-sm font-medium leading-5">
                  {option.label}
                </span>
                {option.description ? (
                  <span
                    id={descriptionId}
                    className={cn(
                      "mt-1.5 block text-xs leading-5",
                      isSelected ? "text-slate-600" : "text-slate-500"
                    )}
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
              {variant === "segmented" ? (
                <motion.span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${
                    isSelected ? "bg-indigo-500" : "bg-slate-300"
                  }`}
                  animate={reducedMotion ? undefined : { scale: isSelected ? 1.18 : 1 }}
                  transition={{
                    duration: 0.18,
                    ease: [0, 0, 0.2, 1],
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
