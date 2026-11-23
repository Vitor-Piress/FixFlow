import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/SegmentedControl";
import { NotificationPreferencesTab } from "@/features/notifications/components/NotificationPreferencesTab";
import { NotificationsListTab } from "@/features/notifications/components/NotificationsListTab";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationPreferences,
  useNotifications,
  usePushSubscriptions,
  useSnoozeNotification,
  useUnsnoozeNotification,
  useUpdateNotificationPreferences,
} from "@/features/notifications/hooks/useNotifications";
import { usePushSubscription } from "@/features/notifications/hooks/usePushSubscription";
import type { NotificationPreferencesFormValues } from "@/features/notifications/schemas/notificationPreferencesSchema";
import type { NotificationRecord } from "@/services/notifications.service";

type CenterTab = "alerts" | "preferences";

const PREFERENCES_FORM_ID = "notification-preferences-form";

interface NotificationCenterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenterSheet({
  open,
  onOpenChange,
}: NotificationCenterSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CenterTab>("alerts");
  const [isPrefsDirty, setIsPrefsDirty] = useState(false);
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const [unsnoozingId, setUnsnoozingId] = useState<string | null>(null);

  const {
    activeNotifications,
    snoozedNotifications,
    unreadCount,
    isLoading: alertsLoading,
    isError: alertsError,
    refetch: refetchAlerts,
  } = useNotifications();

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const snoozeMutation = useSnoozeNotification();
  const unsnoozeMutation = useUnsnoozeNotification();

  const {
    data: preferences,
    isLoading: prefsLoading,
    isError: prefsError,
    refetch: refetchPrefs,
  } = useNotificationPreferences({
    enabled: open && activeTab === "preferences",
  });

  const updatePreferences = useUpdateNotificationPreferences();

  const { data: subscriptions = [] } = usePushSubscriptions({
    enabled: open && activeTab === "preferences",
  });

  const push = usePushSubscription({ enabled: open });

  const tabOptions: readonly SegmentedOption<CenterTab>[] = [
    {
      value: "alerts",
      label: "Alertas",
      count: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      value: "preferences",
      label: "Preferências",
    },
  ];

  function handleOpenChange(nextOpen: boolean) {
    if (!updatePreferences.isPending) {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setActiveTab("alerts");
      }
    }
  }

  function handleOpenNotification(item: NotificationRecord) {
    if (!item.read_at) {
      markRead.mutate(item.id);
    }

    onOpenChange(false);
    setActiveTab("alerts");
    navigate(item.action_url);
  }

  function handleMarkAllRead() {
    const unreadIds = activeNotifications
      .filter((item) => !item.read_at)
      .map((item) => item.id);

    if (unreadIds.length > 0) {
      markAllRead.mutate(unreadIds);
    }
  }

  async function handleSnooze(id: string, days: number) {
    setSnoozingId(id);
    try {
      await snoozeMutation.mutateAsync({ id, days });
    } catch {
      // Mutation onError handles toast feedback.
    } finally {
      setSnoozingId(null);
    }
  }

  async function handleUnsnooze(id: string) {
    setUnsnoozingId(id);
    try {
      await unsnoozeMutation.mutateAsync(id);
    } catch {
      // Mutation onError handles toast feedback.
    } finally {
      setUnsnoozingId(null);
    }
  }

  async function handleSubmitPreferences(
    values: NotificationPreferencesFormValues,
  ) {
    try {
      await updatePreferences.mutateAsync(values);
      setIsPrefsDirty(false);
    } catch {
      // Mutation onError handles toast feedback.
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Central de notificações"
      description={
        activeTab === "alerts"
          ? "Vencimentos, contratos mensais e orçamentos pendentes"
          : "Alertas push no aparelho e prazos das regras"
      }
      fullHeight
      footer={
        activeTab === "preferences" ? (
          <Button
            type="submit"
            form={PREFERENCES_FORM_ID}
            size="lg"
            className="w-full"
            isLoading={updatePreferences.isPending}
            disabled={prefsLoading || prefsError || !isPrefsDirty}
          >
            Salvar preferências
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <SegmentedControl
          ariaLabel="Seções da central de notificações"
          options={tabOptions}
          value={activeTab}
          onChange={setActiveTab}
          idBase="notification-center"
          getTabId={(tab) => `notification-center-tab-${tab}`}
          getPanelId={(tab) => `notification-center-panel-${tab}`}
        />

        <div
          role="tabpanel"
          id={`notification-center-panel-${activeTab}`}
          aria-labelledby={`notification-center-tab-${activeTab}`}
          className="outline-none"
        >
          {activeTab === "alerts" ? (
            <NotificationsListTab
              activeNotifications={activeNotifications}
              snoozedNotifications={snoozedNotifications}
              unreadCount={unreadCount}
              isLoading={alertsLoading}
              isError={alertsError}
              onRetry={() => {
                void refetchAlerts();
              }}
              pushDeviceStatus={push.status}
              onOpenPreferences={() => setActiveTab("preferences")}
              onOpenNotification={handleOpenNotification}
              onMarkAllRead={handleMarkAllRead}
              isMarkingAllRead={markAllRead.isPending}
              onSnooze={(id, days) => {
                void handleSnooze(id, days);
              }}
              snoozingId={snoozingId}
              onUnsnooze={(id) => {
                void handleUnsnooze(id);
              }}
              unsnoozingId={unsnoozingId}
            />
          ) : (
            <NotificationPreferencesTab
              open={open && activeTab === "preferences"}
              formId={PREFERENCES_FORM_ID}
              preferences={preferences}
              isLoading={prefsLoading}
              isError={prefsError}
              onRetry={() => {
                void refetchPrefs();
              }}
              pushEnv={push.env}
              pushStatus={push.status}
              currentEndpoint={push.currentEndpoint}
              isPushMutating={push.isMutating}
              isTestingPush={push.isTesting}
              onSubscribePush={() => {
                void push.subscribe();
              }}
              onUnsubscribePush={() => {
                void push.unsubscribe();
              }}
              onTestPush={() => {
                void push.sendTest();
              }}
              subscriptions={subscriptions}
              onDirtyChange={setIsPrefsDirty}
              onSubmitPreferences={handleSubmitPreferences}
            />
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
