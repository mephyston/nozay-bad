import { createApiClient } from '@nba/api-client';
import { ALL_FEATURES_ON, NEUTRAL_CLUB_SETTINGS, type ClubSettings, type Feature, type FeatureState } from '@nba/club-ui';

/**
 * L'identité du club et ses fonctionnalités, côté serveur de l'administration.
 *
 * Le middleware la pose dans `locals.club` pour chaque requête qui passe par lui —
 * pages rendues à la demande et relais. C'est ce qui décide du titre des pages, du
 * nom dans le menu, et de ce qui répond introuvable parce que le club l'a éteint.
 *
 * Gardée à l'échelle de l'isolate, comme l'identité (`middleware.ts`) : une minute,
 * parce qu'elle ne change qu'à une écriture depuis l'écran de configuration — et
 * cet écran l'oublie aussitôt (`oublierClub`), donc celui qui vient d'enregistrer
 * voit sa modification à la requête suivante.
 */
export interface ClubContexte {
  settings: ClubSettings;
  features: FeatureState;
}

const CLUB_TTL_MS = 60_000;

let garde: { club: ClubContexte; expireA: number } | null = null;

export function oublierClub(): void {
  garde = null;
}

export async function chargerClub(env: Record<string, string>, userEmail: string): Promise<ClubContexte> {
  const maintenant = Date.now();
  if (garde && garde.expireA > maintenant) return garde.club;

  const api = createApiClient(env as never, { caller: 'admin', userEmail });
  const res = await api.fetch('http://localhost/club/settings');
  if (!res.ok) throw new Error(`[club] /club/settings a répondu ${res.status}`);
  const json = (await res.json()) as { data: ClubContexte };
  const club = {
    settings: { ...json.data.settings, updatedAt: new Date(json.data.settings.updatedAt) },
    features: json.data.features
  };
  garde = { club, expireA: maintenant + CLUB_TTL_MS };
  return club;
}

/**
 * Ce qu'on affiche quand l'API ne répond pas : un club sans nom plutôt qu'une page
 * blanche. Les fonctionnalités sont toutes allumées — un club qui en a éteint une
 * la verrait réapparaître le temps d'une panne, ce qui vaut mieux qu'un menu vide.
 */
export const CLUB_DE_SECOURS: ClubContexte = { settings: NEUTRAL_CLUB_SETTINGS, features: ALL_FEATURES_ON };

/** La fonctionnalité est-elle active pour ce club ? Sans contexte, oui : ne rien cacher par accident. */
export function fonctionnaliteActive(locals: App.Locals, feature: Feature): boolean {
  return locals.club?.features[feature] ?? true;
}
