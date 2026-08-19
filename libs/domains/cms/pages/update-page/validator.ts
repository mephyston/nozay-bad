import { Type } from '@sinclair/typebox';

export const updatePageSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 96 })),
  parentId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  template: Type.Optional(
    Type.Union([Type.Literal('default'), Type.Literal('home'), Type.Literal('landing')])
  ),
  seoTitle: Type.Optional(Type.Union([Type.String({ maxLength: 200 }), Type.Null()])),
  seoDescription: Type.Optional(Type.Union([Type.String({ maxLength: 320 }), Type.Null()])),
  noindex: Type.Optional(Type.Boolean())
});
