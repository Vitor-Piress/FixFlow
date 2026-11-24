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
    "bg-neutral-950 text-white border border-neutral-950 enabled:hover:bg-neutral-800 enabled:active:bg-neutral-900",
  secondary:
    "bg-zinc-100 text-zinc-950 border border-zinc-500 enabled:hover:bg-zinc-200 enabled:active:bg-zinc-300",
  ghost:
    "bg-transparent text-neutral-700 border border-transparent enabled:hover:bg-neutral-100 enabled:active:bg-neutral-200",
  danger:
    "bg-white text-red-700 border border-red-600 enabled:hover:bg-red-50 enabled:active:bg-red-100",
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
          "inline-flex items-center justify-center gap-2 rounded-lg transition-[color,background-color,border-color,transform] duration-150 select-none enabled:active:scale-[0.98]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
          "disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    );
  },
);
