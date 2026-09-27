import { Type } from '@sinclair/typebox';

/**
 * La lecture du site public : un nombre de séances et, pour lire par semaines, un dernier
 * jour. Une saisie mal formée est refusée ici (400) ; le handler garde son plafond, qui
 * borne ce qu'un appelant peut faire lire même avec un nombre bien formé.
 */
export const listPublicOpenPlayQuerySchema = Type.Object({
  limit: Type.Optional(Type.String({ pattern: '^[1-9][0-9]{0,3}$' })),
  to: Type.Optional(Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }))
});
