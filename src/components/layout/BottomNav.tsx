import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  FileSignature,
  FileText,
  Package,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { NavLink, useLocation } from "react-router-dom";
import { SPRING_SNAPPY } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface NavTabItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

interface PillGeometry {
  left: number;
  width: number;
  animate: boolean;
}

const NAV_TABS: readonly NavTabItem[] = [
  { to: "/quotes", label: "Orçamentos", Icon: FileText },
  { to: "/finance", label: "Financeiro", Icon: Wallet },
  { to: "/contracts", label: "Contratos", Icon: FileSignature },
  { to: "/catalog", label: "Catálogo", Icon: Package },
];

function resolveActiveTabPath(pathname: string): string | null {
  const matched = NAV_TABS.find(
    ({ to }) => pathname === to || pathname.startsWith(`${to}/`),
  );
  return matched?.to ?? null;
}

export function BottomNav() {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const activePath = resolveActiveTabPath(location.pathname);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const previousActivePathRef = useRef<string | null>(null);
  const [pill, setPill] = useState<PillGeometry | null>(null);

  const measureActivePill = useCallback(
    (shouldAnimate: boolean) => {
      if (!activePath) {
        setPill(null);
        return;
      }

      const containerEl = containerRef.current;
      const activeEl = tabRefs.current[activePath];
      if (!containerEl || !activeEl) {
        return;
      }

      const containerRect = containerEl.getBoundingClientRect();
      const activeRect = activeEl.getBoundingClientRect();
      if (activeRect.width <= 0) {
        return;
      }

      const nextLeft = activeRect.left - containerRect.left;
      const nextWidth = activeRect.width;

      setPill((previous) => {
        if (
          previous &&
          Math.abs(previous.left - nextLeft) < 0.5 &&
          Math.abs(previous.width - nextWidth) < 0.5
        ) {
          return previous;
        }

        return {
          left: nextLeft,
          width: nextWidth,
          animate: shouldAnimate && !prefersReducedMotion,
        };
      });
    },
    [activePath, prefersReducedMotion],
  );

  useLayoutEffect(() => {
    const hasTabChanged =
      previousActivePathRef.current !== null &&
      previousActivePathRef.current !== activePath;
    previousActivePathRef.current = activePath;

    measureActivePill(hasTabChanged);
  }, [activePath, measureActivePill]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) {
      return;
    }

    let isDisposed = false;
    const syncWithoutAnimation = () => {
      if (!isDisposed) {
        measureActivePill(false);
      }
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncWithoutAnimation)
        : null;
    resizeObserver?.observe(containerEl);

    if (activePath) {
      const activeEl = tabRefs.current[activePath];
      if (activeEl) {
        resizeObserver?.observe(activeEl);
      }
    }

    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(syncWithoutAnimation);
    }

    return () => {
      isDisposed = true;
      resizeObserver?.disconnect();
    };
  }, [activePath, measureActivePill]);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div ref={containerRef} className="relative px-2 py-2">
        {pill ? (
          <motion.span
            aria-hidden="true"
            data-testid="bottom-nav-active-pill"
            initial={false}
            animate={{
              x: pill.left,
              width: pill.width,
            }}
            transition={
              pill.animate && !prefersReducedMotion
                ? SPRING_SNAPPY
                : { duration: 0 }
            }
            className="pointer-events-none absolute top-2 left-0 z-0 h-11 rounded-full bg-neutral-950"
          />
        ) : null}

        <ul className="relative z-10 flex items-center justify-between gap-1">
          {NAV_TABS.map(({ to, label, Icon }) => (
            <li key={to} className="flex">
              <NavLink
                ref={(node) => {
                  tabRefs.current[to] = node;
                }}
                to={to}
                aria-label={label}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
                    isActive
                      ? cn(
                          "text-white active:opacity-90",
                          !pill && "bg-neutral-950",
                        )
                      : "text-zinc-600 hover:text-zinc-950 active:bg-zinc-100",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="relative h-[18px] w-[18px] shrink-0"
                      strokeWidth={isActive ? 2 : 1.75}
                      aria-hidden="true"
                    />
                    {isActive ? (
                      <motion.span
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { duration: 0.18 }
                        }
                        className="relative whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
