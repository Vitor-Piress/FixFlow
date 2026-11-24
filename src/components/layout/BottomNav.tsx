import {
  FileSignature,
  FileText,
  Package,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { NavLink } from "react-router-dom";
import { SPRING_SNAPPY } from "@/lib/motion";
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
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {NAV_TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-14 flex-col items-center justify-center px-1 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950",
                  isActive
                    ? "text-zinc-950"
                    : "text-zinc-600 hover:text-zinc-950",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="bottom-nav-active-indicator"
                      transition={SPRING_SNAPPY}
                      aria-hidden="true"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-neutral-950"
                    />
                  ) : null}
                  <motion.span
                    whileTap={{ scale: 0.94 }}
                    transition={SPRING_SNAPPY}
                    className="flex flex-col items-center justify-center gap-0.5"
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-10 items-center justify-center rounded-full transition-colors",
                        isActive ? "bg-zinc-200/80" : "bg-transparent",
                      )}
                    >
                      <Icon
                        className="h-[18px] w-[18px]"
                        strokeWidth={isActive ? 2 : 1.5}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="truncate">{label}</span>
                  </motion.span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
