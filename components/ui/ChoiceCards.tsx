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
      ? `grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`
      : "space-y-3";

  const getCardClass = (isSelected: boolean) => {
    if (variant === "segmented") {
      return `flex min-h-[48px] items-center justify-center rounded-2xl border px-4 py-3 text-center text-sm font-medium transition ${
        isSelected
          ? "border-black bg-black text-white"
          : "border-gray-300 bg-white text-black hover:border-black"
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
              className="peer sr-only"
            />

            <span
              className={`${getCardClass(
                isSelected
              )} peer-focus-visible:ring-2 peer-focus-visible:ring-black peer-focus-visible:ring-offset-2`}
            >
              <span className="block">
                <span className="block text-sm font-medium leading-5">
                  {option.label}
                </span>
                {option.description ? (
                  <span
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
            </span>
          </label>
        );
      })}
    </div>
  );
}
