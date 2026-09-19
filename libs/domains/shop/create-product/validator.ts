import { Type } from '@sinclair/typebox';

export const createProductSchema = Type.Object({
  // Nom et catégorie sont facultatifs pour une déclinaison, qui prend ceux de son parent.
  name: Type.Optional(Type.String({ minLength: 1 })),
  productCategoryId: Type.Optional(Type.Integer({ minimum: 1 })),
  priceCents: Type.Integer({ minimum: 0 }),
  stock: Type.Integer({ minimum: 0 }),
  trackStock: Type.Optional(Type.Boolean()),
  active: Type.Optional(Type.Boolean()),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  parentId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  variantLabel: Type.Optional(Type.Union([Type.String({ maxLength: 40 }), Type.Null()]))
});
