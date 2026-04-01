"use client";

import { motion, useReducedMotion } from "framer-motion";

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
  variant?: "segmented" | "cards";
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
      ? `grid gap-2 rounded-[22px] border border-slate-200/90 bg-slate-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_24px_rgba(15,23,42,0.04)] ${columns === 2 ? "sm:grid-cols-2" : ""}`
      : "space-y-3";

  const getCardClass = (isSelected: boolean) => {
    if (variant === "segmented") {
      return `flex min-h-[54px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150 ${
        isSelected
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]"
          : "border-slate-200/80 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-950"
      }`;
    }

    return `block rounded-2xl border px-4 py-3 transition ${
      isSelected
        ? "border-slate-900 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/8"
        : "border-slate-200 bg-white/88 hover:border-slate-300 hover:bg-white"
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
                    type: "spring",
                    stiffness: 420,
                    damping: 30,
                    mass: 0.75,
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
              )} peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2 ${
                isSelected ? "ring-1 ring-slate-950/15" : ""
              }`}
              data-selected={isSelected ? "true" : "false"}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
                mass: 0.82,
              }}
            >
              <span className="block">
                <span className="block text-sm font-medium leading-5">
                  {option.label}
                </span>
                {option.description ? (
                  <span
                    id={descriptionId}
                    className={`mt-1 block text-xs leading-5 ${
                      isSelected
                        ? variant === "segmented"
                          ? "text-white/80"
                          : "text-slate-600"
                        : "text-slate-500"
                    }`}
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
              {variant === "segmented" ? (
                <motion.span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-slate-300"
                  }`}
                  animate={reducedMotion ? undefined : { scale: isSelected ? 1.18 : 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 28,
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
