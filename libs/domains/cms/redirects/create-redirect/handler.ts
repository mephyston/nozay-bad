import { type Db } from '@nba/db';
import { normalisePath } from '../../shared/slug';
import {
  CmsRedirectLoopError,
  CmsRedirectChainError,
  CmsRedirectSourceConflictError,
  CmsRedirectShadowedError
} from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { CreateRedirectRepository } from './repository';
import type { CreateRedirectInput, CreateRedirectOutput } from './dto';

/**
 * Pose une redirection à la main.
 *
 * Le renommage d'une page publiée en pose déjà automatiquement ; ce geste couvre le
 * reste : l'adresse d'une page supprimée, une vieille URL WordPress signalée en 404,
 * ou un raccourci de communication (`/tournoi/` vers la page du moment).
 *
 * Mêmes invariants que les redirections automatiques : pas de boucle, pas de chaîne,
 * et une source qui ne masque aucune page — la résolution d'URL sert la page d'abord,
 * une redirection posée sur l'adresse d'une page ne serait jamais empruntée.
 */
export async function createRedirect(
  db: Db,
  input: CreateRedirectInput,
  now: Date = new Date()
): Promise<CreateRedirectOutput> {
  const repo = new CreateRedirectRepository();

  const fromPath = normalisePath(input.fromPath);
  const toPath = input.toPath === null ? null : normalisePath(input.toPath);

  const existing = await repo.findByFromPath(db, fromPath);
  if (existing) throw new CmsRedirectSourceConflictError(fromPath);

  const shadowing = await repo.findPageByPath(db, fromPath);
  if (shadowing) throw new CmsRedirectShadowedError(fromPath);

  if (toPath !== null) {
    if (toPath === fromPath) throw new CmsRedirectLoopError();
    const next = await repo.findByFromPath(db, toPath);
    if (next) throw new CmsRedirectChainError(next.fromPath, next.toPath);
  }

  const created = await repo.insert(db, {
    fromPath,
    toPath,
    statusCode: toPath === null ? 410 : 301,
    note: input.note ?? null,
    createdAt: now
  });

  // Sans quoi le site public servirait encore le 404 mis en cache pour cette adresse.
  await bumpContentVersion(db, now);

  return created;
}
