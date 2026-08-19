import { Type } from '@sinclair/typebox';

export const listProductsQuerySchema = Type.Object({
  productCategoryId: Type.Optional(Type.Integer({ minimum: 1 })),
  active: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')]))
});
