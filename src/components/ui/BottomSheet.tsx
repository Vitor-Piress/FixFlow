import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  fullHeight?: boolean;
}

/**
 * Mobile-first bottom sheet powered by Vaul with drag handle, sticky header,
 * scrollable body, and safe-area-aware sticky footer.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  fullHeight = false,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-neutral-950/45" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-lg flex-col",
            "rounded-t-2xl border border-b-0 border-neutral-200 bg-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950",
            fullHeight ? "h-[90dvh] max-h-[92dvh]" : "max-h-[90dvh]",
          )}
        >
          <div className="flex shrink-0 justify-center pt-2.5 pb-1">
            <div
              aria-hidden="true"
              className="h-1.5 w-10 rounded-full bg-neutral-300"
            />
          </div>

          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-4 pt-2 pb-3">
            <div className="min-w-0">
              <Drawer.Title className="text-base font-semibold text-neutral-950">
                {title}
              </Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-0.5 text-xs text-neutral-500">
                  {description}
                </Drawer.Description>
              ) : (
                <Drawer.Description className="sr-only">
                  {title}
                </Drawer.Description>
              )}
            </div>

            <Drawer.Close asChild>
              <button
                type="button"
                aria-label="Fechar painel"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Drawer.Close>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
            {children}
          </div>

          {footer ? (
            <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : (
            <div className="h-[env(safe-area-inset-bottom)] shrink-0" />
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
