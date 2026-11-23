import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  buildSnoozeUntilIso,
  partitionNotifications,
} from "@/lib/notifications";
import {
  getNotificationPreferences,
  listPushSubscriptions,
  markAllNotificationsRead,
  markNotificationRead,
  snoozeNotification,
  syncAndListNotifications,
  unsnoozeNotification,
  updateNotificationPreferences,
  type NotificationPreferencesUpdate,
  type NotificationRecord,
} from "@/services/notifications.service";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;
export const NOTIFICATION_PREFERENCES_QUERY_KEY = [
  "notification-preferences",
] as const;
export const PUSH_SUBSCRIPTIONS_QUERY_KEY = ["push-subscriptions"] as const;

type BadgeAppNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

function syncBrowserAppBadge(unreadCount: number) {
  if (typeof navigator === "undefined") {
    return;
  }

  const nav = navigator as BadgeAppNavigator;
  if (unreadCount > 0 && typeof nav.setAppBadge === "function") {
    void nav.setAppBadge(unreadCount).catch(() => undefined);
    return;
  }

  if (unreadCount === 0 && typeof nav.clearAppBadge === "function") {
    void nav.clearAppBadge().catch(() => undefined);
  }
}

export function useNotifications(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: syncAndListNotifications,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });

  const partition = useMemo(
    () => partitionNotifications(query.data ?? []),
    [query.data],
  );

  useEffect(() => {
    if (query.isSuccess) {
      syncBrowserAppBadge(partition.unreadCount);
    }
  }, [query.isSuccess, partition.unreadCount]);

  return {
    ...query,
    notifications: query.data ?? [],
    activeNotifications: partition.active,
    snoozedNotifications: partition.snoozed,
    unreadCount: partition.unreadCount,
    criticalUnreadCount: partition.criticalUnreadCount,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationRecord[]>(
        NOTIFICATIONS_QUERY_KEY,
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)),
      );
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível marcar como lida.";
      toast.error(message);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => markAllNotificationsRead(ids),
    onSuccess: (_data, ids) => {
      const readAt = new Date().toISOString();
      const idSet = new Set(ids);
      queryClient.setQueryData<NotificationRecord[]>(
        NOTIFICATIONS_QUERY_KEY,
        (current) =>
          current?.map((item) =>
            idSet.has(item.id) && !item.read_at ? { ...item, read_at: readAt } : item,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
      toast.success("Alertas marcados como lidos.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível marcar todos como lidos.";
      toast.error(message);
    },
  });
}

export function useSnoozeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      snoozeNotification(id, buildSnoozeUntilIso(days)),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<NotificationRecord[]>(
        NOTIFICATIONS_QUERY_KEY,
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)),
      );
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
      const label = variables.days === 1 ? "1 dia" : `${variables.days} dias`;
      toast.success(`Alerta adiado por ${label}.`);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível adiar o alerta.";
      toast.error(message);
    },
  });
}

export function useUnsnoozeNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unsnoozeNotification(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationRecord[]>(
        NOTIFICATIONS_QUERY_KEY,
        (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)),
      );
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
      toast.success("Alerta reativado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível reativar o alerta.";
      toast.error(message);
    },
  });
}

export function useNotificationPreferences(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
    queryFn: getNotificationPreferences,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NotificationPreferencesUpdate) =>
      updateNotificationPreferences(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(NOTIFICATION_PREFERENCES_QUERY_KEY, updated);
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
      });
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      });
      toast.success("Preferências de alerta salvas.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as preferências.";
      toast.error(message);
    },
  });
}

export function usePushSubscriptions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: PUSH_SUBSCRIPTIONS_QUERY_KEY,
    queryFn: listPushSubscriptions,
    enabled: options?.enabled ?? true,
  });
}
