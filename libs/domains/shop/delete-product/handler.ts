import { type Db } from '@nba/db';
import { eq } from 'drizzle-orm';
import { productsTable } from '../shared/schema';
import { ProductHasOrdersError, ProductHasVariantsError, ProductNotFoundError } from '../shared/errors';
import { hasOrders, hasVariants } from '../shared/variants';

/**
 * Supprime un produit que rien ne référence.
 *
 * Une commande pointe son produit par identifiant : supprimer un produit commandé
 * laisserait des commandes orphelines dans l'historique et la comptabilité. Un
 * produit commandé se désactive ; seul celui qui ne l'a jamais été — créé par erreur,
 * dans la mauvaise catégorie — disparaît vraiment. L'image reste dans R2 : adressée
 * par son contenu, un autre produit peut la partager.
 */
export async function deleteProduct(db: Db, id: number): Promise<void> {
  const product = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, id)).get();
  if (!product) throw new ProductNotFoundError();
  if (await hasVariants(db, id)) throw new ProductHasVariantsError();
  if (await hasOrders(db, id)) throw new ProductHasOrdersError();
  await db.delete(productsTable).where(eq(productsTable.id, id)).run();
}
