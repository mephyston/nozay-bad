import { type Db } from '@nba/db';
import { getClubFeatures, getClubSettings } from '../shared/repository';
import type { ClubSettings } from '../shared/settings';
import type { FeatureState } from '../shared/features';

export type GetClubSettingsOutput = {
  settings: ClubSettings;
  features: FeatureState;
};

/**
 * L'identité du club et l'état de ses fonctionnalités, en une lecture.
 *
 * Les trois applications la demandent à chaque requête (titre des pages, menu,
 * pied de page) : une seule route, deux lectures mémoïsées, et l'API la met en
 * cache pour les appelants de service (`cacheSharedReads`).
 */
export async function getClubSettingsView(db: Db): Promise<GetClubSettingsOutput> {
  const [settings, features] = await Promise.all([getClubSettings(db), getClubFeatures(db)]);
  return { settings, features };
}
