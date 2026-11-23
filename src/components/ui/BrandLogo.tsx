import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  size?: BrandLogoSize;
  showWordmark?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<BrandLogoSize, string> = {
  sm: "h-5 w-auto",
  md: "h-6 w-auto",
  lg: "h-9 w-auto",
};

const WORDMARK_CLASSES: Record<BrandLogoSize, string> = {
  sm: "text-base font-semibold tracking-tight",
  md: "text-lg font-semibold tracking-tight",
  lg: "text-2xl font-semibold tracking-tight",
};

/**
 * Renders the authentic FixFlow vector mark (`src/assets/logo-black.svg`)
 * using `currentColor` so it adapts cleanly to any Tailwind text color.
 */
export function BrandLogo({
  size = "md",
  showWordmark = false,
  className,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 144 158"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", SIZE_CLASSES[size])}
        role={showWordmark ? undefined : "img"}
        aria-label={showWordmark ? undefined : "FixFlow"}
        aria-hidden={showWordmark ? true : undefined}
      >
        <path
          d="M0 0H57.4545V39.5H39.5V68.2273H122.091V107.727H39.5V158H0V0Z"
          fill="currentColor"
        />
        <path
          d="M68.2271 0H143.636V39.5H68.2271V0Z"
          fill="currentColor"
        />
      </svg>
      {showWordmark ? (
        <span className={WORDMARK_CLASSES[size]}>FixFlow</span>
      ) : null}
    </span>
  );
}
