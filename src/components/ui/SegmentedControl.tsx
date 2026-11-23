import { useId, useRef, type KeyboardEvent } from "react";
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
  idBase?: string;
  getTabId?: (value: T) => string;
  getPanelId?: (value: T) => string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  idBase,
  getTabId,
  getPanelId,
  className,
}: SegmentedControlProps<T>) {
  const generatedId = useId();
  const prefix = idBase ?? generatedId;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (options.length === 0) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % options.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + options.length) % options.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = options.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const nextOption = options[nextIndex];
    onChange(nextOption.value);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex w-full gap-1 rounded-xl border border-neutral-200 bg-neutral-100 p-1",
        className,
      )}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;
        const tabId = getTabId ? getTabId(option.value) : `${prefix}-tab-${option.value}`;
        const panelId = getPanelId ? getPanelId(option.value) : undefined;

        return (
          <button
            key={option.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={tabId}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors sm:px-2.5 sm:text-sm",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
              isActive
                ? "bg-neutral-950 text-white"
                : "text-neutral-600 hover:text-neutral-950",
            )}
          >
            <span className="truncate">{option.label}</span>
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs leading-none tabular-nums",
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
