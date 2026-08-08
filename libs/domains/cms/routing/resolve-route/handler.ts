import { type Db } from '@nba/db';
import { parseStoredBlock } from '../../shared/block-payload';
import { normalisePath } from '../../shared/slug';
import { ResolveRouteRepository } from './repository';
import type { ResolveRouteInput, ResolveRouteOutput } from './dto';

/**
 * Résout une URL publique en un contenu, une redirection, ou rien.
 *
 * C'est le chemin le plus chaud du site : toute page vue passe par ici. L'ordre des
 * recherches va donc du plus probable au moins probable, et s'arrête au premier
 * succès.
 *
 * Les pages passent **avant** les redirections, délibérément : si quelqu'un recrée
 * `/forum-2/` comme vraie page, elle doit servir, et non rediriger vers la cible
 * héritée de WordPress.
 */
export async function resolveRoute(db: Db, input: ResolveRouteInput): Promise<ResolveRouteOutput> {
  const repo = new ResolveRouteRepository();
  const path = normalisePath(input.path);
  const includeDrafts = input.includeDrafts === true;

  const page = await repo.findPage(db, path, includeDrafts);
  if (page) {
    const rows = await repo.findBlocks(db, page.id);
    // Une ligne illisible est ignorée, pas fatale : un bloc corrompu ne doit pas
    // emporter une page entière, il doit juste manquer.
    const blocks = rows
      .map((row) => parseStoredBlock(row.type, row.payload))
      .filter((block): block is NonNullable<typeof block> => block !== null);
    return { kind: 'page', page, blocks };
  }

  const post = await repo.findPost(db, path, includeDrafts);
  if (post) return { kind: 'post', post };

  const redirect = await repo.findRedirect(db, path);
  if (redirect) {
    // Comptage au fil de l'eau, sans bloquer la réponse ni la faire échouer.
    void repo.countHit(db, redirect.id).catch(() => undefined);
    if (!redirect.toPath) return { kind: 'gone' };
    return { kind: 'redirect', toPath: redirect.toPath, statusCode: redirect.statusCode };
  }

  return { kind: 'notfound' };
}
