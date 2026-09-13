/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

/**
 * Service worker du storefront.
 *
 * Volontairement dépourvu de route de navigation : l'application est en SSR
 * authentifié, chaque navigation doit atteindre le réseau. Une coquille HTML en
 * cache cassait le login et effaçait le widget Turnstile en mode PWA.
 */

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

/**
 * `registerType: 'prompt'` : le nouveau SW attend une action de l'utilisateur.
 * Avec un SW généré par workbox ce message est câblé d'office ; ici il faut le
 * traiter nous-mêmes, sinon le bouton « mettre à jour » resterait sans effet.
 */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Prendre la main sur les pages déjà ouvertes dès l'activation.
 *
 * Le bouton « Recharger » de la bannière ne recharge la page qu'à l'événement
 * `controlling`, c'est-à-dire quand le nouveau SW contrôle la page courante. Sans
 * cet appel, il s'active mais laisse la page à l'ancien : l'événement ne vient
 * jamais, et le bouton restait sur « Un instant… » jusqu'à la fermeture de l'app
 * (constaté sur staging le 2026-09-08). vite-plugin-pwa ne le pose que pour un SW
 * qu'il génère lui-même ; en `injectManifest`, c'est à nous.
 */
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

function readPayload(event: PushEvent): PushPayload {
  if (!event.data) return {};
  try {
    return event.data.json() as PushPayload;
  } catch {
    // Un service de push peut délivrer une charge utile non-JSON (test manuel).
    return { body: event.data.text() };
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event);

  // L'icône sans suffixe est utilisée dans tous les environnements : le SW est
  // servi à la racine et ne connaît pas la variante DEV/TEST du build.
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Notification du club', {
      body: payload.body || '',
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      // Les notifications de même sujet se remplacent au lieu de s'empiler.
      tag: payload.tag,
      data: { url: payload.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Réutilise l'onglet ou la PWA déjà ouverte plutôt que d'en empiler une nouvelle.
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(target);
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

/**
 * Le navigateur peut renouveler un abonnement de sa propre initiative (rotation de
 * clés côté service de push). Sans ce ré-enregistrement, l'appareil cesserait
 * silencieusement de recevoir les notifications.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  const changeEvent = event as PushSubscriptionChangeEvent;
  event.waitUntil(
    (async () => {
      const applicationServerKey = changeEvent.oldSubscription?.options?.applicationServerKey;
      if (!applicationServerKey) return;

      const subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      });
    })()
  );
});

interface PushSubscriptionChangeEvent extends ExtendableEvent {
  oldSubscription?: PushSubscription | null;
  newSubscription?: PushSubscription | null;
}
