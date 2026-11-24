import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
          {icon}
        </div>
      ) : null}
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-zinc-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
