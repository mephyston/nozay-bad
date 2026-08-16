import { createApiClient } from '@nba/api-client';
import type { MyFixture } from '@nba/teams-api';

export type { MyFixture };

/**
 * Les rencontres d'interclubs à venir de l'adhérent.
 *
 * La licence vient de la session, jamais du navigateur : c'est ce qui permet de répondre
 * « voici *tes* rencontres » sans qu'on puisse les demander pour quelqu'un d'autre.
 *
 * Comme les autres encarts, une API muette les fait disparaître sans empêcher la page de
 * s'ouvrir : l'agenda du club et l'accueil valent d'être lus sans elles.
 */
export async function fetchMyFixtures(
  env: unknown,
  seasonCode: string | null,
  licence: string | null,
  limit?: number
): Promise<MyFixture[]> {
  if (!seasonCode || !licence) return [];
  try {
    const api = createApiClient(env as never);
    const query = new URLSearchParams({ seasonCode, licence });
    if (limit) query.set('limit', String(limit));

    const res = await api.fetch(`http://localhost/teams/my-fixtures?${query}`);
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: { fixtures?: MyFixture[] } };
    return json.data?.fixtures ?? [];
  } catch {
    return [];
  }
}

/**
 * Licence de l'adhérent actif, normalisée comme partout dans le domaine — huit
 * caractères, zéros de tête compris. Sans quoi la jointure sur l'effectif échoue en
 * silence, et l'adhérent se croit dans aucune équipe.
 */
export function normalizeLicence(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.padStart(8, '0') : null;
}
