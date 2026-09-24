import { normalizeSearchText } from '@nba/ui';

/**
 * Filtrage des articles du centre d'aide.
 *
 * Le centre était une grille de huit cartes et quarante liens, sans autre moyen d'y
 * trouver quelque chose que de la parcourir des yeux. Sur téléphone, cela fait huit
 * écrans de défilement.
 *
 * La comparaison passe par `normalizeSearchText`, celui de la recherche du menu : sans
 * lui, « comptabilite » ne trouvait pas « Comptabilité », et personne ne tape les
 * accents dans un champ de recherche.
 */
export type ArticleDAide = {
  id: string;
  titre: string;
  description?: string;
};

export type RubriqueDAide = {
  cle: string;
  titre: string;
  articles: ArticleDAide[];
};

/**
 * Les mots du terme saisi, dans l'ordre. Chacun doit se retrouver quelque part dans
 * l'article : « cheque remise » trouve « Remise de chèques », ce qu'une comparaison de
 * la chaîne entière ratait.
 */
function mots(terme: string): string[] {
  return normalizeSearchText(terme).split(' ').filter(Boolean);
}

export function articleCorrespond(article: ArticleDAide, terme: string, rubrique = ''): boolean {
  const cherches = mots(terme);
  if (cherches.length === 0) return true;
  // La rubrique fait partie de la botte de foin : « aide comptabilité » doit trouver les
  // articles de la rubrique Comptabilité, dont aucun ne porte le mot dans son titre.
  const botte = normalizeSearchText(`${article.titre} ${article.description ?? ''} ${rubrique}`);
  return cherches.every((mot) => botte.includes(mot));
}

/**
 * Les rubriques réduites au terme cherché. Une rubrique dont plus aucun article ne
 * correspond disparaît : un en-tête seul laisse croire à un contenu replié.
 */
export function rubriquesFiltrees(rubriques: RubriqueDAide[], terme: string): RubriqueDAide[] {
  if (mots(terme).length === 0) return rubriques;
  return rubriques
    .map((r) => ({ ...r, articles: r.articles.filter((a) => articleCorrespond(a, terme, r.titre)) }))
    .filter((r) => r.articles.length > 0);
}

/** Le nombre d'articles retenus, pour le dire au lieu de laisser une page vide muette. */
export function compterArticles(rubriques: RubriqueDAide[]): number {
  return rubriques.reduce((n, r) => n + r.articles.length, 0);
}
