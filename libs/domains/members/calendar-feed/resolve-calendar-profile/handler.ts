import { type DbOrTx } from '@nba/db';
import { getSeasonAtDate } from '@nba/accounting-api';
import { ENROLLED_MEMBERSHIP_STATUSES, type MembershipStatus } from '../../shared/membership-status';
import { ResolveCalendarProfileRepository } from './repository';
import type { CalendarProfile } from './dto';

const repo = new ResolveCalendarProfileRepository();

/**
 * La saison se lit à chaque fois, d'après la date : c'est ce qui fait que l'abonnement
 * survit au renouvellement, l'identifiant d'adhésion changeant d'une saison à l'autre.
 * Un dossier annulé (`suspendu`) ne donne plus rien, comme une licence non renouvelée.
 */
async function complete(
  db: DbOrTx,
  person: { id: number; licence: string; firstName: string },
  today: string
): Promise<CalendarProfile> {
  const profile = { licence: person.licence, firstName: person.firstName };
  const season = await getSeasonAtDate(db, today);
  if (!season) return { ...profile, membership: null };

  const membership = await repo.membership(db, person.id, season.id);
  if (!membership || !ENROLLED_MEMBERSHIP_STATUSES.includes(membership.status as MembershipStatus)) {
    return { ...profile, membership: null };
  }
  return { ...profile, membership: { memberId: membership.id, seasonCode: season.code } };
}

/** Le profil d'une adresse d'abonnement, ou `null` si elle n'existe pas ou plus. */
export async function resolveCalendarProfileByToken(
  db: DbOrTx,
  tokenHash: string,
  today: string
): Promise<CalendarProfile | null> {
  const person = await repo.personByTokenHash(db, tokenHash);
  return person ? complete(db, person, today) : null;
}

/** Le profil d'une licence, imposée par l'appelant de confiance (session storefront). */
export async function resolveCalendarProfileByLicence(
  db: DbOrTx,
  licence: string,
  today: string
): Promise<CalendarProfile | null> {
  const person = await repo.personByLicence(db, licence);
  return person ? complete(db, person, today) : null;
}
