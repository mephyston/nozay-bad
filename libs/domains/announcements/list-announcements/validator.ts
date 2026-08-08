import { Type } from '@sinclair/typebox';

/**
 * Les paramètres d'URL arrivent toujours en chaîne : `limit` et `offset` sont donc
 * validés comme motif numérique puis convertis dans la route, plutôt que déclarés
 * `Type.Integer` — ce qui rejetterait `?limit=3`.
 */
export const listAnnouncementsQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([Type.Literal('draft'), Type.Literal('published')])),
  limit: Type.Optional(Type.String({ pattern: '^[0-9]{1,3}$' })),
  offset: Type.Optional(Type.String({ pattern: '^[0-9]{1,6}$' }))
});
