import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      hint,
      error,
      containerClassName,
      className,
      id,
      rows = 3,
      ...props
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const feedbackId = `${textareaId}-feedback`;

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label ? (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-neutral-900"
          >
            {label}
          </label>
        ) : null}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? feedbackId : undefined}
          className={cn(
            "min-h-24 max-h-48 w-full resize-y overflow-y-auto [field-sizing:content] scroll-mb-6 rounded-lg border bg-white px-3.5 py-2.5 text-base text-neutral-950",
            "placeholder:text-neutral-500 transition-colors",
            "disabled:bg-neutral-100 disabled:text-neutral-600",
            error
              ? "border-red-600 focus:border-red-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-700"
              : "border-neutral-500 focus:border-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
            className,
          )}
          {...props}
        />

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
