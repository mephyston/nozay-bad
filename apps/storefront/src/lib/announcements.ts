import { createApiClient } from '@nba/api-client';
import type { Announcement } from '@nba/announcements-ui';

export interface PublishedAnnouncements {
  announcements: Announcement[];
  /** Vrai si l'API n'a pas répondu : distingue « rien à afficher » de « rien n'a pu être lu ». */
  failed: boolean;
}

/**
 * Lit les annonces publiées, sans jamais faire échouer la page appelante.
 *
 * L'accueil de l'espace adhérent affiche ce bloc en tête : une API indisponible doit
 * dégrader l'écran, pas l'empêcher de s'ouvrir. Les brouillons sont écartés par l'API
 * elle-même, qui refuse de les servir à un appelant `storefront`.
 */
export async function fetchPublishedAnnouncements(
  env: unknown,
  limit: number
): Promise<PublishedAnnouncements> {
  try {
    const apiService = createApiClient(env as never);
    const res = await apiService.fetch(`http://localhost/announcements?status=published&limit=${limit}`);
    if (!res.ok) return { announcements: [], failed: true };

    const json = (await res.json()) as { data?: Announcement[] };
    return { announcements: json.data ?? [], failed: false };
  } catch {
    return { announcements: [], failed: true };
  }
}
