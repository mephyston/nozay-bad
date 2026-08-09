import { type Db } from '@nba/db';
import { buildPagePath, assertValidSlug } from '../../shared/slug';
import {
  CmsPageNotFoundError,
  CmsPathConflictError,
  CmsCyclicParentError,
  CmsHomePageConflictError
} from '../../shared/errors';
import { bumpContentVersion } from '../../shared/cache-version';
import { UpdatePageRepository } from './repository';
import type { UpdatePageInput, UpdatePageOutput } from './dto';

/**
 * Modifie une page, et répare l'arborescence si son adresse change.
 *
 * Changer un slug ou un parent déplace **toute la descendance**. Le chemin est
 * dénormalisé dans `cms_pages.path` pour que la résolution d'URL reste une seule
 * lecture indexée ; le prix à payer est ce recalcul, qui doit être exhaustif. L'oublier
 * laisserait des sous-pages accessibles à une adresse qui n'existe plus dans le menu.
 */
export async function updatePage(
  db: Db,
  input: UpdatePageInput,
  authorEmail: string,
  now: Date = new Date()
): Promise<UpdatePageOutput> {
  const repo = new UpdatePageRepository();

  const page = await repo.findById(db, input.pageId);
  if (!page) throw new CmsPageNotFoundError();

  const slug = input.slug ?? page.slug;
  assertValidSlug(slug);

  const template = input.template ?? page.template;
  const parentId = input.parentId === undefined ? page.parentId : input.parentId;

  // Une seule page peut porter l'accueil. Plutôt que de rétrograder l'autre en
  // silence — ce qui déplacerait toute sa descendance sans que personne l'ait
  // demandé — on refuse, et l'on dit laquelle libérer.
  if (template === 'home') {
    const currentHome = await repo.findHome(db);
    if (currentHome && currentHome.id !== page.id) throw new CmsHomePageConflictError(currentHome.title);
  }

  let parentPath: string | null = null;
  if (parentId != null) {
    if (parentId === page.id) throw new CmsCyclicParentError();
    const parent = await repo.findById(db, parentId);
    if (!parent) throw new CmsPageNotFoundError('Page parente introuvable');
    // Une page rangée sous sa propre descendance détacherait toute la branche de la
    // racine : elle deviendrait inatteignable tout en restant en base.
    if (parent.path.startsWith(page.path)) throw new CmsCyclicParentError();
    parentPath = parent.path;
  }

  const path = buildPagePath(template, parentPath, slug);

  if (path !== page.path) {
    const occupant = await repo.findByPath(db, path);
    if (occupant && occupant.id !== page.id) throw new CmsPathConflictError(path);
  }

  const statements: unknown[] = [
    repo.buildUpdate(db, page.id, {
      slug,
      path,
      parentId,
      title: input.title ?? page.title,
      template,
      seoTitle: input.seoTitle === undefined ? page.seoTitle : input.seoTitle,
      seoDescription: input.seoDescription === undefined ? page.seoDescription : input.seoDescription,
      noindex: input.noindex ?? page.noindex,
      updatedByEmail: authorEmail,
      updatedAt: now
    })
  ];

  if (path !== page.path) {
    // Réécriture des descendants dans le même lot que la page : D1 n'a pas de
    // transaction interactive (ADR-0002), seul un `batch` garantit qu'on ne reste pas
    // avec une moitié d'arborescence à l'ancienne adresse.
    const descendants = await repo.findDescendants(db, page.path);
    const moves: { from: string; to: string }[] = [{ from: page.path, to: path }];

    for (const child of descendants) {
      const moved = `${path}${child.path.slice(page.path.length)}`;
      statements.push(repo.buildUpdate(db, child.id, { path: moved, updatedAt: now }));
      moves.push({ from: child.path, to: moved });
    }

    /**
     * Redirections 301 des anciennes adresses.
     *
     * Posées seulement si la page était publiée : un brouillon n'a jamais eu d'adresse
     * publique, et l'encombrer de redirections vers du contenu jamais indexé ne
     * servirait qu'à polluer la table.
     *
     * Deux réécritures accompagnent chaque déplacement :
     *  - les redirections qui visaient l'ancienne adresse sont repointées vers la
     *    nouvelle, sinon un second renommage créerait une chaîne A → B → C, que Google
     *    suit mal et qui dilue le référencement ;
     *  - une redirection dont la source devient la cible est supprimée, sans quoi
     *    revenir à une adresse précédente créerait une boucle.
     */
    if (page.status === 'published') {
      for (const move of moves) {
        statements.push(repo.buildRetargetRedirects(db, move.from, move.to));
        statements.push(repo.buildDropLoopingRedirect(db, move.to));
        statements.push(repo.buildUpsertRedirect(db, move.from, move.to, now));
      }
    }
  }

  await db.batch(statements as never);

  if (page.status === 'published') await bumpContentVersion(db, now);

  const updated = await repo.findById(db, page.id);
  if (!updated) throw new CmsPageNotFoundError();
  return updated;
}
