import { Type } from '@sinclair/typebox';

export const listOrdersQuerySchema = Type.Object({
  season: Type.Optional(Type.String()),
  status: Type.Optional(Type.String())
});
