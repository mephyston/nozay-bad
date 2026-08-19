import { Type } from '@sinclair/typebox';

export const updateProductSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  priceCents: Type.Optional(Type.Integer({ minimum: 0 })),
  stock: Type.Optional(Type.Integer({ minimum: 0 })),
  trackStock: Type.Optional(Type.Boolean()),
  active: Type.Optional(Type.Boolean()),
});
