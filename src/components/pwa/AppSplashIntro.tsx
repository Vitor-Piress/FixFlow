import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT_EXPO, SPRING_MARK } from "@/lib/motion";

const SPLASH_SESSION_KEY = "fixflow_splash_seen";
const SPLASH_DURATION_MS = 960;

function shouldShowSplashOnMount(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  try {
    return window.sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
  } catch {
    return false;
  }
}

function markSplashSeen(): void {
  try {
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
  } catch {
    // Ignore restricted storage contexts (private mode / blocked storage).
  }
}

/**
 * Editorial opening choreography assembling the two authentic geometric blocks
 * of the FixFlow mark once per session. Skippable on tap/click or Escape.
 */
export function AppSplashIntro() {
  const [visible, setVisible] = useState<boolean>(shouldShowSplashOnMount);

  const dismiss = useCallback(() => {
    markSplashSeen();
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    markSplashSeen();

    const timerId = window.setTimeout(() => {
      setVisible(false);
    }, SPLASH_DURATION_MS);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setVisible(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="fixflow-splash"
          data-testid="app-splash-intro"
          role="dialog"
          aria-modal="false"
          aria-label="Abertura FixFlow"
          initial={{ y: "0%" }}
          exit={{
            y: "-100%",
            transition: { duration: 0.36, ease: EASE_OUT_EXPO },
          }}
          onClick={dismiss}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-neutral-950 px-6 text-white select-none"
        >
          <div className="flex items-center gap-4">
            <svg
              viewBox="0 0 144 158"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-11 w-auto shrink-0 overflow-visible text-white"
              aria-hidden="true"
            >
              <motion.path
                d="M0 0H57.4545V39.5H39.5V68.2273H122.091V107.727H39.5V158H0V0Z"
                fill="currentColor"
                initial={{ y: 26, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={SPRING_MARK}
              />
              <motion.path
                d="M68.2271 0H143.636V39.5H68.2271V0Z"
                fill="currentColor"
                initial={{ x: 24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ ...SPRING_MARK, delay: 0.12 }}
              />
            </svg>

            <motion.span
              aria-hidden="true"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.28, delay: 0.18, ease: EASE_OUT_EXPO }}
              className="h-9 w-px origin-center bg-neutral-600"
            />

            <div className="overflow-hidden">
              <motion.p
                initial={{ y: "105%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                transition={{ duration: 0.34, delay: 0.22, ease: EASE_OUT_EXPO }}
                className="text-2xl font-semibold tracking-tight text-white"
              >
                FixFlow
              </motion.p>
            </div>
          </div>

          <motion.span
            aria-hidden="true"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.42, delay: 0.3, ease: EASE_OUT_EXPO }}
            className="mt-5 h-px w-28 origin-left bg-neutral-700"
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
