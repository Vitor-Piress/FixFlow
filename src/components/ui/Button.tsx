import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-neutral-950 text-white border border-neutral-950 hover:bg-neutral-800 active:bg-neutral-900",
  secondary:
    "bg-white text-neutral-950 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100",
  ghost:
    "bg-transparent text-neutral-700 border border-transparent hover:bg-neutral-100 active:bg-neutral-200",
  danger:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 active:bg-red-100",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm font-medium",
  lg: "min-h-12 px-5 text-base font-medium",
  icon: "h-11 w-11 shrink-0 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      type = "button",
      className,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg transition-colors select-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
          "disabled:pointer-events-none disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        {children}
      </button>
    );
  },
);
