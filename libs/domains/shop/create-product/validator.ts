import { Type } from '@sinclair/typebox';

export const createProductSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  productCategoryId: Type.Integer({ minimum: 1 }),
  priceCents: Type.Integer({ minimum: 0 }),
  stock: Type.Integer({ minimum: 0 }),
  trackStock: Type.Optional(Type.Boolean()),
  active: Type.Optional(Type.Boolean()),
});
