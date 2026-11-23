import { Bell } from "lucide-react";
import { formatBadgeCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

interface NotificationBellButtonProps {
  unreadCount: number;
  criticalUnreadCount: number;
  onClick: () => void;
}

export function NotificationBellButton({
  unreadCount,
  criticalUnreadCount,
  onClick,
}: NotificationBellButtonProps) {
  const badgeLabel = formatBadgeCount(unreadCount);
  const ariaLabel =
    unreadCount > 0
      ? `Notificações, ${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
      : "Notificações";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-500 bg-white text-neutral-900 transition-colors hover:bg-neutral-100 active:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
    >
      <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />

      {badgeLabel ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-1.5 -right-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white px-1 text-[11px] leading-none font-semibold text-white tabular-nums",
            criticalUnreadCount > 0 ? "bg-red-700" : "bg-neutral-950",
          )}
        >
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}
