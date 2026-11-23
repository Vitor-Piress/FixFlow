import { Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({
  message = "Carregando FixFlow",
}: FullPageLoaderProps) {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-neutral-950"
    >
      <BrandLogo size="lg" />
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Loader2
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span>{message}</span>
      </div>
    </main>
  );
}
