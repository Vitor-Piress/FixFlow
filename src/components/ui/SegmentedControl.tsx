import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-neutral-950",
              isActive
                ? "bg-neutral-950 text-white"
                : "text-neutral-600 hover:text-neutral-950",
            )}
          >
            <span className="truncate">{option.label}</span>
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] leading-none tabular-nums",
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-neutral-200/80 text-neutral-700",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
