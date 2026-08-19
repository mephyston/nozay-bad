/**
 * Découpage des écritures en lots, sous la limite de paramètres liés de D1.
 *
 * D1 refuse une requête portant plus de **100 paramètres liés**. Une insertion groupée
 * dépasse donc vite le plafond sans prévenir : 40 lignes de classement à 19 colonnes font
 * 760 paramètres, et la requête échoue en bloc.
 *
 * Le piège est qu'il ne se voit pas en test : un cas nominal insère trois lignes et passe.
 * C'est l'import réel — 213 licenciés — qui casse. D'où ce découpage calculé sur le nombre
 * de colonnes, et non sur un nombre de lignes choisi à vue.
 */

/** Plafond de paramètres liés par requête D1. */
export const D1_MAX_BOUND_PARAMS = 100;

/**
 * Nombre de lignes qu'on peut insérer d'un coup, pour un nombre de colonnes donné.
 * Au moins une : une ligne trop large échouera, mais de façon lisible.
 */
export function rowsPerStatement(columnsPerRow: number): number {
  return Math.max(1, Math.floor(D1_MAX_BOUND_PARAMS / Math.max(1, columnsPerRow)));
}

/** Découpe `rows` en lots tenant sous la limite de D1. */
export function chunkForD1<T>(rows: T[], columnsPerRow: number): T[][] {
  const size = rowsPerStatement(columnsPerRow);
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}
