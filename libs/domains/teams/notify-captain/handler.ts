import { type Db } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { normalizeLicence } from '../shared/ranking';
import { staffContacts } from '../shared/staff-contacts';
import { findUpperTeam } from '../shared/team-hierarchy';
import { sendValueIssueNotifications } from '../shared/notify-value-issue';
import { loadLineup } from '../get-lineup/handler';
import { TeamNotFoundError } from '../shared/errors';
import { NotifyCaptainRepository } from './repository';
import type { NotifyCaptainInput, NotifyCaptainOutput } from './dto';

const repo = new NotifyCaptainRepository();

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
 * La construction et l'envoi bilatéral vivent dans `shared/notify-value-issue.ts`,
 * partagés avec le constat automatique déclenché à la validation d'une composition
 * (`notify-value-overflow`) : les deux flux doivent dire la même chose.
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
  const upper = hierarchy.length > 0 ? await findUpperTeam(db, team) : undefined;
  const upperLineup = upper
    ? await loadLineup(db, { teamId: upper.id, dayNumber: input.dayNumber })
    : null;
  const counterpart = upperLineup
    ? await staffContacts(db, byLicence, [
        upperLineup.captainLicence,
        upperLineup.viceCaptainLicence
      ])
    : { emails: [], names: [] };

  const sent = await sendValueIssueNotifications(
    db,
    {
      team: { id: team.id },
      lineup,
      upper: upper && upperLineup ? { id: upper.id, lineup: upperLineup } : null,
      ownStaff: own,
      upperStaff: counterpart,
      problems,
      note: input.note,
      source: 'teams:day-control'
    },
    now
  );

  return {
    teamName: lineup.teamName,
    recipients: sent.recipients,
    counterpartTeamName: upperLineup?.teamName ?? null,
    counterpartRecipients: sent.counterpartRecipients,
    title: sent.title,
    body: sent.body,
    skipped: false
  };
}
