/**
 * Libellés des rattachements d'exercice, pour l'affichage.
 *
 * Module volontairement **pur** — aucune dépendance à la base : `accruals.ts`, qui valide
 * la phase fiscale, importe `DbOrTx` et n'a rien à faire dans un composant. Les écrans qui
 * montrent un cut-off n'ont besoin que de ces quatre mots.
 */
export const ACCRUAL_LABELS: Record<string, string> = {
  produit_constate_avance: "Produit constaté d'avance",
  charge_constatee_avance: "Charge constatée d'avance",
  produit_a_recevoir: 'Produit à recevoir',
  charge_a_payer: 'Charge à payer'
};

/** `normal` — l'immense majorité — n'est pas un rattachement et ne s'affiche pas. */
export function isAccrual(accrualType: string | null | undefined): boolean {
  return typeof accrualType === 'string' && accrualType !== '' && accrualType !== 'normal';
}

export function accrualLabel(accrualType: string | null | undefined): string {
  if (!isAccrual(accrualType)) return '';
  return ACCRUAL_LABELS[accrualType as string] ?? (accrualType as string);
}
