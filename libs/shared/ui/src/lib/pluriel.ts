/**
 * Le pluriel régulier du français.
 *
 * Un `s` posé sans regarder donnait « Afficher 21 créneaus » dans la feuille de
 * filtres. Les mots en `-eau`, `-au` et `-eu` prennent un `x` ; ceux qui finissent
 * déjà par `s`, `x` ou `z` ne bougent pas.
 *
 * Les irréguliers — « cheval », « travail », « œil » — restent hors de portée : aucun
 * écran n'en compte, et les deviner ferait plus de mal que de bien. Un appelant qui en
 * aurait besoin donne son pluriel lui-même.
 */
export function auPluriel(mot: string): string {
  if (!mot) return mot;
  if (/(s|x|z)$/i.test(mot)) return mot;
  if (/(eau|au|eu)$/i.test(mot)) return `${mot}x`;
  return `${mot}s`;
}

/**
 * Le mot accordé avec le nombre qui le précède.
 *
 * `auPluriel` ne connaît que le mot : employé seul pour un compteur, il écrivait
 * « 1 visites ». En français, le singulier vaut pour zéro comme pour un — « 0 visite »
 * — ce que la règle anglaise ne fait pas.
 */
export function accorder(n: number, mot: string, pluriel?: string): string {
  return Math.abs(n) < 2 ? mot : (pluriel ?? auPluriel(mot));
}
