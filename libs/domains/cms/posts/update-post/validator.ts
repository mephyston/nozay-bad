import { Type } from '@sinclair/typebox';

export const updatePostSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  excerpt: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  bodyHtml: Type.Optional(Type.String({ maxLength: 120000 })),
  coverMediaId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  seoTitle: Type.Optional(Type.Union([Type.String({ maxLength: 200 }), Type.Null()])),
  seoDescription: Type.Optional(Type.Union([Type.String({ maxLength: 320 }), Type.Null()])),
  categoryIds: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 10 })),
  visibility: Type.Optional(Type.Union([Type.Literal('public'), Type.Literal('private')])),
  /**
   * Événement de l'agenda annoncé par l'actualité. `null` détache, absent laisse
   * inchangé — même idiome que `excerpt` et `coverMediaId` juste au-dessus.
   */
  eventId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  /**
   * Date de publication, en date-heure locale (« 2026-03-14T18:30 »). `null` la retire,
   * absente la laisse inchangée — même idiome que les champs ci-dessus.
   */
  publishedAt: Type.Optional(
    Type.Union([
      Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$' }),
      Type.Null()
    ])
  )
});
