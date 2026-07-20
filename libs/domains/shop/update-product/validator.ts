import { Type } from '@sinclair/typebox';

export const updateProductSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  price: Type.Optional(Type.Integer({ minimum: 0 })),
  stock: Type.Optional(Type.Integer({ minimum: 0 })),
  active: Type.Optional(Type.Boolean()),
});
