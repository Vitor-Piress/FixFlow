/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

interface PushNotificationPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  badgeCount?: number;
}

type BadgeNavigator = WorkerNavigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
};

type ExtendedNotificationOptions = NotificationOptions & {
  renotify?: boolean;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

self.addEventListener("message", (event) => {
  if (
    event.data &&
    typeof event.data === "object" &&
    "type" in event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    void self.skipWaiting();
  }
});

function parsePushPayload(data: PushMessageData | null): PushNotificationPayload {
  if (!data) {
    return {};
  }

  try {
    const parsed: unknown = data.json();
    if (parsed && typeof parsed === "object") {
      return parsed as PushNotificationPayload;
    }
  } catch {
    const fallbackText = data.text();
    if (fallbackText) {
      return { body: fallbackText };
    }
  }

  return {};
}

function resolveSafeTargetUrl(rawUrl: unknown): {
  fullUrl: string;
  relativeUrl: string;
} {
  const fallbackRelative = "/?notifications=open";
  const fallbackFull = new URL(fallbackRelative, self.location.origin).href;

  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return { fullUrl: fallbackFull, relativeUrl: fallbackRelative };
  }

  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) {
      return { fullUrl: fallbackFull, relativeUrl: fallbackRelative };
    }
    return {
      fullUrl: parsed.href,
      relativeUrl: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    };
  } catch {
    return { fullUrl: fallbackFull, relativeUrl: fallbackRelative };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event.data);
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "FixFlow";
  const body =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body.trim()
      : "Você tem pendências que precisam de atenção.";
  const tag =
    typeof payload.tag === "string" && payload.tag.trim()
      ? payload.tag.trim()
      : "fixflow-alert";
  const { relativeUrl } = resolveSafeTargetUrl(payload.url);

  const notificationOptions: ExtendedNotificationOptions = {
    body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag,
    renotify: true,
    data: { url: relativeUrl },
  };

  const badgeCount =
    typeof payload.badgeCount === "number" && Number.isFinite(payload.badgeCount)
      ? Math.max(0, Math.trunc(payload.badgeCount))
      : null;

  const badgePromise = (() => {
    const nav = self.navigator as BadgeNavigator;
    if (badgeCount !== null && typeof nav.setAppBadge === "function") {
      return nav.setAppBadge(badgeCount).catch(() => undefined);
    }
    return Promise.resolve();
  })();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, notificationOptions),
      badgePromise,
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl =
    event.notification.data &&
    typeof event.notification.data === "object" &&
    "url" in event.notification.data
      ? (event.notification.data as { url?: unknown }).url
      : undefined;

  const { fullUrl, relativeUrl } = resolveSafeTargetUrl(rawUrl);

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const matchingClient = windowClients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        await matchingClient.focus();
        matchingClient.postMessage({
          type: "FIXFLOW_NAVIGATE",
          url: relativeUrl,
        });
        return;
      }

      await self.clients.openWindow(fullUrl);
    })(),
  );
});
