import type { CategoryLike } from '../../shared/category';

/**
 * Les mots du motif qui décident seuls de la catégorie.
 *
 * L'heuristique de l'analyse propose une catégorie, puis le modèle la remplace dès qu'un
 * adhérent est candidat — c'est-à-dire pour presque tous les virements d'adhérents. Le
 * modèle ne savait rien des maillots : « VIR MARTIN POUR NOZAY BADMINTON MAILLOT » tombait
 * dans la branche « badminton » de l'heuristique (Championnats), ou dans les cotisations
 * selon l'humeur du modèle. Et un prélèvement de la ligue n'était compté en licences que si
 * le libellé disait aussi « licence ».
 *
 * Ces mots-là ne laissent pas de doute : la catégorie qu'ils désignent s'impose, au modèle
 * comme au reste de l'heuristique. Un motif qui mêle cotisation et maillot reste au modèle et
 * au trésorier : c'est une ventilation.
 */
const normaliser = (texte: string): string =>
  texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');

const TEXTILE = /\b(maillots?|tee ?shirts?|t shirts?|surgrips?|grips?|textiles?)\b/;
const COTISATION = /\b(adhesions?|cotisations?)\b/;
const LIGUE = /\b(ligue (d )?(ile de france|idf)|lifb|ffbad|federation francaise de badminton)\b/;
const COMPETITION = /\b(interclubs?|championnats?|icr|icn|icd)\b/;

function categorieDont(categories: CategoryLike[], mots: string[]): number | null {
  const trouvee = categories.find((c) => {
    if (c.active === false) return false;
    const libelles = normaliser(`${c.adminLabel ?? ''} ${c.adherentLabel ?? ''}`);
    return mots.some((mot) => libelles.includes(mot));
  });
  return trouvee ? trouvee.id : null;
}

/** La catégorie que le motif impose, ou `null` quand il laisse le choix. */
export function categorieImposee(libelle: string, categories: CategoryLike[]): number | null {
  const texte = normaliser(libelle);
  if (TEXTILE.test(texte) && !COTISATION.test(texte)) {
    return categorieDont(categories, ['textile', 'maillot']);
  }
  if (LIGUE.test(texte) && !COMPETITION.test(texte)) {
    return categorieDont(categories, ['licence', 'ffbad']);
  }
  return null;
}
