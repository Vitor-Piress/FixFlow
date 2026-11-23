import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  rightElement?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    rightElement,
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
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? feedbackId : undefined}
          className={cn(
            "min-h-11 w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-neutral-950",
            "placeholder:text-neutral-400 transition-colors",
            "focus:border-neutral-950 focus:outline-none",
            "disabled:bg-neutral-100 disabled:text-neutral-500",
            error
              ? "border-red-600 focus:border-red-600"
              : "border-neutral-300",
            rightElement ? "pr-12" : undefined,
            className,
          )}
          {...props}
        />

        {rightElement ? (
          <div className="absolute right-1 flex items-center">{rightElement}</div>
        ) : null}
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
