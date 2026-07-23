import { Type } from '@sinclair/typebox';

export const listProductsQuerySchema = Type.Object({
  category: Type.Optional(Type.String()),
  active: Type.Optional(Type.Union([Type.Literal('true'), Type.Literal('false')]))
});
