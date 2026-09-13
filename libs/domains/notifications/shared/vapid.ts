import type { VapidKeys } from '@nba/push';

/**
 * Bindings VAPID du Worker. La clé privée est un secret (`wrangler secret put`),
 * jamais une `var`. La clé publique, elle, est publique par construction : elle est
 * inlinée dans le bundle du storefront pour l'appel à `pushManager.subscribe()`.
 */
export interface VapidEnv {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

/**
 * Résout la configuration VAPID. Renvoie `null` si elle est incomplète : l'appelant
 * doit alors échouer explicitement plutôt que d'envoyer des requêtes qui seront
 * toutes rejetées par le service de push.
 */
export function resolveVapid(env: VapidEnv | undefined): VapidKeys | null {
  const publicKey = env?.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env?.VAPID_PRIVATE_KEY?.trim();
  // Sans sujet, pas d'envoi : le sujet VAPID est un contact que les services push
  // peuvent joindre, et celui d'un autre club n'en est pas un.
  const subject = env?.VAPID_SUBJECT?.trim() || '';
  if (!publicKey || !privateKey || !subject) return null;
  return { subject, publicKey, privateKey };
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
