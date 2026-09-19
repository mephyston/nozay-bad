import { type Db } from '@nba/db';
import { UpdateProductRepository } from './repository';
import { ProductHasVariantsError, ProductNotFoundError, VariantNestingError } from '../shared/errors';
import { hasVariants, propagateToVariants, requireVariantLabel, resolveParent } from '../shared/variants';
import { UpdateProductId, UpdateProductInput, UpdateProductOutput } from "./dto";

/**
 * Modifie un produit, rattachement compris.
 *
 * La catégorie se change ici comme le reste : elle était figée à la création, et un
 * maillot créé par erreur dans « Volants » ne pouvait qu'être désactivé et recréé.
 * Ce qu'une déclinaison hérite — nom, catégorie — se modifie sur le parent seul, et
 * redescend sur toutes ses déclinaisons dans le même geste.
 */
export async function updateProduct(db: Db, id: UpdateProductId, body: UpdateProductInput): Promise<UpdateProductOutput> {
  const repo = new UpdateProductRepository();
  const current = await repo.getById(db, id);
  if (!current) throw new ProductNotFoundError();

  const values: Parameters<UpdateProductRepository['update']>[2] = {};
  if (body.priceCents !== undefined) values.priceCents = body.priceCents;
  if (body.stock !== undefined) values.stock = body.stock;
  if (body.trackStock !== undefined) values.trackStock = body.trackStock;
  if (body.active !== undefined) values.active = body.active;

  // Le rattachement demandé, sinon celui en place.
  const parentId = body.parentId === undefined ? current.parentId : body.parentId;

  if (parentId !== null) {
    if (parentId === id) throw new VariantNestingError();
    if (await hasVariants(db, id)) throw new ProductHasVariantsError('Ce produit a des déclinaisons : il ne peut pas en devenir une.');
    const parent = await resolveParent(db, parentId);
    values.parentId = parent.id;
    values.name = parent.name;
    values.productCategoryId = parent.productCategoryId;
    values.description = null;
    values.imageKey = null;
    if (body.variantLabel !== undefined || current.parentId !== parentId) {
      values.variantLabel = requireVariantLabel(body.variantLabel ?? current.variantLabel);
    }
  } else {
    if (body.name !== undefined) values.name = body.name.trim();
    if (body.productCategoryId !== undefined) values.productCategoryId = body.productCategoryId;
    if (body.description !== undefined) values.description = body.description?.trim() || null;
    if (current.parentId !== null) {
      // Détachée, la déclinaison redevient un produit : son libellé n'a plus de sens.
      values.parentId = null;
      values.variantLabel = null;
    }
  }

  const updated = await repo.update(db, id, values);
  if (!updated) throw new ProductNotFoundError();

  if (parentId === null) {
    await propagateToVariants(db, id, { name: values.name, productCategoryId: values.productCategoryId });
  }
  return updated;
}
