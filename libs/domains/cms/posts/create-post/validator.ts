import { Type } from '@sinclair/typebox';

export const createPostSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  excerpt: Type.Optional(Type.String({ maxLength: 500 })),
  bodyHtml: Type.Optional(Type.String({ maxLength: 120000 })),
  coverMediaId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  categoryIds: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 10 }))
});
