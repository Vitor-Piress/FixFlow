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
      <ul className="flex items-center justify-between gap-1 px-2 py-2">
        {NAV_TABS.map(({ to, label, Icon }) => (
          <motion.li
            key={to}
            layout
            transition={SPRING_SNAPPY}
            whileTap={{ scale: 0.96 }}
          >
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "relative inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950",
                  isActive
                    ? "text-white"
                    : "text-zinc-600 hover:text-zinc-950",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="bottom-nav-active-pill"
                      transition={SPRING_SNAPPY}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-neutral-950"
                    />
                  ) : null}
                  <Icon
                    className="relative h-[18px] w-[18px] shrink-0"
                    strokeWidth={isActive ? 2 : 1.75}
                    aria-hidden="true"
                  />
                  {isActive ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      className="relative whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  ) : null}
                </>
              )}
            </NavLink>
          </motion.li>
        ))}
      </ul>
    </nav>
  );
}
