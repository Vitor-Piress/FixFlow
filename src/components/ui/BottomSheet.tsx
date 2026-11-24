import {
  useCallback,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  headerLeft?: ReactNode;
  stickySubheader?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  fullHeight?: boolean;
}

const KEYBOARD_OVERLAP_THRESHOLD_PX = 60;
const MIN_KEYBOARD_SHEET_HEIGHT_PX = 240;
const PINCH_ZOOM_SCALE_THRESHOLD = 1.05;

function computeKeyboardSheetSnapshot(
  open: boolean,
  fullHeight: boolean,
): string {
  if (!open || typeof window === "undefined" || !window.visualViewport) {
    return "";
  }

  const vv = window.visualViewport;
  const scale = typeof vv.scale === "number" ? vv.scale : 1;
  if (scale > PINCH_ZOOM_SCALE_THRESHOLD) {
    return "";
  }

  const layoutHeight = window.innerHeight;
  const keyboardOverlap = Math.max(
    0,
    Math.round(layoutHeight - (vv.height + vv.offsetTop)),
  );

  if (keyboardOverlap <= KEYBOARD_OVERLAP_THRESHOLD_PX) {
    return "";
  }

  const availableHeight = Math.max(
    MIN_KEYBOARD_SHEET_HEIGHT_PX,
    Math.floor(vv.height - 16),
  );

  return fullHeight
    ? `${keyboardOverlap}|${availableHeight}|${availableHeight}`
    : `${keyboardOverlap}||${availableHeight}`;
}

function parseKeyboardSheetSnapshot(
  snapshot: string,
): CSSProperties | undefined {
  if (!snapshot) {
    return undefined;
  }

  const [bottom, height, maxHeight] = snapshot.split("|");
  return {
    bottom: `${bottom}px`,
    ...(height ? { height: `${height}px` } : {}),
    ...(maxHeight ? { maxHeight: `${maxHeight}px` } : {}),
  };
}

function useKeyboardViewportSheetStyle(
  open: boolean,
  fullHeight: boolean,
): CSSProperties | undefined {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!open || typeof window === "undefined") {
        return () => {};
      }

      const vv = window.visualViewport;
      vv?.addEventListener("resize", onStoreChange);
      vv?.addEventListener("scroll", onStoreChange);
      window.addEventListener("resize", onStoreChange);

      return () => {
        vv?.removeEventListener("resize", onStoreChange);
        vv?.removeEventListener("scroll", onStoreChange);
        window.removeEventListener("resize", onStoreChange);
      };
    },
    [open],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    () => computeKeyboardSheetSnapshot(open, fullHeight),
    () => "",
  );

  return parseKeyboardSheetSnapshot(snapshot);
}

/**
 * Mobile-first bottom sheet powered by Vaul with drag handle, sticky header,
 * optional sticky subheader, scrollable body, safe-area sticky footer, and
 * deterministic visualViewport handling when the mobile virtual keyboard toggles.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  headerLeft,
  stickySubheader,
  children,
  footer,
  fullHeight = false,
}: BottomSheetProps) {
  const keyboardSheetStyle = useKeyboardViewportSheetStyle(open, fullHeight);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-neutral-950/45" />
        <Drawer.Content
          style={keyboardSheetStyle}
          onPointerDownOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-sonner-toast]")
            ) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("[data-sonner-toast]")
            ) {
              event.preventDefault();
            }
          }}
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
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {headerLeft}
              <div className="min-w-0 flex-1">
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

          {stickySubheader ? (
            <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3">
              {stickySubheader}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
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
