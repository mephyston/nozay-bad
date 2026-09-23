import { BLOCK_KINDS } from './block-editor-registry';

/**
 * Ce qu'un bloc dit de lui quand il est replié.
 *
 * En mode réorganisation, les blocs se réduisent à une rangée : ouverts, on déplace
 * une carte de six cents pixels sans jamais voir où elle atterrit. Une rangée doit
 * donc suffire à reconnaître le bloc — son genre, et ce qui le distingue de son
 * voisin du même genre.
 */

export type BlocLike = { type: string; [cle: string]: unknown };

const GENRES = Object.fromEntries(BLOCK_KINDS.map((k) => [k.type, k.label])) as Record<string, string>;

export const genreDeBloc = (bloc: BlocLike): string => GENRES[bloc.type] ?? bloc.type;

const texte = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Le premier bout de texte d'un contenu riche, balises retirées. */
function extraitDuTexte(html: unknown): string {
  const brut = texte(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return brut.length > 60 ? `${brut.slice(0, 60)}…` : brut;
}

const compte = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

/**
 * Ce qui distingue ce bloc d'un autre du même genre.
 *
 * Le titre de section quand il y en a un — c'est ce que le lecteur verra —, sinon ce
 * que le bloc contient : trois diapositives, huit images, deux colonnes. Rien de
 * générique : « Carrousel » est déjà dit par le genre.
 */
export function detailDeBloc(bloc: BlocLike): string {
  const titre = texte(bloc.heading) || texte(bloc.title) || texte(bloc.label);
  if (titre) return titre;

  switch (bloc.type) {
    case 'richtext':
      return extraitDuTexte(bloc.html);
    case 'columns':
      return `${compte(bloc.items)} colonnes`;
    case 'carousel':
      return `${compte(bloc.slides)} diapositive${compte(bloc.slides) > 1 ? 's' : ''}`;
    case 'gallery':
      return `${compte(bloc.mediaIds)} image${compte(bloc.mediaIds) > 1 ? 's' : ''}`;
    case 'person_cards':
      return `${compte(bloc.people)} personne${compte(bloc.people) > 1 ? 's' : ''}`;
    case 'cta_grid':
      return `${compte(bloc.items)} bouton${compte(bloc.items) > 1 ? 's' : ''}`;
    case 'hero':
      return `${compte(bloc.ctas)} bouton${compte(bloc.ctas) > 1 ? 's' : ''}`;
    case 'embed':
      return texte(bloc.resourceId);
    default:
      return '';
  }
}
