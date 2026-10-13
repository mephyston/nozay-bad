import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { productsTable } from './schema';
import { productDisplayName } from './product';
import { hasVariants } from './variants';

export type ProductRow = typeof productsTable.$inferSelect;

/**
 * Ce produit se commande-t-il ici ? La réponse est le motif du refus, `null` s'il se commande.
 *
 * Deux interrupteurs, comme pour les moyens de paiement : `active` retire un produit de
 * partout, `storefront` de la seule boutique des adhérents — le bureau peut encore le
 * commander pour quelqu'un. Une déclinaison suit son parent sur les deux : éteindre un
 * maillot éteint toutes ses tailles.
 *
 * `dejaCommande` : l'article que la commande porte déjà. Corriger sa quantité ou son
 * règlement ne doit pas buter sur un article retiré depuis ; seul un parent à
 * déclinaisons reste refusé, faute de taille.
 */
export async function motifArticleIndisponible(
  db: DbOrTx,
  product: ProductRow,
  options: { storefront?: boolean; dejaCommande?: boolean } = {}
): Promise<string | null> {
  const nom = productDisplayName(product);
  if (await hasVariants(db, product.id)) return `« ${nom} » se décline : choisissez l'une de ses déclinaisons.`;
  if (options.dejaCommande) return null;

  const parent = product.parentId !== null
    ? await db.select({ active: productsTable.active, storefront: productsTable.storefront })
        .from(productsTable).where(eq(productsTable.id, product.parentId)).get()
    : undefined;

  if (!product.active || parent?.active === false) return `« ${nom} » n'est plus proposé.`;
  if (options.storefront && (!product.storefront || parent?.storefront === false)) {
    return `« ${nom} » n'est pas proposé dans la boutique.`;
  }
  return null;
}
