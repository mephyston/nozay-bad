import { createApiClient, type ApiClientEnv } from '@nba/api-client';
import { ALL_FEATURES_ON, type Feature, type FeatureState } from './features';

export type { Feature, FeatureState };
import { NEUTRAL_CLUB_SETTINGS, type ClubSettings } from './settings';

/**
 * L'identité du club et ses fonctionnalités, telles qu'un Worker de service les lit.
 *
 * L'espace adhérent et le site public n'ont pas de base : ils demandent le club à
 * l'API (`GET /club/settings`, route ouverte aux appelants de service) et le gardent
 * une minute à l'échelle de l'isolate. Le titre des pages, le pied de page, les cartes
 * de l'accueil et les pages éteintes en dépendent — une lecture par requête serait
 * un appel de service par page pour une donnée qui change quelques fois par an.
 *
 * Une panne de cette lecture ne ferme rien : un club sans nom, toutes fonctionnalités
 * visibles, et une ligne dans les journaux. La page reste servie.
 */
export interface ClubContext {
  settings: ClubSettings;
  features: FeatureState;
}

const CLUB_TTL_MS = 60_000;

/** Un contexte sans nom, toutes fonctionnalités allumées : le repli, jamais un vrai club. */
export const FALLBACK_CLUB_CONTEXT: ClubContext = {
  settings: { ...NEUTRAL_CLUB_SETTINGS, name: '', shortName: '' },
  features: ALL_FEATURES_ON
};

let cached: { club: ClubContext; expiresAt: number } | null = null;

export function forgetClubContext(): void {
  cached = null;
}

export async function loadClubContext(
  env: ApiClientEnv,
  caller: 'storefront' | 'website',
  now = Date.now()
): Promise<ClubContext> {
  if (cached && cached.expiresAt > now) return cached.club;
  try {
    const res = await createApiClient(env, { caller }).fetch('http://localhost/club/settings');
    if (!res.ok) throw new Error(`/club/settings a répondu ${res.status}`);
    const { data } = (await res.json()) as { data: ClubContext };
    const club: ClubContext = {
      settings: { ...data.settings, updatedAt: new Date(data.settings.updatedAt) },
      features: data.features
    };
    cached = { club, expiresAt: now + CLUB_TTL_MS };
    return club;
  } catch (err) {
    console.error('[club] identité du club illisible, repli neutre :', err);
    return FALLBACK_CLUB_CONTEXT;
  }
}

/** La fonctionnalité est-elle active ? Sans contexte, oui : ne rien cacher par accident. */
export function featureOn(club: ClubContext | undefined, feature: Feature): boolean {
  return club?.features[feature] ?? true;
}
