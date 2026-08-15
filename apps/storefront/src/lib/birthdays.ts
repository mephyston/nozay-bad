import { createApiClient } from '@nba/api-client';

export interface MemberBirthday {
  firstName: string;
  lastName: string;
  /** Âge atteint aujourd'hui. */
  age: number;
}

/**
 * Les adhérents dont c'est l'anniversaire aujourd'hui.
 *
 * L'espace adhérent est authentifié et le club pousse déjà l'annonce à tous les
 * appareils chaque matin : l'encart ne divulgue donc rien de plus que la
 * notification. En cas d'API muette, il disparaît — un cadre vide vaudrait « personne
 * n'a son anniversaire », ce qui serait faux.
 */
export async function fetchTodayBirthdays(env: unknown): Promise<MemberBirthday[]> {
  try {
    const api = createApiClient(env as never);
    const res = await api.fetch('http://localhost/members/birthdays');
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: MemberBirthday[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
