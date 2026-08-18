import { type Db } from '@nba/db';
import { normalisePath } from '../../shared/slug';
import {
  CmsRedirectNotFoundError,
  CmsRedirectLoopError,
  CmsRedirectChainError
} from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { UpdateRedirectRepository } from './repository';
import type { UpdateRedirectInput, UpdateRedirectOutput } from './dto';

/**
 * Modifie la cible ou la note d'une redirection.
 *
 * La source (`fromPath`) est intouchable : la changer reviendrait à supprimer une
 * redirection et à en créer une autre, avec tous les invariants d'unicité à revérifier
 * — l'écran d'administration propose exactement ces deux gestes à la place.
 *
 * Le code de statut est dérivé de la cible, jamais saisi : la résolution d'URL décide
 * du 410 sur la nullité de `toPath`, et un code qui la contredirait ne serait jamais
 * servi.
 */
export async function updateRedirect(
  db: Db,
  input: UpdateRedirectInput,
  now: Date = new Date()
): Promise<UpdateRedirectOutput> {
  const repo = new UpdateRedirectRepository();

  const redirect = await repo.findById(db, input.redirectId);
  if (!redirect) throw new CmsRedirectNotFoundError();

  const toPath = input.toPath === null ? null : normalisePath(input.toPath);

  if (toPath !== null) {
    if (toPath === redirect.fromPath) throw new CmsRedirectLoopError();
    // Pas de chaîne : viser une adresse elle-même redirigée ferait suivre deux sauts
    // aux visiteurs comme aux moteurs. On refuse en nommant la cible finale plutôt que
    // de résoudre en silence — l'utilisateur garde la main.
    const next = await repo.findByFromPath(db, toPath);
    if (next && next.id !== redirect.id) throw new CmsRedirectChainError(next.fromPath, next.toPath);
  }

  await repo.update(db, redirect.id, {
    toPath,
    statusCode: toPath === null ? 410 : 301,
    ...(input.note === undefined ? {} : { note: input.note })
  });

  // Sans quoi le site public servirait l'ancienne destination depuis son cache.
  await bumpContentVersion(db, now);

  const updated = await repo.findById(db, redirect.id);
  if (!updated) throw new CmsRedirectNotFoundError();
  return updated;
}
