import { getActor, invalidateRolePermissions, normalizeEmail, type Actor } from '@nba/iam';
import type { Db } from '@nba/db';

/**
 * Cache de résolution d'identité, à l'échelle de l'isolate.
 *
 * Une modification de droits se propage donc en 30 s au pire. C'est un net progrès
 * sur l'état antérieur, où l'application admin relisait la table des comptes
 * *entière* à chaque requête, sans aucun cache.
 *
 * L'invalidation explicite ci-dessous ne vaut que pour l'isolate courant — un Worker
 * en exécute plusieurs. Elle rend la propagation immédiate dans le cas courant, mais
 * **la garantie reste le TTL** : ne rien construire qui suppose une invalidation
 * globale.
 */
const TTL_MS = 30_000;
const MAX_ENTRIES = 500;

interface CacheEntry {
  actor: Actor | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function resolveActor(db: Db, email: string, now: number = Date.now()): Promise<Actor | null> {
  const key = normalizeEmail(email);
  if (!key) return null;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.actor;

  const actor = await getActor(db, key);

  // Les résultats négatifs sont mis en cache eux aussi : sans cela, une adresse
  // inconnue répétée coûterait un accès à la base par requête.
  if (cache.size >= MAX_ENTRIES) {
    // Borne mémoire : un isolate ne doit pas croître indéfiniment sur des adresses
    // inconnues. La plus anciennement insérée part en premier.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { actor, expiresAt: now + TTL_MS });

  return actor;
}

export function invalidateActor(email: string): void {
  cache.delete(normalizeEmail(email));
}

export function clearActorCache(): void {
  cache.clear();
  // Le plan des droits est mis en cache dans `@nba/iam`, avec un TTL plus long. Un
  // test qui réinitialise sa base doit le perdre aussi, sinon il hérite des droits
  // d'un test précédent — l'oubli ne se voit que plusieurs fichiers plus loin.
  invalidateRolePermissions();
}
