import type { Ranking } from '../shared/ranking';

export interface SaveRankingInput {
  licence: string;
  /** Instantané corrigé. La correction ne touche que celui-là. */
  eloDate: string;
  /**
   * Chaque discipline est facultative : une clé absente laisse la valeur en place.
   *
   * `null` n'est pas `'NC'` : `null` décrit un licencié **non compétiteur**, `'NC'` un
   * compétiteur sans classement, qui vaut zéro point mais peut être aligné. Les confondre
   * ferait entrer en équipe quelqu'un qui n'y a pas sa place.
   */
  singles?: Ranking | null;
  doubles?: Ranking | null;
  mixed?: Ranking | null;
  cpphSingles?: number | null;
  cpphDoubles?: number | null;
  cpphMixed?: number | null;
}

export interface SaveRankingOutput {
  licence: string;
  eloDate: string;
  singles: Ranking | null;
  doubles: Ranking | null;
  mixed: Ranking | null;
  cpphSingles: number | null;
  cpphDoubles: number | null;
  cpphMixed: number | null;
  /** Passe à `manuel` dès la première correction, et n'en revient pas. */
  source: 'import' | 'manuel';
}
