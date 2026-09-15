import { type Db } from '@nba/db';
import { getClubFeatures, getClubSettings, listTreasuryAccounts, type TreasuryAccount } from '../shared/repository';
import type { ClubSettings } from '../shared/settings';
import type { FeatureState } from '../shared/features';

export type GetClubSettingsOutput = {
  settings: ClubSettings;
  features: FeatureState;
  /** Les caisses et porte-monnaie actifs : une entrée de menu chacun, à côté du grand livre. */
  menuAccounts: TreasuryAccount[];
};

/**
 * L'identité du club et l'état de ses fonctionnalités, en une lecture.
 *
 * Les trois applications la demandent à chaque requête (titre des pages, menu,
 * pied de page) : une seule route, deux lectures mémoïsées, et l'API la met en
 * cache pour les appelants de service (`cacheSharedReads`).
 */
export async function getClubSettingsView(db: Db): Promise<GetClubSettingsOutput> {
  const [settings, features, accounts] = await Promise.all([getClubSettings(db), getClubFeatures(db), listTreasuryAccounts(db)]);
  return { settings, features, menuAccounts: accounts.filter((a) => a.kind === 'cash' || a.kind === 'wallet' || a.kind === 'voucher') };
}
