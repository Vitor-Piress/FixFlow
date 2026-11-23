import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationBellButton } from "@/features/notifications/components/NotificationBellButton";
import { NotificationCenterSheet } from "@/features/notifications/components/NotificationCenterSheet";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { BusinessProfileSheet } from "@/features/profile/components/BusinessProfileSheet";
import { PAGE_TRANSITION } from "@/lib/motion";

const ROUTE_TITLES: ReadonlyArray<{ prefix: string; title: string }> = [
  { prefix: "/quotes", title: "Orçamentos" },
  { prefix: "/finance", title: "Financeiro" },
  { prefix: "/contracts", title: "Contratos" },
  { prefix: "/catalog", title: "Catálogo" },
];

function resolvePageTitle(pathname: string): string {
  if (pathname.startsWith("/quotes/")) {
    return "Orçamento";
  }

  const matched = ROUTE_TITLES.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );
  return matched?.title ?? "FixFlow";
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { unreadCount, criticalUnreadCount } = useNotifications();
  const pageTitle = resolvePageTitle(location.pathname);
  const hasNotificationsParam = searchParams.get("notifications") === "open";
  const effectiveNotificationsOpen = isNotificationsOpen || hasNotificationsParam;

  useEffect(() => {
    document.title =
      pageTitle === "FixFlow" ? "FixFlow" : `${pageTitle} | FixFlow`;
  }, [pageTitle]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    function handleServiceWorkerMessage(event: MessageEvent) {
      const data = event.data as { type?: unknown; url?: unknown } | null;
      if (data?.type !== "FIXFLOW_NAVIGATE" || typeof data.url !== "string") {
        return;
      }

      if (data.url.includes("notifications=open")) {
        setIsNotificationsOpen(true);
        return;
      }

      navigate(data.url);
    }

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage,
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    };
  }, [navigate]);

  function handleNotificationsOpenChange(nextOpen: boolean) {
    setIsNotificationsOpen(nextOpen);
    if (!nextOpen && hasNotificationsParam) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("notifications");
      setSearchParams(nextParams, { replace: true });
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-white sm:border-x sm:border-neutral-200">
      <PageHeader
        title={pageTitle}
        onOpenProfile={() => setIsProfileOpen(true)}
        rightAction={
          <NotificationBellButton
            unreadCount={unreadCount}
            criticalUnreadCount={criticalUnreadCount}
            onClick={() => handleNotificationsOpenChange(true)}
          />
        }
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-4 pt-5 pb-[calc(5.25rem+env(safe-area-inset-bottom))] outline-none"
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={PAGE_TRANSITION}
        >
          <Outlet />
        </motion.div>
      </main>

      <BottomNav />

      <NotificationCenterSheet
        open={effectiveNotificationsOpen}
        onOpenChange={handleNotificationsOpenChange}
      />

      <BusinessProfileSheet
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />
    </div>
  );
}
