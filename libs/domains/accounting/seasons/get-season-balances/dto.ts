export type GetSeasonBalancesInput = string;

/**
 * Un solde initial par compte reporté. `accountId` porte le **code** du compte, `label` son
 * libellé : les deux viennent de `accounts`, plus d'une table id→code figée sur trois comptes.
 */
export interface SeasonBalanceDto {
  seasonId: number;
  /** Code du compte (`current`, `badnet`…). */
  accountId: string;
  /** Identifiant numérique du compte, pour qui rapproche avec des écritures. */
  accountNumericId: number;
  label: string;
  initialBalanceCents: number;
  /** Alias historique de `initialBalanceCents`, lu par les écrans. */
  initialBalance: number;
  /** Calculé depuis l'exercice précédent (non clôturé), et non figé par une clôture. */
  provisional: boolean;
}

export type GetSeasonBalancesOutput = SeasonBalanceDto[];
