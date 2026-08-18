import { Type } from '@sinclair/typebox';

// Pas de `statusCode` : il est dérivé de la cible (nulle = 410, sinon 301), comme le
// fait la résolution d'URL. Un code saisi librement pourrait la contredire.
export const createRedirectSchema = Type.Object({
  fromPath: Type.String({ minLength: 1, maxLength: 512 }),
  /** Nulle = la page a été supprimée : l'adresse répondra 410 Gone. */
  toPath: Type.Union([Type.String({ minLength: 1, maxLength: 512 }), Type.Null()]),
  note: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()]))
});
