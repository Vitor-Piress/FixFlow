import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { PageHeader } from "@/components/layout/PageHeader";
import { BusinessProfileSheet } from "@/features/profile/components/BusinessProfileSheet";

const ROUTE_TITLES: ReadonlyArray<{ prefix: string; title: string }> = [
  { prefix: "/quotes", title: "Orçamentos" },
  { prefix: "/finance", title: "Financeiro" },
  { prefix: "/contracts", title: "Contratos" },
  { prefix: "/catalog", title: "Catálogo" },
];

function resolvePageTitle(pathname: string): string {
  const matched = ROUTE_TITLES.find(({ prefix }) =>
    pathname.startsWith(prefix),
  );
  return matched?.title ?? "FixFlow";
}

export function AppShell() {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const pageTitle = resolvePageTitle(location.pathname);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-white sm:border-x sm:border-neutral-200">
      <PageHeader
        title={pageTitle}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <main className="flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <BottomNav />

      <BusinessProfileSheet
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />
    </div>
  );
}
