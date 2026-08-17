import { createApiClient } from '@nba/api-client';
import { resolveEnv as resolveRuntimeEnv } from '@nba/runtime-env';

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
/**
 * Environnement d'exécution du Worker : fusion `cloudflare:workers` + env runtime
 * Astro, partagée par les trois applications (`@nba/runtime-env`).
 */
export function resolveEnv(locals: App.Locals): Record<string, unknown> {
  return resolveRuntimeEnv(locals);
}

export function createAdminApiClient(locals: App.Locals) {
  const resolvedEnv = resolveEnv(locals);

  const userEmail = locals.user?.email;
  if (!userEmail) {
    // Le middleware pose `locals.user` avant toute page : son absence est un défaut
    // de câblage, pas un cas métier. Échouer ici évite un appel silencieusement
    // anonyme, qui serait refusé par l'API avec un message bien moins parlant.
    throw new Error("[admin] createAdminApiClient appelé sans utilisateur résolu");
  }

  return createApiClient(resolvedEnv as never, { caller: 'admin', userEmail });
}
