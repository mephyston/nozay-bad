import { type Db } from '@nba/db';
import { getMembersBySeason, getContactEmailsForMember, type MemberSummary } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { normalizeLicence } from '../shared/ranking';
import { formatValue } from '../shared/team-value';
import { loadLineup } from '../get-lineup/handler';
import { TeamNotFoundError } from '../shared/errors';
import { NotifyCaptainRepository } from './repository';
import type { NotifyCaptainInput, NotifyCaptainOutput } from './dto';

const repo = new NotifyCaptainRepository();

/** Annuaire du staff : licences normalisées, adresses de contact, nom affichable. */
async function staffContacts(
  db: Db,
  byLicence: Map<string, MemberSummary>,
  licences: Array<string | null>
): Promise<{ emails: string[]; names: string[] }> {
  const emails = new Set<string>();
  const names: string[] = [];
  for (const raw of licences) {
    if (!raw) continue;
    const member = byLicence.get(normalizeLicence(raw));
    if (!member) continue;
    names.push(`${member.firstName} ${member.lastName}`.trim());
    for (const email of await getContactEmailsForMember(db, member.id)) emails.add(email);
  }
  return { emails: [...emails], names };
}

/**
 * Prévient le staff d'une anomalie relevée sur une composition.
 *
 * Le message est **construit à partir du constat**, jamais saisi : le coach clique, il ne
 * rédige pas. Un texte libre finirait par dire autre chose que ce que l'écran affiche, et
 * c'est le constat qui fait autorité.
 *
 * Rien n'est envoyé quand la composition est saine — un bouton qui notifie « tout va
 * bien » apprend aux capitaines à ignorer les notifications suivantes.
 *
 * Le vice-capitaine est prévenu avec le capitaine : il supplée, encore faut-il qu'il sache.
 *
 * **Le dépassement de valeur se notifie des deux côtés.** Le règlement fait perdre la
 * rencontre aux *deux* équipes (art. 6.3.2), et la correction peut venir de l'une comme de
 * l'autre : renforcer celle du dessus vaut alléger celle du dessous. Prévenir le seul
 * capitaine fautif le laisserait chercher seul un arbitrage qui ne lui appartient pas ; les
 * deux messages se nomment donc mutuellement pour qu'ils se rapprochent.
 */
export async function notifyCaptain(
  db: Db,
  input: NotifyCaptainInput,
  now: Date = new Date()
): Promise<NotifyCaptainOutput> {
  const team = await repo.findTeam(db, input.teamId);
  if (!team) throw new TeamNotFoundError();

  const lineup = await loadLineup(db, { teamId: team.id, dayNumber: input.dayNumber });

  // Seules les erreurs dures et le dépassement de valeur justifient de déranger quelqu'un.
  const blocking = lineup.errors.map((issue) => issue.message);
  const hierarchy = lineup.warnings.filter((issue) => issue.code === 'W1');
  const problems = [...blocking, ...hierarchy.map((i) => i.message)];

  const dayLabel = lineup.dayLabel ?? `journée ${lineup.dayNumber}`;

  if (problems.length === 0) {
    return {
      teamName: lineup.teamName,
      recipients: 0,
      counterpartTeamName: null,
      counterpartRecipients: 0,
      title: '',
      body: '',
      skipped: true
    };
  }

  const members = await getMembersBySeason(db, team.seasonCode);
  const byLicence = new Map(members.map((m) => [normalizeLicence(m.licence), m]));

  const own = await staffContacts(db, byLicence, [lineup.captainLicence, lineup.viceCaptainLicence]);

  // L'équipe du dessus n'est concernée que par la hiérarchie : une erreur dure sur la
  // composition d'en dessous ne la regarde pas.
  const upper = hierarchy.length > 0 ? await repo.findUpperTeam(db, team) : undefined;
  const upperLineup = upper
    ? await loadLineup(db, { teamId: upper.id, dayNumber: input.dayNumber })
    : null;
  const counterpart = upperLineup
    ? await staffContacts(db, byLicence, [
        upperLineup.captainLicence,
        upperLineup.viceCaptainLicence
      ])
    : { emails: [], names: [] };

  const note = input.note?.trim() || null;
  const value = lineup.value !== null ? `Valeur actuelle : ${formatValue(lineup.value)}.` : null;
  const together = counterpart.names.length > 0 && upperLineup
    ? `Rapprochez-vous de ${counterpart.names.join(' ou ')} (${upperLineup.teamName}) : la correction peut venir de l'une ou l'autre équipe.`
    : null;

  const title = `${lineup.teamName} — ${dayLabel} à revoir`;
  const body = [problems.join(' '), value, together, note].filter(Boolean).join(' ');

  await notifyContacts(
    db,
    own.emails,
    {
      title,
      body,
      url: `/equipes/${team.id}/journee/${lineup.dayNumber}`,
      source: 'teams:day-control',
      category: 'interclubs'
    },
    now
  );

  if (upperLineup && counterpart.emails.length > 0) {
    await notifyContacts(
      db,
      counterpart.emails,
      {
        title: `${upperLineup.teamName} — ${dayLabel} concernée par une valeur d'équipe`,
        body: [
          `${lineup.teamName} présente une valeur supérieure à celle de ${upperLineup.teamName} sur cette ${dayLabel} : les deux équipes perdraient la rencontre.`,
          own.names.length > 0
            ? `Rapprochez-vous de ${own.names.join(' ou ')} (${lineup.teamName}) : la correction peut venir de l'une ou l'autre équipe.`
            : null,
          note
        ]
          .filter(Boolean)
          .join(' '),
        url: `/equipes/${upper!.id}/journee/${lineup.dayNumber}`,
        source: 'teams:day-control',
        category: 'interclubs'
      },
      now
    );
  }

  return {
    teamName: lineup.teamName,
    recipients: own.emails.length,
    counterpartTeamName: upperLineup?.teamName ?? null,
    counterpartRecipients: counterpart.emails.length,
    title,
    body,
    skipped: false
  };
}
