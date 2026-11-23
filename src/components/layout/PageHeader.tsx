import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface PageHeaderProps {
  title: string;
  onOpenProfile: () => void;
  rightAction?: ReactNode;
}

export function PageHeader({
  title,
  onOpenProfile,
  rightAction,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo size="sm" className="text-neutral-950" />
          <span
            aria-hidden="true"
            className="h-4 w-px shrink-0 bg-neutral-200"
          />
          <h1 className="truncate text-base font-semibold tracking-tight text-neutral-950">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {rightAction}
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="Perfil do emitente e conta"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-800 transition-colors hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-neutral-950"
          >
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
