import { createApiClient } from '@nba/api-client';
import { listSeasons, displaySeason } from './season';

export interface ActiveMemberStatus {
  canExpense: boolean;
  paid: boolean;
  amountDueCents: number;
  amountReceivedCents: number;
  amountRemainingCents: number;
  seasonCode: string;
  seasonName: string;
}

/**
 * Statut FRAIS / cotisation de l'adhérent actif lu EN DIRECT (base), et non depuis le
 * snapshot de session. Ainsi une (dé)autorisation de notes de frais ou un paiement pris
 * en compte côté admin devient effectif dès le prochain chargement de page, sans que
 * l'adhérent ait à se reconnecter. Repli sur les valeurs de session si l'API échoue.
 *
 * La saison lue est celle de la SESSION (donc celle du calendrier), et non la saison
 * comptable : sinon une clôture anticipée ferait chercher le dossier de l'adhérent dans
 * une saison où il n'existe pas, et l'app afficherait une cotisation à zéro.
 */
export async function getActiveMemberStatus(env: any, session: any): Promise<ActiveMemberStatus> {
  const active = session?.members?.find((m: any) => m.id === session?.activeMemberId);

  const fallback: ActiveMemberStatus = {
    canExpense: Boolean(active?.expenseAuthorized),
    paid: Boolean(active?.paid),
    amountDueCents: 0,
    amountReceivedCents: 0,
    amountRemainingCents: 0,
    seasonCode: '',
    seasonName: ''
  };
  if (!active) return fallback;

  const api = createApiClient(env);

  const season = displaySeason(await listSeasons(env), session?.seasonCode);
  const seasonCode = season?.code || '';
  const seasonName = season?.name || '';

  try {
    const mres = await api.fetch(
      `http://localhost/members/${encodeURIComponent(active.licence)}${seasonCode ? `?season=${encodeURIComponent(seasonCode)}` : ''}`
    );
    if (mres.ok) {
      const m = ((await mres.json()) as any).data;
      if (m) {
        const dueCents = m.amountDueCents ?? 0;
        const recvCents = m.amountReceivedCents ?? 0;
        return {
          canExpense: Boolean(m.expenseAuthorized),
          paid: Boolean(m.paid),
          amountDueCents: dueCents,
          amountReceivedCents: recvCents,
          amountRemainingCents: m.amountRemainingCents ?? Math.max(0, dueCents - recvCents),
          seasonCode,
          seasonName
        };
      }
    }
  } catch {}

  return { ...fallback, seasonCode, seasonName };
}

export interface SessionMemberStatus {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
  paid: boolean;
  isActive: boolean;
}

/**
 * Statut de cotisation de TOUS les profils de la session, lu en direct comme ci-dessus.
 *
 * Sert les écrans de portée foyer — l'attestation CSE en premier lieu : un parent qui
 * gère les licences de ses enfants doit pouvoir les récupérer d'une traite, sans changer
 * de profil entre chaque. Les appels partent en parallèle (un foyer, donc une poignée),
 * et chacun retombe sur le `paid` du snapshot de session si l'API échoue.
 */
export async function getSessionMembersStatus(env: any, session: any): Promise<SessionMemberStatus[]> {
  const members: any[] = session?.members ?? [];
  if (members.length === 0) return [];

  const api = createApiClient(env);
  const season = displaySeason(await listSeasons(env), session?.seasonCode);
  const seasonCode = season?.code || '';

  return Promise.all(
    members.map(async (m) => {
      let paid = Boolean(m.paid);
      try {
        const res = await api.fetch(
          `http://localhost/members/${encodeURIComponent(m.licence)}${seasonCode ? `?season=${encodeURIComponent(seasonCode)}` : ''}`
        );
        if (res.ok) {
          const fresh = ((await res.json()) as any).data;
          if (fresh) paid = Boolean(fresh.paid);
        }
      } catch {}
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        licence: m.licence,
        paid,
        isActive: m.id === session?.activeMemberId
      };
    })
  );
}
