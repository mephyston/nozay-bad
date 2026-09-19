import { Type } from '@sinclair/typebox';

export const updateProductSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  productCategoryId: Type.Optional(Type.Integer({ minimum: 1 })),
  priceCents: Type.Optional(Type.Integer({ minimum: 0 })),
  stock: Type.Optional(Type.Integer({ minimum: 0 })),
  trackStock: Type.Optional(Type.Boolean()),
  active: Type.Optional(Type.Boolean()),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  parentId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  variantLabel: Type.Optional(Type.Union([Type.String({ maxLength: 40 }), Type.Null()]))
});
