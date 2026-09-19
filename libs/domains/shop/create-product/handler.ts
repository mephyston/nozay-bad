import { type Db, AppError } from '@nba/db';
import { CreateProductRepository } from './repository';
import { requireVariantLabel, resolveParent } from '../shared/variants';
import { CreateProductInput, CreateProductOutput } from "./dto";

export async function createProduct(db: Db, body: CreateProductInput): Promise<CreateProductOutput> {
  const repo = new CreateProductRepository();

  // Une déclinaison hérite du parent ce qui l'identifie ; ce que le corps en dit est ignoré.
  const parent = body.parentId ? await resolveParent(db, body.parentId) : null;
  const productCategoryId = parent ? parent.productCategoryId : body.productCategoryId;
  if (!productCategoryId) throw new AppError('Catégorie de produit requise.', 400);
  const name = parent ? parent.name : body.name?.trim();
  if (!name) throw new AppError('Nom du produit requis.', 400);

  return repo.create(db, {
    name,
    productCategoryId,
    priceCents: body.priceCents,
    stock: body.stock ?? 0,
    trackStock: body.trackStock ?? false,
    active: body.active !== false,
    description: parent ? null : (body.description?.trim() || null),
    parentId: parent?.id ?? null,
    variantLabel: parent ? requireVariantLabel(body.variantLabel) : null,
    createdAt: new Date()
  });
}
