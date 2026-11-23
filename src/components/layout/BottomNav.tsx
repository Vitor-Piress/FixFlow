import {
  FileSignature,
  FileText,
  Package,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavTabItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_TABS: readonly NavTabItem[] = [
  { to: "/quotes", label: "Orçamentos", Icon: FileText },
  { to: "/finance", label: "Financeiro", Icon: Wallet },
  { to: "/contracts", label: "Contratos", Icon: FileSignature },
  { to: "/catalog", label: "Catálogo", Icon: Package },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {NAV_TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950",
                  isActive
                    ? "text-neutral-950"
                    : "text-neutral-600 hover:text-neutral-950",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-0 h-0.5 w-8 rounded-full transition-colors",
                      isActive ? "bg-neutral-950" : "bg-transparent",
                    )}
                  />
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden="true"
                  />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
