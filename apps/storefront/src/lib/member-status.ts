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
