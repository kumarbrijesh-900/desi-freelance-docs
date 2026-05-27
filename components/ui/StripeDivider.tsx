import { cn } from "@/lib/ui-foundation";

interface StripeDividerProps {
  tone: "coral" | "sky" | "acid";
  className?: string;
}

export function StripeDivider({ tone, className }: StripeDividerProps) {
  const colorMap = {
    coral: "var(--color-coral)",
    sky: "var(--color-sky)",
    acid: "var(--color-acid)",
  };

  const color = colorMap[tone];

  return (
    <div
      className={cn("h-4 w-full border-y-2 border-ink", className)}
      style={{
        background: `repeating-linear-gradient(45deg, ${color}, ${color} 6px, var(--color-paper) 6px, var(--color-paper) 12px)`,
      }}
    />
  );
}
