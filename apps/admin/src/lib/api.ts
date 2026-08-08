import { env as cfEnv } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';

/**
 * Client d'API de l'application admin, porteur de l'identité de l'utilisateur.
 *
 * Tout appel sortant doit passer par ici : l'API est l'autorité en matière de droits
 * et refuse un appel `admin` qui n'affirme aucune identité. Utiliser `createApiClient`
 * directement depuis une page enverrait la requête sans utilisateur, et donc sans
 * contrôle de rôle — c'est précisément la faille que ce câblage referme, y compris
 * pour les pages qui n'ont jamais eu de garde propre.
 *
 * Un test d'architecture interdit `createApiClient(` sous `src/pages/admin/**`.
 */
export function createAdminApiClient(locals: App.Locals) {
  let runtimeEnv: Record<string, string> = {};
  try {
    runtimeEnv = ((locals as any).runtime?.env || {}) as Record<string, string>;
  } catch {
    // Astro v6 : `locals.runtime.env` lève en production. cfEnv suffit alors.
  }
  const resolvedEnv = { ...cfEnv, ...runtimeEnv } as Record<string, unknown>;

  const userEmail = locals.user?.email;
  if (!userEmail) {
    // Le middleware pose `locals.user` avant toute page : son absence est un défaut
    // de câblage, pas un cas métier. Échouer ici évite un appel silencieusement
    // anonyme, qui serait refusé par l'API avec un message bien moins parlant.
    throw new Error("[admin] createAdminApiClient appelé sans utilisateur résolu");
  }

  return createApiClient(resolvedEnv as never, { caller: 'admin', userEmail });
}
