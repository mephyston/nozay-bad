import { type Db } from '@nba/db';
import { ListNavItemsRepository } from './repository';
import type { ListNavItemsInput, ListNavItemsOutput, NavItemView } from './dto';

/**
 * Menus, rendus sous forme d'arbre.
 *
 * Le site public appelle cette route à chaque page : les deux lectures sont faites en
 * une passe et l'arborescence est recomposée en mémoire, plutôt qu'une requête par
 * niveau. Le menu du club tient en une vingtaine d'entrées.
 */
export async function listNavItems(
  db: Db,
  filters: ListNavItemsInput = {}
): Promise<ListNavItemsOutput> {
  const repo = new ListNavItemsRepository();
  const [rows, pages] = await Promise.all([repo.list(db, filters.location), repo.pages(db)]);
  const pathById = new Map(pages.map((page) => [page.id, page.path]));

  const toView = (row: (typeof rows)[number]): NavItemView => ({
    ...row,
    // Une page supprimée emporte son entrée par cascade. `null` ne dit donc pas
    // « adresse introuvable » mais « entrée sans cible » : un conteneur, que le rendu
    // affiche en intitulé plutôt qu'en lien.
    href: row.pageId !== null ? pathById.get(row.pageId) ?? null : row.externalUrl,
    children: []
  });

  const views = new Map<number, NavItemView>();
  for (const row of rows) views.set(row.id, toView(row));

  const roots: NavItemView[] = [];
  for (const row of rows) {
    const view = views.get(row.id)!;
    if (row.parentId === null) {
      roots.push(view);
      continue;
    }
    // Un parent absent (ou d'un autre emplacement) remonterait l'entrée au premier
    // niveau plutôt que de la faire disparaître du menu sans trace.
    const parent = views.get(row.parentId);
    if (parent) parent.children.push(view);
    else roots.push(view);
  }
  return roots;
}
