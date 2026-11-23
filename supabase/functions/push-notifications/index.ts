import { createClient } from "@supabase/supabase-js";
import {
  buildWebPushMessages,
  filterEligibleAlertsForSlot,
  getBrtDateString,
  type NotificationDigestCandidate,
  type PushSlot,
} from "./summary.ts";
import { sendWebPushNotification, type VapidConfig } from "./webPush.ts";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  action?: "get-config" | "send-test" | "dispatch-scheduled";
  slot?: PushSlot;
  endpoint?: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function getVapidConfig(): VapidConfig | null {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")?.trim() ?? "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")?.trim() ?? "";
  const subject =
    Deno.env.get("VAPID_SUBJECT")?.trim() || "mailto:contato@fixflow.app";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

function getAdminSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticateUser(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !supabaseAnonKey || !token) {
    return null;
  }

  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function deliverToSubscriptions(
  supabaseAdmin: ReturnType<typeof getAdminSupabaseClient>,
  subscriptions: readonly PushSubscriptionRow[],
  payloadJson: string,
  vapid: VapidConfig,
): Promise<{
  sent: number;
  failed: number;
  deactivatedIds: string[];
}> {
  let sent = 0;
  let failed = 0;
  const deactivatedIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const result = await sendWebPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          payloadJson,
          vapid,
        );

        if (result.ok) {
          sent += 1;
          await supabaseAdmin
            .from("push_subscriptions")
            .update({
              last_success_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("id", sub.id);
          return;
        }

        failed += 1;
        if (result.gone) {
          deactivatedIds.push(sub.id);
          await supabaseAdmin
            .from("push_subscriptions")
            .update({
              is_active: false,
              last_error: result.error ?? "Inscrição expirada (410 Gone).",
            })
            .eq("id", sub.id);
          return;
        }

        await supabaseAdmin
          .from("push_subscriptions")
          .update({
            last_error: result.error ?? "Falha ao enviar push.",
          })
          .eq("id", sub.id);
      } catch (error) {
        failed += 1;
        const message =
          error instanceof Error ? error.message : "Erro desconhecido no envio.";
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ last_error: message.slice(0, 200) })
          .eq("id", sub.id);
      }
    }),
  );

  return { sent, failed, deactivatedIds };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: RequestBody = {};
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;

  if (action === "get-config") {
    const user = await authenticateUser(request);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const vapid = getVapidConfig();
    return jsonResponse({
      configured: Boolean(vapid),
      vapidPublicKey: vapid?.publicKey ?? null,
    });
  }

  if (action === "send-test") {
    const user = await authenticateUser(request);
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const vapid = getVapidConfig();
    if (!vapid) {
      return jsonResponse(
        { error: "Chaves VAPID não configuradas no servidor." },
        503,
      );
    }

    const supabaseAdmin = getAdminSupabaseClient();
    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (body.endpoint) {
      query = query.eq("endpoint", body.endpoint);
    }

    const { data: subscriptions, error: subError } = await query;
    if (subError) {
      return jsonResponse({ error: subError.message }, 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return jsonResponse(
        { error: "Nenhuma inscrição push ativa encontrada para este aparelho." },
        404,
      );
    }

    const payloadJson = JSON.stringify({
      title: "FixFlow: notificações ativas",
      body: "Seus alertas de vencimentos, contratos e orçamentos chegarão por aqui.",
      url: "/?notifications=open",
      tag: "fixflow-test",
    });

    const stats = await deliverToSubscriptions(
      supabaseAdmin,
      subscriptions,
      payloadJson,
      vapid,
    );

    if (stats.sent === 0) {
      return jsonResponse(
        {
          sent: stats.sent,
          failed: stats.failed,
          deactivated: stats.deactivatedIds.length,
          error: "Não foi possível entregar a notificação ao navegador.",
        },
        502,
      );
    }

    return jsonResponse({
      sent: stats.sent,
      failed: stats.failed,
      deactivated: stats.deactivatedIds.length,
    });
  }

  if (action === "dispatch-scheduled") {
    const expectedSecret = Deno.env.get("PUSH_CRON_SECRET")?.trim() ?? "";
    const providedSecret =
      request.headers.get("x-cron-secret")?.trim() ?? "";

    if (!expectedSecret || !constantTimeEquals(providedSecret, expectedSecret)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const slot: PushSlot = body.slot === "evening" ? "evening" : "morning";
    const vapid = getVapidConfig();
    if (!vapid) {
      return jsonResponse({
        skipped: true,
        reason: "vapid_not_configured",
      });
    }

    const supabaseAdmin = getAdminSupabaseClient();

    const { data: prefs, error: prefsError } = await supabaseAdmin
      .from("notification_preferences")
      .select("push_morning_enabled, push_evening_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (prefsError) {
      return jsonResponse({ error: prefsError.message }, 500);
    }

    if (
      (slot === "morning" && prefs?.push_morning_enabled === false) ||
      (slot === "evening" && prefs?.push_evening_enabled === false)
    ) {
      return jsonResponse({
        skipped: true,
        reason: "slot_disabled",
        slot,
      });
    }

    const { error: syncError } = await supabaseAdmin.rpc("sync_notifications");
    if (syncError) {
      return jsonResponse({ error: syncError.message }, 500);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const todayBrt = getBrtDateString(now);

    const { data: unreadAlerts, error: alertsError } = await supabaseAdmin
      .from("notifications")
      .select(
        "id, dedupe_key, category, severity, stage, stage_rank, title, body, action_url, last_pushed_at, last_pushed_stage, last_pushed_slot_date, last_pushed_slot",
      )
      .is("resolved_at", null)
      .is("read_at", null)
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`)
      .order("stage_rank", { ascending: false })
      .order("reference_date", { ascending: true })
      .order("updated_at", { ascending: false });

    if (alertsError) {
      return jsonResponse({ error: alertsError.message }, 500);
    }

    const alerts = (unreadAlerts ?? []) as NotificationDigestCandidate[];
    const eligible = filterEligibleAlertsForSlot(alerts, slot, todayBrt);

    if (eligible.length === 0) {
      return jsonResponse({
        skipped: true,
        reason: "no_eligible_alerts",
        slot,
        unreadCount: alerts.length,
      });
    }

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("is_active", true);

    if (subError) {
      return jsonResponse({ error: subError.message }, 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return jsonResponse({
        skipped: true,
        reason: "no_subscriptions",
        slot,
        eligibleCount: eligible.length,
      });
    }

    const messages = buildWebPushMessages(
      eligible,
      alerts.length,
      slot,
      todayBrt,
    );

    const alertById = new Map(eligible.map((item) => [item.id, item]));
    let activeSubscriptions = [...subscriptions] as PushSubscriptionRow[];
    let totalSent = 0;
    let totalFailed = 0;
    let totalDeactivated = 0;
    const deliveredAlertIds = new Set<string>();

    for (const message of messages) {
      if (activeSubscriptions.length === 0) {
        break;
      }

      const payloadJson = JSON.stringify({
        title: message.title,
        body: message.body,
        url: message.url,
        tag: message.tag,
        badgeCount: message.badgeCount,
      });

      const stats = await deliverToSubscriptions(
        supabaseAdmin,
        activeSubscriptions,
        payloadJson,
        vapid,
      );

      totalSent += stats.sent;
      totalFailed += stats.failed;
      totalDeactivated += stats.deactivatedIds.length;

      if (stats.deactivatedIds.length > 0) {
        const deadSet = new Set(stats.deactivatedIds);
        activeSubscriptions = activeSubscriptions.filter(
          (sub) => !deadSet.has(sub.id),
        );
      }

      if (stats.sent > 0) {
        for (const alertId of message.alertIds) {
          deliveredAlertIds.add(alertId);
        }
      }
    }

    if (deliveredAlertIds.size > 0) {
      await Promise.all(
        Array.from(deliveredAlertIds).map((alertId) => {
          const alert = alertById.get(alertId);
          if (!alert) {
            return Promise.resolve();
          }
          return supabaseAdmin
            .from("notifications")
            .update({
              last_pushed_at: nowIso,
              last_pushed_stage: alert.stage,
              last_pushed_slot_date: todayBrt,
              last_pushed_slot: slot,
            })
            .eq("id", alert.id);
        }),
      );
    }

    return jsonResponse({
      slot,
      eligibleCount: eligible.length,
      unreadCount: alerts.length,
      messagesPlanned: messages.length,
      alertsMarkedPushed: deliveredAlertIds.size,
      sent: totalSent,
      failed: totalFailed,
      deactivated: totalDeactivated,
    });
  }

  return jsonResponse({ error: "Unsupported action" }, 400);
});
