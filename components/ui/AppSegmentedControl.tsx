"use client";

import ChoiceCards from "@/components/ui/ChoiceCards";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

interface AppSegmentedControlProps<T extends string> {
  name: string;
  value: T | "";
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  columns?: 1 | 2;
}

export default function AppSegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 1,
}: AppSegmentedControlProps<T>) {
  return (
    <ChoiceCards
      name={name}
      value={value}
      options={options}
      onChange={onChange}
      variant="segmented"
      columns={columns}
    />
  );
}
