import type { Bytes } from './base64';
import { encryptPayload, type PushSubscriptionKeys } from './encrypt';
import { buildVapidAuthorization, type VapidKeys } from './vapid';

export interface WebPushSubscription extends PushSubscriptionKeys {
  endpoint: string;
}

export interface WebPushOptions {
  /** Durée de rétention par le service de push si l'appareil est hors ligne (secondes). */
  ttl?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  /** Remplace la notification précédente de même sujet au lieu de l'empiler. */
  topic?: string;
}

export type WebPushResult =
  | { ok: true; status: number }
  /**
   * `gone` : l'abonnement est définitivement invalide (404/410). L'appelant doit le
   * supprimer, sinon la table accumule des endpoints morts et chaque envoi les
   * recontacte inutilement.
   */
  | { ok: false; status: number; gone: boolean; error: string };

const DEFAULT_TTL = 24 * 60 * 60;

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: string,
  vapid: VapidKeys,
  options: WebPushOptions = {}
): Promise<WebPushResult> {
  let body: Bytes;
  let authorization: string;
  try {
    body = await encryptPayload(subscription, payload);
    authorization = await buildVapidAuthorization(subscription.endpoint, vapid);
  } catch (error) {
    // Abonnement corrompu ou configuration VAPID invalide : inutile d'appeler le
    // service de push. On ne marque pas `gone` — la faute peut être côté serveur.
    return { ok: false, status: 0, gone: false, error: String((error as Error)?.message || error) };
  }

  const headers: Record<string, string> = {
    Authorization: authorization,
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(options.ttl ?? DEFAULT_TTL)
  };
  if (options.urgency) headers.Urgency = options.urgency;
  if (options.topic) headers.Topic = options.topic;

  let response: Response;
  try {
    response = await fetch(subscription.endpoint, { method: 'POST', headers, body });
  } catch (error) {
    return { ok: false, status: 0, gone: false, error: String((error as Error)?.message || error) };
  }

  if (response.ok) {
    return { ok: true, status: response.status };
  }

  // Le corps d'erreur peut contenir l'endpoint : on ne le journalise pas côté appelant.
  const detail = await response.text().catch(() => '');
  return {
    ok: false,
    status: response.status,
    gone: response.status === 404 || response.status === 410,
    error: detail.slice(0, 200) || `HTTP ${response.status}`
  };
}
