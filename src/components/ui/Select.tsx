import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: readonly SelectOption[];
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    options,
    containerClassName,
    className,
    id,
    children,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const feedbackId = `${selectId}-feedback`;

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label ? (
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-neutral-900"
        >
          {label}
        </label>
      ) : null}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? feedbackId : undefined}
          className={cn(
            "min-h-11 w-full scroll-mb-6 appearance-none rounded-lg border bg-white py-2.5 pr-10 pl-3.5 text-base text-neutral-950",
            "transition-colors disabled:bg-neutral-100 disabled:text-neutral-600",
            error
              ? "border-red-600 focus:border-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-700"
              : "border-neutral-500 focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
            className,
          )}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>

        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 h-4 w-4 text-neutral-500"
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
});
