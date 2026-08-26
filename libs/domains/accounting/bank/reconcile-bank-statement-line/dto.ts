export type ReconcileBankTxInternalId = number;
export type ReconcileBankTxInternalInput = Record<string, any>;

/**
 * Ce que le rapprochement a produit, et non un simple accusé de réception.
 *
 * `line` porte le nouveau statut de la ligne de relevé, `entries` les écritures qui lui sont
 * désormais rattachées — dans la forme de `list-ledger-entries`. C'est ce qui permet à l'écran
 * de se remettre à jour sur place : tant que la réponse se réduisait à `{ success: true }`, la
 * seule façon de voir le résultat était de reconstruire toute la page.
 */
export type ReconcileBankTxInternalOutput = {
  success: boolean;
  error?: string;
  status?: number;
  line?: any;
  entries?: any[];
};
