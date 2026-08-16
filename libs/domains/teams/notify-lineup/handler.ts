import { type Db } from '@nba/db';
import { getMembersBySeason, getContactEmailsForMember } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { normalizeLicence } from '../shared/ranking';
import { NotifyLineupRepository } from './repository';
import type { NotifyLineupInput, NotifyLineupOutput } from './dto';

const repo = new NotifyLineupRepository();

/**
 * « le samedi 7 novembre », ou « la semaine du 2 novembre » quand le capitaine n'a pas
 * encore porté la date exacte sur la rencontre — le calendrier du comité, lui, est arrêté
 * depuis l'automne.
 */
function whenLabel(lineup: NotifyLineupInput['lineup']): string {
  const french = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC'
    });
  const date = lineup.playedAt ?? lineup.matchDate;
  return date
    ? `le ${french(date)}`
    : `la semaine du ${french(lineup.weekStart)} (date exacte non renseignée)`;
}

/**
 * Prévient l'équipe qu'une composition vient d'être arrêtée.
 *
 * **Les non-retenus sont prévenus aussi.** Un joueur de l'effectif qui n'entend rien ne
 * sait pas s'il est attendu ou si le capitaine n'a rien saisi ; le silence l'oblige à
 * demander, et c'est cette question hebdomadaire que la fonctionnalité doit faire
 * disparaître. Le message ne juge pas : il dit qu'il n'est pas aligné sur cette journée,
 * ce qui libère sa semaine aussi sûrement qu'une convocation l'occupe.
 *
 * L'auteur n'est jamais destinataire de son propre enregistrement.
 */
export async function notifyLineup(
  db: Db,
  input: NotifyLineupInput,
  now: Date = new Date()
): Promise<NotifyLineupOutput> {
  const { lineup, team } = input;
  const author = normalizeLicence(input.authorLicence);

  const selected = new Set<string>();
  for (const slot of lineup.slots) {
    if (slot.licence1) selected.add(normalizeLicence(slot.licence1));
    if (slot.licence2) selected.add(normalizeLicence(slot.licence2));
  }
  if (selected.size === 0) return { selected: 0, benched: 0 };

  const roster = (await repo.rosterOf(db, team.id)).map(normalizeLicence);
  const benched = roster.filter((licence) => !selected.has(licence));

  const members = await getMembersBySeason(db, team.seasonCode);
  const byLicence = new Map(members.map((m) => [normalizeLicence(m.licence), m]));

  async function emailsFor(licences: string[]): Promise<string[]> {
    const found = new Set<string>();
    for (const licence of licences) {
      if (licence === author) continue;
      const member = byLicence.get(licence);
      if (!member) continue;
      for (const email of await getContactEmailsForMember(db, member.id)) found.add(email);
    }
    return [...found];
  }

  const when = whenLabel(lineup);
  const day = lineup.dayLabel ?? `journée ${lineup.dayNumber}`;
  const against = lineup.opponent ? ` contre ${lineup.opponent}` : '';
  const where = lineup.home ? 'à domicile' : "à l'extérieur";
  const state = input.validated
    ? 'La composition est validée.'
    : 'La composition est encore susceptible de bouger.';

  const selectedEmails = await emailsFor([...selected]);
  await notifyContacts(
    db,
    selectedEmails,
    {
      title: `${lineup.teamName} — vous jouez ${day}`,
      body: `Vous êtes aligné avec ${lineup.teamName}${against}, ${when}, ${where}. ${state}`,
      url: `/equipes/${team.id}/journee/${lineup.dayNumber}`,
      source: 'teams:lineup',
      category: 'interclubs'
    },
    now
  );

  const benchedEmails = await emailsFor(benched);
  await notifyContacts(
    db,
    benchedEmails,
    {
      title: `${lineup.teamName} — ${day} : vous n'êtes pas aligné`,
      body: `La composition de ${lineup.teamName} pour ${day} (${when}) ne vous retient pas. Vous restez dans l'effectif de l'équipe. ${state}`,
      url: `/equipes/${team.id}/journee/${lineup.dayNumber}`,
      source: 'teams:lineup',
      category: 'interclubs'
    },
    now
  );

  return { selected: selectedEmails.length, benched: benchedEmails.length };
}
