import { env as cfEnv } from 'cloudflare:workers';

/**
 * Environnement d'exécution du Worker, partagé par les trois applications.
 *
 * `Astro.locals.runtime.env` a été **retiré en Astro v6** : y accéder lève, et comme
 * l'accès se fait par un accesseur, même un `locals?.runtime?.env` prudent déclenche
 * l'erreur. La source de vérité est donc `cloudflare:workers` ; la lecture de `locals`
 * n'est conservée que par compatibilité, sous try/catch — c'est elle qui alimente
 * encore `astro dev`, où le module `cloudflare:workers` est vide.
 *
 * Chaque application portait sa copie de cette fonction (quatre au total) : le piège
 * est assez subtil pour qu'une copie corrigée et une copie oubliée aient déjà
 * coexisté. Un test d'architecture (`libs/architecture.test.ts`, « Environnement
 * d'exécution ») interdit par ailleurs toute lecture non protégée.
 */
export function resolveEnv<T = Record<string, unknown>>(locals: unknown): T {
  let runtimeEnv: Record<string, unknown> = {};
  try {
    runtimeEnv = (locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env || {};
  } catch {
    // Attendu en v6 : on s'en remet à `cfEnv`.
  }
  return { ...(cfEnv as unknown as T), ...runtimeEnv } as T;
}
