import { forwardRef, useId, type InputHTMLAttributes } from "react";
import {
  digitsToCents,
  formatCurrencyInputFromCents,
} from "@/lib/money";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "inputMode"
  > {
  label?: string;
  hint?: string;
  error?: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
  containerClassName?: string;
}

/**
 * Controlled currency input that displays BRL formatting while emitting
 * strictly integer cents (`number`) to form state and services.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      label,
      hint,
      error,
      valueCents,
      onChangeCents,
      containerClassName,
      className,
      id,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const feedbackId = `${inputId}-feedback`;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-900"
          >
            {label}
          </label>
        ) : null}

        <div className="relative flex items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 text-sm font-medium text-neutral-500"
          >
            R$
          </span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="numeric"
            value={formatCurrencyInputFromCents(valueCents)}
            onChange={(event) => {
              onChangeCents(digitsToCents(event.target.value));
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? feedbackId : undefined}
            className={cn(
              "min-h-11 w-full rounded-lg border bg-white py-2.5 pr-3.5 pl-10 text-base text-neutral-950 tabular-nums",
              "placeholder:text-neutral-400 transition-colors",
              "focus:border-neutral-950 focus:outline-none",
              "disabled:bg-neutral-100 disabled:text-neutral-500",
              error
                ? "border-red-600 focus:border-red-600"
                : "border-neutral-300",
              className,
            )}
            {...props}
          />
        </div>

        {error ? (
          <p id={feedbackId} className="text-xs text-red-600">
            {error}
          </p>
        ) : hint ? (
          <p id={feedbackId} className="text-xs text-neutral-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
