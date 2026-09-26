import { normalize } from './nav-search.js';

/**
 * La règle de recherche des sélecteurs : le texte tapé, **tel quel**, n'importe où
 * dans le libellé ou sa seconde ligne — sans tenir compte des capitales, des accents
 * ni de la ponctuation (la même forme que la recherche du menu).
 *
 * Une seule règle pour la souris et le doigt. Le menu de la souris cherchait « en
 * flou » (les lettres dans l'ordre, pas forcément à la suite) : « ZOLA299 » gardait
 * alors des dizaines d'adhérents voisins, et le bon n'arrivait pas en tête. Dans une
 * liste de deux cents noms, on cherche quelqu'un, pas une ressemblance.
 */
export function correspondA(terme: string, ...textes: (string | undefined)[]): boolean {
  const cherche = normalize(terme);
  if (!cherche) return true;
  return textes.some((texte) => normalize(texte ?? '').includes(cherche));
}
