import { useId } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
}

export function CheckboxRow({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  id,
  name,
  className,
}: CheckboxRowProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const hintId = `${checkboxId}-hint`;

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "flex min-h-11 items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors select-none",
        disabled
          ? "cursor-not-allowed border-neutral-300 bg-neutral-100 opacity-65"
          : checked
            ? "border-neutral-950 bg-neutral-50 hover:bg-neutral-100"
            : "border-neutral-500 bg-white hover:bg-neutral-50",
        className,
      )}
    >
      <input
        id={checkboxId}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.checked)}
        className={cn(
          "mt-0.5 h-5 w-5 shrink-0 rounded border border-neutral-500 accent-neutral-950",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
        )}
      />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-neutral-950">{label}</span>
        {hint ? (
          <span id={hintId} className="text-xs leading-relaxed text-neutral-600">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}
