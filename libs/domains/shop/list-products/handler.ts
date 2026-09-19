import { type Db } from '@nba/db';
import { ListProductsRepository } from './repository';
import { compareVariantLabels, productDisplayName } from '../shared/product';
import { ListProductsInput, ListProductsOutput } from "./dto";

/**
 * Le catalogue, à plat et dans l'ordre de lecture.
 *
 * Chaque ligne est un produit ; une déclinaison porte `parentId`. La liste est
 * ordonnée pour qu'un parent précède ses déclinaisons, celles-ci dans l'ordre
 * naturel de leurs libellés (XS avant S, 10 ans avant 12 ans) — les écrans n'ont
 * plus qu'à regrouper.
 *
 * Demandés actifs, les produits dont le parent est inactif sont retirés avec lui :
 * désactiver un maillot doit retirer toutes ses tailles de la vitrine.
 */
export async function listProducts(db: Db, filters: ListProductsInput): Promise<ListProductsOutput> {
  const repo = new ListProductsRepository();
  const rows = await repo.list(db, filters);

  const listed = rows.map((p) => ({
    ...p,
    displayName: productDisplayName(p),
    categoryLabel: p.categoryLabel ?? 'Autre',
    trackStock: Boolean(p.trackStock),
    active: Boolean(p.active),
    price: p.priceCents,
    priceCents: p.priceCents,
    ordersCount: Number(p.ordersCount ?? 0),
    variantCount: Number(p.variantCount ?? 0)
  }));

  const visible = filters.active === true
    ? listed.filter((p) => p.parentId === null || listed.some((parent) => parent.id === p.parentId))
    : listed;

  const byId = new Map(visible.map((p) => [p.id, p]));
  const anchor = (p: (typeof visible)[number]) => (p.parentId !== null ? byId.get(p.parentId) ?? p : p);

  return visible.sort((a, b) => {
    const pa = anchor(a);
    const pb = anchor(b);
    if (pa.id !== pb.id) {
      return pa.name.localeCompare(pb.name, 'fr', { sensitivity: 'base' }) || pa.id - pb.id;
    }
    // Même famille : le parent d'abord, puis les déclinaisons dans leur ordre.
    if (a.parentId === null) return -1;
    if (b.parentId === null) return 1;
    return compareVariantLabels(a.variantLabel ?? '', b.variantLabel ?? '');
  });
}
