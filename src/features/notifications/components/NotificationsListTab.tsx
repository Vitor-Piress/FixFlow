import { useMemo, useState } from "react";
import {
  AlertCircle,
  BellOff,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PushDeviceStatus } from "@/features/notifications/hooks/usePushSubscription";
import { formatDateBR } from "@/lib/dates";
import { formatCentsToBRL } from "@/lib/money";
import {
  getNotificationStageBadgeMeta,
  NOTIFICATION_CATEGORY_FILTER_OPTIONS,
  NOTIFICATION_CATEGORY_LABELS,
  SNOOZE_DAY_OPTIONS,
  type NotificationFilterCategory,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import type { NotificationRecord } from "@/services/notifications.service";

interface NotificationsListTabProps {
  activeNotifications: NotificationRecord[];
  snoozedNotifications: NotificationRecord[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  pushDeviceStatus: PushDeviceStatus;
  onOpenPreferences: () => void;
  onOpenNotification: (item: NotificationRecord) => void;
  onMarkAllRead: () => void;
  isMarkingAllRead: boolean;
  onSnooze: (id: string, days: number) => void;
  snoozingId: string | null;
  onUnsnooze: (id: string) => void;
  unsnoozingId: string | null;
}

export function NotificationsListTab({
  activeNotifications,
  snoozedNotifications,
  unreadCount,
  isLoading,
  isError,
  onRetry,
  pushDeviceStatus,
  onOpenPreferences,
  onOpenNotification,
  onMarkAllRead,
  isMarkingAllRead,
  onSnooze,
  snoozingId,
  onUnsnooze,
  unsnoozingId,
}: NotificationsListTabProps) {
  const [categoryFilter, setCategoryFilter] =
    useState<NotificationFilterCategory>("all");
  const [snoozePickerId, setSnoozePickerId] = useState<string | null>(null);
  const [showSnoozed, setShowSnoozed] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationFilterCategory, number> = {
      all: activeNotifications.length,
      finance_due: 0,
      contract_due: 0,
      quote_unpaid: 0,
      quote_stale: 0,
    };

    for (const item of activeNotifications) {
      counts[item.category] += 1;
    }

    return counts;
  }, [activeNotifications]);

  const filteredNotifications = useMemo(() => {
    if (categoryFilter === "all") {
      return activeNotifications;
    }

    return activeNotifications.filter(
      (item) => item.category === categoryFilter,
    );
  }, [activeNotifications, categoryFilter]);

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando alertas</span>
        <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Não foi possível carregar os alertas.</span>
        </div>
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const showPushSetupPrompt =
    pushDeviceStatus === "unsubscribed" ||
    pushDeviceStatus === "ios-install-required";

  return (
    <div className="flex flex-col gap-4 pb-4">
      {showPushSetupPrompt ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-neutral-700">
            {pushDeviceStatus === "ios-install-required"
              ? "Instale o app na Tela de Início para receber lembretes no iPhone."
              : "Ative os alertas no celular para ser avisado às 08h e às 18h."}
          </p>
          <Button
            variant="secondary"
            onClick={onOpenPreferences}
            className="shrink-0 px-3 text-xs"
          >
            Configurar
          </Button>
        </div>
      ) : null}

      <div
        role="group"
        aria-label="Filtrar alertas por categoria"
        className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto scroll-smooth px-4 pb-1"
      >
        {NOTIFICATION_CATEGORY_FILTER_OPTIONS.map((option) => {
          const isSelected = categoryFilter === option.value;
          const count = categoryCounts[option.value];

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setCategoryFilter(option.value)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors tabular-nums",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950",
                isSelected
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-500 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100",
              )}
            >
              <span>{option.label}</span>
              <span
                className={isSelected ? "text-neutral-200" : "text-neutral-600"}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {activeNotifications.length > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-neutral-600 tabular-nums">
            {activeNotifications.length}{" "}
            {activeNotifications.length === 1 ? "alerta ativo" : "alertas ativos"}
            {unreadCount > 0 ? ` · ${unreadCount} sem leitura` : ""}
          </p>

          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={isMarkingAllRead}
              onClick={onMarkAllRead}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-100 active:bg-neutral-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
            >
              <CheckCheck
                className="h-4 w-4 shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Marcar todas como lidas</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={
            <BellOff
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          }
          title={
            activeNotifications.length === 0
              ? "Tudo em dia por aqui"
              : "Nenhum alerta nesta categoria"
          }
          description={
            activeNotifications.length === 0
              ? "Vencimentos, contratos mensais e orçamentos pendentes aparecem automaticamente aqui."
              : "Não há pendências ativas para este filtro no momento."
          }
          action={
            activeNotifications.length === 0 ? (
              <Button variant="secondary" onClick={onOpenPreferences}>
                Ajustar regras de alerta
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => setCategoryFilter("all")}
              >
                Ver todos
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filteredNotifications.map((item) => {
            const isUnread = !item.read_at;
            const stageMeta = getNotificationStageBadgeMeta(
              item.stage,
              item.severity,
            );
            const categoryLabel = NOTIFICATION_CATEGORY_LABELS[item.category];
            const isPickingSnooze = snoozePickerId === item.id;
            const isBusySnooze = snoozingId === item.id;

            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-xl border p-3.5 transition-colors",
                  isUnread
                    ? "border-zinc-300 bg-zinc-50"
                    : "border-zinc-200 bg-white",
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenNotification(item)}
                  className="flex min-h-11 w-full items-start justify-between gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-zinc-100/70 active:bg-zinc-200/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            item.severity === "critical"
                              ? "bg-red-700"
                              : "bg-neutral-950",
                          )}
                        />
                      ) : null}
                      <Badge variant={stageMeta.variant}>
                        {stageMeta.label}
                      </Badge>
                      <span className="text-xs font-medium text-neutral-600">
                        {categoryLabel}
                      </span>
                    </div>

                    <p
                      className={cn(
                        "mt-1.5 text-sm leading-snug text-neutral-950",
                        isUnread ? "font-semibold" : "font-medium",
                      )}
                    >
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                      {item.body}
                    </p>

                    {item.amount_cents !== null || item.reference_date ? (
                      <p className="mt-1.5 text-xs font-medium text-neutral-700 tabular-nums">
                        {item.amount_cents !== null
                          ? formatCentsToBRL(item.amount_cents)
                          : ""}
                        {item.amount_cents !== null && item.reference_date
                          ? " · "
                          : ""}
                        {item.reference_date
                          ? `Ref. ${formatDateBR(item.reference_date)}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-neutral-600"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </button>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-neutral-600">
                    {isUnread ? "Não lida" : "Lida"}
                  </span>

                  {isPickingSnooze ? (
                    <div
                      role="group"
                      aria-label={`Adiar alerta ${item.title}`}
                      className="flex flex-wrap items-center gap-1.5"
                    >
                      {SNOOZE_DAY_OPTIONS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          disabled={isBusySnooze}
                          onClick={() => {
                            setSnoozePickerId(null);
                            onSnooze(item.id, days);
                          }}
                          className="inline-flex min-h-11 items-center rounded-lg border border-neutral-500 bg-white px-2.5 text-xs font-medium text-neutral-950 tabular-nums transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                        >
                          {days === 1 ? "1 dia" : `${days} dias`}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={isBusySnooze}
                        onClick={() => setSnoozePickerId(null)}
                        className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-950"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSnoozePickerId(item.id)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-500 bg-white px-3 text-xs font-medium text-neutral-900 transition-colors hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                    >
                      <Clock
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>Adiar</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {snoozedNotifications.length > 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50">
          <button
            type="button"
            aria-expanded={showSnoozed}
            onClick={() => setShowSnoozed((current) => !current)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-950"
          >
            <span className="tabular-nums">
              Adiados ({snoozedNotifications.length})
            </span>
            {showSnoozed ? (
              <ChevronUp
                className="h-4 w-4 text-neutral-600"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <ChevronDown
                className="h-4 w-4 text-neutral-600"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
          </button>

          {showSnoozed ? (
            <ul className="divide-y divide-neutral-200 border-t border-neutral-200 bg-white px-3.5">
              {snoozedNotifications.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-950">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-600 tabular-nums">
                      {item.snoozed_until
                        ? `Retorna em ${formatDateBR(item.snoozed_until)}`
                        : "Adiado"}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    isLoading={unsnoozingId === item.id}
                    onClick={() => onUnsnooze(item.id)}
                    className="shrink-0 px-3 text-xs"
                  >
                    <RotateCcw
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <span>Reativar</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
