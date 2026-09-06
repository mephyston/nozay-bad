import { type AccountBalance } from '../../shared/balances';

export type GetSeasonBalanceInput = string;

export type GetSeasonBalanceOutput = {
  /** Solde comptable, tous comptes de trésorerie confondus. Synonyme de `grossCents`. */
  balance: number;
  grossCents: number;
  inVaultCents: number;
  pendingDebitCents: number;
  /** Ce que les relevés devraient afficher : `grossCents − inVaultCents + pendingDebitCents`. */
  bankTheoreticalCents: number;
  /** Solde brut signé des comptes de tiers (classe 4), hors des totaux ci-dessus. */
  thirdPartyGrossCents: number;
  /** Ce que le club doit aux adhérents : le négatif du précédent, rendu positif. */
  duesToThirdPartiesCents: number;
  accounts: AccountBalance[];
};
