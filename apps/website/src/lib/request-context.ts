import { env as cfEnv } from 'cloudflare:workers';
import type { WebsiteEnv } from './cms';

/**
 * Environnement d'exécution du Worker.
 *
 * `Astro.locals.runtime.env` a été **retiré en Astro v6** : y accéder lève, et comme
 * l'accès se fait par un accesseur, même un `locals?.runtime?.env` prudent déclenche
 * l'erreur. La source de vérité est donc `cloudflare:workers` ; la lecture de `locals`
 * n'est conservée que par compatibilité, sous try/catch.
 *
 * Même approche que `apps/storefront/src/lib/request-context.ts`.
 */
export function resolveEnv(locals: unknown): WebsiteEnv {
  let runtimeEnv: Record<string, unknown> = {};
  try {
    runtimeEnv = (locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env || {};
  } catch {
    // Attendu en v6 : on s'en remet à `cfEnv`.
  }
  return { ...(cfEnv as unknown as WebsiteEnv), ...runtimeEnv } as WebsiteEnv;
}
