import { Type } from '@sinclair/typebox';

export const updatePostSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  excerpt: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  bodyHtml: Type.Optional(Type.String({ maxLength: 120000 })),
  coverMediaId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  seoTitle: Type.Optional(Type.Union([Type.String({ maxLength: 200 }), Type.Null()])),
  seoDescription: Type.Optional(Type.Union([Type.String({ maxLength: 320 }), Type.Null()])),
  categoryIds: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 10 }))
});
