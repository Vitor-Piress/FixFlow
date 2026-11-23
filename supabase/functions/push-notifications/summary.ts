export type NotificationCategory =
  | "finance_due"
  | "contract_due"
  | "quote_unpaid"
  | "quote_stale";

export type PushSlot = "morning" | "evening";

export const MAX_PUSH_NOTIFICATIONS_PER_RUN = 5;

export interface NotificationDigestCandidate {
  id: string;
  dedupe_key: string;
  category: NotificationCategory;
  severity: "info" | "warning" | "critical";
  stage: string;
  stage_rank: number;
  title: string;
  body: string;
  action_url: string;
  last_pushed_at: string | null;
  last_pushed_stage: string | null;
  last_pushed_slot_date: string | null;
  last_pushed_slot: PushSlot | null;
}

export interface WebPushDispatchMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
  badgeCount: number;
  alertIds: string[];
}

const CATEGORY_LABELS: Record<
  NotificationCategory,
  { singular: string; plural: string }
> = {
  finance_due: { singular: "vencimento", plural: "vencimentos" },
  contract_due: { singular: "contrato", plural: "contratos" },
  quote_unpaid: {
    singular: "orçamento sem pagamento",
    plural: "orçamentos sem pagamento",
  },
  quote_stale: {
    singular: "orçamento parado",
    plural: "orçamentos parados",
  },
};

export function getBrtDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function filterEligibleAlertsForSlot<T extends NotificationDigestCandidate>(
  alerts: readonly T[],
  slot: PushSlot,
  todayBrt: string,
): T[] {
  return alerts.filter((alert) => {
    const isNeverPushed = alert.last_pushed_at === null;
    const isStageChanged = alert.last_pushed_stage !== alert.stage;

    if (isNeverPushed || isStageChanged) {
      return true;
    }

    if (slot === "morning") {
      return alert.stage_rank >= 3 && alert.last_pushed_slot_date !== todayBrt;
    }

    const pushedThisEvening =
      alert.last_pushed_slot_date === todayBrt &&
      alert.last_pushed_slot === "evening";

    if (pushedThisEvening) {
      return false;
    }

    return alert.stage_rank >= 2 && alert.category !== "quote_stale";
  });
}

function joinPortugueseParts(parts: readonly string[]): string {
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return `${parts[0]} e ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

function summarizeCategories(
  alerts: readonly NotificationDigestCandidate[],
): string {
  const counts: Record<NotificationCategory, number> = {
    finance_due: 0,
    contract_due: 0,
    quote_unpaid: 0,
    quote_stale: 0,
  };

  for (const alert of alerts) {
    counts[alert.category] += 1;
  }

  const orderedCategories: NotificationCategory[] = [
    "finance_due",
    "contract_due",
    "quote_unpaid",
    "quote_stale",
  ];

  const parts: string[] = [];
  for (const category of orderedCategories) {
    const count = counts[category];
    if (count > 0) {
      const label =
        count === 1
          ? CATEGORY_LABELS[category].singular
          : CATEGORY_LABELS[category].plural;
      parts.push(`${count} ${label}`);
    }
  }

  const summary = joinPortugueseParts(parts);
  if (!summary) {
    return "Toque para ver na central.";
  }

  return `${summary.charAt(0).toUpperCase()}${summary.slice(1)}. Toque para ver na central.`;
}

// Sends up to `maxNotifications` individual alerts; overflows into a final summary card when exceeded.
export function buildWebPushMessages(
  eligibleAlerts: readonly NotificationDigestCandidate[],
  totalUnreadCount: number,
  slot: PushSlot,
  todayBrt: string,
  maxNotifications = MAX_PUSH_NOTIFICATIONS_PER_RUN,
): WebPushDispatchMessage[] {
  if (eligibleAlerts.length === 0) {
    return [];
  }

  const cap = Math.max(1, Math.trunc(maxNotifications));
  const badgeCount = Math.max(totalUnreadCount, eligibleAlerts.length);

  if (eligibleAlerts.length <= cap) {
    return eligibleAlerts.map((alert) => ({
      title: alert.title,
      body: alert.body,
      url: alert.action_url,
      tag: `fixflow-${alert.dedupe_key}`,
      badgeCount,
      alertIds: [alert.id],
    }));
  }

  const directCount = cap - 1;
  const directAlerts = eligibleAlerts.slice(0, directCount);
  const overflowAlerts = eligibleAlerts.slice(directCount);

  const messages: WebPushDispatchMessage[] = directAlerts.map((alert) => ({
    title: alert.title,
    body: alert.body,
    url: alert.action_url,
    tag: `fixflow-${alert.dedupe_key}`,
    badgeCount,
    alertIds: [alert.id],
  }));

  const overflowTitle =
    overflowAlerts.length === 1
      ? "FixFlow: mais 1 pendência"
      : `FixFlow: e mais ${overflowAlerts.length} pendências`;

  messages.push({
    title: overflowTitle,
    body: summarizeCategories(overflowAlerts),
    url: "/?notifications=open",
    tag: `fixflow-overflow-${todayBrt}-${slot}`,
    badgeCount,
    alertIds: overflowAlerts.map((alert) => alert.id),
  });

  return messages;
}
