import { Type } from '@sinclair/typebox';

export const createPostSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  slug: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  excerpt: Type.Optional(Type.String({ maxLength: 500 })),
  bodyHtml: Type.Optional(Type.String({ maxLength: 120000 })),
  coverMediaId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  categoryIds: Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { maxItems: 10 })),
  visibility: Type.Optional(Type.Union([Type.Literal('public'), Type.Literal('private')])),
  /** Événement de l'agenda que l'actualité annonce, s'il y en a un. */
  eventId: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  /**
   * Date de publication, en date-heure locale (« 2026-03-14T18:30 »).
   *
   * Elle sert à ressaisir un article ancien pour qu'il se range dans le fil au moment où
   * les faits ont eu lieu, et non au moment où on les écrit. Elle ne **publie pas** :
   * l'actualité reste en brouillon jusqu'à ce que quelqu'un décide de la montrer.
   */
  publishedAt: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T([01][0-9]|2[0-3]):[0-5][0-9]$' }))
});
