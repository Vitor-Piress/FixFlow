import { addDays } from "date-fns";
import type { BadgeVariant } from "@/components/ui/Badge";

export type NotificationCategory =
  | "finance_due"
  | "contract_due"
  | "quote_unpaid"
  | "quote_stale";

export type NotificationSeverity = "info" | "warning" | "critical";

export type NotificationFilterCategory = "all" | NotificationCategory;

export interface PushEnvironment {
  supported: boolean;
  isIos: boolean;
  isStandalone: boolean;
  needsIosInstall: boolean;
  permission: NotificationPermission | "unsupported";
  deviceLabel: string;
  userAgent: string;
}

export const NOTIFICATION_CATEGORY_FILTER_OPTIONS: ReadonlyArray<{
  value: NotificationFilterCategory;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "finance_due", label: "Financeiro" },
  { value: "contract_due", label: "Contratos" },
  { value: "quote_unpaid", label: "Sem pagamento" },
  { value: "quote_stale", label: "Em aberto" },
];

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> =
  {
    finance_due: "Financeiro",
    contract_due: "Contratos",
    quote_unpaid: "Sem pagamento",
    quote_stale: "Orçamento em aberto",
  };

export const SNOOZE_DAY_OPTIONS = [1, 3, 7] as const;

export function urlBase64ToUint8Array(
  base64String: string,
): Uint8Array<ArrayBuffer> {
  const cleaned = base64String.trim();
  const padding = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = (cleaned + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function isIosUserAgent(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) {
    return true;
  }
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function inferDeviceLabel(
  userAgent: string,
  isStandalone: boolean,
): string {
  let platform = "Navegador";
  if (/iPhone/i.test(userAgent)) {
    platform = "iPhone";
  } else if (/iPad/i.test(userAgent)) {
    platform = "iPad";
  } else if (/Android/i.test(userAgent)) {
    platform = "Android";
  } else if (/Windows/i.test(userAgent)) {
    platform = "Windows";
  } else if (/Mac OS X|Macintosh/i.test(userAgent)) {
    platform = "Mac";
  } else if (/Linux/i.test(userAgent)) {
    platform = "Linux";
  }

  let browser = "Web";
  if (isStandalone) {
    browser = "App instalado";
  } else if (/Edg\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/Firefox\//i.test(userAgent)) {
    browser = "Firefox";
  } else if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) {
    browser = "Safari";
  }

  return `${platform} · ${browser}`;
}

export function detectPushEnvironment(): PushEnvironment {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      supported: false,
      isIos: false,
      isStandalone: false,
      needsIosInstall: false,
      permission: "unsupported",
      deviceLabel: "Navegador",
      userAgent: "",
    };
  }

  const userAgent = navigator.userAgent ?? "";
  const isIos = isIosUserAgent(userAgent, navigator.maxTouchPoints ?? 0);
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    navigatorWithStandalone.standalone === true;

  const hasApis =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const needsIosInstall = isIos && !isStandalone;
  const supported = hasApis && !needsIosInstall;

  return {
    supported,
    isIos,
    isStandalone,
    needsIosInstall,
    permission: "Notification" in window ? Notification.permission : "unsupported",
    deviceLabel: inferDeviceLabel(userAgent, isStandalone),
    userAgent: userAgent.slice(0, 240),
  };
}

export function buildSnoozeUntilIso(
  days: number,
  baseDate: Date = new Date(),
): string {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.trunc(days)) : 1;
  return addDays(baseDate, safeDays).toISOString();
}

export function isNotificationSnoozed(
  snoozedUntil: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!snoozedUntil) {
    return false;
  }

  const timestamp = Date.parse(snoozedUntil);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return timestamp > nowMs;
}

export interface NotificationPartition<T> {
  active: T[];
  snoozed: T[];
  unreadCount: number;
  criticalUnreadCount: number;
}

export function partitionNotifications<
  T extends {
    read_at: string | null;
    snoozed_until: string | null;
    severity: NotificationSeverity;
  },
>(items: readonly T[], nowMs: number = Date.now()): NotificationPartition<T> {
  const active: T[] = [];
  const snoozed: T[] = [];
  let unreadCount = 0;
  let criticalUnreadCount = 0;

  for (const item of items) {
    if (isNotificationSnoozed(item.snoozed_until, nowMs)) {
      snoozed.push(item);
      continue;
    }

    active.push(item);
    if (!item.read_at) {
      unreadCount += 1;
      if (item.severity === "critical") {
        criticalUnreadCount += 1;
      }
    }
  }

  return { active, snoozed, unreadCount, criticalUnreadCount };
}

export function formatBadgeCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) {
    return "";
  }
  return count > 9 ? "9+" : String(Math.trunc(count));
}

export function getNotificationStageBadgeMeta(
  stage: string,
  severity: NotificationSeverity,
): { label: string; variant: BadgeVariant } {
  switch (stage) {
    case "overdue":
      return { label: "Atrasado", variant: "danger" };
    case "due_today":
      return { label: "Vence hoje", variant: "warning" };
    case "upcoming":
      return { label: "Em breve", variant: "info" };
    case "completed_unpaid_overdue":
      return { label: "Sem pagamento", variant: "danger" };
    case "completed_unpaid":
      return { label: "Sem pagamento", variant: "warning" };
    case "sent_expired":
      return { label: "Vencido", variant: "warning" };
    case "sent_stale":
      return { label: "Sem resposta", variant: "warning" };
    case "approved_stale":
      return { label: "Aprovado parado", variant: "warning" };
    case "draft_stale":
      return { label: "Rascunho parado", variant: "neutral" };
    default:
      if (severity === "critical") {
        return { label: "Urgente", variant: "danger" };
      }
      if (severity === "warning") {
        return { label: "Atenção", variant: "warning" };
      }
      return { label: "Aviso", variant: "info" };
  }
}
