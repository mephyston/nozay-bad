import { Type } from '@sinclair/typebox';

export const listPostsQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('published')])),
  category: Type.Optional(Type.String({ maxLength: 96 })),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  offset: Type.Optional(Type.String({ pattern: '^[0-9]{1,6}$' }))
});
