import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database.types";

export type NotificationRecord = Tables<"notifications">;
export type NotificationPreferences = Tables<"notification_preferences">;
export type NotificationPreferencesUpdate = Omit<
  TablesUpdate<"notification_preferences">,
  "id" | "created_at" | "updated_at"
>;

export type PushSubscriptionRecord = Tables<"push_subscriptions">;
export type PushSubscriptionInsert = Omit<
  TablesInsert<"push_subscriptions">,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export interface PushConfigResponse {
  configured: boolean;
  vapidPublicKey: string | null;
}

export interface SendTestPushResponse {
  sent: number;
  failed: number;
  deactivated: number;
}

export async function syncAndListNotifications(): Promise<
  NotificationRecord[]
> {
  const { error: syncError } = await supabase.rpc("sync_notifications");
  if (syncError) {
    throw new Error("Não foi possível atualizar os alertas.");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .is("resolved_at", null)
    .order("stage_rank", { ascending: false })
    .order("reference_date", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar as notificações.");
  }

  return data;
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationRecord> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível marcar o alerta como lido.");
  }

  return data;
}

export async function markAllNotificationsRead(
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", [...ids])
    .is("read_at", null);

  if (error) {
    throw new Error("Não foi possível marcar todos os alertas como lidos.");
  }
}

export async function snoozeNotification(
  id: string,
  snoozedUntilIso: string,
): Promise<NotificationRecord> {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      snoozed_until: snoozedUntilIso,
      read_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível adiar o alerta.");
  }

  return data;
}

export async function unsnoozeNotification(
  id: string,
): Promise<NotificationRecord> {
  const { data, error } = await supabase
    .from("notifications")
    .update({
      snoozed_until: null,
      read_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível reativar o alerta.");
  }

  return data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error("Não foi possível carregar as preferências de alerta.");
  }

  return data;
}

export async function updateNotificationPreferences(
  payload: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .update(payload)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível salvar as preferências de alerta.");
  }

  return data;
}

export async function listPushSubscriptions(): Promise<
  PushSubscriptionRecord[]
> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os aparelhos conectados.");
  }

  return data;
}

export async function upsertPushSubscription(
  payload: PushSubscriptionInsert,
): Promise<PushSubscriptionRecord> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        ...payload,
        is_active: true,
        last_error: null,
      },
      { onConflict: "endpoint" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error("Não foi possível salvar a inscrição deste aparelho.");
  }

  return data;
}

export async function deactivatePushSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);

  if (error) {
    throw new Error("Não foi possível desativar este aparelho.");
  }
}

export async function getPushConfig(): Promise<PushConfigResponse> {
  const envPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (typeof envPublicKey === "string" && envPublicKey.trim().length > 0) {
    return {
      configured: true,
      vapidPublicKey: envPublicKey.trim(),
    };
  }

  const { data, error } = await supabase.functions.invoke<PushConfigResponse>(
    "push-notifications",
    {
      body: { action: "get-config" },
    },
  );

  if (error || !data) {
    throw new Error(
      "Não foi possível consultar a configuração de notificações push.",
    );
  }

  return data;
}

export async function sendTestPush(
  endpoint?: string,
): Promise<SendTestPushResponse> {
  const { data, error } = await supabase.functions.invoke<
    SendTestPushResponse & { error?: string }
  >("push-notifications", {
    body: { action: "send-test", endpoint },
  });

  if (error) {
    throw new Error("Não foi possível enviar a notificação de teste.");
  }

  if (!data || data.sent < 1) {
    throw new Error(
      data?.error || "Nenhuma notificação de teste foi entregue.",
    );
  }

  return {
    sent: data.sent,
    failed: data.failed,
    deactivated: data.deactivated,
  };
}
