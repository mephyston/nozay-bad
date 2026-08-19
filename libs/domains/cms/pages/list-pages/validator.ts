import { Type } from '@sinclair/typebox';

export const listPagesQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('published')]))
});
