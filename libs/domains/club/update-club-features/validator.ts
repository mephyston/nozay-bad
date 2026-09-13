import { Type } from '@sinclair/typebox';
import { FEATURES } from '../shared/features';

/** Un objet `{ clé: booléen }` dont les clés sont du catalogue, toutes optionnelles. */
export const updateClubFeaturesSchema = Type.Object(
  Object.fromEntries(FEATURES.map((f) => [f, Type.Optional(Type.Boolean())])),
  { additionalProperties: false }
);
