import { Type } from '@sinclair/typebox';

/**
 * Seul le texte alternatif est modifiable.
 *
 * Tout le reste — clé, type, poids, dimensions, empreinte — décrit le fichier déposé,
 * pas la façon dont on le désigne : le corriger reviendrait à mentir sur les octets
 * que sert R2. Remplacer un fichier, c'est en déposer un autre, qui reçoit sa propre
 * clé.
 */
export const updateMediaSchema = Type.Object({
  alt: Type.String({ maxLength: 300 })
});
