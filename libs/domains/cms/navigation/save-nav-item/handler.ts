import { type Db } from '@nba/db';
import { isSafeHref } from '@nba/html';
import {
  CmsNavItemNotFoundError,
  CmsNavTargetError,
  CmsNavDepthError,
  CmsPageNotFoundError
} from '../../shared/errors';
import { SaveNavItemRepository } from './repository';
import type { SaveNavItemInput, SaveNavItemOutput } from './dto';

/**
 * Crée ou modifie une entrée de menu.
 *
 * Écriture entrée par entrée, et non remplacement de l'arbre entier : les entrées se
 * référencent par `parentId`, et un lot D1 ne peut pas relire l'identifiant qu'il
 * vient de générer pour plusieurs enfants à la fois. Un enregistrement par entrée
 * garde chaque écriture atomique sans détour.
 */
export async function saveNavItem(db: Db, input: SaveNavItemInput): Promise<SaveNavItemOutput> {
  const repo = new SaveNavItemRepository();

  const pageId = input.pageId ?? null;
  const externalUrl = input.externalUrl?.trim() ? input.externalUrl.trim() : null;

  // Exactement une cible. Les deux serviraient l'une au détriment de l'autre selon le
  // code de rendu ; aucune donnerait une entrée de menu qui ne mène nulle part.
  if ((pageId === null) === (externalUrl === null)) throw new CmsNavTargetError();
  if (pageId !== null && !(await repo.pageExists(db, pageId))) throw new CmsPageNotFoundError();
  if (externalUrl !== null && !isSafeHref(externalUrl)) {
    throw new CmsNavTargetError("L'adresse extérieure doit commencer par http:// ou https://.");
  }

  const parentId = input.parentId ?? null;
  if (parentId !== null) {
    const parent = await repo.findById(db, parentId);
    if (!parent) throw new CmsNavItemNotFoundError('Le menu parent est introuvable.');
    // Deux niveaux au plus : un sous-sous-menu est inatteignable au survol sur écran
    // large, et illisible une fois replié dans le menu mobile.
    if (parent.parentId !== null) throw new CmsNavDepthError();
    if (parent.location !== input.location) {
      throw new CmsNavTargetError("Le menu parent appartient à un autre emplacement.");
    }
    if (input.navItemId !== undefined && parentId === input.navItemId) {
      throw new CmsNavTargetError("Une entrée ne peut pas être son propre parent.");
    }
  }

  if (input.navItemId === undefined) {
    return repo.insert(db, {
      location: input.location,
      parentId,
      label: input.label,
      pageId,
      externalUrl,
      position: input.position ?? (await repo.nextPosition(db, input.location, parentId))
    });
  }

  const existing = await repo.findById(db, input.navItemId);
  if (!existing) throw new CmsNavItemNotFoundError();

  // Une entrée qui devient sous-menu ne doit pas emporter d'enfants avec elle : le
  // contrôle de profondeur ci-dessus ne voit que le parent, pas la descendance.
  if (parentId !== null && existing.parentId === null) {
    const children = await repo.hasChildren(db, existing.id);
    if (children) throw new CmsNavDepthError('Cette entrée porte un sous-menu : videz-le avant de la déplacer.');
  }

  return repo.update(db, existing.id, {
    location: input.location,
    parentId,
    label: input.label,
    pageId,
    externalUrl,
    position: input.position ?? existing.position
  });
}
