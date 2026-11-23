import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PUSH_SUBSCRIPTIONS_QUERY_KEY } from "@/features/notifications/hooks/useNotifications";
import {
  detectPushEnvironment,
  urlBase64ToUint8Array,
  type PushEnvironment,
} from "@/lib/notifications";
import {
  deactivatePushSubscriptionByEndpoint,
  getPushConfig,
  sendTestPush,
  upsertPushSubscription,
} from "@/services/notifications.service";

export type PushDeviceStatus =
  | "checking"
  | "unsupported"
  | "ios-install-required"
  | "denied"
  | "unsubscribed"
  | "subscribed";

function resolveImmediateStatus(nextEnv: PushEnvironment): PushDeviceStatus {
  if (nextEnv.needsIosInstall) {
    return "ios-install-required";
  }
  if (!nextEnv.supported) {
    return "unsupported";
  }
  if (nextEnv.permission === "denied") {
    return "denied";
  }
  return "checking";
}

export function usePushSubscription(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();

  const [env, setEnv] = useState<PushEnvironment>(() => detectPushEnvironment());
  const [status, setStatus] = useState<PushDeviceStatus>(() =>
    resolveImmediateStatus(detectPushEnvironment()),
  );
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function syncSubscriptionState() {
      const nextEnv = detectPushEnvironment();
      const immediate = resolveImmediateStatus(nextEnv);

      if (immediate !== "checking") {
        await Promise.resolve();
        if (!cancelled) {
          setEnv(nextEnv);
          setStatus(immediate);
          setCurrentEndpoint(null);
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = registration
          ? await registration.pushManager.getSubscription()
          : null;

        if (cancelled) {
          return;
        }

        setEnv(nextEnv);
        if (!subscription) {
          setStatus("unsubscribed");
          setCurrentEndpoint(null);
          return;
        }

        setCurrentEndpoint(subscription.endpoint);
        setStatus("subscribed");
      } catch {
        if (!cancelled) {
          setEnv(nextEnv);
          setStatus("unsubscribed");
          setCurrentEndpoint(null);
        }
      }
    }

    void syncSubscriptionState();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const subscribe = useCallback(async () => {
    const currentEnv = detectPushEnvironment();
    setEnv(currentEnv);

    if (currentEnv.needsIosInstall) {
      setStatus("ios-install-required");
      return;
    }

    if (!currentEnv.supported) {
      setStatus("unsupported");
      toast.error("Este navegador não suporta notificações push.");
      return;
    }

    setIsMutating(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        toast.error(
          "Permissão bloqueada. Libere as notificações nas configurações do navegador.",
        );
        return;
      }

      if (permission !== "granted") {
        setStatus("unsubscribed");
        return;
      }

      const config = await getPushConfig();
      if (!config.configured || !config.vapidPublicKey) {
        throw new Error(
          "O envio de notificações push ainda não foi configurado no servidor.",
        );
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
        }));

      const json = subscription.toJSON();
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!subscription.endpoint || !p256dh || !auth) {
        throw new Error("Inscrição push incompleta retornada pelo navegador.");
      }

      await upsertPushSubscription({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        device_label: currentEnv.deviceLabel,
        user_agent: currentEnv.userAgent || null,
      });

      setCurrentEndpoint(subscription.endpoint);
      setStatus("subscribed");
      void queryClient.invalidateQueries({
        queryKey: PUSH_SUBSCRIPTIONS_QUERY_KEY,
      });
      toast.success("Notificações ativadas neste aparelho.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível ativar as notificações neste aparelho.";
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }, [queryClient]);

  const unsubscribe = useCallback(async () => {
    setIsMutating(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      const endpoint = subscription?.endpoint ?? currentEndpoint;
      if (subscription) {
        await subscription.unsubscribe();
      }

      if (endpoint) {
        await deactivatePushSubscriptionByEndpoint(endpoint);
      }

      setCurrentEndpoint(null);
      setStatus("unsubscribed");
      void queryClient.invalidateQueries({
        queryKey: PUSH_SUBSCRIPTIONS_QUERY_KEY,
      });
      toast.success("Notificações desativadas neste aparelho.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível desativar as notificações.";
      toast.error(message);
    } finally {
      setIsMutating(false);
    }
  }, [currentEndpoint, queryClient]);

  const sendTest = useCallback(async () => {
    setIsTesting(true);
    try {
      await sendTestPush(currentEndpoint ?? undefined);
      void queryClient.invalidateQueries({
        queryKey: PUSH_SUBSCRIPTIONS_QUERY_KEY,
      });
      toast.success("Notificação de teste enviada para este aparelho.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a notificação de teste.";
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  }, [currentEndpoint, queryClient]);

  return {
    env,
    status,
    currentEndpoint,
    isMutating,
    isTesting,
    subscribe,
    unsubscribe,
    sendTest,
  };
}
