"use client";

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
  const wrapperClass =
    variant === "segmented"
      ? `grid gap-2 rounded-[20px] border border-slate-200 bg-slate-100/80 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${columns === 2 ? "sm:grid-cols-2" : ""}`
      : "space-y-3";

  const getCardClass = (isSelected: boolean) => {
    if (variant === "segmented") {
      return `flex min-h-[50px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-150 ${
        isSelected
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
          : "border-transparent bg-transparent text-slate-700 hover:bg-white hover:text-slate-950"
      }`;
    }

    return `block rounded-2xl border px-4 py-3 transition ${
      isSelected
        ? "border-black bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
        : "border-gray-200 bg-white hover:border-gray-300"
    }`;
  };

  return (
    <div className={wrapperClass}>
      {options.map((option) => {
        const id = `${name}-${option.value}`;
        const descriptionId = option.description ? `${id}-description` : undefined;
        const isSelected = value === option.value;

        return (
          <label key={option.value} htmlFor={id} className="block cursor-pointer">
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

            <span
              className={`${getCardClass(
                isSelected
              )} peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2 ${
                isSelected ? "ring-1 ring-slate-950/15" : ""
              }`}
              data-selected={isSelected ? "true" : "false"}
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
                          ? "text-white/75"
                          : "text-gray-600"
                        : "text-gray-500"
                    }`}
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
              {variant === "segmented" ? (
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-slate-300"
                  }`}
                />
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
